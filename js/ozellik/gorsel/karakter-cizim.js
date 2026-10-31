/**
 * Çiftçi karakter çizimi (kuş bakışı, "boyalı oyuncak"): ekran-sabit dış hatlı, iki tonlu
 * gövde, sırtta tulum, kırmızı kollar, koyu hasır şapka (önde siper), yürürken adım vurgulu
 * döngü (karşı fazlı kollar, önde/arkada botlar), beklerken nefes; araca göre belirgin poz
 * (el: öne eğilip kürek, tırmık: sap yayı, dedektör: tarama, mıknatıs: ileri uzatma).
 * Gölge dünya ekseninde sabit, yükseklikle kayar. Sırt üfleyicisinde motor ve boru görünür.
 * Poz matematiği karakter-poz.js'te; yalnız durum.karakter ve aracın adını okur.
 */
import { donuk, ekranBirim, golgeKayma, isikYerel } from './ortak.js';
import { bot, govde, kol, sapka, tutam } from './ciftci-parca.js';
import { araciKur } from './arac-cizim.js';
import { aracPozu, govdePozu, OMUZ } from './karakter-poz.js';
import { boruCiz, havaDalgasi, sirtMotoru } from './ufleyici-cizim.js';

/** Çiftçi, yakın kamerada seçilsin diye çarpışma dairesinden biraz büyük çizilir. */
const GORSEL_BOY = 1.35;
/** Şapka kenar yarıçapı ve ileri kayması (yerel birim). */
const SAPKA_R = 0.38;
const SAPKA_X = 0.08;
/** Ekranda birim başına bu kadar pikselden fazlası varsa ince ayrıntı çizilir. */
const DETAY_PIKSEL = 34;
const GOLGE = 'rgba(40, 22, 8, 0.21)';

/** Dörtgen Bezier üzerinde t noktası. */
function egri(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

/** Burulmuş/kaymış gövde uzayındaki omuz noktası (karakter uzayında). */
function omuz(poz, egilme, v) {
  const c = Math.cos(poz.burulma);
  const s = Math.sin(poz.burulma);
  const [x, y] = [OMUZ[0], OMUZ[1] * v];
  return [egilme + x * c - y * s, poz.yanal + x * s + y * c];
}

/** Sırttaki üfleyici: hortum ve namlu; sağ el hortumu tutar. */
function ufleBorusu(ctx, k, sol) {
  const boru = [[-0.7, 0.3], [0.5, 0.95], [1.9, 0.4]];
  if (k.ufleCalisiyor) boru[2][1] += Math.sin(k.t * 60) * 0.02;
  boruCiz(ctx, boru, false);
  if (k.ufleCalisiyor) havaDalgasi(ctx, k.t, 2.0, 0.4, 1.9);
  return [egri(boru[0], boru[1], boru[2], 0.5), sol];
}

/** Gövde, kollar, ayaklar, araç ve şapkayı yerel uzayda çizer. */
function ciftciCiz(ctx, k) {
  const { poz, ap, isik } = k;
  const eb = ekranBirim(ctx);
  const dh = eb * 1.2;
  k.detay = 1 / eb > DETAY_PIKSEL;
  const egilme = ap ? ap.egilme : 0;
  if (poz.botlar) for (const [x, y] of poz.botlar) bot(ctx, x, y + poz.yanal * 0.5, isik, dh);
  const duzen = ap ? araciKur(k.arac, ap, k.kullan, k.t, dh) : null;
  if (duzen) duzen.ciz(ctx);
  ctx.save();
  ctx.translate(egilme, poz.yanal);
  ctx.rotate(poz.burulma);
  govde(ctx, isik, dh, k.detay);
  if (k.ufle) sirtMotoru(ctx, k.t, k.ufleCalisiyor, isik);
  ctx.restore();
  let [sag, sol] = poz.eller;
  if (duzen) [sag, sol] = [duzen.sag, duzen.sol];
  else if (ap?.eller) [sag, sol] = ap.eller;
  else if (k.ufle) [sag, sol] = ufleBorusu(ctx, k, sol);
  kol(ctx, ...omuz(poz, egilme, 1), ...sag, isik, dh);
  kol(ctx, ...omuz(poz, egilme, -1), ...sol, isik, dh);
  if (ap && ap.tutam >= 0) {
    const el = ap.tutam === 0 ? sag : sol;
    tutam(ctx, el[0], el[1], ap.tutam === 0 ? 2.6 : -2.6, dh);
  }
  const sr = SAPKA_R * (ap ? ap.sapka : 1);
  sapka(ctx, SAPKA_X + egilme * 1.4, poz.yanal * 0.6, sr, isik, dh, k.detay);
}

/** Yumuşak kenarlı tek gölge (iki katman): dünya ekseninde, dönmez. */
function golgeCiz(ctx) {
  ctx.fillStyle = GOLGE;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.66, 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.52, 0.43, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Çiftçiyi çizer. karakter: durum.karakter; zaman: ms; arac: 'el' | 'tirmik' |
 * 'dedektor' | 'miknatis' (durum.arac).
 */
export function karakterCiz(ctx, karakter, zaman, arac = 'el') {
  const t = zaman / 1000;
  const yon = karakter.yon || 0;
  const olcek = GORSEL_BOY * (1 + (karakter.z || 0) / 400);
  const ufleMakine = karakter.makine?.tur === 'ufleyici' ? karakter.makine : null;
  const kullan = !!karakter.kullaniyor && !ufleMakine;
  const poz = govdePozu(karakter.adimFaz || 0, !!karakter.hareketli, t);
  const k = {
    t, arac, kullan, poz,
    ap: ufleMakine ? null : aracPozu(arac, kullan, t),
    ufle: !!ufleMakine,
    ufleCalisiyor: !!ufleMakine?.calisiyor && ufleMakine.yakit > 0,
    isik: isikYerel(yon),
  };
  const [gx, gy] = golgeKayma((karakter.z || 0) * 0.5);
  donuk(ctx, karakter.x + gx * olcek * 0.8, karakter.y + gy * olcek * 0.8, 0, olcek, golgeCiz);
  donuk(ctx, karakter.x, karakter.y, yon, olcek * poz.olcek, (c) => ciftciCiz(c, k));
}
