/**
 * Bulma anı: iğne samandan çekilip havaya kalkar (yerdeki eski çizimi tarla yamasıyla
 * örtülür), altın ışık halkası ve ışıma yayılır; bitiş penceresi kısa bir gecikmeyle
 * belirir ki efekt görünsün (pencere hemen açılır, yalnız görünüşü gecikir).
 */
import { OLCEK, igneModeli, igneYariBoyu } from '../../cizim.js';
import { yildizIsigi } from './isiltilar.js';

const KALKIS = 700;
const YUKSEKLIK = 18;
let bulma = null;
const yama = document.createElement('canvas');
const yctx = yama.getContext('2d');

const STIL = `
dialog#bitis[open].efekt-gecikme,
dialog#bitis[open].efekt-gecikme::backdrop {
  animation: efekt-belir 0.35s ease-out 0.6s both;
}
@keyframes efekt-belir {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  dialog#bitis[open].efekt-gecikme,
  dialog#bitis[open].efekt-gecikme::backdrop { animation-name: efekt-sade; }
  @keyframes efekt-sade { from { opacity: 0; } to { opacity: 1; } }
}`;

export function stilEkle() {
  const stil = document.createElement('style');
  stil.textContent = STIL;
  document.head.append(stil);
}

export function bulmaBaslat(igne, zaman) {
  bulma = { igne: { ...igne }, bas: zaman };
  document.getElementById('bitis').classList.add('efekt-gecikme');
}

export function bulmaSifirla() {
  bulma = null;
  document.getElementById('bitis').classList.remove('efekt-gecikme');
}

/** 1 ekran pikselinin dünya boyu. */
function ekranPikseli(ctx) {
  const m = ctx.getTransform();
  return 1 / Math.hypot(m.a, m.b);
}

/** İğnenin yerdeki izini (gölgesi ve dış hattıyla) kaplayan döndürülmüş dikdörtgen. */
function igneYolu(ctx, igne) {
  const mx = (igne.x + 0.5) * OLCEK;
  const my = (igne.y + 0.5) * OLCEK;
  const eb = ekranPikseli(ctx);
  const h = igneYariBoyu(eb) + 4 * eb;
  ctx.beginPath();
  ctx.save();
  ctx.translate(mx + eb, my + eb);
  ctx.rotate(igne.aci);
  ctx.rect(-h, -6 * eb, 2 * h, 12 * eb);
  ctx.restore();
}

/** Alt katman: iğne çizilmeden önce, iğnenin çevresindeki tarlayı yamaya kopyalar. */
export function yamaAl(ctx) {
  if (!bulma) return;
  const m = ctx.getTransform();
  const mx = (bulma.igne.x + 0.5) * OLCEK;
  const my = (bulma.igne.y + 0.5) * OLCEK;
  const r = OLCEK * 4;
  const a = m.transformPoint(new DOMPoint(mx - r, my - r));
  const b = m.transformPoint(new DOMPoint(mx + r, my + r));
  const x = Math.floor(Math.min(a.x, b.x));
  const y = Math.floor(Math.min(a.y, b.y));
  const en = Math.ceil(Math.abs(b.x - a.x)) + 2;
  const boy = Math.ceil(Math.abs(b.y - a.y)) + 2;
  if (yama.width !== en || yama.height !== boy) Object.assign(yama, { width: en, height: boy });
  yctx.clearRect(0, 0, en, boy);
  yctx.drawImage(ctx.canvas, x, y, en, boy, 0, 0, en, boy);
  bulma.yamaYeri = { x, y };
}

function yamayiSer(ctx) {
  if (!bulma.yamaYeri) return;
  ctx.save();
  igneYolu(ctx, bulma.igne);
  ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(yama, bulma.yamaYeri.x, bulma.yamaYeri.y);
  ctx.restore();
}

