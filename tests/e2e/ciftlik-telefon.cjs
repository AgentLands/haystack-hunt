/**
 * Senaryo: çiftlik telefonda. 390×844 (dikey) ve 844×390 (yatay) dokunmatik: menüde Çiftlik
 * dokunuşla açılır, yatay taşma yok (menü, HUD, palet), palet düğmeleri ≥ 44 px dokunma hedefi,
 * paletteki her kayıtlı parça düğme olarak var (yeni parçalar kendiliğinden taranır), yatay
 * döndürme çiftliği bozmaz. Telefon ölçütü: standart sahne (~900 parça, ~2000 eşya) CPU 4×
 * ile çizilir; hedefler (katman ≤ 4 ms, 18+ tik/sn) henüz tutmuyorsa "BEKLİYOR [H1]" yazılır
 * (CIFTLIK_BEKLEYEN=1 ile hata olur); çökme ve felaket yavaşlık (katman > 80 ms) hep hata.
 *   node tests/e2e/ciftlik-telefon.cjs [--yavas N] [--perf-yok]
 */
const o = require('./ortak.cjs');
const { REHBER_GORULDU, bekleyenAcik } = require('./ciftlik-ortak.cjs');

const TELEFON = { hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

/** Bir dokunma (CDP). */
async function dokun(s, dk, p) {
  await dk.bas(1, p.x, p.y);
  await dk.birak(1);
}

async function yonDene(tarayici, kok, sc, ad, viewport) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, { viewport, ...TELEFON });
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, kok);
  const menu = await o.yerlesim(s);
  sc.dogrula(`${ad}-menu-tasma`, !menu.tasma,
    `menüde taşma ${menu.scrollWidth} > ${menu.innerWidth}`);
  const dk = await o.dokunmaKur(s);
  await dokun(s, dk, await o.kutu(s, '.menu-ciftlik'));
  sc.dogrula(`${ad}-dokun-ac`, await o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik'),
    'dokunuşla çiftlik açılmadı');
  await o.kareBekle(s, 6);
  const y = await o.yerlesim(s);
  sc.dogrula(`${ad}-hud-tasma`, !y.tasma, `çiftlikte taşma ${y.scrollWidth} > ${y.innerWidth}`);
  await dokun(s, dk, await o.kutu(s, '.ciftlik-insa-ac'));
  sc.dogrula(`${ad}-palet`, await s.isVisible('.ciftlik-palet'), 'İnşa düğmesi paleti açmadı');
  const palet = await s.evaluate(async () => {
    const pk = await import('./js/kural/ciftlik/parca-kayit.js');
    const dugmeler = [...document.querySelectorAll('.ciftlik-parca')].map((b) => {
      const r = b.getBoundingClientRect();
      return { parca: b.dataset.parca, en: r.width, boy: r.height };
    });
    const sinirlar = document.querySelector('.ciftlik-palet').getBoundingClientRect();
    return { kayitli: pk.parcaTurleri().filter((t) => !t.paletDisi).map((t) => t.anahtar),
      dugmeler,
      palet: { sol: sinirlar.left, sag: sinirlar.right }, en: innerWidth };
  });
  const eksik = palet.kayitli.filter((a) => !palet.dugmeler.some((d) => d.parca === a));
  sc.dogrula(`${ad}-palet-tam`, eksik.length === 0, `palette olmayan parçalar: ${eksik}`);
  const kucuk = palet.dugmeler.filter((d) => d.en < 44 || d.boy < 44);
  sc.dogrula(`${ad}-hedef-boyu`, kucuk.length === 0,
    `44 px altı dokunma hedefi: ${JSON.stringify(kucuk)}`);
  sc.dogrula(`${ad}-palet-sinir`, palet.palet.sol >= 0 && palet.palet.sag <= palet.en + 0.5,
    `palet ekran dışına taşıyor: ${JSON.stringify(palet.palet)}`);
  const y2 = await o.yerlesim(s);
  sc.dogrula(`${ad}-palet-tasma`, !y2.tasma, `palet açıkken taşma ${y2.scrollWidth}`);
  await s.close();
  return hatalar;
}

/** Telefon ölçütü (araclar/ciftlik-olc.mjs --telefon): ayrı tarayıcıda, CPU 4×. */
async function olcut(sc) {
  const { telefonOlc, telefonSorunlari } = await import('../../araclar/ciftlik-olc.mjs');
  const sonuc = await telefonOlc({ yavas: Math.max(o.YAVAS, 4) });
  const bilgi = ['yakin', 'uzak'].map((a) => `${a}: katman p50 `
    + `${sonuc[a].katmanP50.toFixed(1)} ms, ${sonuc[a].tikSn.toFixed(1)} tik/sn`).join('; ');
  console.log(`  telefon ölçütü (CPU 4×): ${bilgi}`);
  sc.dogrula('perf-cokme-yok', sonuc.hatalar.length === 0,
    `ölçüm sayfasında hata: ${JSON.stringify(sonuc.hatalar)}`);
  for (const a of ['yakin', 'uzak']) {
    sc.dogrula(`perf-${a}-felaket`, sonuc[a].katmanP50 <= 80 && sonuc[a].tikSn >= 3,
      `${a}: katman ${sonuc[a].katmanP50.toFixed(0)} ms, ${sonuc[a].tikSn.toFixed(1)} tik/sn`);
  }
  const sorun = telefonSorunlari(sonuc).filter((m) => !/sayfa hataları/.test(m));
  if (bekleyenAcik) sc.dogrula('perf-hedef', sorun.length === 0, sorun.join('; '));
  else if (sorun.length) sc.bekliyor('perf-hedef', 'H1', sorun.join('; '));
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-telefon');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle([
      ...await yonDene(tarayici, sunucu.kok, sc, 'dikey', { width: 390, height: 844 }),
      ...await yonDene(tarayici, sunucu.kok, sc, 'yatay', { width: 844, height: 390 }),
    ]);
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  if (!process.argv.includes('--perf-yok')) await olcut(sc);
  sc.bitir();
});
