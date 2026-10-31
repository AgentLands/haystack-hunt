/**
 * Garaj görseli (durum.garaj { x, y, kenar, yon, en }): 'alt' katmanda (makinelerin altında)
 * tarla kenarına yaslı beton zemin, park çizgileri, tekerlek takozları, sundurma çatısının
 * gölgesi, köşede yakıt varilleri ve saman yığını; zemine savrulmuş saman (tarla yüksekliği)
 * betonun üstünde görünür kalır. 'ust' katmanda açık önlü sundurma (garaj-cati). Yerel
 * uzay: +x tarlaya doğru (garaj.yon), +y kenar boyunca; tarla kenarı x = -GARAJ_ICERI.
 */
import { katmanEkle } from '../../cizim.js';
import { GENISLIK, YUKSEKLIK } from '../../kural/boyut.js';
import { GARAJ_ICERI, PARK_ARALIK } from '../../kural/makineler/garaj.js';
import { donuk, ekranBirim, elips, golgeKayma, serit, yuvarDik } from './ortak.js';
import { MAKINE_GOLGE, hat } from './makine-ortak.js';
import { catiCiz, catiOlcu, direklerCiz } from './garaj-cati.js';
import { onbellekliCiz } from './onbellek.js';

const sahipler = new WeakMap();

/** Garajın yerel ölçüleri: zemin, park yerleri, çatı (hepsi hücre). */
export function garajOlcu(garaj) {
  const n = Math.max(1, Math.round((garaj.en - 2) / PARK_ARALIK));
  const yari = (n * PARK_ARALIK) / 2;
  return { n, yari, zx0: -GARAJ_ICERI, zx1: 3.4, zy: yari + 3.3, ...catiOlcu(yari) };
}

/** Dizinden [0, 1) sahte rastgele (çizim kararlı kalsın diye). */
function sahte(i) {
  const v = Math.sin(i * 91.7 + 3.1) * 43758.5453;
  return v - Math.floor(v);
}

/** Beton zemin: dış hatlı döşeme, derz ve çatlaklar, yağ lekeleri. */
function beton(ctx, o, eb) {
  yuvarDik(ctx, o.zx0, -o.zy, o.zx1 - o.zx0, o.zy * 2, 0.35);
  hat(ctx, '#a99f8e', eb, 0.8);
  yuvarDik(ctx, o.zx0 + 0.15, -o.zy + 0.15, o.zx1 - o.zx0 - 0.5, o.zy * 2 - 0.3, 0.25);
  ctx.fillStyle = '#b9b1a2';
  ctx.fill();
  ctx.strokeStyle = 'rgba(92, 82, 68, 0.35)';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0.4, -o.zy + 0.1);
  ctx.lineTo(0.4, o.zy - 0.1);
  for (let y = -o.zy + 3.6; y < o.zy; y += 3.6) {
    ctx.moveTo(o.zx0 + 0.1, y);
    ctx.lineTo(o.zx1 - 0.1, y);
  }
  for (let i = 0; i < 5; i++) {
    let x = o.zx0 + 0.8 + sahte(i) * (o.zx1 - o.zx0 - 1.6);
    let y = -o.zy + 1 + sahte(i + 20) * (o.zy * 2 - 2);
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (sahte(i * 3 + j + 40) - 0.5) * 1.1;
      y += 0.35 + sahte(i * 3 + j + 60) * 0.5;
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  for (let i = 0; i < o.n; i++) {
    const yc = (i - (o.n - 1) / 2) * PARK_ARALIK;
    elips(ctx, 0.6 + sahte(i + 80) * 0.8, yc + (sahte(i + 90) - 0.5), 0.75, 0.5);
    ctx.fillStyle = 'rgba(52, 44, 36, 0.16)';
    ctx.fill();
  }
}

