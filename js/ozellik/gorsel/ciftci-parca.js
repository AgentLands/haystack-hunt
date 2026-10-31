/**
 * Çiftçinin "boyalı oyuncak" parçaları (yerel uzay, +x ileri): ekran-sabit koyu kahve dış
 * hatlı, iki tonlu (cel) gövde, sırtta tulum yaması ve askılar, kırmızı kollar, botlar ve
 * koyulaştırılmış hasır şapka (önde koyu siper, arkada bant düğümü: yön okunur); makine
 * koltuğunda oturan çiftçi. dh: yerel uzayda dış hat kalınlığı (ekranBirim × 1.2).
 * Karakter ve makine çizimleri ortak kullanır.
 */
import { IKI_PI, ekranBirim } from './ortak.js';

export const DIS = '#2a1a0d';
export const GOMLEK = '#c23a26';
export const GOMLEK_KOYU = '#8e2618';
export const TULUM = '#3a5f8e';
export const TULUM_KOYU = '#283f61';
export const DERI = '#e6b089';
export const SAMAN_RENK = ['#f3d98a', '#e9c560', '#d8b85a'];
const SAPKA = '#b9813a';
const SAPKA_KOYU = '#93612a';
const SIPER = '#77491c';
const TAC = '#e7c27a';
const TAC_KOYU = '#c79c55';
const BANT = '#9c2f1f';
const BOT = '#3f2717';
const BOT_ACIK = '#6e4a30';
const DUGME = '#e8d9a8';

function elipsYol(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, IKI_PI);
}

/** Geçerli yolu önce dış hatla çizer, sonra doldurur. */
export function hatli(ctx, dolgu, dh) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2 * dh;
  ctx.strokeStyle = DIS;
  ctx.stroke();
  ctx.fillStyle = dolgu;
  ctx.fill();
}

/** İki tonlu elips: dış hat + koyu ton, ışığa kaymış küçük iç elipste ana ton. */
export function celElips(ctx, x, y, rx, ry, ana, koyu, isik, dh, oran = 0.2) {
  elipsYol(ctx, x, y, rx, ry);
  hatli(ctx, koyu, dh);
  const k = Math.min(rx, ry) * oran;
  elipsYol(ctx, x + isik[0] * k, y + isik[1] * k, rx - k, ry - k);
  ctx.fillStyle = ana;
  ctx.fill();
}

/** Dış hatlı kalın çizgi (kol, askı, alet sapı): önce koyu geniş, sonra renkli. */
export function hatliCizgi(ctx, x1, y1, x2, y2, en, renk, dh) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = DIS;
  ctx.lineWidth = en + 2 * dh;
  ctx.stroke();
  ctx.strokeStyle = renk;
  ctx.lineWidth = en;
  ctx.stroke();
}

/** Bot (yürürken gövdenin önünde/arkasında görünür). */
export function bot(ctx, x, y, isik, dh) {
  celElips(ctx, x, y, 0.19, 0.11, BOT_ACIK, BOT, isik, dh, 0.3);
}

/** Çizgi parçalarını tek yolda toplar (kayma: [dx, dy]). */
function parcaYolu(ctx, parcalar, dx = 0, dy = 0) {
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of parcalar) {
    ctx.moveTo(x1 + dx, y1 + dy);
    ctx.lineTo(x2 + dx, y2 + dy);
  }
}

/**
 * Kollar: omuzdan ele kırmızı kol (gölge tarafı koyu) ve deri el; kollar: [[sx, sy, ex, ey]].
 * Hepsi birlikte çizilir (az çizim çağrısı).
 */
export function kollar(ctx, liste, isik, dh) {
  ctx.lineCap = 'round';
  parcaYolu(ctx, liste);
  ctx.strokeStyle = DIS;
  ctx.lineWidth = 0.19 + 2 * dh;
  ctx.stroke();
  ctx.strokeStyle = GOMLEK_KOYU;
  ctx.lineWidth = 0.19;
  ctx.stroke();
  parcaYolu(ctx, liste, isik[0] * 0.032, isik[1] * 0.032);
  ctx.strokeStyle = GOMLEK;
  ctx.lineWidth = 0.12;
  ctx.stroke();
  ctx.beginPath();
  for (const [, , ex, ey] of liste) {
    ctx.moveTo(ex + 0.105, ey);
    ctx.arc(ex, ey, 0.105, 0, IKI_PI);
  }
  hatli(ctx, DERI, dh);
}

/** Elde kısa saman tutamı (el ile kazarken). */
export function tutam(ctx, x, y, aci, dh) {
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.045, dh * 1.2);
  for (let i = 0; i < 3; i++) {
    const a = aci + (i - 1) * 0.45;
    ctx.strokeStyle = SAMAN_RENK[i];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 0.26, y + Math.sin(a) * 0.26);
    ctx.stroke();
  }
}