function cizgi(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Bulma anının ilk yarım saniyesi: ekran-sabit keskin altın halka hızla açılır, ortada
 * sekiz ışınlı patlama söner (çizim 'lighter' karışımda).
 */
function parlamaHalkasi(ctx, mx, my, t, eb) {
  const v = t / 520;
  if (v >= 1) return;
  const a = 1 - v;
  ctx.strokeStyle = `rgba(255, 236, 160, ${(0.95 * a).toFixed(3)})`;
  ctx.lineWidth = (2 + 4 * a) * eb;
  ctx.beginPath();
  ctx.arc(mx, my, (10 + 70 * (1 - a * a)) * eb, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 * eb;
  ctx.strokeStyle = `rgba(255, 250, 225, ${a.toFixed(3)})`;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const aci = (i * Math.PI) / 4 + 0.2;
    const ic = (8 + 30 * v) * eb;
    const dis = ic + (i % 2 ? 10 : 22) * a * eb;
    ctx.moveTo(mx + Math.cos(aci) * ic, my + Math.sin(aci) * ic);
    ctx.lineTo(mx + Math.cos(aci) * dis, my + Math.sin(aci) * dis);
  }
  ctx.stroke();
}

/** Üst katman: yama, gölge, ışıma, halka ve kalkan iğne. */
export function bulmaCiz(ctx, zaman, hareketli) {
  if (!bulma) return;
  const t = Math.max(0, zaman - bulma.bas);
  const u = Math.min(1, t / KALKIS);
  const kalk = 1 - (1 - u) ** 3;
  const salinim = hareketli ? Math.sin(t / 260) * 1.5 * u : 0;
  const z = YUKSEKLIK * kalk + salinim;
  const { igne } = bulma;
  const mx = (igne.x + 0.5) * OLCEK;
  const my = (igne.y + 0.5) * OLCEK;
  const hedefAci = -Math.PI / 4;
  const fark = Math.atan2(Math.sin(hedefAci - igne.aci), Math.cos(hedefAci - igne.aci));
  const aci = igne.aci + fark * kalk;
  yamayiSer(ctx);
  ctx.save();
  const eb = ekranPikseli(ctx);
  ctx.globalAlpha = 0.4 * (1 - kalk * 0.5);
  ctx.strokeStyle = 'rgb(30, 18, 6)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3 * eb;
  const gx = mx + z * 0.5;
  const gy = my + z * 0.5;
  const dx = Math.cos(aci) * igneYariBoyu(eb);
  const dy = Math.sin(aci) * igneYariBoyu(eb);
  cizgi(ctx, gx - dx, gy - dy, gx + dx, gy + dy);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  const parla = Math.min(1, t / 150) * (1 - 0.55 * u);
  const g = ctx.createRadialGradient(mx, my - z, 0, mx, my - z, 70);
  g.addColorStop(0, `rgba(255, 225, 140, ${0.3 * parla})`);
  g.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(mx - 70, my - z - 70, 140, 140);
  for (const [gecikme, boy] of [[0, 90], [160, 60]]) {
    const v = (t - gecikme) / 900;
    if (v <= 0 || v >= 1) continue;
    const r = 6 + boy * (1 - (1 - v) ** 2);
    ctx.strokeStyle = `rgba(255, 214, 120, ${(1 - v) * 0.3})`;
    ctx.lineWidth = 9 * (1 - v) + 1;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 246, 210, ${(1 - v) * 0.9})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  parlamaHalkasi(ctx, mx, my, t, eb);
  ctx.globalCompositeOperation = 'source-over';
  const olcek = 1 + 0.45 * kalk;
  igneModeli(ctx, mx, my - z, aci, olcek);
  const pir = (t % 1500) / 1500;
  if (t > KALKIS * 0.6) {
    const yari = igneYariBoyu(eb) * olcek;
    const ux = mx + Math.cos(aci) * yari * (pir * 2 - 1);
    const uy = my - z + Math.sin(aci) * yari * (pir * 2 - 1);
    yildizIsigi(ctx, ux, uy, 7, Math.sin(Math.PI * pir) * 0.9, t / 400);
  }
  ctx.restore();
}
