/**
 * Silindirik saman balyası çizimi (kuş bakışı, boyalı oyuncak): yanlamasına yatan silindir;
 * dış hatlı, yıpranmış koyu dış katman, ortası açık (2 tonlu), file çizgileri, ışık
 * tarafındaki uçta sarmal kesit yüzü (sahte 3/4) ve yüksekliğine uygun uzun gölge. Yeni
 * bırakılan balya ('balya-birakildi') makinenin odasından dönerek yuvarlanıp yerine gelir.
 * Açıldığında (acik, acilma 0..1) balya küçülür ve arkasında düz bir saman şeridi uzanır.
 * Yön (yon) yuvarlanma yönüdür. Görsel boy kuraldaki BALYA_YARICAP'tan bağımsızdır.
 */
import { dinle } from '../../olaylar.js';
import { donuk, ekranBirim, elips, golgeKayma, isikYerel, serit, yuvarDik } from './ortak.js';
import { MAKINE_GOLGE, hat } from './makine-ortak.js';

const BOY = 1.75;
const CAP = 1.8;
const SERIT_UZUNLUK = 3.4;
/** Yuvarlanarak çıkış: süre (sn) ve başlangıçta yerinden ne kadar önde (makineye doğru). */
const YUVARLAN_SURE = 0.75;
const YUVARLAN_YOL = 2.1;
const yeniBalyalar = new WeakSet();
const cikisAni = new WeakMap();

dinle('balya-birakildi', ({ balya }) => {
  if (balya) yeniBalyalar.add(balya);
});

/** Dizin ve tohumdan [0, 1) sahte rastgele (çizim kararlı kalsın diye). */
function sahte(i, tohum) {
  const v = Math.sin(i * 127.1 + tohum * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Yuvarlanma ilerlemesi 0..1 (1: yerinde); yalnız yeni bırakılan balyada < 1 olur. */
function yuvarlanma(balya, t) {
  if (yeniBalyalar.has(balya)) {
    yeniBalyalar.delete(balya);
    cikisAni.set(balya, t);
  }
  const bas = cikisAni.get(balya);
  if (bas === undefined) return 1;
  const p = Math.min(1, Math.max(0, (t - bas) / YUVARLAN_SURE));
  if (p >= 1) cikisAni.delete(balya);
  return p;
}

/** Açılmış saman şeridi: tek tonlu halı ve üç vurgu çizgisi (x0'dan geriye uzar). */
function seritCiz(ctx, x0, uzunluk, tohum, eb) {
  if (uzunluk <= 0.02) return;
  yuvarDik(ctx, x0 - uzunluk, -BOY / 2 + 0.05, uzunluk, BOY - 0.1, 0.14);
  hat(ctx, '#d3ad55', eb, 0.8);
  for (const [i, y] of [[0, -0.42], [1, 0.05], [2, 0.5]]) {
    const eksik = sahte(i, tohum) * 0.35 * uzunluk;
    serit(ctx, x0 - 0.1, y, x0 - uzunluk + 0.15 + eksik, y, 0.08, 'rgba(246, 226, 150, 0.85)');
  }
}

/** Uç yüz: ışık tarafındaki eksen ucunda ince elips ve sarmal (sahte 3/4 görünüm). */
function ucYuz(ctx, yar, isik, don, eb) {
  const u = isik[1] < 0 ? -1 : 1;
  const ry = 0.12 + 0.16 * Math.abs(isik[1]);
  const cy = u * (BOY / 2);
  elips(ctx, 0, cy, yar * 0.98, ry);
  hat(ctx, '#e6c873', eb, 0.9);
  ctx.strokeStyle = 'rgba(150, 105, 35, 0.75)';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 6; a += 0.3) {
    const r = a / (Math.PI * 6);
    const x = Math.cos(a + don) * r * yar * 0.9;
    const y = cy + Math.sin(a + don) * r * ry * 0.9;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** Silindir gövdesi: dış hatlı koyu dış katman, açık orta bant, file ve saman çizgileri. */
function silindir(ctx, olcek, isik, don, eb) {
  const yar = (CAP * olcek) / 2;
  const w = yar * 2;
  yuvarDik(ctx, -yar, -BOY / 2, w, BOY, 0.3 * olcek);
  hat(ctx, '#a07c34', eb);
  const g = w * 0.62;
  yuvarDik(ctx, -g / 2 + isik[0] * yar * 0.22, -BOY / 2 + 0.06, g, BOY - 0.12, 0.2 * olcek);
  ctx.fillStyle = '#d8b85a';
  ctx.fill();
  yuvarDik(ctx, -g * 0.22 + isik[0] * yar * 0.38, -BOY / 2 + 0.1, g * 0.36, BOY - 0.2, 0.1);
  ctx.fillStyle = '#ecd283';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110, 76, 20, 0.45)';
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const y = -BOY / 2 + 0.12 + sahte(i, 1) * (BOY - 0.24);
    const x = (sahte(i, 2) - 0.5) * (w - 0.35);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.14 + sahte(i, 4) * 0.16, y + (sahte(i, 6) - 0.5) * 0.06);
  }
  ctx.stroke();
  // File: dönüşle kayan, eksene paralel ince çizgiler (silindirin çevresi).
  ctx.strokeStyle = 'rgba(245, 240, 225, 0.55)';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = Math.sin(don + i * 0.75) * yar * 0.88;
    if (Math.cos(don + i * 0.75) < 0) continue;
    ctx.moveTo(x, -BOY / 2 + 0.08);
    ctx.lineTo(x, BOY / 2 - 0.08);
  }
  ctx.stroke();
  for (const v of [-0.5, 0.5]) serit(ctx, -yar + 0.04, v, yar - 0.04, v, 0.06, '#9c2f1f');
}

