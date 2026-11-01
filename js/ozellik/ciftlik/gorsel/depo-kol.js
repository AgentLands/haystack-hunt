/**
 * Çiftlik çizimleri: Depo ve kol ailesi (ambar, defter masası, yaba kolu, Komşu kapısı).
 * GEÇİCİ yer tutucu (gorsel/isleme.js yerTutucu); boyalı oyuncak çizimi H2 işidir.
 */
import { MUREKKEP } from './kayit.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';
import { DEPO_KOL } from '../../../kural/ciftlik/parcalar/depo-kol.js';
import { yerTutucu, daire, kutu } from './isleme.js';

yerTutucu('ambar', '#7a5a3a', (ctx, cx, cy, m, eb, p) => {
  kutu(ctx, cx, cy, m * 0.7, m * 0.7, '#a07850', eb);
  const oran = Math.min(1, p.ozel.toplam / DEPO_KOL.ambar.kap);
  ctx.fillStyle = '#e0b03c';
  ctx.fillRect(cx - m * 0.3, cy + m * 0.3 - m * 0.6 * oran, m * 0.6, m * 0.6 * oran);
});
yerTutucu('defter-masasi', '#8c6a44', (ctx, cx, cy, m, eb) => {
  kutu(ctx, cx, cy, m * 1.2, m * 0.6, '#f2ead8', eb);
  daire(ctx, cx + m * 0.35, cy, m * 0.16, '#c3cad1', eb);
});
yerTutucu('yaba-kolu', '#6e5a44', (ctx, cx, cy, m, eb, p) => {
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.6 * eb;
  ctx.beginPath();
  ctx.moveTo(cx - DX[p.yon] * m * 0.35, cy - DY[p.yon] * m * 0.35);
  ctx.lineTo(cx + DX[p.yon] * m * 0.35, cy + DY[p.yon] * m * 0.35);
  ctx.stroke();
  daire(ctx, cx, cy, m * 0.14, p.ozel.el ? '#e0b03c' : '#b79c6b', eb);
});
yerTutucu('komsu-kapisi', '#5a7a4a', (ctx, cx, cy, m, eb) => {
  kutu(ctx, cx - m * 0.3, cy, m * 0.12, m * 0.8, '#8c6a44', eb);
  kutu(ctx, cx + m * 0.3, cy, m * 0.12, m * 0.8, '#8c6a44', eb);
  kutu(ctx, cx, cy, m * 0.5, m * 0.1, '#d9d2c0', eb);
});
