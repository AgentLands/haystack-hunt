/**
 * Makine çizimlerinin ortak parçaları: kare başına ortak bilgi (sönük mü, titreşim,
 * tekerlek kayması, görsel hal), boyalı oyuncak görünümü (ekran-sabit dış hat + 2 tonlu
 * cel kutu), direksiyonlu ön tekerlek, tekerlek izleri, egzoz dumanı ve pofu, gölgeler.
 */
import {
  donuk, ekranBirim, golgeKayma, isikYerel, renk, tekerlek, yuvarDik,
} from './ortak.js';
import { halAl, pofYasi } from './makine-hal.js';

/** Makine gölgesi (sanat yönü paleti) ve dış hat rengi. */
export const MAKINE_GOLGE = 'rgba(40, 22, 8, 0.38)';
export const HAT_RENGI = '#2a1a0d';

/** Makinenin bu karedeki ortak çizim bilgisi; eb sonradan yerel uzayda doldurulur. */
export function makineBilgi(makine, zaman) {
  const t = zaman / 1000;
  const hiz = makine.hiz || 0;
  const hareket = Math.abs(hiz) > 0.05;
  const sonuk = !(makine.yakit > 0);
  return {
    t,
    hiz,
    hareket,
    sonuk,
    motorAcik: !sonuk && !!makine.surucu,
    calis: !!makine.calisiyor && !sonuk,
    yuk: Math.min(1, Math.max(0, makine.yuk || 0)),
    titre: hareket ? Math.sin(t * 55) * Math.min(Math.abs(hiz) * 0.008 + 0.012, 0.03) : 0,
    kayma: -hiz * t,
    hal: halAl(makine, zaman),
    eb: 0.05,
  };
}

const parcalar = new WeakMap();
/** Işık yönü bu kadar basamağa yuvarlanır (önbellekli gövde dönerken seyrek yenilensin). */
const ISIK_BASAMAK = 16;

/** Makinenin adlı gövde parçası için önbellek sahibi nesnesi (onbellek.js). */
export function parcaSahibi(makine, ad) {
  let p = parcalar.get(makine);
  if (!p) {
    p = {};
    parcalar.set(makine, p);
  }
  if (!p[ad]) p[ad] = {};
  return p[ad];
}

/** Yuvarlanmış yerel ışık yönü ve basamak numarası (önbellek anahtarı için). */
export function isikBasamak(yon) {
  const adim = (Math.PI * 2) / ISIK_BASAMAK;
  const n = Math.round(yon / adim);
  return { isik: isikYerel(n * adim), n: ((n % ISIK_BASAMAK) + ISIK_BASAMAK) % ISIK_BASAMAK };
}

/** Yerel uzayda ekran-sabit dış hat kalınlığını k.eb'ye yazar (donuk içinde çağrılır). */
export function hatOlc(ctx, k) {
  k.eb = ekranBirim(ctx);
}

/** Geçerli yolu önce koyu dış hatla (ekran-sabit) çizer, sonra doldurur. */
export function hat(ctx, dolgu, eb, kalinlik = 1.2) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = HAT_RENGI;
  ctx.lineWidth = 2 * kalinlik * eb;
  ctx.stroke();
  ctx.fillStyle = dolgu;
  ctx.fill();
}

/**
 * 2 tonlu cel kutu: dış hatlı koyu taban, üstünde ışığa doğru kaymış açık yüz; gölge
 * tarafında koyu bant kalır. (x, y) sol üst köşe; isik yerel ışık yönü.
 */
export function celKutu(ctx, x, y, w, h, r, isik, koyu, acik, s, eb) {
  yuvarDik(ctx, x, y, w, h, r);
  hat(ctx, renk(koyu, s), eb);
  const k = Math.min(w, h) * 0.13;
  yuvarDik(ctx, x + k + isik[0] * k * 0.8, y + k + isik[1] * k * 0.8, w - 2 * k, h - 2 * k,
    Math.max(r - k, 0.02));
  ctx.fillStyle = renk(acik, s);
  ctx.fill();
}

/** Dış hatlı yuvarlak uçlu çizgi (kol, boru): önce kalın koyu, sonra renkli. */
export function hatliSerit(ctx, x1, y1, x2, y2, kalinlik, renkDegeri, eb) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = HAT_RENGI;
  ctx.lineWidth = kalinlik + 2.4 * eb;
  ctx.stroke();
  ctx.strokeStyle = renkDegeri;
  ctx.lineWidth = kalinlik;
  ctx.stroke();
}

