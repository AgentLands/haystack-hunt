/**
 * Çizim: tarlayı yükseklik ve eğime göre gölgeli piksellere boyar (cizim/tarla-boya.js;
 * yakınken alt piksel atlası cizim/yakin.js), üstüne iğneyi, güneş parıltısını, dedektör
 * halkalarını ve imleci çizer. Tarla yalnız yüksekliği değişince yeniden boyanır.
 */
import { GENISLIK, YUKSEKLIK } from './kural/boyut.js';
import { igneDerinligi } from './kural/igne.js';
import { gorunum } from './gorunum.js';
import { boya } from './cizim/tarla-boya.js';
import { yakinCiz, yakinSifirla, kanal, karolar } from './cizim/yakin.js';

export const OLCEK = 4;
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

export function cizici(tuval) {
  const ctx = tuval.getContext('2d');
  tuval.width = GENISLIK * OLCEK;
  tuval.height = YUKSEKLIK * OLCEK;
  const ara = document.createElement('canvas');
  ara.width = GENISLIK;
  ara.height = YUKSEKLIK;
  tarlaResmi = ara;
  const actx = ara.getContext('2d');
  const resim = actx.createImageData(GENISLIK, YUKSEKLIK);
  const golgeHucre = (i) => karolar.golgeHucre(kanal, i);
  return function ciz(durum, zaman) {
    const bas = performance.now();
    const degisen = karolar.hDegisti(durum.tarla);
    if (degisen) {
      if (degisen.yeni) yakinSifirla();
      const k = boya(durum.tarla, resim.data, kanal, degisen.yeni ? null : degisen, golgeHucre);
      if (k) actx.putImageData(resim, 0, 0, k.x0, k.y0, k.x1 - k.x0 + 1, k.y1 - k.y0 + 1);
    }
    // Kamera: tüm dünya çizimi (tarla, iğne, halkalar, imleç, katmanlar) tek dönüşümle sarılır.
    const { z, gx, gy } = gorunum;
    ctx.setTransform(z, 0, 0, z, -gx * OLCEK * z, -gy * OLCEK * z);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ara, 0, 0, tuval.width, tuval.height);
    cizimOlcum.karo = yakinCiz(ctx, gorunum, OLCEK);
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

function igneyiCiz(ctx, durum, zaman) {
  const { igne } = durum.tarla;
  const derinlik = durum.goster ? 0 : igneDerinligi(durum.tarla);
  const mx = (igne.x + 0.5) * OLCEK;
  const my = (igne.y + 0.5) * OLCEK;
  if (derinlik === 0) {
    const dx = Math.cos(igne.aci) * OLCEK * 2.2;
    const dy = Math.sin(igne.aci) * OLCEK * 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.55)';
    ctx.lineWidth = 3;
    cizgi(ctx, mx - dx + 1.5, my - dy + 1.5, mx + dx + 1.5, my + dy + 1.5);
    ctx.strokeStyle = '#d9dee6';
    ctx.lineWidth = 2;
    cizgi(ctx, mx - dx, my - dy, mx + dx, my + dy);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    cizgi(ctx, mx - dx * 0.6, my - dy * 0.6, mx + dx * 0.2, my + dy * 0.2);
  } else if (derinlik <= 3 && zaman % 1700 < 140) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(mx - 1, my - 1, 2, 2);
  }
  if (durum.parilti && zaman < durum.parilti.bitis) {
    const kalan = (durum.parilti.bitis - zaman) / durum.parilti.sure;
    yildiz(ctx, mx, my, 4 + 10 * Math.sin(kalan * Math.PI), Math.sin(kalan * Math.PI));
  }
}

function yildiz(ctx, x, y, boy, alfa) {
  ctx.strokeStyle = `rgba(255, 255, 240, ${alfa})`;
  ctx.lineWidth = 1.5;
  cizgi(ctx, x - boy, y, x + boy, y);
  cizgi(ctx, x, y - boy, x, y + boy);
  ctx.lineWidth = 1;
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
