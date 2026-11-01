/**
 * İşleme ve depo parçalarının okuduğu eşya özellikleri (docs/ciftlik/esyalar.md §1-2):
 * `ozellik(kod)` → { sinif, sert, nem, deger, manyetik, hafiflik, boyut, uzunluk, yogunluk }.
 * Tür kaydında alan varsa o kullanılır (esya.js tek kaynak); yoksa buradaki yedek tablo
 * (belgedeki satır). `degerliMi(kod)`: iğne ya da buluntu sınıfı (hiçbir yolla yok olmaz).
 *
 * SAP (esyalar.md §2 türleri): Faz 0 esya.js'te yalnız saman/iğne/çivi/buluntular var.
 * Eksik türler burada, YALNIZ tanımlı değilse kaydedilir (esya.js ya da D/E önce tanımlarsa
 * onlarınki geçerli). Belgedeki kod doluysa (Faz 0: iğne 2, çivi 3) yedek kod 400 + belge kodu
 * alınır. Kodlar ana ajanın birleştirmesinde esya.js'e taşınmalı (kayıt uyumu: tek tablo).
 */
import { esyaTanimla, esyaTanimi, SAMAN_TUTAM } from '../esya.js';
import { KATALOG } from '../../buluntu.js';

const T = SAMAN_TUTAM;
/** [anahtar, belge kodu, ad, renk, alanlar] — esyalar.md §2 tablosu. */
const SAP_TURLER = [
  ['yas-ot', 2, 'Yaş ot', '#7aa64a', { hafiflik: 0, boyut: 'iri', nem: 1, uzunluk: 'uzun',
    saman: T, deger: 0, sinif: 'saman' }],
  ['kuru-ot', 3, 'Kuru ot', '#c9b45a', { hafiflik: 1, boyut: 'iri', uzunluk: 'uzun', saman: T,
    deger: 3, sinif: 'saman' }],
  ['toz', 4, 'Toz ve kırıntı', '#a89a80', { hafiflik: 2, boyut: 'ince', uzunluk: 'kisa',
    saman: T, deger: 0, sinif: 'cop' }],
  ['kiyim', 5, 'Kıyım (yem)', '#d8b25a', { hafiflik: 1, boyut: 'ince', uzunluk: 'kisa',
    saman: T, deger: 2, sinif: 'urun' }],
  ['balya-saman', 6, 'Saman balyası', '#e0b03c', { boyut: 'iri', uzunluk: 'uzun',
    yogunluk: 1, saman: 8 * T, deger: 12, sinif: 'urun' }],
  ['balya-ot', 7, 'Ot balyası', '#9fb04a', { boyut: 'iri', uzunluk: 'uzun', yogunluk: 1,
    saman: 8 * T, deger: 30, sinif: 'urun' }],
  ['balya-karisik', 8, 'Karışık balya', '#a8905a', { boyut: 'iri', uzunluk: 'uzun',
    yogunluk: 1, saman: 8 * T, deger: 3, sinif: 'urun' }],
  ['curuk-ot', 9, 'Çürük ot', '#4f5a36', { boyut: 'iri', nem: 1, uzunluk: 'kisa', saman: T,
    deger: 0, sinif: 'cop' }],
  ['cuvaldiz', 11, 'Çuvaldız', '#9aa3ab', { boyut: 'iri', manyetik: true, sert: true,
    uzunluk: 'uzun', yogunluk: 2, deger: 400, sinif: 'igne', gomulu: true }],
  ['altin-igne', 12, 'Altın iğne', '#e8c547', { boyut: 'ince', sert: true, uzunluk: 'uzun',
    yogunluk: 2, deger: 1500, sinif: 'igne', gomulu: true }],
  ['tas', 14, 'Çakıl taşı', '#8c8a84', { boyut: 'iri', sert: true, uzunluk: 'kisa',
    yogunluk: 1, deger: 0, sinif: 'cop', gomulu: true }],
];
for (const [anahtar, kod, ad, renk, alan] of SAP_TURLER) {
  if (esyaTanimi(anahtar)) continue;
  const bos = !esyaTanimi(kod);
  esyaTanimla(anahtar, { kod: bos ? kod : 400 + kod, ad, renk, ...alan });
}

