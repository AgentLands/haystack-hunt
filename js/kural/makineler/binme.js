/**
 * Binme ve inme (saf): karakter makinenin gövde dairesine BINME_MESAFE hücreden yakınsa
 * biner; inerken makinenin yanında (önce sol, sağ, arka...) boş ve tarla içi bir yere iner.
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';
import { KARAKTER_YARICAP } from '../karakter.js';
import { makineTanimi } from './kayit.js';

/** Karakterin makine gövdesinin kenarına uzaklığı en çok bu kadar olabilir (hücre). */
export const BINME_MESAFE = 2.5;

/** Gövde kenarına uzaklık (merkez uzaklığı − çarpışma yarıçapı, en az 0). */
export function makineyeUzaklik(k, m) {
  return Math.max(0, Math.hypot(k.x - m.x, k.y - m.y) - makineTanimi(m.tur).yaricap);
}

/** Binilebilecek en yakın makine (sürücüsü olmayan) ya da null. */
export function binilebilir(k, makineler) {
  let enIyi = null;
  let enAz = BINME_MESAFE;
  for (const m of makineler) {
    if (m.surucu) continue;
    const d = makineyeUzaklik(k, m);
    if (d <= enAz) {
      enAz = d;
      enIyi = m;
    }
  }
  return enIyi;
}

/**
 * İnilecek nokta (dünya birimi): makinenin solu, sağı, arkası, önü ve çaprazları sırayla
 * denenir; tarla içinde ve hiçbir engele ({x, y, r}) değmeyen ilki. Hiçbiri olmazsa
 * makinenin merkezi (çarpışma kuralı karakterin uzaklaşmasına izin verir).
 */
export function inmeYeri(m, engeller = []) {
  const r = makineTanimi(m.tur).yaricap + KARAKTER_YARICAP + 0.3;
  const acilar = [-1, 1, 2, 0, -0.5, 0.5, -1.5, 1.5].map((k) => m.yon + (k * Math.PI) / 2);
  for (const a of acilar) {
    const x = m.x + Math.cos(a) * r;
    const y = m.y + Math.sin(a) * r;
    const ici = x >= 1 && y >= 1 && x <= GENISLIK - 1 && y <= YUKSEKLIK - 1;
    if (ici && engeller.every((e) => Math.hypot(x - e.x, y - e.y) >= e.r + KARAKTER_YARICAP)) {
      return { x, y };
    }
  }
  return { x: m.x, y: m.y };
}
