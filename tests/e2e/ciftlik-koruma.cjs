/**
 * Senaryo: çiftlik modu normal modu BOZMAZ (iş K koruma satırları). İstatistik (elle iğne
 * alınsa bile yazılmaz), kantar fişi (açılmaz), meydan okuma (bağlantıdaki rakip çiftlikte
 * görünmez, adresten düşer), yarış (süren yarışta çiftliğe girmek onay ister; onayda yarıştan
 * çıkılır), ön hazırlık (çiftlikte sınırlı iş, hata yok), arayüz (süre, zorluk, pes gizli;
 * adres `?mod=ciftlik`; dönünce `tohum=`). Çiftlikten dönüşte zorluk korunur (bilinen hata
 * `ciftlik-koruma:zorluk-korunur`).
 *   node tests/e2e/ciftlik-koruma.cjs [--yavas N]
 */
const o = require('./ortak.cjs');
const {
  REHBER_GORULDU, elleIgneAl, depoOku, menuAc, menudenAc,
} = require('./ciftlik-ortak.cjs');

const gorunur = (s, secici) => s.evaluate((q) => {
  const e = document.querySelector(q);
  return Boolean(e) && !e.hidden && getComputedStyle(e).display !== 'none';
}, secici);

/** Çiftlikte iğne alınca istatistik ve fiş etkilenmez. */
async function istatistikVeFis(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, kok);
  const once = await depoOku(s, 'haystack-hunt:istatistik');
  await s.evaluate(async () => {
    const { dinle } = await import('./js/olaylar.js');
    window.__yasak = [];
    for (const ad of ['bulundu', 'pes-edildi', 'ilk-hamle']) {
      dinle(ad, () => window.__yasak.push(ad));
    }
  });
  sc.dogrula('menu-ciftlik', await menudenAc(s, o), 'menüden çiftlik açılmadı');
  sc.dogrula('igne-alindi', await elleIgneAl(s), 'çiftlikte iğne elle alınamadı');
  await o.kareBekle(s, 10);
  sc.dogrula('yasak-olay-yok', (await s.evaluate(() => window.__yasak)).length === 0,
    'çiftlik bulundu/pes-edildi/ilk-hamle yaydı');
  sc.dogrula('fis-kapali', await s.evaluate(() => !document.getElementById('bitis').open),
    'çiftlikte kantar fişi açıldı');
  sc.dogrula('istatistik-ayni', (await depoOku(s, 'haystack-hunt:istatistik')) === once,
    'çiftlik istatistiğe yazdı');
  sc.dogrula('arayuz-sure-gizli', !(await gorunur(s, '#sure')), 'çiftlikte süre görünüyor');
  sc.dogrula('arayuz-zorluk-gizli', !(await gorunur(s, '.menu-zorluk')),
    'çiftlikte zorluk seçimi görünüyor');
  sc.dogrula('arayuz-pes-gizli', !(await gorunur(s, '#pes-ac')), 'çiftlikte pes düğmesi görünüyor');
  sc.dogrula('arayuz-adres', await s.evaluate(() => location.search === '?mod=ciftlik'),
    'adres ?mod=ciftlik değil');
  await s.close();
  return hatalar;
}

/** Meydan okuma bağlantısıyla açılsa da çiftlikte rakip etiketi yok, adresten düşer. */
async function meydan(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, `${kok}?tohum=ciftlik&rakip=65000&ad=Ali&mod=ciftlik`);
  sc.dogrula('meydan-mod', await s.evaluate(() => window.__e2e.durumAl().mod === 'ciftlik'),
    '?mod=ciftlik çiftliği açmadı');
  sc.dogrula('meydan-etiket-yok', !(await gorunur(s, '.meydan-etiket.hedef')),
    'çiftlikte "Geçilecek süre" etiketi göründü');
  sc.dogrula('meydan-adres', await s.evaluate(() => !/rakip=|ad=/.test(location.search)),
    'çiftlikte rakip adresten düşmedi');
  await s.close();
  return hatalar;
}

