/**
 * HUD'un saf yardımcıları (DOM yok, Node'da test edilir): kuruş ve süre metinleri, hava
 * tahmini satırı (şimdi + sonraki 3 dilim) ve metinleri. Hava işlevi dışarıdan verilir
 * (sap.js ya da D'nin kural modülü), sayılar kural modüllerinden okunur (TIK_MS).
 */
import { TIK_MS } from '../../kural/ciftlik/olcu.js';
import { esyaTanimi } from '../../kural/ciftlik/esya.js';

/** Hava dilimi (tik): 1 dk = 1200 tik (sistemler.md §3). */
export const DILIM_TIK = 60000 / TIK_MS;
export const TAHMIN_DILIM = 3;
export const YON_AD = ['doğuya', 'güneye', 'batıya', 'kuzeye'];
export const SIDDET_AD = ['durgun', 'esinti', 'rüzgâr', 'sert rüzgâr'];
export const GOK_AD = { gunesli: 'güneşli', bulutlu: 'bulutlu', yagmur: 'yağmurlu' };
const SAYI = new Intl.NumberFormat('tr-TR');

/** 1240 → "1.240". */
export const kurusMetni = (n) => SAYI.format(Math.max(0, Math.floor(n)));

/** Tik sayısını "m:ss" yapar (süreli sipariş kartı). */
export function tikSuresi(tik) {
  const s = Math.max(0, Math.ceil((tik * TIK_MS) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "3 sa 12 dk" / "45 dk" (çevrimdışı fişi). */
export function dakikaMetni(dk) {
  const d = Math.max(0, Math.round(dk));
  const sa = Math.floor(d / 60);
  if (!sa) return `${d} dk`;
  return d % 60 ? `${sa} sa ${d % 60} dk` : `${sa} sa`;
}

/** Bir hava dilimini ekran okuyucu ve ipucu için cümleye çevirir. */
export function havaMetni(h) {
  if (h.siddet === 0) return `${SIDDET_AD[0]}, ${GOK_AD[h.gok]}`;
  return `${SIDDET_AD[h.siddet]} ${YON_AD[h.yon]}, ${GOK_AD[h.gok]}`;
}

/**
 * Tahmin satırı: şimdiki dilim ve sonraki TAHMIN_DILIM dilim. hava(tohum, dilim) → { yon,
 * siddet, gok }. Her öğe { dilim, kaç (kaç dilim sonra), ...hava, metin }.
 */
export function havaSatiri(c, hava) {
  const simdi = Math.floor(c.tik / DILIM_TIK);
  const satir = [];
  for (let k = 0; k <= TAHMIN_DILIM; k++) {
    const h = hava(c.tohum, simdi + k);
    const ne = k === 0 ? 'Şimdi' : `${k} dk sonra`;
    satir.push({ dilim: simdi + k, kac: k, ...h, metin: `${ne}: ${havaMetni(h)}` });
  }
  return satir;
}

/** Hava satırlarının değişip değişmediğini anlamak için kısa anahtar. */
export const havaAnahtari = (satir) => satir.map((h) => `${h.yon}${h.siddet}${h.gok[0]}`).join('');

/** kazanc'tan eşya satırları [[ad, adet]] (adet > 0, ad sırasıyla). */
export function fisSatirlari(kazanc) {
  const esya = kazanc.esya ?? kazanc;
  return Object.entries(esya)
    .filter(([kod, n]) => /^\d+$/.test(kod) && n > 0)
    .map(([kod, n]) => [esyaTanimi(Number(kod))?.ad ?? `Eşya ${kod}`, n])
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'));
}
