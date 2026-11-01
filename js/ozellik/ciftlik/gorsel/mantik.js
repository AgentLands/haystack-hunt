/**
 * Çiftlik çizimleri: Mantık ailesi (rüzgâr gülü, savak kapağı, kantar, kile sayacı).
 * GEÇİCİ yer tutucu çizim (H2 gerçek "boyalı oyuncak" çizimlerini yazınca değişir): ahşap
 * gövde + renk kanalı lambası. Lamba: yazıcıda yazıyorsa dolu (renk kanalı), okuyucuda kapıysa
 * kapalıyken dolu; değilse yalnız renk halkası. Renkler belirtec.css tonlarıdır.
 */
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';

const K = KARO_PX;
/** Kanal renkleri: kırmızı, çivit, sarı, yeşil, mor, beyaz (kural/ciftlik/ag/sinyal.js sırası). */
export const RENK_HEX = ['#b8402a', '#2f4a6d', '#e3b341', '#4e6b2f', '#7a4a8a', '#f4e9d0'];

function govdeCiz(ctx, p, eb, ic) {
  const x = p.x * K;
  const y = p.y * K;
  ctx.fillStyle = '#6e5a44';
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.fillRect(x + 0.4, y + 0.4, K - 0.8, K - 0.8);
  ctx.strokeRect(x + 0.4, y + 0.4, K - 0.8, K - 0.8);
  ic?.(ctx, x, y);
}

/** Köşede renk lambası; dolu = sinyal var. */
function lamba(ctx, p, dolu) {
  const renk = RENK_HEX[p.ozel.renk] ?? '#888';
  const cx = p.x * K + K - 2.2;
  const cy = p.y * K + 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 1.3, 0, Math.PI * 2);
  ctx.fillStyle = dolu ? renk : '#2a1a0d';
  ctx.fill();
  ctx.strokeStyle = renk;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/** Yönlü gösterge: parçanın baktığı yönde küçük üçgen (savak/kile akış yönü). */
function ok(ctx, p) {
  const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][p.yon];
  const cx = p.x * K + K / 2;
  const cy = p.y * K + K / 2;
  ctx.fillStyle = '#d9b98a';
  ctx.beginPath();
  ctx.moveTo(cx + dx * 2.2, cy + dy * 2.2);
  ctx.lineTo(cx - dx * 1.2 - dy * 1.6, cy - dy * 1.2 + dx * 1.6);
  ctx.lineTo(cx - dx * 1.2 + dy * 1.6, cy - dy * 1.2 - dx * 1.6);
  ctx.fill();
}

parcaCizimiTanimla('ruzgar-gulu', {
  govde: (ctx, p, eb) => govdeCiz(ctx, p, eb, (c, x, y) => {
    c.fillStyle = '#d9b98a';
    c.fillRect(x + K / 2 - 0.5, y + 1.5, 1, K - 3);
  }),
  hareketli: (ctx, p) => lamba(ctx, p, p.ozel.yaz > 0),
});

parcaCizimiTanimla('savak-kapagi', {
  govde: (ctx, p, eb) => govdeCiz(ctx, p, eb),
  hareketli(ctx, p) {
    ok(ctx, p);
    lamba(ctx, p, p.ozel.kapali === 1);
    if (p.ozel.kapali) { // kapalıyken sürgü iner
      ctx.fillStyle = MUREKKEP;
      const dik = (p.yon & 1) === 0;
      if (dik) ctx.fillRect(p.x * K + K / 2 - 0.8, p.y * K + 0.6, 1.6, K - 1.2);
      else ctx.fillRect(p.x * K + 0.6, p.y * K + K / 2 - 0.8, K - 1.2, 1.6);
    }
  },
});

parcaCizimiTanimla('kantar', {
  govde: (ctx, p, eb) => govdeCiz(ctx, p, eb, (c, x, y) => {
    c.fillStyle = '#b8925e';
    c.fillRect(x + 1.5, y + K - 3.5, K - 3, 1.6);
  }),
  hareketli(ctx, p) {
    lamba(ctx, p, p.ozel.yaz > 0);
    ctx.fillStyle = '#f4e9d0'; // ibre: doluluğa göre
    const bas = p.x * K + 1.6;
    ctx.fillRect(bas + ((K - 3.2) * p.ozel.yuzde) / 100 - 0.4, p.y * K + 2.2, 0.8, K - 6);
  },
});

parcaCizimiTanimla('kile-sayaci', {
  govde: (ctx, p, eb) => govdeCiz(ctx, p, eb),
  hareketli(ctx, p) {
    ok(ctx, p);
    lamba(ctx, p, p.ozel.yaz > 0);
    ctx.fillStyle = '#f4e9d0'; // çentikler: sayaç doluluğu
    const n = Math.min(p.ozel.n, 10);
    const dolu = Math.floor((p.ozel.say / p.ozel.n) * n);
    for (let i = 0; i < dolu; i++) {
      ctx.fillRect(p.x * K + 1.2 + i * 0.7, p.y * K + K - 2.2, 0.5, 1.2);
    }
  },
});
