/**
 * Senaryo: "İlk 10 dakika" (docs/ciftlik/README.md) ilk oyuncu gibi, gerçek fare ve dokunuşla:
 * temiz profilde menüden "Çiftlik kur" (normal tarla rehberi çıkmaz), pano üç kart ve 300 kuruş,
 * öğretici notu siparişi okur ("Komşu: 30 saman tutamı istiyor"), palet ilk damgaya dek yalnız
 * üç parça gösterir (huni, bant, sandık; kilitliler gizli), "Kapıyı göster" kamerayı kapıya
 * götürür, huni hayaleti yığın eteğine konur, bant fareyle kapıya sürüklenir, 30 tutam
 * gidince D1 basılır (+150 kuruş), palet genişler ve çivi adımına geçilir. Telefonda (390×844,
 * dokunma): rehber yok, öğretici notu kompakt ve palet üstüne binmez, kur kipinde karo ≥ 27 px,
 * tarlanın üst satırı HUD şeridinin altına kaydırılabilir. D2/D3 adımları ciftlik-hud.cjs'te.
 *   node tests/e2e/ciftlik-ogretici.cjs [--ekran KLASOR] [--yavas N]
 */
const o = require('./ortak.cjs');
const { menudenAc, odakla, ekran } = require('./ciftlik-ortak.cjs');
const { ileriKadar } = require('./ciftlik-hud-yardim.cjs');
const I = require('./ciftlik-insa-ortak.cjs');

/** J'nin gerçek seçicileri. */
const SEC = {
  pano: '[data-ciftlik-pano]', kart: '[data-ciftlik-pano] .cf-kart', ogretici: '.cf-ogretici',
  kurus: '.cf-kurus strong', damga: '.cf-damga-kod',
};
const gorunenParcalar = () => [...document.querySelectorAll('.ciftlik-parca')]
  .filter((b) => !b.hidden).map((b) => b.dataset.parca);
const adimAdi = (s) => s.evaluate(() => document.querySelector('.cf-ogretici:not([hidden]) h2')
  ?.firstChild.textContent ?? '');

/** Kapıya doğru dümdüz bant koridoru olan, ağzında saman bulunan en yakın huni yeri (yön 0). */
const huniYeri = (s) => s.evaluate(async () => {
  const iz = await import('./js/kural/ciftlik/izgara.js');
  const pk = await import('./js/kural/ciftlik/parca-kayit.js');
  const og = await import('./js/kural/ciftlik/dunya/ogretici.js');
  const { ciftlik: c, tarla: t } = window.__e2e.durumAl();
  const huni = pk.parcaTanimi('huni');
  const bant = pk.parcaTanimi('bant');
  const k = c.arazi.kapi;
  if (k.yon !== 2) return null;
  for (let x = k.x - 3; x > 2; x--) {
    const p = pk.parcaOrnegi(huni, 0, x, k.y, 0);
    let tepe = 0;
    for (const [kx, ky] of og.agizKarolari(p)) {
      for (let y = ky * 2; y < ky * 2 + 2; y++) {
        for (let xx = kx * 2; xx < kx * 2 + 2; xx++) tepe = Math.max(tepe, t.h[y * 240 + xx]);
      }
    }
    if (tepe < 12 || iz.yerlestirmeEngeli(c, t, huni, x, k.y, 0)) continue;
    const { hx, hy } = p.cikis[0];
    let serbest = true;
    for (let bx = hx; bx < k.x && serbest; bx++) {
      serbest = !iz.yerlestirmeEngeli(c, t, bant, bx, hy, 0);
    }
    if (serbest) return { x, y: k.y, hx, hy, kapiX: k.x };
  }
  return null;
});

