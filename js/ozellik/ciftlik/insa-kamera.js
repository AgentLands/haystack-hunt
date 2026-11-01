/**
 * İnşa için kamera yardımcıları: karonun ekran konumu (baloncuk, rozet), kur kipine
 * girerken yakınlaşma (karo ≥ HEDEF_KARO_PX CSS px olana dek, z en çok zTavan: çiftlikte
 * telefon da 28 px karoya varsın diye tavan KAMERA_Z_COK'a çıkar; normal tarlada 6 kalır;
 * çiftçi ekranda sabit kalır, yumuşak), ⌖ çiftçiye dön ve sürüklerken tuval kenarına
 * KENAR_PX yaklaşınca kameranın kayması (iz de güncellenir). Görünümü yalnız gorunum.js
 * üzerinden değiştirir; elle yönetim takibi bırakır (kamera-takip.js; çiftçi yürüyünce döner).
 */
import { gorunum, gorunumAyarla, kameraPayiAyarla } from '../../gorunum.js';
import {
  dunyadanEkrana, gorunurAlan, odakla, kaydir, merkezle, zTavan,
} from '../../kural/gorunum.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { dinle } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { takipBirak } from '../kamera-takip.js';

/** Kur kipinde hedef karo boyu (CSS px; WCAG 24 px ve üstü). */
export const HEDEF_KARO_PX = 28;
/** Çiftlikte yakınlaştırma tavanı (normal tarla 6; dar telefonda 28 px karo için ≈ 9). */
export const KAMERA_Z_COK = 9;
/** Üst şerit tuvalin bu oranından genişse (telefon) kamera üst kenarın ötesine kayabilir. */
const SERIT_GENIS = 0.6;
const UST_TAVAN = 0.3;
/** Bundan küçük karoda kur kipine girince yakınlaşılır. */
const YAKLAS_ESIK_PX = 24;
/** Sürüklerken kenar kaydırma bandı (CSS px) ve hızı (görünür alan / sn). */
const KENAR_PX = 24;
const KENAR_HIZ = 0.45;

const tuval = document.getElementById('tarla');
let yaklasma = null;
let kenar = null;
let sonZaman = null;

/** Karonun (merkezinin) istemci koordinatı: { x, y }. */
export function ekranNoktasi(kx, ky) {
  const r = tuval.getBoundingClientRect();
  const p = dunyadanEkrana(gorunum, (kx + 0.5) * KARO, (ky + 0.5) * KARO);
  return { x: r.left + p.fx * r.width, y: r.top + p.fy * r.height };
}

/** Şimdiki karo boyu (CSS px). */
export function karoPx(z = gorunum.z) {
  const alan = gorunurAlan({ ...gorunum, z });
  return (tuval.getBoundingClientRect().width / alan.en) * KARO;
}

/** Karo küçükse yumuşakça yaklaşır (kur kipine girişte). */
export function yaklas() {
  if (karoPx() >= YAKLAS_ESIK_PX) return;
  let z = gorunum.z;
  while (z < zTavan(gorunum) && karoPx(z) < HEDEF_KARO_PX) {
    z = Math.min(zTavan(gorunum), z * 1.05);
  }
  takipBirak();
  yaklasma = { z };
}

/** Kamerayı çiftçiye (bindiyse makineye) getirir. */
export function ciftciyeDon() {
  const d = durumAl();
  if (!d) return;
  const k = d.karakter;
  gorunumAyarla(merkezle(gorunum, k.x, k.y));
}

/** Sürükleme sürerken kenar kaydırmayı izler; guncelle(e) kamera kayınca çağrılır. */
export function kenarIzle(e, guncelle) {
  kenar = { x: e.clientX, y: e.clientY, pointerType: e.pointerType, pointerId: e.pointerId,
    guncelle };
}

export function kenarBirak() {
  kenar = null;
}

/**
 * Üst şeridin örttüğü bant, tuval yüksekliğinin oranı olarak (telefonda şerit tuvali baştan
 * başa tutar; masaüstünde dar ortalanmış bir bant olduğundan pay 0): tarlanın üst satırları
 * şeridin altına girebilsin diye kameranın üst payı.
 */
export function ustPay() {
  const serit = document.querySelector('.cf-serit');
  const r = tuval.getBoundingClientRect();
  if (!serit || serit.offsetParent === null || !(r.height > 0)) return 0;
  const sr = serit.getBoundingClientRect();
  if (sr.width < SERIT_GENIS * r.width) return 0;
  return Math.min(UST_TAVAN, Math.max(0, (sr.bottom - r.top) / r.height));
}

let payKare = 0;

function ciftciEkranda(d) {
  const k = d.karakter;
  const p = dunyadanEkrana(gorunum, k.x, k.y);
  return p.fx > 0 && p.fx < 1 && p.fy > 0 && p.fy < 1 ? p : { fx: 0.5, fy: 0.5 };
}

function kenarAdim(dt) {
  const r = tuval.getBoundingClientRect();
  const yon = (v, a, b) => (v < a + KENAR_PX ? -1 : v > b - KENAR_PX ? 1 : 0);
  const dx = yon(kenar.x, r.left, r.right);
  const dy = yon(kenar.y, r.top, r.bottom);
  if (!dx && !dy) return;
  takipBirak();
  gorunumAyarla(kaydir(gorunum, -dx * KENAR_HIZ * dt, -dy * KENAR_HIZ * dt));
  kenar.guncelle({ clientX: kenar.x, clientY: kenar.y, pointerType: kenar.pointerType,
    pointerId: kenar.pointerId, type: 'pointermove' });
}

dinle('kare', ({ zaman, durum }) => {
  const dt = sonZaman === null ? 0 : Math.min(0.1, (zaman - sonZaman) / 1000);
  sonZaman = zaman;
  if (durum.mod !== 'ciftlik') {
    yaklasma = null;
    kenar = null;
    kameraPayiAyarla(0, 0);
    return;
  }
  if (payKare++ % 15 === 0) kameraPayiAyarla(ustPay(), KAMERA_Z_COK);
  if (kenar && dt) kenarAdim(dt);
  if (!yaklasma) return;
  const { fx, fy } = ciftciEkranda(durum);
  const z = gorunum.z + (yaklasma.z - gorunum.z) * Math.min(1, dt * 9);
  const bitti = Math.abs(yaklasma.z - z) < 0.02;
  gorunumAyarla(odakla(gorunum, fx, fy, bitti ? yaklasma.z : z));
  if (bitti) yaklasma = null;
});

/** Yakınlaşma sürüyor mu (testler ve baloncuk konumu için). */
export const yaklasiyor = () => yaklasma !== null;
