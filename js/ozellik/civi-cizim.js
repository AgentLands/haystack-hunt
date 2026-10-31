/**
 * Paslı çivi çizimi (alt katman): açıktaki çiviler pas renginde başlı bir çubuk, yüzeye
 * yakın olanlar arada turuncu kıpırtı, güneş parıltısında turuncu-kızıl yıldız. Pes edince
 * bütün alınmamış çiviler gösterilir. İğnenin beyaz parıltısından ayırt edilebilir.
 */
import { katmanEkle, OLCEK } from '../cizim.js';
import { civiDerinligi } from '../kural/civi.js';

const GOVDE = '#7a3f1d';
const PAS = '#b8612a';
const PARILTI = (alfa) => `rgba(255, 128, 48, ${alfa})`;

function cizgi(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function civiCiz(ctx, civi) {
  const mx = (civi.x + 0.5) * OLCEK;
  const my = (civi.y + 0.5) * OLCEK;
  const dx = Math.cos(civi.aci) * OLCEK * 1.8;
  const dy = Math.sin(civi.aci) * OLCEK * 1.8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30, 20, 10, 0.55)';
  ctx.lineWidth = 3;
  cizgi(ctx, mx - dx + 1.5, my - dy + 1.5, mx + dx + 1.5, my + dy + 1.5);
  ctx.strokeStyle = GOVDE;
  ctx.lineWidth = 2.5;
  cizgi(ctx, mx - dx, my - dy, mx + dx, my + dy);
  ctx.strokeStyle = PAS;
  ctx.lineWidth = 1;
  cizgi(ctx, mx - dx * 0.5, my - dy * 0.5, mx + dx * 0.4, my + dy * 0.4);
  ctx.fillStyle = GOVDE;
  ctx.beginPath();
  ctx.arc(mx - dx, my - dy, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function yildiz(ctx, x, y, boy, alfa) {
  ctx.strokeStyle = PARILTI(alfa);
  ctx.lineWidth = 1.5;
  cizgi(ctx, x - boy, y, x + boy, y);
  cizgi(ctx, x, y - boy, x, y + boy);
  ctx.lineWidth = 1;
  const k = boy * 0.45;
  cizgi(ctx, x - k, y - k, x + k, y + k);
  cizgi(ctx, x - k, y + k, x + k, y - k);
}

katmanEkle((ctx, durum, zaman) => {
  const { tarla } = durum;
  for (const civi of tarla.civiler) {
    if (civi.alindi) continue;
    const derinlik = durum.goster ? 0 : civiDerinligi(tarla, civi);
    if (derinlik === 0) {
      civiCiz(ctx, civi);
    } else if (derinlik <= 3 && (zaman + civi.x * 37) % 1900 < 140) {
      ctx.fillStyle = PARILTI(0.8);
      ctx.fillRect((civi.x + 0.5) * OLCEK - 1, (civi.y + 0.5) * OLCEK - 1, 2, 2);
    }
  }
  for (const p of durum.civiPariltilar) {
    if (zaman >= p.bitis) continue;
    const kalan = Math.sin(((p.bitis - zaman) / p.sure) * Math.PI);
    yildiz(ctx, (p.x + 0.5) * OLCEK, (p.y + 0.5) * OLCEK, 4 + 9 * kalan, kalan);
  }
}, 'alt');
