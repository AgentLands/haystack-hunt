/**
 * Senaryo (a): tohumsuz açılış. Menü açık gelir; zorluk damgası (Zor) tarlayı Zor'a çevirir ve
 * menüyü açık bırakır; "Günün tarlası" günün etiketiyle (zorluk korunur) oyunu açar ve menüyü
 * kapatır; ilk açılış rehberi görünür, İleri ile adım adım ilerler (adım sayısı sayaçtan
 * okunur), Atla ve Başla kapatır,
 * "görüldü" localStorage'a yazılır, yeniden açılışta rehber gelmez, "?" düğmesi geri açar.
 *   node tests/e2e/acilis.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const rehberMetni = (s) => s.evaluate(() => {
  const r = document.querySelector('.rehber');
  return r ? { sayac: r.querySelector('.rehber-sayac').textContent,
    baslik: r.querySelector('h2').textContent } : null;
});
/** "3 / 11" sayacını { adim, toplam } olarak ayrıştırır (biçim bozuksa null). */
function sayacAyir(sayac) {
  const m = /^(\d+) \/ (\d+)$/.exec(sayac || '');
  return m ? { adim: Number(m[1]), toplam: Number(m[2]) } : null;
}
const GORULDU = 'haystack-hunt:rehber-goruldu';

async function zorlukVeGun(sayfa, sc) {
  sc.dogrula('menu-acik', await o.bekle(sayfa, () => document.getElementById('menu').open),
    'tohumsuz açılışta menü açılmadı');
  const damga = await sayfa.textContent('#menu-damga');
  sc.dogrula('menu-damga', /^Tarla No\. \d{4}-\d{2}-\d{2}$/.test(damga), `damga: ${damga}`);
  const secili = await sayfa.getAttribute('.zorluk-damga[aria-checked="true"]', 'data-zorluk');
  sc.dogrula('zorluk-varsayilan-normal', secili === 'normal', `seçili zorluk: ${secili}`);
  await sayfa.click('.zorluk-damga[data-zorluk="zor"]');
  const zor = await o.bekle(sayfa, () => window.__e2e.durumAl().zorluk === 'zor');
  sc.dogrula('zorluk-zor', zor, 'Zor damgası zorluğu değiştirmedi');
  const menuHala = await sayfa.evaluate(() => document.getElementById('menu').open);
  sc.dogrula('zorluk-menu-acik', menuHala, 'zorluk değişince menü kapandı');
  sc.dogrula('zorluk-damga-isaretli',
    (await sayfa.getAttribute('.zorluk-damga[data-zorluk="zor"]', 'aria-checked')) === 'true',
    'Zor damgası işaretlenmedi');
  sc.dogrula('zorluk-etiket', /Zor$/.test(await sayfa.textContent('#etiket')),
    `HUD etiketi: ${await sayfa.textContent('#etiket')}`);
  await sayfa.click('#gunun');
  const kapandi = await o.bekle(sayfa, () => !document.getElementById('menu').open);
  sc.dogrula('gunun-menu-kapanir', kapandi, '"Günün tarlası" menüyü kapatmadı');
  const gun = await sayfa.evaluate(async () => {
    const { gununEtiketi } = await import('./js/kural/rastgele.js');
    const d = window.__e2e.durumAl();
    return { beklenen: gununEtiketi(), etiket: d.etiket, zorluk: d.zorluk,
      adres: location.search, hud: document.getElementById('etiket').textContent };
  });
  sc.dogrula('gunun-etiket', gun.etiket === gun.beklenen, `etiket ${gun.etiket} ≠ ${gun.beklenen}`);
  sc.dogrula('gunun-zorluk-korunur', gun.zorluk === 'zor', `zorluk ${gun.zorluk}`);
  sc.dogrula('gunun-adres', gun.adres.includes(`tohum=${gun.beklenen}`), `adres: ${gun.adres}`);
  sc.dogrula('gunun-hud', /^Günün tarlası · /.test(gun.hud), `HUD: ${gun.hud}`);
}

async function rehberAdimlari(sayfa, sc) {
  const ilk = await rehberMetni(sayfa);
  const a0 = sayacAyir(ilk && ilk.sayac);
  sc.dogrula('rehber-acik', a0 && a0.adim === 1 && a0.toplam >= 3,
    `rehber: ${JSON.stringify(ilk)}`);
  await sayfa.click('.rehber .rehber-ileri');
  const ikinci = await rehberMetni(sayfa);
  const a1 = sayacAyir(ikinci && ikinci.sayac);
  sc.dogrula('rehber-ilerler', a1 && a1.adim === 2 && a1.toplam === a0.toplam,
    `rehber: ${JSON.stringify(ikinci)}`);
  sc.dogrula('rehber-vurgu', await sayfa.locator('[data-arac="el"].rehber-vurgu').count() === 1,
    '2. adımda El kartı vurgulanmadı');
  await sayfa.click('.rehber .dugme-metin'); // Atla
  sc.dogrula('rehber-atla', await sayfa.locator('.rehber').count() === 0, 'Atla rehberi kapatmadı');
  const kayit = await sayfa.evaluate((a) => localStorage.getItem(a), GORULDU);
  sc.dogrula('rehber-goruldu-yazildi', kayit === '1', `localStorage: ${kayit}`);
  sc.dogrula('rehber-vurgu-kalkti', await sayfa.locator('.rehber-vurgu').count() === 0,
    'rehber kapanınca vurgu kalktı mı');
}

async function rehberTamami(sayfa, baglamAdres, sc) {
  await o.git(sayfa, baglamAdres);
  sc.dogrula('rehber-tekrar-yok', await sayfa.locator('.rehber').count() === 0,
    'görüldükten sonra yeniden açılışta rehber geldi');
  await sayfa.click('button[aria-label="Nasıl oynanır? Rehberi aç"]');
  const toplam = sayacAyir((await rehberMetni(sayfa)).sayac).toplam;
  for (let i = 1; i < toplam; i++) await sayfa.click('.rehber .rehber-ileri');
  const son = await rehberMetni(sayfa);
  const aSon = sayacAyir(son && son.sayac);
  sc.dogrula('rehber-son-adim', aSon && aSon.adim === toplam && aSon.toplam === toplam,
    `rehber: ${JSON.stringify(son)}`);
  sc.dogrula('rehber-basla', (await sayfa.textContent('.rehber .rehber-ileri')) === 'Başla',
    'son adımda düğme "Başla" değil');
  await sayfa.click('.rehber .rehber-ileri');
  sc.dogrula('rehber-basla-kapatir', await sayfa.locator('.rehber').count() === 0,
    'Başla rehberi kapatmadı');
  // Hareket tuşu rehberi kapatır (oyuna geçmek için okumak şart değil).
  await sayfa.click('button[aria-label="Nasıl oynanır? Rehberi aç"]');
  await sayfa.keyboard.press('w');
  sc.dogrula('rehber-tus-kapatir', await o.bekle(sayfa, () => !document.querySelector('.rehber')),
    'W tuşu rehberi kapatmadı');
}

o.calistir(async () => {
  const sc = new o.Senaryo('acilis');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, kok);
  await zorlukVeGun(sayfa, sc);
  await rehberAdimlari(sayfa, sc);
  await rehberTamami(sayfa, `${kok}?tohum=ornek`, sc);
  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});
