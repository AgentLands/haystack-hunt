/**
 * Çiftlikte saman yükseklik alanı (tarla.h) ile benzetimin bağı: toplayıcının samanAl'ı,
 * boşaltıcının samanDok'u, parça kurulurken alttaki samanın çevreye dağıtılması, kirli
 * bölge taramalı yığın kayması (cokertKaro) ve gömülü nesnelerin eşyaya dönüşmesi.
 *
 * Kirli bölgeler: tarla 16×16 hücrelik 15×10 bölgeye ayrılır (c.kirli). Çiftliğin kendi
 * yazıcıları (bu modül) yalnız bölgeyi işaretler. `tarla.kirli` çiftlikte "yeri bilinmeyen
 * dış değişiklik" demektir (el, tırmık, kepçe, üfleyici yalnız onu kurar): cokertKaro onu
 * görünce bütün bölgeleri kirletir ve bayrağı indirir (oyuncu kazarken tam tarama; normal
 * moddakiyle aynı maliyet). Parça tabanı (izgara.taban) duvardır: oraya akmaz, oradan akmaz.
 * Normal modun `cokert`i ve izi bundan etkilenmez.
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';
import { akit, ESIK, CAPRAZ_ESIK } from '../tarla.js';

export const KIRLI_KARO = 16;
export const KIRLI_EN = GENISLIK / KIRLI_KARO;
export const KIRLI_BOY = YUKSEKLIK / KIRLI_KARO;
/** Bir tikte en çok bu kadar kayma geçişi (20 Hz × 6 = saniyede 120, normal modla aynı). */
export const KAYMA_TIK = 6;
const SAMAN_TAVAN = 65535;

export const bolgeNo = (x, y) => (y >> 4) * KIRLI_EN + (x >> 4);

/** Hücrenin bölgesini kirletir. */
export function kirliIsaretle(c, x, y) {
  c.kirli[bolgeNo(x, y)] = 1;
}

/** [x0, x1) × [y0, y1) hücre alanına (1 hücre payla) değen bütün bölgeleri kirletir. */
export function alaniKirlet(c, x0, y0, x1, y1) {
  const bx0 = Math.max(0, x0 - 1) >> 4;
  const by0 = Math.max(0, y0 - 1) >> 4;
  const bx1 = Math.min(GENISLIK - 1, x1) >> 4;
  const by1 = Math.min(YUKSEKLIK - 1, y1) >> 4;
  for (let by = by0; by <= by1; by++) {
    for (let bx = bx0; bx <= bx1; bx++) c.kirli[by * KIRLI_EN + bx] = 1;
  }
}

/** (cx, cy) çevresinde r yarıçaplı (tam sayı, daire) uygun hücreler: tarlada, taban değil. */
function daireHucreleri(c, cx, cy, r) {
  const hucreler = [];
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= GENISLIK || y >= YUKSEKLIK) continue;
      const i = y * GENISLIK + x;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2 || c.izgara.taban[i]) continue;
      hucreler.push(i);
    }
  }
  return hucreler;
}

/**
 * Toplayıcı ağzı: (cx, cy) çevresinden (r hücre) en çok `miktar` kat alır; her kat en yüksek
 * hücreden (eşitlikte tarama sırasında ilk). Alınan katı döndürür (tarla.kaldirilan'a
 * yazılmaz: saman benzetimde kalır).
 */
export function samanAl(tarla, c, cx, cy, r, miktar) {
  const { h } = tarla;
  const hucreler = daireHucreleri(c, cx, cy, r);
  let alinan = 0;
  while (alinan < miktar) {
    let en = -1;
    for (const i of hucreler) if (en < 0 || h[i] > h[en]) en = i;
    if (en < 0 || h[en] === 0) break;
    h[en] -= 1;
    alinan += 1;
    kirliIsaretle(c, en % GENISLIK, (en / GENISLIK) | 0);
  }
  return alinan;
}

/** (cx, cy)'ye miktar kat döker: her kat yakındaki en alçak uygun hücreye. Dökülen kat. */
export function samanDok(tarla, c, cx, cy, miktar) {
  const { h } = tarla;
  for (let r = 1; r <= 6; r++) {
    const hucreler = daireHucreleri(c, cx, cy, r);
    if (!hucreler.length) continue;
    let kalan = miktar;
    while (kalan > 0) {
      let en = hucreler[0];
      for (const i of hucreler) if (h[i] < h[en]) en = i;
      if (h[en] >= SAMAN_TAVAN) break;
      h[en] += 1;
      kalan -= 1;
      kirliIsaretle(c, en % GENISLIK, (en / GENISLIK) | 0);
    }
    return miktar - kalan;
  }
  return 0;
}

