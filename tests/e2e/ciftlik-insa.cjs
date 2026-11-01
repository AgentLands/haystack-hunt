/**
 * Senaryo: çiftlik inşa arayüzü, masaüstü (1280×800, gerçek fare ve klavye). Palet (B),
 * hayaletin durumu ve neden etiketi (bağlantısız / dolu), tek tıkla kurma, sürükleyerek hat
 * çekme (geri izleme kuyruğu siler, engelde önek kurulur ve sandığa bağlanır, köşede
 * histerezis), Esc sürüklemeyi iptal eder, Ctrl+Z / Ctrl+Y (bir sürükleme tek adım),
 * R ve tekerlek döndürür (tekerlek kur kipinde yakınlaştırmaz), 1-9 hızlı çubuk aracı
 * değiştirmez, Q pipet, X sil kipi + sürükleyerek toplu söküm, Esc zinciri menüyü açmaz,
 * gezde parçaya tık inceleme panelini açar ve panelden sök, kısayollar normal modu etkilemez.
 *   node tests/e2e/ciftlik-insa.cjs [--ekran KLASOR] [--yavas N]
 */
const o = require('./ortak.cjs');
const I = require('./ciftlik-insa-ortak.cjs');

const insaAl = (s) => s.evaluate(() => {
  const i = window.__insa;
  return { kip: i.kip, secili: i.secili, yon: i.yon, onizleme: i.onizleme,
    yol: i.yol && i.yol.map((k) => [k.kx, k.ky, k.durum]), bag: i.yolDenetim?.bag ?? false,
    etiket: document.querySelector('.ciftlik-etiket').hidden ? null
      : document.querySelector('.ciftlik-etiket').textContent };
});

async function git(s, kx, ky, dx = 0, dy = 0, steps = 6) {
  const p = await I.ekran(s, kx, ky, dx, dy);
  await s.mouse.move(p.x, p.y, { steps });
}

async function tikla(s, kx, ky) {
  await git(s, kx, ky);
  await s.mouse.down();
  await s.mouse.up();
}

async function hayaletVeHat(s, sc, kx, ky) {
  await s.click('.ciftlik-parca[data-parca="sandik"]');
  await I.kameraDurdu(s);
  await git(s, kx + 8, ky);
  await o.bekle(s, () => window.__insa.onizleme?.durum === 'uyari');
  let d = await insaAl(s);
  sc.dogrula('hayalet-baglantisiz', d.onizleme?.durum === 'uyari' && /bağlantısız/.test(d.etiket),
    `önizleme ${JSON.stringify(d.onizleme)} etiket ${d.etiket}`);
  await tikla(s, kx + 8, ky);
  sc.dogrula('tik-kurar', await I.parcaSayisi(s, 1), 'tık sandık kurmadı');
  await git(s, kx + 8, ky, 0.2, 0.1);
  await o.bekle(s, () => window.__insa.onizleme?.neden === 'dolu');
  d = await insaAl(s);
  sc.dogrula('neden-dolu', /dolu/.test(d.etiket ?? ''), `etiket ${d.etiket}`);
  await I.ekranAl(s, 'm1-gecersiz.png');
  await s.mouse.down();
  await s.mouse.up();
  await o.kareBekle(s, 4);
  sc.dogrula('gecersiz-kurmaz', (await I.parcalar(s)).length === 1, 'dolu yere kuruldu');

  await s.click('.ciftlik-parca[data-parca="bant"]');
  await git(s, kx + 1, ky);
  await s.mouse.down();
  await git(s, kx + 5, ky, 0, 0, 10);
  await git(s, kx + 5, ky + 2, 0, 0, 8);
  const asagi = (await insaAl(s)).yol.length;
  await git(s, kx + 5, ky, 0, 0, 8);
  const geri = (await insaAl(s)).yol;
  sc.dogrula('geri-izleme', asagi === 7 && geri.length === 5 && geri.every((k) => k[1] === ky),
    `aşağı ${asagi}, geri ${JSON.stringify(geri)}`);
  await git(s, kx + 10, ky, 0, 0, 12);
  d = await insaAl(s);
  sc.dogrula('hat-bag', d.bag && d.yol.length === 8 && /bağlanır/.test(d.etiket ?? ''),
    `yol ${JSON.stringify(d.yol)} etiket ${d.etiket}`);
  await I.ekranAl(s, 'm2-hat.png');
  await s.mouse.up();
  sc.dogrula('hat-onek', await I.parcaSayisi(s, 8), 'önek (7 bant) kurulmadı');
  const p = await I.parcalar(s);
  sc.dogrula('hat-yon', p.filter((x) => x.a === 'bant').every((x) => x.y === ky && x.yon === 0),
    JSON.stringify(p));
  await s.keyboard.press('Control+z');
  sc.dogrula('geri-al-tek-adim', await I.parcaSayisi(s, 1), 'Ctrl+Z hattı tek adımda sökmedi');
  await s.keyboard.press('Control+y');
  sc.dogrula('yinele', await I.parcaSayisi(s, 8), 'Ctrl+Y geri kurmadı');
}

async function histerezis(s, sc, kx, ky) {
  await git(s, kx + 1, ky + 3);
  await s.mouse.down();
  await git(s, kx + 4, ky + 3, 0, 0, 10);
  await git(s, kx + 4, ky + 3, 0, 0.55, 4);
  const titrek = (await insaAl(s)).yol.at(-1);
  await git(s, kx + 4, ky + 3, 0, 0.72, 4);
  const don = (await insaAl(s)).yol.at(-1);
  sc.dogrula('histerezis', titrek[1] === ky + 3 && don[1] === ky + 4,
    `0,55 sapmada ${titrek}, 0,72 sapmada ${don}`);
  await s.keyboard.press('Escape');
  await s.mouse.up();
  await o.kareBekle(s, 4);
  sc.dogrula('esc-surukleme-iptal', (await I.parcalar(s)).length === 8,
    'Esc sürüklemeyi iptal etmedi');
}

