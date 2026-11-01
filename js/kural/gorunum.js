/**
 * Görünüm (kamera) matematiği: DOM'suz, saf işlevler. Görünüm {z, gx, gy, oran?}:
 * yakınlaştırma, görünür alanın sol üst köşesi (hücre birimi) ve isteğe bağlı kutu oranı
 * (tuvalin en/boy oranı; yoksa tarlanınki, 3:2). Ekran noktaları tuvalin 0..1 oranı
 * (fx, fy) olarak verilir; böylece tuval boyutundan bağımsızdır. Kutu tarladan dar ya da
 * genişse z = 1'de tarlanın tamamı sığar ve fazla eksende ortalanır (kenarlarda boşluk);
 * yakınken görünür alan tarlanın içinde kalır. Tüm işlevler yeni nesne döndürür ve sonucu
 * tarla sınırlarına kenetler; oran varsa sonuca taşınır.
 * İsteğe bağlı iki genişletme (yalnız çiftlik moduna özel; yoksa davranış değişmez ve sonuca
 * eklenmez): `ust` (0..1): kamera görünür yüksekliğin bu oranı kadar tarlanın üst kenarından
 * öteye kayabilir (üst şerit üst satırları örtmesin); `zCok`: yakınlaştırma tavanı (> 6).
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';

export const YAKIN_EN_AZ = 1;
export const YAKIN_EN_COK = 6;

/** Yakınlaştırma tavanı: görünümde `zCok` varsa (çiftlik inşa) o, yoksa YAKIN_EN_COK. */
export const zTavan = (g) => (g.zCok > YAKIN_EN_COK ? g.zCok : YAKIN_EN_COK);

export function varsayilan() {
  return { z: YAKIN_EN_AZ, gx: 0, gy: 0 };
}

/** g'nin kutu oranını (varsa) yeni görünüme taşır. */
function oranli(g, yeni) {
  if (g.oran > 0 && Number.isFinite(g.oran)) yeni.oran = g.oran;
  if (g.ust > 0) yeni.ust = g.ust;
  if (g.zCok > YAKIN_EN_COK) yeni.zCok = g.zCok;
  return yeni;
}

/**
 * z = 1'deki görünür alanın boyu (hücre): kutu oranında, tarlayı içine alan en küçük
 * dikdörtgen. Oran tarlanınkine eşitse (W, H); daha dar (dikey telefon) ise en W, boy
 * daha uzun; daha geniş ise boy H, en daha geniş.
 */
export function tabanAlan(g, W = GENISLIK, H = YUKSEKLIK) {
  const o = g.oran > 0 && Number.isFinite(g.oran) ? g.oran : W / H;
  return o >= W / H ? { en: H * o, boy: H } : { en: W, boy: W / o };
}

/**
 * Bir eksen: görünür boy tarladan büyükse ortalar, değilse tarla içine kenetler; pay (0..1)
 * başlangıç kenarından öteye görünür boyun bu oranı kadar kayma izni verir.
 */
function eksen(deger, tarla, gorunur, pay = 0) {
  if (gorunur >= tarla) return (tarla - gorunur) / 2;
  return Math.min(tarla - gorunur, Math.max(pay > 0 ? -pay * gorunur : 0, deger));
}

/** Yakınlaştırmayı 1×–6× arasına, görünür alanı tarla sınırlarına kenetler. */
export function sinirla(g, W = GENISLIK, H = YUKSEKLIK) {
  if (![g.z, g.gx, g.gy].every(Number.isFinite)) return oranli(g, varsayilan());
  const z = Math.min(zTavan(g), Math.max(YAKIN_EN_AZ, g.z));
  const t = tabanAlan(g, W, H);
  return oranli(g, { z, gx: eksen(g.gx, W, t.en / z),
    gy: eksen(g.gy, H, t.boy / z, g.ust > 0 ? g.ust : 0) });
}

/** Görünür alan: sol üst köşe ve genişlik/yükseklik (hücre birimi). */
export function gorunurAlan(g, W = GENISLIK, H = YUKSEKLIK) {
  const t = tabanAlan(g, W, H);
  return { x: g.gx, y: g.gy, en: t.en / g.z, boy: t.boy / g.z };
}

/** Ekran oranını (0..1) kesirli tarla koordinatına çevirir. */
export function ekrandanDunyaya(g, fx, fy, W = GENISLIK, H = YUKSEKLIK) {
  const t = tabanAlan(g, W, H);
  return { x: g.gx + (fx * t.en) / g.z, y: g.gy + (fy * t.boy) / g.z };
}