/** Süren yarışta çiftliğe girmek onay ister; reddedilirse normal tarla kalır. */
async function yaris(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, kok);
  await s.evaluate(async () => {
    const { korumaKaydet } = await import('./js/ozellik/koruma.js');
    window.__ayrilma = 0;
    korumaKaydet({ suruyor: () => true, ayril: () => { window.__ayrilma += 1; } });
  });
  const sorular = [];
  let kabul = false;
  s.on('dialog', (d) => { sorular.push(d.message()); (kabul ? d.accept() : d.dismiss()); });
  await menuAc(s, o);
  await s.click('.menu-ciftlik');
  await o.kareBekle(s, 4);
  sc.dogrula('yaris-soru', sorular.length === 1 && /Yarış sürüyor/.test(sorular[0]),
    `onay sorusu gelmedi: ${JSON.stringify(sorular)}`);
  sc.dogrula('yaris-red-tarla', await s.evaluate(() => window.__e2e.durumAl().mod === 'tarla'),
    'onay verilmedi ama çiftlik açıldı');
  kabul = true;
  await menuAc(s, o);
  await s.click('.menu-ciftlik');
  sc.dogrula('yaris-onay-ciftlik', await o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik'),
    'onayda çiftlik açılmadı');
  sc.dogrula('yaris-ayrildi', (await s.evaluate(() => window.__ayrilma)) === 1,
    'onayda yarıştan çıkılmadı');
  await s.close();
  return hatalar;
}

/** Ön hazırlık işçisi çiftlikte sınırlı iş alır; sonra normal moda dönüş ve zorluk. */
async function onHazirlikVeDonus(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await s.addInitScript(() => {
    window.__isci = [];
    const orijinal = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function mesaj(m, ...r) {
      window.__isci.push(m && m.tur);
      return orijinal.call(this, m, ...r);
    };
  });
  await o.git(s, `${kok}?tohum=donus-1&zorluk=zor`);
  sc.dogrula('donus-zor-basta', await s.evaluate(() => window.__e2e.durumAl().zorluk === 'zor'),
    '?zorluk=zor uygulanmadı');
  sc.dogrula('donus-ciftlik', await menudenAc(s, o), 'menüden çiftlik açılmadı');
  await o.bekle(s, () => false, null, 1200); // ön hazırlık gecikmesi (600 ms) geçsin
  const isler = await s.evaluate(() => window.__isci.filter((t) => t === 'tarla').length);
  sc.dogrula('on-hazirlik-sinirli', isler <= 4, `çiftlikte ${isler} tarla hazırlığı istendi`);
  await s.keyboard.press('Escape');
  await o.bekle(s, () => document.getElementById('menu').open);
  await s.click('#gunun');
  sc.dogrula('donus-normal', await o.bekle(s, () => window.__e2e.durumAl().mod === 'tarla'),
    'normal moda dönülemedi');
  sc.dogrula('zorluk-korunur', await s.evaluate(() => window.__e2e.durumAl().zorluk === 'zor'),
    'çiftlikten dönünce seçilen zorluk (zor) normal\'e düştü');
  sc.dogrula('donus-adres', await s.evaluate(() => /tohum=/.test(location.search)
    && !/mod=/.test(location.search)), 'normal modda adres düzelmedi');
  sc.dogrula('donus-sure', await gorunur(s, '#sure'), 'normal modda süre geri gelmedi');
  sc.dogrula('donus-pes', await gorunur(s, '#pes-ac') || await s.evaluate(
    () => Boolean(document.getElementById('pes-ac'))), 'pes düğmesi yok');
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-koruma');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    const hatalar = [
      ...await istatistikVeFis(tarayici, sunucu.kok, sc),
      ...await meydan(tarayici, sunucu.kok, sc),
      ...await yaris(tarayici, sunucu.kok, sc),
      ...await onHazirlikVeDonus(tarayici, sunucu.kok, sc),
    ];
    sc.hatalariDenetle(hatalar);
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
