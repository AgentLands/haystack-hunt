/**
 * Hayvan sesleri: 'hayvan-kacti' olayında ses-desen.js'teki deseni mevcut WebAudio ses
 * motoruyla (ses-motor.js) çalar. Sessiz düğmesine ve henüz açılmamış ses bağlamına uyar;
 * üst üste binmesin diye çalmalar arasında kısa bekleme vardır.
 */
import { dinle } from '../../olaylar.js';
import { hazirMi, hisirti, nota } from '../ses-motor.js';
import { hizSinirlayici } from '../ses-desen.js';
import { hayvanSesDeseni } from './ses-desen.js';

const ARALIK_MS = 90;
const izin = hizSinirlayici(ARALIK_MS);

/** Hayvan sesini çalar; tur ve (0..1) varyasyon. */
export function hayvanSesiCal(tur, varyasyon) {
  if (!hazirMi()) return;
  for (const { tip, ...o } of hayvanSesDeseni(tur, varyasyon)) {
    if (tip === 'hisirti') hisirti(o);
    else nota(o);
  }
}

dinle('hayvan-kacti', ({ tur, x, y }) => {
  if (!izin(performance.now())) return;
  hayvanSesiCal(tur, Math.abs(Math.sin(x * 12.9898 + y * 78.233)));
});