async function masaustu(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, { viewport: { width: 1280,
    height: 800 } });
  await o.git(s, kok);
  sc.dogrula('ac', await menudenAc(s, o), 'menüden çiftlik açılmadı');
  await o.kareBekle(s, 20);
  sc.dogrula('rehber-yok', !(await s.evaluate(() => Boolean(document.querySelector('.rehber')))),
    'çiftlikte normal tarla rehberi (iğne arama metni) göründü');
  const pano = await s.evaluate((q) => ({
    kart: document.querySelectorAll(q.kart).length,
    kurus: document.querySelector(q.kurus)?.textContent ?? '' }), SEC);
  sc.dogrula('0-00-pano', pano.kart === 3, `pano ${pano.kart} kart`);
  sc.dogrula('0-00-kurus', /300/.test(pano.kurus), `başlangıç kuruşu "${pano.kurus}"`);
  sc.dogrula('0-00-ogretici', await s.isVisible(SEC.ogretici), 'öğretici notu görünmüyor');
  sc.dogrula('0-00-siparis', await o.bekle(s, () => /Komşu: 30 saman tutamı istiyor/.test(
    document.querySelector('.cf-ogretici p')?.textContent ?? '')),
  `öğretici siparişi okumadı: ${await s.textContent('.cf-ogretici p')}`);
  await s.click('.cf-ogretici .dugme-birincil'); // Tamam
  sc.dogrula('0-20-huni-adimi', await o.bekle(s, () => /Emici huni/.test(
    document.querySelector('.cf-ogretici h2')?.textContent ?? '')), 'huni adımına geçmedi');
  await s.click('.cf-ogretici .dugme-metin >> text=Kapıyı göster');
  await o.kareBekle(s, 20);
  sc.dogrula('kapi-gorunur', await s.evaluate(async () => {
    const { gorunum } = await import('./js/gorunum.js');
    const { dunyadanEkrana } = await import('./js/kural/gorunum.js');
    const k = window.__e2e.durumAl().ciftlik.arazi.kapi;
    const p = dunyadanEkrana(gorunum, (k.x + 1) * 2, (k.y + 1) * 2);
    return p.fx > 0 && p.fx < 1 && p.fy > 0 && p.fy < 1;
  }), '"Kapıyı göster" kapıyı ekrana getirmedi');
  sc.dogrula('pano-kapandi', !(await s.isVisible(SEC.pano)), 'huni adımında pano kapanmadı');
  await I.ekranAl(s, 'd-1-kapi.png');
  await s.click('.ciftlik-insa-ac');
  const ilk = (await s.evaluate(gorunenParcalar)).sort().join();
  sc.dogrula('0-20-palet-uc', ilk === 'bant,huni,sandik',
    `ilk damgaya kadar yalnız huni, bant, sandık: ${ilk}`);
  const yer = await huniYeri(s);
  if (!yer) {
    sc.bekliyor('0-40-huni', 'dünya', 'kapıya düz koridorlu huni yeri yok (tohum değişti)');
    await s.close();
    return hatalar;
  }
  await s.click('.ciftlik-parca[data-parca="huni"]');
  await odakla(s, yer.hx + 8, yer.hy, 3.5);
  await o.kareBekle(s, 20);
  for (let i = 0; i < 4; i++) {
    const yon = await s.evaluate(async () => {
      return (await import('./js/ozellik/ciftlik/insa.js')).insa.yon;
    });
    if (yon === 0) break;
    await s.keyboard.press('r');
  }
  const h = await ekran(s, yer.x, yer.y);
  await s.mouse.move(h.x, h.y);
  await s.mouse.down();
  await s.mouse.up();
  sc.dogrula('0-40-huni-kuruldu', await o.bekle(s, () => /Yığın akar/.test(
    document.querySelector('.cf-ogretici h2')?.textContent ?? '')), `adım: ${await adimAdi(s)}`);
  await s.click('.ciftlik-parca[data-parca="bant"]');
  const bas = await ekran(s, yer.hx, yer.hy);
  const son = await ekran(s, yer.kapiX - 1, yer.hy);
  await s.mouse.move(bas.x, bas.y);
  await s.mouse.down();
  for (let i = 1; i <= 30; i++) {
    await s.mouse.move(bas.x + ((son.x - bas.x) * i) / 30, bas.y + ((son.y - bas.y) * i) / 30);
  }
  await s.mouse.up();
  sc.dogrula('1-00-bant', await o.bekle(s, () => /^Teslim/.test(
    document.querySelector('.cf-ogretici h2')?.textContent ?? '')), `adım: ${await adimAdi(s)}`);
  sc.dogrula('1-00-pano-acildi', await s.isVisible(SEC.pano), 'teslim beklerken pano açılmadı');
  await s.keyboard.press('Escape');
  const sayi = (t) => Number(t.replace(/\D/g, ''));
  const kurus0 = sayi(await s.textContent(SEC.kurus));
  sc.dogrula('d1', await ileriKadar(s, () => (window.__e2e.durumAl().ciftlik.ilerleme?.damgalar
    ?? []).includes('D1'), 100, 60), 'D1 İlk teslim basılmadı');
  await o.kareBekle(s, 20);
  sc.dogrula('d1-kurus', sayi(await s.textContent(SEC.kurus)) >= kurus0 + 150,
    'D1 ödülü (+150) kuruşa eklenmedi');
  const notGizli = () => document.querySelector('.ciftlik-daha-not').hidden;
  sc.dogrula('d1-palet-genisledi', await o.bekle(s, notGizli), 'D1 sonrası palet hâlâ daralmış');
  await s.click('.ciftlik-insa-ac').catch(() => null);
  const sonra = await s.evaluate(gorunenParcalar);
  sc.dogrula('d1-oluk-acildi', sonra.includes('oluk-miknatisi') && sonra.length > 6,
    `D1 sonrası palet: ${sonra}`);
  sc.dogrula('2-30-civi-adimi', await o.bekle(s, () => /çivi|mıknatıs/i.test(
    document.querySelector('.cf-ogretici h2')?.textContent ?? '')), `adım: ${await adimAdi(s)}`);
  await s.close();
  return hatalar;
}

