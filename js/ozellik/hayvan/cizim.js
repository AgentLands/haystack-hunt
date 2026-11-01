/**
 * Hayvan çizimi: durum ve zamandan poz seçer. 'zemin' katmanı (makinelerin altında)
 * yerdeki hayvanları, gölgeleri, saman ipuçlarını ve ürkme patlamasını; 'hava' katmanı
 * (en üstte) uçan serçeleri çizer. Saklı hayvan görünmez; yalnız arada saman kıpırdar.
 * Yalnız hayvan listesini okur, kural koduna dokunmaz.
 */
import { DALIS_SURE, ziplama, uyeKonumu } from '../../kural/hayvan-hareket.js';
import { TURLER } from '../../kural/hayvan.js';
import { gorunum } from '../../gorunum.js';
import { sadeHareket } from '../sade-hareket.js';
import { gorunurAlan } from '../../kural/gorunum.js';
import { donuk, ekranBirim, golge, isikYerel, samanBit, zIsareti, IKI_PI } from './ortak.js';
import { fareCiz, kurbagaCiz, kirpiCiz } from './kucuk.js';
import { sercCiz } from './kus.js';
import { kediUyku, kediAyakta } from './kedi.js';

/** Hayvan başına boy çarpanı (oyuncak gibi biraz büyük; uzaktan okunsun). */
const BOY = { fare: 1.25, serce: 1.2, kurbaga: 1.15, kirpi: 1.2, kedi: 1.3 };
const GOLGE = { fare: [0.9, 0.4], serce: [0.5, 0.3], kurbaga: [0.7, 0.45], kirpi: [0.9, 0.62],
  kedi: [1.0, 0.7] };

/** Bu yakınlaştırmanın üstünde gözler, şeritler, tüy çizgileri gibi ince ayrıntılar çizilir. */
const AYRINTI_Z = 2.5;
const KENAR_PAYI = 4;

/** Kameranın göründüğü alanda (kenar payıyla) mı? Dışındakiler hiç çizilmez. */
function ekrandaMi(x, y) {
  const a = gorunurAlan(gorunum);
  return x > a.x - KENAR_PAYI && x < a.x + a.en + KENAR_PAYI
    && y > a.y - KENAR_PAYI && y < a.y + a.boy + KENAR_PAYI;
}

const goruluyor = (h) => h.durum !== 'gizli' && h.durum !== 'kayip' && h.durum !== 'ucus'
  && !(h.durum === 'sasirma' && h.tur === 'serce');

function ozellikler(h, zaman, ctx, hop) {
  return {
    f: (zaman / 1000) * (h.tur === 'kirpi' ? 9 : 22) + h.faz, t: h.t, yuk: hop,
    ayrinti: gorunum.z >= AYRINTI_Z,
    kos: h.durum === 'kacis' || h.durum === 'dalis',
    isik: isikYerel(h.yon), eb: ekranBirim(ctx), top: h.tur === 'kirpi' && h.durum === 'sasirma',
    nefes: Math.sin((zaman / 2300) * IKI_PI + h.faz),
    poz: h.durum === 'esneme' ? 'esneme' : h.durum === 'otur' ? 'otur' : 'yuru',
  };
}

function hayvanCiz(ctx, h, zaman) {
  const dal = h.durum === 'dalis' ? Math.min(1, h.t / DALIS_SURE) : 0;
  const pop = h.durum === 'sasirma' ? 0.55 + 0.45 * Math.min(1, h.t / TURLER[h.tur].tepki) : 1;
  const hop = h.tur === 'kurbaga' && h.durum === 'kacis' ? ziplama(h.t).yuk : 0;
  const olcek = BOY[h.tur] * pop * (1 - 0.8 * dal * dal) * (1 + 0.28 * hop);
  const kosuyor = h.durum === 'kacis' || h.durum === 'dalis';
  const sallan = kosuyor && h.tur === 'fare' ? Math.sin((zaman / 1000) * 11 + h.faz) * 0.1 : 0;
  const [rx, ry] = GOLGE[h.tur];
  golge(ctx, h.x, h.y, rx * BOY[h.tur] * (1 - dal), ry * BOY[h.tur] * (1 - dal), hop * 0.4,
    1 - dal * 0.6);
  ctx.save();
  ctx.globalAlpha = 1 - 0.6 * dal * dal;
  donuk(ctx, h.x, h.y, h.yon + sallan, olcek, (c) => {
    const o = ozellikler(h, zaman, c, hop);
    if (h.tur === 'fare') fareCiz(c, o);
    else if (h.tur === 'kurbaga') kurbagaCiz(c, o);
    else if (h.tur === 'kirpi') kirpiCiz(c, o);
    else if (h.durum === 'uyku') kediUyku(c, o);
    else kediAyakta(c, o);
  });
  ctx.restore();
  if (dal > 0) samanOrtusu(ctx, h, dal);
  if (h.durum === 'uyku') zler(ctx, h, zaman);
}

