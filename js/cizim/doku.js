/**
 * Yakın görünüm dokuları (saf, DOM yok): karma ve değer gürültüsü, kodla üretilmiş
 * döşenebilir SAMAN ÇÖPÜ dokusu (kısa, farklı yönlerde ince çizgiler; birkaç ton), toprak
 * tanesi/kesek dokusu ve ince samanın kapsama işlevi. Dokular T×T (T ikinin kuvveti)
 * Float32Array'lerdir; kenarları sarar, böylece dünya koordinatına döşenir.
 */

/** Tam sayı karma: (x, y, t) → [0, 1). Deterministik, Math.random yok. */
export function karistir(x, y, t) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(t, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Kaba ızgarada değer gürültüsü (yumuşak ara değer); `sar` verilirse ızgara o adette sarar. */
export function gurultu(x, y, adim, t, sar = 0) {
  const gx = Math.floor(x / adim);
  const gy = Math.floor(y / adim);
  const fx = (x / adim - gx) ** 2 * (3 - 2 * (x / adim - gx));
  const fy = (y / adim - gy) ** 2 * (3 - 2 * (y / adim - gy));
  const s = (v) => (sar > 0 ? ((v % sar) + sar) % sar : v);
  const ust = karistir(s(gx), s(gy), t) * (1 - fx) + karistir(s(gx + 1), s(gy), t) * fx;
  const alt = karistir(s(gx), s(gy + 1), t) * (1 - fx) + karistir(s(gx + 1), s(gy + 1), t) * fx;
  return ust * (1 - fy) + alt * fy;
}

/** Tohumlu küçük üreteç (mulberry32); doku üretimi kendi içinde deterministik. */
function uretec(tohum) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Saman dokusu ölçüleri (alt piksel = 1/S hücre). Çöpler çiftçiden (~2 hücre) çok küçük. */
export const SAMAN_AYAR = {
  boyMin: 0.35, boyMax: 0.95, // çöp boyu (hücre)
  kalinMin: 0.9, kalinMax: 1.5, // çöp kalınlığı (alt piksel)
  ortu: 2.4, // her alt piksel ortalama kaç çöp altında kalır
  dip: -0.62, // çöpler arası karanlık boşluk tonu
};

/**
 * Döşenebilir saman çöpü dokusu. Dönen kanallar (her biri T×T):
 *  ton: parlaklık sapması (karanlık boşluk ≈ dip, çöpler −0.25..+0.5; ortalama 0'a çekilir),
 *  ust: o pikseldeki en üst çöpün sırası (0..1; 1 en üstte; boşlukta 0),
 *  golge: o pikselin üstüne gölgesini düşüren en üst çöpün sırası (ince samanda toprakta).
 * Çöp yönleri yerel olarak öbeklenir (döşenebilir gürültü), öbek içinde dağınık.
 */
export function samanDokusu(T, S, tohum = 1) {
  const ton = new Float32Array(T * T).fill(SAMAN_AYAR.dip);
  const ust = new Float32Array(T * T);
  const golge = new Float32Array(T * T);
  const zar = uretec(tohum * 7919 + 13);
  const M = T - 1;
  const { boyMin, boyMax, kalinMin, kalinMax, ortu } = SAMAN_AYAR;
  const ortBoy = ((boyMin + boyMax) / 2) * S;
  const ortKalin = (kalinMin + kalinMax) / 2;
  const sayi = Math.round((ortu * T * T) / (ortBoy * ortKalin));
  const obek = Math.max(4, T / 16);
  for (let n = 0; n < sayi; n++) {
    const sira = (n + 1) / sayi;
    const cx = zar() * T;
    const cy = zar() * T;
    const yon = gurultu(cx, cy, obek, tohum, T / obek) * Math.PI * 1.3 + (zar() - 0.5) * 1.5;
    const boy = (boyMin + (boyMax - boyMin) * zar()) * S;
    const kalin = kalinMin + (kalinMax - kalinMin) * zar();
    const secim = zar();
    let cTon = 0.02 + zar() * 0.22; // altın
    if (secim < 0.22) cTon = 0.28 + zar() * 0.24; // solgun, parlak
    else if (secim < 0.34) cTon = -0.3 + zar() * 0.18; // eskimiş, koyu
    const dx = (Math.cos(yon) * boy) / 2;
    const dy = (Math.sin(yon) * boy) / 2;
    cizgiBoya(cx + 0.9, cy + 0.9, dx, dy, kalin + 0.6, M, T, (i, k) => {
      ton[i] -= k * 0.32;
      if (ton[i] < -0.8) ton[i] = -0.8;
      if (k > 0.35 && sira > golge[i]) golge[i] = sira;
    });
    cizgiBoya(cx, cy, dx, dy, kalin, M, T, (i, k, yan, boyunca) => {
      // Işık sol üstten: o yana bakan kenar parlak; uçlara doğru hafif kararma.
      const t = cTon + yan * 0.16 - boyunca * boyunca * 0.12;
      ton[i] = ton[i] * (1 - k) + t * k;
      if (k > 0.45) ust[i] = sira;
    });
  }
  let ort = 0;
  for (let i = 0; i < ton.length; i++) ort += ton[i];
  ort /= ton.length;
  for (let i = 0; i < ton.length; i++) ton[i] -= ort;
  return { T, ton, ust, golge };
}

/**
 * Sarmalı (döşenebilir) kenar yumuşatmalı doğru parçası: merkez (cx, cy), yarı vektör
 * (dx, dy), kalınlık. her(i, kapsama, yan, boyunca): yan −1..1 (ışığa bakan kenar +),
 * boyunca −1..1 (uçtan uca).
 */
function cizgiBoya(cx, cy, dx, dy, kalin, M, T, her) {
  const boy2 = dx * dx + dy * dy || 1e-6;
  const yari = kalin / 2;
  const x0 = Math.floor(cx - Math.abs(dx) - yari - 1);
  const x1 = Math.ceil(cx + Math.abs(dx) + yari + 1);
  const y0 = Math.floor(cy - Math.abs(dy) - yari - 1);
  const y1 = Math.ceil(cy + Math.abs(dy) + yari + 1);
  const boy = Math.sqrt(boy2);
  // Işık yönü (−1, −1)'e bakan dik.
  let nx = -dy / boy;
  let ny = dx / boy;
  if (nx + ny > 0) [nx, ny] = [-nx, -ny];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      const u = Math.max(-1, Math.min(1, (px * dx + py * dy) / boy2));
      const ex = px - u * dx;
      const ey = py - u * dy;
      const d = Math.sqrt(ex * ex + ey * ey);
      const k = Math.min(1, yari + 0.5 - d);
      if (k <= 0) continue;
      const yan = Math.max(-1, Math.min(1, (ex * nx + ey * ny) / Math.max(0.5, yari)));
      her((y & M) * T + (x & M), k, yan, u);
    }
  }
}