/** Gövde: kırmızı gömlekli omuzlar, sırtta mavi tulum yaması ve öne uzanan iki askı. */
export function govde(ctx, isik, dh, detay = false) {
  celElips(ctx, -0.1, 0, 0.36, 0.56, GOMLEK, GOMLEK_KOYU, isik, dh, 0.16);
  // Askılar (tek yolda iki bant); yakında öndeki düğmeler.
  ctx.lineCap = 'round';
  parcaYolu(ctx, [[-0.24, 0.2, 0.14, 0.31], [-0.24, -0.2, 0.14, -0.31]]);
  ctx.strokeStyle = DIS;
  ctx.lineWidth = 0.085 + 1.6 * dh;
  ctx.stroke();
  ctx.strokeStyle = TULUM;
  ctx.lineWidth = 0.085;
  ctx.stroke();
  for (const v of detay ? [-1, 1] : []) {
    elipsYol(ctx, 0.14, v * 0.31, 0.035, 0.035);
    ctx.fillStyle = DUGME;
    ctx.fill();
  }
  elipsYol(ctx, -0.27, 0, 0.19, 0.31);
  hatli(ctx, TULUM_KOYU, dh * 0.8);
  const k = 0.05;
  elipsYol(ctx, -0.27 + isik[0] * k, isik[1] * k, 0.19 - k, 0.31 - k);
  ctx.fillStyle = TULUM;
  ctx.fill();
}

/**
 * Hasır şapka (r: kenar yarıçapı): koyu hasır kenar, önde koyu siper bandı, açık taç,
 * kırmızı bant ve arkada düğüm. detay: yakın kamerada dokuma halkaları ve taç kırımı.
 */
export function sapka(ctx, cx, cy, r, isik, dh, detay = false) {
  celElips(ctx, cx, cy, r * 1.04, r * 0.96, SAPKA, SAPKA_KOYU, isik, dh, 0.13);
  if (detay) {
    ctx.strokeStyle = 'rgba(80, 48, 14, 0.28)';
    ctx.lineWidth = dh * 0.7;
    for (const k of [0.84, 0.72]) {
      elipsYol(ctx, cx, cy, r * k * 1.04, r * k * 0.96);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = SIPER;
  ctx.lineWidth = Math.max(r * 0.2, dh * 1.4);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.86, r * 0.8, 0, -1.05, 1.05);
  ctx.stroke();
  const tx = cx - r * 0.1;
  const t = r * 0.52;
  elipsYol(ctx, tx, cy, t * 1.12, t * 1.04);
  hatli(ctx, BANT, dh);
  elipsYol(ctx, tx, cy, t * 0.9, t * 0.82);
  ctx.fillStyle = TAC_KOYU;
  ctx.fill();
  const k = t * 0.2;
  elipsYol(ctx, tx + isik[0] * k, cy + isik[1] * k, t * 0.9 - k, t * 0.82 - k);
  ctx.fillStyle = TAC;
  ctx.fill();
  if (detay) {
    ctx.strokeStyle = 'rgba(120, 78, 30, 0.45)';
    ctx.lineWidth = dh * 0.8;
    ctx.beginPath();
    ctx.moveTo(tx - t * 0.45, cy);
    ctx.lineTo(tx + t * 0.45, cy);
    ctx.stroke();
  }
  elipsYol(ctx, tx + isik[0] * t * 0.35, cy + isik[1] * t * 0.35, t * 0.32, t * 0.26);
  ctx.fillStyle = 'rgba(255, 240, 192, 0.75)';
  ctx.fill();
  // Arkada bant düğümü (yakında iki kısa kuyruk): şapkanın arkası.
  for (const v of detay ? [-1, 1] : []) {
    hatliCizgi(ctx, tx - t * 1.05, cy, tx - t * 1.05 - r * 0.3, cy + v * r * 0.16,
      r * 0.12, BANT, dh * 0.8);
  }
  elipsYol(ctx, tx - t * 1.08, cy, r * 0.11, r * 0.11);
  hatli(ctx, BANT, dh * 0.8);
}

/** Koltukta oturan çiftçi (cx, cy koltuk merkezi): omuzlar, direksiyona uzanan kollar, şapka. */
export function oturanCiftci(ctx, cx, cy, isik) {
  const dh = ekranBirim(ctx) * 1.2;
  celElips(ctx, cx - 0.04, cy, 0.3, 0.5, GOMLEK, GOMLEK_KOYU, isik, dh, 0.16);
  elipsYol(ctx, cx - 0.2, cy, 0.13, 0.26);
  ctx.fillStyle = TULUM;
  ctx.fill();
  kollar(ctx, [-1, 1].map((y) => [cx + 0.02, cy + y * 0.38, cx + 0.62, cy + y * 0.29]), isik,
    dh);
  sapka(ctx, cx + 0.06, cy, 0.36, isik, dh);
}
