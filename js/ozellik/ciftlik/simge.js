/**
 * Çiftlik HUD'unun satır içi SVG simgeleri (kuruş, rüzgâr oku, gök, uyarı, pano, kum saati,
 * kilit, grafik, kapı, hedef). Ortak ikon sprite'ına (ikon/arayuz.svg) dokunmamak için burada
 * elle çizilir; çizgi dili sprite ile aynıdır (2 px, yuvarlak uç, currentColor).
 */
const NS = 'http://www.w3.org/2000/svg';

/** Her simge: 24×24 kutuda çizgi yolları (path d), isteğe bağlı dolu daireler [cx, cy, r]. */
const YOLLAR = {
  kurus: { y: ['M12 3.5a8.5 8.5 0 1 0 .01 0z', 'M12 7.8a4.2 4.2 0 1 0 .01 0z', 'M12 10.5v3'] },
  ok: { y: ['M4 12h15', 'M13.5 6.5 19.5 12l-6 5.5'] },
  gunes: { y: ['M12 8a4 4 0 1 0 .01 0z', 'M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5',
    'M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8'] },
  bulut: { y: ['M7 18.5a4.2 4.2 0 0 1-.6-8.4 5.6 5.6 0 0 1 10.9 1.3 3.6 3.6 0 0 1-.3 7.1z'] },
  yagmur: { y: ['M7 14.5a4 4 0 0 1-.5-7.9 5.4 5.4 0 0 1 10.5 1.2 3.4 3.4 0 0 1-.3 6.7z',
    'M8 17.5l-1 3M12.5 17.5l-1 3M17 17.5l-1 3'] },
  uyari: { y: ['M12 3.5 21.5 20h-19z', 'M12 10v5'], d: [[12, 17.6, 1.1]] },
  pano: { y: ['M5 4.5h14v16H5z', 'M8.5 9h7M8.5 12.5h7M8.5 16h4', 'M12 2.5v4'] },
  kumsaati: { y: ['M6.5 3.5h11M6.5 20.5h11', 'M7.5 3.5c0 5 4.5 5 4.5 8.5s-4.5 3.5-4.5 8.5',
    'M16.5 3.5c0 5-4.5 5-4.5 8.5s4.5 3.5 4.5 8.5'] },
  kilit: { y: ['M5.5 11h13v9.5h-13z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'] },
  grafik: { y: ['M4 20.5h16', 'M6.5 20V13M11 20V7M15.5 20v-9M19.5 20V4'] },
  kapi: { y: ['M3 20.5h18', 'M5 20.5V8.5h14v12', 'M5 8.5 12 3.5l7 5', 'M9.5 20.5v-6h5v6'] },
  hedef: { y: ['M12 7.5a4.5 4.5 0 1 0 .01 0z', 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3'] },
  damga: { y: ['M12 3.5a8.5 8.5 0 1 0 .01 0z', 'M12 6.8a5.2 5.2 0 1 0 .01 0z',
    'M12 9.2l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z'] },
  kamyon: { y: ['M2.5 7h11v9h-11z', 'M13.5 10h4.2l3 3.2V16h-7.2', 'M6.5 16a1.7 1.7 0 1 0 .01 0z',
    'M16.5 16a1.7 1.7 0 1 0 .01 0z'] },
  cayir: { y: ['M4 20.5h16', 'M7 20.5c0-5 .5-8 3-11', 'M12 20.5c0-6-.5-10 .5-14.5',
    'M17 20.5c0-4-.5-7-3-10'] },
  tamam: { y: ['M5 12.5l4.5 4.5L19 7'] },
};

/** ad simgesini <svg> olarak üretir (aria-hidden; anlamı çevresindeki metinde). */
export function simge(ad, boy = 18) {
  const tanim = YOLLAR[ad];
  if (!tanim) throw new Error(`Bilinmeyen çiftlik simgesi: ${ad}`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(boy));
  svg.setAttribute('height', String(boy));
  svg.setAttribute('class', `cf-simge cf-simge-${ad}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of tanim.y) {
    const yol = document.createElementNS(NS, 'path');
    yol.setAttribute('d', d);
    svg.append(yol);
  }
  for (const [cx, cy, r] of tanim.d ?? []) {
    const daire = document.createElementNS(NS, 'circle');
    daire.setAttribute('cx', cx);
    daire.setAttribute('cy', cy);
    daire.setAttribute('r', r);
    daire.setAttribute('class', 'dolgu');
    svg.append(daire);
  }
  return svg;
}

/** Gök adından (gunesli | bulutlu | yagmur) simge adı. */
export const GOK_SIMGE = { gunesli: 'gunes', bulutlu: 'bulut', yagmur: 'yagmur' };
