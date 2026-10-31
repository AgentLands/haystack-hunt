/**
 * Menü logosu: çuval damgası gibi basılmış "HAYSTACK / HUNT" yazısı (kavisli üst satır,
 * hafif kaymış mürekkep gölgeli alt satır) ve ikisinin arasında ayraç olarak ipli bir iğne.
 * Satır içi SVG olduğu için sayfanın yazı tiplerini kullanır; renkler menu.css'teki
 * sınıflardan gelir. Kenarlardaki hafif pürüz bir feDisplacementMap süzgecidir.
 */
const NS = 'http://www.w3.org/2000/svg';

function oge(ad, nitelikler = {}, ...cocuklar) {
  const o = document.createElementNS(NS, ad);
  for (const [k, v] of Object.entries(nitelikler)) o.setAttribute(k, String(v));
  o.append(...cocuklar);
  return o;
}

function suzgec() {
  return oge('filter', { id: 'logo-murekkep', x: '-5%', y: '-5%', width: '110%', height: '110%' },
    oge('feTurbulence', {
      type: 'fractalNoise', baseFrequency: '0.9', numOctaves: 1, seed: 7, result: 'gurultu',
    }),
    oge('feDisplacementMap', {
      in: 'SourceGraphic', in2: 'gurultu', scale: '1.3',
      xChannelSelector: 'R', yChannelSelector: 'G',
    }));
}

/** İpli iğne: sol uçtan sağdaki göze uzanan ince gövde, gözden kıvrılarak çıkan iplik. */
function igne() {
  return oge('g', { class: 'logo-igne' },
    oge('path', {
      class: 'logo-iplik',
      d: 'M222 72.2c10-12 30-12 34-3 3 8-7 13-13 8-5-4 0-11 8-10 9 1 14 7 18 13',
    }),
    oge('path', {
      class: 'logo-igne-govde',
      d: 'M56 72.2L224 69.2A3 3 0 0 1 224 75.2Z',
    }),
    oge('path', { class: 'logo-igne-goz', d: 'M213 72.2h10' }));
}

/** Logo SVG düğümü (role="img", ad aria-label'da). */
export function logo() {
  const yay = oge('path', { id: 'logo-yay', d: 'M28 60Q150 22 272 60', fill: 'none' });
  const ust = oge('text', { class: 'logo-ust', 'text-anchor': 'middle' },
    oge('textPath', { href: '#logo-yay', startOffset: '50%' }, 'HAYSTACK'));
  const golge = oge('text', {
    class: 'logo-alt-golge', x: 153, y: 131, 'text-anchor': 'middle',
  }, 'HUNT');
  const alt = oge('text', { class: 'logo-alt', x: 150, y: 128, 'text-anchor': 'middle' }, 'HUNT');
  const svg = oge('svg', {
    class: 'logo', viewBox: '0 0 300 136', role: 'img', 'aria-label': 'Haystack Hunt',
  },
  oge('defs', {}, yay, suzgec()),
  oge('g', { filter: 'url(#logo-murekkep)' }, ust, igne(), golge, alt));
  return svg;
}
