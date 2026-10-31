/**
 * Paslı çivi çizimi (alt katman): açıktaki çiviler kalın, hafif bükük, yassı başlı, pas
 * lekeli ve ekran-sabit koyu dış hatlı (iğnenin ince, düz, gözlü siluetinden net ayrılır);
 * yüzeye yakın olanlar arada turuncu kıpırtı, güneş parıltısında turuncu-kızıl yıldız. Pes
 * edince bütün alınmamış çiviler gösterilir.
 */
import { katmanEkle, OLCEK } from '../cizim.js';
import { civiDerinligi } from '../kural/civi.js';
import { disHat, ekranBirim } from './gorsel/ortak.js';

const GOVDE = '#8a4a22';
const GOVDE_ACIK = '#c27a45';
const BAS = '#6e3818';
const PAS = '#d9792f';
const PARILTI = (alfa) => `rgba(255, 128, 48, ${alfa})`;
/** Bükülme açısı (radyan) ve bükülme noktası (boyun kesri, baştan). */
const BUKUM = 0.38;
const DIRSEK = 0.58;

function cizgi(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Çivinin yarı boyu (dünya pikseli): ~1.2 hücre, ekranda en az ~17 px; iğneden kısa. */
export function civiYariBoyu(eb) {
  return Math.min(OLCEK * 1.8, Math.max(OLCEK * 0.6, 8.5 * eb));
}

/** Bükük gövde yolu (yerel, baş -x'te): iki parçalı kalın çubuk, sivri uç. */
function govdeYolu(h, w) {
  const bx = -h + 2 * h * DIRSEK;
  const kalan = 2 * h * (1 - DIRSEK);
  const c = Math.cos(BUKUM);
  const s = Math.sin(BUKUM);
  const ux = bx + c * kalan;
  const uy = s * kalan;
  const nx = -s;
  const ny = c;
  const ox = Math.sin(BUKUM / 2) * w;
  const yol = new Path2D();
  yol.moveTo(-h, -w);
  yol.lineTo(bx + ox, -w);
  yol.lineTo(ux - c * w * 2.2 - nx * w, uy - s * w * 2.2 - ny * w);
  yol.lineTo(ux, uy);
  yol.lineTo(ux - c * w * 2.2 + nx * w, uy - s * w * 2.2 + ny * w);
  yol.lineTo(bx - ox, w);
  yol.lineTo(-h, w);
  yol.closePath();
  return { yol, bx, ux, uy };
}

/** Tek çiviyi çizer (civi: { x, y, aci } hücre; önizleme de kullanır). */
export function civiCiz(ctx, civi) {
  const mx = (civi.x + 0.5) * OLCEK;
  const my = (civi.y + 0.5) * OLCEK;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(civi.aci);
  const eb = ekranBirim(ctx);
  const h = civiYariBoyu(eb);
  const w = Math.max(1.9 * eb, h * 0.14);
  const { yol, bx, ux, uy } = govdeYolu(h, w);
  const bas = new Path2D();
  const kal = Math.max(3 * eb, w * 0.9);
  bas.roundRect(-h - kal * 0.8, -w * 2.3, kal, w * 4.6, kal * 0.35);
  // Gölge (dünyada sağ alta; yerel uzaya döndürülmüş kayma).
  const gx = 1.6 * eb;
  const gy = 2 * eb;
  ctx.save();
  ctx.translate(gx * Math.cos(civi.aci) + gy * Math.sin(civi.aci),
    -gx * Math.sin(civi.aci) + gy * Math.cos(civi.aci));
  ctx.fillStyle = 'rgba(40, 22, 8, 0.4)';
  ctx.fill(yol);
  ctx.fill(bas);
  ctx.restore();
  disHat(ctx, yol, GOVDE, 1);
  // Işık tarafında açık çizgi, üstünde turuncu pas lekeleri.
  const yan = 0.6 * Math.sin(civi.aci) - 0.8 * Math.cos(civi.aci) < 0 ? -1 : 1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = GOVDE_ACIK;
  ctx.lineWidth = w * 0.6;
  cizgi(ctx, -h + 3 * eb, yan * w * 0.4, bx, yan * w * 0.4);
  ctx.fillStyle = PAS;
  for (const [u, r] of [[0.25, 1.2], [0.62, 0.9]]) {
    ctx.beginPath();
    ctx.arc(-h + 2 * h * u * DIRSEK * 1.4, -yan * w * 0.2, r * Math.max(eb, w * 0.3), 0,
      Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(bx + (ux - bx) * 0.4, uy * 0.4, Math.max(eb, w * 0.3), 0, Math.PI * 2);
  ctx.fill();
  disHat(ctx, bas, BAS, 1);
  ctx.restore();
}

function yildiz(ctx, x, y, boy, alfa, eb) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = PARILTI(alfa);
  ctx.lineWidth = 1.8 * eb;
  cizgi(ctx, x - boy, y, x + boy, y);
  cizgi(ctx, x, y - boy, x, y + boy);
  ctx.lineWidth = 1.1 * eb;
  const k = boy * 0.45;
  cizgi(ctx, x - k, y - k, x + k, y + k);
  cizgi(ctx, x - k, y + k, x + k, y - k);
}

katmanEkle((ctx, durum, zaman) => {
  const { tarla } = durum;
  const eb = ekranBirim(ctx);
  for (const civi of tarla.civiler) {
    if (civi.alindi) continue;
    const derinlik = durum.goster ? 0 : civiDerinligi(tarla, civi);
    if (derinlik === 0) {
      civiCiz(ctx, civi);
    } else if (derinlik <= 3 && (zaman + civi.x * 37) % 1900 < 140) {
      ctx.fillStyle = PARILTI(0.85);
      ctx.fillRect((civi.x + 0.5) * OLCEK - 1.5 * eb, (civi.y + 0.5) * OLCEK - 1.5 * eb,
        3 * eb, 3 * eb);
    }
  }
  for (const p of durum.civiPariltilar) {
    if (zaman >= p.bitis) continue;
    const kalan = Math.sin(((p.bitis - zaman) / p.sure) * Math.PI);
    yildiz(ctx, (p.x + 0.5) * OLCEK, (p.y + 0.5) * OLCEK, (6 + 14 * kalan) * eb, kalan, eb);
  }
}, 'alt');
