/**
 * Görsel katman: 'ust' katmanda her karede durum.balyalar (varsa), durum.makineler (varsa),
 * sonra durum.karakter (varsa) çizer. Veri yoksa hiçbir şey çizmez. Bir makineye (sırt
 * üfleyicisi dışında) binmiş karakter ayrıca çizilmez; makine çizimi koltukta gösterir.
 */
import { katmanEkle } from '../../cizim.js';
import { karakterCiz } from './karakter-cizim.js';
import { makineCiz } from './makine-cizim.js';
import { balyaCiz } from './balya-cizim.js';

katmanEkle((ctx, durum, zaman) => {
  if (durum.balyalar) for (const b of durum.balyalar) balyaCiz(ctx, b, zaman);
  if (durum.makineler) for (const m of durum.makineler) makineCiz(ctx, m, zaman);
  const { karakter } = durum;
  if (!karakter) return;
  const binmis = karakter.makine && karakter.makine.tur !== 'ufleyici';
  if (!binmis) karakterCiz(ctx, karakter, zaman, durum.arac);
}, 'ust');