/** Faz 0 türlerinin eksik alanları (esyalar.md §2); esya.js tanımlarsa onunki geçer. */
const YEDEK = {
  saman: { hafiflik: 1, boyut: 'iri', uzunluk: 'uzun', deger: 1, sinif: 'saman' },
  igne: { boyut: 'ince', manyetik: true, sert: true, uzunluk: 'uzun', yogunluk: 2,
    deger: 250, sinif: 'igne' },
  civi: { boyut: 'iri', manyetik: true, sert: true, uzunluk: 'kisa', yogunluk: 2, deger: 0,
    sinif: 'metal' },
};
/** Buluntular: esyalar.md §2 (tür → [hafiflik, boyut, manyetik, sert, uzunluk, yoğunluk]). */
const BULUNTU = {
  dugme: [0, 'ince', 0, 1, 'kisa', 1], bilye: [0, 'ince', 0, 1, 'kisa', 1],
  kupe: [0, 'ince', 0, 1, 'kisa', 1], yuksek: [0, 'ince', 1, 1, 'kisa', 2],
  toka: [0, 'ince', 1, 1, 'uzun', 2], anahtar: [0, 'iri', 1, 1, 'uzun', 2],
  caki: [0, 'iri', 1, 1, 'uzun', 2], nal: [0, 'iri', 1, 1, 'kisa', 2],
  can: [0, 'iri', 1, 1, 'kisa', 2], kurus: [0, 'ince', 0, 1, 'kisa', 2],
  yuzuk: [0, 'ince', 0, 1, 'kisa', 2], kasik: [0, 'iri', 0, 1, 'uzun', 2],
  saat: [0, 'iri', 0, 1, 'kisa', 2], pusula: [0, 'iri', 0, 1, 'kisa', 2],
  oyuncak: [0, 'iri', 0, 1, 'kisa', 1], cingirak: [0, 'iri', 0, 1, 'kisa', 1],
  tarak: [0, 'iri', 0, 1, 'uzun', 1], tuy: [2, 'iri', 0, 0, 'uzun', 0],
  mektup: [2, 'iri', 0, 0, 'kisa', 0], yonca: [2, 'ince', 0, 0, 'kisa', 0],
};
/** Buluntu değeri nadirliğe göre (yalnız Defter masasında tam ödenir). */
export const BULUNTU_DEGER = { yaygin: 30, seyrek: 60, nadir: 120, cokNadir: 300 };
const NADIRLIK = new Map(KATALOG.map((b) => [b.tur, b.nadirlik]));

function buluntuYedek(tur) {
  const [hafiflik, boyut, m, s, uzunluk, yogunluk] = BULUNTU[tur] ?? [0, 'iri', 0, 1, 'kisa', 1];
  return { hafiflik, boyut, manyetik: m === 1, sert: s === 1, uzunluk, yogunluk,
    deger: BULUNTU_DEGER[NADIRLIK.get(tur)] ?? 30, sinif: 'buluntu' };
}

const VARSAYILAN = { sinif: 'cop', sert: false, nem: 0, deger: 0, manyetik: false,
  hafiflik: 0, boyut: 'iri', uzunluk: 'kisa', yogunluk: 0 };
const onbellek = new Map();

/** Türün işleme özellikleri (kayıttaki alan > yedek tablo > varsayılan). Bilinmeyen: çöp. */
export function ozellik(kod) {
  let o = onbellek.get(kod);
  if (o) return o;
  const t = esyaTanimi(kod);
  const yedek = !t ? {} : t.buluntu ? buluntuYedek(t.buluntu) : YEDEK[t.anahtar] ?? {};
  o = { ...VARSAYILAN, ...yedek };
  if (t) for (const ad of Object.keys(VARSAYILAN)) if (t[ad] !== undefined) o[ad] = t[ad];
  o = Object.freeze(o);
  onbellek.set(kod, o);
  return o;
}

/** İğne ya da buluntu mu? (hiçbir yolla yok olmaz; sink'te "bulundu" olur ya da iade) */
export function degerliMi(kod) {
  const s = ozellik(kod).sinif;
  return s === 'igne' || s === 'buluntu';
}