/** Ekran oranını hücre (tam sayı) koordinatına çevirir. */
export function ekrandanHucre(g, fx, fy, W = GENISLIK, H = YUKSEKLIK) {
  const d = ekrandanDunyaya(g, fx, fy, W, H);
  return { x: Math.floor(d.x), y: Math.floor(d.y) };
}

/** Tarla noktasını ekran oranına çevirir (ekrandanDunyaya'nın tersi). */
export function dunyadanEkrana(g, x, y, W = GENISLIK, H = YUKSEKLIK) {
  const t = tabanAlan(g, W, H);
  return { fx: ((x - g.gx) * g.z) / t.en, fy: ((y - g.gy) * g.z) / t.boy };
}

/** Yeni yakınlaştırmaya geç; (fx, fy) ekran noktasının altındaki tarla noktası sabit kalır. */
export function odakla(g, fx, fy, yeniZ, W = GENISLIK, H = YUKSEKLIK) {
  const z = Math.min(zTavan(g), Math.max(YAKIN_EN_AZ, yeniZ));
  const n = ekrandanDunyaya(g, fx, fy, W, H);
  const t = tabanAlan(g, W, H);
  return sinirla(oranli(g, { z, gx: n.x - (fx * t.en) / z, gy: n.y - (fy * t.boy) / z }),
    W, H);
}

/** İçeriği ekranda (dfx, dfy) oranı kadar sürükler (parmakla aynı yönde). */
export function kaydir(g, dfx, dfy, W = GENISLIK, H = YUKSEKLIK) {
  const t = tabanAlan(g, W, H);
  return sinirla(oranli(g, { z: g.z, gx: g.gx - (dfx * t.en) / g.z,
    gy: g.gy - (dfy * t.boy) / g.z }), W, H);
}

/** Görünür alanın merkezini tarla noktasına (x, y) getirir. */
export function merkezle(g, x, y, W = GENISLIK, H = YUKSEKLIK) {
  const t = tabanAlan(g, W, H);
  return sinirla(oranli(g, { z: g.z, gx: x - t.en / g.z / 2, gy: y - t.boy / g.z / 2 }), W, H);
}

/**
 * Yumuşak takip: görünümü, (x, y) noktasını z yakınlaştırmasıyla ortalayan görünüme doğru
 * oran (0..1) kadar yaklaştırır. oran = 1 hemen oraya atlar. Kare başına oran için
 * 1 − exp(−hız · dt) kullanılırsa kare hızından bağımsız olur.
 */
export function takipEt(g, x, y, z, oran, W = GENISLIK, H = YUKSEKLIK) {
  const k = Math.min(1, Math.max(0, oran));
  const hz = Math.min(zTavan(g), Math.max(YAKIN_EN_AZ, z));
  const nz = g.z + (hz - g.z) * k;
  const hedef = merkezle(oranli(g, { z: nz, gx: 0, gy: 0 }), x, y, W, H);
  return sinirla(oranli(g, { z: nz, gx: g.gx + (hedef.gx - g.gx) * k,
    gy: g.gy + (hedef.gy - g.gy) * k }), W, H);
}

/**
 * Kutu oranını değiştirir; görünür alanın merkezi aynı tarla noktasında kalır (telefon
 * döndürülünce ya da tuval yeniden boyutlanınca kamera zıplamasın).
 */
export function oranDegistir(g, oran, W = GENISLIK, H = YUKSEKLIK) {
  const a = gorunurAlan(g, W, H);
  const taban = { ...oranli(g, { z: g.z, gx: 0, gy: 0 }), oran };
  return merkezle(taban, a.x + a.en / 2, a.y + a.boy / 2, W, H);
}

/** Takip yakınlığının ayarlandığı tuval genişliği (CSS px; masaüstü 1280 düzeni). */
export const TAKIP_REFERANS_EN = 968;

/**
 * Ekrana göre takip yakınlığı: dar tuvalde (telefon) karakter masaüstündeki CSS boyutuna
 * yakın görünsün diye yakınlaştırma genişlikle ters orantılı artar; geniş tuvalde taban
 * kalır. cssEn: tarlanın z = 1'deki CSS genişliği. Sonuç [taban, YAKIN_EN_COK] aralığında;
 * genişlik bilinmiyorsa taban.
 */
export function ekranaGoreYakinlik(taban, cssEn, referans = TAKIP_REFERANS_EN) {
  if (!(cssEn > 0)) return taban;
  return Math.min(YAKIN_EN_COK, Math.max(taban, (taban * referans) / cssEn));
}
