/**
 * Garaj sundurması ('ust' katman): tarla kenarına yaslı, önü açık, paslı kırmızı oluklu sac
 * beşik çatı (ışığa bakan yarı açık, öteki koyu; sırt kapağı, pas lekeleri, dış hat) ve
 * dört direk. Altında çiftçi ya da sürülen bir makine varken çatı yumuşakça yarı saydam
 * olur (oyuncuyu örtmez). Yerel uzay garaj-cizim ile aynı (+x tarlaya doğru).
 */
import { donuk, ekranBirim, elips, isikYerel, serit, yuvarDik } from './ortak.js';
import { hat } from './makine-ortak.js';
import { onbellekliCiz } from './onbellek.js';

/** Çatının saydam hali (altında biri varken). */
export const CATI_SAYDAM = 0.38;
const saydamlik = new WeakMap();

/** Çatının yerel ölçüsü: x tarla kenarından öne, y park sırası kadar (+ saçak). */
export function catiOlcu(yari) {
  return { cx0: -4.0, cx1: -1.3, cy: yari + 0.4 };
}

/** Dizinden [0, 1) sahte rastgele (çizim kararlı kalsın diye). */
function sahte(i) {
  const v = Math.sin(i * 57.3 + 9.1) * 43758.5453;
  return v - Math.floor(v);
}

/** Dünya noktası (x, y) çatının altında mı (pay kadar genişletilmiş)? */
function altinda(garaj, o, x, y, pay) {
  const dx = x - garaj.x;
  const dy = y - garaj.y;
  const c = Math.cos(garaj.yon);
  const s = Math.sin(garaj.yon);
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  return lx > o.cx0 - pay && lx < o.cx1 + pay && Math.abs(ly) < o.cy + pay;
}

/** Çatının altında çiftçi ya da sürülen makine var mı? */
export function catiDolu(durum, o) {
  const { garaj, karakter, makineler } = durum;
  if (karakter && altinda(garaj, o, karakter.x, karakter.y, 0.9)) return true;
  return (makineler || []).some((m) => m.surucu && altinda(garaj, o, m.x, m.y, 1.5));
}

/** Çatının alttan görünen dört direği (çatı saydamken görünür). */
export function direklerCiz(ctx, o) {
  const eb = ekranBirim(ctx);
  const x = o.cx1 - 0.3;
  for (const y of [-o.cy + 0.3, -o.cy / 3, o.cy / 3, o.cy - 0.3]) {
    yuvarDik(ctx, x - 0.14, y - 0.14, 0.28, 0.28, 0.05);
    hat(ctx, '#5d6469', eb, 0.9);
  }
}

/** Oluklu sac yüzey: yarı (x0..x1) düz renkte, kenar boyunca oluk çizgileri. */
function sacYari(ctx, x0, x1, cy, renk, oluk) {
  ctx.fillStyle = renk;
  ctx.fillRect(x0, -cy, x1 - x0, cy * 2);
  ctx.strokeStyle = oluk;
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  for (let y = -cy + 0.25; y < cy; y += 0.36) {
    ctx.moveTo(x0 + 0.04, y);
    ctx.lineTo(x1 - 0.04, y);
  }
  ctx.stroke();
}

/** Çatıyı garajın yerel uzayında çizer. */
function cati(ctx, o, isik) {
  const eb = ekranBirim(ctx);
  const orta = (o.cx0 + o.cx1) / 2;
  yuvarDik(ctx, o.cx0, -o.cy, o.cx1 - o.cx0, o.cy * 2, 0.08);
  hat(ctx, '#7a3019', eb, 1.3);
  const onAcik = isik[0] > -0.15;
  const arkaAcik = isik[0] < 0.15;
  sacYari(ctx, o.cx0 + 0.06, orta, o.cy - 0.06, arkaAcik ? '#c4583a' : '#8e3a22',
    arkaAcik ? 'rgba(255, 210, 170, 0.28)' : 'rgba(40, 14, 6, 0.3)');
  sacYari(ctx, orta, o.cx1 - 0.06, o.cy - 0.06, onAcik ? '#c4583a' : '#8e3a22',
    onAcik ? 'rgba(255, 210, 170, 0.28)' : 'rgba(40, 14, 6, 0.3)');
  for (let i = 0; i < 9; i++) {
    const x = o.cx0 + 0.3 + sahte(i) * (o.cx1 - o.cx0 - 0.6);
    const y = (sahte(i + 30) - 0.5) * (o.cy * 2 - 0.8);
    elips(ctx, x, y, 0.18 + sahte(i + 60) * 0.35, 0.3 + sahte(i + 70) * 0.6);
    ctx.fillStyle = i % 3 ? 'rgba(110, 58, 28, 0.35)' : 'rgba(214, 128, 60, 0.35)';
    ctx.fill();
  }
  serit(ctx, orta, -o.cy + 0.02, orta, o.cy - 0.02, 0.24, '#6f2c18');
  serit(ctx, orta - 0.04, -o.cy + 0.05, orta - 0.04, o.cy - 0.05, 0.06,
    'rgba(255, 220, 180, 0.4)');
  serit(ctx, o.cx1 - 0.05, -o.cy + 0.05, o.cx1 - 0.05, o.cy - 0.05, 0.1, '#5e2414');
}

/**
 * Çatıyı çizer; altında biri varken yumuşakça yarı saydamlaşır. sahip ve kutu önbellek
 * içindir (garaj-cizim). zaman ms.
 */
export function catiCiz(ctx, durum, o, zaman, sahip, kutu) {
  const { garaj } = durum;
  const t = zaman / 1000;
  const hedef = catiDolu(durum, o) ? CATI_SAYDAM : 1;
  let h = saydamlik.get(garaj);
  if (!h) {
    h = { alfa: hedef, t };
    saydamlik.set(garaj, h);
  }
  const dt = Math.min(0.1, Math.max(0, t - h.t));
  h.alfa += (hedef - h.alfa) * (dt > 0 ? Math.min(1, dt * 8) : 0);
  h.t = t;
  onbellekliCiz(ctx, sahip, `${garaj.yon.toFixed(3)}|${o.cy}`, garaj.x, garaj.y, kutu,
    (c) => donuk(c, 0, 0, garaj.yon, 1, (d) => cati(d, o, isikYerel(garaj.yon))), h.alfa);
}
