/**
 * Sırt üfleyicisi çizimi: yerde duran makine (motor, boru, namlu), çiftçinin sırtındaki
 * motor ve boru (karakter-cizim kullanır) ve borudan çıkan hava dalgası.
 */
import {
  GOLGE_RENGI, donuk, doldur, elips, golgeKayma, renk, serit, yuvarDik,
} from './ortak.js';

const GOVDE = '#e0a526';
const GOVDE_KOYU = '#a8761a';

/** Namludan (yerel x0, y0; yön +x) yayılan, solan hava yayları. */
export function havaDalgasi(ctx, t, x0, y0, uzunluk) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const f = (t * 1.8 + i / 3) % 1;
    const cx = x0 + 0.2 + f * uzunluk;
    const r = 0.25 + f * 0.75;
    const a = 0.5 + 0.35 * f;
    ctx.strokeStyle = `rgba(240, 250, 255, ${(0.55 * (1 - f)).toFixed(3)})`;
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.arc(cx - r * 0.6, y0, r, -a, a);
    ctx.stroke();
  }
  for (const v of [-0.14, 0.12]) {
    const f = (t * 2.4 + v * 3) % 1;
    serit(ctx, x0 + 0.3 + f * uzunluk * 0.8, y0 + v * (1 + f * 2),
      x0 + 0.65 + f * uzunluk * 0.8, y0 + v * (1 + f * 2), 0.05,
      `rgba(255, 255, 255, ${(0.45 * (1 - f)).toFixed(3)})`);
  }
}

/** Motor gövdesi: sarı kutu, koyu başlık, kırmızı yakıt kapağı; (cx, cy) merkez. */
export function motorKutusu(ctx, cx, cy, en, boy, isik, sonuk) {
  yuvarDik(ctx, cx - boy / 2, cy - en / 2, boy, en, 0.14);
  doldur(ctx, renk(GOVDE, sonuk));
  ctx.strokeStyle = renk(GOVDE_KOYU, sonuk);
  ctx.lineWidth = 0.06;
  ctx.stroke();
  yuvarDik(ctx, cx - boy / 2 + 0.07, cy - en / 2 + 0.07, boy * 0.45, en - 0.14, 0.08);
  doldur(ctx, renk('#2f3236', sonuk));
  for (let i = 0; i < 3; i++) {
    const x = cx - boy / 2 + 0.14 + i * 0.1;
    serit(ctx, x, cy - en / 2 + 0.13, x, cy + en / 2 - 0.13, 0.03, renk('#5b5f64', sonuk));
  }
  elips(ctx, cx + boy * 0.22, cy - en * 0.18, 0.1, 0.1);
  doldur(ctx, renk('#c93434', sonuk));
  elips(ctx, cx + boy * 0.22, cy + en * 0.2, 0.07, 0.07);
  doldur(ctx, renk('#2f3236', sonuk));
  serit(ctx, cx - boy * 0.1 + isik[0] * 0.2, cy - en / 2 + 0.06, cx + boy * 0.38,
    cy - en / 2 + 0.06, 0.04, 'rgba(255, 244, 200, 0.5)');
}

/** Boru: noktalar dizisi boyunca koyu halka halka esnek hortum, ucunda namlu. */
export function boruCiz(ctx, noktalar, sonuk) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(noktalar[0][0], noktalar[0][1]);
    for (let i = 1; i < noktalar.length - 1; i++) {
      const [a, b] = noktalar[i];
      const [c, d] = noktalar[i + 1];
      ctx.quadraticCurveTo(a, b, (a + c) / 2, (b + d) / 2);
    }
    const son = noktalar[noktalar.length - 1];
    ctx.lineTo(son[0], son[1]);
  };
  yol();
  ctx.strokeStyle = renk('#2b2e32', sonuk);
  ctx.lineWidth = 0.3;
  ctx.stroke();
  yol();
  ctx.strokeStyle = renk('#53585e', sonuk);
  ctx.lineWidth = 0.2;
  ctx.setLineDash([0.05, 0.1]);
  ctx.stroke();
  ctx.setLineDash([]);
  const [px, py] = noktalar[noktalar.length - 2];
  const [ux, uy] = noktalar[noktalar.length - 1];
  const a = Math.atan2(uy - py, ux - px);
  ctx.save();
  ctx.translate(ux, uy);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.14);
  ctx.lineTo(0.3, -0.26);
  ctx.lineTo(0.3, 0.26);
  ctx.lineTo(-0.15, 0.14);
  ctx.closePath();
  doldur(ctx, renk('#1f2226', sonuk));
  ctx.restore();
}

/** Yerde duran üfleyici (çiftçi binmemişken); calisiyor iken titrer ve hava üfler. */
export function ufleyiciCiz(ctx, makine, zaman) {
  const t = zaman / 1000;
  const sonuk = !(makine.yakit > 0);
  const calis = !!makine.calisiyor && !sonuk;
  const [gx, gy] = golgeKayma(0);
  const titre = calis ? Math.sin(t * 70) * 0.025 : 0;
  const isik = [-0.6, -0.8];
  const noktalar = [[0.15, 0.1], [0.9, 0.55], [1.5, -0.35], [2.2, 0.05]];
  donuk(ctx, makine.x + gx * 0.7, makine.y + gy * 0.7, makine.yon, 1, (c) => {
    c.fillStyle = GOLGE_RENGI;
    yuvarDik(c, -0.9, -0.5, 1.2, 1.0, 0.2);
    c.fill();
    c.lineWidth = 0.3;
    c.strokeStyle = GOLGE_RENGI;
    c.beginPath();
    c.moveTo(0.1, 0.1);
    c.quadraticCurveTo(0.9, 0.55, 1.5, -0.35);
    c.lineTo(2.2, 0.05);
    c.stroke();
  });
  donuk(ctx, makine.x, makine.y + titre, makine.yon, 1, (c) => {
    // Omuz askıları yerde kıvrık yatar.
    c.strokeStyle = renk('#2b2e32', sonuk);
    c.lineWidth = 0.12;
    c.lineCap = 'round';
    for (const v of [-1, 1]) {
      c.beginPath();
      c.arc(-0.2, v * 0.6, 0.35, v < 0 ? 0.3 : -2.4, v < 0 ? 2.4 : -0.3);
      c.stroke();
    }
    boruCiz(c, noktalar, sonuk);
    motorKutusu(c, -0.35, 0, 0.95, 1.05, isik, sonuk);
    if (calis) havaDalgasi(c, t, 2.4, 0.05, 1.9);
  });
}

/** Çiftçinin sırtındaki motor (karakter yerel uzayı); çizim sırasında şapkanın altında kalır. */
export function sirtMotoru(ctx, t, calis, isik) {
  const titre = calis ? Math.sin(t * 70) * 0.02 : 0;
  ctx.save();
  ctx.translate(0, titre);
  motorKutusu(ctx, -0.72, 0, 0.82, 0.7, isik, false);
  for (const v of [-1, 1]) serit(ctx, -0.45, v * 0.46, -0.1, v * 0.56, 0.1, '#2b2e32');
  ctx.restore();
}
