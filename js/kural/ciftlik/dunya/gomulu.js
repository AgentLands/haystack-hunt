/**
 * Çiftliğin gömülü nesneleri (docs/ciftlik/esyalar.md §4): başlangıç yerleşimi (tohumdan,
 * civileriSakla deseni: her tür kendi karıştırma sabitiyle, h ≥ 25 harman hücreleri,
 * z = h × (0,1 + 0,5·zar); iğne ailesi birbirinden ≥ 6, her nesne öbürlerinden ≥ 4 hücre;
 * tür başına en çok 40000 deneme), açıkta kalma ve yuvarlanma aşaması, sonradan eklenen
 * nesneler için `gomuluEkle` (olay 'gomulu-eklendi'). Nesne biçimi { esya, x, y, z, aci,
 * alindi, tur? (buluntu türü), ogretici? }; x, y tam sayı hücre. Hiçbir nesne listeden
 * silinmez: alınan nesne `alindi` olur ve bir eşyaya dönüşür (iğne/buluntu kaybolmaz).
 */
import { GENISLIK, YUKSEKLIK } from '../../boyut.js';
import { uretec } from '../../rastgele.js';
import { KATALOG, NADIRLIK } from '../../buluntu.js';
import { esyaKodu } from '../esya.js';
import { asamaTanimla } from '../benzetim.js';
import { tarladaMi } from '../saman.js';
import { ZEMIN, hucreZemini } from './zemin.js';
import { karma } from './hava.js';

/** Başlangıç sayıları (ilk iğne ve 8 öğretici çivisi ayrıca: ogretici.js). */
export const GOMULU_SAYI = Object.freeze({
  igne: 4, cuvaldiz: 1, altinIhtimal: 300 /* binde */, civi: 120, tas: 90, buluntu: 40,
});
export const GOMULU_ARALIK = 4;
export const IGNE_ARALIK = 6;
export const DENEME_TAVANI = 40000;
/** Yerleşim için en az saman (kat) ve kenar payı (hücre). */
const EN_AZ_H = 25;
const KENAR = 6;
/** Yuvarlanma: her YUVARLANMA_TIK tikte, en alçak 4-komşu en az YUVARLANMA_FARK alçaksa. */
export const YUVARLANMA_TIK = 20;
export const YUVARLANMA_FARK = 2;

export const IGNE_AILESI = Object.freeze(['igne', 'cuvaldiz', 'altin-igne']);
/** Eşya kodu iğne ailesinden mi? */
export const igneMi = (kod) => IGNE_AILESI.some((ad) => esyaKodu(ad) === kod);

const KARISTIR = { igne: 0x1b873593, civi: 0xcc9e2d51, tas: 0x27d4eb2f, buluntu: 0x165667b1 };

/** KATALOG nadirlik ağırlıklarıyla buluntu türü (tekrar serbest). */
function buluntuSec(zar) {
  const toplam = KATALOG.reduce((t, b) => t + NADIRLIK[b.nadirlik].agirlik, 0);
  let pay = zar() * toplam;
  for (const b of KATALOG) {
    pay -= NADIRLIK[b.nadirlik].agirlik;
    if (pay < 0) return b.tur;
  }
  return KATALOG[KATALOG.length - 1].tur;
}

/** Yarıçaplı maske işaretleyici: (x, y) çevresinde r hücre "dolu". */
function damgala(maske, x, y, r) {
  for (let j = Math.max(0, y - r + 1); j < Math.min(YUKSEKLIK, y + r); j++) {
    for (let i = Math.max(0, x - r + 1); i < Math.min(GENISLIK, x + r); i++) {
      if ((i - x) * (i - x) + (j - y) * (j - y) < r * r) maske[j * GENISLIK + i] = 1;
    }
  }
}

/**
 * Başlangıç gömülüleri. c: zemini okumak için { arazi } (araziKur sonucu yeterli).
 * Sığmayan olursa liste kısa kalır (test bunu yakalar).
 */
