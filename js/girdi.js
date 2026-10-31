/**
 * Girdi: fare/dokunma işaretçisini hücre koordinatına çevirir, klavye kısayollarını
 * araç seçimine bağlar ve oyun.js eylemlerini çağırır.
 */
import { ekrandanHucre } from './kural/gorunum.js';
import { gorunum } from './gorunum.js';
import { bas, surukle, birak, imlecCikti, aracSec } from './oyun.js';

export const KISAYOLLAR = { 1: 'el', 2: 'tirmik', 3: 'dedektor', 4: 'miknatis' };

const onleyiciler = [];

/**
 * İşaretçi olaylarını oyun araçlarından önce görmek için (kamera kaydırma, sıkıştırma...).
 * islev(tur, e): tur 'bas' | 'tasi' | 'bitir'; true dönerse olay tüketilir, araç çalışmaz.
 */
export function girdiOnleyiciEkle(islev) {
  onleyiciler.push(islev);
}

function tuketildi(tur, e) {
  let sonuc = false;
  for (const islev of onleyiciler) if (islev(tur, e)) sonuc = true;
  return sonuc;
}

/** Ekran noktasını (geçerli yakınlaştırma/kaydırmayı gözeterek) tarla hücresine çevirir. */
export function hucreBul(tuval, e) {
  const k = tuval.getBoundingClientRect();
  return ekrandanHucre(gorunum, (e.clientX - k.left) / k.width, (e.clientY - k.top) / k.height);
}

export function girdiKur(tuval) {
  tuval.addEventListener('pointerdown', (e) => {
    if (tuketildi('bas', e)) return;
    tuval.setPointerCapture(e.pointerId);
    bas(hucreBul(tuval, e), performance.now());
  });
  tuval.addEventListener('pointermove', (e) => {
    if (!tuketildi('tasi', e)) surukle(hucreBul(tuval, e));
  });
  for (const olay of ['pointerup', 'pointercancel']) {
    tuval.addEventListener(olay, (e) => {
      if (!tuketildi('bitir', e)) birak();
    });
  }
  tuval.addEventListener('pointerleave', imlecCikti);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const arac = KISAYOLLAR[e.key];
    if (arac) aracSec(arac);
  });
}
