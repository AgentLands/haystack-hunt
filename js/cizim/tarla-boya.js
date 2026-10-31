/**
 * Tarla boyası (saf, DOM yok): hücre başına 1 piksel (uzak görünüm ve mini harita) ve aynı
 * geçişte yakın görünüm için hücre kanalları (yükseklik, eğim, yığın gölgesi, yumuşak toprak
 * rengi, kaba saman tonu). Yığın gölgesi tek geçişte: gölge yüksekliği sol üst komşulardan
 * alçalarak taşınır; altında kalan hücre gölgede.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';
import { karistir, gurultu } from './doku.js';

const TOPRAK = [104, 78, 52];
/**
 * Yakın görünüm hücre kanalları (hücre başına KANAL sayı): 0 yükseklik, 1–2 x/y eğimi
 * (sağ − sol, alt − üst), 3 yığın gölgesi (0..1), 4–6 yumuşak toprak rengi, 7 kaba saman tonu.
 */
export const KANAL = 8;
export const K_H = 0;
export const K_GOL = 3;

const W = GENISLIK;
const GOLGE = new Float32Array(W * YUKSEKLIK);
const GOLGE_DUSUS = 1.9;
const GOLGE_YUMUSAK = 12;
const TOPRAK_RENK = new Float32Array(W * YUKSEKLIK * 3);
const TOPRAK_YUMUSAK = new Float32Array(W * YUKSEKLIK * 3);
let toprakTarla = null;

