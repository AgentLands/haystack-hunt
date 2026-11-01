/**
 * Çiftlik ölçüleri ve küçük saf yardımcılar: inşa ızgarası (karo = 2×2 tarla hücresi,
 * 120×80 karo), benzetim saati (20 Hz sabit tik), bant birimi (1 karo = 240 birim), yönler
 * (0 doğu, 1 güney, 2 batı, 3 kuzey; tam sayı, açı yok), durumlu zar (mulberry32; durumu
 * `{ a }` nesnesinde tutulur ki kayda yazılabilsin) ve FNV özet (determinizm testleri).
 * Benzetimde trigonometri ve tarayıcı rastgeleliği yoktur: yalnız tam sayı + − × ÷.
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';

/** Bir karo kaç tarla hücresi (kenar). */
export const KARO = 2;
export const KARO_EN = GENISLIK / KARO;
export const KARO_BOY = YUKSEKLIK / KARO;
export const KARO_SAYISI = KARO_EN * KARO_BOY;
/** Benzetim adımı (ms) ve bir çizim karesinde en çok atılan tik (geride kalınca yavaşlar). */
export const TIK_MS = 50;
export const TIK_EN_COK = 4;
/** Bant konum birimi: 1 karo = BIRIM. Eşyalar arası en az ARALIK (karoda 3 eşya). */
export const BIRIM = 240;
export const ARALIK = 80;

/** Yön vektörleri (karo): 0 doğu, 1 güney, 2 batı, 3 kuzey. */
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];
export const YON_ADI = ['doğu', 'güney', 'batı', 'kuzey'];

export const tersYon = (yon) => (yon + 2) & 3;
export const yonDondur = (yon, adim = 1) => (((yon + adim) % 4) + 4) % 4;
export const karoIndeks = (kx, ky) => ky * KARO_EN + kx;
export const karoIcinde = (kx, ky) => kx >= 0 && ky >= 0 && kx < KARO_EN && ky < KARO_BOY;

/**
 * Yerel karo (yon 0 çerçevesinde, parça boyutu [en, boy]) dünya yönüne döndürülür: her
 * çeyrek tur saat yönünde (x, y) → (boy - 1 - y, x) ve boyut [boy, en] olur.
 */
export function yerelDondur(x, y, en, boy, yon) {
  let px = x;
  let py = y;
  let e = en;
  let b = boy;
  for (let k = 0; k < (yon & 3); k++) {
    const nx = b - 1 - py;
    py = px;
    px = nx;
    const t = e;
    e = b;
    b = t;
  }
  return { x: px, y: py };
}

/** Döndürülmüş boyut: yon 1 ve 3'te en ile boy yer değiştirir. */
export function donmusBoyut([en, boy], yon) {
  return yon & 1 ? [boy, en] : [en, boy];
}

/** Durumlu zar: tohumdan { a } (kayda yazılır). */
export function zarKur(tohum) {
  return { a: tohum >>> 0 };
}

/** Sonraki 32 bitlik işaretsiz tam sayı (mulberry32; rastgele.js ile aynı algoritma). */
export function zarSayi(zar) {
  zar.a = (zar.a + 0x6d2b79f5) >>> 0;
  let t = zar.a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** [0, n) aralığında tam sayı (n ≤ 2^21; çarpım tam, bölme ikinin kuvveti: bit bit aynı). */
export function zarAralik(zar, n) {
  return Math.floor((zarSayi(zar) * n) / 4294967296);
}

/** FNV-1a özetine bir tam sayı dizisi (ya da tek sayı) katar; yeni özeti döndürür. */
export function ozetKat(h, dizi) {
  let s = h >>> 0;
  const tek = typeof dizi === 'number';
  const n = tek ? 1 : dizi.length;
  for (let i = 0; i < n; i++) {
    const v = (tek ? dizi : dizi[i]) | 0;
    for (let b = 0; b < 4; b++) {
      s ^= (v >>> (b * 8)) & 255;
      s = Math.imul(s, 0x01000193) >>> 0;
    }
  }
  return s;
}

export const OZET_BASI = 0x811c9dc5;