/** Park çizgileri (sarı, beyaz kenarlı) ve her park yerinin arkasında beton takoz. */
function parkCizgileri(ctx, o, eb) {
  ctx.lineCap = 'butt';
  for (let i = 0; i <= o.n; i++) {
    const y = -o.yari + i * PARK_ARALIK;
    serit(ctx, o.zx0 + 0.45, y, o.zx1 - 0.6, y, 0.3, '#f4ecd8');
    serit(ctx, o.zx0 + 0.45, y, o.zx1 - 0.6, y, 0.2, '#e3b341');
  }
  for (let i = 0; i < o.n; i++) {
    const yc = (i - (o.n - 1) / 2) * PARK_ARALIK;
    yuvarDik(ctx, o.zx0 + 0.3, yc - 1.1, 0.32, 2.2, 0.08);
    hat(ctx, '#d7d0c2', eb, 0.8);
  }
}

/** Varil: üstten dış hatlı daire, ışık tarafında açık hilal, kapak tıpaları. */
function varil(ctx, x, y, renk, acik, eb) {
  elips(ctx, x + 0.16, y + 0.2, 0.44, 0.44);
  ctx.fillStyle = MAKINE_GOLGE;
  ctx.fill();
  elips(ctx, x, y, 0.42, 0.42);
  hat(ctx, renk, eb);
  elips(ctx, x - 0.07, y - 0.09, 0.3, 0.3);
  ctx.fillStyle = acik;
  ctx.fill();
  ctx.strokeStyle = 'rgba(42, 26, 13, 0.45)';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.arc(x, y, 0.33, 0, Math.PI * 2);
  ctx.stroke();
  elips(ctx, x + 0.14, y - 0.1, 0.07, 0.07);
  ctx.fillStyle = '#3a2a1c';
  ctx.fill();
}

/** Köşedeki saman yığını: dış hatlı, iki tonlu düzensiz küme ve çöpler. */
function samanYigini(ctx, x, y, eb) {
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 0.95 + (sahte(i % 12 + 100) - 0.5) * 0.3;
    const px = x + Math.cos(a) * r * 0.85;
    const py = y + Math.sin(a) * r * 1.1;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  hat(ctx, '#b8862e', eb);
  elips(ctx, x - 0.15, y - 0.18, 0.55, 0.7);
  ctx.fillStyle = '#d8b85a';
  ctx.fill();
  elips(ctx, x - 0.28, y - 0.35, 0.22, 0.3);
  ctx.fillStyle = '#f0d98a';
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = sahte(i + 120) * Math.PI * 2;
    const px = x + Math.cos(a) * 0.6;
    const py = y + Math.sin(a) * 0.8;
    serit(ctx, px, py, px + Math.cos(a) * 0.45, py + Math.sin(a + 0.4) * 0.45, 0.05, '#c99d45');
  }
}

/** Zemine savrulan saman: zemin içindeki yüksekliği olan hücrelerde saman lekeleri. */
function samanSerpinti(ctx, garaj, o, tarla) {
  if (!tarla || !tarla.h) return;
  const c = Math.cos(garaj.yon);
  const s = Math.sin(garaj.yon);
  const r = Math.hypot(o.zx1 - o.zx0, o.zy * 2) / 2 + 1;
  const mx = garaj.x + ((o.zx0 + o.zx1) / 2) * c;
  const my = garaj.y + ((o.zx0 + o.zx1) / 2) * s;
  const x0 = Math.max(0, Math.floor(mx - r));
  const y0 = Math.max(0, Math.floor(my - r));
  for (let y = y0; y <= Math.min(YUKSEKLIK - 1, Math.ceil(my + r)); y++) {
    for (let x = x0; x <= Math.min(GENISLIK - 1, Math.ceil(mx + r)); x++) {
      const h = tarla.h[y * GENISLIK + x];
      if (!h) continue;
      const dx = x + 0.5 - garaj.x;
      const dy = y + 0.5 - garaj.y;
      const lx = dx * c + dy * s;
      const ly = -dx * s + dy * c;
      if (lx < o.zx0 || lx > o.zx1 || Math.abs(ly) > o.zy) continue;
      ctx.fillStyle = `rgba(216, 184, 90, ${Math.min(0.95, 0.35 + h * 0.12).toFixed(2)})`;
      const k = h >= 3 ? 1 : 0.55;
      ctx.fillRect(x + (1 - k) / 2, y + (1 - k) / 2, k, k);
    }
  }
}