/** Toprak rengi tarla başına bir kez: nemli/kuru lekeler, ince tane, çakıl ve anız. */
function toprakHazirla(tarla) {
  const t = tarla.tohum | 0;
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      const leke = gurultu(x, y, 22, t) * 0.65 + gurultu(x, y, 7, t + 1) * 0.35 - 0.5;
      const lr = TOPRAK[0] + leke * 34;
      const lg = TOPRAK[1] + leke * 26;
      const lb = TOPRAK[2] + leke * 16;
      TOPRAK_YUMUSAK[o] = lr;
      TOPRAK_YUMUSAK[o + 1] = lg;
      TOPRAK_YUMUSAK[o + 2] = lb;
      const tane = karistir(x, y, t + 2) - 0.5;
      let r = lr + tane * 12;
      let g = lg + tane * 9;
      let b = lb + tane * 7;
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
 * dokusu, kat kenarları ve yumuşak yığın gölgesi; aynı geçişte yakın görünüm kanallarını
 * (Float32Array, GENISLIK×YUKSEKLIK×KANAL) yazar.
 *
 * degisen null ise hepsini boyar. Değilse { y0, y1, sMin, sMax } (y0..y1 satırlarında
 * yüksekliği değişen sütun aralıkları; boş satırda sMin > sMax) yalnız etkilenen hücreleri
 * boyar: yükseklik komşularının ±1'i ve gölgenin değiştiği yerden sağa/aşağı taşan koni
 * (gölge değişmeyi bırakınca koni kapanır). Her boyanan hücre için her(i) çağrılır.
 * Boyanan dikdörtgeni { x0, y0, x1, y1 } (uçlar dahil) döndürür; hiçbir şey yoksa null.
 */
export function boya(tarla, veri, kanal, degisen = null, her = null) {
  if (toprakTarla !== tarla) {
    toprakHazirla(tarla);
    degisen = null;
  }
  const kutu = { x0: W, y0: YUKSEKLIK, x1: -1, y1: -1 };
  const bas = degisen ? Math.max(0, degisen.y0 - 1) : 0;
  let lo = W;
  let hi = -1;
  for (let y = bas; y < YUKSEKLIK; y++) {
    let a = 0;
    let b = W - 1;
    if (degisen) {
      a = lo;
      b = hi + 1;
      for (let r = Math.max(degisen.y0, y - 1); r <= Math.min(degisen.y1, y + 1); r++) {
        if (degisen.sMin[r] <= degisen.sMax[r]) {
          a = Math.min(a, degisen.sMin[r] - 1);
          b = Math.max(b, degisen.sMax[r] + 1);
        }
      }
      if (a > b) {
        if (y > degisen.y1 + 1) break;
        lo = W;
        hi = -1;
        continue;
      }
    }
    lo = W;
    hi = -1;
    let oncekiDegisti = false;
    for (let x = Math.max(0, a); x < W && (x <= b || oncekiDegisti); x++) {
      oncekiDegisti = hucreBoya(tarla, veri, kanal, x, y);
      if (oncekiDegisti) {
        if (x < lo) lo = x;
        hi = x;
      }
      if (her) her(y * W + x);
      if (x < kutu.x0) kutu.x0 = x;
      if (x > kutu.x1) kutu.x1 = x;
      if (y < kutu.y0) kutu.y0 = y;
      kutu.y1 = y;
    }
  }
  return kutu.x1 >= 0 ? kutu : null;
}

/** Tek hücreyi boyar (piksel + kanallar); gölge yüksekliği değiştiyse true. */
function hucreBoya(tarla, veri, kanal, x, y) {
  const { h, doku } = tarla;
  const i = y * W + x;
  const o = i * 4;
  const yuk = h[i];
  let gelen = 0;
  if (x > 0 && y > 0) {
    gelen = (GOLGE[i - W - 1] * 2 + GOLGE[i - 1] + GOLGE[i - W]) * 0.25 - GOLGE_DUSUS;
  }
  const eski = GOLGE[i];
  GOLGE[i] = gelen > yuk ? gelen : yuk;
  const gol = gelen > yuk ? Math.min(1, (gelen - yuk) / GOLGE_YUMUSAK) : 0;
  const sol = h[x > 0 ? i - 1 : i];
  const sag = h[x < W - 1 ? i + 1 : i];
  const ust = h[y > 0 ? i - W : i];
  const alt = h[y < YUKSEKLIK - 1 ? i + W : i];
  let r = TOPRAK_RENK[i * 3];
  let g = TOPRAK_RENK[i * 3 + 1];
  let b = TOPRAK_RENK[i * 3 + 2];
  const dip = yuk < 4 && sol + ust + sag + alt > 12;
  if (dip) {
    r *= 0.86;
    g *= 0.85;
    b *= 0.84;
  }
  const t = (doku[i] - 128) / 64;
  const k = i * KANAL;
  const kis = dip ? 0.85 : 1;
  kanal[k] = yuk;
  kanal[k + 1] = sag - sol;
  kanal[k + 2] = alt - ust;
  kanal[k + 3] = gol;
  kanal[k + 4] = TOPRAK_YUMUSAK[i * 3] * kis;
  kanal[k + 5] = TOPRAK_YUMUSAK[i * 3 + 1] * kis;
  kanal[k + 6] = TOPRAK_YUMUSAK[i * 3 + 2] * kis;
  kanal[k + 7] = t;
  if (yuk > 0) {
    const kat = Math.min(1, yuk / 110);
    let isik = 1 + ((sag - sol) + (alt - ust)) * 0.05 + t * 0.11;
    if (doku[i] < 64) isik *= 0.88;
    const katman = Math.floor(yuk / 15);
    if (katman !== Math.floor(sol / 15) || katman !== Math.floor(ust / 15)) isik *= 0.92;
    const parlak = isik > 1.12 ? (isik - 1.12) * 90 : 0;
    const a = yuk > 2 ? Math.min(1, yuk / 4) : yuk * 0.16;
    r = r * (1 - a) + ((168 + 70 * kat) * isik + parlak) * a;
    g = g * (1 - a) + ((124 + 76 * kat) * isik + parlak) * a;
    b = b * (1 - a) + ((46 + 50 * kat) * isik + parlak * 0.6) * a;
  }
  veri[o] = r * (1 - gol * 0.52);
  veri[o + 1] = g * (1 - gol * 0.56);
  veri[o + 2] = b * (1 - gol * 0.5);
  veri[o + 3] = 255;
  return GOLGE[i] !== eski;
}
