/**
 * Çiftlik çizimleri: Enerji ailesi (el krankı, yel değirmeni, lokomobil, şaft, volan).
 * GEÇİCİ yer tutucu çizim (c-enerji işi): düz renkli, dış hatlı basit şekiller; H2
 * (c-gorsel-parcalar) bu dosyayı "boyalı oyuncak" diliyle değiştirir. Dönüş hızları kural
 * verisinden gelir (yel: p.ozel.bg, lokomobil: p.ozel.yuk, volan: p.ozel.dolu).
 */
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';
import { ENERJI } from '../../../kural/ciftlik/ag/enerji.js';

const K = KARO_PX;

function govdeKutusu(ctx, p, renk, eb) {
  ctx.fillStyle = renk;
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.fillRect(p.x * K + 0.5, p.y * K + 0.5, p.en * K - 1, p.boy * K - 1);
  ctx.strokeRect(p.x * K + 0.5, p.y * K + 0.5, p.en * K - 1, p.boy * K - 1);
}

/** Merkezde `aci` kadar dönmüş, `kol` spokeli çark (hareketli çizimde kullanılır). */
function carkCiz(ctx, cx, cy, r, aci, kol, renk) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(aci);
  ctx.strokeStyle = renk;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i < kol; i++) {
    const a = (i * Math.PI * 2) / kol;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

const merkez = (p) => [(p.x + p.en / 2) * K, (p.y + p.boy / 2) * K];

parcaCizimiTanimla('saft', {
  govde(ctx, p, eb) {
    govdeKutusu(ctx, p, '#6b6258', eb);
    ctx.fillStyle = '#b8b2a7';
    ctx.fillRect(p.x * K + 1, p.y * K + K / 2 - 0.8, K - 2, 1.6);
    ctx.fillRect(p.x * K + K / 2 - 0.8, p.y * K + 1, 1.6, K - 2);
  },
});

parcaCizimiTanimla('el-kranki', {
  govde(ctx, p, eb) {
    govdeKutusu(ctx, p, '#7a6a55', eb);
  },
  hareketli(ctx, p, an) {
    const [cx, cy] = merkez(p);
    const donuyor = p.ozel.kalan > 0;
    carkCiz(ctx, cx, cy, K * 0.4, donuyor ? an.zaman / 120 : 0, 2, '#d9c9a8');
  },
});

parcaCizimiTanimla('yel-degirmeni', {
  govde(ctx, p, eb) {
    govdeKutusu(ctx, p, '#a8743a', eb);
  },
  hareketli(ctx, p, an) {
    const [cx, cy] = merkez(p);
    const hiz = p.ozel.bg / ENERJI.YEL_BG[3];
    carkCiz(ctx, cx, cy, K * 1.6, (an.zaman / 700) * hiz * 3, 4, '#f1e6c8');
    ctx.fillStyle = MUREKKEP;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  },
});

parcaCizimiTanimla('lokomobil', {
  govde(ctx, p, eb) {
    govdeKutusu(ctx, p, '#3d4349', eb);
    const [cx, cy] = merkez(p);
    ctx.fillStyle = '#7a1f12';
    ctx.fillRect(cx - K * 1.2, cy - K * 0.5, K * 2.4, K);
  },
  hareketli(ctx, p, an) {
    const [cx, cy] = merkez(p);
    const yuk = p.ozel.yuk / ENERJI.LOKO_BG;
    carkCiz(ctx, cx + K, cy, K * 0.5, (an.zaman / 300) * yuk, 6, '#c8401f');
    if (yuk <= 0) return;
    ctx.fillStyle = `rgba(40, 40, 40, ${0.25 + yuk * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx - K, cy - K * 0.7 - ((an.zaman / 80) % 3), 1 + yuk, 0, Math.PI * 2);
    ctx.fill();
  },
});

parcaCizimiTanimla('volan', {
  govde(ctx, p, eb) {
    govdeKutusu(ctx, p, '#5d6469', eb);
  },
  hareketli(ctx, p, an) {
    const [cx, cy] = merkez(p);
    const doluluk = p.ozel.dolu / ENERJI.VOLAN_KAP;
    carkCiz(ctx, cx, cy, K * 0.85, (an.zaman / 500) * doluluk * 4, 8, '#b8b2a7');
  },
});
