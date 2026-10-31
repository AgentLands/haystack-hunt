/**
 * Çizim: tarlayı yükseklik ve eğime göre gölgeli piksellere boyar (cizim/tarla-boya.js;
 * yakınken alt piksel atlası cizim/yakin.js), üstüne iğneyi, güneş parıltısını, dedektör
 * halkalarını ve imleci çizer. Tarla yalnız yüksekliği değişince yeniden boyanır.
 */
import { GENISLIK, YUKSEKLIK } from './kural/boyut.js';
import { igneDerinligi } from './kural/igne.js';
import { gorunum } from './gorunum.js';
import { sadeHareket, nabizSade } from './ozellik/sade-hareket.js';
import { boya } from './cizim/tarla-boya.js';
import { yakinCiz, yakinSifirla, kanal, karolar } from './cizim/yakin.js';
import {
  OLCEK, DUNYA_EN, DUNYA_BOY, ekran, ekranBirim, tuvalOlcekKur,
} from './cizim/tuval-olcek.js';

export { OLCEK, ekranBirim };
/** Boyanmış çıplak tarla (GENISLIK×YUKSEKLIK, katmansız); mini harita bundan çizer. */
export let tarlaResmi = null;
/**
 * Ölçüm: son karede tarla çiziminin süresi (ms) ve boyanan yakın görünüm karosu sayısı.
 * `ornekler` dizi yapılırsa her karenin süresi eklenir (duman/ölçüm betikleri için).
 */
export const cizimOlcum = { tarlaMs: 0, karo: 0, ornekler: null };
const katmanlar = { alt: [], ust: [] };

/**
 * Özellikler için çizim katmanı: islev(ctx, durum, zaman). 'alt' tarladan hemen sonra
 * (iğne ve halkalardan önce), 'ust' her şeyden sonra çizilir. Koordinatlar piksel;
 * hücre (x, y) merkezi ((x + 0.5) * OLCEK, (y + 0.5) * OLCEK).
 */
export function katmanEkle(islev, yer = 'ust') {
  katmanlar[yer].push(islev);
}

/**
 * Ana tuvalin çizicisi. Arka bellek CSS boyutu × devicePixelRatio'dur (cizim/tuval-olcek.js);
 * dünya hep DUNYA_EN×DUNYA_BOY piksel, dönüşüme taban çarpanı eklenir.
 */
