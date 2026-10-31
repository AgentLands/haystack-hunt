/**
 * Kulak ses deseni (saf): kulak basamağı (kural/sinyal.js, 0..3) → metal tınının sıklığı,
 * perdesi ve düzeyi. Yaklaştıkça tıklar sıklaşır ve incelir; 0 sessizdir. Ses kapalıyken
 * her tıkta görsel karşılığın (metal pırıltı) çıkma olasılığı da buradan (pirilti).
 * DOM ve WebAudio yok.
 */

const DESENLER = [
  null,
  { aralikMs: 720, frekans: 1180, duzey: 0.07, pirilti: 0.4 },
  { aralikMs: 400, frekans: 1580, duzey: 0.1, pirilti: 0.55 },
  { aralikMs: 190, frekans: 2100, duzey: 0.13, pirilti: 0.7 },
];

/** Basamağın deseni ya da (0 ve geçersiz basamak için) null. */
export function kulakDeseni(basamak) {
  return DESENLER[basamak] || null;
}

/**
 * Tık zamanı geldi mi: son tıktan bu yana desenin aralığı geçtiyse true. Basamak
 * yükselince beklemeden çalınsın diye öncekinden yüksek basamak hemen geçer.
 */
export function tikZamani(basamak, oncekiBasamak, simdi, sonTik) {
  const desen = kulakDeseni(basamak);
  if (!desen) return false;
  if (basamak > oncekiBasamak) return true;
  return simdi - sonTik >= desen.aralikMs;
}
