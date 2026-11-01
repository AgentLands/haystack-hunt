/**
 * Dikey dilim çizimleri ("boyalı oyuncak": düz renk, ekran-sabit koyu kahve dış hat, ışık
 * tarafında tek açık ton): bant (kasa + kayan çıtalar), emici huni (boyalı teneke huni,
 * çıkış ağzı), sandık (tahta kasa + doluluk), eşyalar (saman tutamı, iğne, çivi, buluntu).
 * Görsel ajanı bunları iyileştirebilir; sözleşme gorsel/kayit.js'te.
 */
import {
  parcaCizimiTanimla, esyaCizimiTanimla, KARO_PX, MUREKKEP,
} from './kayit.js';
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

// --- Bant: kasa (önbellekte), çıtalar (her kare, faz ile kayar) ---
parcaCizimiTanimla('bant', {
  govde(ctx, p, eb) {
    const x = p.x * K;
    const y = p.y * K;
    kutu(ctx, x + 0.3, y + 0.3, K - 0.6, K - 0.6, '#4a3a2b', eb);
    ctx.fillStyle = '#6e5a44';
    const yatay = (p.yon & 1) === 0;
    if (yatay) ctx.fillRect(x + 0.3, y + 1.4, K - 0.6, K - 2.8);
    else ctx.fillRect(x + 1.4, y + 0.3, K - 2.8, K - 0.6);
  },
  hareketli(ctx, p, an) {
    const x = p.x * K;
    const y = p.y * K;
    const yatay = (p.yon & 1) === 0;
    const ileri = DX[p.yon] + DY[p.yon];
    const kay = (((an.faz * ileri) % 2) + 2) % 2;
    ctx.fillStyle = '#8c7556';
    for (let t = kay - 2; t < K; t += 2) {
      if (t < 0.4 || t > K - 1.2) continue;
      if (yatay) ctx.fillRect(x + t, y + 1.6, 0.8, K - 3.2);
      else ctx.fillRect(x + 1.6, y + t, K - 3.2, 0.8);
    }
    ctx.fillStyle = MUREKKEP;
    ctx.globalAlpha = 0.5;
    const cx = x + K / 2 + DX[p.yon] * 2.4;
    const cy = y + K / 2 + DY[p.yon] * 2.4;
    ctx.beginPath();
    ctx.moveTo(cx + DX[p.yon] * 1.1, cy + DY[p.yon] * 1.1);
    ctx.lineTo(cx - DY[p.yon] * 1.1 - DX[p.yon], cy + DX[p.yon] * 1.1 - DY[p.yon]);
    ctx.lineTo(cx + DY[p.yon] * 1.1 - DX[p.yon], cy - DX[p.yon] * 1.1 - DY[p.yon]);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
});

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

// --- Eşyalar ---
esyaCizimiTanimla('saman', (ctx, r, eb) => {
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 0.6, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#e3b341';
  ctx.fill();
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.1 * eb;
  ctx.stroke();
  ctx.strokeStyle = '#fff0c0';
  ctx.lineWidth = 0.9 * eb;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.05);
  ctx.lineTo(r * 0.35, -r * 0.35);
  ctx.stroke();
});

esyaCizimiTanimla('igne', (ctx, r, eb) => {
  ctx.lineCap = 'round';
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 2.6 * eb;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, r * 0.5);
  ctx.lineTo(r * 0.8, -r * 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#c3cad1';
  ctx.lineWidth = 1.2 * eb;
  ctx.stroke();
});

esyaCizimiTanimla('civi', (ctx, r, eb) => {
  ctx.lineCap = 'round';
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 2.8 * eb;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.6);
  ctx.lineTo(r * 0.6, r * 0.6);
  ctx.stroke();
  ctx.strokeStyle = '#a0522d';
  ctx.lineWidth = 1.4 * eb;
  ctx.stroke();
  ctx.fillStyle = '#a0522d';
  ctx.fillRect(-r * 0.75, -r * 0.75, r * 0.5, r * 0.5);
});
