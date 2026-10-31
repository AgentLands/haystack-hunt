/**
 * Yerdeki küçük hayvanların çizimi (tepeden, +x ileri): tarla faresi (bacak koşusu, dalgalı
 * kuyruk), kurbağa (zıplarken bacaklar uzar) ve kirpi (dikenli kubbe; ürkünce top olur).
 * Her işlev yerel uzayda (donuk içinde) çalışır; k: { t: ürkme/durum süresi (sn), f: koşu
 * fazı, isik, eb } ve ek alanlar.
 */
import { cizgiBoya, cokgen, elipsBoya, ikiTon, yolla, IKI_PI } from './ortak.js';

const FARE = { koyu: '#8c6a47', acik: '#b9956b', kulak: '#e4a89a', kuyruk: '#c99a84' };

export function fareCiz(ctx, k) {
  const { f, isik, eb, kos, ayrinti } = k;
  const sal = kos ? Math.sin(f) : 0;
  const kuyruk = [];
  for (let s = 0; s <= 6; s++) {
    const u = s / 6;
    kuyruk.push(-0.62 - u * 0.95, Math.sin(f * 0.7 - u * 5) * 0.24 * u * (kos ? 1 : 0.4));
  }
  cizgiBoya(ctx, kuyruk, 0.1, FARE.kuyruk, eb);
  for (const s of [-1, 1]) { // bacaklar: karşılıklı ileri-geri
    const ofs = kos ? Math.sin(f + (s > 0 ? 0 : Math.PI)) * 0.26 : 0;
    elipsBoya(ctx, 0.28 + ofs, s * 0.36, 0.17, 0.09, '#6b4e34', eb);
    elipsBoya(ctx, -0.36 - ofs, s * 0.34, 0.2, 0.1, '#6b4e34', eb);
  }
  ikiTon(ctx, -0.12, sal * 0.03, 0.62, 0.4, FARE.koyu, FARE.acik, isik, eb);
  ikiTon(ctx, 0.5, sal * 0.02, 0.4, 0.28, FARE.koyu, FARE.acik, isik, eb);
  for (const s of [-1, 1]) elipsBoya(ctx, 0.3, s * 0.27, 0.15, 0.15, FARE.kulak, eb);
  elipsBoya(ctx, 0.9, 0, 0.08, 0.07, '#d98a86', eb);
  if (!ayrinti) return;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(0.685, s * 0.12);
    ctx.arc(0.64, s * 0.12, 0.045, 0, IKI_PI);
  }
  ctx.fillStyle = '#1c120a';
  ctx.fill();
}

const KURBAGA = { koyu: '#4a7a2a', acik: '#8fbf4a', leke: '#3b6320' };

export function kurbagaCiz(ctx, k) {
  const { yuk, isik, eb } = k;
  const uzat = 0.3 + 0.7 * yuk;
  for (const s of [-1, 1]) { // arka bacaklar: yerde katlı, havada geriye uzanır
    cizgiBoya(ctx, [-0.2, s * 0.32, -0.45 - 0.5 * uzat, s * (0.55 + 0.1 * uzat),
      -0.7 - 0.4 * uzat, s * (0.4 + 0.05 * uzat)], 0.24, KURBAGA.koyu, eb);
    elipsBoya(ctx, -0.74 - 0.4 * uzat, s * (0.42 + 0.05 * uzat), 0.2, 0.1, KURBAGA.acik, eb);
    cizgiBoya(ctx, [0.3, s * 0.3, 0.52 + 0.1 * uzat, s * 0.42], 0.1, KURBAGA.koyu, eb);
  }
  ikiTon(ctx, -0.05, 0, 0.58, 0.43, KURBAGA.koyu, KURBAGA.acik, isik, eb);
  ikiTon(ctx, 0.4, 0, 0.36, 0.34, KURBAGA.koyu, KURBAGA.acik, isik, eb);
  if (k.ayrinti) {
    ctx.beginPath();
    for (const [x, y, r] of [[-0.12, -0.14, 0.09], [-0.2, 0.12, 0.08], [0.02, 0.1, 0.06]]) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, IKI_PI);
    }
    ctx.fillStyle = KURBAGA.leke;
    ctx.fill();
  }
  for (const s of [-1, 1]) { // iri gözler
    elipsBoya(ctx, 0.5, s * 0.24, 0.13, 0.13, '#c6dc6a', eb);
    ctx.beginPath();
    ctx.arc(0.54, s * 0.24, 0.055, 0, IKI_PI);
    ctx.fillStyle = '#1c120a';
    ctx.fill();
  }
}

const KIRPI = { koyu: '#5c3f28', acik: '#9a7448', uc: '#c9a06a', yuz: '#e6c79c' };

function dikenler(n, r0, r1, ox, oy) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * IKI_PI;
    const r = i % 2 ? r1 : r0;
    p.push(Math.cos(a) * r * ox, Math.sin(a) * r * oy);
  }
  return p;
}

/** Dikenli kubbe çokgenleri (bir kez hesaplanır): yürürken oval, top olunca yuvarlak. */
const KUBBE = {
  yuru: { taban: dikenler(26, 0.64, 0.82, 1, 0.76), ic: dikenler(26, 0.5, 0.64, 0.92, 0.7) },
  top: { taban: dikenler(26, 0.64, 0.82, 0.8, 0.8), ic: dikenler(26, 0.5, 0.64, 0.74, 0.74) },
};

export function kirpiCiz(ctx, k) {
  const { f, isik, eb, top, ayrinti } = k;
  if (!top) {
    for (const s of [-1, 1]) {
      const ofs = Math.sin(f + (s > 0 ? 0 : Math.PI)) * 0.14;
      elipsBoya(ctx, 0.5 + ofs, s * 0.4, 0.14, 0.09, '#a07a58', eb);
      elipsBoya(ctx, -0.35 - ofs, s * 0.4, 0.14, 0.09, '#a07a58', eb);
    }
    ikiTon(ctx, 0.85, 0, 0.36, 0.26, '#c4a07a', KIRPI.yuz, isik, eb);
    for (const s of [-1, 1]) elipsBoya(ctx, 0.66, s * 0.27, 0.1, 0.1, '#a07a58', eb);
  }
  const kubbe = top ? KUBBE.top : KUBBE.yuru;
  yolla(ctx, () => cokgen(ctx, kubbe.taban), KIRPI.koyu, eb);
  ctx.save();
  ctx.translate(isik[0] * 0.07, isik[1] * 0.07);
  ctx.beginPath();
  cokgen(ctx, kubbe.ic);
  ctx.fillStyle = KIRPI.acik;
  ctx.fill();
  ctx.restore();
  if (ayrinti) {
    ctx.strokeStyle = KIRPI.uc; // diken uçları: açık sıcak çizgiler
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * 0.9 + 0.3;
      const r = 0.18 + (i % 3) * 0.13;
      ctx.moveTo(Math.cos(a) * r - 0.05, Math.sin(a) * r * 0.8);
      ctx.lineTo(Math.cos(a) * r + 0.1, Math.sin(a) * r * 0.8 - 0.02);
    }
    ctx.stroke();
  }
  if (!top) {
    elipsBoya(ctx, 1.19, 0, 0.07, 0.065, '#1c120a', eb);
    if (ayrinti) {
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(1.01, s * 0.13);
        ctx.arc(0.97, s * 0.13, 0.04, 0, IKI_PI);
      }
      ctx.fillStyle = '#1c120a';
      ctx.fill();
    }
  }
}
