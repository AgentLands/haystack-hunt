/**
 * Serçe çizimi (tepeden, +x ileri): kanat çırpma (kanat boyu |cos| ile kısalıp uzar), kırçıl
 * kahverengi sırt, rufous başlık, turuncu gaga. Uçarken yükseklikle (yuk 0..1) hafifçe büyür.
 */
import { cokgen, elipsBoya, ikiTon, yolla } from './ortak.js';

const KUS = { koyu: '#6e4f33', acik: '#a6794a', baslik: '#9a4f2c', gaga: '#d9a441' };

/** Süpürülmüş kanat: omuzdan uca; boy 0..1 (çırpma). s: taraf (-1 sol, 1 sağ). */
function kanat(ctx, s, boy, isik, eb, ayrinti) {
  const uc = 0.16 + 0.95 * boy;
  const yol = (k) => () => {
    ctx.moveTo(0.22, s * 0.16);
    ctx.quadraticCurveTo(0.1, s * uc * 0.7 * k, -0.2, s * uc * k);
    ctx.quadraticCurveTo(-0.28, s * uc * 0.55 * k, -0.62, s * (0.12 + uc * 0.5 * k));
    ctx.quadraticCurveTo(-0.5, s * 0.16, -0.38, s * 0.14);
    ctx.closePath();
  };
  yolla(ctx, yol(1), KUS.koyu, eb);
  ctx.save();
  ctx.translate(isik[0] * 0.04, isik[1] * 0.04);
  ctx.beginPath();
  yol(0.7)();
  ctx.fillStyle = KUS.acik;
  ctx.fill();
  ctx.restore();
  if (!ayrinti) return;
  ctx.strokeStyle = '#4a3320'; // uçtaki birkaç tüy çizgisi
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const k of [0.45, 0.7, 0.92]) {
    ctx.moveTo(-0.1 - k * 0.2, s * (0.2 + uc * k * 0.78));
    ctx.lineTo(-0.34 - k * 0.2, s * (0.16 + uc * k * 0.58));
  }
  ctx.stroke();
}

export function sercCiz(ctx, k) {
  const { f, isik, eb, ayrinti } = k;
  const boy = 0.28 + 0.72 * Math.abs(Math.cos(f));
  kanat(ctx, -1, boy, isik, eb, ayrinti);
  kanat(ctx, 1, boy, isik, eb, ayrinti);
  yolla(ctx, () => cokgen(ctx, [-0.4, -0.1, -0.9, -0.17, -0.9, 0.17, -0.4, 0.1]), KUS.koyu, eb);
  ikiTon(ctx, -0.02, 0, 0.5, 0.29, KUS.koyu, KUS.acik, isik, eb);
  yolla(ctx, () => cokgen(ctx, [0.6, -0.08, 0.84, 0, 0.6, 0.08]), KUS.gaga, eb);
  ikiTon(ctx, 0.4, 0, 0.23, 0.21, '#7a3a1f', KUS.baslik, isik, eb);
  if (!ayrinti) return;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(0.515, s * 0.12);
    ctx.arc(0.48, s * 0.12, 0.035, 0, 6.3);
  }
  ctx.fillStyle = '#1c120a';
  ctx.fill();
}
