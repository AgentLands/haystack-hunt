/**
 * Çiftlik uçtan uca senaryolarının ortak araçları (ciftlik*.cjs): rehberi atlatma, çiftlik
 * özeti, parça yeri bulma, karo → ekran dönüşümü, kamera odağı, tıklama, komut gönderme,
 * elle iğne alma, kayıt okuma. `bekleyenAcik`: CIFTLIK_BEKLEYEN=1 iken bekleyen senaryolar
 * da koşar (tests/ciftlik-bekleyen.mjs ile aynı anahtar).
 */
const REHBER_GORULDU = () => {
  try {
    localStorage.setItem('haystack-hunt:rehber-goruldu', '1');
  } catch (hata) {
    console.error(hata);
  }
};

const bekleyenAcik = process.env.CIFTLIK_BEKLEYEN === '1';

/** Çiftlik bilgisi: parça listesi, sandık içerikleri, tik. */
const ciftlikOzet = (s) => s.evaluate(() => {
  const d = window.__e2e.durumAl();
  if (d.mod !== 'ciftlik') return { mod: d.mod };
  const parcalar = [...d.ciftlik.parcalar.values()];
  const sandik = parcalar.find((p) => p.tanim.anahtar === 'sandik');
  return { mod: d.mod, parca: parcalar.map((p) => p.tanim.anahtar).sort(),
    sandik: sandik ? sandik.ozel.toplam : null, tik: d.ciftlik.tik };
});

/** Huni + 4 bant + sandık sığan, huninin çevresi samanlı yer (karo). */
const yerBul = (s) => s.evaluate(async () => {
  const iz = await import('./js/kural/ciftlik/izgara.js');
  const pk = await import('./js/kural/ciftlik/parca-kayit.js');
  const d = window.__e2e.durumAl();
  const { ciftlik: c, tarla: t } = d;
  const tani = (ad) => pk.parcaTanimi(ad);
  let en = null;
  for (let ky = 2; ky < 76; ky++) {
    for (let kx = 2; kx < 110; kx++) {
      if (iz.yerlestirmeEngeli(c, t, tani('huni'), kx, ky, 0)) continue;
      let uygun = !iz.yerlestirmeEngeli(c, t, tani('sandik'), kx + 6, ky, 0);
      for (let i = 2; i <= 5 && uygun; i++) {
        uygun = !iz.yerlestirmeEngeli(c, t, tani('bant'), kx + i, ky, 0);
      }
      if (!uygun) continue;
      let top = 0;
      for (let y = ky * 2 - 2; y <= ky * 2 + 6; y++) {
        for (let x = kx * 2 - 2; x <= kx * 2 + 6; x++) top += t.h[y * 240 + x];
      }
      if (!en || top > en.top) en = { kx, ky, top };
    }
  }
  return en;
});

/** Karonun ekran (CSS px) merkezi. */
const ekran = (s, kx, ky) => s.evaluate(async ([x, y]) => {
  const { gorunum } = await import('./js/gorunum.js');
  const { dunyadanEkrana } = await import('./js/kural/gorunum.js');
  const r = document.getElementById('tarla').getBoundingClientRect();
  const p = dunyadanEkrana(gorunum, x * 2 + 1, y * 2 + 1);
  return { x: r.left + p.fx * r.width, y: r.top + p.fy * r.height };
}, [kx, ky]);

/** Kamerayı karoya getirir (takip bırakılır). */
const odakla = (s, kx, ky, z) => s.evaluate(async ([x, y, zz]) => {
  const { gorunumAyarla, gorunum } = await import('./js/gorunum.js');
  const { odakla: od } = await import('./js/kural/gorunum.js');
  const { takipBirak } = await import('./js/ozellik/kamera-takip.js');
  takipBirak();
  gorunumAyarla(od({ ...gorunum, gx: x * 2 - 20, gy: y * 2 - 14 }, 0.5, 0.5, zz));
}, [kx, ky, z]);

async function tikla(s, kx, ky) {
  const p = await ekran(s, kx, ky);
  await s.mouse.move(p.x, p.y);
  await s.mouse.down();
  await s.mouse.up();
}

/** Benzetime komut gönderir (arayüzün yaptığı gibi; sonraki tikte uygulanır). */
const komut = (s, k) => s.evaluate(async (kk) => {
  const { komutEkle } = await import('./js/kural/ciftlik/benzetim.js');
  komutEkle(window.__e2e.durumAl().ciftlik, kk);
}, k);

/** Karakteri aranan iğnenin yanına koyup kazar: iğne alınınca true. */
const elleIgneAl = (s) => s.evaluate(async () => {
  const { kullanAyarla } = await import('./js/kontrol.js');
  const d = window.__e2e.durumAl();
  const igne = d.tarla.igne;
  Object.assign(d.karakter, { x: igne.x + 0.5, y: igne.y + 1.5, yon: -Math.PI / 2 });
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) d.tarla.h[(igne.y + j) * 240 + igne.x + i] = igne.z;
  }
  kullanAyarla(true, 'klavye');
  const bas = performance.now();
  while (!igne.alindi && performance.now() - bas < 6000) {
    await new Promise((coz) => requestAnimationFrame(coz));
  }
  kullanAyarla(false, 'klavye');
  return igne.alindi;
});

/** localStorage okur (JSON ayrıştırmadan; yoksa null). */
const depoOku = (s, anahtar) => s.evaluate((a) => localStorage.getItem(a), anahtar);

/** Menü kapalıysa Esc ile açar (adreste tohum varsa menü kendiliğinden açılmaz). */
async function menuAc(s, o) {
  if (await s.evaluate(() => document.getElementById('menu').open)) return;
  await s.keyboard.press('Escape');
  await o.bekle(s, () => document.getElementById('menu').open);
}

/** Menüdeki "Çiftlik" düğmesiyle çiftliği açar; açıldıysa true. */
async function menudenAc(s, o) {
  await menuAc(s, o);
  await s.click('.menu-ciftlik');
  return o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik');
}

module.exports = {
  REHBER_GORULDU, bekleyenAcik, ciftlikOzet, yerBul, ekran, odakla, tikla, komut, elleIgneAl,
  depoOku, menuAc, menudenAc,
};
