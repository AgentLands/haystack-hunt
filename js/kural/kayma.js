/**
 * Yığın kaymasının zamanlaması (saf): `cokert` geçişleri saniyede sabit sayıda koşar, kare
 * hızından bağımsız. Birikim kesri sonraki kareye kalır; bir karede en çok KAYMA_EN_COK geçiş
 * (6: 20 Hz'e dek tam hız; 20 Hz altındaki kareler yavaşlar, en kötü durumda 6 x kare hızı).
 * Yerleşmiş tarlada her karede bir "yoklama" geçişi yapılır (yeni bozulma hemen yakalansın);
 * yoklama bir şey kaydırdıysa gerçek bir geçiştir ve birikimden düşülür (birikim -1'e dek
 * borca girer, borç sonraki karelerin payıyla kapanır): 30-240 Hz'de saniyede ~120 geçiş.
 */
export const KAYMA_HIZI = 120;
export const KAYMA_EN_COK = 6;

/** Bu karede koşacak geçiş sayısı ve kalan birikim: { n, birikim } (birikim borçta eksi olur). */
export function kaymaAdimi(birikim, dt) {
  const toplam = Math.min(KAYMA_EN_COK, birikim + KAYMA_HIZI * Math.max(0, dt));
  const n = Math.max(0, Math.floor(toplam + 1e-6));
  return { n, birikim: toplam - n };
}

/**
 * Bu karenin kayma geçişlerini koşar (gec: tek geçiş, bir şey kaydıysa true döner).
 * Hiçbir şey kaymayınca kalan geçişler boşa gitmez, birikim sıfırlanır. Dönüş: yeni birikim.
 */
export function kaymaKos(gec, birikim, dt) {
  const a = kaymaAdimi(birikim, dt);
  for (let i = 0; i < a.n; i++) {
    if (!gec()) return 0;
  }
  if (a.n > 0 || a.birikim < 0) return a.birikim;
  // Zorunlu yoklama: kaydırdıysa gerçek geçiştir, birikimden düşülür.
  return gec() ? a.birikim - 1 : 0;
}
