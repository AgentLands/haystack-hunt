/**
 * Arayüz ikonları: ikon/arayuz.svg içindeki elle çizilmiş <symbol>'lere <use> ile başvuran
 * küçük SVG düğümü üretir. İkon süs sayılır (aria-hidden); düğmenin adı aria-label/title'da.
 * Adlar: el, tirmik, dedektor, miknatis, ses-acik, ses-kapali, defter, soru, bayrak, menu,
 * buyutec-arti, buyutec-eksi, cerceve, igne, civi, balya, traktor, ufleyici, balya-makinesi,
 * kurdele, gunes, tik, kutu, kopyala, damla, kapat.
 */
const NS = 'http://www.w3.org/2000/svg';
const SPRITE = new URL('../../ikon/arayuz.svg', import.meta.url).href;

/** ad ikonunu gösteren <svg>; boy piksel (varsayılan 22; CSS ile de değiştirilebilir). */
export function ikon(ad, { boy = 22 } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `ikon ikon-${ad}`);
  svg.setAttribute('width', String(boy));
  svg.setAttribute('height', String(boy));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const kullan = document.createElementNS(NS, 'use');
  kullan.setAttribute('href', `${SPRITE}#${ad}`);
  svg.append(kullan);
  return svg;
}

/** Var olan ikon düğümünü başka bir ikona çevirir (ör. ses-acik ↔ ses-kapali). */
export function ikonDegistir(svg, ad) {
  svg.setAttribute('class', `ikon ikon-${ad}`);
  svg.firstElementChild.setAttribute('href', `${SPRITE}#${ad}`);
}

/**
 * İkonlu düğmenin yazısını ikonu silmeden değiştirir: ilk boş olmayan metin düğümünü
 * (doğrudan ya da bir <span> içinde) günceller; yoksa sona ekler.
 */
export function metinDegistir(dugme, metin) {
  const gezgin = document.createTreeWalker(dugme, NodeFilter.SHOW_TEXT);
  for (let d = gezgin.nextNode(); d; d = gezgin.nextNode()) {
    if (d.textContent.trim()) {
      d.textContent = metin;
      return;
    }
  }
  dugme.append(metin);
}
