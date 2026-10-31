/**
 * Tarla: her hücrede kaç kat saman olduğunu tutan ızgara, tohumdan üretimi ve
 * yığın kayması (dik yamaçtaki saman komşu hücreye dökülür).
 */
import { uretec } from './rastgele.js';
import { igneSakla } from './igne.js';
import { GENISLIK, YUKSEKLIK } from './boyut.js';

/** Komşuyla yükseklik farkı bundan büyükse saman kayar. */
export const ESIK = 3;
const CAPRAZ_ESIK = 4;

/** Tohumdan yeni tarla kurar: birkaç saman yığını, serpinti ve gizli iğne. */
export function tarlaKur(tohum) {
  const zar = uretec(tohum);
  const n = GENISLIK * YUKSEKLIK;
  const h = new Uint16Array(n);
  const doku = new Uint8Array(n);
  const yiginlar = [];
  const yiginSayisi = 6 + Math.floor(zar() * 4);
  for (let k = 0; k < yiginSayisi; k++) {
    yiginlar.push({
      x: GENISLIK * (0.15 + 0.7 * zar()),
      y: YUKSEKLIK * (0.18 + 0.64 * zar()),
      r: 14 + zar() * 20,
      t: 50 + zar() * 60,
    });
  }
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 0; x < GENISLIK; x++) {
      let s = 0;
      for (const t of yiginlar) {
        const d2 = ((x - t.x) ** 2 + (y - t.y) ** 2) / (t.r * t.r);
        if (d2 < 1) s += t.t * (1 - d2);
      }
      const i = y * GENISLIK + x;
      const serpinti = zar() < 0.08 ? 1 + Math.floor(zar() * 2) : 0;
      h[i] = Math.min(200, Math.floor(s) + serpinti);
      doku[i] = samanDokusu(doku, x, y, zar());
    }
  }
  const tarla = { tohum, h, doku, igne: null, kaldirilan: 0 };
  for (let k = 0; k < 600 && cokert(tarla); k++);
  tarla.igne = igneSakla(tarla, zar);
  tarla.baslangicToplam = toplamSaman(tarla);
  return tarla;
}

/** Saman çöpü görünümü: her hücre bölgesine göre çapraz komşusunun tonunu sürdürür. */
function samanDokusu(doku, x, y, z) {
  const yon = Math.sin(x * 0.07) + Math.cos(y * 0.09) > 0 ? -1 : 1;
  const kx = x + yon;
  if (y === 0 || kx < 0 || kx >= GENISLIK) return Math.floor(z * 256);
  return Math.floor(doku[(y - 1) * GENISLIK + kx] * 0.72 + z * 256 * 0.28);
}

/**
 * Tek bir kayma adımı (8 komşu, yerinde); bir şey kaydıysa true. Toplam saman korunur.
 * Tarama yönü her adımda değişir ki yığınlar bir yana doğru akmasın.
 */
export function cokert(tarla) {
  const { h } = tarla;
  const W = GENISLIK;
  const ters = (tarla.adim = (tarla.adim || 0) + 1) % 2 === 0;
  let oynadi = false;
  for (let s = 0; s < YUKSEKLIK; s++) {
    const y = ters ? YUKSEKLIK - 1 - s : s;
    for (let t = 0; t < W; t++) {
      const x = ters ? W - 1 - t : t;
      const i = y * W + x;
      const altVar = y + 1 < YUKSEKLIK;
      if (x + 1 < W && akit(h, i, i + 1, ESIK)) oynadi = true;
      if (altVar && akit(h, i, i + W, ESIK)) oynadi = true;
      if (altVar && x + 1 < W && akit(h, i, i + W + 1, CAPRAZ_ESIK)) oynadi = true;
      if (altVar && x > 0 && akit(h, i, i + W - 1, CAPRAZ_ESIK)) oynadi = true;
    }
  }
  return oynadi;
}

function akit(h, a, b, esik) {
  const fark = h[a] - h[b];
  if (fark > esik) {
    const m = Math.max(1, (fark - esik) >> 2);
    h[a] -= m;
    h[b] += m;
    return true;
  }
  if (-fark > esik) {
    const m = Math.max(1, (-fark - esik) >> 2);
    h[b] -= m;
    h[a] += m;
    return true;
  }
  return false;
}

export function toplamSaman(tarla) {
  let s = 0;
  for (let i = 0; i < tarla.h.length; i++) s += tarla.h[i];
  return s;
}
