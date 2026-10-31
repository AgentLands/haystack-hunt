/**
 * Sade hareket bayrağı: işletim sistemi/tarayıcı "hareketi azalt" (prefers-reduced-motion)
 * isterse true. Tuval içi efektler (yanıp sönme, parıltı, nabız, dönen yıldız, parçacık
 * sayısı) buna bakıp yoğunluğu azaltır; oyun bilgisi (iğne/çivi ipucu) kaybolmaz, yalnız
 * yumuşar. Ayar sayfa açıkken değişirse anında izlenir.
 */
const sorgu = matchMedia('(prefers-reduced-motion: reduce)');
let acik = sorgu.matches;
sorgu.addEventListener('change', (e) => {
  acik = e.matches;
});

/** Sade hareket açık mı? */
export function sadeHareket() {
  return acik;
}

/** Yanıp sönen/nabız atan bir değeri (0..1) sade harekette sabit orta değere çeker. */
export function nabizSade(deger, sabit = 0.5) {
  return acik ? sabit : deger;
}
