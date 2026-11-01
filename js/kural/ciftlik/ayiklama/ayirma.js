/**
 * Ayıklama kuralları (saf): bir eşyanın hangi çıkıştan gideceğini türünün fizik satırından
 * (esya.js; docs/ciftlik/esyalar.md §3 ayırma haritası) ve ayıklayıcının durumundan seçer.
 * Çıkış numaraları parça tanımlarındaki `cikislar` sırasıdır:
 *   mıknatıslı tambur  0 ön (manyetik değil), 1 sağ (manyetik)
 *   kalbur             0 ön (iri), 1 sağ (ince)
 *   tınaz              0 dip (ağır), 1 sol, 2 sağ (savrulan)
 *   şeytan yeli        0 ön (hafif), 1 sol (çok hafif), 2 sağ (ağır)
 * Süre ve eşik sabitleri bu dosyada (denge tablosu ekonomi/denge.js gelince oraya taşınır).
 */
import { esyaTanimi, esyaKodu } from '../esya.js';
import { yonDondur } from '../olcu.js';
import { havaAl } from '../dunya/hava.js';

/** Oluk mıknatısı tutucusunun yuva sayısı (dolunca manyetikler geçer). */
export const TUTUCU_YUVA = 6;
/** Eşya başına iş süreleri (tik; tam güçte): tambur 240/dk, kalbur 200, tınaz 300, yel 200. */
export const TAMBUR_TIK = 5;
export const KALBUR_TIK = 6;
export const TINAZ_TIK = 4;
export const YEL_TIK = 6;
/** Güç talebi (bg); oluk, kalbur ve tınaz güçsüzdür. */
export const TAMBUR_GUC = 4;
export const YEL_GUC = 6;
/** Kalbur sıvası: her yaş ot +1 (en çok SIVA_TAVAN); SIVA_ESIK ve üstünde delikler kapalı. */
export const SIVA_ESIK = 4;
export const SIVA_TAVAN = 8;
/** Yaş ot gelmeyen bu kadar tikte sıva 1 azalır. */
export const SIVA_COZ_TIK = 200;

/** Eşya tür kodlarının fizik okuması (bilinmeyen kod: ağır, iri, manyetik değil). */
export const manyetikMi = (kod) => esyaTanimi(kod)?.manyetik === true;
export const inceMi = (kod) => esyaTanimi(kod)?.boyut === 'ince';
export const hafiflik = (kod) => esyaTanimi(kod)?.hafiflik ?? 0;
export const yasOtMu = (kod) => kod === esyaKodu('yas-ot');

/**
 * Yuvalı ayıklayıcılar `ozel`inde tek eşya bekletir: { kod: 0 boş, ilerleme } (+ parçaya
 * özgü alanlar). Bu işlevler yuvanın saf durumunu verir.
 */
export const yuvaDolu = (o) => o.kod !== 0;

/**
 * Şimdiki rüzgâr (dunya/hava.js; testler havaSabitle ile sabitler): { yon: rüzgârın GİTTİĞİ
 * yön (0 doğu .. 3 kuzey), siddet: 0..3, gok }.
 */
export function ruzgarOku(ctx) {
  return havaAl(ctx.c, ctx.tik);
}

/**
 * Tınazın bu andaki hâli: parçanın ekseni (yon & 1) ile rüzgâr eksenini karşılaştırır.
 * { durum: 'durgun' | 'paralel' | 'esinti' | 'ruzgar', yan: 0 | 1 sol | 2 sağ, esik }:
 * esinti (şiddet 1) yalnız hafiflik ≥ 2'yi, rüzgâr (şiddet ≥ 2) hafiflik ≥ 1'i savurur;
 * savrulan eşya rüzgârın gittiği yandan çıkar. Durgun ve eksen boyunca esen rüzgâr hiçbir
 * şeyi savurmaz (yan 0, esik 3).
 */
export function tinazHali(parcaYon, ruzgar) {
  if (ruzgar.siddet <= 0) return { durum: 'durgun', yan: 0, esik: 3 };
  if ((ruzgar.yon & 1) === (parcaYon & 1)) return { durum: 'paralel', yan: 0, esik: 3 };
  const yan = ruzgar.yon === yonDondur(parcaYon, 1) ? 2 : 1;
  return ruzgar.siddet === 1
    ? { durum: 'esinti', yan, esik: 2 }
    : { durum: 'ruzgar', yan, esik: 1 };
}

/** Tınaz çıkışı: 0 dip, 1 sol, 2 sağ. */
export function tinazYolu(hal, kod) {
  return hafiflik(kod) >= hal.esik ? hal.yan : 0;
}

/** Şeytan yeli çıkışı: 0 ön (hafif), 1 sol (çok hafif), 2 sağ (ağır). */
export function yelYolu(kod) {
  const h = hafiflik(kod);
  return h === 0 ? 2 : h === 1 ? 0 : 1;
}

/** Mıknatıslı tambur çıkışı: 0 ön, 1 sağ (manyetik). */
export const tamburYolu = (kod) => (manyetikMi(kod) ? 1 : 0);

/** Kalbur çıkışı: sıva ≥ SIVA_ESIK iken delikler kapalı, her şey önden; yoksa ince sağdan. */
export function kalburYolu(siva, kod) {
  return siva < SIVA_ESIK && inceMi(kod) ? 1 : 0;
}
