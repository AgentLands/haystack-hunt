/**
 * Parçacık üretim yardımcıları: saman çöpü ve toz ekleme, rastgele seçim ve
 * prefers-reduced-motion'a göre azaltma. efekt.js ve hareket efektleri paylaşır.
 * Koordinatlar tuval pikseli (hücre * OLCEK).
 */
import { parcacikEkle, COP, TOZ } from './parcacik.js';

export const SAMAN = ['#fff0b8', '#f6db86', '#ffe9a0', '#e9c463', '#fdf5d6'];
export const TOZ_RENK = '168, 134, 92';
export const sade = matchMedia('(prefers-reduced-motion: reduce)');

/** Sade harekette adedi çeyreğe indirir (en az 1). */
export const az = (n) => (sade.matches ? Math.ceil(n * 0.25) : n);
export const rasgele = (a, b) => a + Math.random() * (b - a);
export const secim = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];

export function copEkle(x, y, aci, hiz, vz, omur) {
  parcacikEkle({
    tur: COP, x, y, z: rasgele(0, 3), vx: Math.cos(aci) * hiz, vy: Math.sin(aci) * hiz,
    vz, omur, boy: rasgele(3, 7), renk: secim(SAMAN),
  });
}

export function tozEkle(x, y, vx, vy, boy = rasgele(6, 12)) {
  parcacikEkle({ tur: TOZ, x, y, vx, vy, vz: rasgele(4, 14), omur: rasgele(0.5, 0.9), boy,
    renk: TOZ_RENK });
}
