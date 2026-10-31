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

const yonlar = new Map();
const kullananlar = new Set();
const kenetle = (v) => Math.max(-1, Math.min(1, v));

/**
 * Bir kaynağın (ör. 'klavye', 'kol') istediği yönü kaydeder; kontrol.yon tüm kaynakların
 * toplamıdır. Böylece bir kaynağı bırakmak ötekinin yönünü sıfırlamaz.
 */
export function yonAyarla(x, y, kaynak = 'varsayilan') {
  if (x === 0 && y === 0) yonlar.delete(kaynak);
  else yonlar.set(kaynak, { x, y });
  let tx = 0;
  let ty = 0;
  for (const v of yonlar.values()) {
    tx += v.x;
    ty += v.y;
  }
  kontrol.yon.x = kenetle(tx);
  kontrol.yon.y = kenetle(ty);
  if (x !== 0 || y !== 0) kontrol.hedef = null;
}

/** Bir kaynağın "kullan" basılı durumunu kaydeder; herhangi biri basılıysa kullan true. */
export function kullanAyarla(basili, kaynak = 'varsayilan') {
  if (basili) kullananlar.add(kaynak);
  else kullananlar.delete(kaynak);
  kontrol.kullan = kullananlar.size > 0;
}
