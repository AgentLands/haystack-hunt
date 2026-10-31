/**
 * Traktör çizimi (kuş bakışı): kırmızı-turuncu gövde, büyük arka tekerlekler, önde kepçe.
 * yuk (0..1) kepçedeki saman yığınının doluluğu; calisiyor iken kepçe iner/kalkar;
 * motor açıkken egzoz dumanı; yakıt bitince sönük; sürücü koltukta görünür.
 */
import {
  IKI_PI, bisel, donuk, doldur, elips, isikYerel, renk, serit, tekerlek, yuvarDik,
} from './ortak.js';
import { oturanCiftci } from './ciftci-parca.js';
import { dumanCiz, izleriCiz, kutuGolgesi, makineBilgi } from './makine-ortak.js';

const ARKA_TEKERLEK = [-1.15, 1.5, 1.8, 0.9];
const ON_TEKERLEK = [1.2, 1.02, 1.0, 0.46];
const KAYMA_X = -0.5;
const SAMAN = [
  [0.9, '#f2d887'], [0.72, '#e2bf62'], [0.5, '#f4de93'],
];
const SAP_CIZGI = [
  [-0.3, -0.5, 0.45, -0.2], [0.1, -0.7, -0.35, 0.3], [0.35, 0.1, 0.6, 0.65],
  [-0.1, 0.2, -0.45, 0.7], [0.0, -0.1, 0.5, -0.65], [-0.5, 0.0, 0.1, 0.85],
];

/** Kepçedeki saman yığını: yuk arttıkça genişler ve yükselir. */
function samanYigini(ctx, cx, yuk, isik) {
  if (yuk <= 0.02) return;
  const rx = 0.22 + 0.5 * yuk;
  const ry = 0.2 + 1.25 * Math.sqrt(yuk);
  for (const [oran, renkDegeri] of SAMAN) {
    elips(ctx, cx + isik[0] * (1 - oran) * 0.3, isik[1] * (1 - oran) * 0.3, rx * oran, ry * oran);
    doldur(ctx, renkDegeri);
  }
  ctx.strokeStyle = 'rgba(150, 105, 30, 0.45)';
  ctx.lineWidth = 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [a, b, c, d] of SAP_CIZGI) {
    ctx.moveTo(cx + a * rx, b * ry);
    ctx.lineTo(cx + c * rx, d * ry);
  }
  ctx.stroke();
}

/** Kepçe: ardında menteşe, iki yan duvar, ön dudak; ardından saman yığını. */
function kepce(ctx, px, k, yuk, isik, makine) {
  const sal = makine.calisiyor && !k.sonuk ? Math.sin(k.t * 4) : 0;
  const ks = 1 + 0.08 * sal;
  ctx.save();
  ctx.translate(px + 0.48 + 0.2 * sal, 0);
  ctx.scale(ks, ks);
  ctx.translate(-0.48, 0);
  ctx.beginPath();
  ctx.moveTo(0, -1.3);
  ctx.lineTo(0.95, -1.5);
  ctx.lineTo(0.95, 1.5);
  ctx.lineTo(0, 1.3);
  ctx.closePath();
  doldur(ctx, renk('#454a50', k.sonuk));
  ctx.strokeStyle = renk('#8b9299', k.sonuk);
  ctx.lineWidth = 0.14;
  ctx.lineJoin = 'round';
  ctx.stroke();
  serit(ctx, 0.95, -1.5, 0.95, 1.5, 0.12, renk('#b4bbc2', k.sonuk));
  serit(ctx, 0.07, -1.28, 0.07, 1.28, 0.1, renk('#2c3036', k.sonuk));
  samanYigini(ctx, 0.5, yuk, isik);
  ctx.restore();
}

