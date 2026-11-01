/**
 * Oyun duraklatması (tek yer): duraklatma nedenleri kümesi (ör. 'menu', 'gizli' sekme).
 * İlk neden eklenince saat durur, son neden kalkınca aradaki süre oyun süresinden bir kez
 * düşülür (oyun.js zamaniKaydir). Nedenler üst üste binse de süre iki kez kaydırılmaz.
 * Duraklatılmışken ana döngü oyun adımını atlar (ana.js duraklatildiMi); yalnız çizer.
 */
import { zamaniKaydir } from '../oyun.js';

const nedenler = new Set();
let duranZaman = null;

/** Bir duraklatma nedeni ekler (zaten varsa bir şey olmaz). */
export function duraklat(neden) {
  if (nedenler.size === 0) duranZaman = performance.now();
  nedenler.add(neden);
}

/** Nedeni kaldırır; başka neden kalmadıysa duran süre oyun saatinden düşülür. */
export function surdur(neden) {
  if (!nedenler.delete(neden) || nedenler.size > 0) return;
  const gecen = performance.now() - duranZaman;
  duranZaman = null;
  zamaniKaydir(gecen);
}

export function duraklatildiMi() {
  return nedenler.size > 0;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) duraklat('gizli');
  else surdur('gizli');
});