export function cizici(tuval) {
  const ctx = tuval.getContext('2d');
  const olcekDenetle = tuvalOlcekKur(tuval);
  const ara = document.createElement('canvas');
  ara.width = GENISLIK;
  ara.height = YUKSEKLIK;
  tarlaResmi = ara;
  const actx = ara.getContext('2d');
  const resim = actx.createImageData(GENISLIK, YUKSEKLIK);
  const golgeHucre = (i) => karolar.golgeHucre(kanal, i);
  const tabanCiz = () => ctx.drawImage(ara, 0, 0, DUNYA_EN, DUNYA_BOY);
  return function ciz(durum, zaman) {
    const bas = performance.now();
    olcekDenetle();
    const degisen = karolar.hDegisti(durum.tarla);
    if (degisen) {
      if (degisen.yeni) yakinSifirla();
      const k = boya(durum.tarla, resim.data, kanal, degisen.yeni ? null : degisen, golgeHucre);
      if (k) actx.putImageData(resim, 0, 0, k.x0, k.y0, k.x1 - k.x0 + 1, k.y1 - k.y0 + 1);
    }
    // Kamera: tüm dünya çizimi (tarla, iğne, halkalar, imleç, katmanlar) tek dönüşümle sarılır.
    const { z, gx, gy } = gorunum;
    const zx = z * ekran.tabanX;
    const zy = z * ekran.tabanY;
    ctx.setTransform(zx, 0, 0, zy, -gx * OLCEK * zx, -gy * OLCEK * zy);
    ctx.imageSmoothingEnabled = false;
    // Atlas görünür alanı tam kaplıyorsa kaba taban çizilmez (çift doldurma olmasın).
    cizimOlcum.karo = yakinCiz(ctx, gorunum, OLCEK, tabanCiz);
    cizimOlcum.tarlaMs = performance.now() - bas;
    cizimOlcum.ornekler?.push(cizimOlcum.tarlaMs);
    for (const k of katmanlar.alt) k(ctx, durum, zaman);
    igneyiCiz(ctx, durum, zaman);
    halkalariCiz(ctx, durum.halkalar, zaman);
    imleciCiz(ctx, durum);
    for (const k of katmanlar.ust) k(ctx, durum, zaman);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
}

/**
 * İğnenin yarı boyu (dünya pikseli): ~1.6 hücre, ekranda en az ~22 px, en çok 4.4 hücre.
 * eb: 1 ekran pikselinin dünya boyu (1 / yakınlaştırma).
 */
export function igneYariBoyu(eb) {
  return Math.min(OLCEK * 2.2, Math.max(OLCEK * 0.8, 11 * eb));
}

/** İğne siluetinin yolu (yerel uzay, +x sivri uç): gözlü, hafif şişkin arka uç. */
function igneYolu(ctx, h, w, goz) {
  ctx.beginPath();
  ctx.moveTo(h, 0);
  ctx.lineTo(h * 0.4, -w);
  ctx.lineTo(-h + goz, -w);
  ctx.quadraticCurveTo(-h + goz * 0.35, -w * 1.75, -h, 0);
  ctx.quadraticCurveTo(-h + goz * 0.35, w * 1.75, -h + goz, w);
  ctx.lineTo(h * 0.4, w);
  ctx.closePath();
}

/**
 * Gümüş iğne modeli (dünya pikseli (x, y) merkezli, aci yönünde): gölge, ekran-sabit koyu
 * dış hat, ekranda en az ~2.4 px kalınlık (yakında boyla orantılı), gölge tarafı koyu
 * gövde, ışık tarafında beyaz çizgi, arka uçta göz deliği.
 * olcek: havalanan iğne için büyütme. bulma ve balya işareti de bunu kullanır.
 */
export function igneModeli(ctx, x, y, aci, olcek = 1) {
  const eb = ekranBirim(ctx);
  const h = igneYariBoyu(eb) * olcek;
  const w = Math.max(1.2 * eb, h * 0.075) * olcek;
  const goz = Math.max(h * 0.24, 4 * eb);
  const lv = 0.6 * Math.sin(aci) - 0.8 * Math.cos(aci);
  const yan = lv < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(x + 1.6 * eb * olcek, y + 2 * eb * olcek);
  ctx.rotate(aci);
  igneYolu(ctx, h, w, goz);
  ctx.fillStyle = 'rgba(40, 22, 8, 0.4)';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aci);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  igneYolu(ctx, h, w, goz);
  ctx.strokeStyle = '#2a1a0d';
  ctx.lineWidth = 2.1 * eb;
  ctx.stroke();
  ctx.fillStyle = '#7f8891';
  ctx.fill();
  ctx.strokeStyle = '#c3cad1';
  ctx.lineWidth = w * 1.1;
  ctx.beginPath();
  ctx.moveTo(-h + goz * 0.6, yan * w * 0.4);
  ctx.lineTo(h * 0.75, yan * w * 0.25);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.8 * eb, w * 0.45);
  ctx.beginPath();
  ctx.moveTo(-h + goz * 1.1, yan * w * 0.5);
  ctx.lineTo(h * 0.45, yan * w * 0.45);
  ctx.stroke();
  ctx.fillStyle = 'rgba(42, 26, 13, 0.9)';
  ctx.beginPath();
  ctx.ellipse(-h + goz * 0.42, 0, goz * 0.26, Math.max(w * 0.42, 0.45 * eb), 0, 0,
    Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function igneyiCiz(ctx, durum, zaman) {
  const { igne } = durum.tarla;
  const derinlik = durum.goster ? 0 : igneDerinligi(durum.tarla);
  const mx = (igne.x + 0.5) * OLCEK;
  const my = (igne.y + 0.5) * OLCEK;
  const eb = ekranBirim(ctx);
  if (derinlik === 0) {
    igneModeli(ctx, mx, my, igne.aci);
  } else if (derinlik <= 3 && (sadeHareket() || zaman % 1700 < 140)) {
    // Sade harekette yanıp sönmez: sönük ama sürekli duran nokta.
    ctx.fillStyle = `rgba(255, 255, 255, ${sadeHareket() ? 0.45 : 0.85})`;
    ctx.fillRect(mx - 1.5 * eb, my - 1.5 * eb, 3 * eb, 3 * eb);
  }
  if (durum.parilti && zaman < durum.parilti.bitis) {
    const s = Math.sin(((durum.parilti.bitis - zaman) / durum.parilti.sure) * Math.PI);
    yildiz(ctx, mx, my, (6 + 16 * nabizSade(s, 0.4)) * eb, s, eb); // sade: boy sabit, yalnız solar
  }
}

/** Dört uzun, dört kısa ışınlı parıltı; boy dünya pikseli, kalınlık ekran-sabit. */
function yildiz(ctx, x, y, boy, alfa, eb) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255, 255, 240, ${alfa})`;
  ctx.lineWidth = 1.8 * eb;
  cizgi(ctx, x - boy, y, x + boy, y);
  cizgi(ctx, x, y - boy, x, y + boy);
  ctx.lineWidth = 1.1 * eb;
  const k = boy * 0.45;
  cizgi(ctx, x - k, y - k, x + k, y + k);
  cizgi(ctx, x - k, y + k, x + k, y - k);
}

/** Dedektör işaretleri: yakınlaştırmadan bağımsız, ekranda hep aynı boyutta. */
function halkalariCiz(ctx, halkalar, zaman) {
  const k = 1 / gorunum.z;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const halka of halkalar) {
    const gecen = zaman - halka.zaman;
    ctx.save();
    ctx.translate((halka.x + 0.5) * OLCEK, (halka.y + 0.5) * OLCEK);
    ctx.scale(k, k);
    ctx.strokeStyle = halka.seviye.renk;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.stroke();
    if (gecen < 1400) {
      ctx.globalAlpha = 1 - gecen / 1400;
      ctx.beginPath();
      ctx.arc(0, 0, 6 + gecen / 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (gecen < 3500) {
      ctx.globalAlpha = Math.min(1, (3500 - gecen) / 600);
      ctx.fillStyle = 'rgba(20, 14, 8, 0.75)';
      const en = ctx.measureText(halka.seviye.ad).width + 12;
      ctx.fillRect(-en / 2, -32, en, 19);
      ctx.fillStyle = halka.seviye.renk;
      ctx.fillText(halka.seviye.ad, 0, -18);
    }
    ctx.restore();
  }
}

function imleciCiz(ctx, durum) {
  if (!durum.imlec || durum.bitti) return;
  const r = durum.aracYaricap * OLCEK;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc((durum.imlec.x + 0.5) * OLCEK, (durum.imlec.y + 0.5) * OLCEK, r, 0, Math.PI * 2);
  ctx.stroke();
}

function cizgi(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
