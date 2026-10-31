/**
 * Görsel çizim yardımcıları: hücre birimli yerel çizim uzayı (donuk), yuvarlak köşeli
 * dikdörtgen/elips yolları, sönük (yakıtsız) renk karışımı, ışık yönü ve tekerlek.
 * Yerel uzayda +x ileri, +y sağ taraf; birim hücre (1 hücre = OLCEK piksel).
 */
import { OLCEK } from '../../cizim.js';

export const IKI_PI = Math.PI * 2;
/** Gölge rengi (sağ alta düşer; ışık sol üstten gelir). */
export const GOLGE_RENGI = 'rgba(28, 16, 6, 0.30)';
const sonukOnbellek = new Map();

/** '#rrggbb' rengini sönük istenirse griye çekip karartır; sonuç önbelleklenir. */
export function renk(hex, sonuk = false) {
  if (!sonuk) return hex;
  let s = sonukOnbellek.get(hex);
  if (s === undefined) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const gri = r * 0.3 + g * 0.59 + b * 0.11;
    const karis = (c) => Math.round((c * 0.3 + gri * 0.7) * 0.78);
    s = `rgb(${karis(r)}, ${karis(g)}, ${karis(b)})`;
    sonukOnbellek.set(hex, s);
  }
  return s;
}

/**
 * (x, y) hücre konumuna taşınmış, yon kadar döndürülmüş, olcek ile büyütülmüş yerel
 * uzayda cizim(ctx) çalıştırır; çizim birimi hücredir.
 */
export function donuk(ctx, x, y, yon, olcek, cizim) {
  ctx.save();
  ctx.translate(x * OLCEK, y * OLCEK);
  ctx.rotate(yon);
  ctx.scale(OLCEK * olcek, OLCEK * olcek);
  cizim(ctx);
  ctx.restore();
}

/** Dünya uzayındaki ışık (sol üst) yönünü yerel uzaya çevirir: [lx, ly], birim uzunluk. */
export function isikYerel(yon) {
  const c = Math.cos(yon);
  const s = Math.sin(yon);
  const wx = -0.6;
  const wy = -0.8;
  return [wx * c + wy * s, -wx * s + wy * c];
}

/** Yuvarlak köşeli dikdörtgen yolu; (x, y) sol üst köşe. */
export function yuvarDik(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Elips yolu. */
export function elips(ctx, cx, cy, rx, ry, donus = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, donus, 0, IKI_PI);
}

/** Dolu renkle yolu boyar. */
export function doldur(ctx, renkDegeri) {
  ctx.fillStyle = renkDegeri;
  ctx.fill();
}

/** Yuvarlak uçlu çizgi. */
export function serit(ctx, x1, y1, x2, y2, kalinlik, renkDegeri) {
  ctx.strokeStyle = renkDegeri;
  ctx.lineWidth = kalinlik;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Gölgenin dünya uzayındaki kayması (sağ alta); yükseklik arttıkça uzar. */
export function golgeKayma(yukseklik = 0) {
  const k = 0.3 + Math.min(yukseklik, 120) / 240;
  return [k * 0.8, k];
}

/**
 * Üstten görünen tekerlek: yuvarlak köşeli koyu şerit üzerinde dönüşe göre kayan tırtıl
 * çizgileri. uzun: ilerleme yönündeki boy; kayma: tırtıl kaydırması (hücre).
 */
export function tekerlek(ctx, cx, cy, uzun, en, kayma, sonuk) {
  yuvarDik(ctx, cx - uzun / 2, cy - en / 2, uzun, en, en * 0.32);
  doldur(ctx, renk('#2a2521', sonuk));
  const adim = 0.27;
  const ofs = ((kayma % adim) + adim) % adim;
  ctx.strokeStyle = renk('#4d443a', sonuk);
  ctx.lineWidth = 0.08;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  for (let x = cx - uzun / 2 + ofs + 0.08; x < cx + uzun / 2 - 0.08; x += adim) {
    ctx.moveTo(x, cy - en / 2 + 0.06);
    ctx.lineTo(x, cy + en / 2 - 0.06);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.14)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - uzun / 2 + en * 0.3, cy - en / 2 + 0.03);
  ctx.lineTo(cx + uzun / 2 - en * 0.3, cy - en / 2 + 0.03);
  ctx.stroke();
}

/**
 * Kabartmalı yüzey: koyu zemin, ışığa doğru kaymış açık iç yüzey (sol üstten ışık).
 * (x, y) sol üst köşe; isik yerel ışık yönü.
 */
export function bisel(ctx, x, y, w, h, r, isik, koyu, acik, sonuk) {
  yuvarDik(ctx, x, y, w, h, r);
  doldur(ctx, renk(koyu, sonuk));
  const k = Math.min(w, h) * 0.12;
  yuvarDik(ctx, x + k + isik[0] * k * 0.6, y + k + isik[1] * k * 0.6, w - 2 * k, h - 2 * k,
    Math.max(r - k, 0.02));
  doldur(ctx, renk(acik, sonuk));
}

/** Yerel uzayda 1 ekran pikselinin boyu (dış hat kalınlığı için). */
export function ekranBirim(ctx) {
  const t = ctx.getTransform();
  return 1 / Math.hypot(t.a, t.b);
}

/** Yolu önce dış hat rengiyle kalın çizer, sonra doldurur (boyalı oyuncak görünümü). */
export function disHat(ctx, yol, dolgu, kalinlik = 1.2) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2a1a0d';
  ctx.lineWidth = 2 * kalinlik * ekranBirim(ctx);
  ctx.stroke(yol);
  ctx.fillStyle = dolgu;
  ctx.fill(yol);
}
