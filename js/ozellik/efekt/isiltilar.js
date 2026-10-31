/**
 * Işıltı ve dalga efektleri: dedektör okumasında seviye renginde halka dalgaları ve yer
 * ışıması, iğne açığa çıkınca/parıldayınca yıldız ışıltısı, pes edilince iğne işareti.
 * Her efekt { tur, x, y, bas, sure, ... } kaydıdır; süresi dolunca listeden düşer.
 */
import { OLCEK } from '../../cizim.js';

const efektler = [];
const TAM = Math.PI * 2;

/** Hücre koordinatından piksel merkezi. */
export const piksel = (h) => (h + 0.5) * OLCEK;

export function efektEkle(e) {
  efektler.push(e);
}

export function efektleriSil() {
  efektler.length = 0;
}

/** '#rrggbb' → 'r, g, b' (sprite ve rgba için). */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${n >> 16}, ${(n >> 8) & 255}, ${n & 255}`;
}

const yumusak = (t) => 1 - (1 - t) ** 3;

function isima(ctx, x, y, r, renk, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${renk}, ${a})`);
  g.addColorStop(0.5, `rgba(${renk}, ${a * 0.35})`);
  g.addColorStop(1, `rgba(${renk}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAM);
  ctx.fill();
}

function halka(ctx, x, y, r, renk, a, kalinlik) {
  ctx.strokeStyle = `rgba(${renk}, ${a * 0.28})`;
  ctx.lineWidth = kalinlik * 3.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAM);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${renk}, ${a})`;
  ctx.lineWidth = kalinlik;
  ctx.stroke();
}

/** Dört uzun, dört kısa ışınlı yıldız; ışınlar uca doğru incelir. */
export function yildizIsigi(ctx, x, y, boy, a, aci = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aci);
  ctx.globalCompositeOperation = 'lighter';
  isima(ctx, 0, 0, boy * 0.9, '255, 240, 190', a * 0.8);
  ctx.fillStyle = `rgba(255, 252, 235, ${a})`;
  for (let k = 0; k < 8; k++) {
    const uzun = k % 2 === 0 ? boy : boy * 0.45;
    const en = k % 2 === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(-en, 0);
    ctx.lineTo(0, -uzun);
    ctx.lineTo(en, 0);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.PI / 4);
  }
  ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, TAM);
  ctx.fill();
  ctx.restore();
}

function dalgaCiz(ctx, e, t) {
  const ilerleme = t / e.sure;
  ctx.globalCompositeOperation = e.sicak ? 'lighter' : 'source-over';
  isima(ctx, e.x, e.y, 18 + e.menzil * 0.6 * yumusak(Math.min(1, ilerleme * 2)), e.renk,
    0.4 * (1 - ilerleme));
  ctx.globalCompositeOperation = 'source-over';
  for (let k = 0; k < e.halkaSayisi; k++) {
    const yerel = (t - k * 170) / (e.sure - 340);
    if (yerel <= 0 || yerel >= 1) continue;
    const r = 6 + e.menzil * yumusak(yerel);
    halka(ctx, e.x, e.y, r, e.renk, (1 - yerel) * 0.95, 2.2 - yerel * 1.4);
  }
}

function parlamaCiz(ctx, e, t) {
  const u = t / e.sure;
  const a = Math.sin(Math.PI * Math.min(1, u * 1.15));
  if (e.halkali) {
    ctx.globalCompositeOperation = 'lighter';
    halka(ctx, e.x, e.y, 4 + 46 * yumusak(u), '255, 236, 170', (1 - u) * 0.8, 1.6);
  }
  yildizIsigi(ctx, e.x, e.y, e.boy * (0.55 + 0.45 * a), a, u * 0.9);
}

function isaretCiz(ctx, e, t) {
  const nabiz = (t % 800) / 800;
  const a = Math.min(1, (e.sure - t) / 500);
  ctx.globalCompositeOperation = 'lighter';
  halka(ctx, e.x, e.y, 28 - 18 * yumusak(nabiz), '255, 230, 150', a * (0.4 + 0.6 * nabiz), 2.4);
}

const CIZICI = { dalga: dalgaCiz, parlama: parlamaCiz, isaret: isaretCiz };

/** Katman: süresi dolanları atar, kalanları çizer. */
export function efektleriCiz(ctx, zaman) {
  if (efektler.length === 0) return;
  ctx.save();
  for (let i = efektler.length - 1; i >= 0; i--) {
    const e = efektler[i];
    const t = Math.max(0, zaman - e.bas);
    if (t >= e.sure) {
      efektler.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    CIZICI[e.tur](ctx, e, t);
  }
  ctx.restore();
}
