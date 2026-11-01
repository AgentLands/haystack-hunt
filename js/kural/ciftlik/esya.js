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
 * Fizik eksenleri (docs/ciftlik/esyalar.md §1; ayıklayıcılar bunları okur, eşyanın bütün
 * davranışı türünün satırındadır): hafiflik 0 ağır | 1 hafif | 2 çok hafif; boyut 'ince' |
 * 'iri'; manyetik; nem 0 kuru | 1 nemli; sert; uzunluk 'kisa' | 'uzun'; yogunluk 0..2.
 * Ek: deger (Defter masası / Komşu kapısı kuruşu), sinif ('saman' | 'urun' | 'igne' |
 * 'metal' | 'cop' | 'buluntu'). Verilen değer geçersizse hata; verilmeyen varsayılan alır.
 */
import { KATALOG } from '../buluntu.js';

/** Bir saman tutamı kaç kat saman (toplayıcı bu kadar biriktirince bir eşya verir). */
export const SAMAN_TUTAM = 12;
/** Tür dizilerinin boyu (depolar Uint32Array(ESYA_KAP) sayaç tutar). */
export const ESYA_KAP = 512;

const adla = new Map();
const kodla = new Map();

/** Fizik ekseni alanlarının izinli değerleri (yazım hatası sessiz geçmesin). */
const IZINLI = {
  hafiflik: [0, 1, 2], boyut: ['ince', 'iri'], nem: [0, 1], uzunluk: ['kisa', 'uzun'],
  yogunluk: [0, 1, 2], manyetik: [true, false], sert: [true, false],
  sinif: ['saman', 'urun', 'igne', 'metal', 'cop', 'buluntu'],
};

