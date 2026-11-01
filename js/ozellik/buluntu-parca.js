/**
 * Buluntu çiziminin küçük yardımcıları: koyu kahve dış hatlı dolgu, kalın çizgi ve yay, tek
 * tuşla "silüet" kipi (defterde bulunmamış eşyalar). Yerel uzay: eşya yarıçapı ~1 birim; dış hat
 * kalınlığı ekranda ~1.2 piksel kalsın diye çağıran `birim` (1 piksel = kaç yerel birim) verir.
 */
import { IKI_PI, ekranBirim } from './gorsel/ortak.js';

export const HAT = '#2a1a0d';
const SILUET_DOLGU = '#b9a27a';
const SILUET_HAT = '#9c8660';

let kalinlik = 0.05;
let siluet = false;

/** Yerel uzayda 1 CSS pikseli (DPR'dan bağımsız). */
export { ekranBirim };

/** Bir çizimden önce çağrılır: dış hat kalınlığı ve silüet kipi. */
export function kipAyarla(birim, siluetMi) {
  kalinlik = Math.max(birim * 1.2, 0.03);
  siluet = siluetMi;
}

const dolguRengi = (c) => (siluet ? SILUET_DOLGU : c);
const hatRengi = () => (siluet ? SILUET_HAT : HAT);

/** Geçerli yolu doldurur ve dış hatlar. */
export function parca(ctx, dolgu) {
  ctx.lineJoin = 'round';
  ctx.fillStyle = dolguRengi(dolgu);
  ctx.fill();
  ctx.strokeStyle = hatRengi();
  ctx.lineWidth = kalinlik;
  ctx.stroke();
}

export function daire(ctx, x, y, r, dolgu) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, IKI_PI);
  parca(ctx, dolgu);
}

export function cokgen(ctx, noktalar, dolgu) {
  ctx.beginPath();
  noktalar.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  parca(ctx, dolgu);
}

export function dik(ctx, x, y, w, h, r, dolgu) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  parca(ctx, dolgu);
}

/** Dış hatsız küçük leke (delik, nokta, ışık); silüette çizilmez. */
export function nokta(ctx, x, y, r, renk) {
  if (siluet) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, IKI_PI);
  ctx.fillStyle = renk;
  ctx.fill();
}

function kalinCiz(ctx, yol, genislik, renk) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  yol(ctx);
  ctx.strokeStyle = hatRengi();
  ctx.lineWidth = genislik + kalinlik * 2;
  ctx.stroke();
  ctx.strokeStyle = dolguRengi(renk);
  ctx.lineWidth = genislik;
  ctx.stroke();
}

/** Kalın, dış hatlı çoklu çizgi (noktalar: [[x, y], ...]). */
export function kalin(ctx, noktalar, genislik, renk) {
  kalinCiz(ctx, (c) => noktalar.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))),
    genislik, renk);
}

/** Kalın, dış hatlı yay (a0 → a1 radyan, saat yönünde). */
export function kemer(ctx, x, y, r, a0, a1, genislik, renk) {
  kalinCiz(ctx, (c) => c.arc(x, y, r, a0, a1), genislik, renk);
}

/** İnce, dış hatsız çizgi (ışık, çentik, yazı çizgisi); silüette çizilmez. */
export function ince(ctx, noktalar, genislik, renk) {
  if (siluet) return;
  ctx.lineCap = 'round';
  ctx.beginPath();
  noktalar.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = renk;
  ctx.lineWidth = genislik;
  ctx.stroke();
}
