/**
 * Akış (kombo) sayacı: kesintisiz kazı ritmi seviyeyi 0..1 arasında yükseltir, ara verince
 * söner. Yalnız his içindir; puana ve süreye hiçbir etkisi yoktur. Saf ve deterministik:
 * zaman dışarıdan (ms) verilir.
 */
/** İki kazı olayı arası bundan kısaysa ritim sürüyor sayılır (ms). */
export const BOSLUK_MS = 450;
/** Kesintisiz kazıda tam seviyeye çıkma süresi (sn). */
export const DOLMA_SN = 6;
/** Ritim kopunca tam seviyeden sıfıra sönme süresi (sn). */
export const SONME_SN = 2.5;

export function yeniAkis() {
  return { seviye: 0, son: null };
}

const sinirla = (v) => Math.min(1, Math.max(0, v));

/** Zaman t'deki (ms) seviye; olay gelmediyse boşluktan sonra yumuşakça sönmüş hali. */
export function akisSeviyesi(akis, t) {
  if (akis.son === null) return 0;
  const sessiz = Math.max(0, t - akis.son - BOSLUK_MS);
  return sinirla(akis.seviye - sessiz / 1000 / SONME_SN);
}

/** Kazı olayı (zaman t, ms): ritim sürüyorsa yükselir, kopmuşsa sönmüş seviyeden başlar. */
export function akisOlayi(akis, t) {
  const onceki = akisSeviyesi(akis, t);
  const gecen = akis.son === null ? Infinity : t - akis.son;
  const artis = gecen <= BOSLUK_MS ? gecen / 1000 / DOLMA_SN : 0;
  return { seviye: sinirla(onceki + artis), son: t };
}

/** Paslı çivi gibi bir aksilik: seviye yarıya iner (yumuşak düşüş). */
export function akisAksadi(akis, t) {
  return { seviye: akisSeviyesi(akis, t) / 2, son: t };
}

/** Seviyeye göre ses perdesi çarpanı: 1 (sakin) ile 1,18 (tam akış) arası. */
export function akisPerdesi(seviye) {
  return 1 + 0.18 * sinirla(seviye);
}