/** Yeni eşya türü kaydeder; kod ya da ad çakışırsa hata. Kaydı döndürür. */
export function esyaTanimla(anahtar, tanim) {
  const { kod } = tanim;
  if (!Number.isInteger(kod) || kod < 1 || kod >= ESYA_KAP) {
    throw new Error(`esyaTanimla(${anahtar}): kod 1..${ESYA_KAP - 1} tam sayı olmalı`);
  }
  for (const [alan, izinli] of Object.entries(IZINLI)) {
    if (tanim[alan] !== undefined && !izinli.includes(tanim[alan])) {
      throw new Error(`esyaTanimla(${anahtar}): ${alan} = ${tanim[alan]} geçersiz`);
    }
  }
  if (adla.has(anahtar)) throw new Error(`esyaTanimla: "${anahtar}" zaten tanımlı`);
  if (kodla.has(kod)) throw new Error(`esyaTanimla(${anahtar}): kod ${kod} kullanılıyor`);
  const kayit = Object.freeze({
    agirlik: 1, saman: 0, renk: '#b9a27a', gomulu: false, ad: anahtar,
    hafiflik: 0, boyut: 'iri', manyetik: false, nem: 0, sert: false, uzunluk: 'kisa',
    yogunluk: 0, deger: 0, sinif: 'cop',
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

// --- İlk sürüm türleri (esyalar.md §2; kodlar sabit, yeniden kullanılmaz; 15-20 dalga 2) ---
const T = SAMAN_TUTAM;
esyaTanimla('saman', { kod: 1, ad: 'Saman tutamı', renk: '#e3b341', agirlik: 12, saman: T,
  hafiflik: 1, boyut: 'iri', uzunluk: 'uzun', deger: 1, sinif: 'saman' });
esyaTanimla('yas-ot', { kod: 2, ad: 'Yaş ot', renk: '#6f9a3c', agirlik: 12, saman: T,
  hafiflik: 0, boyut: 'iri', nem: 1, uzunluk: 'uzun', sinif: 'saman' });
esyaTanimla('kuru-ot', { kod: 3, ad: 'Kuru ot', renk: '#d9b44a', agirlik: 12, saman: T,
  hafiflik: 1, boyut: 'iri', uzunluk: 'uzun', deger: 3, sinif: 'saman' });
esyaTanimla('toz', { kod: 4, ad: 'Toz ve kırıntı', renk: '#cdbd9a', agirlik: 12, saman: T,
  hafiflik: 2, boyut: 'ince', sinif: 'cop' });
esyaTanimla('kiyim', { kod: 5, ad: 'Kıyım (yem)', renk: '#c98d3f', agirlik: 12, saman: T,
  hafiflik: 1, boyut: 'ince', deger: 2, sinif: 'urun' });
esyaTanimla('balya-saman', { kod: 6, ad: 'Saman balyası', renk: '#d4a73a', agirlik: 96,
  saman: 8 * T, boyut: 'iri', uzunluk: 'uzun', yogunluk: 1, deger: 12, sinif: 'urun' });
esyaTanimla('balya-ot', { kod: 7, ad: 'Ot balyası', renk: '#a8b94a', agirlik: 96,
  saman: 8 * T, boyut: 'iri', uzunluk: 'uzun', yogunluk: 1, deger: 30, sinif: 'urun' });
esyaTanimla('balya-karisik', { kod: 8, ad: 'Karışık balya', renk: '#b99a5a', agirlik: 96,
  saman: 8 * T, boyut: 'iri', uzunluk: 'uzun', yogunluk: 1, deger: 3, sinif: 'urun' });
esyaTanimla('curuk-ot', { kod: 9, ad: 'Çürük ot', renk: '#5a4a2a', agirlik: 12, saman: T,
  hafiflik: 0, boyut: 'iri', nem: 1, sinif: 'cop' });
// Metaller ve taş: gömülü gelir. İğne değeri yalnız Defter masasında ödenir.
esyaTanimla('igne', { kod: 10, ad: 'İğne', renk: '#c3cad1', agirlik: 1, gomulu: true,
  boyut: 'ince', manyetik: true, sert: true, uzunluk: 'uzun', yogunluk: 2, deger: 250,
  sinif: 'igne' });
esyaTanimla('cuvaldiz', { kod: 11, ad: 'Çuvaldız', renk: '#b0b8c0', agirlik: 2, gomulu: true,
  boyut: 'iri', manyetik: true, sert: true, uzunluk: 'uzun', yogunluk: 2, deger: 400,
  sinif: 'igne' });
esyaTanimla('altin-igne', { kod: 12, ad: 'Altın iğne', renk: '#f1c232', agirlik: 1,
  gomulu: true, boyut: 'ince', sert: true, uzunluk: 'uzun', yogunluk: 2, deger: 1500,
  sinif: 'igne' });
esyaTanimla('civi', { kod: 13, ad: 'Paslı çivi', renk: '#a0522d', agirlik: 2, gomulu: true,
  boyut: 'iri', manyetik: true, sert: true, uzunluk: 'kisa', yogunluk: 2, sinif: 'metal' });
esyaTanimla('tas', { kod: 14, ad: 'Çakıl taşı', renk: '#8a8780', agirlik: 4, gomulu: true,
  boyut: 'iri', sert: true, uzunluk: 'kisa', yogunluk: 1, sinif: 'cop' });

/**
 * Buluntular: 'buluntu:<tur>' (buluntu.js KATALOG). Kod 100 + katalog sırası DEĞİL: sabit
 * tablo; katalog sırası değişse de kayıtlar bozulmasın. Yeni buluntu tabloya eklenir.
 */
const BULUNTU_KOD = {
  dugme: 100, tuy: 101, yuksek: 102, bilye: 103, anahtar: 104, caki: 105, kurus: 106,
  nal: 107, toka: 108, mektup: 109, yonca: 110, can: 111, oyuncak: 112, kasik: 113,
  cingirak: 114, tarak: 115, pusula: 116, yuzuk: 117, kupe: 118, saat: 119,
};
/**
 * Buluntu fizik satırları (esyalar.md §2): [hafiflik, boyut, manyetik, sert, uzunluk, yogunluk].
 * Aynı satırı paylaşan türler iğne ailesinin ya da çöpün "taklitçisi"dir (toka iğneyle aynı
 * kaba yolda; yalnız tür filtresi ayırır). Her KATALOG türü bir satır taşımak zorundadır.
 */
const BULUNTU_OZELLIK = {
  dugme: [0, 'ince', false, true, 'kisa', 1], bilye: [0, 'ince', false, true, 'kisa', 1],
  kupe: [0, 'ince', false, true, 'kisa', 1], yuksek: [0, 'ince', true, true, 'kisa', 2],
  toka: [0, 'ince', true, true, 'uzun', 2], anahtar: [0, 'iri', true, true, 'uzun', 2],
  caki: [0, 'iri', true, true, 'uzun', 2], nal: [0, 'iri', true, true, 'kisa', 2],
  can: [0, 'iri', true, true, 'kisa', 2], kurus: [0, 'ince', false, true, 'kisa', 2],
  yuzuk: [0, 'ince', false, true, 'kisa', 2], kasik: [0, 'iri', false, true, 'uzun', 2],
  saat: [0, 'iri', false, true, 'kisa', 2], pusula: [0, 'iri', false, true, 'kisa', 2],
  oyuncak: [0, 'iri', false, true, 'kisa', 1], cingirak: [0, 'iri', false, true, 'kisa', 1],
  tarak: [0, 'iri', false, true, 'uzun', 1], tuy: [2, 'iri', false, false, 'uzun', 0],
  mektup: [2, 'iri', false, false, 'kisa', 0], yonca: [2, 'ince', false, false, 'kisa', 0],
};
/** Nadirliğe göre Defter masası değeri (kuruş). */
const BULUNTU_DEGER = { yaygin: 30, seyrek: 60, nadir: 120, cokNadir: 300 };

for (const b of KATALOG) {
  if (!BULUNTU_KOD[b.tur]) throw new Error(`Buluntu "${b.tur}" için eşya kodu yok (esya.js)`);
  const o = BULUNTU_OZELLIK[b.tur];
  if (!o) throw new Error(`Buluntu "${b.tur}" için fizik satırı yok (esya.js)`);
  const [hafiflik, boyut, manyetik, sert, uzunluk, yogunluk] = o;
  esyaTanimla(`buluntu:${b.tur}`, { kod: BULUNTU_KOD[b.tur], ad: b.ad, renk: '#8fb3c9',
    gomulu: true, buluntu: b.tur, hafiflik, boyut, manyetik, sert, uzunluk, yogunluk,
    deger: BULUNTU_DEGER[b.nadirlik], sinif: 'buluntu' });
}
