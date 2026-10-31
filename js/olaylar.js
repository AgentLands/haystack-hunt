/**
 * Olay yolu: çekirdek (oyun.js) olay yayar; özellik modülleri (js/ozellik/*) dinler.
 * Bir dinleyicinin hatası oyunu durdurmaz ama konsola yazılır (sessiz yutma yok).
 *
 * Olay kataloğu (ad → veri):
 *   oyun-basladi   { durum }                       yeni tarla kuruldu
 *   ilk-hamle      { zaman }                       süre başladı
 *   arac-secildi   { arac }                        'el' | 'tirmik' | 'dedektor'
 *   kazildi        { x, y, miktar }                el bu karede saman aldı (miktar > 0)
 *   tirmiklandi    { x, y, dx, dy, disari }        tırmık bir adım itti
 *   dedektor       { x, y, seviye, kalan }         dedektör okundu
 *   dedektor-bos   { x, y }                        hak kalmadan dedektör denendi
 *   parilti        { x, y }                        iğne güneşte parladı
 *   igne-gorundu   { x, y }                        iğne ilk kez açığa çıktı
 *   bulundu        { sonuc }                       iğne alındı (sonuc: oyun.js sonucOlustur)
 *   pes-edildi     { durum }                       oyuncu pes etti, iğne gösterildi
 *   kare           { zaman, durum }                her kare, çizimden hemen önce
 */
const dinleyiciler = new Map();

/** Dinleyici ekler; kaldırmak için dönen işlevi çağır. */
export function dinle(ad, islev) {
  if (!dinleyiciler.has(ad)) dinleyiciler.set(ad, new Set());
  dinleyiciler.get(ad).add(islev);
  return () => dinleyiciler.get(ad).delete(islev);
}

export function yay(ad, veri = {}) {
  const kume = dinleyiciler.get(ad);
  if (!kume) return;
  for (const islev of [...kume]) {
    try {
      islev(veri);
    } catch (hata) {
      console.error(`"${ad}" dinleyicisi hata verdi:`, hata);
    }
  }
}