function govde(ctx, makine, k, isik) {
  const s = k.sonuk;
  const at = ARKA_TEKERLEK;
  for (const v of [-1, 1]) {
    tekerlek(ctx, at[0], v * at[1], at[2], at[3], k.kayma, s);
    tekerlek(ctx, ON_TEKERLEK[0], v * ON_TEKERLEK[1], ON_TEKERLEK[2], ON_TEKERLEK[3], k.kayma, s);
    // Yükleyici kolları kaput yanından kepçeye uzanır.
    const uzan = makine.calisiyor && !s ? Math.sin(k.t * 4) * 0.2 : 0;
    serit(ctx, -0.5, v * 0.67, 2.25 + uzan, v * 0.67, 0.2, renk('#8d2f19', s));
    serit(ctx, -0.5, v * 0.67 + isik[1] * 0.04, 2.25 + uzan, v * 0.67 + isik[1] * 0.04, 0.07,
      renk('#e0603a', s));
  }
  // Arka şasi ve çamurluklar.
  bisel(ctx, -2.0, -0.78, 2.3, 1.56, 0.22, isik, '#a63719', '#c9421f', s);
  for (const v of [-1, 1]) {
    bisel(ctx, -2.0, v < 0 ? -1.3 : 0.78, 1.75, 0.52, 0.22, isik, '#b93d1d', '#e24e25', s);
  }
  // Kaput, ızgara ve farlar.
  bisel(ctx, 0.15, -0.55, 1.95, 1.1, 0.24, isik, '#c4401e', '#ee5a2a', s);
  serit(ctx, 0.35, 0, 1.9, 0, 0.1, renk('#f58a4c', s));
  for (let i = 0; i < 4; i++) {
    serit(ctx, 2.04, -0.3 + i * 0.2, 2.04, -0.2 + i * 0.2, 0.05, '#2a2420');
  }
  for (const v of [-1, 1]) {
    elips(ctx, 2.0, v * 0.4, 0.08, 0.08);
    doldur(ctx, k.motorAcik ? '#fff3b0' : renk('#d8cfa8', s));
  }
  // Koltuk, direksiyon, sürücü.
  yuvarDik(ctx, -1.25, -0.4, 0.55, 0.8, 0.16);
  doldur(ctx, renk('#33261d', s));
  yuvarDik(ctx, -1.3, -0.4, 0.14, 0.8, 0.06);
  doldur(ctx, renk('#241a14', s));
  ctx.strokeStyle = renk('#262626', s);
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.arc(-0.2, 0, 0.3, 0, IKI_PI);
  ctx.stroke();
  serit(ctx, -0.2, -0.3, -0.2, 0.3, 0.05, renk('#262626', s));
  if (makine.surucu) oturanCiftci(ctx, -0.85, 0, isik);
  // Koruma çerçevesi (açık kabin).
  ctx.strokeStyle = renk('#2d2d2d', s);
  ctx.lineWidth = 0.07;
  ctx.lineJoin = 'round';
  yuvarDik(ctx, -1.75, -0.78, 1.45, 1.56, 0.1);
  ctx.stroke();
  // Egzoz borusu.
  elips(ctx, 1.25, -0.3, 0.09, 0.09);
  doldur(ctx, '#1d1b19');
  elips(ctx, 1.25, -0.3, 0.05, 0.05);
  doldur(ctx, renk('#9a9a9a', s));
  const uzan = makine.calisiyor && !s ? Math.sin(k.t * 4) * 0.2 : 0;
  kepce(ctx, 2.25 + uzan, k, k.yuk, isik, makine);
}

/** Traktörü çizer: makine { x, y, yon, hiz, yakit, surucu, calisiyor, yuk }. */
export function traktorCiz(ctx, makine, zaman) {
  const k = makineBilgi(makine, zaman);
  const isik = isikYerel(makine.yon);
  kutuGolgesi(ctx, makine, [
    [-2.1 + KAYMA_X, -1.7, 2.4, 3.4, 0.4], [0.15 + KAYMA_X, -0.6, 2.0, 1.2, 0.3],
    [2.2 + KAYMA_X, -1.5, 1.1, 3.0, 0.2],
  ]);
  donuk(ctx, makine.x, makine.y, makine.yon, 1, (c) => {
    c.translate(KAYMA_X, 0);
    izleriCiz(c, [
      [-1.15, -1.5, 1.8, 0.9], [-1.15, 1.5, 1.8, 0.9],
      [1.2, -1.02, 1.0, 0.46], [1.2, 1.02, 1.0, 0.46],
    ], k.hiz);
    c.translate(0, k.titre);
    govde(c, makine, k, isik);
  });
  if (k.motorAcik) {
    const guc = 0.45 + (k.hareket ? 0.35 : 0) + (k.calis ? 0.2 : 0);
    dumanCiz(ctx, makine, 1.25 + KAYMA_X, -0.3, guc, k.t);
  }
}
