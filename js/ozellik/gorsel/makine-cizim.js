/**
 * Makine çizimi girişi: makinenin türüne göre traktör, balya makinesi ya da sırt
 * üfleyicisi çizimine yönlendirir. Sırt üfleyicisine binilmişse (surucu) makine ayrıca
 * çizilmez; karakter-cizim sırtında motor ve elinde boru olarak gösterir.
 */
import { traktorCiz } from './traktor-cizim.js';
import { balyaMakineCiz } from './balya-makine-cizim.js';
import { ufleyiciCiz } from './ufleyici-cizim.js';

/** makine: durum.makineler[i] (tur 'traktor' | 'balya' | 'ufleyici'); zaman ms. */
export function makineCiz(ctx, makine, zaman) {
  if (makine.tur === 'traktor') traktorCiz(ctx, makine, zaman);
  else if (makine.tur === 'balya') balyaMakineCiz(ctx, makine, zaman);
  else if (makine.tur === 'ufleyici' && !makine.surucu) ufleyiciCiz(ctx, makine, zaman);
}
