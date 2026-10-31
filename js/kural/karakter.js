/**
 * Çiftçi karakteri (saf kural, DOM yok): kurulum (garajın önünde alçak bir hücre), yürüme
 * adımı (samanda yavaşlama, tırmanma eşiği, eksen ayrımlı kayma, tarla sınırı, daire
 * çarpışması), araç noktası ve erişim denetimi.
 *
 * Koordinatlar: karakter DÜNYA biriminde durur (hücre i, [i, i+1) aralığı; merkezi i + 0.5).
 * Araçlar (el, tırmık, dedektör...) eskiden olduğu gibi HÜCRE biriminde çalışır (hücre i'nin
 * merkezi i); çeviri: hücre = dünya − 0.5. aracNoktasi ve karakterNoktasi hücre birimi verir.
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';
import { yukseklik } from './tarla.js';

/** Düz zeminde yürüme hızı (hücre/sn); samanda TEMEL_HIZ / (1 + z / SAMAN_YAVASLATMA). */
export const TEMEL_HIZ = 13;
export const SAMAN_YAVASLATMA = 45;
/** Bir sonraki hücre bulunduğundan bu kadar kattan fazla yüksekse o eksende geçilmez. */
export const TIRMANMA = 3;
/** Fare/dokunmayla araç kullanılabilecek en uzak hücre (karakterden). */
export const ERISIM = 3;
/** El ve tırmık karakterin bu kadar önünde çalışır (hücre). */
export const ARAC_UZAKLIK = 1.5;
export const KARAKTER_YARICAP = 0.6;
/** Bir adımın boyu (hücre); yürüme döngüsü (adimFaz 0..1) iki adımdır. */
export const ADIM_BOYU = 0.85;

/**
 * Karakteri garajın önünde (içeri doğru ~8 hücre), 6 hücrelik çevredeki en alçak ve
 * engelsiz hücrede kurar. Garaj tohumdan geldiği için konum da deterministiktir.
 */
export function karakterKur(tarla, garaj, engeller = []) {
  const ox = garaj.x + Math.cos(garaj.yon) * 8;
  const oy = garaj.y + Math.sin(garaj.yon) * 8;
  let enIyi = null;
  for (let y = Math.floor(oy - 6); y <= Math.floor(oy + 6); y++) {
    for (let x = Math.floor(ox - 6); x <= Math.floor(ox + 6); x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (!sinirdaMi(cx, cy) || carpisiyor(cx, cy, engeller)) continue;
      const puan = tarla.h[y * GENISLIK + x] * 4 + Math.hypot(cx - ox, cy - oy);
      if (!enIyi || puan < enIyi.puan) enIyi = { x: cx, y: cy, puan };
    }
  }
  const { x, y } = enIyi || { x: ox, y: oy };
  return {
    x, y, yon: garaj.yon, hareketli: false, adimFaz: 0,
    z: yukseklik(tarla, x, y), kullaniyor: false, makine: null,
  };
}

export function karakterHizi(z) {
  return TEMEL_HIZ / (1 + z / SAMAN_YAVASLATMA);
}

function sinirdaMi(x, y) {
  const r = KARAKTER_YARICAP;
  return x >= r && y >= r && x <= GENISLIK - r && y <= YUKSEKLIK - r;
}

function carpisiyor(x, y, engeller) {
  return engeller.some((e) => Math.hypot(x - e.x, y - e.y) < e.r + KARAKTER_YARICAP);
}

/**
 * (x0, y0)'dan (x1, y1)'e geçilebilir mi: aynı hücrede kalıyorsa evet; yeni hücreye
 * giriyorsa yükseklik farkı TIRMANMA'yı aşmamalı. Engel içine girilmez (içindeysen
 * uzaklaşmana izin verilir ki sıkışma olmasın).
 */
