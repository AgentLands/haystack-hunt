/**
 * Hava: rüzgâr yönü, şiddeti ve gök (docs/ciftlik/sistemler.md §3). DURUMSUZ: yalnız tohum
 * ve dilim numarasından hesaplanır (kayıtta ve çevrimdışı hesapta ek durum yok); tam sayı
 * karıştırma, Math.random/trigonometri yok. Dilim = DILIM_TIK (1200 tik, 1 oyun dakikası).
 *   yon     0 doğu, 1 güney, 2 batı, 3 kuzey (rüzgârın GİTTİĞİ yön); CEPHE_DILIM (3) dilimlik
 *           cephe boyunca sabit, cephe başına eşit olasılık
 *   siddet  0 durgun %15, 1 esinti %35, 2 rüzgâr %35, 3 sert %15 (toplamda; yağmurda ≥ 1)
 *   gok     'gunes' | 'bulut' | 'yagmur': 10 dilimlik "hava günü"nde %40 olasılıkla 2
 *           dilimlik yağmur penceresi (yağmur payı ≈ %8); kalan dilimlerin %30'u bulutlu
 * Başka ajanların kullandığı giriş: havaAl(c, tik?) (enerji: yel değirmeni, ayıklama:
 * tınaz, işleme: ot savurucu, HUD: havaTahmini). Dilim başında 'hava-degisti' yayılır.
 */
import { asamaTanimla } from '../benzetim.js';

export const DILIM_TIK = 1200;
export const CEPHE_DILIM = 3;
export const GUN_DILIM = 10;
export const YAGMUR_DILIM = 2;
/** Binde: yağmur günü olasılığı ve yağmursuz dilimde bulut olasılığı. */
export const YAGMUR_GUNU_BINDE = 400;
export const BULUT_BINDE = 300;
export const GOK = Object.freeze({ GUNES: 'gunes', BULUT: 'bulut', YAGMUR: 'yagmur' });
/**
 * Şiddet eşikleri (binde, birikimli). Yağmurda şiddet en az 1 olduğundan yağmursuz
 * dağılım hafifçe kaydırıldı ki TOPLAM dağılım 15/35/35/15 kalsın.
 */
const SIDDET_KURU = [163, 508, 853];
const SIDDET_YAGMUR = [0, 412, 824];

/** 32 bit tam sayı karıştırma (murmur3 bitirici): tohum + tür + sıra → [0, 2^32). */
export function karma(tohum, tur, n) {
  let x = (tohum ^ Math.imul(tur + 1, 0x9e3779b1) ^ Math.imul(n + 1, 0x85ebca77)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

const binde = (tohum, tur, n) => karma(tohum, tur, n) % 1000;

/** Dilim yağmurlu mu? */
function yagmurlu(tohum, dilim) {
  const gun = Math.floor(dilim / GUN_DILIM);
  if (binde(tohum, 3, gun) >= YAGMUR_GUNU_BINDE) return false;
  const bas = karma(tohum, 4, gun) % (GUN_DILIM - YAGMUR_DILIM + 1);
  const ic = dilim - gun * GUN_DILIM;
  return ic >= bas && ic < bas + YAGMUR_DILIM;
}

/** Saf hava: { dilim, yon, siddet, gok }. dilim ≥ 0 tam sayı. */
export function hava(tohum, dilim) {
  const t = tohum >>> 0;
  const yon = karma(t, 1, Math.floor(dilim / CEPHE_DILIM)) & 3;
  const yagmur = yagmurlu(t, dilim);
  const esik = yagmur ? SIDDET_YAGMUR : SIDDET_KURU;
  const u = binde(t, 2, dilim);
  let siddet = 3;
  for (let k = 0; k < 3; k++) {
    if (u < esik[k]) {
      siddet = k;
      break;
    }
  }
  let gok = GOK.GUNES;
  if (yagmur) gok = GOK.YAGMUR;
  else if (binde(t, 5, dilim) < BULUT_BINDE) gok = GOK.BULUT;
  return { dilim, yon, siddet, gok };
}

/** Tikin dilimi. */
export const dilimNo = (tik) => Math.floor(tik / DILIM_TIK);

/** Dünyanın şimdiki (ya da verilen tikteki) havası. */
export function havaAl(c, tik = c.tik) {
  return hava(c.tohum, dilimNo(tik));
}

/** Şimdiki dilim + sonraki n dilim (HUD tahmini, rüzgâr gülü paneli). */
export function havaTahmini(c, n = 3, tik = c.tik) {
  const d = dilimNo(tik);
  return Array.from({ length: n + 1 }, (_, k) => hava(c.tohum, d + k));
}

/** Rüzgâr yönü bir eksene (0: doğu-batı, 1: kuzey-güney) dik mi? (tınaz için yardımcı) */
export const ruzgarDik = (h, eksen) => h.siddet > 0 && (h.yon & 1) !== (eksen & 1);

// Yeni dilim başında olay (ilk dilimde yok: açılışta havaAl okunur). HUD, ses, rüzgâr gülü.
asamaTanimla('hava', 5, {
  adim(ctx) {
    if (ctx.tik === 0 || ctx.tik % DILIM_TIK !== 0) return;
    ctx.olay('hava-degisti', havaAl(ctx.c, ctx.tik));
  },
});
