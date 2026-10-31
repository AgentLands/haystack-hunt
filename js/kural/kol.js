/**
 * Sanal kolun saf matematiği (DOM yok): kol merkezine göre dokunma noktasını analog yöne
 * çevirir. Ölü bölge içi sıfırdır; ölü bölge dışı 0..1 aralığına yeniden ölçeklenir
 * (sıçrama olmaz), yarıçapta doygunluğa ulaşır. y aşağı pozitif (ekran yönü).
 */

/** Varsayılan ölü bölge: yarıçapın oranı. */
export const OLU_BOLGE = 0.15;

/**
 * Merkezden (dx, dy) kadar uzaktaki dokunuşun analog yönü ve başparmak konumu.
 * Dönen `yon` her eksen -1..1 ve bileşke uzunluğu ≤ 1; `parmak` kolun içindeki
 * başparmağın piksel kayması (yarıçapla sınırlı).
 */
export function kolYonu(dx, dy, yaricap, oluBolge = OLU_BOLGE) {
  const uzaklik = Math.hypot(dx, dy);
  if (!(yaricap > 0) || !Number.isFinite(uzaklik) || uzaklik === 0) {
    return { yon: { x: 0, y: 0 }, parmak: { x: 0, y: 0 }, guc: 0 };
  }
  const oran = Math.min(1, uzaklik / yaricap);
  const bx = dx / uzaklik;
  const by = dy / uzaklik;
  const parmak = { x: bx * oran * yaricap, y: by * oran * yaricap };
  if (oran < oluBolge) return { yon: { x: 0, y: 0 }, parmak, guc: 0 };
  const guc = Math.min(1, (oran - oluBolge) / (1 - oluBolge));
  return { yon: { x: bx * guc, y: by * guc }, parmak, guc };
}
