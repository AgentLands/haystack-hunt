/**
 * Hava görseli (sistemler.md §3): rüzgâr yönünde sürüklenen bulut gölgeleri (gök kapandıkça
 * çoğalır ve koyulaşır), yağmur çizgileri (rüzgârla eğik), rüzgâr şiddetiyle savrulan saman
 * zerreleri. Geçişler yumuşak (zaman sabiti ≈2 sn). Sade hareket tercihinde dünyada hiçbir
 * şey çizilmez (hava yalnız HUD simgesinde; J). Çizim görünür alanla sınırlı, kare başına
 * sabit maliyet: en çok 12 bulut (görünenler) drawImage + kasvet örtüsü + tek yol yağmur +
 * tek yol zerre.
 * Kaynak: kural/ciftlik/dunya/hava.js havaAl(c) → { yon 0..3 (gittiği yön), siddet 0..3,
 * gok: GOK 'gunes' | 'bulut' | 'yagmur' } (benzetimin okuduğu havanın aynısı).
 */
import { DX, DY } from '../../../kural/ciftlik/olcu.js';
import { DUNYA_EN, DUNYA_BOY, OLCEK } from '../../../cizim/tuval-olcek.js';
import { havaAl, GOK } from '../../../kural/ciftlik/dunya/hava.js';
import { sadeHareket } from '../../sade-hareket.js';

export { havaAl };

/** Gök adından kapalılık: güneş 0, bulut 0.5, yağmur 1. */
export function kapalilik(gok) {
  if (gok === GOK.YAGMUR) return 1;
  return gok === GOK.BULUT ? 0.5 : 0;
}

const BULUT_EN_COK = 12;
const PAY = 180; // bulutların dünya dışında dolaştığı pay (dünya pikseli)
const izler = { kapali: 0, yagmur: 0, siddet: 1, ox: 0, oy: 0, son: -1 };
let bulutTuval = null;

/** Bulut gölgesi kalıbı: küçük tuvalde üst üste daireler; büyütülünce kenar yumuşar. */
function bulutKalibi() {
  if (bulutTuval) return bulutTuval;
  bulutTuval = document.createElement('canvas');
  bulutTuval.width = 40;
  bulutTuval.height = 26;
  const c = bulutTuval.getContext('2d');
  c.fillStyle = 'rgb(40, 22, 8)';
  for (const [x, y, r] of [[12, 15, 7], [20, 11, 8], [28, 14, 7], [18, 17, 7], [25, 18, 5]]) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  return bulutTuval;
}

/** [0, 1) sözde rastgele (görsel; kural değil). */
function zar(i, tuz) {
  const x = Math.sin(i * 127.1 + tuz * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function yaklas(deger, hedef, dt, sure) {
  return sure <= 0 ? hedef : deger + (hedef - deger) * Math.min(1, dt / sure);
}

function bulutlar(ctx, k, v) {
  const kalip = bulutKalibi();
  const n = Math.round(5 + 7 * k);
  const genis = DUNYA_EN + PAY * 2;
  const yuksek = DUNYA_BOY + PAY * 2;
  for (let i = 0; i < Math.min(n, BULUT_EN_COK); i++) {
    const olcek = 4 + zar(i, 3) * 4;
    const en = kalip.width * olcek;
    const boy = kalip.height * olcek;
    const x = ((((zar(i, 1) * genis + izler.ox) % genis) + genis) % genis) - PAY;
    const y = ((((zar(i, 2) * yuksek + izler.oy) % yuksek) + yuksek) % yuksek) - PAY;
    if (x > v.x + v.en || y > v.y + v.boy || x + en < v.x || y + boy < v.y) continue;
    ctx.globalAlpha = (0.12 + 0.16 * k) * Math.min(1, n - i);
    ctx.drawImage(kalip, x, y, en, boy);
  }
  ctx.globalAlpha = 1;
  const kasvet = 0.04 * k + 0.08 * izler.yagmur;
  if (kasvet > 0.005) {
    ctx.fillStyle = `rgba(40, 22, 8, ${kasvet})`;
    ctx.fillRect(v.x, v.y, v.en, v.boy);
  }
}

function yagmur(ctx, v, zaman, eb, h) {
  const n = Math.round(110 * izler.yagmur);
  if (!n) return;
  const egim = DX[h.yon] * (0.15 + 0.12 * izler.siddet);
  const boy = 11 * eb;
  const t = zaman / 1000;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const fy = (zar(i, 5) + t * (1.1 + zar(i, 6) * 0.4)) % 1;
    const fx = (zar(i, 4) + fy * egim + 1) % 1;
    const x = v.x + fx * v.en;
    const y = v.y + fy * v.boy;
    ctx.moveTo(x, y);
    ctx.lineTo(x - egim * boy, y - boy);
  }
  ctx.strokeStyle = 'rgba(214, 228, 240, 0.6)';
  ctx.lineWidth = 1.1 * eb;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function zerreler(ctx, v, zaman, eb, h) {
  const n = Math.round(8 * izler.siddet);
  if (!n) return;
  const t = zaman / 1000;
  const dx = DX[h.yon];
  const dy = DY[h.yon];
  const boy = 4 * eb;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ilerle = (zar(i, 7) + t * (0.08 + 0.05 * izler.siddet) * (0.7 + zar(i, 8))) % 1;
    const yan = zar(i, 9);
    const dalga = Math.sin(t * 3 + i) * 0.015;
    const fx = dx ? (dx > 0 ? ilerle : 1 - ilerle) : (yan + dalga + 1) % 1;
    const fy = dy ? (dy > 0 ? ilerle : 1 - ilerle) : (yan + dalga + 1) % 1;
    const x = v.x + fx * v.en;
    const y = v.y + fy * v.boy;
    ctx.moveTo(x, y);
    ctx.lineTo(x - dx * boy + dy * boy * 0.3, y - dy * boy + dx * boy * 0.3);
  }
  ctx.strokeStyle = 'rgba(231, 194, 122, 0.9)';
  ctx.lineWidth = 1.4 * eb;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Hava katmanı. alan: görünür alan HÜCRE cinsinden ({ x, y, en, boy }; gorunurAlan),
 * eb: 1 CSS pikselinin dünya boyu, zaman: ms.
 */
export function havaCiz(ctx, c, alan, eb, zaman) {
  if (sadeHareket()) return;
  const h = havaAl(c);
  const ilk = izler.son < 0;
  const dt = ilk ? 0 : Math.max(0, Math.min(200, zaman - izler.son));
  izler.son = zaman;
  const k = kapalilik(h.gok);
  const sure = ilk ? 0 : 2000;
  izler.kapali = yaklas(izler.kapali, k, dt, sure);
  izler.yagmur = yaklas(izler.yagmur, k >= 1 ? 1 : 0, dt, sure);
  izler.siddet = yaklas(izler.siddet, h.siddet, dt, sure);
  const hiz = (2 + 3 * izler.siddet) / 1000;
  izler.ox += DX[h.yon] * hiz * dt;
  izler.oy += DY[h.yon] * hiz * dt;
  const v = { x: alan.x * OLCEK, y: alan.y * OLCEK, en: alan.en * OLCEK, boy: alan.boy * OLCEK };
  bulutlar(ctx, izler.kapali, v);
  yagmur(ctx, v, zaman, eb, h);
  zerreler(ctx, v, zaman, eb, h);
}