/** Dokunma: tek dokunuş (CDP). */
const dokun = async (s, d, p) => {
  await s.waitForTimeout(300);
  await d.bas(1, p.x, p.y);
  await d.birak(1);
};

async function telefon(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, { viewport: { width: 390,
    height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await o.git(s, kok);
  const d = await o.dokunmaKur(s);
  await dokun(s, d, await o.kutu(s, '.menu-ciftlik'));
  sc.dogrula('t-ac', await o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik'),
    'dokunuşla çiftlik açılmadı');
  await o.kareBekle(s, 20);
  sc.dogrula('t-rehber-yok', !(await s.evaluate(() => Boolean(document.querySelector('.rehber')))),
    'telefonda çiftlikte normal tarla rehberi göründü');
  await dokun(s, d, await o.kutu(s, '.cf-ogretici .dugme-birincil'));
  await dokun(s, d, await o.kutu(s, '.ciftlik-insa-ac'));
  await dokun(s, d, await o.kutu(s, '.ciftlik-parca[data-parca="huni"]'));
  await o.kareBekle(s, 60);
  await s.waitForTimeout(800);
  const olcu = await s.evaluate(async () => {
    const km = await import('./js/ozellik/ciftlik/insa-kamera.js');
    const not = document.querySelector('.cf-ogretici').getBoundingClientRect();
    const palet = document.querySelector('.ciftlik-palet').getBoundingClientRect();
    return { karo: km.karoPx(), notBoy: not.height, notAlt: not.bottom, paletUst: palet.top,
      kartlar: [...document.querySelectorAll('.ciftlik-parca')].filter((b) => !b.hidden).length };
  });
  sc.dogrula('t-karo-28', olcu.karo >= 27, `kur kipinde karo ${olcu.karo.toFixed(1)} px (< 27)`);
  sc.dogrula('t-not-kompakt', olcu.notBoy <= 130, `öğretici notu ${olcu.notBoy} px yüksek`);
  sc.dogrula('t-not-palete-binmez', olcu.notAlt <= olcu.paletUst + 1,
    `not (${olcu.notAlt}) palet (${olcu.paletUst}) üstüne biniyor`);
  sc.dogrula('t-palet-uc', olcu.kartlar === 3, `palet ${olcu.kartlar} parça gösteriyor`);
  await I.ekranAl(s, 't-1-insa.png');
  // Üst satırlar HUD şeridinin altına kaydırılabilir.
  await s.evaluate(async () => {
    const { gorunum, gorunumAyarla } = await import('./js/gorunum.js');
    const { takipBirak } = await import('./js/ozellik/kamera-takip.js');
    takipBirak();
    gorunumAyarla({ ...gorunum, gx: 40, gy: -1000 });
  });
  await o.kareBekle(s, 10);
  const ust = await s.evaluate(async () => {
    const { gorunum } = await import('./js/gorunum.js');
    const { dunyadanEkrana } = await import('./js/kural/gorunum.js');
    const r = document.getElementById('tarla').getBoundingClientRect();
    const serit = document.querySelector('.cf-serit').getBoundingClientRect();
    const p = dunyadanEkrana(gorunum, 80, 0);
    return { satirUst: r.top + p.fy * r.height, seritAlt: serit.bottom };
  });
  sc.dogrula('t-ust-satir', ust.satirUst >= ust.seritAlt - 1,
    `üst satır ${ust.satirUst.toFixed(0)}, şerit alt ${ust.seritAlt.toFixed(0)}: örtülü`);
  await I.ekranAl(s, 't-2-ust.png');
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-ogretici');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle([
      ...await masaustu(tarayici, sunucu.kok, sc),
      ...await telefon(tarayici, sunucu.kok, sc),
    ]);
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
