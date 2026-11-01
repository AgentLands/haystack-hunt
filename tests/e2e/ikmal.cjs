/**
 * Senaryo (f): garajda yakıt ikmali. Traktöre binilir, yakıt durum kancasıyla azaltılır.
 * Park yerinde dururken (henüz uzaklaşılmadı) ikmal olmaz; garajdan 10 hücreden fazla
 * uzaklaşıp geri park edince depo %100'e dolar, "depo dolduruldu" bildirimi ve HUD şeridi
 * dolar; hak tek seferliktir (ikinci kez azaltılırsa yeniden dolmaz).
 *   node tests/e2e/ikmal.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const traktor = (s) => s.evaluate(() => {
  const m = window.__e2e.durumAl().makineler[0];
  return { x: m.x, y: m.y, hiz: m.hiz, yakit: m.yakit, hak: m.ikmalHakki, takili: m.takili,
    uzak: Math.hypot(m.x - m.park.x, m.y - m.park.y),
    serit: getComputedStyle(document.getElementById('makine-yakit')).getPropertyValue('--dolu') };
});
const yakitYaz = (s, v) => s.evaluate((y) => { window.__e2e.durumAl().makineler[0].yakit = y; }, v);

o.calistir(async () => {
  const sc = new o.Senaryo('ikmal');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, `${kok}?tohum=deneme`);

  await o.yuru(sayfa, (s) => [s.makineler[0].x, s.makineler[0].y], 3.6);
  await sayfa.keyboard.press('e');
  sc.dogrula('bindi', await o.bekle(sayfa, () => window.__e2e.durumAl().karakter.makine !== null),
    'traktöre binilemedi');
  await yakitYaz(sayfa, 0.3);

  // Park yerinde, hiç uzaklaşmadan: ikmal olmaz.
  await o.kareBekle(sayfa, 30);
  sc.dogrula('uzaklasmadan-ikmal-yok', (await traktor(sayfa)).yakit === 0.3,
    'garajdan hiç çıkmadan depo doldu');

  // Garajdan çık: ileri sür (kepçe takılırsa kazar) ve 11 hücreden fazla uzaklaş.
  await sayfa.keyboard.down('w');
  await sayfa.keyboard.down('Space');
  const uzaklasti = await o.bekle(sayfa, () => {
    const m = window.__e2e.durumAl().makineler[0];
    return Math.hypot(m.x - m.park.x, m.y - m.park.y) > 11;
  }, null, 40000);
  await sayfa.keyboard.up('Space');
  await sayfa.keyboard.up('w');
  sc.dogrula('garajdan-cikti', uzaklasti, 'traktör garajdan 11 hücre uzaklaşamadı');
  const yolda = await traktor(sayfa);
  sc.dogrula('yolda-ikmal-yok', yolda.yakit < 0.3 && yolda.hak === 1,
    `yolda yakıt ${yolda.yakit}, hak ${yolda.hak}`);

  // Geri park et: geri vitesle aynı çizgiden dön, park yerine varınca bırak.
  await yakitYaz(sayfa, 0.3);
  await sayfa.keyboard.down('s');
  const vardi = await o.bekle(sayfa, () => {
    const m = window.__e2e.durumAl().makineler[0];
    return Math.hypot(m.x - m.park.x, m.y - m.park.y) <= 2;
  }, null, 60000);
  await sayfa.keyboard.up('s');
  sc.dogrula('park-yerine-dondu', vardi, 'traktör park yerine geri dönemedi');
  const doldu = await o.bekle(sayfa, () => window.__e2e.durumAl().makineler[0].yakit === 1,
    null, 10000);
  const dolmadi = JSON.stringify(await traktor(sayfa));
  sc.dogrula('yakit-doldu', doldu, `geri parkta yakıt dolmadı: ${dolmadi}`);
  const son = await traktor(sayfa);
  sc.dogrula('hak-tuketildi', son.hak === 0, `ikmal hakkı ${son.hak}`);
  sc.dogrula('bildirim', await o.bekle(sayfa, () => document.getElementById('bildirim').textContent
    .includes('garajda depo dolduruldu'), null, 3000), '"depo dolduruldu" bildirimi yok');
  await o.kareBekle(sayfa, 4);
  sc.dogrula('hud-seridi-dolu', (await traktor(sayfa)).serit === '100%',
    `yakıt şeridi: ${(await traktor(sayfa)).serit}`);

  // Tek seferlik: yeniden azaltılırsa park yerinde bile dolmaz.
  await yakitYaz(sayfa, 0.2);
  await o.kareBekle(sayfa, 40);
  sc.dogrula('tek-seferlik', (await traktor(sayfa)).yakit === 0.2,
    'ikinci ikmal yapıldı (hak tek sefer olmalı)');

  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});
