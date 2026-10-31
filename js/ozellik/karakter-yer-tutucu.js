/**
 * GEÇİCİ yer tutucu çizim: asıl karakter ve makine çizimi (js/ozellik/gorsel/) gelene dek
 * çiftçiyi ve makineleri basit şekillerle çizer ('ust' katman). Yalnız durum.karakter ve
 * durum.makineler verisini okur. Birleştirmede kaldırılacak (ana.js'teki satırıyla).
 */
import { katmanEkle, OLCEK } from '../cizim.js';

function makineCiz(ctx, m) {
  const boy = 4 * OLCEK;
  const en = 2.6 * OLCEK;
  ctx.save();
  ctx.translate(m.x * OLCEK, m.y * OLCEK);
  ctx.rotate(m.yon);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-boy / 2 + 1.5, -en / 2 + 1.5, boy, en);
  ctx.fillStyle = m.takili ? '#b8402f' : '#c8462f';
  ctx.fillRect(-boy / 2, -en / 2, boy, en);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-boy / 2, -en / 2 - 1.5, boy * 0.45, 2); // tekerlekler
  ctx.fillRect(-boy / 2, en / 2 - 0.5, boy * 0.45, 2);
  ctx.fillStyle = '#9aa3ad'; // kepçe
  ctx.fillRect(boy / 2 + 1, -en / 2 - 1, 3.5, en + 2);
  if (m.yuk > 0) {
    ctx.fillStyle = '#f2d16b';
    ctx.fillRect(boy / 2 + 1.5, -en / 2 - 0.5, 2.5, (en + 1) * m.yuk);
  }
  if (m.icerik && m.icerik.igne) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boy / 2 + 2, -1, 1.5, 2);
  }
  ctx.restore();
  // Yakıt çubuğu
  const x = m.x * OLCEK - 8;
  const y = m.y * OLCEK - 2.6 * OLCEK;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 0.5, y - 0.5, 17, 3);
  ctx.fillStyle = m.yakit > 0.2 ? '#7fd36b' : '#ff6b4a';
  ctx.fillRect(x, y, 16 * m.yakit, 2);
}

function karakterCiz(ctx, k, zaman) {
  const x = k.x * OLCEK;
  const y = k.y * OLCEK;
  const sallan = k.hareketli ? Math.sin(k.adimFaz * Math.PI * 2) * 0.8 : 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 1.5, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d6fb6'; // tulum
  ctx.beginPath();
  ctx.arc(x, y + sallan * 0.3, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c27a'; // hasır şapka
  ctx.beginPath();
  ctx.arc(x, y - 0.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = k.kullaniyor && zaman % 300 < 150 ? '#ffffff' : '#2a1d10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(k.yon) * 1.5, y + Math.sin(k.yon) * 1.5);
  ctx.lineTo(x + Math.cos(k.yon) * 4.2, y + Math.sin(k.yon) * 4.2);
  ctx.stroke();
}

katmanEkle((ctx, durum, zaman) => {
  if (!durum.karakter) return;
  for (const m of durum.makineler) makineCiz(ctx, m);
  if (!durum.karakter.makine) karakterCiz(ctx, durum.karakter, zaman);
}, 'ust');
