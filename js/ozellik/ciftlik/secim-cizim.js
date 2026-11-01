/**
 * Seç ve yapıştır kipinin tuval çizimi ('ust' katman): seçim dikdörtgeni (kesik çizgi) ve
 * seçilen parçaların çerçevesi; yapıştırma hayaleti: parçalar yarı saydam, karo karo yeşil
 * (kurulur) ya da kırmızı çizgili + ✕ (engelli / kilitli; renk körlüğü için desenli); kuruş
 * yetmezse tüm küme kehribar tonlu. Portu aynada kayan (yaklasik) parçalar sarı çerçevelidir.
 */
import { katmanEkle } from '../../cizim.js';
import { ekranBirim } from '../../cizim/tuval-olcek.js';
import { kumeKonumla } from '../../kural/ciftlik/izgara/kume.js';
import { parcaTanimi, parcaOrnegi } from '../../kural/ciftlik/parca-kayit.js';
import { KARO_PX, MUREKKEP, parcaCizimi } from './gorsel/kayit.js';
import { secim, yerlesimKonumu } from './secim.js';

const YESIL = 'rgba(78, 160, 60, 0.35)';
const KIRMIZI = 'rgba(200, 50, 30, 0.5)';
const KEHRIBAR = 'rgba(214, 160, 40, 0.42)';

function dikdortgen(ctx, kx, ky, en, boy, dolgu, eb) {
  ctx.fillStyle = dolgu;
  ctx.fillRect(kx * KARO_PX, ky * KARO_PX, en * KARO_PX, boy * KARO_PX);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.5 * eb;
  ctx.strokeRect(kx * KARO_PX, ky * KARO_PX, en * KARO_PX, boy * KARO_PX);
}

function secimiCiz(ctx, eb) {
  const a = secim.alan;
  if (!a) return;
  ctx.save();
  ctx.setLineDash([4 * eb, 3 * eb]);
  const x0 = Math.min(a.xa, a.xb);
  const y0 = Math.min(a.ya, a.yb);
  dikdortgen(ctx, x0, y0, Math.abs(a.xb - a.xa) + 1, Math.abs(a.yb - a.ya) + 1,
    'rgba(120, 170, 230, 0.22)', eb);
  ctx.restore();
  if (!secim.secilen) return;
  const { kume, ox, oy } = secim.secilen;
  ctx.strokeStyle = '#2c6fd1';
  ctx.lineWidth = 2 * eb;
  for (const q of kumeKonumla(kume, ox, oy)) {
    const p = parcaOrnegi(parcaTanimi(q.kod), 0, q.x, q.y, q.yon);
    ctx.strokeRect(p.x * KARO_PX, p.y * KARO_PX, p.en * KARO_PX, p.boy * KARO_PX);
  }
}

function carpi(ctx, kx, ky, eb) {
  const x = kx * KARO_PX;
  const y = ky * KARO_PX;
  ctx.strokeStyle = 'rgba(255, 235, 220, 0.95)';
  ctx.lineWidth = 1.2 * eb;
  ctx.beginPath();
  for (let t = 0; t <= KARO_PX; t += 3) {
    ctx.moveTo(x + t, y);
    ctx.lineTo(x, y + t);
  }
  ctx.moveTo(x + 1, y + 1);
  ctx.lineTo(x + KARO_PX - 1, y + KARO_PX - 1);
  ctx.moveTo(x + KARO_PX - 1, y + 1);
  ctx.lineTo(x + 1, y + KARO_PX - 1);
  ctx.stroke();
}

function hayaleti(ctx, eb) {
  const { ox, oy } = yerlesimKonumu();
  const yerler = kumeKonumla(secim.kume, ox, oy);
  const den = secim.denetim;
  const engel = new Set((den?.engelli ?? []).map((e) => `${e.kx},${e.ky}`));
  const yetmez = den?.eksik > 0;
  for (const q of yerler) {
    const p = parcaOrnegi(parcaTanimi(q.kod), 0, q.x, q.y, q.yon);
    for (let ky = p.y; ky < p.y + p.boy; ky++) {
      for (let kx = p.x; kx < p.x + p.en; kx++) {
        const kotu = engel.has(`${kx},${ky}`);
        dikdortgen(ctx, kx, ky, 1, 1, kotu ? KIRMIZI : yetmez ? KEHRIBAR : YESIL, eb);
        if (kotu) carpi(ctx, kx, ky, eb);
      }
    }
    ctx.globalAlpha = 0.6;
    parcaCizimi(parcaTanimi(q.kod).anahtar).govde(ctx, p, eb);
    ctx.globalAlpha = 1;
    if (secim.kume.yaklasik?.includes(parcaTanimi(q.kod).anahtar)) {
      ctx.strokeStyle = '#e0b020';
      ctx.lineWidth = 2 * eb;
      ctx.strokeRect(p.x * KARO_PX, p.y * KARO_PX, p.en * KARO_PX, p.boy * KARO_PX);
    }
  }
}

katmanEkle((ctx, durum) => {
  if (durum.mod !== 'ciftlik' || !secim.kip) return;
  const eb = ekranBirim(ctx);
  if (secim.kip === 'sec') secimiCiz(ctx, eb);
  else if (secim.kume && secim.hayalet) hayaleti(ctx, eb);
}, 'ust');