async function kisayollar(s, sc, kx, ky) {
  const z = await s.evaluate(async () => (await import('./js/gorunum.js')).gorunum.z);
  const y0 = (await insaAl(s)).yon;
  await git(s, kx + 3, ky + 4);
  await s.keyboard.press('r');
  await s.mouse.wheel(0, 120);
  await o.kareBekle(s, 3);
  const z2 = await s.evaluate(async () => (await import('./js/gorunum.js')).gorunum.z);
  sc.dogrula('dondur-r-teker', (await insaAl(s)).yon === ((y0 + 2) & 3) && z2 === z,
    `yön ${y0} → ${(await insaAl(s)).yon}, z ${z} → ${z2}`);
  const arac = await s.evaluate(() => window.__e2e.durumAl().arac);
  await s.keyboard.press('2');
  const h = await insaAl(s);
  sc.dogrula('hizli-cubuk', h.secili === 'sandik'
    && await s.evaluate(() => window.__e2e.durumAl().arac) === arac,
    `seçili ${h.secili}`);
  await git(s, kx + 3, ky);
  await s.keyboard.press('q');
  const q = await insaAl(s);
  sc.dogrula('pipet-q', q.kip === 'kur' && q.secili === 'bant' && q.yon === 0,
    JSON.stringify(q));
  await s.keyboard.press('x');
  sc.dogrula('sil-kipi', (await insaAl(s)).kip === 'sil', 'X sil kipine geçmedi');
  await git(s, kx + 2, ky);
  await s.mouse.down();
  await git(s, kx + 6, ky, 0, 0, 10);
  await I.ekranAl(s, 'm3-sil.png');
  await s.mouse.up();
  sc.dogrula('sil-surukle', await I.parcaSayisi(s, 3), 'sürükleyerek 5 bant sökülmedi');
  await s.keyboard.press('Control+z');
  sc.dogrula('sil-geri-al', await I.parcaSayisi(s, 8), 'toplu söküm tek adımda geri gelmedi');
  await s.keyboard.press('Escape');
  await s.keyboard.press('Escape');
  const kapali = await s.evaluate(() => ({ kip: window.__insa.kip, acik: window.__insa.acik,
    menu: document.getElementById('menu').open }));
  sc.dogrula('esc-zinciri', kapali.kip === 'gez' && !kapali.acik && !kapali.menu,
    JSON.stringify(kapali));
}

async function panel(s, sc, kx, ky) {
  await tikla(s, kx + 8, ky);
  const acik = await o.bekle(s, () => !document.querySelector('.ciftlik-panel').hidden);
  const m = await s.evaluate(() => ({ ad: document.querySelector('.ciftlik-panel h2').textContent,
    neden: document.querySelector('.ciftlik-panel-neden').textContent }));
  sc.dogrula('panel-ac', acik && m.ad === 'Sandık' && m.neden.length > 3, JSON.stringify(m));
  await I.ekranAl(s, 'm4-panel.png');
  await s.click('.ciftlik-panel-eylemler .tehlike');
  sc.dogrula('panel-sok', await I.parcaSayisi(s, 7)
    && await o.bekle(s, () => document.querySelector('.ciftlik-panel').hidden),
    'panelden sökülmedi');
  await s.keyboard.press('Control+z');
  sc.dogrula('panel-sok-geri', await I.parcaSayisi(s, 8), 'söküm geri alınmadı');
}

async function normalMod(s, sc) {
  await s.evaluate(() => window.__e2e.yeniOyun('insa-normal'));
  await o.bekle(s, () => window.__e2e.durumAl().mod === 'tarla');
  await s.keyboard.press('b');
  await s.keyboard.press('x');
  await s.keyboard.press('2');
  const n = await s.evaluate(() => ({ palet: !document.querySelector('.ciftlik-palet').hidden,
    kip: window.__insa.kip, arac: window.__e2e.durumAl().arac,
    insa: document.body.classList.contains('ciftlik-insa') }));
  sc.dogrula('normal-kisayol', !n.palet && n.kip === 'gez' && n.arac === 'tirmik' && !n.insa,
    JSON.stringify(n));
}

async function masaustu(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, {
    viewport: { width: 1280, height: 800 } });
  await I.ciftlikAc(s, kok);
  const yer = await I.yerBul(s, 12, 6);
  sc.dogrula('yer', Boolean(yer), 'boş yer yok');
  await I.odakla(s, yer.kx + 5, yer.ky + 2, 3.5);
  await s.keyboard.press('b');
  const p = await s.evaluate(() => ({ palet: !document.querySelector('.ciftlik-palet').hidden,
    raf: getComputedStyle(document.querySelector('.araclar')).visibility }));
  sc.dogrula('palet-b', p.palet && p.raf === 'hidden', JSON.stringify(p));
  await hayaletVeHat(s, sc, yer.kx, yer.ky);
  await histerezis(s, sc, yer.kx, yer.ky);
  await kisayollar(s, sc, yer.kx, yer.ky);
  await panel(s, sc, yer.kx, yer.ky);
  await normalMod(s, sc);
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-insa');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle(await masaustu(tarayici, sunucu.kok, sc));
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
