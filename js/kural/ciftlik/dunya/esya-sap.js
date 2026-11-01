/**
 * GEÇİCİ SAP (D · ciftlik-dunya): dünyanın ürettiği ama henüz esya.js'te olmayan türler
 * (yaş ot, toz, çuvaldız, altın iğne, çakıl taşı). Asıl tanımlar E · ciftlik-ayiklama'nın
 * esya.js tablosundadır (docs/ciftlik/esyalar.md §2 kodlarıyla). Bu dosya yalnız esya.js'te
 * OLMAYAN türü tanımlar; E birleşince hiçbir şey yapmaz ve SİLİNEBİLİR (içe aktaran:
 * dunya/arazi.js). Kodu doluysa (Faz 0'da 2 = iğne) geçici kod 500+ alır.
 */
import { esyaTanimi, esyaTanimla, SAMAN_TUTAM } from '../esya.js';

const GEREKEN = [
  ['yas-ot', 2, { ad: 'Yaş ot', renk: '#6f9a3c', agirlik: 12, saman: SAMAN_TUTAM }],
  ['toz', 4, { ad: 'Toz ve kırıntı', renk: '#cdbd9a', agirlik: 12, saman: SAMAN_TUTAM }],
  ['cuvaldiz', 11, { ad: 'Çuvaldız', renk: '#b0b8c0', agirlik: 2, gomulu: true }],
  ['altin-igne', 12, { ad: 'Altın iğne', renk: '#f1c232', agirlik: 1, gomulu: true }],
  ['tas', 14, { ad: 'Çakıl taşı', renk: '#8a8780', agirlik: 4, gomulu: true }],
];

let gecici = 500;
for (const [anahtar, kod, tanim] of GEREKEN) {
  if (esyaTanimi(anahtar)) continue;
  const bos = !esyaTanimi(kod);
  esyaTanimla(anahtar, { ...tanim, kod: bos ? kod : gecici++ });
}
