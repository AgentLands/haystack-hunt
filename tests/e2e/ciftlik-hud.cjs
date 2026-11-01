/**
 * Senaryo: çiftlik HUD ve ekranları. Menüden çiftliğe girilir; üst şerit (kuruş, 4 hava
 * dilimi, damga, sorun, pano), öğreticinin README "ilk 10 dakika" adımları (huni → bant →
 * teslim D1 → çivi → D2 → kol → ilk iğne D3; G ekonomisi, kapı teslimi teslimEt ile), damga
 * mührü, sorun listesi ve
 * kameranın parçaya gitmesi, damga defteri, istatistik, kapı paneli, çevrimdışı fişi, menü
 * bölümü (Yeni çiftlik, kayıt yuvaları), "Nasıl oynanır" Çiftlik sekmesi, ses olayları ve
 * normal moda dönüşte HUD'un eski haline gelmesi. Telefonda (390×844) taşma ve dokunma.
 * Benzetim hızlı ileri sarılır (tikAt + olay yayma); komutlar arayüzün kullandığı komutEkle.
 *   node tests/e2e/ciftlik-hud.cjs [--yavas N]
 */
const o = require('./ortak.cjs');
const g = require('./ortak-girdi.cjs');
const {
  yerBul, hatKur, ileri, ileriKadar, metin, olayYay, teslim,
} = require('./ciftlik-hud-yardim.cjs');

const REHBER_GORULDU = () => {
  try {
    localStorage.setItem('haystack-hunt:rehber-goruldu', '1');
  } catch (hata) {
    console.error(hata);
  }
};

const gorunur = (s, sec) => s.isVisible(sec);
const adimAdi = (s) => s.evaluate(() => document.querySelector('.cf-ogretici h2')
  ?.firstChild.textContent ?? '');
const adimNo = (s) => metin(s, '.cf-ogretici .cf-ogretici-sayac');

async function giris(s, sc) {
  await s.click('.menu-ciftlik');
  sc.dogrula('giris-mod', await o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik'),
    'menüden çiftliğe girilemedi');
  await o.bekle(s, () => document.querySelector('.cf-kurus strong')?.textContent !== '0');
}

async function serit(s, sc) {
  sc.dogrula('serit-gorunur', await gorunur(s, '.cf-serit'), 'şerit yok');
  sc.dogrula('serit-kurus', (await metin(s, '.cf-kurus strong')) === '300', 'başlangıç 300 değil');
  sc.dogrula('serit-hava', await s.evaluate(() => document.querySelectorAll('.cf-hv').length === 4
    && [...document.querySelectorAll('.cf-hv')].every((h) => h.title.length > 6)),
  'hava şimdi + 3 dilim değil');
  sc.dogrula('serit-damga', (await metin(s, '.cf-damga-kod')) === 'D1', 'sıradaki damga D1 değil');
  sc.dogrula('normal-hud-gizli', !(await gorunur(s, '.panel')) && !(await gorunur(s, '#sure')),
    'süre ve saman etiketi çiftlikte görünüyor');
}

