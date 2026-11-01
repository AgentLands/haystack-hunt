/**
 * Tuval ölçeği (DOM): ana tuvalin arka belleğini görüntülendiği CSS boyutu ×
 * devicePixelRatio yapar (toplam piksel EN_COK_PIKSEL ile sınırlı) ve boyut değişince
 * (ResizeObserver, yakınlaştırmayla değişen devicePixelRatio) yeniler. Dünya koordinatları
 * değişmez: dünya hep DUNYA_EN×DUNYA_BOY (hücre × OLCEK) pikseldir; cizim.js dönüşümüne
 * `ekran.tabanX/tabanY` (arka bellek pikseli / dünya pikseli) çarpanını ekler, böylece
 * bütün katmanlar aynı kalıp keskinleşir. Kutu 3:2 olmak zorunda değildir (dikey telefonda
 * daha uzun): çarpan iki eksende aynıdır (dünya çarpılmaz) ve z = 1'de tarla kutuya sığar
 * (kural/gorunum.js tabanAlan); kutunun oranı `ekran.oran`.
 *
 * Tuval boyutuna bakan kodlar için sözleşme:
 * - Ekran-sabit boyut (dış hat, işaret): `ekranBirim(ctx)` = 1 CSS pikseli (yerel birimde).
 * - Dünya çizimi (katmanlar) tuval.width/height'a bakmaz; dünya genişliği DUNYA_EN'dir.
 * - Ekran uzayında çizen (setTransform(1, 0, 0, 1, 0, 0)) arka bellek pikseliyle çalışır:
 *   boyut ctx.canvas.width/height, CSS pikseli başına `ekran.dpr` arka bellek pikseli.
 * - Ekran (CSS) pikselinden dünyaya: girdi getBoundingClientRect oranıyla (0..1) çalışır ve
 *   görünümün oranını hesaba katar; bir CSS pikseli dunyaPikseli() dünya pikselidir.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';

/** Hücre başına dünya pikseli (cizim.js de bunu dışa verir). */
export const OLCEK = 4;
export const DUNYA_EN = GENISLIK * OLCEK;
export const DUNYA_BOY = YUKSEKLIK * OLCEK;
/** Arka bellek üst sınırı (piksel): 4K ekranda bellek ve doldurma maliyeti şişmesin. */
export const EN_COK_PIKSEL = 4.5e6;

/**
 * Son ölçüm: arka bellek boyutu (en, boy), görüntülenen CSS boyutu (cssEn, cssBoy), etkin
 * piksel oranı (dpr: CSS pikseli başına arka bellek pikseli, sınır uygulanmış) ve dünya
 * pikselinden arka bellek pikseline z = 1'deki çarpan (tabanX = tabanY: tek ölçek), kutu
 * oranı (oran = en / boy). sayac her boyut değişikliğinde artar (önbellekli ekran uzayı
 * çizimleri için).
 */
export const ekran = {
  en: DUNYA_EN, boy: DUNYA_BOY, cssEn: DUNYA_EN, cssBoy: DUNYA_BOY,
  dpr: 1, tabanX: 1, tabanY: 1, oran: DUNYA_EN / DUNYA_BOY, sayac: 0,
};

/** Bir CSS pikselinin dünya pikseli karşılığı (yakınlaştırma hariç). */
export function dunyaPikseli() {
  return ekran.dpr / ekran.tabanX;
}

/** Tarlanın z = 1'deki CSS genişliği (dikey kutuda tuval genişliği, genişte daha az). */
export function tarlaCssEn() {
  return DUNYA_EN / dunyaPikseli();
}

/** Kutuya sığan tek ölçek: arka bellek pikseli / dünya pikseli (z = 1, saf). */
export function tabanCarpani(en, boy) {
  return Math.min(en / DUNYA_EN, boy / DUNYA_BOY);
}

/**
 * Yerel çizim uzayında 1 CSS pikselinin boyu (dış hat, işaret ve etiket boyları için TEK
 * doğru birim). Dönüşümün ölçeği arka bellek pikselidir; DPR 3 telefonda 3 kat büyük
 * olduğundan `ekran.dpr` ile düzeltilir: aynı çizim DPR 1 ve DPR 3'te CSS pikselinde aynı
 * kalınlıkta görünür. Node testlerinde (tuval yok) dpr = 1.
 */
export function ekranBirim(ctx) {
  const t = ctx.getTransform();
  return ekran.dpr / Math.hypot(t.a, t.b);
}

/**
 * CSS boyutu ve piksel oranından arka bellek boyutu (saf). En boy oranı 3:2'ye ±2 piksel
 * yakınsa tam 3:2'ye oturtulur (kenarlık yuvarlaması dünya ölçeğini çarpıtmasın).
 */
export function arkaBellekBoyu(cssEn, cssBoy, dpr, enCok = EN_COK_PIKSEL) {
  let oran = dpr > 0 ? dpr : 1;
  const alan = cssEn * cssBoy * oran * oran;
  if (alan > enCok) oran *= Math.sqrt(enCok / alan);
  const en = Math.max(1, Math.round(cssEn * oran));
  let boy = Math.max(1, Math.round(cssBoy * oran));
  const tamBoy = Math.round((en * DUNYA_BOY) / DUNYA_EN);
  if (Math.abs(boy - tamBoy) <= 2) boy = tamBoy;
  return { en, boy, oran };
}

/** Tuvali ölçer; arka bellek değiştiyse true (tuvali boyamak içeriğini siler). */
export function tuvaliOlcekle(tuval) {
  const cssEn = tuval.clientWidth;
  const cssBoy = tuval.clientHeight;
  if (!(cssEn > 0 && cssBoy > 0)) return false; // gizli: eski boyut kalır
  const { en, boy, oran } = arkaBellekBoyu(cssEn, cssBoy, window.devicePixelRatio || 1);
  const taban = tabanCarpani(en, boy);
  Object.assign(ekran, { en, boy, cssEn, cssBoy, dpr: oran, tabanX: taban, tabanY: taban,
    oran: en / boy });
  if (tuval.width === en && tuval.height === boy) return false;
  tuval.width = en;
  tuval.height = boy;
  ekran.sayac++;
  return true;
}

/**
 * Tuvali şimdi ölçer ve boyut değişimlerini izler. Döndürdüğü işlev her karede çağrılır:
 * piksel oranı (tarayıcı yakınlaştırması, ekran değişimi) değiştiyse yeniden ölçer.
 */
export function tuvalOlcekKur(tuval) {
  tuval.width = DUNYA_EN;
  tuval.height = DUNYA_BOY;
  tuvaliOlcekle(tuval);
  new ResizeObserver(() => tuvaliOlcekle(tuval)).observe(tuval);
  let sonDpr = window.devicePixelRatio;
  return function denetle() {
    if (window.devicePixelRatio === sonDpr) return;
    sonDpr = window.devicePixelRatio;
    tuvaliOlcekle(tuval);
  };
}
