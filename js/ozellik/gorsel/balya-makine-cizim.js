/**
 * Balya makinesi çizimi (kuş bakışı): yeşil gövde, önde dönen toplayıcı tambur, ortada
 * içindeki balyanın büyüdüğü gözlem penceresi ve doluluk halkası (yuk 0..1), arkada balya
 * çıkış ağzı; sürücü koltukta; calisiyor iken tambur çizgileri döner, motor açıkken
 * hafif duman.
 */
import {
  IKI_PI, bisel, donuk, doldur, elips, isikYerel, renk, serit, tekerlek, yuvarDik,
} from './ortak.js';
import { oturanCiftci } from './ciftci-parca.js';
import { dumanCiz, izleriCiz, kutuGolgesi, makineBilgi } from './makine-ortak.js';

const TEKERLEKLER = [[-0.3, -1.6, 1.6, 0.8], [-0.3, 1.6, 1.6, 0.8]];
const KAYMA_X = -0.1;

/** Toplayıcı tambur: gri gövde, dönerken yüzeyde gidip gelen dişli çizgiler. */
function tambur(ctx, k, s) {
  bisel(ctx, 2.05, -1.4, 0.75, 2.8, 0.28, [-0.6, -0.8], '#5d6469', '#8a9298', s);
  ctx.lineCap = 'butt';
  ctx.setLineDash([0.1, 0.12]);
  for (let i = 0; i < 5; i++) {
    const faz = k.calis ? k.t * 9 + i * 1.256 : i * 1.256;
    const x = 2.43 + 0.24 * Math.sin(faz);
    const alfa = 0.35 + 0.35 * Math.max(0, Math.cos(faz));
    ctx.strokeStyle = `rgba(35, 40, 44, ${alfa.toFixed(2)})`;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(x, -1.3);
    ctx.lineTo(x, 1.3);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const v of [-1, 1]) serit(ctx, 2.0, v * 1.4, 2.85, v * 1.4, 0.1, renk('#3f4549', s));
}

/** Balyalama odasındaki pencere: büyüyen balya ve çevresinde doluluk halkası. */
function pencere(ctx, k, s) {
  const cx = -0.75;
  elips(ctx, cx, 0, 0.95, 0.95);
  doldur(ctx, renk('#2b2a20', s));
  if (k.yuk > 0.01) {
    const r = 0.1 + 0.8 * k.yuk;
    elips(ctx, cx, 0, r, r);
    doldur(ctx, renk('#dcb95c', s));
    ctx.strokeStyle = renk('#a98230', s);
    ctx.lineWidth = 0.04;
    for (let i = 1; i <= 3; i++) {
      if (r * i / 4 < 0.1) continue;
      elips(ctx, cx, 0, r * i / 4, r * i / 4);
      ctx.stroke();
    }
    elips(ctx, cx - 0.1 * r, -0.12 * r, r * 0.45, r * 0.4);
    doldur(ctx, 'rgba(255, 244, 200, 0.28)');
  }
  const dolu = k.yuk >= 0.98;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.arc(cx, 0, 1.05, 0, IKI_PI);
  ctx.stroke();
  if (k.yuk > 0.01) {
    ctx.strokeStyle = dolu && Math.sin(k.t * 8) > 0 ? '#ff6a3d' : renk('#f4c842', s);
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.arc(cx, 0, 1.05, -Math.PI / 2, -Math.PI / 2 + IKI_PI * k.yuk);
    ctx.stroke();
  }
}

function govde(ctx, makine, k, isik) {
  const s = k.sonuk;
  for (const [x, y, uzun, en] of TEKERLEKLER) tekerlek(ctx, x, y, uzun, en, k.kayma, s);
  // Arka çıkış ağzı: koyu açıklık ve iki ray.
  yuvarDik(ctx, -3.1, -0.95, 1.0, 1.9, 0.12);
  doldur(ctx, renk('#2b2d28', s));
  for (const v of [-0.62, 0.62]) serit(ctx, -3.05, v, -2.2, v, 0.12, renk('#7d8388', s));
  serit(ctx, -2.7, -0.8, -2.7, 0.8, 0.05, renk('#555b60', s));
  // Balyalama odası ve ön boyun.
  bisel(ctx, -2.4, -1.25, 3.4, 2.5, 0.3, isik, '#2c6d34', '#3f9348', s);
  for (const x of [-2.0, -0.3, 0.45]) serit(ctx, x, -1.15, x, 1.15, 0.05, renk('#2c6d34', s));
  bisel(ctx, 0.9, -0.8, 1.3, 1.6, 0.2, isik, '#2c6d34', '#46a24f', s);
  serit(ctx, 0.95, -1.18, 0.95, 1.18, 0.1, renk('#f1c232', s));
  pencere(ctx, k, s);
  // Koltuk ve direksiyon.
  yuvarDik(ctx, 1.1, -0.38, 0.5, 0.76, 0.14);
  doldur(ctx, renk('#33261d', s));
  ctx.strokeStyle = renk('#262626', s);
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.arc(1.8, 0, 0.27, 0, IKI_PI);
  ctx.stroke();
  serit(ctx, 1.8, -0.27, 1.8, 0.27, 0.05, renk('#262626', s));
  if (makine.surucu) oturanCiftci(ctx, 1.35, 0, isik);
  tambur(ctx, k, s);
  // Egzoz.
  elips(ctx, 0.75, -0.55, 0.07, 0.07);
  doldur(ctx, '#1d1b19');
}

/** Balya makinesini çizer: makine { x, y, yon, hiz, yakit, surucu, calisiyor, yuk }. */
export function balyaMakineCiz(ctx, makine, zaman) {
  const k = makineBilgi(makine, zaman);
  const isik = isikYerel(makine.yon);
  kutuGolgesi(ctx, makine, [
    [-3.1 + KAYMA_X, -1.3, 3.4, 2.6, 0.4], [-1.0 + KAYMA_X, -1.8, 1.4, 3.6, 0.3],
    [0.9 + KAYMA_X, -1.4, 2.0, 2.8, 0.3],
  ]);
  donuk(ctx, makine.x, makine.y, makine.yon, 1, (c) => {
    c.translate(KAYMA_X, 0);
    izleriCiz(c, TEKERLEKLER, k.hiz);
    c.translate(0, k.titre);
    govde(c, makine, k, isik);
  });
  if (k.motorAcik) dumanCiz(ctx, makine, 0.75 + KAYMA_X, -0.55, 0.35 + (k.calis ? 0.3 : 0), k.t);
}