/** Direksiyonlu ön tekerlek: (cx, cy) merkezinde aci kadar dönmüş tekerlek. */
export function onTekerlek(ctx, cx, cy, uzun, en, k, aci) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(aci);
  tekerlek(ctx, 0, 0, uzun, en, k.kayma, k.sonuk);
  ctx.restore();
}

/**
 * Yerel kutuların ([x, y, w, h, r, yukseklik?]) sağ alta kaymış gölgesi, tek dolguda
 * (üst üste binenler koyulaşmaz). Yükseklik büyüdükçe kutunun gölgesi gövdeden uzaklaşır
 * (kalkan kepçe, tente); varsayılan yukseklik (yer seviyesi) çağrının yukseklik'i.
 */
export function kutuGolgesi(ctx, makine, kutular, yukseklik = 0) {
  const c = Math.cos(makine.yon);
  const s = Math.sin(makine.yon);
  donuk(ctx, makine.x, makine.y, makine.yon, 1, (g) => {
    g.fillStyle = MAKINE_GOLGE;
    g.beginPath();
    for (const [kx, ky, w, h, r, yuk = yukseklik] of kutular) {
      const [gx, gy] = golgeKayma(yuk);
      const x = kx + gx * c + gy * s;
      const y = ky - gx * s + gy * c;
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    g.fill();
  });
}

/** Birden çok küçük kare (direk başı, cıvata) tek dış hat + tek dolguyla: [[x, y], ...]. */
export function kareler(ctx, noktalar, yari, dolgu, eb) {
  ctx.beginPath();
  for (const [x, y] of noktalar) ctx.rect(x - yari, y - yari, yari * 2, yari * 2);
  hat(ctx, dolgu, eb, 0.9);
}

/**
 * Tekerlek izi: her tekerlek merkezinden (xler: [[x, y, uzun, en]]) hareketin tersine
 * uzayan sönük kesik çizgiler; hız arttıkça uzar. Yerel uzayda çizilir.
 */
export function izleriCiz(ctx, tekerlekler, hiz) {
  if (Math.abs(hiz) <= 0.05) return;
  const yon = hiz > 0 ? -1 : 1;
  const boy = Math.min(Math.abs(hiz) * 0.4, 1.5);
  ctx.fillStyle = 'rgba(45, 28, 12, 0.3)';
  ctx.beginPath();
  for (const [x, y, uzun, en] of tekerlekler) {
    const bas = x + yon * uzun / 2;
    const e = en * 0.8;
    for (let d = 0; d < boy; d += 0.34) {
      const u = Math.min(0.22, boy - d);
      ctx.rect(yon > 0 ? bas + d : bas - d - u, y - e / 2, u, e);
    }
  }
  ctx.fill();
}

/**
 * Egzoz dumanı: yerel (lx, ly) noktasından çıkan, yukarı (ekranda) sürüklenen büyüyüp
 * solan gri kabarcıklar; hızlanma anında (hal.pof) üstüne koyu, iri bir pof eklenir.
 * Dünya uzayında çizilir; guc 0..1.
 */
export function dumanCiz(ctx, makine, lx, ly, guc, k) {
  const c = Math.cos(makine.yon);
  const s = Math.sin(makine.yon);
  const wx = makine.x + lx * c - ly * s;
  const wy = makine.y + lx * s + ly * c;
  const { t } = k;
  const pof = pofYasi(k.hal, t);
  donuk(ctx, wx, wy, 0, 1, (g) => {
    for (let i = 0; i < 5; i++) {
      const f = (t * 0.75 + i / 5) % 1;
      const r = 0.1 + 0.42 * f;
      g.fillStyle = `rgba(${96 + 70 * f}, ${96 + 70 * f}, ${100 + 66 * f}, ${
        (0.42 * (1 - f) * guc).toFixed(3)})`;
      g.beginPath();
      g.arc(f * 0.9 + Math.sin(t * 2 + i) * 0.05, -f * 1.5, r, 0, Math.PI * 2);
      g.fill();
    }
    if (pof >= 1) return;
    for (let i = 0; i < 3; i++) {
      const f = Math.min(1, pof * (1 + i * 0.25));
      const r = 0.18 + 0.55 * f + i * 0.06;
      g.fillStyle = `rgba(${48 + 60 * f}, ${44 + 58 * f}, ${42 + 58 * f}, ${
        (0.75 * (1 - f)).toFixed(3)})`;
      g.beginPath();
      g.arc(f * (0.5 + i * 0.3), -f * (0.9 + i * 0.35), r, 0, Math.PI * 2);
      g.fill();
    }
  });
}
