/**
 * Çizim: tarlayı yükseklik ve eğime göre gölgeli piksellere boyar, üstüne iğneyi,
 * güneş parıltısını, dedektör halkalarını ve imleci çizer.
 */
import { GENISLIK, YUKSEKLIK } from './kural/boyut.js';
import { igneDerinligi } from './kural/igne.js';
import { gorunum } from './gorunum.js';

export const OLCEK = 4;
/** Boyanmış çıplak tarla (GENISLIK×YUKSEKLIK, katmansız); mini harita bundan çizer. */
export let tarlaResmi = null;
const TOPRAK = [104, 78, 52];
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
  return function ciz(durum, zaman) {
    boya(durum.tarla, resim.data);
    actx.putImageData(resim, 0, 0);
    // Kamera: tüm dünya çizimi (tarla, iğne, halkalar, imleç, katmanlar) tek dönüşümle sarılır.
    const { z, gx, gy } = gorunum;
    ctx.setTransform(z, 0, 0, z, -gx * OLCEK * z, -gy * OLCEK * z);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ara, 0, 0, tuval.width, tuval.height);
    for (const k of katmanlar.alt) k(ctx, durum, zaman);
    igneyiCiz(ctx, durum, zaman);
    halkalariCiz(ctx, durum.halkalar, zaman);
    imleciCiz(ctx, durum);
    for (const k of katmanlar.ust) k(ctx, durum, zaman);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
}

/** Gölge yüksekliği tamponu: sol üstten gelen ışının o hücredeki en alçak yüksekliği. */
const GOLGE = new Float32Array(GENISLIK * YUKSEKLIK);
const GOLGE_DUSUS = 1.9;
const GOLGE_YUMUSAK = 12;
const TOPRAK_RENK = new Float32Array(GENISLIK * YUKSEKLIK * 3);
let toprakTarla = null;

function karistir(x, y, t) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(t, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Kaba ızgarada değer gürültüsü (yumuşak ara değer); toprak lekeleri için. */
function gurultu(x, y, adim, t) {
  const gx = Math.floor(x / adim);
  const gy = Math.floor(y / adim);
  const fx = (x / adim - gx) ** 2 * (3 - 2 * (x / adim - gx));
  const fy = (y / adim - gy) ** 2 * (3 - 2 * (y / adim - gy));
  const ust = karistir(gx, gy, t) * (1 - fx) + karistir(gx + 1, gy, t) * fx;
  const alt = karistir(gx, gy + 1, t) * (1 - fx) + karistir(gx + 1, gy + 1, t) * fx;
  return ust * (1 - fy) + alt * fy;
}

/** Toprak rengi tarla başına bir kez: nemli/kuru lekeler, ince tane, çakıl ve anız. */
function toprakHazirla(tarla) {
  const t = tarla.tohum | 0;
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 0; x < GENISLIK; x++) {
      const o = (y * GENISLIK + x) * 3;
      const leke = gurultu(x, y, 22, t) * 0.65 + gurultu(x, y, 7, t + 1) * 0.35 - 0.5;
      const tane = karistir(x, y, t + 2) - 0.5;
      let r = TOPRAK[0] + leke * 34 + tane * 12;
      let g = TOPRAK[1] + leke * 26 + tane * 9;
      let b = TOPRAK[2] + leke * 16 + tane * 7;
      const z = karistir(x, y, t + 3);
      if (z < 0.012) [r, g, b] = [r + 34, g + 30, b + 26];
      else if (z < 0.03) [r, g, b] = [r * 0.8, g * 0.78, b * 0.76];
      else if (z > 0.985) [r, g, b] = [r + 30, g + 22, b + 4];
      TOPRAK_RENK[o] = r;
      TOPRAK_RENK[o + 1] = g;
      TOPRAK_RENK[o + 2] = b;
    }
  }
  toprakTarla = tarla;
}

/**
 * Tarlayı piksellere boyar: toprak dokusu, eğim ışığı (güneş sol üstten), saman çöpü
 * dokusu, kat kenarları ve tek geçişte hesaplanan yumuşak yığın gölgesi (gölge yüksekliği
 * sol üst komşulardan alçalarak taşınır; altında kalan hücre gölgede).
 */
function boya(tarla, veri) {
  if (toprakTarla !== tarla) toprakHazirla(tarla);
  const { h, doku } = tarla;
  const W = GENISLIK;
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      const yuk = h[i];
      let gelen = 0;
      if (x > 0 && y > 0) {
        gelen = (GOLGE[i - W - 1] * 2 + GOLGE[i - 1] + GOLGE[i - W]) * 0.25 - GOLGE_DUSUS;
      }
      GOLGE[i] = gelen > yuk ? gelen : yuk;
      const gol = gelen > yuk ? Math.min(1, (gelen - yuk) / GOLGE_YUMUSAK) : 0;
      const sol = h[x > 0 ? i - 1 : i];
      const sag = h[x < W - 1 ? i + 1 : i];
      const ust = h[y > 0 ? i - W : i];
      const alt = h[y < YUKSEKLIK - 1 ? i + W : i];
      let r = TOPRAK_RENK[i * 3];
      let g = TOPRAK_RENK[i * 3 + 1];
      let b = TOPRAK_RENK[i * 3 + 2];
      if (yuk < 4 && sol + ust + sag + alt > 12) {
        r *= 0.86;
        g *= 0.85;
        b *= 0.84;
      }
      if (yuk > 0) {
        const t = (doku[i] - 128) / 64;
        const k = Math.min(1, yuk / 110);
        let isik = 1 + ((sag - sol) + (alt - ust)) * 0.05 + t * 0.11;
        if (doku[i] < 64) isik *= 0.88;
        const katman = Math.floor(yuk / 15);
        if (katman !== Math.floor(sol / 15) || katman !== Math.floor(ust / 15)) isik *= 0.92;
        const parlak = isik > 1.12 ? (isik - 1.12) * 90 : 0;
        const a = yuk > 2 ? Math.min(1, yuk / 4) : yuk * 0.16;
        r = r * (1 - a) + ((168 + 70 * k) * isik + parlak) * a;
        g = g * (1 - a) + ((124 + 76 * k) * isik + parlak) * a;
        b = b * (1 - a) + ((46 + 50 * k) * isik + parlak * 0.6) * a;
      }
      veri[o] = r * (1 - gol * 0.52);
      veri[o + 1] = g * (1 - gol * 0.56);
      veri[o + 2] = b * (1 - gol * 0.5);
      veri[o + 3] = 255;
    }
  }
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

function halkalariCiz(ctx, halkalar, zaman) {
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const halka of halkalar) {
    const x = (halka.x + 0.5) * OLCEK;
    const y = (halka.y + 0.5) * OLCEK;
    const gecen = zaman - halka.zaman;
    ctx.strokeStyle = halka.seviye.renk;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    if (gecen < 1400) {
      ctx.globalAlpha = 1 - gecen / 1400;
      ctx.beginPath();
      ctx.arc(x, y, 6 + gecen / 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (gecen < 3500) {
      ctx.globalAlpha = Math.min(1, (3500 - gecen) / 600);
      ctx.fillStyle = 'rgba(20, 14, 8, 0.75)';
      const en = ctx.measureText(halka.seviye.ad).width + 12;
      ctx.fillRect(x - en / 2, y - 32, en, 19);
      ctx.fillStyle = halka.seviye.renk;
      ctx.fillText(halka.seviye.ad, x, y - 18);
    }
    ctx.globalAlpha = 1;
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