/**
 * Garajın merkezine göre dünya hizalı kapsayan kutusu (önbellek için; yon dik açılardadır).
 * cati: yalnız sundurma çatısını kapsar (daha küçük ara tuval).
 */
export function garajKutusu(garaj, o, cati = false) {
  const c = Math.cos(garaj.yon);
  const s = Math.sin(garaj.yon);
  const [x0, x1, yy, pay] = cati ? [o.cx0, o.cx1, o.cy, 0.3] : [o.zx0, o.zx1, o.zy, 1.5];
  const xs = [];
  const ys = [];
  for (const [lx, ly] of [[x0, -yy], [x1, -yy], [x0, yy], [x1, yy]]) {
    xs.push(lx * c - ly * s);
    ys.push(lx * s + ly * c);
  }
  return [Math.min(...xs) - pay, Math.min(...ys) - pay, Math.max(...xs) + pay,
    Math.max(...ys) + pay];
}

/** Zeminin durağan kısmı (merkez 0, 0): beton, çizgiler, çatı gölgesi, variller, yığın. */
function zeminDuragan(ctx, garaj, o) {
  donuk(ctx, 0, 0, garaj.yon, 1, (c) => {
    const eb = ekranBirim(c);
    beton(c, o, eb);
    parkCizgileri(c, o, eb);
  });
  const [gx, gy] = golgeKayma(110);
  donuk(ctx, gx, gy, garaj.yon, 1, (c) => {
    yuvarDik(c, o.cx0, -o.cy, o.cx1 - o.cx0, o.cy * 2, 0.2);
    c.fillStyle = MAKINE_GOLGE;
    c.fill();
  });
  donuk(ctx, 0, 0, garaj.yon, 1, (c) => {
    const eb = ekranBirim(c);
    varil(c, o.zx0 + 0.85, o.cy + 1.0, '#a8371a', '#d4542c', eb);
    varil(c, o.zx0 + 1.05, o.cy + 1.95, '#2f4a6d', '#4a6f9a', eb);
    samanYigini(c, o.zx0 + 1.2, -o.cy - 1.45, eb);
  });
}

/** Garajın önbellek sahipleri (zemin ve çatı ayrı). */
export function garajSahipleri(garaj) {
  let s = sahipler.get(garaj);
  if (!s) {
    s = { zemin: {}, cati: {} };
    sahipler.set(garaj, s);
  }
  return s;
}

/** Garaj zemini ('alt' katman). durum: { garaj, tarla? }. */
export function garajZeminCiz(ctx, durum) {
  const { garaj } = durum;
  const o = garajOlcu(garaj);
  const anahtar = `${garaj.yon.toFixed(3)}|${garaj.en}`;
  onbellekliCiz(ctx, garajSahipleri(garaj).zemin, anahtar, garaj.x, garaj.y,
    garajKutusu(garaj, o), (c) => zeminDuragan(c, garaj, o));
  donuk(ctx, 0, 0, 0, 1, (c) => samanSerpinti(c, garaj, o, durum.tarla));
}

katmanEkle((ctx, durum) => {
  if (durum.garaj) garajZeminCiz(ctx, durum);
}, 'alt');

/** Garaj direkleri ve sundurma çatısı ('ust' katman, makinelerin ve çiftçinin üstünde). */
export function garajCatiCiz(ctx, durum, zaman) {
  const o = garajOlcu(durum.garaj);
  donuk(ctx, durum.garaj.x, durum.garaj.y, durum.garaj.yon, 1, (c) => direklerCiz(c, o));
  const { garaj } = durum;
  catiCiz(ctx, durum, o, zaman, garajSahipleri(garaj).cati, garajKutusu(garaj, o, true));
}

katmanEkle((ctx, durum, zaman) => {
  if (durum.garaj) garajCatiCiz(ctx, durum, zaman);
}, 'ust');