export function gomuluYerlestir(tarla, arazi, tohum) {
  const c = { arazi };
  const hepsi = new Uint8Array(GENISLIK * YUKSEKLIK);
  const igneMaske = new Uint8Array(GENISLIK * YUKSEKLIK);
  const liste = [];
  const altinVar = karma(tohum >>> 0, 20, 0) % 1000 < GOMULU_SAYI.altinIhtimal;
  const plan = [
    ['igne', 'igne', GOMULU_SAYI.igne], ['igne', 'cuvaldiz', GOMULU_SAYI.cuvaldiz],
    ['igne', 'altin-igne', altinVar ? 1 : 0], ['buluntu', null, GOMULU_SAYI.buluntu],
    ['civi', 'civi', GOMULU_SAYI.civi], ['tas', 'tas', GOMULU_SAYI.tas],
  ];
  const zarlar = {};
  for (const [aile, ad, sayi] of plan) {
    const zar = (zarlar[aile] ??= uretec(((tohum >>> 0) ^ KARISTIR[aile]) >>> 0));
    let kalan = sayi;
    for (let deneme = 0; deneme < DENEME_TAVANI && kalan > 0; deneme++) {
      const x = KENAR + Math.floor(zar() * (GENISLIK - 2 * KENAR));
      const y = KENAR + Math.floor(zar() * (YUKSEKLIK - 2 * KENAR));
      const i = y * GENISLIK + x;
      const h = tarla.h[i];
      const z = Math.floor(h * (0.1 + 0.5 * zar()));
      const aci = zar() * 3;
      if (h < EN_AZ_H || hepsi[i] || hucreZemini(c, x, y) !== ZEMIN.HARMAN) continue;
      if (aile === 'igne' && igneMaske[i]) continue;
      const g = { esya: 0, x, y, z, aci, alindi: false };
      if (aile === 'buluntu') {
        g.tur = buluntuSec(zar);
        g.esya = esyaKodu(`buluntu:${g.tur}`);
      } else {
        g.esya = esyaKodu(ad);
      }
      liste.push(g);
      damgala(hepsi, x, y, GOMULU_ARALIK);
      if (aile === 'igne') damgala(igneMaske, x, y, IGNE_ARALIK);
      kalan -= 1;
    }
  }
  return liste;
}

/**
 * (cx2, cy2) merkezine (iki katı hücre koordinatı) uzaklık karesi ≤ r2 (iki katı) olan,
 * AÇIKTAKİ (h ≤ z, taban değil) en yakın nesne; eşitlikte küçük hücre indeksi. Yoksa null.
 */
export function enYakinAcik(c, tarla, cx2, cy2, r2) {
  let en = null;
  for (const g of c.gomulu) {
    if (!tarladaMi(g)) continue;
    const i = (g.y | 0) * GENISLIK + (g.x | 0);
    if (tarla.h[i] > g.z || c.izgara.taban[i]) continue;
    const dx = 2 * (g.x | 0) + 1 - cx2;
    const dy = 2 * (g.y | 0) + 1 - cy2;
    const d = dx * dx + dy * dy;
    if (d <= r2 && (!en || d < en.d || (d === en.d && i < en.i))) en = { g, d, i };
  }
  return en?.g ?? null;
}

/** Sonradan nesne ekler (araba, öğretici); olay 'gomulu-eklendi' { nesneler }. */
export function gomuluEkle(c, nesneler, olay) {
  for (const g of nesneler) c.gomulu.push(g);
  olay('gomulu-eklendi', { nesneler });
}

/**
 * Açıkta kalma ve yuvarlanma (tik aşaması 65, her YUVARLANMA_TIK tikte): hücresinde h ≤ z
 * olan nesne açıktadır, z := h (üstte yatar). 4 komşudan (doğu, güney, batı, kuzey sırası)
 * en alçağı h ≤ hBurası − 2 ise oraya yuvarlanır (z := hKomşu). Parça tabanı duvardır.
 * Üstüne saman kayan nesne (h > z) gömülü kalır. Bir şey yuvarlandıysa sayısını döndürür.
 */
export function yuvarla(c, tarla) {
  const { h } = tarla;
  const { taban } = c.izgara;
  let n = 0;
  for (const g of c.gomulu) {
    if (!tarladaMi(g)) continue;
    const x = g.x | 0;
    const y = g.y | 0;
    const i = y * GENISLIK + x;
    if (h[i] > g.z || taban[i]) continue;
    g.z = h[i];
    let en = -1;
    const bak = (j) => {
      if (!taban[j] && h[j] <= h[i] - YUVARLANMA_FARK && (en < 0 || h[j] < h[en])) en = j;
    };
    if (x + 1 < GENISLIK) bak(i + 1);
    if (y + 1 < YUKSEKLIK) bak(i + GENISLIK);
    if (x > 0) bak(i - 1);
    if (y > 0) bak(i - GENISLIK);
    if (en < 0) continue;
    Object.assign(g, { x: en % GENISLIK, y: (en / GENISLIK) | 0, z: h[en] });
    n += 1;
  }
  return n;
}

asamaTanimla('yuvarlanma', 65, {
  adim(ctx) {
    if (ctx.tik % YUVARLANMA_TIK === 0) yuvarla(ctx.c, ctx.tarla);
  },
});
