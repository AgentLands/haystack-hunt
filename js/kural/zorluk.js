/**
 * Zorluk düzeyleri (Kolay / Normal / Zor): tarla üretimi, araç hakları, parıltı ve puan
 * çarpanı. Zorluk tohumun parçasıdır: aynı etiket + aynı zorluk = aynı tarla.
 * Normal, zorluk eklenmeden önceki tarlayı birebir üretir (günün tarlası değişmez).
 */
import { metindenTohum } from './rastgele.js';

/**
 * yigin: sayı = taban + floor(zar * ek); yarıçap = r[0] + zar * r[1]; tepe = t[0] + zar * t[1].
 * igne: z = yükseklik * (alt + zar * aralik); küçük z = daha derine gömülü.
 * yakit: garajdaki makinelerin başlangıç yakıtı (0..1 depo).
 * telafiSiniri: dedektör telafisinde "yön gösteren" en geniş bant (hücre; kural/dedektor.js).
 *   Kolay/Normal 50 (Ilık: hepsi Soğuk ise telafi), Zor 25 (Sıcak: hepsi Soğuk/Ilık ise).
 */
export const ZORLUKLAR = {
  kolay: {
    ad: 'Kolay', carpan: 1, dedektor: 5, miknatis: 2, civi: 2, yakit: 1, telafiSiniri: 50,
    pariltiAralik: 8000, pariltiDerinlik: 30,
    yigin: { taban: 5, ek: 3, r: [12, 16], t: [45, 45] },
    igne: { alt: 0.35, aralik: 0.4 },
  },
  normal: {
    ad: 'Normal', carpan: 2, dedektor: 4, miknatis: 1, civi: 4, yakit: 0.9, telafiSiniri: 50,
    pariltiAralik: 12000, pariltiDerinlik: 20,
    yigin: { taban: 6, ek: 4, r: [14, 20], t: [50, 60] },
    igne: { alt: 0.05, aralik: 0.45 },
  },
  zor: {
    ad: 'Zor', carpan: 3, dedektor: 3, miknatis: 1, civi: 7, yakit: 0.7, telafiSiniri: 25,
    pariltiAralik: 16000, pariltiDerinlik: 14,
    yigin: { taban: 8, ek: 4, r: [16, 22], t: [60, 70] },
    igne: { alt: 0.02, aralik: 0.28 },
  },
};

export const VARSAYILAN_ZORLUK = 'normal';

/** Geçerli bir zorluk anahtarı döndürür; bilinmeyen değer Normal sayılır. */
export function zorlukAdi(ad) {
  return Object.hasOwn(ZORLUKLAR, ad) ? ad : VARSAYILAN_ZORLUK;
}

export function zorlukAl(ad) {
  return ZORLUKLAR[zorlukAdi(ad)];
}

/** Etiket ve zorluktan tarla tohumu. Normal'de yalnız etiket (eski tohumlarla uyumlu). */
export function zorlukTohumu(etiket, zorluk = VARSAYILAN_ZORLUK) {
  const ad = zorlukAdi(zorluk);
  return metindenTohum(ad === VARSAYILAN_ZORLUK ? etiket : `${etiket}|${ad}`);
}

export const PUAN_TABAN = 1000;
export const PUAN_TABAN_ALT = 100;
/** Kullanılan her dedektör ya da mıknatıs hakkının puan bedeli. */
export const HAK_BEDELI = 100;

/**
 * Puan = çarpan × en az 100 olmak üzere
 *   1000 − 2 × saniye − kaldırılan saman / 100 − HAK_BEDELI × kullanılan hak
 *   (dedektör + mıknatıs).
 * Süreye paslı çivi cezaları dahildir.
 */
export function puanHesapla({ sureMs, kaldirilan, kullanilanHak }, zorluk) {
  const ham = PUAN_TABAN - 2 * Math.floor(sureMs / 1000)
    - Math.floor(kaldirilan / 100) - HAK_BEDELI * kullanilanHak;
  return zorlukAl(zorluk).carpan * Math.max(PUAN_TABAN_ALT, ham);
}
