/**
 * İğne: tarlada nereye gizlendiği, hangi hücreleri kapladığı ve ne kadar gömülü olduğu.
 * İğnenin z değeri yerden yüksekliğidir; hücrede z kat ya da daha az saman kalınca görünür.
 */
import { GENISLIK, YUKSEKLIK, icinde } from './boyut.js';

const NORMAL_IGNE = { alt: 0.05, aralik: 0.45 };

/**
 * Yeterince yüksek bir hücreye iğne saklar; gömülme yüksekliği yığının
 * (alt + zar * aralik) kesridir (Normal: alt yarısına doğru).
 */
export function igneSakla(tarla, zar, { alt, aralik } = NORMAL_IGNE) {
  const kenar = 12;
  for (let deneme = 0; deneme < 5000; deneme++) {
    const x = kenar + Math.floor(zar() * (GENISLIK - 2 * kenar));
    const y = kenar + Math.floor(zar() * (YUKSEKLIK - 2 * kenar));
    const yuk = tarla.h[y * GENISLIK + x];
    if (yuk >= 40) {
      return { x, y, z: Math.floor(yuk * (alt + aralik * zar())), aci: zar() * Math.PI };
    }
  }
  let enIyi = 0;
  for (let i = 1; i < tarla.h.length; i++) if (tarla.h[i] > tarla.h[enIyi]) enIyi = i;
  return {
    x: enIyi % GENISLIK,
    y: Math.floor(enIyi / GENISLIK),
    z: Math.floor(tarla.h[enIyi] / 4),
    aci: zar() * Math.PI,
  };
}

/** İğnenin kapladığı hücreler: merkez ve açısı boyunca iki yanı. */
export function igneHucreleri(igne) {
  const dx = Math.cos(igne.aci);
  const dy = Math.sin(igne.aci);
  const kume = new Set();
  for (const k of [-1.5, 0, 1.5]) {
    const x = Math.round(igne.x + dx * k);
    const y = Math.round(igne.y + dy * k);
    if (icinde(x, y)) kume.add(y * GENISLIK + x);
  }
  return [...kume];
}

/**
 * Gömülü bir nesnenin ({x, y, z, aci}: iğne ya da çivi) üstündeki en ince saman katı.
 * Makine kepçesindeki nesne (kepcede) tarlada değildir: derinliği sonsuz sayılır.
 */
export function nesneDerinligi(tarla, nesne) {
  if (nesne.kepcede) return Infinity;
  let enAz = Infinity;
  for (const i of igneHucreleri(nesne)) {
    enAz = Math.min(enAz, Math.max(0, tarla.h[i] - nesne.z));
  }
  return enAz;
}

/** Üstündeki en ince saman katı; 0 ise iğnenin bir kısmı açıkta. */
export function igneDerinligi(tarla) {
  return nesneDerinligi(tarla, tarla.igne);
}

export function igneAcikMi(tarla) {
  return igneDerinligi(tarla) === 0;
}
