/**
 * Balya makinesi çizimi (kuş bakışı, boyalı oyuncak): krem gövde ve koyu turkuaz şeritler
 * (özgün renk düzeni), önde dönen dişli toplayıcı, direksiyonlu küçük ön tekerlekler,
 * tenteli sürücü yeri, ortada içindeki balyanın büyüdüğü gözlem penceresi ve doluluk halkası
 * (yuk 0..1), arkada menteşeli kapak: balya bırakılınca (makine-hal kapak) kalkıp açılır,
 * balya içeriden yuvarlanarak çıkar (balya-cizim). Motor açıkken duman; yakıtsız sönük.
 */
import { donuk, elips, isikYerel, renk, serit, tekerlek, yuvarDik } from './ortak.js';
import { oturanCiftci } from './ciftci-parca.js';
import {
  celKutu, dumanCiz, hat, hatOlc, isikBasamak, izleriCiz, kareler, kutuGolgesi, makineBilgi,
  onTekerlek, parcaSahibi,
} from './makine-ortak.js';
import { kapakAcikligi } from './makine-hal.js';
import { pencere, toplayiciDisler, toplayiciGovde } from './balya-makine-parca.js';
import { yerelOnbellek } from './onbellek.js';

const TEKERLEKLER = [[-0.3, -1.62, 1.6, 0.8], [-0.3, 1.62, 1.6, 0.8]];
const ON = [1.55, 1.12, 0.7, 0.34];
const KAYMA_X = -0.1;
const DIREKLER = [[0.98, -0.74], [0.98, 0.74], [2.08, -0.74], [2.08, 0.74]];
export const KREM = ['#c9b68c', '#e8dcc0'];
export const TURKUAZ = ['#24575f', '#2f6f7a'];
const GOVDE_GOLGE = [
  [-3.2 + KAYMA_X, -1.35, 4.3, 2.7, 0.5], [-1.1 + KAYMA_X, -2.05, 1.6, 4.1, 0.3],
  [0.9 + KAYMA_X, -1.0, 1.3, 2.0, 0.3], [2.0 + KAYMA_X, -1.95, 0.95, 3.9, 0.25],
];

/**
 * Açık kapağın ardındaki oda ağzı: koyu yan duvarlar, yarı saydam gölgeli iç (altından
 * yuvarlanan balya görünür) ve içte kalan saman.
 */
function odaAgzi(ctx, k, ac) {
  if (ac <= 0.02) return;
  yuvarDik(ctx, -3.05, -1.12, 1.0, 2.24, 0.3);
  hat(ctx, 'rgba(30, 22, 12, 0.5)', k.eb);
  ctx.fillStyle = '#2b2418';
  ctx.fillRect(-3.0, -1.1, 0.95, 0.2);
  ctx.fillRect(-3.0, 0.9, 0.95, 0.2);
}

/**
 * Arka kapak: kapalıyken gövdenin yuvarlak kıçı. Açılırken menteşesi (x = -2) etrafında
 * yukarı kalkar: kuş bakışında boyu menteşeye doğru kısalır, kameraya yaklaşıp genişler.
 */
function kapak(ctx, k, isik, ac) {
  const s = k.sonuk;
  ctx.save();
  ctx.translate(-2.0, 0);
  ctx.scale(1 - 0.7 * ac, 1 + 0.12 * ac);
  celKutu(ctx, -1.2, -1.25, 1.25, 2.5, 0.55, isik, KREM[0], KREM[1], s, k.eb);
  ctx.fillStyle = renk(TURKUAZ[1], s);
  ctx.fillRect(-1.05, -1.1, 0.16, 2.2);
  serit(ctx, -0.07, -1.15, -0.07, 1.15, 0.14, renk(TURKUAZ[0], s));
  for (const v of [-1, 1]) {
    elips(ctx, -0.07, v * 1.05, 0.09, 0.09);
    hat(ctx, renk('#5d6469', s), k.eb, 0.7);
  }
  ctx.restore();
}

