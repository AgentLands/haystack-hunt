/**
 * HUD'un saf yardımcıları (DOM yok, Node'da test edilir): kuruş ve süre metinleri, hava
 * tahmini satırı (şimdi + sonraki 3 dilim) ve metinleri. Hava dunya/hava.js'ten (benzetimin
 * okuduğu havanın aynısı), sayılar kural modüllerinden okunur (TIK_MS, DILIM_TIK).
 */
import { TIK_MS } from '../../kural/ciftlik/olcu.js';
import { esyaTanimi } from '../../kural/ciftlik/esya.js';
import { DILIM_TIK, GOK, havaTahmini } from '../../kural/ciftlik/dunya/hava.js';

export { DILIM_TIK };
export const TAHMIN_DILIM = 3;
export const YON_AD = ['doğuya', 'güneye', 'batıya', 'kuzeye'];
export const SIDDET_AD = ['durgun', 'esinti', 'rüzgâr', 'sert rüzgâr'];
export const GOK_AD = { [GOK.GUNES]: 'güneşli', [GOK.BULUT]: 'bulutlu', [GOK.YAGMUR]: 'yağmurlu' };
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
 * Tahmin satırı: şimdiki dilim ve sonraki TAHMIN_DILIM dilim (dunya/hava.js havaTahmini).
 * Her öğe { dilim, kac (kaç dilim sonra), yon, siddet, gok, metin }.
 */
export function havaSatiri(c) {
  return havaTahmini(c, TAHMIN_DILIM).map((h, k) => {
    const ne = k === 0 ? 'Şimdi' : `${k} dk sonra`;
    return { ...h, kac: k, metin: `${ne}: ${havaMetni(h)}` };
  });
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
