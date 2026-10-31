/**
 * Görünüm durumu: kameranın tek ortak kaydı. cizim.js dönüşümü buradan uygular,
 * girdi.js ekran→hücre çevirisinde okur, ozellik/kamera.js günceller.
 */
import { varsayilan, sinirla } from './kural/gorunum.js';

export const gorunum = varsayilan();

/** Görünümü (sınırlara kenetleyerek) değiştirir. */
export function gorunumAyarla(g) {
  Object.assign(gorunum, sinirla(g));
}