async function ogretici(s, sc, yer) {
  sc.dogrula('ogr-amac', (await adimNo(s)) === '1/11' && await gorunur(s, '.cf-ogretici'),
    `öğretici ilk adımda değil: ${await adimNo(s)}`);
  sc.dogrula('ogr-vurgu', await s.evaluate(() => document.querySelector('[data-ciftlik-pano]')
    .classList.contains('rehber-vurgu')), 'pano vurgulanmadı');
  await s.click('.cf-ogretici .dugme-birincil');
  sc.dogrula('ogr-huni', await o.bekle(s, () => document.querySelector('.cf-ogretici h2')
    ?.textContent.startsWith('Emici huni')), 'huni adımına geçmedi');
  await hatKur(s, yer);
  sc.dogrula('ogr-akis', await o.bekle(s, () => document.querySelector('.cf-ogretici h2')
    ?.textContent.startsWith('Yığın akar')), 'huni kurulunca akış adımı gelmedi');
  await ileri(s, 60);
  sc.dogrula('ogr-teslim', await o.bekle(s, () => /^Teslim/.test(
    document.querySelector('.cf-ogretici h2')?.textContent ?? '')), `adım: ${await adimNo(s)}`);
  const kurus0 = Number((await metin(s, '.cf-kurus strong')).replace('.', ''));
  await teslim(s, 'saman', 30);
  sc.dogrula('d1-damga', await ileriKadar(s, () => document.querySelector('.cf-damga-kod')
    .textContent === 'D2'), `D1 basılmadı: ${await metin(s, '.cf-damga-kod')}`);
  await o.kareBekle(s, 20);
  sc.dogrula('d1-muhur', await gorunur(s, '.cf-damga-vuru'), 'damga mührü yok');
  sc.dogrula('d1-kurus', Number((await metin(s, '.cf-kurus strong')).replace('.', ''))
    >= kurus0 + 150, 'D1 ödülü kuruşa eklenmedi');
  sc.dogrula('d1-fark', /^\+\d/.test(await metin(s, '.cf-fark')), '+N farkı yok');
  sc.dogrula('ogr-civi', (await adimAdi(s)) === 'Paslı çivi',
    `D1'den sonra çivi adımı değil: ${await adimAdi(s)}`);
  await s.evaluate(async () => {
    const { esyaKodu } = await import('./js/kural/ciftlik/esya.js');
    const c = window.__e2e.durumAl().ciftlik;
    c.gomulu.push({ esya: esyaKodu('civi'), x: 0, y: 0, z: 0, alindi: true });
  });
  sc.dogrula('ogr-miknatis', await o.bekle(s, () => document.querySelector('.cf-ogretici h2')
    ?.firstChild.textContent === 'Oluk mıknatısı'), 'alınan çivi sonrası mıknatıs adımı gelmedi');
  await ileriKadar(s, () => window.__e2e.durumAl().ciftlik.ekonomi.pano[0]?.damga === 'D2');
  await teslim(s, 'saman', 40);
  sc.dogrula('d2-damga', await ileriKadar(s, () => document.querySelector('.cf-damga-kod')
    .textContent === 'D3'), `D2 basılmadı: ${await metin(s, '.cf-damga-kod')}`);
  await o.kareBekle(s, 20);
  sc.dogrula('ogr-kol-atlandi', (await adimAdi(s)) === 'Yaba kolu',
    `D2'den sonra kol adımı değil: ${await adimAdi(s)}`);
  await s.evaluate(async () => { // ilk iğne bulundu (elle alınmış gibi: G 'tam')
    const { bulundu } = await import('./js/kural/ciftlik/isleme/bulundu.js');
    const { esyaKodu } = await import('./js/kural/ciftlik/esya.js');
    const { yay } = await import('./js/olaylar.js');
    bulundu({ c: window.__e2e.durumAl().ciftlik, olay: yay }, esyaKodu('igne'), 'el', 'tam');
  });
  sc.dogrula('d3-damga', await ileriKadar(s, () => document.querySelector('.cf-damga-kod')
    .textContent === 'D4'), 'D3 (ilk iğne) basılmadı');
  sc.dogrula('ogr-bitti', await o.bekle(s, () => document.querySelector('.cf-ogretici').hidden)
    && await s.evaluate(() => JSON.parse(localStorage.getItem('haystack-hunt:ciftlik-ogretici'))
      .bitti === true), 'öğretici bitmedi / kaydedilmedi');
}

