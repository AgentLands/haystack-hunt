/**
 * Parçacık üretim yardımcıları: saman çöpü (ince uzun, dönen, altın/okra tonlarda), toz,
 * ayak teması pofu, rastgele seçim ve prefers-reduced-motion'a göre azaltma. efekt.js ve
 * hareket efektleri paylaşır. Koordinatlar tuval pikseli (hücre * OLCEK).
 */
import { parcacikEkle, COP, TOZ } from './parcacik.js';

/** Saman çöpü tonları: çoğu altın/okra, biri koyu sap, biri güneş vurgusu. */
export const SAMAN = ['#e9c560', '#f0d27a', '#d8b85a', '#c99a40', '#b8862e', '#e9c560',
  '#fff0c0'];
export const TOZ_RENK = '168, 134, 92';
export const sade = matchMedia('(prefers-reduced-motion: reduce)');

/** Sade harekette adedi çeyreğe indirir (en az 1). */
export const az = (n) => (sade.matches ? Math.ceil(n * 0.25) : n);
export const rasgele = (a, b) => a + Math.random() * (b - a);
export const secim = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];

export function copEkle(x, y, aci, hiz, vz, omur) {
  parcacikEkle({
    tur: COP, x, y, z: rasgele(0, 3), vx: Math.cos(aci) * hiz, vy: Math.sin(aci) * hiz,
    vz, omur, boy: rasgele(5, 10), renk: secim(SAMAN), donus: rasgele(-16, 16),
  });
}

export function tozEkle(x, y, vx, vy, boy = rasgele(6, 12)) {
  parcacikEkle({ tur: TOZ, x, y, vx, vy, vz: rasgele(4, 14), omur: rasgele(0.5, 0.9), boy,
    renk: TOZ_RENK });
}

/** Ayak teması pofu: yere basan ayağın çevresine yayılan, çabuk sönen küçük toz halkası. */
export function pofEkle(x, y, renkDegeri = TOZ_RENK) {
  const n = az(4);
  const bas = rasgele(0, Math.PI * 2);
  for (let k = 0; k < n; k++) {
    const aci = bas + (k / n) * Math.PI * 2;
    const hiz = rasgele(14, 24);
    parcacikEkle({ tur: TOZ, x, y, vx: Math.cos(aci) * hiz, vy: Math.sin(aci) * hiz * 0.8,
      vz: rasgele(2, 6), omur: rasgele(0.3, 0.45), boy: rasgele(3, 4.5), renk: renkDegeri });
  }
}
