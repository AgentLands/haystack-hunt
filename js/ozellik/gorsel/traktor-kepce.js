/**
 * Traktör kepçesi: menteşe, yan duvarlar, ön dudak ve içindeki saman yığını (yuk 0..1).
 * Kalkış (makine-hal kalkis 0..1) kepçeyi ileri kaydırır, büyütür, ışığa yaklaştırır ve
 * gölgesini gövde gölgesinden ayırır. Dolu kepçe sallanırken ara sıra saman çöpü düşer.
 * Yerel uzay: traktörün (KAYMA_X kaydırılmış) uzayı, +x ileri.
 */
import { elips, renk, serit } from './ortak.js';
import { hat } from './makine-ortak.js';

const MENTESE_X = 2.25;
const KEPCE_BOY = 0.95;
/** Kepçe gölgesinin yerden yüksekliği, tam kalkışta (golgeKayma birimi). */
const KALKIS_YUKSEKLIK = 90;
const SAP_CIZGI = [
  [-0.3, -0.5, 0.45, -0.2], [0.1, -0.7, -0.35, 0.3], [0.35, 0.1, 0.6, 0.65],
  [-0.1, 0.2, -0.45, 0.7], [0.0, -0.1, 0.5, -0.65], [-0.5, 0.0, 0.1, 0.85],
];

/** Kalkışa göre kepçe menteşesinin x'i ve ölçeği. */
export function kepceKonumu(kalkis) {
  return { x: MENTESE_X + 0.32 * kalkis, olcek: 1 + 0.09 * kalkis };
}

/** Kalkan kepçenin gölge kutusu (kutuGolgesi için): yükseklik kadar gövdeden ayrı. */
export function kepceGolgesi(kaymaX, kalkis) {
  const { x, olcek } = kepceKonumu(kalkis);
  const merkez = x + KEPCE_BOY / 2;
  const w = KEPCE_BOY * olcek;
  const h = 3.0 * olcek;
  return [kaymaX + merkez - w / 2, -h / 2, w + 0.1, h, 0.2, KALKIS_YUKSEKLIK * kalkis];
}

/** Dizin ve tohumdan [0, 1) sahte rastgele (çizim kararlı kalsın diye). */
function sahte(i, tohum) {
  const v = Math.sin(i * 127.1 + tohum * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Kepçedeki saman yığını: yuk arttıkça genişler ve yükselir; dış hatlı, 2 tonlu. */
function samanYigini(ctx, cx, yuk, isik, eb) {
  if (yuk <= 0.02) return;
  const rx = 0.2 + 0.3 * yuk;
  const ry = 0.2 + 1.12 * Math.sqrt(yuk);
  elips(ctx, cx, 0, rx, ry);
  hat(ctx, '#b8862e', eb, 0.9);
  elips(ctx, cx + isik[0] * rx * 0.18, isik[1] * ry * 0.14, rx * 0.8, ry * 0.84);
  ctx.fillStyle = '#d8b85a';
  ctx.fill();
  elips(ctx, cx + isik[0] * rx * 0.35, isik[1] * ry * 0.3, rx * 0.38, ry * 0.42);
  ctx.fillStyle = '#f0d98a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(150, 105, 30, 0.55)';
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [a, b, c, d] of SAP_CIZGI) {
    ctx.moveTo(cx + a * rx, b * ry);
    ctx.lineTo(cx + c * rx, d * ry);
  }
  ctx.stroke();
}

/** Dolu kepçenin dudağından düşen saman çöpleri: düşerken gölgesine yaklaşır, solar. */
function copDusur(ctx, k, isik) {
  const sallaniyor = k.hareket || k.calis || k.hal.kalkis > 0.3;
  if (k.yuk < 0.3 || !sallaniyor || k.sonuk) return;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const devir = k.t * 1.3 + i * 0.37;
    const f = devir % 1;
    if (f > 0.55) continue;
    const g = f / 0.55;
    const n = Math.floor(devir);
    const y = (sahte(i, n) - 0.5) * 2.4;
    const x = KEPCE_BOY + 0.05 + g * 0.35;
    const yukseklik = (1 - g) * (0.25 + 0.4 * k.hal.kalkis);
    const aci = sahte(i + 7, n) * Math.PI + g * 3;
    const dx = Math.cos(aci) * 0.16;
    const dy = Math.sin(aci) * 0.16;
    const gx = x - isik[0] * yukseklik;
    const gy = y - isik[1] * yukseklik;
    serit(ctx, gx - dx, gy - dy, gx + dx, gy + dy, 0.06, `rgba(40, 22, 8, ${
      (0.3 * (1 - g)).toFixed(3)})`);
    serit(ctx, x - dx, y - dy, x + dx, y + dy, 0.07, `rgba(233, 197, 96, ${
      (1 - g * 0.6).toFixed(3)})`);
  }
}

/** Kepçeyi (kollar govde'de) ve içindekini çizer. */
export function kepce(ctx, k, isik) {
  const s = k.sonuk;
  const { kalkis } = k.hal;
  const { x, olcek } = kepceKonumu(kalkis);
  ctx.save();
  ctx.translate(x + KEPCE_BOY / 2, 0);
  ctx.scale(olcek, olcek);
  ctx.translate(-KEPCE_BOY / 2, 0);
  ctx.beginPath();
  ctx.moveTo(0, -1.3);
  ctx.lineTo(KEPCE_BOY, -1.5);
  ctx.lineTo(KEPCE_BOY, 1.5);
  ctx.lineTo(0, 1.3);
  ctx.closePath();
  hat(ctx, renk(kalkis > 0.45 ? '#5a6168' : '#454a50', s), k.eb);
  // İç taban: ışığa doğru kaymış açık ton (2 tonlu; gölge tarafında koyu bant kalır).
  const ix = isik[0] * 0.07;
  const iy = isik[1] * 0.12;
  ctx.beginPath();
  ctx.moveTo(0.16 + ix, -1.12 + iy);
  ctx.lineTo(KEPCE_BOY - 0.12 + ix, -1.3 + iy);
  ctx.lineTo(KEPCE_BOY - 0.12 + ix, 1.3 + iy);
  ctx.lineTo(0.16 + ix, 1.12 + iy);
  ctx.closePath();
  ctx.fillStyle = renk(kalkis > 0.45 ? '#7d858c' : '#5d6469', s);
  ctx.fill();
  serit(ctx, KEPCE_BOY, -1.5, KEPCE_BOY, 1.5, 0.13, renk('#b4bbc2', s));
  serit(ctx, 0.07, -1.28, 0.07, 1.28, 0.1, renk('#2c3036', s));
  for (const v of [-1, 1]) {
    serit(ctx, 0.05, v * 1.29, KEPCE_BOY - 0.03, v * 1.48, 0.09, renk('#8b9299', s));
  }
  samanYigini(ctx, 0.5, k.yuk, isik, k.eb);
  copDusur(ctx, k, isik);
  ctx.restore();
}
