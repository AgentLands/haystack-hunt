/**
 * Görünüm (kamera) matematiği: DOM'suz, saf işlevler. Görünüm {z, gx, gy}: yakınlaştırma
 * ve görünür alanın sol üst köşesi (hücre birimi). Ekran noktaları tuvalin 0..1 oranı
 * (fx, fy) olarak verilir; böylece tuval boyutundan bağımsızdır. Tüm işlevler yeni nesne
 * döndürür ve sonucu tarla sınırlarına kenetler.
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';

export const YAKIN_EN_AZ = 1;
export const YAKIN_EN_COK = 6;

export function varsayilan() {
  return { z: YAKIN_EN_AZ, gx: 0, gy: 0 };
}

/** Yakınlaştırmayı 1×–6× arasına, görünür alanı tarla sınırlarına kenetler. */
export function sinirla(g, W = GENISLIK, H = YUKSEKLIK) {
  if (![g.z, g.gx, g.gy].every(Number.isFinite)) return varsayilan();
  const z = Math.min(YAKIN_EN_COK, Math.max(YAKIN_EN_AZ, g.z));
  return {
    z,
    gx: Math.min(W - W / z, Math.max(0, g.gx)),
    gy: Math.min(H - H / z, Math.max(0, g.gy)),
  };
}

/** Görünür alan: sol üst köşe ve genişlik/yükseklik (hücre birimi). */
export function gorunurAlan(g, W = GENISLIK, H = YUKSEKLIK) {
  return { x: g.gx, y: g.gy, en: W / g.z, boy: H / g.z };
}

/** Ekran oranını (0..1) kesirli tarla koordinatına çevirir. */
export function ekrandanDunyaya(g, fx, fy, W = GENISLIK, H = YUKSEKLIK) {
  return { x: g.gx + (fx * W) / g.z, y: g.gy + (fy * H) / g.z };
}

/** Ekran oranını hücre (tam sayı) koordinatına çevirir. */
export function ekrandanHucre(g, fx, fy, W = GENISLIK, H = YUKSEKLIK) {
  const d = ekrandanDunyaya(g, fx, fy, W, H);
  return { x: Math.floor(d.x), y: Math.floor(d.y) };
}

/** Tarla noktasını ekran oranına çevirir (ekrandanDunyaya'nın tersi). */
export function dunyadanEkrana(g, x, y, W = GENISLIK, H = YUKSEKLIK) {
  return { fx: ((x - g.gx) * g.z) / W, fy: ((y - g.gy) * g.z) / H };
}

/** Yeni yakınlaştırmaya geç; (fx, fy) ekran noktasının altındaki tarla noktası sabit kalır. */
export function odakla(g, fx, fy, yeniZ, W = GENISLIK, H = YUKSEKLIK) {
  const z = Math.min(YAKIN_EN_COK, Math.max(YAKIN_EN_AZ, yeniZ));
  const n = ekrandanDunyaya(g, fx, fy, W, H);
  return sinirla({ z, gx: n.x - (fx * W) / z, gy: n.y - (fy * H) / z }, W, H);
}

/** İçeriği ekranda (dfx, dfy) oranı kadar sürükler (parmakla aynı yönde). */
export function kaydir(g, dfx, dfy, W = GENISLIK, H = YUKSEKLIK) {
  return sinirla({ z: g.z, gx: g.gx - (dfx * W) / g.z, gy: g.gy - (dfy * H) / g.z }, W, H);
}

/** Görünür alanın merkezini tarla noktasına (x, y) getirir. */
export function merkezle(g, x, y, W = GENISLIK, H = YUKSEKLIK) {
  return sinirla({ z: g.z, gx: x - W / g.z / 2, gy: y - H / g.z / 2 }, W, H);
}

/**
 * Yumuşak takip: görünümü, (x, y) noktasını z yakınlaştırmasıyla ortalayan görünüme doğru
 * oran (0..1) kadar yaklaştırır. oran = 1 hemen oraya atlar. Kare başına oran için
 * 1 − exp(−hız · dt) kullanılırsa kare hızından bağımsız olur.
 */
export function takipEt(g, x, y, z, oran, W = GENISLIK, H = YUKSEKLIK) {
  const k = Math.min(1, Math.max(0, oran));
  const hz = Math.min(YAKIN_EN_COK, Math.max(YAKIN_EN_AZ, z));
  const nz = g.z + (hz - g.z) * k;
  const hedef = merkezle({ z: nz, gx: 0, gy: 0 }, x, y, W, H);
  return sinirla({ z: nz, gx: g.gx + (hedef.gx - g.gx) * k, gy: g.gy + (hedef.gy - g.gy) * k },
    W, H);
}

/** Takip yakınlığının ayarlandığı tuval genişliği (CSS px; masaüstü 1280 düzeni). */
export const TAKIP_REFERANS_EN = 968;

/**
 * Ekrana göre takip yakınlığı: dar tuvalde (telefon) karakter masaüstündeki CSS boyutuna
 * yakın görünsün diye yakınlaştırma genişlikle ters orantılı artar; geniş tuvalde taban
 * kalır. Sonuç [taban, YAKIN_EN_COK] aralığında; genişlik bilinmiyorsa taban.
 */
export function ekranaGoreYakinlik(taban, cssEn, referans = TAKIP_REFERANS_EN) {
  if (!(cssEn > 0)) return taban;
  return Math.min(YAKIN_EN_COK, Math.max(taban, (taban * referans) / cssEn));
}
