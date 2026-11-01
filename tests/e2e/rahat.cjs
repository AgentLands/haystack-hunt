/**
 * Senaryo (d): rahat mod. `?rahat=1` ile süre kutusu gizlenir, "Tarla %N temiz" görünür,
 * paslı çivi alınınca süre cezası 0'dır (rahatsız modda 25 sn), bitiş fişi yalnız "buldum" ve
 * temizlik yüzdesini söyler (puan/satırlar gizli). Menüdeki "Rahat mod" düğmesi tercihi
 * adrese ve localStorage'a yazar; yenilenince korunur; `?rahat=0` onu geçersiz kılar.
 *   node tests/e2e/rahat.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const gorunur = (s, secici) => s.evaluate((q) => {
  const e = document.querySelector(q);
  return Boolean(e) && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
}, secici);

/** İlk çiviyi açıp Boşlukla alır; alınınca durum.ceza ve süre kayması okunur. */
async function civiAl(sayfa) {
  const c = (await o.ozet(sayfa)).civiler[0];
  await sayfa.keyboard.down('d'); // süreyi başlat
  await o.bekle(sayfa, () => window.__e2e.durumAl().baslangic !== null);
  await sayfa.keyboard.up('d');
  const once = (await o.ozet(sayfa)).baslangic;
  await o.isinlaVeAc(sayfa, c.x, c.y, c.z);
  await sayfa.keyboard.down('Space');
  const alindi = await o.bekle(sayfa, () => window.__e2e.durumAl().tarla.civiler
    .some((x) => x.alindi), null, 10000);
  await sayfa.keyboard.up('Space');
  const son = await o.ozet(sayfa);
  return { alindi, ceza: son.ceza, kayma: once - son.baslangic };
}

async function rahatOyun(tarayici, kok, sc) {
  const { sayfa, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, `${kok}?tohum=rahat1&rahat=1`);
  sc.dogrula('rahat-durum', (await o.ozet(sayfa)).rahat, '?rahat=1 oyunu rahat açmadı');
  sc.dogrula('rahat-govde', await sayfa.evaluate(() => document.body.classList
    .contains('rahat-mod')), 'gövdede rahat-mod sınıfı yok');
  sc.dogrula('sure-gizli', !(await gorunur(sayfa, '#sure')), 'rahat modda süre görünüyor');
  sc.dogrula('kaldirilan-gorunur', await gorunur(sayfa, '#kaldirilan'),
    'kaldırılan saman sayacı da gizlendi');
  const temiz = await sayfa.textContent('.meydan-etiket.temiz');
  sc.dogrula('temizlik-etiketi', /^Tarla %\d+(,\d)? temiz$/.test(temiz), `etiket: ${temiz}`);
  sc.dogrula('rahat-dugme', await sayfa.locator(
    'button.rahat-damga[aria-pressed="true"]').count() === 1,
  'Rahat mod düğmesi açık görünmüyor');
  const civi = await civiAl(sayfa);
  sc.dogrula('civi-alindi', civi.alindi, 'çivi alınamadı');
  sc.dogrula('civi-ceza-sifir', civi.ceza === 0 && civi.kayma === 0,
    `rahat modda çivi cezası: ceza=${civi.ceza} kayma=${civi.kayma}`);
  const bitti = await o.igneyiHizlaBul(sayfa, 1000);
  sc.dogrula('rahat-fis', bitti, 'bitiş fişi açılmadı');
  const fis = await sayfa.evaluate(() => ({
    sinif: document.getElementById('bitis').classList.contains('rahat-fis'),
    sonuc: document.getElementById('sonuc').textContent,
    satirlar: getComputedStyle(document.querySelector('.fis-satirlar')).display,
    puan: getComputedStyle(document.querySelector('.fis-toplam')).display,
    meydan: getComputedStyle(document.querySelector('.meydan-dugme')).display,
  }));
  sc.dogrula('fis-rahat-sinifi', fis.sinif, 'fişte rahat-fis sınıfı yok');
  sc.dogrula('fis-sonuc-metni',
    /^Buldun! Tarlanın %\d+(,\d)? kadarını temizledin\.$/.test(fis.sonuc),
    `fiş metni: ${fis.sonuc}`);
  sc.dogrula('fis-puan-gizli', fis.satirlar === 'none' && fis.puan === 'none',
    `satırlar=${fis.satirlar} puan=${fis.puan}`);
  sc.dogrula('fis-meydan-gizli', fis.meydan === 'none', 'rahat fişte "Meydan oku" görünüyor');
  return { sayfa, hatalar };
}

async function normalOyun(tarayici, kok, sc) {
  const { sayfa, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, `${kok}?tohum=rahat1`);
  sc.dogrula('normal-sure-gorunur', await gorunur(sayfa, '#sure'), 'normal modda süre gizli');
  sc.dogrula('normal-govde', !(await sayfa.evaluate(() => document.body.classList
    .contains('rahat-mod'))), 'normal modda rahat-mod sınıfı var');
  const civi = await civiAl(sayfa);
  sc.dogrula('normal-civi-ceza', civi.alindi && civi.ceza === 25000 && civi.kayma === 25000,
    `normal modda çivi cezası 25 sn olmalı: ceza=${civi.ceza} kayma=${civi.kayma}`);
  await sayfa.close();
  return hatalar;
}

async function tercih(tarayici, kok, sc) {
  const { sayfa, baglam, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, `${kok}?tohum=rahat2`);
  await sayfa.click('#menu-ac');
  await o.bekle(sayfa, () => document.getElementById('menu').open);
  await sayfa.click('button:text-is("Rahat mod")');
  const acildi = await o.bekle(sayfa, () => window.__e2e.durumAl().rahat);
  sc.dogrula('dugme-rahat-acar', acildi, 'Rahat mod düğmesi oyunu rahat açmadı');
  sc.dogrula('dugme-adres', sayfa.url().includes('rahat=1'), `adres: ${sayfa.url()}`);
  const kayit = await sayfa.evaluate(() => localStorage.getItem('haystack-hunt:rahat'));
  sc.dogrula('dugme-kayit', kayit === '1', `localStorage: ${kayit}`);
  await o.git(sayfa, `${kok}?tohum=rahat2`); // tercih adreste yok: kayıttan gelir
  sc.dogrula('tercih-kalici', (await o.ozet(sayfa)).rahat, 'tercih yenilenince korunmadı');
  await o.git(sayfa, `${kok}?tohum=rahat2&rahat=0`);
  sc.dogrula('rahat-0-gecersiz-kilar', !(await o.ozet(sayfa)).rahat, '?rahat=0 tercihi ezmedi');
  await baglam.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('rahat');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const rahat = await rahatOyun(tarayici, kok, sc);
  const hatalar = [...rahat.hatalar, ...await normalOyun(tarayici, kok, sc),
    ...await tercih(tarayici, kok, sc)];
  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});
