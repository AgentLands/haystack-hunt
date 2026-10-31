/**
 * Yığın kaymasının zamanlaması (saf): `cokert` geçişleri saniyede sabit sayıda koşar, kare
 * hızından bağımsız. Birikim kesri sonraki kareye kalır; bir karede en çok KAYMA_EN_COK geçiş.
 * Eskiden karede 1 (kaymıyorsa) ya da 2 (kayıyorsa) geçişti: 60 Hz'de saniyede ~120.
 */
export const KAYMA_HIZI = 120;
export const KAYMA_EN_COK = 4;

/** Bu karede koşacak geçiş sayısı ve kalan birikim: { n, birikim }. */
export function kaymaAdimi(birikim, dt) {
  const toplam = Math.min(KAYMA_EN_COK, birikim + KAYMA_HIZI * Math.max(0, dt));
  const n = Math.floor(toplam + 1e-6);
  return { n, birikim: Math.max(0, toplam - n) };
}

/**
 * Bu karenin kayma geçişlerini koşar (gec: tek geçiş, bir şey kaydıysa true döner).
 * Hiçbir şey kaymayınca kalan geçişler boşa gitmez, birikim sıfırlanır. Dönüş: yeni birikim.
 */
export function kaymaKos(gec, birikim, dt) {
  const a = kaymaAdimi(birikim, dt);
  // Yerleşmiş tarlada da karede en az bir yoklama yapılır (yeni bozulma hemen yakalansın).
  for (let i = 0; i < Math.max(1, a.n); i++) {
    if (!gec()) return 0;
  }
  return a.birikim;
}
