/**
 * Silindirik saman balyası çizimi (kuş bakışı): yanlamasına yatan silindirin kenarları
 * koyu, ortası açık; ip ve saman çizgileri. Açıldığında (acik, acilma 0..1) balya küçülür
 * ve arkasında düz bir saman şeridi uzanır. Yön (yon) balyanın yuvarlanma yönüdür.
 */
import {
  GOLGE_RENGI, donuk, doldur, golgeKayma, isikYerel, serit, yuvarDik,
} from './ortak.js';

const BOY = 1.5;
const CAP = 1.4;
const SERIT_UZUNLUK = 3.4;

/** Dizin ve tohumdan [0, 1) sahte rastgele (çizim kararlı kalsın diye). */
function sahte(i, tohum) {
  const v = Math.sin(i * 127.1 + tohum * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Açılmış saman şeridi: düzensiz kenarlı, çizgili halı (x0'dan geriye uzar). */
function seritCiz(ctx, x0, uzunluk, tohum) {
  if (uzunluk <= 0.02) return;
  yuvarDik(ctx, x0 - uzunluk, -BOY / 2, uzunluk, BOY, 0.12);
  doldur(ctx, '#d8b457');
  const n = 11;
  for (let i = 0; i < n; i++) {
    const y = -BOY / 2 + 0.07 + (i * (BOY - 0.14)) / (n - 1);
    const eksik = sahte(i, tohum) * 0.4 * uzunluk;
    const renkDegeri = i % 2 ? 'rgba(246, 224, 140, 0.8)' : 'rgba(150, 105, 35, 0.4)';
    serit(ctx, x0 - 0.05, y, x0 - uzunluk + eksik * 0.3, y, 0.07, renkDegeri);
  }
  ctx.fillStyle = '#c9a249';
  for (let i = 0; i < 8; i++) {
    const y = -BOY / 2 + sahte(i, tohum + 3) * BOY;
    ctx.fillRect(x0 - uzunluk - 0.05, y, 0.12 + sahte(i, tohum + 5) * 0.18, 0.06);
  }
}

function silindir(ctx, olcek, isik) {
  const yar = (CAP * olcek) / 2;
  const w = yar * 2;
  yuvarDik(ctx, -yar, -BOY / 2, w, BOY, 0.22);
  doldur(ctx, '#b58a3a');
  const bantlar = [[0.82, '#cfa64c'], [0.55, '#e2bf63'], [0.3, '#f0d57d']];
  for (const [oran, renkDegeri] of bantlar) {
    const g = w * oran;
    yuvarDik(ctx, -g / 2 + isik[0] * yar * 0.12, -BOY / 2 + 0.05, g, BOY - 0.1, 0.18);
    doldur(ctx, renkDegeri);
  }
  ctx.strokeStyle = 'rgba(120, 82, 22, 0.35)';
  ctx.lineWidth = 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const y = -BOY / 2 + 0.1 + sahte(i, 1) * (BOY - 0.2);
    const x = (sahte(i, 2) - 0.5) * (w - 0.3);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.14 + sahte(i, 4) * 0.18, y + (sahte(i, 6) - 0.5) * 0.06);
  }
  ctx.stroke();
  for (const v of [-0.46, 0, 0.46]) {
    serit(ctx, -yar + 0.03, v, yar - 0.03, v, 0.05, 'rgba(176, 62, 40, 0.75)');
  }
  yuvarDik(ctx, -yar, -BOY / 2, w, BOY, 0.22);
  ctx.strokeStyle = 'rgba(90, 58, 14, 0.5)';
  ctx.lineWidth = 0.05;
  ctx.stroke();
  // Uçlardaki sarmal saman kesiti.
  for (const u of [-1, 1]) serit(ctx, -yar + 0.1, u * (BOY / 2 - 0.04), yar - 0.1,
    u * (BOY / 2 - 0.04), 0.06, 'rgba(255, 240, 170, 0.4)');
}

/** Balyayı çizer: balya { x, y, yon, acik, acilma }. */
export function balyaCiz(ctx, balya, zaman) {
  const ac = balya.acik ? Math.min(1, Math.max(0, balya.acilma || 0)) : 0;
  const olcek = 1 - 0.8 * ac;
  const isik = isikYerel(balya.yon || 0);
  const tohum = Math.floor((balya.x || 0) * 7 + (balya.y || 0) * 13);
  const [gx, gy] = golgeKayma(0);
  donuk(ctx, balya.x + gx * 0.5, balya.y + gy * 0.5, balya.yon || 0, 1, (c) => {
    c.fillStyle = GOLGE_RENGI;
    yuvarDik(c, -CAP * olcek / 2 - SERIT_UZUNLUK * ac, -BOY / 2,
      CAP * olcek + SERIT_UZUNLUK * ac, BOY, 0.2);
    c.fill();
  });
  donuk(ctx, balya.x, balya.y, balya.yon || 0, 1, (c) => {
    seritCiz(c, -CAP * olcek / 2 + 0.1, SERIT_UZUNLUK * ac, tohum);
    silindir(c, olcek, isik);
  });
}
