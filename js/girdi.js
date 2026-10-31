/**
 * Girdi: fare/dokunma işaretçisini hücre koordinatına çevirir, klavye kısayollarını
 * araç seçimine bağlar ve oyun.js eylemlerini çağırır.
 */
import { GENISLIK, YUKSEKLIK } from './kural/boyut.js';
import { bas, surukle, birak, imlecCikti, aracSec } from './oyun.js';

export const KISAYOLLAR = { 1: 'el', 2: 'tirmik', 3: 'dedektor' };

/** Ekran noktasını tarla hücresine çevirir. */
export function hucreBul(tuval, e) {
  const k = tuval.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - k.left) / k.width) * GENISLIK),
    y: Math.floor(((e.clientY - k.top) / k.height) * YUKSEKLIK),
  };
}

export function girdiKur(tuval) {
  tuval.addEventListener('pointerdown', (e) => {
    tuval.setPointerCapture(e.pointerId);
    bas(hucreBul(tuval, e), performance.now());
  });
  tuval.addEventListener('pointermove', (e) => surukle(hucreBul(tuval, e)));
  for (const olay of ['pointerup', 'pointercancel']) tuval.addEventListener(olay, birak);
  tuval.addEventListener('pointerleave', imlecCikti);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const arac = KISAYOLLAR[e.key];
    if (arac) aracSec(arac);
  });
}
