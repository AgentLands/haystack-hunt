/**
 * Şablon deposu: 10 yuva (dünyalar arası, dünya kaydında DEĞİL) + hazır şablonlar ("Önerilen
 * ilk hat"; yuvaya girmez). Her yuva sağlamalı metin kodu olarak saklanır (kural/ciftlik/
 * izgara/sablon-kod.js): okuma sırasında her kod yeniden doğrulanır, bozuk yuva boş sayılır
 * (kayıt asla bozulmaz, hata günlüğe yazılır). Dışa/içe aktarma de aynı metin kodudur.
 * SAP: depolama şimdilik kendi anahtarında (haystack-hunt:ciftlik-sablonlar); ekonomi/ilerleme
 * kaydı (`haystack-hunt:ciftlik-ilerleme`) hazır olunca sablonDeposuKur({ oku, yaz }) ile oraya
 * bağlanır (oku → 10 kodluk dizi, yaz(dizi)). Hazır şablon öğretici sonrası açılır: sablonBaglam.
 */
import { sablonKodla, sablonCoz, SABLON_AD_EN_COK } from '../../kural/ciftlik/izgara/sablon-kod.js';
import { hazirSablonlar } from '../../kural/ciftlik/izgara/yapistir.js';
import { kumeDogrula } from '../../kural/ciftlik/izgara/kume.js';

export const SABLON_YUVA = 10;
const ANAHTAR = 'haystack-hunt:ciftlik-sablonlar';

/** SAP: öğretici (J) bitince hazirAcik gerçek durumu okur. */
export const sablonBaglam = { hazirAcik: () => true };

const varsayilanDepo = {
  oku() {
    try {
      const metin = localStorage.getItem(ANAHTAR);
      return metin ? JSON.parse(metin) : [];
    } catch (hata) {
      console.error('Şablonlar okunamadı:', hata);
      return [];
    }
  },
  yaz(dizi) {
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify(dizi));
      return true;
    } catch (hata) {
      console.error('Şablonlar yazılamadı:', hata);
      return false;
    }
  },
};
let depo = varsayilanDepo;

/** Depoyu değiştirir (ilerleme kaydına bağlama). */
export function sablonDeposuKur(yeni) {
  depo = yeni;
}

function kodlar() {
  const ham = depo.oku();
  return Array.from({ length: SABLON_YUVA },
    (_, i) => (typeof ham[i] === 'string' ? ham[i] : null));
}

/** 10 yuva: { ad, kume } ya da null (boş / bozuk). */
export function sablonlariOku() {
  return kodlar().map((kod, i) => {
    if (!kod) return null;
    const s = sablonCoz(kod);
    if (s.hata) {
      console.error(`Şablon yuvası ${i + 1} bozuk, boş sayıldı:`, s.hata);
      return null;
    }
    return s.sablon;
  });
}

/** Hazır şablonlar (öğretici bitmediyse boş). */
export function hazirlariOku() {
  return sablonBaglam.hazirAcik() ? hazirSablonlar() : [];
}

/** Yuvaya kaydeder; true/false (depo yazamadıysa false). */
export function sablonKaydet(yuva, ad, kume) {
  if (!(yuva >= 0 && yuva < SABLON_YUVA) || kumeDogrula(kume)) return false;
  const dizi = kodlar();
  const temiz = String(ad).trim().slice(0, SABLON_AD_EN_COK) || `Şablon ${yuva + 1}`;
  dizi[yuva] = sablonKodla({ ad: temiz, kume });
  return depo.yaz(dizi);
}

export function sablonSil(yuva) {
  const dizi = kodlar();
  dizi[yuva] = null;
  return depo.yaz(dizi);
}

/** Yuvanın metin kodu (dışa aktarma); boşsa null. */
export const sablonKodu = (yuva) => kodlar()[yuva];

/** Metin kodunu ilk boş yuvaya (ya da verilene) alır: { yuva } ya da { hata }. */
export function sablonIceAktar(metin, yuva = null) {
  const s = sablonCoz(metin);
  if (s.hata) return { hata: s.hata };
  const bos = yuva ?? kodlar().findIndex((k) => !k);
  if (bos < 0) return { hata: 'Boş yuva yok: önce birini sil ya da yuva seç' };
  return sablonKaydet(bos, s.sablon.ad, s.sablon.kume)
    ? { yuva: bos } : { hata: 'Kaydedilemedi (depolama dolu ya da kapalı)' };
}
