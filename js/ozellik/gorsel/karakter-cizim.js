/**
 * Çiftçi karakter çizimi (kuş bakışı): tepeden hasır şapka, omuzlar, yürürken sallanan
 * kollar ve botlar, yön yönüne dönük, sağ alta düşen gölge; saman yüksekliği (z) arttıkça
 * hafifçe büyür. Araca göre küçük hareket: el eğilir, tırmık/dedektör/mıknatıs sallanır;
 * sırt üfleyicisine binmişken sırtta motor ve elde boru görünür.
 * Yalnız durum.karakter verisini (ve aracın adını) okur; kural koduna dokunmaz.
 */
import {
  IKI_PI, GOLGE_RENGI, donuk, doldur, elips, golgeKayma, isikYerel, serit,
} from './ortak.js';
import { DERI, GOMLEK, GOMLEK_KOYU, TULUM, sapka } from './ciftci-parca.js';
import { araciKur } from './arac-cizim.js';
import { boruCiz, havaDalgasi, sirtMotoru } from './ufleyici-cizim.js';

/** Çiftçi, yakın kamerada seçilsin diye çarpışma dairesinden biraz büyük çizilir. */
const GORSEL_BOY = 1.35;

const BOT = '#5b3d27';
const BOT_ACIK = '#8a6244';

function bot(ctx, x, y) {
  elips(ctx, x, y, 0.34, 0.2);
  doldur(ctx, BOT);
  elips(ctx, x + 0.06, y - 0.04, 0.2, 0.1);
  doldur(ctx, BOT_ACIK);
}

/** Kol: omuzdan ele kalın çizgi (kol) ve eldeki eldiven/yumruk. */
function kol(ctx, sx, sy, ex, ey) {
  serit(ctx, sx, sy, ex, ey, 0.3, GOMLEK_KOYU);
  serit(ctx, sx, sy, (sx + ex) / 2, (sy + ey) / 2, 0.26, GOMLEK);
  ctx.beginPath();
  ctx.arc(ex, ey, 0.14, 0, IKI_PI);
  doldur(ctx, DERI);
}

/** Dörtgen Bezier üzerinde t noktası. */
function egri(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

/** Gövde, kollar, ayaklar, araç ve şapkayı yerel uzayda çizer. */
function ciftciCiz(ctx, k) {
  const { t, sal, arac, kullan, ufle, isik } = k;
  const egilme = !ufle && arac === 'el' && kullan ? 0.1 : 0;
  const duzen = ufle ? null : araciKur(arac, kullan, t);
  const dur = k.yuruyor ? 0.12 : 0.3;
  bot(ctx, dur + sal, 0.27);
  bot(ctx, dur - sal, -0.27);
  if (duzen) duzen.ciz(ctx);
  const burulma = k.yuruyor ? sal * 0.2 : 0;
  ctx.save();
  ctx.translate(egilme, 0);
  ctx.rotate(burulma);
  elips(ctx, -0.1, 0, 0.44 - egilme * 0.6, 0.74);
  doldur(ctx, GOMLEK);
  ctx.strokeStyle = GOMLEK_KOYU;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (const y of [-0.5, -0.25, 0, 0.25, 0.5]) {
    ctx.moveTo(-0.4, y);
    ctx.lineTo(0.25, y);
  }
  ctx.stroke();
  // Tulum askısı: sırtta çapraz iki bant.
  serit(ctx, -0.38, -0.36, 0.1, 0.36, 0.1, TULUM);
  serit(ctx, -0.38, 0.36, 0.1, -0.36, 0.1, TULUM);
  if (ufle) sirtMotoru(ctx, t, k.ufleCalisiyor, isik);
  ctx.restore();
  let sag = [-sal * 0.9, 0.8];
  let sol = [sal * 0.9, -0.8];
  if (duzen) {
    sag = duzen.sag;
    sol = duzen.sol;
  } else if (ufle) {
    const boru = [[-0.7, 0.3], [0.5, 0.95], [1.9, 0.4]];
    const titre = k.ufleCalisiyor ? Math.sin(t * 60) * 0.02 : 0;
    boru[2][1] += titre;
    boruCiz(ctx, [boru[0], boru[1], boru[2]], false);
    sag = egri(boru[0], boru[1], boru[2], 0.5);
    sol = [sal * 0.9, -0.8];
    if (k.ufleCalisiyor) havaDalgasi(ctx, t, 2.0, 0.4, 1.9);
  } else if (egilme) {
    const kaz = Math.sin(t * 10) * 0.2;
    sag = [0.75 + kaz, 0.3];
    sol = [0.75 - kaz, -0.3];
  }
  kol(ctx, 0, 0.6, sag[0], sag[1]);
  kol(ctx, 0, -0.6, sol[0], sol[1]);
  // Kenarın altından görünen yüz yönü belli eder.
  elips(ctx, 0.4 + egilme, 0, 0.2, 0.23);
  doldur(ctx, DERI);
  sapka(ctx, -0.04 + egilme, 0, 0.45, isik);
}

/**
 * Çiftçiyi çizer. karakter: durum.karakter; zaman: ms; arac: 'el' | 'tirmik' |
 * 'dedektor' | 'miknatis' (durum.arac).
 */
export function karakterCiz(ctx, karakter, zaman, arac = 'el') {
  const olcek = GORSEL_BOY * (1 + (karakter.z || 0) / 400);
  const yuruyor = !!karakter.hareketli;
  const ufleMakine = karakter.makine?.tur === 'ufleyici' ? karakter.makine : null;
  const k = {
    t: zaman / 1000,
    sal: yuruyor ? Math.sin((karakter.adimFaz || 0) * IKI_PI) * 0.36 : 0,
    arac,
    yuruyor,
    kullan: !!karakter.kullaniyor,
    ufle: !!ufleMakine,
    ufleCalisiyor: !!ufleMakine?.calisiyor && ufleMakine.yakit > 0,
    isik: isikYerel(karakter.yon || 0),
  };
  const [gx, gy] = golgeKayma((karakter.z || 0) * 0.5);
  donuk(ctx, karakter.x + gx * olcek, karakter.y + gy * olcek, karakter.yon || 0, olcek, (c) => {
    elips(c, 0, 0, 0.75, 0.8);
    doldur(c, GOLGE_RENGI);
    elips(c, 0.1, 0, 0.45, 0.7);
    doldur(c, GOLGE_RENGI);
  });
  donuk(ctx, karakter.x, karakter.y, karakter.yon || 0, olcek, (c) => ciftciCiz(c, k));
}
