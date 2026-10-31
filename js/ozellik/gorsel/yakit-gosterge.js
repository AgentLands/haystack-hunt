/**
 * Makine üstündeki yakıt göstergesi: makine sürülürken ya da yakıt %25'in altındayken
 * makinenin üstünde ekran-sabit küçük bir yay çubuk (yeşil → turuncu → kırmızı; %10'un
 * altında yanıp söner). Yakıt bitince yay yerine boş bidon simgesi. Boyutlar CSS pikseli:
 * tuval yakınlaşsa ya da telefonda küçülse de gösterge ekranda aynı boyda kalır.
 */
import { OLCEK } from '../../cizim.js';
import { ekranBirim } from './ortak.js';
import { HAT_RENGI } from './makine-ortak.js';

/** Bu orandan az yakıtta gösterge sürücüsüz makinede de görünür; bunun altında yanıp söner. */
export const YAKIT_UYARI = 0.25;
export const YAKIT_KRITIK = 0.1;
const YARICAP = 8;
const KALINLIK = 3.2;

/** Yakıt oranına göre çubuk rengi (yeşil → turuncu → kırmızı). */
export function yakitRengi(oran) {
  const kar = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
  const yesil = [104, 178, 64];
  const turuncu = [236, 150, 44];
  const kirmizi = [214, 58, 38];
  let c;
  if (oran >= 0.5) c = yesil;
  else if (oran >= YAKIT_UYARI) c = kar(turuncu, yesil, (oran - YAKIT_UYARI) / 0.25);
  else c = kar(kirmizi, turuncu, Math.max(0, (oran - YAKIT_KRITIK) / 0.15));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Gösterge bu makinede görünmeli mi? */
export function gostergeGorunur(makine) {
  return !!makine.surucu || !(makine.yakit >= YAKIT_UYARI);
}

/** Boş bidon (piksel uzayı, merkez 0, 0): krem gövde, koyu kulp ve ağız, kırmızı çarpı. */
function bosBidon(ctx, t) {
  ctx.translate(0, Math.sin(t * 3) * 1.2);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(-2, -7);
  ctx.lineTo(5, -7);
  ctx.lineTo(5, 7);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.strokeStyle = HAT_RENGI;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#e8dcc0';
  ctx.fill();
  ctx.fillStyle = HAT_RENGI;
  ctx.fillRect(0, -5.5, 3.5, 1.6);
  ctx.fillRect(-6.5, -7.5, 3, 2.2);
  ctx.strokeStyle = '#c23a26';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2.5, -1.5);
  ctx.lineTo(2.5, 4.5);
  ctx.moveTo(2.5, -1.5);
  ctx.lineTo(-2.5, 4.5);
  ctx.stroke();
}

/** Yay çubuk (piksel uzayı): koyu yuva üstünde yakıt kadar renkli yay ve küçük damla. */
function yay(ctx, oran, t) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(42, 26, 13, 0.85)';
  ctx.lineWidth = KALINLIK + 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, YARICAP, Math.PI, 2 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 220, 192, 0.35)';
  ctx.lineWidth = KALINLIK;
  ctx.stroke();
  const yanik = oran >= YAKIT_KRITIK || Math.sin(t * 10) > -0.2;
  if (oran > 0.005 && yanik) {
    ctx.strokeStyle = yakitRengi(oran);
    ctx.beginPath();
    ctx.arc(0, 0, YARICAP, Math.PI, Math.PI + Math.PI * Math.min(1, oran));
    ctx.stroke();
  }
  ctx.fillStyle = HAT_RENGI;
  ctx.beginPath();
  ctx.arc(0, -1.5, 2.6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = yanik ? yakitRengi(oran) : '#e8dcc0';
  ctx.beginPath();
  ctx.arc(0, -1.5, 1.5, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Makinenin yakıt göstergesini çizer (gerekmiyorsa hiçbir şey çizmez). yukari: göstergenin
 * makine merkezinin ne kadar üstünde (ekranda, hücre) duracağı. zaman ms.
 */
export function yakitGostergesi(ctx, makine, zaman, yukari) {
  if (!gostergeGorunur(makine)) return;
  const t = zaman / 1000;
  const oran = Math.max(0, makine.yakit || 0);
  ctx.save();
  ctx.translate(makine.x * OLCEK, (makine.y - yukari) * OLCEK);
  const tuval = ctx.canvas;
  const css = tuval && tuval.clientWidth > 0 ? tuval.width / tuval.clientWidth : 1;
  const eb = ekranBirim(ctx) * css;
  ctx.scale(eb, eb);
  ctx.translate(0, -6);
  if (oran <= 0) bosBidon(ctx, t);
  else yay(ctx, oran, t);
  ctx.restore();
}
