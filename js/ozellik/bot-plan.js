/**
 * Bot: elle kazı planı. Çukur maliyeti yaklaşık derinliğin küpüyle artar (kazılan çukura
 * yamaçtan saman kayar: eğim 3 → hacim ≈ 0,116·d³, el kare başına ≈ 21 saman alır), bu
 * yüzden olası hücreler yüzeye yakın ucuz katmanlardan başlayarak aşama aşama kazılır.
 * İğne yerden z = (0,05–0,5)·yükseklik yüksekte durur; her hücrenin kendi aşaması vardır.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';

/** Aşamalar: hücrenin ilk yüksekliğinin bu katına inmek (0 = tamamen). */
export const ASAMALAR = [0.46, 0.4, 0.34, 0.28, 0.22, 0.16, 0.1, 0.05, 0];
export const KAPSAMA = 2;
export const BITIS_YARICAP = 1.5;
export const KAZI_KARE_BASINA = 21;

const KAPSAMA_UCLARI = [];
for (let dy = -KAPSAMA; dy <= KAPSAMA; dy++) {
  for (let dx = -KAPSAMA; dx <= KAPSAMA; dx++) {
    if (dx * dx + dy * dy <= KAPSAMA * KAPSAMA) KAPSAMA_UCLARI.push([dx, dy]);
  }
}

/** Hücrenin sıradaki aşama hedef yüksekliği; bittiyse -1. */
export function hedefYukseklik(h0, asama, i) {
  return asama[i] >= ASAMALAR.length ? -1 : Math.floor(ASAMALAR[asama[i]] * h0[i]);
}

/** Hedefe inmiş hücrelerin aşamasını ilerletir (kalıcı: sonradan dolsa da geri gitmez). */
export function asamaIlerlet(h, h0, asama, i) {
  while (asama[i] < ASAMALAR.length && h[i] <= hedefYukseklik(h0, asama, i)) asama[i]++;
}

/** En iyi kazı noktası ({x, y} ya da null): kapsanan aday sayısı / (yürüyüş + kazı kareleri). */
export function enIyiKazi(liste, h, h0, asama, konum, hiz) {
  const toplam = new Map();
  for (const c of liste) {
    if (asama[c] >= ASAMALAR.length) continue;
    const derinlik = Math.max(0, h[c] - hedefYukseklik(h0, asama, c));
    const cx = c % GENISLIK;
    const cy = (c - cx) / GENISLIK;
    for (const [dx, dy] of KAPSAMA_UCLARI) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= GENISLIK || y >= YUKSEKLIK) continue;
      const i = y * GENISLIK + x;
      const k = toplam.get(i);
      if (k) {
        k.say++;
        k.derinlik += derinlik;
      } else {
        toplam.set(i, { say: 1, derinlik });
      }
    }
  }
  let eniyi = null;
  for (const [i, k] of toplam) {
    const x = i % GENISLIK;
    const y = (i - x) / GENISLIK;
    const ort = k.derinlik / k.say;
    const maliyet = Math.hypot(x - konum.x, y - konum.y) / hiz + 6
      + (ort ** 3) / (KAZI_KARE_BASINA * 8.6);
    const puan = k.say / maliyet;
    if (!eniyi || puan > eniyi.puan) eniyi = { x, y, puan };
  }
  return eniyi && { x: eniyi.x, y: eniyi.y };
}