/**
 * Döşenebilir toprak dokusu (parlaklık sapması): ince tane, hücre ölçeğinde kesek
 * lekeleri, küçük kesekler (açık üst, koyu alt kenar), seyrek soluk çakıl. Ortalama ≈ 0.
 */
export function toprakDokusu(T, S, tohum = 2) {
  const d = new Float32Array(T * T);
  const M = T - 1;
  const kucuk = Math.max(2, S / 3);
  const buyuk = Math.max(4, S * 1.6);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const ince = karistir(x, y, tohum) - 0.5;
      const orta = gurultu(x, y, kucuk, tohum + 1, T / kucuk) - 0.5;
      const leke = gurultu(x, y, buyuk, tohum + 2, T / buyuk) - 0.5;
      d[y * T + x] = ince * 0.12 + orta * 0.14 + leke * 0.16;
    }
  }
  const zar = uretec(tohum * 104729 + 5);
  const sayi = Math.round(((T * T) / (S * S)) * 2.2);
  for (let n = 0; n < sayi; n++) {
    const cx = zar() * T;
    const cy = zar() * T;
    const cakil = zar() < 0.12;
    const r = (cakil ? 0.05 + zar() * 0.06 : 0.06 + zar() * 0.12) * S;
    const ton = cakil ? 0.14 + zar() * 0.12 : (zar() - 0.65) * 0.22;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const px = x + 0.5 - cx;
        const py = y + 0.5 - cy;
        const k = Math.min(1, r + 0.5 - Math.hypot(px, py)) * 0.85;
        if (k <= 0) continue;
        const i = (y & M) * T + (x & M);
        const kenar = (px + py) / (r + 0.5); // sol üst aydınlık, sağ alt gölgeli
        d[i] = d[i] * (1 - k) + (d[i] + ton - kenar * 0.1) * k;
      }
    }
  }
  let ort = 0;
  for (let i = 0; i < d.length; i++) ort += d[i];
  ort /= d.length;
  for (let i = 0; i < d.length; i++) d[i] -= ort;
  return d;
}

/**
 * İnce samanın kapsaması (0..1): yükseklik H (kat) azaldıkça yalnız en üstteki çöpler
 * (ust sırası yüksek olanlar) görünür; H ≈ 0'da hiç, H ≥ ~3'te tamamı (boşluklar dahil).
 */
export function kapsama(H, ust) {
  const esik = 1.06 - H / 2.9;
  const k = (ust - esik) * 9;
  return k <= 0 ? 0 : k >= 1 ? 1 : k;
}