function gecilir(tarla, x0, y0, x1, y1, engeller) {
  if (!sinirdaMi(x1, y1)) return false;
  const ayniHucre = Math.floor(x0) === Math.floor(x1) && Math.floor(y0) === Math.floor(y1);
  if (!ayniHucre && yukseklik(tarla, x1, y1) - yukseklik(tarla, x0, y0) > TIRMANMA) {
    return false;
  }
  for (const e of engeller) {
    const yeni = Math.hypot(x1 - e.x, y1 - e.y);
    if (yeni < e.r + KARAKTER_YARICAP && yeni < Math.hypot(x0 - e.x, y0 - e.y)) return false;
  }
  return true;
}

/**
 * Bir yürüme adımı. (ix, iy): istek, her eksen -1..1 (boyu 1'i aşarsa kırpılır).
 * Eksenler ayrı denenir: biri tıkalıysa diğerinde kayılır. engeller: [{x, y, r}].
 * Dönüş: { engel: bir eksen tıkandı mı, adim: bu adımda ayak yere bastı mı, mesafe }.
 */
export function karakterYuru(tarla, k, ix, iy, dt, engeller = []) {
  const boy = Math.hypot(ix, iy);
  const sonuc = { engel: false, adim: false, mesafe: 0 };
  if (boy < 0.05 || !(dt > 0)) {
    k.hareketli = false;
    return sonuc;
  }
  const n = boy > 1 ? 1 / boy : 1;
  k.yon = Math.atan2(iy, ix);
  const hiz = karakterHizi(k.z);
  const dx = ix * n * hiz * dt;
  const dy = iy * n * hiz * dt;
  const [x0, y0] = [k.x, k.y];
  if (dx !== 0 && gecilir(tarla, k.x, k.y, k.x + dx, k.y, engeller)) k.x += dx;
  else if (dx !== 0) sonuc.engel = true;
  if (dy !== 0 && gecilir(tarla, k.x, k.y, k.x, k.y + dy, engeller)) k.y += dy;
  else if (dy !== 0) sonuc.engel = true;
  sonuc.mesafe = Math.hypot(k.x - x0, k.y - y0);
  k.hareketli = sonuc.mesafe > 0;
  k.z = yukseklik(tarla, k.x, k.y);
  const once = k.adimFaz;
  k.adimFaz = (k.adimFaz + sonuc.mesafe / (2 * ADIM_BOYU)) % 1;
  // Faz 0'ı ya da 0.5'i geçtiyse bir ayak yere bastı.
  sonuc.adim = k.hareketli && (k.adimFaz < once || (once < 0.5 && k.adimFaz >= 0.5));
  return sonuc;
}

/** Karakterin durduğu nokta, hücre biriminde (dedektör ve mıknatıs burayı okur). */
export function karakterNoktasi(k) {
  return { x: k.x - 0.5, y: k.y - 0.5 };
}

/** El ve tırmığın çalıştığı nokta: yön boyunca ARAC_UZAKLIK önde, hücre biriminde. */
export function aracNoktasi(k) {
  return {
    x: k.x - 0.5 + Math.cos(k.yon) * ARAC_UZAKLIK,
    y: k.y - 0.5 + Math.sin(k.yon) * ARAC_UZAKLIK,
  };
}

/** Hücre birimindeki p noktası karakterin erişiminde (≤ ERISIM) mi? */
export function erisimde(k, p) {
  return Math.hypot(p.x - (k.x - 0.5), p.y - (k.y - 0.5)) <= ERISIM;
}

/** p erişim dışındaysa onu erişim çemberinin kenarına çeker (sürüklemede). */
export function erisimeCek(k, p) {
  const ox = k.x - 0.5;
  const oy = k.y - 0.5;
  const d = Math.hypot(p.x - ox, p.y - oy);
  if (d <= ERISIM) return p;
  return { x: ox + ((p.x - ox) / d) * ERISIM, y: oy + ((p.y - oy) / d) * ERISIM };
}
