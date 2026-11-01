/**
 * Parça simgesi: palet kartı ve inceleme paneli için parçanın kendi gövde çizimi
 * (gorsel/kayit.js parcaCizimi; tanımsızsa yedek kutu) küçük bir tuvale sığdırılır. Hayalet
 * gibi `kur` çağrılmadan çizilir (çizim sözleşmesi: govde ozel'siz de çalışır). Kilitli
 * parça gri siluet olur (renkler doygunluksuz, soluk).
 */
import { parcaTanimi, parcaOrnegi } from '../../kural/ciftlik/parca-kayit.js';
import { KARO_PX, parcaCizimi } from './gorsel/kayit.js';

/** tuval'e (CSS boyu öğe boyutundan) anahtar parçasını yon yönünde çizer. */
export function simgeCiz(tuval, anahtar, yon = 0, { kilitli = false } = {}) {
  const tanim = parcaTanimi(anahtar);
  if (!tanim) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const css = tuval.clientWidth || Number(tuval.getAttribute('width')) || 40;
  tuval.width = Math.round(css * dpr);
  tuval.height = Math.round(css * dpr);
  const ctx = tuval.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, tuval.width, tuval.height);
  const p = parcaOrnegi(tanim, 0, 0, 0, yon);
  const boyut = Math.max(p.en, p.boy) * KARO_PX;
  const s = (tuval.width * 0.86) / boyut;
  const ox = (tuval.width - p.en * KARO_PX * s) / 2;
  const oy = (tuval.height - p.boy * KARO_PX * s) / 2;
  ctx.setTransform(s, 0, 0, s, ox, oy);
  if (kilitli) ctx.filter = 'grayscale(1) brightness(0.55) contrast(0.6)';
  parcaCizimi(anahtar).govde(ctx, p, dpr / s);
  ctx.filter = 'none';
}
