/**
 * ciftlik-hud.cjs'in yardımcıları: kurulacak yeri bulma, arayüzün komut yoluyla hat kurma,
 * benzetimi hızlı ileri sarma (olaylar oyunun kendi yolundan yayılır), metin okuma ve olay yayma.
 */
const o = require('./ortak.cjs');

/** Huni + 4 bant + sandık sığan, huninin çevresi en samanlı yer (karo). */
const yerBul = (s) => s.evaluate(async () => {
  const iz = await import('./js/kural/ciftlik/izgara.js');
  const pk = await import('./js/kural/ciftlik/parca-kayit.js');
  const { ciftlik: c, tarla: t } = window.__e2e.durumAl();
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

/** Arayüzün yolu: komutEkle ile huni, 4 bant ve sandık kurar. */
const hatKur = (s, yer) => s.evaluate(async ({ kx, ky }) => {
  const { komutEkle } = await import('./js/kural/ciftlik/benzetim.js');
  const c = window.__e2e.durumAl().ciftlik;
  komutEkle(c, { tur: 'kur', parca: 'huni', x: kx, y: ky, yon: 0 });
  for (let i = 2; i <= 5; i++) {
    komutEkle(c, { tur: 'kur', parca: 'bant', x: kx + i, y: ky, yon: 0 });
  }
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: kx + 6, y: ky, yon: 0 });
}, yer);

/** n tik hızlı ileri sarar; olaylar oyunun kendi yolundan yayılır. */
const ileri = async (s, n) => {
  await s.evaluate(async (say) => {
    const { tikAt } = await import('./js/kural/ciftlik/benzetim.js');
    const { yay } = await import('./js/olaylar.js');
    const d = window.__e2e.durumAl();
    for (let i = 0; i < say; i++) {
      for (const { ad, veri } of tikAt(d.ciftlik, d.tarla)) yay(ad, veri);
    }
  }, n);
  await o.kareBekle(s, 20);
};

const metin = (s, sec) => s.evaluate((q) => document.querySelector(q)?.textContent ?? '',
  sec);

const olayYay = (s, ad, veri) => s.evaluate(async ([a, v]) => {
  const { yay } = await import('./js/olaylar.js');
  yay(a, v);
}, [ad, veri]);
/** Koşul (sayfada eşzamanlı işlev) sağlanana dek adım adım ileri sarar; sağlandı mı? */
async function ileriKadar(s, kosul, adim = 40, azami = 60) {
  for (let i = 0; i < azami; i++) {
    if (await s.evaluate(kosul)) return true;
    await ileri(s, adim);
  }
  return s.evaluate(kosul);
}

module.exports = { yerBul, hatKur, ileri, ileriKadar, metin, olayYay };
