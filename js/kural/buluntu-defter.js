/**
 * Buluntu defterinin saf kuralları: hangi türden kaç kez bulunduğu, yeni sayfa mı, özet.
 * DOM yok; depo (getItem/setItem) dışarıdan verilir, sahte depoyla test edilir.
 */
import { KATALOG, turBilgisi } from './buluntu.js';

export const DEFTER_ANAHTAR = 'haystack-hunt:buluntu-defter';

export function bosDefter() {
  return { surum: 1, bulunan: Object.create(null) }; // tür → kaç kez bulundu
}

/** Depodan gelen (bozuk olabilecek) veriyi temizler: yalnız katalogdaki türler ve adetler. */
export function defterTemizle(ham) {
  const defter = bosDefter();
  if (!ham || typeof ham !== 'object' || !ham.bulunan || typeof ham.bulunan !== 'object') {
    return defter;
  }
  for (const [tur, adet] of Object.entries(ham.bulunan)) {
    if (turBilgisi(tur) && Number.isInteger(adet) && adet > 0) defter.bulunan[tur] = adet;
  }
  return defter;
}

/** Depodan okur; yoksa ya da bozuksa boş defter döner (bozuk veri konsola yazılır). */
export function defterYukle(depo) {
  try {
    const metin = depo.getItem(DEFTER_ANAHTAR);
    return metin === null ? bosDefter() : defterTemizle(JSON.parse(metin));
  } catch (hata) {
    console.error('Buluntu defteri okunamadı, boş başlanıyor:', hata);
    return bosDefter();
  }
}

export function defterKaydet(depo, defter) {
  try {
    depo.setItem(DEFTER_ANAHTAR, JSON.stringify(defter));
  } catch (hata) {
    console.error('Buluntu defteri yazılamadı:', hata);
  }
}

/** Türü bir kez daha deftere yazar: { defter (yeni), yeni (ilk kez mi) }. */
export function buluntuEkle(defter, tur) {
  const yeni = !defter.bulunan[tur];
  const bulunan = Object.assign(Object.create(null), defter.bulunan);
  bulunan[tur] = (bulunan[tur] || 0) + 1;
  return { defter: { ...defter, bulunan }, yeni };
}

/** Defter özeti: bulunan tür sayısı, katalog boyu ve toplam bulma adedi. */
export function defterOzeti(defter) {
  const turler = Object.keys(defter.bulunan).filter((t) => turBilgisi(t));
  return {
    bulunanTur: turler.length,
    toplamTur: KATALOG.length,
    toplamAdet: turler.reduce((t, k) => t + defter.bulunan[k], 0),
  };
}
