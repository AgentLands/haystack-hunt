/**
 * Hayvan çizimi ortak yardımcıları: ekran-sabit koyu kahve dış hat (#2a1a0d, boyalı oyuncak
 * stili), iki tonlu cel gölge, yerde kayan gölge ve saman kırıntıları. Yerel çizim uzayı
 * gorsel/ortak.js `donuk` ile kurulur: +x ileri, birim hücre.
 */
import { OLCEK } from '../../cizim.js';
import { gorunum } from '../../gorunum.js';

export { donuk, isikYerel, IKI_PI } from '../gorsel/ortak.js';
import { IKI_PI } from '../gorsel/ortak.js';

export const DIS = '#2a1a0d';
const DIS_KALINLIK = 1.2;
const GOLGE = (yogun) => `rgba(40, 22, 8, ${(0.38 * yogun).toFixed(2)})`;

/** Yerel uzayda 1 ekran pikselinin boyu (hücre) = dış hat kalınlığının birimi. */
export function ekranBirim(ctx) {
  const m = ctx.getTransform();
  return 1 / Math.hypot(m.a, m.b);
}

/** Yolu önce dış hat rengiyle (ekran-sabit), sonra dolgu rengiyle boyar. */
export function yolla(ctx, yol, dolgu, eb) {
  ctx.beginPath();
  yol();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2 * DIS_KALINLIK * eb;
  ctx.strokeStyle = DIS;
  ctx.stroke();
  ctx.fillStyle = dolgu;
  ctx.fill();
}

export function elipsBoya(ctx, cx, cy, rx, ry, dolgu, eb, don = 0) {
  yolla(ctx, () => ctx.ellipse(cx, cy, rx, ry, don, 0, IKI_PI), dolgu, eb);
}

/** İki tonlu elips: koyu taban, ışığa kaymış açık iç yüzey (isik: yerel ışık yönü). */
export function ikiTon(ctx, cx, cy, rx, ry, koyu, acik, isik, eb, don = 0) {
  elipsBoya(ctx, cx, cy, rx, ry, koyu, eb, don);
  ctx.beginPath();
  ctx.ellipse(cx + isik[0] * rx * 0.2, cy + isik[1] * ry * 0.2, rx * 0.76, ry * 0.7, don, 0,
    IKI_PI);
  ctx.fillStyle = acik;
  ctx.fill();
}

/** Çokgen (noktalar: [x, y, ...]) için yol. */
export function cokgen(ctx, n) {
  ctx.moveTo(n[0], n[1]);
  for (let i = 2; i < n.length; i += 2) ctx.lineTo(n[i], n[i + 1]);
  ctx.closePath();
}

/** Dış hatlı kalın çizgi parçası (kuyruk, bacak): noktalar [x, y, ...]. */
export function cizgiBoya(ctx, n, kalinlik, renk, eb) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ciz = () => {
    ctx.beginPath();
    ctx.moveTo(n[0], n[1]);
    for (let i = 2; i < n.length; i += 2) ctx.lineTo(n[i], n[i + 1]);
    ctx.stroke();
  };
  ctx.strokeStyle = DIS;
  ctx.lineWidth = kalinlik + 2 * DIS_KALINLIK * eb;
  ciz();
  ctx.strokeStyle = renk;
  ctx.lineWidth = kalinlik;
  ciz();
}

/** Yerde yumuşak gölge (dünya hücre konumu); yuk (0..1) yükseldikçe kayar, küçülür. */
export function golge(ctx, x, y, rx, ry, yuk = 0, alfa = 1, yogun = 1) {
  ctx.save();
  ctx.globalAlpha = alfa * (1 - 0.35 * yuk);
  ctx.fillStyle = GOLGE(yogun);
  ctx.beginPath();
  const k = 1 - 0.3 * yuk;
  ctx.ellipse((x + 0.22 + yuk * 1.6) * OLCEK, (y + 0.3 + yuk * 2.1) * OLCEK, rx * k * OLCEK,
    ry * k * OLCEK, 0, 0, IKI_PI);
  ctx.fill();
  ctx.restore();
}

/** Saman kırıntısı: (x, y) hücre konumunda aci yönünde kısa iki tonlu çizgi. */
export function samanBit(ctx, x, y, boy, aci, alfa, ton = 0) {
  const px = x * OLCEK;
  const py = y * OLCEK;
  const dx = Math.cos(aci) * boy * OLCEK * 0.5;
  const dy = Math.sin(aci) * boy * OLCEK * 0.5;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.lineCap = 'round';
  const ince = 2.2 / gorunum.z; // ekranda ~2 px
  ctx.beginPath();
  ctx.moveTo(px - dx, py - dy);
  ctx.lineTo(px + dx, py + dy);
  ctx.strokeStyle = 'rgba(70, 42, 12, 0.75)'; // hafif koyu kenar: samanın üstünde de seçilir
  ctx.lineWidth = ince + 1.4 / gorunum.z;
  ctx.stroke();
  ctx.strokeStyle = ton ? '#e2a23a' : '#f2d98a';
  ctx.lineWidth = ince;
  ctx.stroke();
  ctx.restore();
}

/** Uyuyan hayvanın üstünde yükselen küçük 'z' işareti (u: 0..1 yükselme evresi). */
export function zIsareti(ctx, x, y, boy, u) {
  const px = x * OLCEK;
  const py = y * OLCEK;
  const s = boy * OLCEK * 0.5;
  const ciz = () => {
    ctx.beginPath();
    ctx.moveTo(px - s, py - s);
    ctx.lineTo(px + s, py - s);
    ctx.lineTo(px - s, py + s);
    ctx.lineTo(px + s, py + s);
    ctx.stroke();
  };
  ctx.save();
  ctx.globalAlpha = Math.min(1, u * 5) * (1 - u * u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const ince = 2.4 / gorunum.z;
  ctx.strokeStyle = DIS;
  ctx.lineWidth = ince + 2.4 / gorunum.z;
  ciz();
  ctx.strokeStyle = '#f2d98a';
  ctx.lineWidth = ince;
  ciz();
  ctx.restore();
}
