/**
 * Balya makinesinin parçaları: önde dişli toplayıcı (çalışırken dişler döner; eni kuraldaki
 * toplayıcı şeridini anımsatır) ve odanın üstündeki gözlem penceresi (içinde büyüyen sarmal
 * balya, çevresinde açık turkuaz doluluk halkası; dolunca turuncu yanıp söner).
 * Yerel uzay balya-makine-cizim ile aynı (+x ileri).
 */
import { elips, renk, serit } from './ortak.js';
import { celKutu, hat } from './makine-ortak.js';

const TOP_X = 2.02;
const TOP_W = 0.82;
const TOP_YARI = 1.85;

/** Toplayıcının durağan kısmı: gri tambur ve iki yanda turkuaz kalkan. */
export function toplayiciGovde(ctx, k, isik) {
  const s = k.sonuk;
  celKutu(ctx, TOP_X, -TOP_YARI, TOP_W, TOP_YARI * 2, 0.26, isik, '#4a5055', '#8a9298', s,
    k.eb);
  ctx.beginPath();
  for (const v of [-1, 1]) {
    ctx.rect(TOP_X - 0.06, v < 0 ? -TOP_YARI - 0.12 : TOP_YARI - 0.14, TOP_W + 0.12, 0.26);
  }
  hat(ctx, renk('#2f6f7a', s), k.eb, 0.9);
  serit(ctx, TOP_X + 0.05, -TOP_YARI + 0.2, TOP_X + 0.05, TOP_YARI - 0.2, 0.05,
    'rgba(255, 248, 225, 0.35)');
}

/** Toplayıcı dişleri: dört sıra kısa diş; çalışırken tambur üstünde dönerek kayar. */
export function toplayiciDisler(ctx, k) {
  const s = k.sonuk;
  for (const on of [false, true]) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const faz = (k.calis ? k.t * 9 : 0) + i * (Math.PI / 2);
      if ((Math.cos(faz) > 0) !== on) continue;
      const x = TOP_X + TOP_W / 2 + 0.3 * Math.sin(faz);
      const w = on ? 0.07 : 0.05;
      for (let y = -TOP_YARI + 0.2; y < TOP_YARI - 0.2; y += 0.19) ctx.rect(x - w / 2, y, w, 0.07);
    }
    ctx.fillStyle = renk(on ? '#2a2e32' : '#5b6166', s);
    ctx.fill();
  }
}

/** Gözlem penceresi (cx merkez): içinde büyüyen balya ve doluluk halkası. */
export function pencere(ctx, k, cx) {
  const s = k.sonuk;
  const R = 0.8;
  elips(ctx, cx, 0, R + 0.16, R + 0.16);
  hat(ctx, renk('#24575f', s), k.eb);
  elips(ctx, cx, 0, R, R);
  ctx.fillStyle = renk('#2b2a20', s);
  ctx.fill();
  if (k.yuk > 0.01) {
    const r = 0.1 + (R - 0.08) * k.yuk;
    elips(ctx, cx, 0, r, r);
    ctx.fillStyle = renk('#d8b85a', s);
    ctx.fill();
    ctx.strokeStyle = renk('#a07a2c', s);
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    const tur = 2 + 2 * k.yuk;
    const don = k.calis ? k.t * 3 : 0;
    for (let a = 0; a <= tur * Math.PI * 2; a += 0.55) {
      const rr = (a / (tur * Math.PI * 2)) * r * 0.92;
      const x = cx + Math.cos(a + don) * rr;
      const y = Math.sin(a + don) * rr;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 250, 235, 0.35)';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.arc(cx, 0, R - 0.1, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  if (k.yuk > 0.01) {
    const dolu = k.yuk >= 0.98;
    ctx.strokeStyle = dolu && Math.sin(k.t * 8) > 0 ? '#ff6a3d' : renk('#7fd6d8', s);
    ctx.lineWidth = 0.12;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(cx, 0, R + 0.08, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k.yuk);
    ctx.stroke();
  }
}