/** Oda: krem silindir, iki yanda turkuaz şerit; ön boyun turkuaz (pencere ayrı). */
function oda(ctx, k, isik) {
  const s = k.sonuk;
  celKutu(ctx, -2.2, -1.32, 3.25, 2.64, 0.3, isik, KREM[0], KREM[1], s, k.eb);
  for (const v of [-1, 1]) {
    ctx.fillStyle = renk(TURKUAZ[1], s);
    ctx.fillRect(-2.05, v < 0 ? -1.2 : 0.92, 2.95, 0.28);
    serit(ctx, -2.0, v * 0.92, 0.85, v * 0.92, 0.04, renk('#f4ecd8', s));
  }
  serit(ctx, 0.62, -1.1, 0.62, 1.1, 0.06, renk(KREM[0], s));
  celKutu(ctx, 0.9, -0.82, 1.3, 1.64, 0.22, isik, TURKUAZ[0], '#3f8c98', s, k.eb);
}

/** Sürücü yeri: koltuk, direksiyon simidi, sürücü ve turkuaz çizgili tente. */
function surucuYeri(ctx, makine, k, isik) {
  const s = k.sonuk;
  yuvarDik(ctx, 1.1, -0.38, 0.5, 0.76, 0.14);
  hat(ctx, renk('#33261d', s), k.eb, 0.8);
  ctx.strokeStyle = renk('#262626', s);
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.arc(1.82, 0, 0.26, 0, Math.PI * 2);
  ctx.stroke();
  serit(ctx, 1.82, -0.26, 1.82, 0.26, 0.05, renk('#262626', s));
  if (makine.surucu) oturanCiftci(ctx, 1.35, 0, isik);
  kareler(ctx, DIREKLER, 0.08, renk('#3b3b3b', s), k.eb);
  yuvarDik(ctx, 0.86, -0.9, 1.36, 1.8, 0.12);
  hat(ctx, s ? 'rgba(180, 172, 156, 0.42)' : 'rgba(246, 236, 210, 0.45)', k.eb);
  ctx.fillStyle = s ? 'rgba(90, 100, 100, 0.35)' : 'rgba(47, 111, 122, 0.55)';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.rect(0.92, -0.78 + i * 0.44, 1.24, 0.2);
  ctx.fill();
}

/**
 * Durağan gövde (tek önbellek): oda, boyun, toplayıcı tamburu, egzoz, sürücü yeri; kapak
 * kapalıyken o da. Pencere, toplayıcı dişleri ve açılan kapak üstüne canlı çizilir.
 */
function govde(ctx, makine, k, isik) {
  const s = k.sonuk;
  for (const [x, y, uzun, en] of TEKERLEKLER) tekerlek(ctx, x, y, uzun, en, k.kayma, s);
  for (const v of [-1, 1]) onTekerlek(ctx, ON[0], v * ON[1], ON[2], ON[3], k, k.hal.direksiyon);
  const ac = kapakAcikligi(k.hal, k.t);
  odaAgzi(ctx, k, ac);
  const ib = isikBasamak(makine.yon || 0);
  yerelOnbellek(ctx, parcaSahibi(makine, 'govde'),
    `${ib.n}|${s}|${!!makine.surucu}|${ac === 0}`, [-3.35, -2.15, 3.0, 2.15], (c) => {
      oda(c, k, ib.isik);
      if (ac === 0) kapak(c, k, ib.isik, 0);
      toplayiciGovde(c, k, ib.isik);
      elips(c, 0.72, -0.62, 0.08, 0.08);
      hat(c, '#1d1b19', k.eb, 0.8);
      surucuYeri(c, makine, k, ib.isik);
    });
  if (ac > 0) kapak(ctx, k, isik, ac);
  pencere(ctx, k, -0.8);
  toplayiciDisler(ctx, k);
}

/** Balya makinesini çizer: makine { x, y, yon, hiz, yakit, surucu, calisiyor, yuk }. */
export function balyaMakineCiz(ctx, makine, zaman) {
  const k = makineBilgi(makine, zaman);
  const isik = isikYerel(makine.yon);
  kutuGolgesi(ctx, makine, GOVDE_GOLGE);
  donuk(ctx, makine.x, makine.y, makine.yon, 1, (c) => {
    hatOlc(c, k);
    c.translate(KAYMA_X, 0);
    izleriCiz(c, TEKERLEKLER, k.hiz);
    c.translate(0, k.titre);
    govde(c, makine, k, isik);
  });
  if (k.motorAcik) dumanCiz(ctx, makine, 0.72 + KAYMA_X, -0.62, 0.35 + (k.calis ? 0.3 : 0), k);
}
