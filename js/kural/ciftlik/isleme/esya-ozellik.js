/**
 * İşleme ve depo parçalarının eşya okuması (docs/ciftlik/esyalar.md §1-2; tek kaynak esya.js):
 * `ozellik(kod)` türün kaydı (sinif, sert, nem, deger, manyetik, hafiflik...); bilinmeyen
 * kod için çöp sayılan varsayılan. `degerliMi(kod)`: iğne ya da buluntu sınıfı (bu eşyalar
 * hiçbir yolla yok olmaz: bir sink'te "bulundu" olur ya da oyuncuya döner).
 */
import { esyaTanimi } from '../esya.js';

const BILINMEYEN = Object.freeze({ anahtar: null, ad: '?', sinif: 'cop', sert: false, nem: 0,
  deger: 0, manyetik: false, hafiflik: 0, boyut: 'iri', uzunluk: 'kisa', yogunluk: 0,
  saman: 0 });

/** Türün kaydı (esya.js); bilinmeyen kod için çöp varsayılanı. */
export const ozellik = (kod) => esyaTanimi(kod) ?? BILINMEYEN;

/** İğne ya da buluntu mu? */
export function degerliMi(kod) {
  const s = ozellik(kod).sinif;
  return s === 'igne' || s === 'buluntu';
}

/** Görünen ad (bilinmeyen: #kod). */
export const esyaAdi = (kod) => esyaTanimi(kod)?.ad ?? `#${kod}`;
