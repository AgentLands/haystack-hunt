/**
 * Tuvalin sol üst köşesindeki kâğıt etiket yığını (#tarla-kap içinde): meydan okuma
 * hedefi, temizlik yüzdesi ve akış çubuğu gibi küçük HUD parçaları buraya konur.
 * Sıra CSS `order` ile verilir (meydan.css); kutu fareyi geçirir (tuvale dokunmayı engellemez).
 */
import { stilYukle } from './pencere.js';

stilYukle('./meydan.css');

let yigin = null;

/** Yığın kutusunu döndürür (ilk çağrıda kurar). */
export function etiketYigini() {
  if (!yigin) {
    yigin = document.createElement('div');
    yigin.className = 'meydan-yigin';
    document.getElementById('tarla-kap').append(yigin);
  }
  return yigin;
}

/** Yığına küçük kâğıt etiket ekler; ek sınıf sirasi CSS'te (hedef, temiz...). */
export function etiketEkle(sinif) {
  const etiket = document.createElement('div');
  etiket.className = `meydan-etiket ${sinif}`;
  etiketYigini().append(etiket);
  return etiket;
}
