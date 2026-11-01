/**
 * Çiftlik çizimleri: Ayıklama ailesi (oluk mıknatısı, mıknatıslı tambur, kalbur, tınaz, şeytan
 * yeli). GEÇİCİ yer tutucu: gövde + işaret şekli + ön ok; boyalı oyuncak çizimi H2 işidir
 * (ciftlik-gorsel-parcalar, parcalar.md G satırları). Kayıt sözleşmesi gorsel/kayit.js'te.
 */
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';

/** Dış hatlı gövde kutusu + `isaret(ctx, cx, cy, en, boy)` + önü gösteren küçük ok. */
function yerTutucu(anahtar, renk, isaret) {
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
      isaret(ctx, cx, cy, Math.min(en, boy), eb);
      ctx.fillStyle = MUREKKEP;
      ctx.beginPath();
      const ox = cx + DX[p.yon] * (en / 2 - 1.2);
      const oy = cy + DY[p.yon] * (boy / 2 - 1.2);
      ctx.arc(ox, oy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    },
  });
}

const daire = (ctx, cx, cy, r, dolgu, eb) => {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = dolgu;
  ctx.fill();
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.stroke();
};

yerTutucu('oluk-miknatisi', '#6e5a44', (ctx, cx, cy, m, eb) => {
  daire(ctx, cx, cy, m * 0.3, '#c8401f', eb);
});
yerTutucu('miknatisli-tambur', '#7a6a55', (ctx, cx, cy, m, eb) => {
  daire(ctx, cx, cy, m * 0.36, '#9aa3ab', eb);
  daire(ctx, cx, cy, m * 0.16, '#c8401f', eb);
});
yerTutucu('kalbur', '#8a7a66', (ctx, cx, cy, m, eb) => {
  daire(ctx, cx, cy, m * 0.38, '#cdbd9a', eb);
  ctx.fillStyle = MUREKKEP;
  for (const [dx, dy] of [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]) {
    ctx.fillRect(cx + dx * m * 0.16 - 0.4, cy + dy * m * 0.16 - 0.4, 0.8, 0.8);
  }
});
yerTutucu('tinaz', '#9c8460', (ctx, cx, cy, m, eb) => daire(ctx, cx, cy, m * 0.42, '#b79c6b', eb));
yerTutucu('seytan-yeli', '#7a6a55', (ctx, cx, cy, m, eb) => {
  daire(ctx, cx, cy, m * 0.36, '#d9d2c0', eb);
  daire(ctx, cx, cy, m * 0.1, '#4a3a2b', eb);
});
