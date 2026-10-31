/**
 * Pes edince iğne bir balyadaysa (ya da bir makinenin içindeyse) yerini gösteren küçük
 * işaret: balyanın üstüne çapraz gümüş iğne ve nabız gibi atan beyaz halka; balyadaki paslı
 * çiviler için turuncu nokta. Üst katmanda balya çiziminden sonra çizilir; balyaCiz'e
 * dokunmaz, yalnız durumu okur.
 */
import { katmanEkle, OLCEK } from '../cizim.js';
import { igneKonumu, tarlada } from '../kural/igne.js';
import { nabizSade } from './sade-hareket.js';

function cizgi(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function igneIsareti(ctx, x, y, aci, zaman) {
  const nabiz = nabizSade(0.5 + 0.5 * Math.sin(zaman / 180));
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.45 + 0.5 * nabiz).toFixed(2)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, OLCEK * (2.4 + 0.5 * nabiz), 0, Math.PI * 2);
  ctx.stroke();
  const dx = Math.cos(aci) * OLCEK * 1.6;
  const dy = Math.sin(aci) * OLCEK * 1.6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(20, 14, 8, 0.7)';
  ctx.lineWidth = 3;
  cizgi(ctx, x - dx, y - dy, x + dx, y + dy);
  ctx.strokeStyle = '#e6ebf2';
  ctx.lineWidth = 1.6;
  cizgi(ctx, x - dx, y - dy, x + dx, y + dy);
}

katmanEkle((ctx, durum, zaman) => {
  if (!durum.goster || !durum.tarla) return;
  const { tarla } = durum;
  for (const civi of tarla.civiler) {
    if (civi.alindi || tarlada(civi)) continue;
    ctx.fillStyle = 'rgba(214, 110, 40, 0.95)';
    ctx.beginPath();
    ctx.arc((civi.x + 0.5) * OLCEK + 2, (civi.y + 0.5) * OLCEK + 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (tarlada(tarla.igne)) return;
  const p = igneKonumu(tarla);
  igneIsareti(ctx, (p.x + 0.5) * OLCEK, (p.y + 0.5) * OLCEK, tarla.igne.aci, zaman);
}, 'ust');