async function ekranlar(s, sc) {
  await s.evaluate(() => {
    const c = window.__e2e.durumAl().ciftlik;
    const huni = [...c.parcalar.values()].find((p) => p.tanim.anahtar === 'huni');
    huni.tikali = true;
    window.__huni = huni;
  });
  sc.dogrula('sorun-rozet', await o.bekle(s, () => document.querySelector('.cf-sorun .cf-rozet')
    .textContent === '1'), 'tıkalı parça rozete yansımadı');
  await s.click('.cf-sorun');
  sc.dogrula('sorun-liste', (await metin(s, '.cf-sorun-satir')).includes('Emici huni'),
    'sorun listesinde huni yok');
  const once = await s.evaluate(async () => (await import('./js/gorunum.js')).gorunum.gx);
  await s.click('.cf-sorun-satir');
  const sonra = await s.evaluate(async () => (await import('./js/gorunum.js')).gorunum.gx);
  sc.dogrula('sorun-kamera', once !== sonra && !(await gorunur(s, '.cf-sorun-liste')),
    'satıra tıklayınca kamera gitmedi / liste kapanmadı');
  await s.evaluate(() => { window.__huni.tikali = false; });

  await s.click('.cf-damga-dugme');
  sc.dogrula('defter', await s.evaluate(() => document.querySelectorAll('.cf-damga-satir').length
    === 14 && document.querySelectorAll('.cf-damga-satir.basildi').length === 3),
  'damga defteri 14 satır / 3 basılı değil');
  await s.keyboard.press('Escape');
  await o.bekle(s, () => !document.querySelector('.cf-defter').open);

  await s.keyboard.press('i');
  sc.dogrula('istatistik', await o.bekle(s, () => document.querySelector('.cf-istatistik')?.open)
    && (await metin(s, '.cf-istatistik')).includes('Üretim hızı'), 'I istatistiği açmadı');
  await s.keyboard.press('Escape');
  await o.bekle(s, () => !document.querySelector('.cf-istatistik').open);
  await s.click('button[aria-label="İstatistik"]');
  sc.dogrula('istatistik-defter-dugmesi', await o.bekle(s, () => document.querySelector(
    '.cf-istatistik')?.open), 'çiftlikte Defter düğmesi çiftlik istatistiğini açmadı');
  await s.keyboard.press('Escape');
  await o.bekle(s, () => !document.querySelector('.cf-istatistik').open);

  if (!(await gorunur(s, '.cf-pano'))) await s.click('.cf-pano-dugme');
  // biten kartın yerine yenisi PANO.yenileTik sonra gelir
  sc.dogrula('pano-kartlar', await ileriKadar(s, () => document.querySelectorAll('.cf-kart')
    .length === 3), 'pano 3 kart değil');
  await s.click('.cf-kapi-ac');
  sc.dogrula('kapi', await s.evaluate(() => document.querySelector('.cf-kapi').open
    && document.querySelectorAll('.cf-kapi-satir').length === 2
    && document.querySelector('.cf-anahtar').getAttribute('role') === 'switch'),
  'kapı paneli eksik');
  await s.click('.cf-kapi-satir.araba .cf-kapi-dugme');
  sc.dogrula('kapi-komut', await o.bekle(s, () => document.getElementById('bildirim')
    .textContent.length > 5 || window.__e2e.durumAl().ciftlik.kuyruk.length > 0),
  'araba çağırma komutu verilmedi');
  await s.keyboard.press('Escape');

  await olayYay(s, 'ciftlik-cevrimdisi', { dk: 192, kazanc: { esya: { 1: 312 }, kurus: 40,
    dolu: ['Ambar'] } });
  sc.dogrula('fis', await o.bekle(s, () => document.querySelector('.cf-fis')?.open)
    && (await metin(s, '.cf-fis')).includes('3 sa 12 dk') && (await metin(s, '.cf-fis'))
      .includes('Ambar doldu'), 'çevrimdışı fişi yanlış');
  await s.keyboard.press('Escape');
  await o.bekle(s, () => !document.querySelector('.cf-fis').open);
}

async function menuVeYardim(s, sc) {
  await s.keyboard.press('Escape');
  await o.bekle(s, () => document.getElementById('menu').open);
  sc.dogrula('menu-blok', await gorunur(s, '.menu-ciftlik-blok')
    && !(await gorunur(s, '.menu-ciftlik'))
    && await gorunur(s, '.menu-ciftlik-yeni'), 'menü çiftlik bölümü yok');
  await s.click('.menu-ciftlik-kayit summary');
  sc.dogrula('menu-yuva', (await metin(s, '.menu-ciftlik-yuvalar')).includes('Son kayıt'),
    'Son kayıt yuvası listelenmedi');
  const tohum = await s.evaluate(() => window.__e2e.durumAl().ciftlik.tohum);
  await s.click('.menu-ciftlik-yeni');
  sc.dogrula('menu-onay', await gorunur(s, '.menu-ciftlik-onay'), 'yeni çiftlik onayı yok');
  await s.click('.menu-ciftlik-onay .dugme-birincil');
  sc.dogrula('yeni-ciftlik', await o.bekle(s, (t) => window.__e2e.durumAl().mod === 'ciftlik'
    && window.__e2e.durumAl().ciftlik.tohum !== t && [...window.__e2e.durumAl().ciftlik
      .parcalar.values()].every((p) => p.tanim.sokulmez), tohum), 'yeni çiftlik kurulmadı');
  sc.dogrula('yedek', await s.evaluate((t) => JSON.parse(localStorage
    .getItem('haystack-hunt:ciftlik-yedek')).tohum === t, tohum),
  'eski çiftlik Yedek yuvasına geçmedi');
  // Yeni çiftlik kuruşu: 300 + 100 × basılmış damga (ekonomi.md §5; damgalar kalıcı)
  await o.bekle(s, () => document.querySelector('.cf-serit .cf-kurus strong').textContent
    === String(300 + 100 * window.__e2e.durumAl().ciftlik.ilerleme.damgalar.length));
  const beklenen = await s.evaluate(() => String(300 + 100 * window.__e2e.durumAl().ciftlik
    .ilerleme.damgalar.length));
  sc.dogrula('yeni-kurus', (await metin(s, '.cf-serit .cf-kurus strong')) === beklenen
    && (await s.evaluate(() => document.getElementById('menu').open) === false),
  `yeni çiftlikte kuruş ${beklenen} değil ya da menü açık kaldı`);
  await s.keyboard.press('Escape');
  await o.bekle(s, () => document.getElementById('menu').open);
  await s.click('.menu-baglantilar button:text-is("Nasıl oynanır")');
  await s.click('.yardim-sekme:text-is("Çiftlik")');
  sc.dogrula('yardim-sekme', await s.evaluate(() => document.querySelectorAll('#yardim-panel li')
    .length >= 10), 'Çiftlik sekmesinde madde yok');
  await s.keyboard.press('Escape');
  await o.bekle(s, () => !document.getElementById('yardim').open);
  await s.keyboard.press('Escape');
  await o.bekle(s, () => !document.getElementById('menu').open);
}

