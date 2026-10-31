/**
 * Yerde solan izler: tekerlek izi ve yüksek samanda ayak izi. Yalnız çizim katmanında
 * yaşar (tarla verisine yazılmaz); sınırlı halka havuz, en eskisinin üstüne yazılır.
 * Piksel uzayında çizilir ('alt' katman, makine ve çiftçinin altında).
 */
import { izAlfa } from './hareket-desen.js';

export const IZ_AZAMI = 160;
const izler = [];
let sonraki = 0;

/** İz ekler: { x, y (piksel), aci, uzun, en, bas (ms), omur (ms), alfa, renk 'r, g, b' }. */
export function izEkle(iz) {
  if (izler.length < IZ_AZAMI) izler.push(iz);
  else izler[sonraki] = iz;
  sonraki = (sonraki + 1) % IZ_AZAMI;
}

export function izleriSil() {
  izler.length = 0;
  sonraki = 0;
}

export function izSayisi() {
  return izler.length;
}

export function izleriCiz(ctx, zaman) {
  if (izler.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const iz of izler) {
    const a = izAlfa(zaman - iz.bas, iz.omur, iz.alfa);
    if (a < 0.01) continue;
    const dx = Math.cos(iz.aci) * iz.uzun * 0.5;
    const dy = Math.sin(iz.aci) * iz.uzun * 0.5;
    ctx.strokeStyle = `rgba(${iz.renk}, ${a.toFixed(3)})`;
    ctx.lineWidth = iz.en;
    ctx.beginPath();
    ctx.moveTo(iz.x - dx, iz.y - dy);
    ctx.lineTo(iz.x + dx, iz.y + dy);
    ctx.stroke();
  }
  ctx.restore();
}
