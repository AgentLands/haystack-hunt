/**
 * Kedi çizimi (tepeden, +x ileri): uyuyan yumak (nefes alır, kuyruk sarılı, ardında 'z'
 * işaretleri), esneyen, yürüyen ve oturup kuyruk sallayan kedi. Tekir: turuncu tüy,
 * koyu şeritler, pembe burun.
 */
import { cizgiBoya, cokgen, elipsBoya, ikiTon, yolla } from './ortak.js';

const KEDI = { koyu: '#b06a28', acik: '#e5a055', serit: '#8a4e1c', burun: '#e08a86' };

/** Baş (hx, hy, r) için yanlara ve geriye dönük iki üçgen kulak; baştan ÖNCE çizilir. */
function kulaklar(ctx, hx, hy, r, eb) {
  for (const s of [-1, 1]) {
    yolla(ctx, () => cokgen(ctx, [hx + 0.25 * r, hy + s * 0.4 * r, hx - 0.6 * r,
      hy + s * 0.7 * r, hx - 0.1 * r, hy + s * 1.75 * r]), KEDI.koyu, eb);
    ctx.beginPath(); // iç kulak: pembe, dış hatsız
    cokgen(ctx, [hx - 0.05 * r, hy + s * 0.85 * r, hx - 0.35 * r, hy + s * 0.95 * r,
      hx - 0.1 * r, hy + s * 1.45 * r]);
    ctx.fillStyle = KEDI.burun;
    ctx.fill();
  }
}

/** Yüz: gözler (kapalıysa kısa çizgi), burun ve esnerken açılan ağız. */
function yuz(ctx, x, y, r, kapali, agiz, eb) {
  for (const s of [-1, 1]) {
    if (kapali) {
      cizgiBoya(ctx, [x + r * 0.35, y + s * r * 0.55, x + r * 0.5, y + s * r * 0.4], 0.05,
        '#1c120a', 0);
    } else {
      elipsBoya(ctx, x + r * 0.38, y + s * r * 0.42, r * 0.16, r * 0.14, '#1c120a', eb * 0.3);
    }
  }
  if (agiz) elipsBoya(ctx, x + r * 0.62, y, r * 0.4 * agiz, r * 0.34 * agiz, '#8a2f35', eb * 0.5);
  elipsBoya(ctx, x + r * 0.92, y, r * 0.13, r * 0.1, KEDI.burun, eb * 0.4);
}

function seritler(ctx, xs, ry, ayrinti = true) {
  if (!ayrinti) return;
  ctx.strokeStyle = KEDI.serit;
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const x of xs) {
    ctx.moveTo(x, -ry);
    ctx.lineTo(x - 0.04, -ry * 0.45);
    ctx.moveTo(x, ry);
    ctx.lineTo(x - 0.04, ry * 0.45);
  }
  ctx.stroke();
}

/** Uyuyan yumak: nefes alıp verir. */
export function kediUyku(ctx, k) {
  const { isik, eb, nefes, ayrinti } = k;
  const sc = 1 + 0.035 * nefes;
  ctx.save();
  ctx.scale(sc, sc);
  const kuyruk = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.52 + i * 0.1);
    kuyruk.push(Math.cos(a) * 0.82, Math.sin(a) * 0.62);
  }
  cizgiBoya(ctx, kuyruk, 0.22, KEDI.koyu, eb);
  ikiTon(ctx, 0, 0, 0.82, 0.6, KEDI.koyu, KEDI.acik, isik, eb);
  seritler(ctx, [-0.4, -0.15, 0.1], 0.5, ayrinti);
  kulaklar(ctx, 0.52, 0.08, 0.3, eb);
  ikiTon(ctx, 0.52, 0.08, 0.3, 0.28, KEDI.koyu, KEDI.acik, isik, eb);
  yuz(ctx, 0.52, 0.08, 0.28, true, 0, eb);
  ctx.restore();
}

/** Esneme / yürüme / oturma (poz: 'esneme' | 'yuru' | 'otur'). */
export function kediAyakta(ctx, k) {
  const { isik, eb, poz, f, t, ayrinti } = k;
  if (poz === 'otur') return kediOtur(ctx, k);
  const ger = poz === 'esneme' ? 0.14 * Math.sin(Math.min(1, t / 1.6) * Math.PI) : 0;
  const sal = poz === 'yuru' ? Math.sin(f) : 0;
  const kuyruk = [];
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    kuyruk.push(-0.62 - u * 0.85,
      Math.sin(f * 0.5 - u * 3.2) * 0.2 * u + (poz === 'yuru' ? 0 : 0.1 * u));
  }
  cizgiBoya(ctx, kuyruk, 0.15, KEDI.koyu, eb);
  for (const s of [-1, 1]) {
    const o = sal * 0.2 * s;
    elipsBoya(ctx, 0.5 + o, s * 0.34, 0.14, 0.09, KEDI.serit, eb);
    elipsBoya(ctx, -0.5 - o, s * 0.34, 0.15, 0.09, KEDI.serit, eb);
  }
  ikiTon(ctx, -0.1, 0, 0.72 + ger, 0.38, KEDI.koyu, KEDI.acik, isik, eb);
  seritler(ctx, [-0.45, -0.2, 0.05], 0.32, ayrinti);
  const agiz = poz === 'esneme' ? Math.sin(Math.min(1, t / 1.6) * Math.PI) : 0;
  kulaklar(ctx, 0.85 + ger, 0, 0.32, eb);
  ikiTon(ctx, 0.85 + ger, 0, 0.32, 0.3, KEDI.koyu, KEDI.acik, isik, eb);
  yuz(ctx, 0.85 + ger, 0, 0.32, poz === 'esneme' && agiz < 0.3, agiz, eb);
}

function kediOtur(ctx, k) {
  const { isik, eb, f, ayrinti } = k;
  const kuyruk = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (-0.25 - i * 0.12) + Math.sin(f * 0.4) * 0.12 * (i / 8);
    kuyruk.push(Math.cos(a) * 0.74 - 0.05, Math.sin(a) * 0.62 + 0.25);
  }
  cizgiBoya(ctx, kuyruk, 0.19, KEDI.koyu, eb);
  ikiTon(ctx, -0.1, 0, 0.55, 0.5, KEDI.koyu, KEDI.acik, isik, eb);
  seritler(ctx, [-0.3, -0.1], 0.42, ayrinti);
  for (const s of [-1, 1]) elipsBoya(ctx, 0.3, s * 0.3, 0.2, 0.1, KEDI.acik, eb);
  kulaklar(ctx, 0.45, 0, 0.3, eb);
  ikiTon(ctx, 0.45, 0, 0.3, 0.29, KEDI.koyu, KEDI.acik, isik, eb);
  yuz(ctx, 0.45, 0, 0.3, Math.sin(f * 0.3) > 0.97, 0, eb);
}
