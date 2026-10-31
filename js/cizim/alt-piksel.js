/**
 * Alt piksel boyası (saf, DOM yok): tarlanın bir dikdörtgen bölgesini hücre başına S×S alt
 * pikselle boyar. Hücre kanalları (tarla-boya.js) hücre merkezleri arasında çift doğrusal
 * ara değerle örneklenir (yumuşak yamaç, yumuşak gölge); üstüne dünya koordinatına sabit
 * saman çöpü ve toprak dokusu (doku.js) uygulanır. İnce samanda yalnız üstteki çöpler
 * görünür, böylece kazılan çukurun kenarı tek tek çöplerle okunur.
 */
import { kapsama } from './doku.js';
import { KANAL } from './tarla-boya.js';

/** Eğim ışığının sınırı: dik çukur duvarı beyaza ya da siyaha patlamasın. */
const EGIM_EN_AZ = -0.5;
const EGIM_EN_COK = 0.6;

/** Satır ara değer tamponu: bir alt piksel satırında her hücre sütununun kanalları. */
let satirTampon = new Float32Array(0);

/**
 * Hücre (x0, y0)'dan nx×ny hücrelik bölgeyi `cikti`ya (RGBA, (nx·S)×(ny·S)) boyar.
 * kanal: hücre kanalları (en×boy×KANAL); d: { T, ton, ust, golge, toprak } dokular.
 * Doku dünya alt piksel koordinatıyla (x·S, y·S) örneklenir: kamera kayınca doku yüzmez.
 * Çift doğrusal ara değer iki adımda: önce satır başına sütunlar dikey karıştırılır,
 * sonra her alt piksel iki sütun arasında yatay karıştırılır.
 */
export function bolgeBoya(kanal, en, boy, d, x0, y0, nx, ny, S, cikti) {
  const genis = nx * S;
  const yuksek = ny * S;
  const sutun = tablo(x0, genis, S, en);
  const satir = tablo(y0, yuksek, S, boy);
  const ilk = sutun.a[0];
  const sutunSayisi = sutun.b[genis - 1] - ilk + 1;
  if (satirTampon.length < sutunSayisi * KANAL) {
    satirTampon = new Float32Array(sutunSayisi * KANAL);
  }
  const R = satirTampon;
  const { T, ton, ust, golge, toprak } = d;
  const M = T - 1;
  let o = 0;
  for (let py = 0; py < yuksek; py++) {
    const ty = satir.t[py];
    const r0 = (satir.a[py] * en + ilk) * KANAL;
    const r1 = (satir.b[py] * en + ilk) * KANAL;
    for (let j = 0; j < sutunSayisi * KANAL; j++) {
      R[j] = kanal[r0 + j] + (kanal[r1 + j] - kanal[r0 + j]) * ty;
    }
    const tsat = ((y0 * S + py) & M) * T;
    for (let px = 0; px < genis; px++) {
      const tx = sutun.t[px];
      const a = (sutun.a[px] - ilk) * KANAL;
      const b = (sutun.b[px] - ilk) * KANAL;
      const H = R[a] + (R[b] - R[a]) * tx;
      const gol = R[a + 3] + (R[b + 3] - R[a + 3]) * tx;
      const ti = tsat + ((x0 * S + px) & M);
      let r = 0;
      let g = 0;
      let bl = 0;
      const kap = H > 3.5 ? 1 : kapsama(H, ust[ti]);
      if (kap < 1) {
        // Toprak: yumuşak renk × tane/kesek dokusu; ince samanda üst çöplerin gölgesi.
        const tt = (1 + toprak[ti]) * (1 - kapsama(H, golge[ti]) * 0.3);
        r = (R[a + 4] + (R[b + 4] - R[a + 4]) * tx) * tt;
        g = (R[a + 5] + (R[b + 5] - R[a + 5]) * tx) * tt;
        bl = (R[a + 6] + (R[b + 6] - R[a + 6]) * tx) * tt;
      }
      if (kap > 0) {
        const gx = R[a + 1] + (R[b + 1] - R[a + 1]) * tx;
        const gy = R[a + 2] + (R[b + 2] - R[a + 2]) * tx;
        const kaba = R[a + 7] + (R[b + 7] - R[a + 7]) * tx;
        const k = H < 110 ? H / 110 : 1;
        let egim = (gx + gy) * 0.05;
        egim = egim < EGIM_EN_AZ ? EGIM_EN_AZ : egim > EGIM_EN_COK ? EGIM_EN_COK : egim;
        const isik = 1 + egim + kaba * 0.05;
        const st = ton[ti];
        const cop = st < 0 ? 1 + st * 0.62 : 1 + st * 0.4;
        const parlak = isik > 1.12 ? (isik - 1.12) * 80 * cop : 0;
        const sr = (168 + 70 * k) * isik * cop + parlak;
        const sg = (124 + 76 * k) * isik * (st < 0 ? cop : 1 + st * 0.46) + parlak;
        const sb = (46 + 50 * k) * isik * (st < 0 ? cop : 1 + st * 0.8) + parlak * 0.6;
        r = r * (1 - kap) + sr * kap;
        g = g * (1 - kap) + sg * kap;
        bl = bl * (1 - kap) + sb * kap;
      }
      cikti[o] = r * (1 - gol * 0.52);
      cikti[o + 1] = g * (1 - gol * 0.56);
      cikti[o + 2] = bl * (1 - gol * 0.5);
      cikti[o + 3] = 255;
      o += 4;
    }
  }
}

/**
 * Bir eksen için alt piksel → (sol hücre a, sağ hücre b, ağırlık t) tablosu. Alt piksel
 * merkezi dünya konumu v = bas + (p + 0.5)/S; hücre merkezleri tam + 0.5'te; uçlar kenetli.
 * Sonuç önbelleklenir (karo başlangıçları sınırlı sayıda).
 */
export function tablo(bas, adet, S, sinir) {
  const anahtar = `${bas},${adet},${S},${sinir}`;
  let sonuc = tablolar.get(anahtar);
  if (!sonuc) {
    sonuc = tabloKur(bas, adet, S, sinir);
    tablolar.set(anahtar, sonuc);
  }
  return sonuc;
}

const tablolar = new Map();

function tabloKur(bas, adet, S, sinir) {
  const a = new Int32Array(adet);
  const b = new Int32Array(adet);
  const t = new Float32Array(adet);
  for (let p = 0; p < adet; p++) {
    const v = bas + (p + 0.5) / S - 0.5;
    const i = Math.floor(v);
    a[p] = Math.min(sinir - 1, Math.max(0, i));
    b[p] = Math.min(sinir - 1, Math.max(0, i + 1));
    t[p] = v - i;
  }
  return { a, b, t };
}