async function sesVeNormal(s, sc) {
  await s.mouse.click(300, 300);
  for (const [ad, v] of [['damga-basildi', { damga: 'D9', ad: 'Deneme' }],
    ['ciftlik-kurus', { fark: 150, kurus: 900 }], ['parca-kuruldu', { parca: { x: 3, y: 3,
      en: 2, boy: 2 } }], ['harman-arabasi', { asama: 'dokum', x: 20, y: 20 }],
    ['harman-arabasi', { asama: 'duyuru', x: 20, y: 20 }], ['ogretici-adim', {}],
    ['ciftlik-sorun-secildi', { kx: 5, ky: 5, parca: 1 }]]) {
    await olayYay(s, ad, v);
  }
  await o.kareBekle(s, 5);
  await s.keyboard.press('Escape');
  await o.bekle(s, () => document.getElementById('menu').open);
  await s.click('#gunun');
  sc.dogrula('normal', await o.bekle(s, () => window.__e2e.durumAl().mod === 'tarla'),
    'normal moda dönülemedi');
  sc.dogrula('normal-hud', !(await gorunur(s, '.cf-serit')) && await gorunur(s, '.panel')
    && !(await gorunur(s, '.cf-ogretici')) && !(await gorunur(s, '.cf-pano')),
  'normal modda çiftlik HUD\'u görünüyor ya da süre/saman gizli');
  await s.click('button[aria-label="İstatistik"]');
  sc.dogrula('normal-istatistik', await o.bekle(s, () => [...document.querySelectorAll('dialog')]
    .some((d) => d.open && !d.classList.contains('cf-istatistik'))),
  'normal modda Defter normal istatistiği açmadı');
}

async function masaustu(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, { viewport: { width: 1280,
    height: 800 } });
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, kok);
  await giris(s, sc);
  await serit(s, sc);
  const yer = await yerBul(s);
  await ogretici(s, sc, yer);
  await ekranlar(s, sc);
  await menuVeYardim(s, sc);
  await sesVeNormal(s, sc);
  await s.close();
  return hatalar;
}

async function telefon(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, { viewport: { width: 390,
    height: 844 }, hasTouch: true, isMobile: true });
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, `${kok}?mod=ciftlik`);
  await o.bekle(s, () => document.querySelector('.cf-kurus strong')?.textContent === '300');
  const y = await g.yerlesim(s);
  sc.dogrula('tel-tasma-yok', !y.tasma, `scrollWidth ${y.scrollWidth} > ${y.innerWidth}`);
  const sig = await s.evaluate(() => {
    const e = document.querySelector('.cf-serit');
    return { sw: e.scrollWidth, cw: e.clientWidth };
  });
  sc.dogrula('tel-serit-sigar', sig.sw <= sig.cw, `şerit içeriği taşıyor ${sig.sw} > ${sig.cw}`);
  sc.dogrula('tel-dokunma-hedefi', await s.evaluate(() => [...document.querySelectorAll(
    '.cf-damga-dugme, .cf-sorun, .cf-pano-dugme')].every((d) => {
    const k = d.getBoundingClientRect();
    return k.width >= 40 && k.height >= 44;
  })), 'şerit düğmeleri 44 px yükseklikte değil');
  await s.tap('.cf-pano-dugme');
  sc.dogrula('tel-pano', await gorunur(s, '.cf-pano') && !(await gorunur(s, '.cf-ogretici')),
    'telefonda pano açılmadı ya da öğretici notu üstüne bindi');
  const y2 = await g.yerlesim(s);
  sc.dogrula('tel-pano-tasma-yok', !y2.tasma, `panoda taşma ${y2.scrollWidth}`);
  await s.tap('.cf-pano-dugme');
  await s.tap('.cf-damga-dugme');
  sc.dogrula('tel-defter', await o.bekle(s, () => document.querySelector('.cf-defter')?.open),
    'telefonda damga defteri açılmadı');
  const k = await s.evaluate(() => document.querySelector('.cf-defter').getBoundingClientRect()
    .right <= innerWidth);
  sc.dogrula('tel-defter-sigar', k, 'damga defteri ekrandan taşıyor');
  await s.keyboard.press('Escape');
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-hud');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle([...await masaustu(tarayici, sunucu.kok, sc),
      ...await telefon(tarayici, sunucu.kok, sc)]);
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
