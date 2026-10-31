/**
 * Kontrol durumu: klavye (WASD/oklar), fare/dokunma (tıkla-yürü) ve dokunmatik sanal kol
 * buraya YAZAR; oyun.js her karede OKUR. Girdi kaynakları birbirini bilmez.
 * Sözleşme: docs/KARAKTER_TASARIM.md §Kontrol.
 */
export const kontrol = {
  /** Hareket isteği, her eksen -1..1 (sanal kol analog olabilir). y aşağı pozitif. */
  yon: { x: 0, y: 0 },
  /** Seçili aracı / makinenin işini kullan (Boşluk ya da dokunmatik "Kullan"), basılı tut. */
  kullan: false,
  /** Tek seferlik istekler: kaynak true yapar, oyun.js tüketip false'a çeker. */
  binIste: false,
  /** Tıkla-yürü hedefi (hücre koordinatı) ya da null; klavye hareketi bunu iptal eder. */
  hedef: null,
};

/** Bir kaynağın tuttuğu yönleri birleştirir (ör. klavye + sanal kol aynı anda). */
export function yonAyarla(x, y) {
  kontrol.yon.x = Math.max(-1, Math.min(1, x));
  kontrol.yon.y = Math.max(-1, Math.min(1, y));
  if (x !== 0 || y !== 0) kontrol.hedef = null;
}
