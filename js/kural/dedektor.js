/**
 * Dedektör hakkı telafisi (saf): şanssız tohum koruması. Oyuncu bütün haklarını harcadığı
 * halde okumaların hepsi "Soğuk" çıktıysa (iğne hiçbir okumanın en geniş halkasında değil)
 * tur başına bir kez bir hak daha verilir. Böylece en kötü tohumlarda bile en az bir
 * okuma yön gösterir; şanslı oyuncuya ek hak gitmez.
 */

/** Telafi edilecek en çok hak (tur başına). */
export const TELAFI_HAKKI = 1;

/**
 * Bir okumadan sonra verilecek telafi hakkı (0 ya da 1). halkalar: şimdiye kadarki okumalar
 * ({ seviye }), kalan: okumadan sonra kalan hak, verilen: bu turda verilmiş telafi sayısı.
 */
export function telafiHakki(halkalar, kalan, verilen = 0) {
  if (kalan > 0 || verilen >= TELAFI_HAKKI || !halkalar.length) return 0;
  return halkalar.every((h) => !Number.isFinite(h.seviye.mesafe)) ? 1 : 0;
}
