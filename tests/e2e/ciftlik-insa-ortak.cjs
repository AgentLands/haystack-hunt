/**
 * Çiftlik inşa senaryolarının ortak araçları (ciftlik-insa.cjs, ciftlik-insa-tel.cjs):
 * inşa durumu kancası (`window.__insa`: oyunun kendi insa.js modül örneği; bekle koşulları
 * eşzamanlı okusun), boş ve düz yer bulma, karonun ekran konumu, kamerayı karoya getirme,
 * parça listesi ve ekran görüntüsü. Oyun koduna test kancası eklenmez.
 */
const path = require('node:path');
const o = require('./ortak.cjs');

const REHBER_GORULDU = () => {
  try {
    localStorage.setItem('haystack-hunt:rehber-goruldu', '1');
  } catch (hata) {
    console.error(hata);
  }
};

/** Çiftliği açar ve kancaları bağlar. */
async function ciftlikAc(s, kok) {
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, `${kok}?mod=ciftlik`);
  await s.evaluate(async () => {
    window.__insa = (await import('./js/ozellik/ciftlik/insa.js')).insa;
  });
  await o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik');
}

/** en × boy karoluk, samanı düşük, boş bir dikdörtgenin sol üstü (ızgara kuralıyla). */
const yerBul = (s, en, boy) => s.evaluate(async ([en_, boy_]) => {
  const iz = await import('./js/kural/ciftlik/izgara.js');
  const pk = await import('./js/kural/ciftlik/parca-kayit.js');
  const { ciftlik: c, tarla: t } = window.__e2e.durumAl();
  const bant = pk.parcaTanimi('bant');
  for (let ky = 4; ky < 76 - boy_; ky++) {
    for (let kx = 30; kx < 112 - en_; kx++) {
      let bos = true;
      for (let y = ky; y < ky + boy_ && bos; y++) {
        for (let x = kx; x < kx + en_ && bos; x++) bos = !iz.yerlestirmeEngeli(c, t, bant, x, y, 0);
      }
      if (bos) return { kx, ky };
    }
  }
  return null;
}, [en, boy]);

/** Karonun ekran (CSS px) merkezi; dy ile karonun içinde kaydırılabilir (karo birimi). */
const ekran = (s, kx, ky, dx = 0, dy = 0) => s.evaluate(async ([x, y, ax, ay]) => {
  const { gorunum } = await import('./js/gorunum.js');
  const { dunyadanEkrana } = await import('./js/kural/gorunum.js');
  const r = document.getElementById('tarla').getBoundingClientRect();
  const p = dunyadanEkrana(gorunum, (x + 0.5 + ax) * 2, (y + 0.5 + ay) * 2);
  return { x: r.left + p.fx * r.width, y: r.top + p.fy * r.height };
}, [kx, ky, dx, dy]);

/** Kamerayı karoya getirir (takip bırakılır), z yakınlıkta. */
const odakla = (s, kx, ky, z) => s.evaluate(async ([x, y, zz]) => {
  const { gorunum, gorunumAyarla } = await import('./js/gorunum.js');
  const g = await import('./js/kural/gorunum.js');
  const { takipBirak } = await import('./js/ozellik/kamera-takip.js');
  takipBirak();
  gorunumAyarla(g.merkezle({ ...gorunum, z: zz }, x * 2 + 1, y * 2 + 1));
}, [kx, ky, z]);

/** Parçalar: [{ a: anahtar, x, y, yon }] (id sırasıyla). */
const parcalar = (s) => s.evaluate(() => [...window.__e2e.durumAl().ciftlik.parcalar.values()]
  .map((p) => ({ a: p.tanim.anahtar, x: p.x, y: p.y, yon: p.yon })));

/** n parça olunca (ya da zaman aşımında) döner. */
const parcaSayisi = (s, n) => o.bekle(s, (k) => window.__e2e.durumAl().ciftlik?.parcalar.size
  === k, n, 6000);

/** Ekran görüntüsü (--ekran KLASOR verilmişse). */
function ekranAl(s, ad) {
  const kl = o.bayrak('ekran');
  return kl ? s.screenshot({ path: path.join(kl, ad) }) : null;
}

/** Görünüm sabitlenene dek bekler (kur kipine girişte yakınlaşma). */
async function kameraDurdu(s) {
  let once = null;
  for (let i = 0; i < 40; i++) {
    const z = await s.evaluate(async () => (await import('./js/gorunum.js')).gorunum.z);
    if (once !== null && Math.abs(z - once) < 1e-4) return;
    once = z;
    await o.kareBekle(s, 2);
  }
}

module.exports = { ciftlikAc, yerBul, ekran, odakla, parcalar, parcaSayisi, ekranAl, kameraDurdu };