/** Uyuyan kedinin üstünde ağır ağır yükselip solan iki 'z'. */
function zler(ctx, h, zaman) {
  for (let i = 0; i < 2; i++) {
    // Sade harekette yükselip solmaz: iki sabit, soluk 'z'.
    const u = sadeHareket() ? 0.3 + i * 0.25 : ((zaman / 2600) + i * 0.5) % 1;
    zIsareti(ctx, h.x + 0.8 + u * 0.9, h.y - 0.7 - u * 1.5, 0.5 - 0.15 * i, u);
  }
}

/** Samana dalarken üstüne kapanan saman kırıntıları. */
function samanOrtusu(ctx, h, dal) {
  for (let i = 0; i < 7; i++) {
    const a = h.faz + i * 0.9;
    const r = 0.25 + 0.5 * ((i * 37) % 10) / 10;
    samanBit(ctx, h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.7, 0.7, a + 1.2, dal, i % 2);
  }
}

/** Ürkme anında yuvadan saçılan saman. */
function patlama(ctx, h) {
  if (h.gecen > 0.5 || h.durum === 'gizli' || h.durum === 'uyku') return;
  const u = h.gecen / 0.5;
  for (let i = 0; i < 8; i++) {
    const a = h.faz + i * 0.785 + (i % 2) * 0.2;
    const mesafe = (0.5 + (i % 3) * 0.45) * (1 - (1 - u) * (1 - u)) * 2.4;
    const yukari = Math.sin(u * Math.PI) * 0.9;
    samanBit(ctx, h.ox + Math.cos(a) * mesafe, h.oy + Math.sin(a) * mesafe - yukari,
      0.4 + (i % 2) * 0.2, a + u * 6, 1 - u, i % 2);
  }
}

/** Saklı hayvanın üstünde ara sıra kıpırdayan saman (sıcak kahve, parıltı değil). */
function kipirti(ctx, h, zaman) {
  const u = (zaman / 1000 + h.faz * 1.7) % 7;
  if (u > 0.55 || h.bekle > 0) return;
  const s = Math.sin(u * 22);
  for (let i = 0; i < 3; i++) {
    const a = h.faz + i * 2.1;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - u / 0.55);
    samanBit(ctx, h.x + Math.cos(a) * 0.5 + s * 0.12, h.y + Math.sin(a) * 0.35, 0.85,
      a + s * 0.5, 1, 1);
    ctx.restore();
  }
}

export function zeminCiz(ctx, hayvanlar, zaman, kipirtiAc = true) {
  for (const h of hayvanlar) {
    if (h.durum === 'kayip') continue;
    if (!ekrandaMi(h.x, h.y) && !(h.tur === 'serce' && h.durum === 'ucus')) continue;
    patlama(ctx, h);
    if (h.tur === 'serce') {
      if (h.durum === 'ucus') {
        for (const u of h.uyeler) {
          const p = uyeKonumu(h, u);
          if (!ekrandaMi(p.x, p.y)) continue;
          golge(ctx, p.x, p.y, 0.85, 0.5, p.z, 1, 1.7);
        }
      }
    } else if (goruluyor(h)) hayvanCiz(ctx, h, zaman);
    else if (h.durum === 'gizli' && kipirtiAc) kipirti(ctx, h, zaman);
  }
}

export function havaCiz(ctx, hayvanlar, zaman) {
  for (const h of hayvanlar) {
    if (h.tur !== 'serce' || h.durum !== 'ucus') continue;
    for (const u of h.uyeler) {
      const p = uyeKonumu(h, u);
      if (p.z <= 0 || !ekrandaMi(p.x, p.y)) continue;
      const f = (zaman / 1000) * 34 + u.fz;
      donuk(ctx, p.x, p.y, p.a, 0.95 * (1 + 0.3 * Math.min(1, p.z)), (c) => {
        sercCiz(c, { f, isik: isikYerel(p.a), eb: ekranBirim(c), ayrinti: gorunum.z >= AYRINTI_Z });
      });
    }
  }
}
