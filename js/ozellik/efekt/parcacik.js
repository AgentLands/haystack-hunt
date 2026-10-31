/**
 * Parçacık havuzu: saman çöpü, toz bulutu ve ışık kıvılcımı. Üst sınırlı halka tampon
 * (en eskisinin üstüne yazılır), basit yerçekimi/sürtünme ve sönme. Koordinatlar tuval
 * pikseli; z yerden yükseklik (gölgesi sağ alta düşer, ışık sol üstten).
 * Her parçacık doğduğu andaki yakınlaştırmaya göre ölçeklenir (s = 1/z): yakın kamerada
 * efekt dünyada küçülür, ekranda aynı boyda kalır (çiftçinin yanında dev çöp olmasın).
 */
import { gorunum } from '../../gorunum.js';

export const AZAMI = 400;
export const COP = 0;
export const TOZ = 1;
export const ISIK = 2;

const YERCEKIMI = [300, 0, 90];
const SURTUNME = [2.2, 1.6, 1.2];
const alan = () => new Float32Array(AZAMI);
const p = {
  x: alan(), y: alan(), z: alan(), vx: alan(), vy: alan(), vz: alan(),
  aci: alan(), donus: alan(), yas: alan(), omur: alan(), boy: alan(), s: alan(),
  tur: new Uint8Array(AZAMI), renk: new Array(AZAMI).fill(''),
};
let sonraki = 0;
let canli = 0;
const spritelar = new Map();

/** Parçacık ekler; o: { tur, x, y, z?, vx, vy, vz?, omur, boy, renk, donus? }. */
export function parcacikEkle(o) {
  const i = sonraki;
  sonraki = (sonraki + 1) % AZAMI;
  const k = 1 / Math.max(1, gorunum.z);
  p.s[i] = k;
  p.x[i] = o.x;
  p.y[i] = o.y;
  p.z[i] = (o.z || 0) * k;
  p.vx[i] = (o.vx || 0) * k;
  p.vy[i] = (o.vy || 0) * k;
  p.vz[i] = (o.vz || 0) * k;
  p.aci[i] = Math.random() * Math.PI;
  p.donus[i] = o.donus ?? (Math.random() - 0.5) * 14;
  p.yas[i] = 0;
  p.omur[i] = o.omur;
  p.boy[i] = o.boy * k;
  p.tur[i] = o.tur;
  p.renk[i] = o.renk;
}

export function hepsiniSil() {
  p.omur.fill(0);
  p.yas.fill(0);
}

export function canliSayisi() {
  return canli;
}

/** dt saniye ilerletir. */
export function guncelle(dt) {
  canli = 0;
  for (let i = 0; i < AZAMI; i++) {
    if (p.yas[i] >= p.omur[i]) continue;
    canli++;
    const t = p.tur[i];
    const s = Math.exp(-SURTUNME[t] * dt);
    p.vx[i] *= s;
    p.vy[i] *= s;
    p.x[i] += p.vx[i] * dt;
    p.y[i] += p.vy[i] * dt;
    p.vz[i] -= YERCEKIMI[t] * p.s[i] * dt;
    p.z[i] += p.vz[i] * dt;
    if (p.z[i] < 0) {
      p.z[i] = 0;
      p.vz[i] *= -0.25;
      p.vx[i] *= 0.4;
      p.vy[i] *= 0.4;
      p.donus[i] *= 0.3;
    }
    p.aci[i] += p.donus[i] * dt;
    p.yas[i] += dt;
  }
}

function alfa(i) {
  const kalan = p.omur[i] - p.yas[i];
  return Math.min(1, kalan / (p.omur[i] * 0.35));
}

/** Yumuşak, renkli yuvarlak leke; bir kez çizilip önbelleğe alınır. */
function sprite(renk) {
  let s = spritelar.get(renk);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = s.height = 32;
  const c = s.getContext('2d');
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, `rgba(${renk}, 1)`);
  g.addColorStop(0.4, `rgba(${renk}, 0.45)`);
  g.addColorStop(1, `rgba(${renk}, 0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
  spritelar.set(renk, s);
  return s;
}

/** Önce gölgeler, sonra toz, saman çöpleri ve en üstte ışık kıvılcımları. */
export function parcaciklariCiz(ctx) {
  if (canli === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgb(40, 24, 8)';
  ctx.lineWidth = 1.5 / Math.max(1, gorunum.z);
  ctx.beginPath();
  for (let i = 0; i < AZAMI; i++) {
    if (p.yas[i] >= p.omur[i] || p.tur[i] !== COP) continue;
    if (p.z[i] < p.s[i] || p.z[i] > 45 * p.s[i]) continue;
    const ox = p.x[i] + p.z[i] * 0.3;
    const oy = p.y[i] + p.z[i] * 0.3;
    const dx = Math.cos(p.aci[i]) * p.boy[i] * 0.5;
    const dy = Math.sin(p.aci[i]) * p.boy[i] * 0.5;
    ctx.moveTo(ox - dx, oy - dy);
    ctx.lineTo(ox + dx, oy + dy);
  }
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  for (let i = 0; i < AZAMI; i++) {
    if (p.yas[i] >= p.omur[i] || p.tur[i] !== TOZ) continue;
    const r = p.boy[i] * (0.5 + p.yas[i] / p.omur[i]);
    ctx.globalAlpha = alfa(i) * 0.35;
    ctx.drawImage(sprite(p.renk[i]), p.x[i] - r, p.y[i] - p.z[i] * 0.5 - r, r * 2, r * 2);
  }
  for (let i = 0; i < AZAMI; i++) {
    if (p.yas[i] >= p.omur[i] || p.tur[i] !== COP) continue;
    const olcek = 1 + p.z[i] / (70 * p.s[i]);
    const dx = Math.cos(p.aci[i]) * p.boy[i] * 0.5 * olcek;
    const dy = Math.sin(p.aci[i]) * p.boy[i] * 0.5 * olcek;
    const x = p.x[i];
    const y = p.y[i] - p.z[i] * 0.5;
    ctx.globalAlpha = alfa(i);
    ctx.lineWidth = 1.6 * p.s[i];
    ctx.strokeStyle = p.renk[i];
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < AZAMI; i++) {
    if (p.yas[i] >= p.omur[i] || p.tur[i] !== ISIK) continue;
    const a = alfa(i) * (0.75 + 0.25 * Math.sin(p.yas[i] * 40 + i));
    const r = p.boy[i];
    const y = p.y[i] - p.z[i] * 0.5;
    ctx.globalAlpha = a;
    ctx.drawImage(sprite(p.renk[i]), p.x[i] - r, y - r, r * 2, r * 2);
    ctx.fillStyle = '#fffbe8';
    const n = 0.8 * p.s[i];
    ctx.fillRect(p.x[i] - n, y - n, 2 * n, 2 * n);
  }
  ctx.restore();
}
