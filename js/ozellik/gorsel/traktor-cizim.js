/**
 * Traktör çizimi (kuş bakışı, boyalı oyuncak): dış hatlı kırmızı-turuncu gövde, büyük arka
 * tekerlekler, direksiyonla dönen ön tekerlekler, ROPS çerçeveli açık kabin ve çizgili
 * güneşlik tentesi (sürücü altından görünür), önde yükleyici kollu kepçe. Kepçe kalkınca
 * ileri kayar, büyür ve gölgesi gövdeninkinden ayrılır; dolu kepçeden ara sıra saman çöpü
 * düşer. yuk (0..1) kepçedeki yığın; motor açıkken duman, hızlanınca pof; yakıtsız sönük.
 */
import { donuk, elips, isikYerel, renk, serit, tekerlek, yuvarDik } from './ortak.js';
import { oturanCiftci } from './ciftci-parca.js';
import {
  celKutu, dumanCiz, hat, hatOlc, hatliSerit, isikBasamak, izleriCiz, kareler, kutuGolgesi,
  makineBilgi, onTekerlek, parcaSahibi,
} from './makine-ortak.js';
import { yerelOnbellek } from './onbellek.js';
import { kepce, kepceGolgesi, kepceKonumu } from './traktor-kepce.js';

const ARKA = [-1.15, 1.5, 1.8, 0.9];
const ON = [1.2, 1.02, 1.0, 0.46];
const KAYMA_X = -0.5;
const GOVDE_GOLGE = [
  [-2.1 + KAYMA_X, -1.7, 2.4, 3.4, 0.4], [0.15 + KAYMA_X, -0.6, 2.0, 1.2, 0.3],
  [-1.9 + KAYMA_X, -0.95, 1.55, 1.9, 0.12, 40],
];
const DIREKLER = [[-1.72, -0.74], [-1.72, 0.74], [-0.5, -0.74], [-0.5, 0.74]];

/** ROPS çerçevesi (dört direk) ve çizgili, yarı saydam güneşlik tentesi. */
function kabin(ctx, k, isik) {
  const s = k.sonuk;
  kareler(ctx, DIREKLER, 0.1, renk('#3b3b3b', s), k.eb);
  ctx.lineCap = 'round';
  ctx.strokeStyle = renk('#2e2e2e', s);
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(-1.72, -0.74);
  ctx.lineTo(-1.72, 0.74);
  ctx.moveTo(-0.5, -0.74);
  ctx.lineTo(-0.5, 0.74);
  ctx.stroke();
  const [x, y, w, h] = [-1.9, -0.95, 1.55, 1.9];
  yuvarDik(ctx, x, y, w, h, 0.12);
  hat(ctx, s ? 'rgba(180, 172, 156, 0.42)' : 'rgba(246, 236, 210, 0.45)', k.eb);
  ctx.fillStyle = s ? 'rgba(110, 90, 80, 0.3)' : 'rgba(178, 52, 24, 0.42)';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.rect(x + 0.06, y + 0.12 + i * 0.47, w - 0.12, 0.2);
  ctx.fill();
  serit(ctx, x + 0.1 - isik[0] * 0.02, y + 0.07, x + w - 0.1, y + 0.07, 0.05,
    'rgba(255, 248, 225, 0.6)');
}

/** Durağan alt gövde: şasi, çamurluklar, kaput, ızgara, farlar, koltuk, egzoz borusu. */
function altGovde(ctx, k, isik) {
  const s = k.sonuk;
  celKutu(ctx, -2.0, -0.78, 2.3, 1.56, 0.22, isik, '#9a3217', '#d4481f', s, k.eb);
  for (const v of [-1, 1]) {
    celKutu(ctx, -2.0, v < 0 ? -1.32 : 0.8, 1.75, 0.52, 0.22, isik, '#a8371a', '#ee5a2a', s,
      k.eb);
  }
  celKutu(ctx, 0.15, -0.55, 1.95, 1.1, 0.24, isik, '#a8371a', '#ee5a2a', s, k.eb);
  serit(ctx, 0.4, isik[1] * 0.18, 1.85, isik[1] * 0.18, 0.09, renk('#ff9a5c', s));
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(2.04, -0.3 + i * 0.2);
    ctx.lineTo(2.04, -0.2 + i * 0.2);
  }
  ctx.stroke();
  ctx.beginPath();
  for (const v of [-1, 1]) ctx.ellipse(2.0, v * 0.4, 0.09, 0.09, 0, 0, Math.PI * 2);
  hat(ctx, k.motorAcik ? '#fff3b0' : renk('#d8cfa8', s), k.eb, 0.8);
  yuvarDik(ctx, -1.25, -0.4, 0.55, 0.8, 0.16);
  hat(ctx, renk('#33261d', s), k.eb, 0.8);
  elips(ctx, 1.25, -0.3, 0.1, 0.1);
  hat(ctx, '#1d1b19', k.eb, 0.8);
  elips(ctx, 1.25, -0.3, 0.05, 0.05);
  ctx.fillStyle = renk('#9a9a9a', s);
  ctx.fill();
}

