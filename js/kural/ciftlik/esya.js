/**
 * Eşya kaydı: bantlarda ve tamponlarda taşınan her şeyin türü. Eşyanın kimliği yoktur,
 * yalnız türü (Uint16 kod) vardır. Kod kayıtta saklanır: bir kod HİÇ yeniden kullanılmaz,
 * silinen türün kodu boş kalır. `esyaTanimla(ad, tanim)` genişletilebilir: bilinmeyen
 * alanlar (ör. Faz 1'de `yakit`, `yem`) olduğu gibi saklanır.
 *   kod     1..65535, benzersiz (zorunlu)
 *   ad      görünen ad (Türkçe; varsayılan anahtar)
 *   renk    uzak görünüm / yedek çizim rengi
 *   agirlik kantar ve kollar için tam sayı (varsayılan 1)
 *   saman   içerdiği saman katı (saman korunumu; varsayılan 0)
 *   gomulu  true: tarlaya gömülü nesneden çıkar (iğne, çivi, buluntu)
 */
import { KATALOG } from '../buluntu.js';

/** Bir saman tutamı kaç kat saman (toplayıcı bu kadar biriktirince bir eşya verir). */
export const SAMAN_TUTAM = 12;
/** Tür dizilerinin boyu (depolar Uint32Array(ESYA_KAP) sayaç tutar). */
export const ESYA_KAP = 512;

const adla = new Map();
const kodla = new Map();

/** Yeni eşya türü kaydeder; kod ya da ad çakışırsa hata. Kaydı döndürür. */
export function esyaTanimla(anahtar, tanim) {
  const { kod } = tanim;
  if (!Number.isInteger(kod) || kod < 1 || kod >= ESYA_KAP) {
    throw new Error(`esyaTanimla(${anahtar}): kod 1..${ESYA_KAP - 1} tam sayı olmalı`);
  }
  if (adla.has(anahtar)) throw new Error(`esyaTanimla: "${anahtar}" zaten tanımlı`);
  if (kodla.has(kod)) throw new Error(`esyaTanimla(${anahtar}): kod ${kod} kullanılıyor`);
  const kayit = Object.freeze({
    agirlik: 1, saman: 0, renk: '#b9a27a', gomulu: false, ad: anahtar,
    ...tanim, anahtar,
  });
  adla.set(anahtar, kayit);
  kodla.set(kod, kayit);
  return kayit;
}

/** Ad ya da koddan tür kaydı; bilinmeyen için null. */
export function esyaTanimi(adVeyaKod) {
  return (typeof adVeyaKod === 'number' ? kodla.get(adVeyaKod) : adla.get(adVeyaKod)) || null;
}

/** Adın kodu; bilinmeyen ad hata verir (yazım hatası sessiz geçmesin). */
export function esyaKodu(anahtar) {
  const k = adla.get(anahtar);
  if (!k) throw new Error(`Bilinmeyen eşya: ${anahtar}`);
  return k.kod;
}

/** Kayıtlı bütün türler (kod sırasıyla). */
export function esyaTurleri() {
  return [...kodla.values()].sort((a, b) => a.kod - b.kod);
}

/** Bir türün içerdiği saman katı (korunum hesabı). */
export function esyaSamani(kod) {
  return kodla.get(kod)?.saman ?? 0;
}

// --- Temel türler (kodlar sabit; yeniden kullanılmaz) ---
esyaTanimla('saman', { kod: 1, ad: 'Saman tutamı', renk: '#e3b341', agirlik: 12,
  saman: SAMAN_TUTAM });
esyaTanimla('igne', { kod: 2, ad: 'İğne', renk: '#c3cad1', agirlik: 1, gomulu: true });
esyaTanimla('civi', { kod: 3, ad: 'Paslı çivi', renk: '#a0522d', agirlik: 2, gomulu: true });

/**
 * Buluntular: 'buluntu:<tur>' (buluntu.js KATALOG). Kod 100 + katalog sırası DEĞİL: sabit
 * tablo; katalog sırası değişse de kayıtlar bozulmasın. Yeni buluntu tabloya eklenir.
 */
const BULUNTU_KOD = {
  dugme: 100, tuy: 101, yuksek: 102, bilye: 103, anahtar: 104, caki: 105, kurus: 106,
  nal: 107, toka: 108, mektup: 109, yonca: 110, can: 111, oyuncak: 112, kasik: 113,
  cingirak: 114, tarak: 115, pusula: 116, yuzuk: 117, kupe: 118, saat: 119,
};
for (const b of KATALOG) {
  if (!BULUNTU_KOD[b.tur]) throw new Error(`Buluntu "${b.tur}" için eşya kodu yok (esya.js)`);
  esyaTanimla(`buluntu:${b.tur}`, { kod: BULUNTU_KOD[b.tur], ad: b.ad, renk: '#8fb3c9',
    gomulu: true, buluntu: b.tur });
}
