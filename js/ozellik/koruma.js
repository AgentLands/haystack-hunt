/**
 * Yeni tarla koruması: yerel olarak yeni bir tarla açan her giriş noktası (Yeni tarla,
 * Günün tarlası, zorluk seçici...) önce `yeniTarlaIzni()` sorar. Yarış sürüyorsa onay
 * istenir, onaylanırsa yarıştan çıkılır; reddedilirse tarla açılmaz. Yarış modülü
 * `korumaKaydet` ile durumunu bildirir; yarış yoksa izin her zaman verilir.
 */

let koruma = null;

/** Yarış modülü kaydeder: suruyor() yarış sürüyor mu, ayril() yarıştan çıkar. */
export function korumaKaydet({ suruyor, ayril }) {
  koruma = { suruyor, ayril };
}

/** Yarış sürüyorsa true dönmeden önce sorar; onaylanırsa yarıştan ayrılır. */
export function yeniTarlaIzni() {
  if (!koruma || !koruma.suruyor()) return true;
  if (!window.confirm('Yarış sürüyor. Yarıştan çıkıp yeni tarla açılsın mı?')) return false;
  koruma.ayril();
  return true;
}
