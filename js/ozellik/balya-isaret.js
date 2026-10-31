/**
 * Pes edince iğne bir balyadaysa (ya da bir makinenin içindeyse) yerini gösteren küçük
 * işaret: balyanın üstüne oyundaki gümüş iğne modeli ve nabız gibi atan beyaz halka;
 * balyadaki paslı çiviler için dış hatlı turuncu nokta. Üst katmanda balya çiziminden sonra
 * çizilir; balyaCiz'e dokunmaz, yalnız durumu okur.
 */
import { katmanEkle, OLCEK, igneModeli } from '../cizim.js';
import { igneKonumu, tarlada } from '../kural/igne.js';
import { nabizSade } from './sade-hareket.js';

/** Balyadaki iğne: nabız gibi atan ekran-sabit kalınlıkta beyaz halka ve gümüş iğne modeli. */
function igneIsareti(ctx, x, y, aci, zaman) {
  const m = ctx.getTransform();
  const eb = 1 / Math.hypot(m.a, m.b);
  const nabiz = nabizSade(0.5 + 0.5 * Math.sin(zaman / 180));
  ctx.strokeStyle = 'rgba(42, 26, 13, 0.55)';
  ctx.lineWidth = 4 * eb;
  ctx.beginPath();
  ctx.arc(x, y, OLCEK * (2.4 + 0.5 * nabiz), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.5 + 0.5 * nabiz).toFixed(2)})`;
  ctx.lineWidth = 2 * eb;
  ctx.stroke();
  igneModeli(ctx, x, y, aci, 1.1);
}

katmanEkle((ctx, durum, zaman) => {
  if (!durum.goster || !durum.tarla) return;
  const { tarla } = durum;
  const m = ctx.getTransform();
  const eb = 1 / Math.hypot(m.a, m.b);
  for (const civi of tarla.civiler) {
    if (civi.alindi || tarlada(civi)) continue;
    ctx.beginPath();
    ctx.arc((civi.x + 0.5) * OLCEK + 2, (civi.y + 0.5) * OLCEK + 2, Math.max(1.6, 5 * eb), 0,
      Math.PI * 2);
    ctx.strokeStyle = '#2a1a0d';
    ctx.lineWidth = 2.4 * eb;
    ctx.stroke();
    ctx.fillStyle = 'rgba(214, 110, 40, 0.95)';
    ctx.fill();
  }
  if (tarlada(tarla.igne)) return;
  const p = igneKonumu(tarla);
  igneIsareti(ctx, (p.x + 0.5) * OLCEK, (p.y + 0.5) * OLCEK, tarla.igne.aci, zaman);
}, 'ust');
