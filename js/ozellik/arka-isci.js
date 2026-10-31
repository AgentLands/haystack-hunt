/**
 * Arka plan işçisi (Web Worker, modül): ana iş parçacığını kilitleyen saf hesapları yapar.
 * 'tarla': tarlaKur'un yerleşmiş yüksekliği (ön hazırlık; kural/tarla.js yerlesmisKur),
 * 'doku': yakın görünüm dokuları (cizim/doku.js). Sonuçlar aktarılarak (kopyasız) döner.
 * Yöneticisi ozellik/on-hazirlik.js.
 */
import { yerlesmisKur } from '../kural/tarla.js';
import { samanDokusu, toprakDokusu } from '../cizim/doku.js';

self.addEventListener('message', ({ data }) => {
  if (data.tur === 'tarla') {
    const { h, adim } = yerlesmisKur(data.tohum, data.zorluk);
    self.postMessage({ ...data, h, adim }, [h.buffer]);
  } else if (data.tur === 'doku') {
    const saman = samanDokusu(data.T, data.S, data.tohumSaman);
    const toprak = toprakDokusu(data.T, data.S, data.tohumToprak);
    self.postMessage({ ...data, saman, toprak },
      [saman.ton.buffer, saman.ust.buffer, saman.golge.buffer, toprak.buffer]);
  }
});
