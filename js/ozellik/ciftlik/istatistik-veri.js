/**
 * Çiftlik istatistiğinin saf verisi (DOM yok): saniyelik 'ciftlik-ozet' olaylarından son 60
 * saniyenin eşya başına hızını (eşya/dk) ve son 10 dakikanın dakika dakika toplamlarını
 * tutar. Kaynak sayaçlar { uretilen, depolanan, teslim, bosa... } (ctx.sayac adları) ve
 * kuruş. Eşya başına olay yoktur; yalnız bu özetler birikir (arayuz.md §8).
 */
import { DILIM_TIK } from './hud-veri.js';

/** Hız penceresi (saniye) ve grafik uzunluğu (dakika). */
export const HIZ_PENCERE = 60;
export const DAKIKA_N = 10;
const SAYAC_ADLARI = ['uretilen', 'depolanan', 'teslim', 'bosa'];

export function istatistikKur() {
  return { saniyeler: [], dakikalar: [], sonKurus: null, kazanc: [] };
}

/** Kovadaki ad → { kod: n } sayılarına n ekler. */
function ekle(hedef, say) {
  for (const [ad, kodlar] of Object.entries(say)) {
    const h = (hedef[ad] ??= {});
    for (const [kod, n] of Object.entries(kodlar)) h[kod] = (h[kod] ?? 0) + n;
  }
}

/**
 * Bir özet olayını işler. veri: { tik, [sayaç adı]: { kod: n } }; kurus: o andaki kuruş.
 * Pozitif kuruş farkları "kazanç" sayılır (harcama sayılmaz).
 */
export function ozetEkle(ist, veri, kurus) {
  const say = {};
  for (const ad of SAYAC_ADLARI) if (veri[ad]) say[ad] = veri[ad];
  ist.saniyeler.push(say);
  if (ist.saniyeler.length > HIZ_PENCERE) ist.saniyeler.shift();
  const dakika = Math.floor(veri.tik / DILIM_TIK);
  let son = ist.dakikalar.at(-1);
  if (!son || son.dakika !== dakika) {
    son = { dakika, say: {}, kazanc: 0 };
    ist.dakikalar.push(son);
    if (ist.dakikalar.length > DAKIKA_N) ist.dakikalar.shift();
  }
  ekle(son.say, say);
  if (ist.sonKurus !== null && kurus > ist.sonKurus) son.kazanc += kurus - ist.sonKurus;
  ist.sonKurus = kurus;
}

/** Son penceredeki toplam → dakikadaki hız: ad ('uretilen'...) için { kod: eşya/dk }. */
export function hizlar(ist, ad) {
  const toplam = {};
  for (const s of ist.saniyeler) {
    for (const [kod, n] of Object.entries(s[ad] ?? {})) toplam[kod] = (toplam[kod] ?? 0) + n;
  }
  const carpan = 60 / Math.max(1, ist.saniyeler.length);
  const hiz = {};
  for (const [kod, n] of Object.entries(toplam)) hiz[kod] = Math.round(n * carpan * 10) / 10;
  return hiz;
}

/** Sayaç adının son 10 dakikadaki dakika dakika toplam adedi (grafik): [n, n, ...]. */
export function dakikaSerisi(ist, ad) {
  return ist.dakikalar.map((d) => Object.values(d.say[ad] ?? {}).reduce((a, b) => a + b, 0));
}

/** Son 10 dakikadaki toplam kuruş kazancı ve dakikadaki ortalaması. */
export function kurusOzeti(ist) {
  const toplam = ist.dakikalar.reduce((a, d) => a + d.kazanc, 0);
  return { toplam, dakikada: Math.round(toplam / Math.max(1, ist.dakikalar.length)) };
}

/** Hız tablosundaki toplam (eşya/dk). */
export const hizToplami = (hiz) => Object.values(hiz).reduce((a, b) => a + b, 0);
