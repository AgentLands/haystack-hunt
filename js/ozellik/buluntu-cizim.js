/**
 * Buluntu çizimi: açığa çıkan eşya boyalı oyuncak tarzında (buluntu-sekil.js), ilk anda
 * küçük bir "pop" ve altın halka; yüzeye yakın olanlar ara sıra sıcak altın pırıltı (iğnenin
 * beyaz, çivinin turuncu pırıltısından ayrı). Alınca "+1 Yüksük" yazısı yukarı süzülür.
 */
import { katmanEkle, OLCEK } from '../cizim.js';
import { dinle } from '../olaylar.js';
import { turBilgisi, buluntuDerinligi, yakinBuluntular } from '../kural/buluntu.js';
import { GOLGE_RENGI } from './gorsel/ortak.js';
import { buluntuSekil } from './buluntu-sekil.js';
import { ekranBirim, HAT } from './buluntu-parca.js';

/** Eşyanın tarladaki yarıçapı (hücre). */
const BOY = 2.3;
const POP_MS = 700;
const YAZI_MS = 1700;
const PARILTI_ESIK = 4;
const ALTIN = (alfa) => `rgba(255, 196, 64, ${alfa})`;

let yazilar = [];

function cizgi(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Dört uçlu sıcak altın pırıltı yıldızı. */
function yildiz(ctx, x, y, boy, alfa) {
  ctx.strokeStyle = ALTIN(alfa);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.4;
  cizgi(ctx, x - boy, y, x + boy, y);
  cizgi(ctx, x, y - boy, x, y + boy);
  ctx.lineWidth = 0.9;
  const k = boy * 0.45;
  cizgi(ctx, x - k, y - k, x + k, y + k);
  cizgi(ctx, x - k, y + k, x + k, y - k);
}

function esyaCiz(ctx, b, zaman) {
  const x = (b.x + 0.5) * OLCEK;
  const y = (b.y + 0.5) * OLCEK;
  const gecen = b.acikSure === null ? POP_MS : zaman - b.acikSure;
  const pop = gecen < POP_MS ? 1 + 0.35 * Math.exp(-gecen / 110) * Math.cos(gecen / 55) : 1;
  const boy = BOY * OLCEK * pop;
  ctx.fillStyle = GOLGE_RENGI;
  ctx.beginPath();
  ctx.ellipse(x + boy * 0.12, y + boy * 0.22, boy * 0.78, boy * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.aci);
  ctx.scale(boy, boy);
  buluntuSekil(ctx, b.tur, ekranBirim(ctx));
  ctx.restore();
  if (gecen < 900) { // açılış halkası
    const t = gecen / 900;
    ctx.strokeStyle = ALTIN(0.8 * (1 - t));
    ctx.lineWidth = 2 * (1 - t) + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, boy * (0.6 + 1.2 * t), 0, Math.PI * 2);
    ctx.stroke();
  } else if ((zaman + b.x * 71) % 2600 < 220) { // "beni al" göz kırpması
    yildiz(ctx, x + boy * 0.55, y - boy * 0.55, 4, 0.9);
  }
}

function pariltiCiz(ctx, b, zaman) {
  const faz = (zaman + b.x * 53 + b.y * 17) % 2200;
  if (faz > 260) return;
  const alfa = Math.sin((faz / 260) * Math.PI);
  yildiz(ctx, (b.x + 0.5) * OLCEK, (b.y + 0.5) * OLCEK, 2 + 2.5 * alfa, 0.85 * alfa);
}

katmanEkle((ctx, durum, zaman) => {
  const { tarla, buluntular } = durum;
  if (!buluntular) return;
  for (const b of buluntular) {
    if (!b.alindi && buluntuDerinligi(tarla, b) === 0) esyaCiz(ctx, b, zaman);
  }
  for (const b of yakinBuluntular(tarla, buluntular, PARILTI_ESIK)) pariltiCiz(ctx, b, zaman);
}, 'alt');

function yaziCiz(ctx, y, zaman) {
  const t = (zaman - y.t0) / YAZI_MS;
  const birim = ekranBirim(ctx);
  const alfa = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  const yukari = (1 - (1 - t) ** 2) * 3.5 * OLCEK;
  const px = (y.x + 0.5) * OLCEK;
  const py = (y.y + 0.5) * OLCEK - 4 * OLCEK - yukari;
  ctx.globalAlpha = Math.max(0, alfa);
  ctx.font = `${17 * birim}px "Bree Serif", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = HAT;
  ctx.lineWidth = 4 * birim;
  ctx.strokeText(y.metin, px, py);
  ctx.fillStyle = y.yeni ? '#ffd45e' : '#fff4d0';
  ctx.fillText(y.metin, px, py);
  ctx.globalAlpha = 1;
}

katmanEkle((ctx, durum, zaman) => {
  yazilar = yazilar.filter((y) => zaman - y.t0 < YAZI_MS);
  for (const y of yazilar) if (zaman >= y.t0) yaziCiz(ctx, y, zaman);
}, 'ust');

dinle('buluntu-alindi', ({ x, y, tur, yeni }) => {
  const ad = turBilgisi(tur).ad;
  yazilar.push({ x, y, yeni, t0: performance.now(), metin: `+1 ${ad}` });
});
dinle('oyun-basladi', () => {
  yazilar = [];
});
