/**
 * Dikey dilim çizimleri ("boyalı oyuncak": düz renk, ekran-sabit koyu kahve dış hat, ışık
 * tarafında tek açık ton): emici huni (boyalı teneke huni, çıkış ağzı), sandık (tahta kasa +
 * doluluk). Bant bant.js'te, eşyalar esya-atlas.js'te. Sözleşme gorsel/kayit.js'te.
 */
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';
import { SANDIK_KAP } from '../../../kural/ciftlik/parcalar/temel.js';

const K = KARO_PX;

/** Dış hatlı dikdörtgen (iki geçiş: dolgu, sonra ekran-sabit dış hat). */
function kutu(ctx, x, y, en, boy, renk, eb) {
  ctx.fillStyle = renk;
  ctx.fillRect(x, y, en, boy);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeRect(x, y, en, boy);
}

// --- Emici huni: kırmızı boyalı teneke, koyu ağız, çıkış oluğu ---
parcaCizimiTanimla('huni', {
  govde(ctx, p, eb) {
    const x = p.x * K;
    const y = p.y * K;
    const en = p.en * K;
    const boy = p.boy * K;
    kutu(ctx, x + 1, y + 1, en - 2, boy - 2, '#7a6a55', eb);
    const cx = x + en / 2;
    const cy = y + boy / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, en * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#c8401f';
    ctx.fill();
    ctx.strokeStyle = MUREKKEP;
    ctx.lineWidth = 1.2 * eb;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, en * 0.3, Math.PI * 0.9, Math.PI * 1.6);
    ctx.strokeStyle = '#ee5a2a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, en * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#2b1a10';
    ctx.fill();
    for (const port of p.cikis) {
      const ox = port.kx * K + K / 2 + DX[port.yon] * (K / 2 - 1.5);
      const oy = port.ky * K + K / 2 + DY[port.yon] * (K / 2 - 1.5);
      kutu(ctx, ox - 1.6, oy - 1.6, 3.2, 3.2, '#5d6469', eb);
    }
  },
  hareketli(ctx, p, an) {
    if (p.ozel.son <= 0) return;
    const cx = (p.x + p.en / 2) * K;
    const cy = (p.y + p.boy / 2) * K;
    const a = (an.zaman / 160) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 240, 192, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, p.en * K * 0.26, a, a + 1.2);
    ctx.stroke();
  },
});

// --- Sandık: tahta kasa, çıtalar, doluluk (samanla dolan iç) ---
parcaCizimiTanimla('sandik', {
  govde(ctx, p, eb) {
    const x = p.x * K;
    const y = p.y * K;
    kutu(ctx, x + 0.5, y + 0.5, K - 1, K - 1, '#a8743a', eb);
    ctx.fillStyle = '#c99252';
    ctx.fillRect(x + 1, y + 1, K - 2, 1.2);
    ctx.fillStyle = '#5a3a1c';
    ctx.fillRect(x + 1.6, y + 1.6, K - 3.2, K - 3.2);
  },
  hareketli(ctx, p) {
    const oran = Math.min(1, p.ozel.toplam / SANDIK_KAP);
    if (oran <= 0) return;
    const x = p.x * K;
    const y = p.y * K;
    const i = K - 3.2;
    ctx.fillStyle = '#e3b341';
    ctx.fillRect(x + 1.6, y + 1.6 + i * (1 - oran), i, i * oran);
  },
});