/** Balyayı çizer: balya { x, y, yon, acik, acilma }; zaman ms. */
export function balyaCiz(ctx, balya, zaman) {
  const t = zaman / 1000;
  const ac = balya.acik ? Math.min(1, Math.max(0, balya.acilma || 0)) : 0;
  const olcek = 1 - 0.8 * ac;
  const yon = balya.yon || 0;
  const isik = isikYerel(yon);
  const tohum = Math.floor((balya.x || 0) * 7 + (balya.y || 0) * 13);
  const p = yuvarlanma(balya, t);
  const kalan = (1 - p) * (1 - p);
  const geri = YUVARLAN_YOL * kalan;
  const x = balya.x + Math.cos(yon) * geri;
  const y = balya.y + Math.sin(yon) * geri;
  const don = -geri / (CAP / 2);
  const [gx, gy] = golgeKayma(100 * olcek);
  const gu = Math.hypot(gx, gy);
  donuk(ctx, x, y, yon, 1, (c) => {
    // Uzun gölge: ışığın tersine üç basamakta uzayan yuvarlak dikdörtgenlerin birleşimi.
    c.fillStyle = MAKINE_GOLGE;
    c.beginPath();
    const w = CAP * olcek + SERIT_UZUNLUK * ac;
    const x0 = -CAP * olcek / 2 - SERIT_UZUNLUK * ac;
    for (const f of [0.4, 0.7, 1]) {
      const ox = -isik[0] * gu * f;
      const oy = -isik[1] * gu * f;
      const r = 0.45;
      const [bx, by, bw, bh] = [x0 + ox, -BOY / 2 + oy, w, BOY];
      c.moveTo(bx + r, by);
      c.arcTo(bx + bw, by, bx + bw, by + bh, r);
      c.arcTo(bx + bw, by + bh, bx, by + bh, r);
      c.arcTo(bx, by + bh, bx, by, r);
      c.arcTo(bx, by, bx + bw, by, r);
      c.closePath();
    }
    c.fill();
  });
  donuk(ctx, x, y, yon, 1, (c) => {
    const eb = ekranBirim(c);
    seritCiz(c, -CAP * olcek / 2 + 0.1, SERIT_UZUNLUK * ac, tohum, eb);
    silindir(c, olcek, isik, don, eb);
    ucYuz(c, (CAP * olcek) / 2, isik, don, eb);
  });
}
