/**
 * Çiftlik çizimleri: İşleme ailesi (ot savurucu, kurutma ambarı, balya presi, çekiçli kıyıcı,
 * gübre çukuru). GEÇİCİ yer tutucu: gövde + işaret şekli + ön noktası; boyalı oyuncak çizimi
 * H2 işidir (parcalar.md G satırları). `yerTutucu` depo-kol.js de kullanır.
 */
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';

/** Dış hatlı gövde + `isaret(ctx, cx, cy, m, eb, p)` + önü gösteren nokta (yönlüyse). */
export function yerTutucu(anahtar, renk, isaret) {
  parcaCizimiTanimla(anahtar, {
    govde(ctx, p, eb) {
      const x = p.x * KARO_PX;
      const y = p.y * KARO_PX;
      const en = p.en * KARO_PX;
      const boy = p.boy * KARO_PX;
      ctx.fillStyle = renk;
      ctx.fillRect(x + 0.5, y + 0.5, en - 1, boy - 1);
      ctx.strokeStyle = MUREKKEP;
      ctx.lineWidth = 1.2 * eb;
      ctx.strokeRect(x + 0.5, y + 0.5, en - 1, boy - 1);
      const cx = x + en / 2;
      const cy = y + boy / 2;
      isaret(ctx, cx, cy, Math.min(en, boy), eb, p);
      if (!p.tanim.yonlu) return;
      ctx.fillStyle = MUREKKEP;
      ctx.beginPath();
      ctx.arc(cx + DX[p.yon] * (en / 2 - 1.2), cy + DY[p.yon] * (boy / 2 - 1.2), 0.9, 0,
        Math.PI * 2);
      ctx.fill();
    },
  });
}

/** Dış hatlı dolu daire. */
export function daire(ctx, cx, cy, r, dolgu, eb) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = dolgu;
  ctx.fill();
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.stroke();
}

/** Dış hatlı dikdörtgen (merkezden). */
export function kutu(ctx, cx, cy, en, boy, dolgu, eb) {
  ctx.fillStyle = dolgu;
  ctx.fillRect(cx - en / 2, cy - boy / 2, en, boy);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeRect(cx - en / 2, cy - boy / 2, en, boy);
}

yerTutucu('ot-savurucu', '#6f8a3c', (ctx, cx, cy, m, eb, p) => {
  const yatay = (p.yon & 1) === 0;
  for (const k of [-1, 0, 1]) {
    daire(ctx, cx + (yatay ? k * 8 : 0), cy + (yatay ? 0 : k * 8), m * 0.28, '#d9b44a', eb);
  }
});
yerTutucu('kurutma-ambari', '#8a5a3a', (ctx, cx, cy, m, eb) => {
  ctx.beginPath();
  ctx.moveTo(cx - m * 0.4, cy + m * 0.1);
  ctx.lineTo(cx, cy - m * 0.35);
  ctx.lineTo(cx + m * 0.4, cy + m * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#b83a26';
  ctx.fill();
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.stroke();
  daire(ctx, cx, cy + m * 0.22, m * 0.1, '#d9d2c0', eb);
});
yerTutucu('balya-presi', '#4f7a3a', (ctx, cx, cy, m, eb, p) => {
  kutu(ctx, cx, cy, m * 0.7, m * 0.45, '#e0b03c', eb);
  if (p.tikali) daire(ctx, cx, cy, m * 0.14, '#c8401f', eb);
});
yerTutucu('cekicli-kiyici', '#6e6a62', (ctx, cx, cy, m, eb, p) => {
  daire(ctx, cx, cy, m * 0.36, p.ozel.kirik ? '#c8401f' : '#9aa3ab', eb);
  daire(ctx, cx, cy, m * 0.1, '#4a3a2b', eb);
});
yerTutucu('gubre-cukuru', '#5a4a2a', (ctx, cx, cy, m, eb) => {
  daire(ctx, cx, cy, m * 0.36, '#3e3420', eb);
  daire(ctx, cx + m * 0.12, cy - m * 0.1, m * 0.08, '#6f9a3c', eb);
});
