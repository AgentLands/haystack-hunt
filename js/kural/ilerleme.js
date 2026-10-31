/**
 * Tarlanın temizlik ilerlemesi: tarladan çıkan saman, başlangıç samanına oranla. Yalnız
 * bilgilendiricidir; puana girmez. DOM yok.
 */

/**
 * Temizlenen yüzde (0..100, 0,1 basamaklı; aşağı yuvarlanır). Başlangıçta saman yoksa 0.
 * Tarla büyük olduğundan ilk dakikalarda değer küçüktür; bu yüzden ondalık tutulur.
 */
export function temizYuzde(tarla) {
  const toplam = tarla.baslangicToplam;
  if (!(toplam > 0)) return 0;
  const binde = Math.floor((1000 * tarla.kaldirilan) / toplam);
  return Math.min(1000, Math.max(0, binde)) / 10;
}

/** Gösterim: %10'dan küçükse bir ondalıkla ("%2,4"), değilse tam sayı ("%37"). */
export function yuzdeYaz(yuzde) {
  return yuzde < 10 ? `%${yuzde.toFixed(1).replace('.', ',')}` : `%${Math.floor(yuzde)}`;
}
