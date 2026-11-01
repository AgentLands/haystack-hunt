/**
 * İnşa önizlemesi ("hayalet"): seçili parça imleç karosunda yarı saydam çizilir; zemin
 * yeşil (kurulur) ya da kırmızı çizgili (kurulmaz; renk körlüğü için desenli) ve ✕ işaretli.
 * Bant yolu karo karo gösterilir (mevcut bant yeniden yönlenir: geçerli). Sök kipinde
 * imleçteki parça kırmızı çerçeve alır. Çıkış portları küçük üçgenle gösterilir.
 */
import { insa, yerlesimKonumu } from '../insa.js';
import { parcaTanimi, parcaOrnegi } from '../../../kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli, parcaAt } from '../../../kural/ciftlik/izgara.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';
import { ekranBirim } from '../../../cizim/tuval-olcek.js';
import { KARO_PX, MUREKKEP, parcaCizimi } from './kayit.js';

const YESIL = 'rgba(78, 160, 60, 0.35)';
const KIRMIZI = 'rgba(200, 50, 30, 0.45)';

function zemin(ctx, x, y, en, boy, gecerli, eb) {
  const px = x * KARO_PX;
  const py = y * KARO_PX;
  ctx.fillStyle = gecerli ? YESIL : KIRMIZI;
  ctx.fillRect(px, py, en * KARO_PX, boy * KARO_PX);
  ctx.strokeStyle = gecerli ? 'rgba(220, 255, 200, 0.9)' : 'rgba(255, 220, 200, 0.95)';
  ctx.lineWidth = 1.5 * eb;
  ctx.strokeRect(px, py, en * KARO_PX, boy * KARO_PX);
  if (gecerli) return;
  ctx.beginPath();
  for (let t = 0; t < (en + boy) * KARO_PX; t += 3) {
    ctx.moveTo(px + Math.min(t, en * KARO_PX), py + Math.max(0, t - en * KARO_PX));
    ctx.lineTo(px + Math.max(0, t - boy * KARO_PX), py + Math.min(t, boy * KARO_PX));
  }
  ctx.stroke();
}

function hayalet(ctx, c, tarla, anahtar, x, y, yon, eb, gecerliZorla = false) {
  const tanim = parcaTanimi(anahtar);
  const p = parcaOrnegi(tanim, 0, x, y, yon);
  const gecerli = gecerliZorla || !yerlestirmeEngeli(c, tarla, tanim, x, y, yon);
  zemin(ctx, x, y, p.en, p.boy, gecerli, eb);
  ctx.globalAlpha = 0.6;
  parcaCizimi(anahtar).govde(ctx, p, eb);
  ctx.globalAlpha = 1;
  ctx.fillStyle = MUREKKEP;
  for (const port of p.cikis) {
    const cx = (port.kx + 0.5 + DX[port.yon] * 0.62) * KARO_PX;
    const cy = (port.ky + 0.5 + DY[port.yon] * 0.62) * KARO_PX;
    ctx.beginPath();
    ctx.moveTo(cx + DX[port.yon] * 1.6, cy + DY[port.yon] * 1.6);
    ctx.lineTo(cx - DY[port.yon] * 1.4, cy + DX[port.yon] * 1.4);
    ctx.lineTo(cx + DY[port.yon] * 1.4, cy - DX[port.yon] * 1.4);
    ctx.fill();
  }
}

export function onizlemeCiz(ctx, durum) {
  if (!insa.acik || !insa.secili || !insa.hayalet) return;
  const c = durum.ciftlik;
  const eb = ekranBirim(ctx);
  const { kx, ky } = insa.hayalet;
  if (insa.secili === 'sok') {
    const p = parcaAt(c, kx, ky);
    if (p) zemin(ctx, p.x, p.y, p.en, p.boy, false, eb);
    return;
  }
  if (insa.yol) {
    for (const k of insa.yol) {
      const var_ = parcaAt(c, k.kx, k.ky)?.tanim.anahtar === insa.secili;
      hayalet(ctx, c, durum.tarla, insa.secili, k.kx, k.ky, k.yon, eb, var_);
    }
    return;
  }
  const { x, y } = yerlesimKonumu(insa.secili, kx, ky, insa.yon);
  hayalet(ctx, c, durum.tarla, insa.secili, x, y, insa.yon, eb);
}
