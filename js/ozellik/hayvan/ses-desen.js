/**
 * Hayvan ses desenleri (saf veri): ürkme anında çalınacak hışırtı ve cıvıltı dizileri.
 * Her öğe { tip: 'hisirti' | 'nota', ... } ses-motor.js işlevlerinin seçenekleridir;
 * varyasyon (0..1, hayvanın fazından) perdeyi hayvan başına hafifçe değiştirir. Fare
 * cıyaklamaz: hışırtı ve minik "cik"; serçede kanat pırpırı; kedide yumuşak esneme.
 */

const CIK = (f, g, v) => ({
  tip: 'nota', frekans: f * (0.94 + 0.12 * v), bitisFrekans: f * (1.25 + 0.1 * v), sure: 0.05,
  duzey: 0.06, gecikme: g, atak: 0.004,
});

/** Tür adına göre ses dizisi; bilinmeyen tür boş dizi. */
export function hayvanSesDeseni(tur, varyasyon = 0.5) {
  const v = Math.min(1, Math.max(0, varyasyon));
  if (tur === 'fare') {
    return [
      { tip: 'hisirti', sure: 0.2, duzey: 0.13, f0: 3000, f1: 2000, q: 0.9, atak: 0.02 },
      CIK(2800, 0.05, v), CIK(3200, 0.12, v),
    ];
  }
  if (tur === 'serce') {
    const parcalar = [];
    for (let i = 0; i < 7; i++) {
      parcalar.push({ tip: 'hisirti', sure: 0.05, duzey: 0.11 * (1 - i * 0.1), f0: 1500 + 150 * v,
        f1: 900, q: 0.8, atak: 0.008, gecikme: i * 0.045 });
    }
    return [...parcalar, CIK(2900, 0.02, v), CIK(3300, 0.1, v)];
  }
  if (tur === 'kurbaga') {
    return [
      { tip: 'nota', frekans: 380 + 60 * v, bitisFrekans: 720, sure: 0.08, duzey: 0.1,
        atak: 0.006 },
      { tip: 'hisirti', sure: 0.12, duzey: 0.07, f0: 2200, f1: 1500, q: 1, atak: 0.01 },
    ];
  }
  if (tur === 'kirpi') {
    return [
      { tip: 'hisirti', sure: 0.35, duzey: 0.1, f0: 1900, f1: 1100, q: 0.7, atak: 0.05 },
      { tip: 'hisirti', sure: 0.12, duzey: 0.06, f0: 3600, f1: 2600, q: 1.2, atak: 0.01,
        gecikme: 0.1 },
    ];
  }
  if (tur === 'kedi') { // esnerken "mi-yaa" gibi yumuşak, kısık bir inilti
    return [
      { tip: 'nota', frekans: 480 + 40 * v, bitisFrekans: 820, sure: 0.22, duzey: 0.07,
        dalga: 'triangle', atak: 0.05 },
      { tip: 'nota', frekans: 820, bitisFrekans: 540, sure: 0.34, duzey: 0.06,
        dalga: 'triangle', atak: 0.03, gecikme: 0.2 },
      { tip: 'hisirti', sure: 0.5, duzey: 0.04, f0: 1200, f1: 700, q: 0.6, atak: 0.1 },
    ];
  }
  return [];
}
