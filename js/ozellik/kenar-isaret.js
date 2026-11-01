/**
 * Parıltı işaretleri: ekran dışında bir parıltı olursa (iğne ya da iğneli balya) ekranın
 * o yöne bakan kenarında birkaç saniye nabız gibi atan küçük bir ışık oku görünür (yer:
 * kural/parilti.js kenarIsareti). Ayrıca iğneyi içeren balya parıltı anında hafifçe parlar
 * (durum.balyaParilti, oyun-arac.js balyaParlat). Sade harekette ok atmaz, sabit durur.
 * Yalnız olay dinler ve üst katman çizer.
 */
import { dinle } from '../olaylar.js';
import { katmanEkle, OLCEK } from '../cizim.js';
import { gorunum } from '../gorunum.js';
import { gorunurAlan } from '../kural/gorunum.js';
import { kenarIsareti } from '../kural/parilti.js';
import { nabizSade } from './sade-hareket.js';

const ISARET_MS = 3200;
/** Okun ekran kenarından içeri payı (ekran pikseli, z = 1'de). */
const PAY_PX = 18;
const isaretler = [];

function ekle(x, y, guc) {
  isaretler.push({ x, y, guc, bas: performance.now() });
}

dinle('parilti', ({ x, y }) => ekle(x, y, 1));
dinle('balya-parladi', ({ x, y }) => ekle(x, y, 0.6));
dinle('oyun-basladi', () => { isaretler.length = 0; });

function okCiz(ctx, isaret, alan, k, simdi) {
  const t = (simdi - isaret.bas) / ISARET_MS;
  const yer = kenarIsareti(alan, { x: isaret.x + 0.5, y: isaret.y + 0.5 }, PAY_PX * k / OLCEK);
  if (!yer) return;
  const nabiz = 0.6 + 0.4 * nabizSade(Math.sin(simdi / 120), 0.5); // sade: atmaz, sabit
  ctx.save();
  ctx.translate(yer.x * OLCEK, yer.y * OLCEK);
  ctx.scale(k, k);
  ctx.rotate(yer.aci);
  ctx.globalAlpha = isaret.guc * Math.min(1, (1 - t) * 3) * nabiz;
  const isik = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
  isik.addColorStop(0, 'rgba(255, 250, 220, 0.9)');
  isik.addColorStop(1, 'rgba(255, 250, 220, 0)');
  ctx.fillStyle = isik;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6c8';
  ctx.strokeStyle = 'rgba(40, 28, 10, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-5, -7);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function balyaParlat(ctx, p, zaman, k) {
  if (!p || zaman >= p.bitis) return;
  const t = 1 - (p.bitis - zaman) / p.sure;
  const a = Math.sin(Math.PI * t);
  const x = (p.x + 0.5) * OLCEK;
  const y = (p.y + 0.5) * OLCEK;
  ctx.save();
  const r = OLCEK * 3;
  const isik = ctx.createRadialGradient(x, y, 0, x, y, r);
  isik.addColorStop(0, `rgba(255, 252, 230, ${(0.45 * a).toFixed(3)})`);
  isik.addColorStop(1, 'rgba(255, 252, 230, 0)');
  ctx.fillStyle = isik;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 255, 245, ${(0.7 * a).toFixed(3)})`;
  ctx.lineWidth = 1.2 * k;
  const boy = (3 + 5 * a) * k;
  ctx.beginPath();
  ctx.moveTo(x - boy, y - OLCEK);
  ctx.lineTo(x + boy, y - OLCEK);
  ctx.moveTo(x, y - OLCEK - boy);
  ctx.lineTo(x, y - OLCEK + boy);
  ctx.stroke();
  ctx.restore();
}

katmanEkle((ctx, durum, zaman) => {
  const k = 1 / gorunum.z;
  if (!durum.bitti) balyaParlat(ctx, durum.balyaParilti, zaman, k);
  if (!isaretler.length) return;
  const simdi = performance.now();
  const alan = gorunurAlan(gorunum);
  for (let i = isaretler.length - 1; i >= 0; i--) {
    if (simdi - isaretler[i].bas >= ISARET_MS) isaretler.splice(i, 1);
  }
  if (durum.bitti) return;
  for (const isaret of isaretler) okCiz(ctx, isaret, alan, k, simdi);
}, 'ust');
