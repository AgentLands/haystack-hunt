/**
 * Bot: iğnenin olası hücre kümesi. Yalnız oyuncunun bildiği şeylerden çıkarım yapar:
 * görünen yükseklik alanı ve dedektör okumaları (iğnenin gerçek konumu okunmaz).
 * Ayrıca bir sonraki dedektör okumasını en çok eleyecek yeri seçer.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';

/** igneSakla kuralı: iğne kenardan en az bu kadar içeride ve yüksek bir hücrededir. */
export const KENAR = 12;
export const MIN_YUK = 30;

/** Okuma: { x, y, alt, ust } = iğne bu noktadan (alt, ust] mesafe aralığındadır. */
export function okumaOlustur(x, y, seviye, seviyeler) {
  let alt = -1;
  for (const s of seviyeler) if (s.mesafe < seviye.mesafe) alt = Math.max(alt, s.mesafe);
  return { x, y, alt, ust: seviye.mesafe };
}

function tutarli(okumalar, x, y) {
  for (const o of okumalar) {
    const d = Math.hypot(x - o.x, y - o.y);
    if (d > o.ust || d <= o.alt) return false;
  }
  return true;
}

/**
 * Olası hücreler (indeks dizisi). Önce "yüksek yığın + kenar payı + tüm okumalar"; boş
 * kalırsa (ör. tarla bot başlamadan önce düzleştirilmişse) koşulları sırayla gevşetir.
 */
export function adaylariBul(h0, okumalar) {
  const kipler = [
    { yuk: true, kenar: true, oku: true },
    { yuk: false, kenar: true, oku: true },
    { yuk: false, kenar: false, oku: true },
    { yuk: true, kenar: true, oku: false },
    { yuk: false, kenar: false, oku: false },
  ];
  for (const k of kipler) {
    const liste = [];
    for (let y = 0; y < YUKSEKLIK; y++) {
      if (k.kenar && (y < KENAR || y >= YUKSEKLIK - KENAR)) continue;
      for (let x = k.kenar ? KENAR : 0; x < (k.kenar ? GENISLIK - KENAR : GENISLIK); x++) {
        if (k.yuk && h0[y * GENISLIK + x] < MIN_YUK) continue;
        if (k.oku && !tutarli(okumalar, x, y)) continue;
        liste.push(y * GENISLIK + x);
      }
    }
    if (liste.length) return Int32Array.from(liste);
  }
  return new Int32Array(0);
}

/**
 * Sonraki okuma yeri: olası kümeyi sıcaklık dilimlerine en dengeli bölen nokta
 * (beklenen kalan küme = Σ n_k² / N en küçük), uzaktaki noktalar hafifçe cezalı.
 */
export function okumaYeriSec(liste, seviyeler, konum) {
  const adim = Math.max(1, Math.floor(liste.length / 2000));
  const ornek = [];
  for (let k = 0; k < liste.length; k += adim) ornek.push(liste[k]);
  const sinir = seviyeler.map((s) => s.mesafe * s.mesafe);
  const aralik = ornek.length > 400 ? 8 : 2;
  let eniyi = { x: konum.x, y: konum.y, puan: Infinity };
  for (let py = aralik >> 1; py < YUKSEKLIK; py += aralik) {
    for (let px = aralik >> 1; px < GENISLIK; px += aralik) {
      const say = new Array(sinir.length).fill(0);
      for (const c of ornek) {
        const dx = (c % GENISLIK) - px;
        const dy = Math.floor(c / GENISLIK) - py;
        const d2 = dx * dx + dy * dy;
        let b = 0;
        while (d2 > sinir[b]) b++;
        say[b]++;
      }
      let beklenen = 0;
      for (const n of say) beklenen += n * n;
      const puan = (beklenen / ornek.length) * (1 + Math.hypot(px - konum.x, py - konum.y) / 600);
      if (puan < eniyi.puan) eniyi = { x: px, y: py, puan };
    }
  }
  return { x: eniyi.x, y: eniyi.y };
}
