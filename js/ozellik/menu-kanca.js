/**
 * Menü kartının genişleme kancaları (menu.js'i büyütmeden): ana düğme satırına mod girişi
 * (ör. Çiftlik), Esc'i önce kullanan kipler (çiftlik inşası) ve "süren oyun" satırının mod
 * metni. menu.js bunları okur; özellik modülleri yalnız buraya kaydolur.
 */
export const anaEkler = [];
export const escOnleyiciler = [];
export const modSatirlari = [];

/** Ana düğme satırına (Günün tarlası, Yeni tarla) öğe ekler. */
export function menuAnaEkle(...ogeler) {
  anaEkler.push(...ogeler);
  document.querySelector('.menu-ana')?.append(...ogeler);
}

/** islev() true dönerse Esc menüyü açmaz (o kip Esc'i tüketti). */
export function escOnleyiciEkle(islev) {
  escOnleyiciler.push(islev);
}

/** islev(durum) → { metin, don } ya da null: menüdeki "süren oyun" satırı (ör. çiftlik). */
export function menuModSatiriEkle(islev) {
  modSatirlari.push(islev);
}
