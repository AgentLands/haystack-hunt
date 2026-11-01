/**
 * Kulak (saf kural): el ya da makine kazarken kazılan noktanın iğneye uzaklığından kaba bir
 * ses ipucu basamağı. Bilgi bilerek kısıtlıdır: yalnız iğne tarladayken (makinede ya da
 * balyada değil) ve kazılan nokta iğneye KULAK_MENZIL hücreden yakınken duyulur; uzaklık
 * dedektör seviyeleri gibi üç kaba basamağa bölünür, kesin mesafe ya da yön verilmez.
 * Derinlik de uzaklığa katılır (gömülü iğne zayıf duyulur): etkin uzaklık =
 * hypot(yatay uzaklık, iğnenin üstündeki saman / KULAK_DERINLIK_BOLEN). Böylece kulak bir
 * tarama aracı değil, doğru yeri kazarken "ısınıyorsun" geri bildirimidir.
 * Ses ve görsel karşılık ozellik/kulak.js'te.
 */
import { igneDerinligi, tarlada } from './igne.js';

export const KULAK_MENZIL = 16;
/** Saman katı → hücre: bu kadar kat saman bir hücre uzaklık sayılır. */
export const KULAK_DERINLIK_BOLEN = 6;

/** Basamaklar en yakından uzağa: [basamak, en çok uzaklık (hücre)]. 0 = sessiz. */
export const KULAK_BASAMAKLARI = [
  { basamak: 3, mesafe: 4, ad: 'çok yakın' },
  { basamak: 2, mesafe: 8, ad: 'yakın' },
  { basamak: 1, mesafe: KULAK_MENZIL, ad: 'uzakta bir tını' },
];

/** Uzaklıktan basamak (0..3); menzil dışı ya da geçersiz uzaklık 0. */
export function basamakUzakliktan(mesafe) {
  if (!(mesafe >= 0)) return 0;
  const b = KULAK_BASAMAKLARI.find((s) => mesafe <= s.mesafe);
  return b ? b.basamak : 0;
}

/** Kazılan noktanın (hücre birimi) iğneye etkin uzaklığı; iğne tarlada değilse Infinity. */
export function kulakUzakligi(tarla, x, y) {
  const { igne } = tarla;
  if (!tarlada(igne)) return Infinity;
  return Math.hypot(x - igne.x, y - igne.y, igneDerinligi(tarla) / KULAK_DERINLIK_BOLEN);
}

/**
 * (x, y) hücresinde (kazılan nokta, hücre birimi) kulak basamağı: 0 sessiz, 1 uzak,
 * 2 yakın, 3 çok yakın. İğne makinede ya da balyadaysa 0.
 */
export function kulakBasamagi(tarla, x, y) {
  return basamakUzakliktan(kulakUzakligi(tarla, x, y));
}

/** Basamağın uzaklık bandı (ic < uzaklık ≤ dis); 0 için menzilin dışı. */
export function basamakBandi(basamak) {
  if (basamak <= 0) return { ic: KULAK_MENZIL, dis: Infinity };
  const i = KULAK_BASAMAKLARI.findIndex((s) => s.basamak === basamak);
  return { ic: i === 0 ? 0 : KULAK_BASAMAKLARI[i - 1].mesafe, dis: KULAK_BASAMAKLARI[i].mesafe };
}