function govde(ctx, makine, k, isik) {
  const s = k.sonuk;
  const { direksiyon, kalkis } = k.hal;
  for (const v of [-1, 1]) {
    tekerlek(ctx, ARKA[0], v * ARKA[1], ARKA[2], ARKA[3], k.kayma, s);
    onTekerlek(ctx, ON[0], v * ON[1], ON[2], ON[3], k, direksiyon);
  }
  // Yükleyici kolları: kalktıkça açık tona döner (güneşe yaklaşır).
  const { x: kx } = kepceKonumu(kalkis);
  const kol = kalkis > 0.4 ? '#e0603a' : '#b33a1c';
  for (const v of [-1, 1]) {
    hatliSerit(ctx, -0.5, v * 0.67, kx, v * (0.67 + 0.08 * kalkis), 0.2, renk(kol, s), k.eb);
    serit(ctx, -0.4, v * 0.67 + isik[1] * 0.04, kx - 0.1, v * (0.67 + 0.08 * kalkis)
      + isik[1] * 0.04, 0.06, renk('#f58a4c', s));
  }
  // Gövde, sürücü ve kabin durağandır: ışık basamağı, sönüklük, far ve sürücüyle tek
  // önbellekte. Direksiyon simidi tentenin önünde kalır, üstüne canlı çizilir.
  const ib = isikBasamak(makine.yon || 0);
  yerelOnbellek(ctx, parcaSahibi(makine, 'govde'),
    `${ib.n}|${s}|${k.motorAcik}|${!!makine.surucu}`, [-2.15, -1.5, 2.25, 1.5], (c) => {
      altGovde(c, k, ib.isik);
      if (makine.surucu) oturanCiftci(c, -0.85, 0, ib.isik);
      kabin(c, k, ib.isik);
    });
  ctx.strokeStyle = renk('#262626', s);
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.arc(-0.08, 0, 0.24, 0, Math.PI * 2);
  const ds = direksiyon * 3;
  ctx.moveTo(-0.08 - Math.sin(ds) * 0.24, -Math.cos(ds) * 0.24);
  ctx.lineTo(-0.08 + Math.sin(ds) * 0.24, Math.cos(ds) * 0.24);
  ctx.stroke();
}

/** Traktörü çizer: makine { x, y, yon, hiz, yakit, surucu, calisiyor, yuk }. */
export function traktorCiz(ctx, makine, zaman) {
  const k = makineBilgi(makine, zaman);
  const isik = isikYerel(makine.yon);
  kutuGolgesi(ctx, makine, [...GOVDE_GOLGE, kepceGolgesi(KAYMA_X, k.hal.kalkis)]);
  donuk(ctx, makine.x, makine.y, makine.yon, 1, (c) => {
    hatOlc(c, k);
    c.translate(KAYMA_X, 0);
    izleriCiz(c, [
      [-1.15, -1.5, 1.8, 0.9], [-1.15, 1.5, 1.8, 0.9],
      [1.2, -1.02, 1.0, 0.46], [1.2, 1.02, 1.0, 0.46],
    ], k.hiz);
    c.translate(0, k.titre);
    govde(c, makine, k, isik);
    kepce(c, k, isik);
  });
  if (k.motorAcik) {
    const guc = 0.45 + (k.hareket ? 0.35 : 0) + (k.calis ? 0.2 : 0);
    dumanCiz(ctx, makine, 1.25 + KAYMA_X, -0.3, guc, k);
  }
}
