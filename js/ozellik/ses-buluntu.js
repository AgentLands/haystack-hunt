/**
 * Buluntu sesleri: açığa çıkınca çok kısık bir "tink", alınca nadirliğe göre uzayan tatlı
 * zil dizisi (yaygın: iki nota; çok nadir: beş notalık parıltı). Sentez ses-motor.js'te.
 */
import { dinle } from '../olaylar.js';
import { turBilgisi, NADIRLIK } from '../kural/buluntu.js';
import { hazirMi, nota } from './ses-motor.js';

/** Nadirlik sırasına göre zil notaları (Hz); her nota 70 ms arayla gelir. */
export const ZIL_NOTALARI = [
  [1568, 2093],
  [1319, 1760, 2349],
  [1175, 1568, 1976, 2637],
  [1047, 1319, 1568, 2093, 2637],
];
const NOTA_ARALIK = 0.07;

/** Türün zil notaları; bilinmeyen tür için en yalın dizi. */
export function zilNotalari(tur) {
  const bilgi = turBilgisi(tur);
  return ZIL_NOTALARI[bilgi ? NADIRLIK[bilgi.nadirlik].sira : 0];
}

function zilSesi(tur) {
  if (!hazirMi()) return;
  zilNotalari(tur).forEach((frekans, i) => {
    const gecikme = i * NOTA_ARALIK;
    nota({ frekans, sure: 0.32, duzey: 0.2, dalga: 'triangle', gecikme, atak: 0.003 });
    nota({ frekans: frekans * 2.76, sure: 0.14, duzey: 0.05, gecikme, atak: 0.002 });
  });
}

function tinkSesi() {
  if (!hazirMi()) return;
  nota({ frekans: 2600, bitisFrekans: 2000, sure: 0.06, duzey: 0.05, atak: 0.002 });
}

dinle('buluntu-gorundu', tinkSesi);
dinle('buluntu-alindi', ({ tur }) => zilSesi(tur));
