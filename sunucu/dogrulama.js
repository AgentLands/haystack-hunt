/**
 * İstemci iletilerini doğrulama: JSON çözme, tür/alan denetimi, ad ve oda kodu temizliği,
 * bağlantı başına hız sınırı (jeton kovası). Sunucu istemciye güvenir ama biçimsiz ya da
 * aşırı girdiyi odalara hiç ulaştırmaz.
 */
export const MAKS_METIN = 1024;
export const MAKS_AD = 16;
const MAKS_KOORDINAT = 4096;
const MAKS_SAMAN = 100_000_000;
const MAKS_SURE_MS = 24 * 60 * 60 * 1000;

/** Adı temizler: denetim/biçim karakterleri ve <> atılır, boşluklar tekleşir, ≤ 16 karakter. */
export function adTemizle(ham) {
  if (typeof ham !== 'string' || ham.length > 200) return null;
  const temiz = ham.normalize('NFC').replace(/[\p{C}<>]/gu, '').replace(/\s+/gu, ' ').trim();
  const kisa = [...temiz].slice(0, MAKS_AD).join('').trim();
  return kisa || null;
}

/** Oda kodu: 4 harf (büyük harfe çevrilir). Geçersizse null. */
export function kodTemizle(ham) {
  if (typeof ham !== 'string') return null;
  const kod = ham.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(kod) ? kod : null;
}

function tamSayi(deger, en, cok) {
  if (typeof deger !== 'number' || !Number.isFinite(deger)) return null;
  const n = Math.round(deger);
  return n >= en && n <= cok ? n : null;
}

const gecersiz = (neden) => ({ hata: neden });

const KALIPLAR = {
  kur(m) {
    const ad = adTemizle(m.ad);
    return ad ? { ileti: { t: 'kur', ad } } : gecersiz('Geçersiz ad');
  },
  katil(m) {
    const ad = adTemizle(m.ad);
    const oda = kodTemizle(m.oda);
    if (!ad) return gecersiz('Geçersiz ad');
    return oda ? { ileti: { t: 'katil', oda, ad } } : gecersiz('Oda kodu 4 harf olmalı');
  },
  baslat: () => ({ ileti: { t: 'baslat' } }),
  pes: () => ({ ileti: { t: 'pes' } }),
  ayril: () => ({ ileti: { t: 'ayril' } }),
  imlec(m) {
    const saman = tamSayi(m.saman, 0, MAKS_SAMAN);
    if (saman === null) return gecersiz('Geçersiz saman');
    if (m.x === null && m.y === null) return { ileti: { t: 'imlec', x: null, y: null, saman } };
    const x = tamSayi(m.x, 0, MAKS_KOORDINAT);
    const y = tamSayi(m.y, 0, MAKS_KOORDINAT);
    if (x === null || y === null) return gecersiz('Geçersiz imleç');
    return { ileti: { t: 'imlec', x, y, saman } };
  },
  bulundu(m) {
    const sureMs = tamSayi(m.sureMs, 0, MAKS_SURE_MS);
    const saman = tamSayi(m.saman, 0, MAKS_SAMAN);
    if (sureMs === null || saman === null) return gecersiz('Geçersiz sonuç');
    return { ileti: { t: 'bulundu', sureMs, saman } };
  },
};

/** Ham metni çözer: { ileti } (temizlenmiş, yalnız bilinen alanlar) ya da { hata }. */
export function iletiCoz(metin) {
  if (typeof metin !== 'string' || metin.length > MAKS_METIN) return gecersiz('İleti çok uzun');
  let m;
  try {
    m = JSON.parse(metin);
  } catch (hata) {
    return gecersiz(`JSON çözülemedi: ${hata.message}`);
  }
  if (!m || typeof m !== 'object' || Array.isArray(m)) return gecersiz('İleti nesne olmalı');
  if (typeof m.t !== 'string' || !Object.hasOwn(KALIPLAR, m.t)) {
    return gecersiz('Bilinmeyen ileti türü');
  }
  return KALIPLAR[m.t](m);
}

/** Jeton kovası: saniyede `dolum` ileti, en çok `kapasite` birikir. */
export class HizSiniri {
  constructor(kapasite = 30, dolum = 15, simdi = Date.now()) {
    this.kapasite = kapasite;
    this.dolum = dolum;
    this.jeton = kapasite;
    this.son = simdi;
  }

  izinVer(simdi = Date.now()) {
    this.jeton = Math.min(this.kapasite, this.jeton + ((simdi - this.son) / 1000) * this.dolum);
    this.son = simdi;
    if (this.jeton < 1) return false;
    this.jeton -= 1;
    return true;
  }
}