/** [x0, x1) × [y0, y1) dikdörtgeninin r. halkasındaki uygun hücreler (tarama sırası). */
function halka(c, x0, y0, x1, y1, r) {
  const liste = [];
  for (let y = y0 - r; y < y1 + r; y++) {
    for (let x = x0 - r; x < x1 + r; x++) {
      const kenarda = y === y0 - r || y === y1 + r - 1 || x === x0 - r || x === x1 + r - 1;
      if (!kenarda || x < 0 || y < 0 || x >= GENISLIK || y >= YUKSEKLIK) continue;
      const i = y * GENISLIK + x;
      if (!c.izgara.taban[i]) liste.push(i);
    }
  }
  return liste;
}

/**
 * Dikdörtgenin altındaki saman toplamını (miktar) çevre halkasına eşit dağıtır: her hücreye
 * floor(miktar / n), artan ilk hücrelere birer kat. Halka doluysa (hep taban) bir dışa geçer.
 */
export function cevreyeDagit(tarla, c, x0, y0, x1, y1, miktar) {
  if (miktar <= 0) return;
  for (let r = 1; r <= 8; r++) {
    const liste = halka(c, x0, y0, x1, y1, r);
    if (!liste.length) continue;
    const pay = Math.floor(miktar / liste.length);
    const artan = miktar - pay * liste.length;
    liste.forEach((i, k) => {
      tarla.h[i] += pay + (k < artan ? 1 : 0);
      kirliIsaretle(c, i % GENISLIK, (i / GENISLIK) | 0);
    });
    return;
  }
  throw new Error('cevreyeDagit: çevrede boş hücre yok');
}

/**
 * Kirli bölgelerde tek kayma geçişi (bölge + 1 hücre pay; akit kuralı tarla.js ile aynı).
 * Akış olan hücrelerin bölgeleri sonraki geçiş için kirli kalır; akışsız bölge temizlenir.
 * Bir şey kaydıysa true.
 */
export function cokertKaro(tarla, c) {
  const kir = c.kirli;
  if (tarla.kirli) {
    kir.fill(1);
    tarla.kirli = false;
  }
  const liste = [];
  for (let i = 0; i < kir.length; i++) if (kir[i]) liste.push(i);
  if (!liste.length) return false;
  kir.fill(0);
  c.kaymaAdim = (c.kaymaAdim + 1) | 0;
  const ters = (c.kaymaAdim & 1) === 0;
  if (ters) liste.reverse();
  let oynadi = false;
  for (const b of liste) {
    if (bolgeTara(tarla.h, c, (b % KIRLI_EN) * KIRLI_KARO, ((b / KIRLI_EN) | 0) * KIRLI_KARO,
      ters)) oynadi = true;
  }
  return oynadi;
}

function bolgeTara(h, c, bx, by, ters) {
  const W = GENISLIK;
  const taban = c.izgara.taban;
  const x0 = Math.max(0, bx - 1);
  const y0 = Math.max(0, by - 1);
  const en = bx + KIRLI_KARO - x0;
  const boy = by + KIRLI_KARO - y0;
  let oynadi = false;
  // Sıcak döngü: çoğu çift akmaz; fark eşiği aşmadıkça akit çağrılmaz.
  const dene = (i, j, esik) => {
    const f = h[i] - h[j];
    if ((f <= esik && -f <= esik) || taban[i] || taban[j]) return;
    akit(h, i, j, esik);
    oynadi = true;
    c.kirli[bolgeNo(i % W, (i / W) | 0)] = 1;
    c.kirli[bolgeNo(j % W, (j / W) | 0)] = 1;
  };
  for (let s = 0; s < boy; s++) {
    const y = ters ? y0 + boy - 1 - s : y0 + s;
    const altVar = y + 1 < YUKSEKLIK;
    for (let t = 0; t < en; t++) {
      const x = ters ? x0 + en - 1 - t : x0 + t;
      const i = y * W + x;
      if (x + 1 < W) dene(i, i + 1, ESIK);
      if (altVar) dene(i, i + W, ESIK);
      if (altVar && x + 1 < W) dene(i, i + W + 1, CAPRAZ_ESIK);
      if (altVar && x > 0) dene(i, i + W - 1, CAPRAZ_ESIK);
    }
  }
  return oynadi;
}

/**
 * Gömülü nesneleri eşyaya çevirir: (cx, cy) çevresinde r hücre içinde, alınmamış, tarlada
 * (kepçede/balyada değil), parça tabanı altında olmayan ve üstünde saman kalmamış (h ≤ z)
 * nesneler alındı işaretlenir ve listesi döner (her biri { esya: kod, ... }).
 */
export function gomuluCikar(tarla, c, cx, cy, r) {
  const cikan = [];
  const r2 = r * r;
  for (const g of c.gomulu) {
    if (g.alindi || g.kepcede || g.balyada) continue;
    const dx = g.x - cx;
    const dy = g.y - cy;
    if (dx * dx + dy * dy > r2) continue;
    const i = (g.y | 0) * GENISLIK + (g.x | 0);
    if (c.izgara.taban[i] || tarla.h[i] > g.z) continue;
    g.alindi = true;
    cikan.push(g);
  }
  return cikan;
}
