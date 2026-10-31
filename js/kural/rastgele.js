/**
 * Tohumlu, deterministik rastgelelik: aynı tohum her tarayıcıda aynı tarlayı üretir.
 */

/** mulberry32: 32 bitlik tohumdan [0, 1) aralığında sayı veren üreteç döndürür. */
export function uretec(tohum) {
  let a = tohum >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Metni (ör. "2026-10-31" ya da "a7k2p9") 32 bitlik tohuma çevirir (FNV-1a). */
export function metindenTohum(metin) {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Yerel tarihten "YYYY-AA-GG" etiketi: günün tarlası herkes için aynıdır. */
export function gununEtiketi(tarih = new Date()) {
  const iki = (n) => String(n).padStart(2, '0');
  return `${tarih.getFullYear()}-${iki(tarih.getMonth() + 1)}-${iki(tarih.getDate())}`;
}
