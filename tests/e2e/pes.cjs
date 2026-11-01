/**
 * Senaryo (g): pes etme. Oyun başlamadan "Pes et" yok; başlayınca menüde "Pes et" onay
 * satırı açar ("Emin misin?"), Vazgeç oyunu bozmaz; "Evet, iğneyi göster" oyunu bitirir,
 * iğne gösterilir (durum.goster), menü kapanır, ekran okuyucuya duyurulur, istatistiğe pes
 * yazılır ve süre durur; yeni tarla düğmesi her şeyi sıfırlar.
 *   node tests/e2e/pes.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const gorunur = (s, secici) => s.evaluate((q) => {
  const e = document.querySelector(q);
  return Boolean(e) && !e.hidden && getComputedStyle(e).display !== 'none'
    && e.getClientRects().length > 0;
}, secici);
const menuAc = async (s) => {
  await s.click('#menu-ac');
  await o.bekle(s, () => document.getElementById('menu').open);
};

o.calistir(async () => {
  const sc = new o.Senaryo('pes');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, `${kok}?tohum=pes1`);

  await menuAc(sayfa);
  sc.dogrula('baslamadan-pes-yok', !(await gorunur(sayfa, '#pes-ac')),
    'oyun başlamadan menüde "Pes et" görünüyor');
  await sayfa.keyboard.press('Escape');
  await o.bekle(sayfa, () => !document.getElementById('menu').open);

  // Menü kapandıktan hemen sonraki ilk tuş ara sıra (≈1/8, başsız Chromium) oyuna ulaşmıyor;
  // bilinen kararsızlık: tuş bir kez daha denenir ve denetim yine başlamayı şart koşar.
  let basladi = false;
  for (let deneme = 0; deneme < 2 && !basladi; deneme++) {
    await sayfa.keyboard.down('d');
    basladi = await o.bekle(sayfa, () => window.__e2e.durumAl().baslangic !== null, null, 4000);
    await sayfa.keyboard.up('d');
  }
  sc.dogrula('tus-oyunu-baslatir', basladi, 'menü kapandıktan sonra yürüme oyunu başlatmadı');

  await menuAc(sayfa);
  await o.bekle(sayfa, () => !document.getElementById('pes-ac').hidden, null, 3000);
  sc.dogrula('pes-ac-gorunur', await gorunur(sayfa, '#pes-ac'), 'başladıktan sonra "Pes et" yok');
  sc.dogrula('onay-baslangicta-gizli', !(await gorunur(sayfa, '.menu-onay')),
    'onay satırı kendiliğinden açık');
  await sayfa.click('#pes-ac');
  sc.dogrula('onay-acilir', await gorunur(sayfa, '.menu-onay'), 'Pes et onay satırı açmadı');
  sc.dogrula('onay-metni', /Emin misin\? İğnenin yeri gösterilecek\./
    .test(await sayfa.textContent('.menu-onay-metin')), 'onay metni beklenenden farklı');
  sc.dogrula('evet-gorunur', await gorunur(sayfa, '#pes'), '"Evet, iğneyi göster" görünmüyor');
  sc.dogrula('onayda-henuz-bitmedi', !(await o.ozet(sayfa)).bitti, 'onay beklenmeden oyun bitti');

  await sayfa.click('.menu-onay button:text-is("Vazgeç")');
  sc.dogrula('vazgec', !(await gorunur(sayfa, '.menu-onay')) && !(await o.ozet(sayfa)).bitti,
    'Vazgeç onayı kapatmadı ya da oyunu bitirdi');

  await sayfa.click('#pes-ac');
  await sayfa.click('#pes');
  const bitti = await o.bekle(sayfa, () => window.__e2e.durumAl().bitti);
  sc.dogrula('pes-bitirir', bitti, 'onaydan sonra oyun bitmedi');
  const d = await sayfa.evaluate(() => {
    const durum = window.__e2e.durumAl();
    return { goster: durum.goster, sonuc: durum.sonuc, bitis: durum.bitis,
      fis: document.getElementById('bitis').open,
      duyuru: document.getElementById('duyuru').textContent.trim() };
  });
  sc.dogrula('igne-gosterildi', d.goster === true, 'durum.goster false: iğne gösterilmedi');
  sc.dogrula('pes-fis-yok', !d.fis && d.sonuc === null, 'pes edince kantar fişi açıldı');
  sc.dogrula('pes-duyuru', d.duyuru === 'Pes ettin, iğne gösterildi.', `duyuru: ${d.duyuru}`);
  sc.dogrula('menu-kapandi', await o.bekle(sayfa, () => !document.getElementById('menu').open),
    'pes edince menü kapanmadı');
  const ist = await sayfa.evaluate(() => JSON.parse(localStorage
    .getItem('haystack-hunt:istatistik')));
  sc.dogrula('istatistik-pes', ist && ist.pesEdilen === 1, `istatistik: ${JSON.stringify(ist)}`);

  // Süre durur: bitişten sonra HUD süresi değişmez.
  await sayfa.keyboard.down('d');
  const once = await sayfa.textContent('#sure');
  await o.kareBekle(sayfa, 5);
  await sayfa.keyboard.up('d');
  sc.dogrula('sure-durdu', (await o.ozet(sayfa)).bitti
    && (await sayfa.textContent('#sure')) === once, 'pes edince süre akmaya devam etti');

  await menuAc(sayfa);
  sc.dogrula('pes-sonrasi-pes-ac-gizli', !(await gorunur(sayfa, '#pes-ac')),
    'bitmiş oyunda "Pes et" görünüyor');
  await sayfa.click('#yeni');
  const yeni = await o.bekle(sayfa, () => !window.__e2e.durumAl().bitti
    && window.__e2e.durumAl().etiket !== 'pes1');
  sc.dogrula('yeni-tarla', yeni, 'Yeni tarla pes sonrası oyunu sıfırlamadı');
  sc.dogrula('yeni-goster-yok', !(await sayfa.evaluate(() => window.__e2e.durumAl().goster)),
    'yeni tarlada iğne gösterilmiş kaldı');

  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});
