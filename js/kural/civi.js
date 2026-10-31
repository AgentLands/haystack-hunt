/**
 * Paslı çiviler (yem): tarlaya iğne gibi gömülür, yüzeye yakınken onlar da parlar.
 * Elle alınan çivi süre cezası getirir; dedektör ve mıknatıs çivileri görmez.
 * Kendi üreteçlerini kullanır ki tarlanın ve iğnenin üretimi değişmesin.
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';
import { uretec } from './rastgele.js';
import { nesneDerinligi } from './igne.js';
import { EL_YARICAP } from './araclar.js';

export const CIVI_CEZA_MS = 25000;
/** Çivi iğneye bundan yakın konmaz (iğneyi kazan, yanlışlıkla çivi almasın). */
export const CIVI_IGNE_ARALIK = 15;
const CIVI_TOHUM_KARISTIR = 0x9e3779b9;

/** Tohumdan `sayi` çivi saklar: yüksek hücrelere, iğneden ve birbirinden uzak. */
export function civileriSakla(tarla, sayi) {
  const zar = uretec((tarla.tohum ^ CIVI_TOHUM_KARISTIR) >>> 0);
  const civiler = [];
  const kenar = 10;
  const uzak = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) >= d;
  for (let deneme = 0; deneme < 4000 && civiler.length < sayi; deneme++) {
    const x = kenar + Math.floor(zar() * (GENISLIK - 2 * kenar));
    const y = kenar + Math.floor(zar() * (YUKSEKLIK - 2 * kenar));
    const yuk = tarla.h[y * GENISLIK + x];
    const aday = { x, y, z: Math.floor(yuk * (0.1 + 0.5 * zar())), aci: zar() * Math.PI };
    if (yuk < 25 || !uzak(aday, tarla.igne, CIVI_IGNE_ARALIK)) continue;
    if (civiler.some((c) => !uzak(aday, c, 8))) continue;
    civiler.push({ ...aday, alindi: false });
  }
  return civiler;
}

export function civiDerinligi(tarla, civi) {
  return nesneDerinligi(tarla, civi);
}

/** El (cx, cy) üstündeyken alınabilecek (açıkta, alınmamış) ilk çivi; yoksa null. */
export function alinabilirCivi(tarla, cx, cy) {
  for (const civi of tarla.civiler) {
    if (civi.alindi) continue;
    const yakin = Math.hypot(cx - civi.x, cy - civi.y) <= EL_YARICAP + 1.5;
    if (yakin && civiDerinligi(tarla, civi) === 0) return civi;
  }
  return null;
}

/**
 * Çiviyi alır (bir daha alınmaz); süre cezasını (ms) döndürür. Rahat modda ceza 0'dır
 * (çivi yine alınır ve bir daha parlamaz; yalnız süreye bir şey eklenmez).
 */
export function civiAl(civi, rahat = false) {
  civi.alindi = true;
  return rahat ? 0 : CIVI_CEZA_MS;
}

/** Parlayacak kadar yüzeye yakın (derinlik ≤ esik), alınmamış çiviler. */
export function parlayanCiviler(tarla, esik) {
  return tarla.civiler.filter((c) => !c.alindi && civiDerinligi(tarla, c) <= esik);
}
