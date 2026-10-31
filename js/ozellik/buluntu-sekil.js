/**
 * Buluntu şekilleri: her tür için küçük, boyalı oyuncak tarzında çizim (düz renk kütleleri,
 * koyu kahve dış hat, bir açık vurgu). Yerel uzay yarıçapı ~1; çağıran konumlayıp ölçekler.
 * Hem tarlada (buluntu-cizim.js) hem defterde (buluntu-defter.js) aynı çizim kullanılır.
 */
import {
  kipAyarla, daire, cokgen, dik, nokta, kalin, kemer, ince, parca,
} from './buluntu-parca.js';

const PI = Math.PI;
const ALTIN = '#e9b82c';

const SEKILLER = {
  dugme(c) {
    daire(c, 0, 0, 0.85, '#e7dab8');
    for (const [x, y] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
      nokta(c, x, y, 0.1, '#4a3a26');
    }
    ince(c, [[-0.5, -0.55], [-0.2, -0.72]], 0.1, '#fffaf0');
  },
  tuy(c) {
    kalin(c, [[-0.95, 0.8], [0.75, -0.85]], 0.1, '#e4dccb');
    c.beginPath();
    c.moveTo(-0.55, 0.45);
    c.quadraticCurveTo(-0.95, -0.5, 0.8, -0.95);
    c.quadraticCurveTo(1.0, 0.1, -0.55, 0.45);
    parca(c, '#4f8fc9');
    ince(c, [[-0.5, 0.2], [0.55, -0.6]], 0.09, '#cfe4f5');
    ince(c, [[-0.3, 0.3], [0.7, -0.35]], 0.08, '#2d4f78');
  },
  yuksek(c) {
    c.beginPath();
    c.moveTo(-0.7, 0.8);
    c.lineTo(-0.55, -0.2);
    c.quadraticCurveTo(0, -1.15, 0.55, -0.2);
    c.lineTo(0.7, 0.8);
    c.closePath();
    parca(c, '#c4cad1');
    dik(c, -0.82, 0.45, 1.64, 0.4, 0.12, '#9aa3ac');
    for (const [x, y] of [[-0.25, -0.35], [0.25, -0.35], [0, -0.05], [-0.4, 0.1], [0.4, 0.1]]) {
      nokta(c, x, y, 0.08, '#7a838c');
    }
  },
  bilye(c) {
    daire(c, 0, 0, 0.8, '#3b86c8');
    kemer(c, 0, 0, 0.42, 0.2, 2.6, 0.12, '#eef4fa');
    kemer(c, 0, 0, 0.42, 3.4, 5.3, 0.12, '#e8c33a');
    nokta(c, -0.4, -0.42, 0.14, '#ffffff');
  },
  anahtar(c) {
    kalin(c, [[-0.25, 0], [0.9, 0]], 0.18, '#9a5530');
    kalin(c, [[0.62, 0], [0.62, 0.42]], 0.15, '#9a5530');
    kalin(c, [[0.87, 0], [0.87, 0.32]], 0.15, '#9a5530');
    kemer(c, -0.58, 0, 0.36, 0, PI * 2, 0.2, '#b2693a');
  },
  caki(c) {
    dik(c, -0.9, -0.3, 1.2, 0.6, 0.2, '#c0392b');
    nokta(c, -0.65, 0, 0.07, '#e8c9a0');
    nokta(c, 0.05, 0, 0.07, '#e8c9a0');
    cokgen(c, [[0.28, -0.16], [0.62, -0.2], [0.52, -0.04], [0.9, 0.03], [0.58, 0.2], [0.28, 0.16]],
      '#aeb6bd');
  },
  kurus(c) {
    daire(c, 0, 0, 0.82, '#b8733a');
    kemer(c, 0, 0, 0.6, 0, PI * 2, 0.07, '#8a5226');
    nokta(c, 0, 0, 0.18, '#8a5226');
    ince(c, [[-0.55, -0.45], [-0.3, -0.7]], 0.1, '#e8a96a');
  },
  nal(c) {
    kemer(c, 0, 0.1, 0.6, -PI / 2 + 0.6, -PI / 2 + PI * 2 - 0.6, 0.34, '#7a8187');
    for (const a of [-1.1, -0.5, 0.5, 1.1]) {
      nokta(c, 0.6 * Math.cos(PI / 2 + a), 0.1 + 0.6 * Math.sin(PI / 2 + a), 0.055, '#2b2118');
    }
  },
  toka(c) {
    dik(c, -0.9, -0.28, 1.8, 0.56, 0.28, '#d4558b');
    for (const x of [-0.5, 0, 0.5]) nokta(c, x, 0, 0.1, '#fbe3ee');
    ince(c, [[-0.7, 0.62], [0.7, 0.62]], 0.08, '#8c929a');
  },
  mektup(c) {
    cokgen(c, [[-0.8, -0.7], [0.3, -0.8], [0.35, -0.5], [0.8, -0.3], [0.7, 0.4], [0.3, 0.35],
      [0.4, 0.8], [-0.8, 0.7]], '#f2e6c6');
    for (const y of [-0.45, -0.2, 0.05]) ince(c, [[-0.6, y], [0.4, y + 0.04]], 0.07, '#6a5438');
    daire(c, -0.45, 0.4, 0.2, '#a83a2a');
  },
  yonca(c) {
    kalin(c, [[0.1, 0.2], [0.55, 0.95]], 0.1, '#6b5a2a');
    for (const [x, y] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
      daire(c, x, y, 0.42, '#8f9a3a');
    }
    nokta(c, 0, 0, 0.1, '#5e6a22');
  },
  can(c) {
    c.beginPath();
    c.moveTo(-0.75, 0.5);
    c.quadraticCurveTo(-0.8, -0.75, 0, -0.78);
    c.quadraticCurveTo(0.8, -0.75, 0.75, 0.5);
    c.closePath();
    parca(c, '#c9992e');
    dik(c, -0.88, 0.42, 1.76, 0.24, 0.08, '#a87b1f');
    daire(c, 0, 0.8, 0.17, '#5b3d12');
    kemer(c, 0, -0.95, 0.15, 0, PI * 2, 0.08, '#a87b1f');
    ince(c, [[-0.45, -0.3], [-0.4, 0.2]], 0.1, '#f5d98a');
  },
  oyuncak(c) {
    for (const x of [-0.5, -0.25, 0.15, 0.4]) kalin(c, [[x, 0.3], [x, 0.9]], 0.14, '#a8713a');
    kalin(c, [[-0.6, 0], [-0.95, 0.45]], 0.08, '#5a3a1a');
    dik(c, -0.65, -0.15, 1.2, 0.55, 0.18, '#c68a4a');
    cokgen(c, [[0.25, -0.05], [0.3, -0.7], [0.7, -0.85], [0.95, -0.55], [0.62, -0.42],
      [0.55, -0.05]], '#c68a4a');
    kalin(c, [[0.3, -0.62], [0.28, -0.1]], 0.09, '#5a3a1a');
    nokta(c, 0.72, -0.62, 0.05, '#2b2118');
  },
  kasik(c) {
    kalin(c, [[-0.15, -0.15], [0.85, 0.85]], 0.17, '#cfd5db');
    c.beginPath();
    c.ellipse(-0.45, -0.45, 0.46, 0.32, PI / 4, 0, PI * 2);
    parca(c, '#d9dee3');
    c.beginPath();
    c.ellipse(-0.5, -0.5, 0.26, 0.15, PI / 4, 0, PI * 2);
    c.fillStyle = '#f6f8fa';
    c.fill();
  },
  cingirak(c) {
    kalin(c, [[0.1, 0.1], [0.62, 0.62]], 0.2, '#f4d98a');
    kemer(c, 0.78, 0.78, 0.2, 0, PI * 2, 0.1, '#e8607a');
    daire(c, -0.28, -0.28, 0.58, '#8ec8dd');
    kemer(c, -0.28, -0.28, 0.34, 0.3, 2.3, 0.1, '#f2f6fa');
    nokta(c, -0.1, -0.5, 0.08, '#e8607a');
    nokta(c, -0.5, -0.05, 0.08, '#e8607a');
  },
  tarak(c) {
    for (let i = 0; i < 7; i++) {
      const x = -0.72 + i * 0.24;
      kalin(c, [[x, -0.1], [x, 0.65]], 0.1, '#efe3c0');
    }
    dik(c, -0.9, -0.5, 1.8, 0.42, 0.16, '#efe3c0');
    ince(c, [[-0.7, -0.38], [0.6, -0.38]], 0.07, '#c9b88a');
  },
  pusula(c) {
    daire(c, 0, 0, 0.88, '#c8962e');
    daire(c, 0, 0, 0.62, '#efe6c8');
    cokgen(c, [[0, -0.52], [0.13, 0], [-0.13, 0]], '#c0392b');
    cokgen(c, [[0, 0.52], [0.13, 0], [-0.13, 0]], '#3f5f8a');
    nokta(c, 0, 0, 0.06, '#2b2118');
  },
  yuzuk(c) {
    kemer(c, 0, 0.28, 0.52, 0, PI * 2, 0.24, ALTIN);
    cokgen(c, [[0, -0.98], [0.32, -0.62], [0, -0.26], [-0.32, -0.62]], '#d63a5c');
    ince(c, [[-0.12, -0.7], [0, -0.82]], 0.07, '#fbd0da');
  },
  kupe(c) {
    kemer(c, 0, -0.25, 0.5, -PI / 2 + 0.5, PI * 1.5 - 0.5, 0.17, ALTIN);
    daire(c, 0, 0.6, 0.3, '#f5f0e6');
    nokta(c, -0.1, 0.5, 0.08, '#ffffff');
  },
  saat(c) {
    kemer(c, 0, -0.98, 0.15, 0, PI * 2, 0.08, ALTIN);
    dik(c, -0.14, -0.9, 0.28, 0.2, 0.05, '#c99a1f');
    daire(c, 0, 0.12, 0.75, ALTIN);
    daire(c, 0, 0.12, 0.56, '#f7f0dc');
    ince(c, [[0, 0.12], [0, -0.28]], 0.08, '#2b2118');
    ince(c, [[0, 0.12], [0.28, 0.12]], 0.07, '#2b2118');
    for (const [x, y] of [[0, -0.38], [0.46, 0.12], [0, 0.62], [-0.46, 0.12]]) {
      nokta(c, x, y, 0.045, '#9e3a26');
    }
  },
};

/**
 * Türün şeklini çizer. ctx yerel uzayda (yarıçap ~1 birim), birim: 1 ekran pikselinin yerel
 * uzunluğu (dış hat kalınlığı için). siluet: bulunmamış eşya (düz kâğıt kesiği).
 */
export function buluntuSekil(ctx, tur, birim, siluet = false) {
  const ciz = SEKILLER[tur];
  if (!ciz) return;
  kipAyarla(birim, siluet);
  ctx.save();
  ciz(ctx);
  ctx.restore();
}

export const SEKIL_TURLERI = Object.keys(SEKILLER);
