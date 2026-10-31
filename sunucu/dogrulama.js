/**
 * İstemci iletilerini doğrulama: JSON çözme, tür/alan denetimi, ad ve oda kodu temizliği,
 * bağlantı başına hız sınırı (jeton kovası). Sunucu istemciye güvenir ama biçimsiz ya da
 * aşırı girdiyi odalara hiç ulaştırmaz. Konum ('imlec') iletisi çiftçinin yürüyüş/makine
 * durumunu da taşır; alanlar sınırlanır, eksik isteğe bağlı alanlar varsayılana düşer.
 */
export const MAKS_METIN = 1024;
export const MAKS_AD = 16;
/** Çiftçi/makine konumu (dünya birimi, tarla 240×160); tarlanın dışına taşan değer reddedilir. */
const MAKS_KOORDINAT = 1024;
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

/** Kayan noktayı `basamak` ondalığa yuvarlar; sayı değilse ya da aralık dışıysa null. */
function kesir(deger, en, cok, basamak = 2) {
  if (typeof deger !== 'number' || !Number.isFinite(deger)) return null;
  const k = 10 ** basamak;
  const n = Math.round(deger * k) / k;
  return n >= en && n <= cok ? n : null;
}

/** Açıyı (radyan) (-π, π] aralığına sarar ve 2 ondalığa yuvarlar; geçersizse null. */
function aci(deger) {
  if (typeof deger !== 'number' || !Number.isFinite(deger) || Math.abs(deger) > 1000) return null;
  return Math.round(Math.atan2(Math.sin(deger), Math.cos(deger)) * 100) / 100;
}

const gecersiz = (neden) => ({ hata: neden });

export const ARACLAR = ['el', 'tirmik', 'dedektor', 'miknatis'];
export const MAKINE_TURLERI = ['traktor', 'balya', 'ufleyici'];

/** Bindiği makine: null/yoksa null; { tur, yon, yuk? } ise temizlenmiş hâli; bozuksa undefined. */
function makineTemizle(m) {
  if (m === undefined || m === null) return null;
  if (typeof m !== 'object' || Array.isArray(m)) return undefined;
  const yon = aci(m.yon);
  if (!MAKINE_TURLERI.includes(m.tur) || yon === null) return undefined;
  if (m.yuk === undefined) return { tur: m.tur, yon };
  const yuk = kesir(m.yuk, 0, 1);
  return yuk === null ? undefined : { tur: m.tur, yon, yuk };
}

/** İsteğe bağlı mantıksal alan: yoksa varsayılan, bool değilse undefined. */
const mantik = (deger, varsayilan = false) => (deger === undefined ? varsayilan
  : typeof deger === 'boolean' ? deger : undefined);

/** Yarışın tarlası kurucunun zorluğuyla açılır (js/kural/zorluk.js anahtarları). */
const ZORLUKLAR = ['kolay', 'normal', 'zor'];

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
  baslat: (m) => ({
    ileti: { t: 'baslat', zorluk: ZORLUKLAR.includes(m.zorluk) ? m.zorluk : 'normal' },
  }),
  pes: () => ({ ileti: { t: 'pes' } }),
  ayril: () => ({ ileti: { t: 'ayril' } }),
  imlec(m) {
    const saman = tamSayi(m.saman, 0, MAKS_SAMAN);
    if (saman === null) return gecersiz('Geçersiz saman');
    if (m.x === null && m.y === null) return { ileti: { t: 'imlec', x: null, y: null, saman } };
    const x = kesir(m.x, 0, MAKS_KOORDINAT);
    const y = kesir(m.y, 0, MAKS_KOORDINAT);
    if (x === null || y === null) return gecersiz('Geçersiz konum');
    const yon = m.yon === undefined ? 0 : aci(m.yon);
    const hareketli = mantik(m.hareketli);
    const kullan = mantik(m.kullan);
    const arac = m.arac === undefined ? 'el' : m.arac;
    const makine = makineTemizle(m.makine);
    if (yon === null || hareketli === undefined || kullan === undefined
      || !ARACLAR.includes(arac) || makine === undefined) return gecersiz('Geçersiz konum');
    return { ileti: { t: 'imlec', x, y, yon, hareketli, arac, makine, kullan, saman } };
  },
  bulundu(m) {
    const sureMs = tamSayi(m.sureMs, 0, MAKS_SURE_MS);
    const saman = tamSayi(m.saman, 0, MAKS_SAMAN);
    const cezaMs = m.cezaMs === undefined ? 0 : tamSayi(m.cezaMs, 0, MAKS_SURE_MS);
    if (sureMs === null || saman === null || cezaMs === null) return gecersiz('Geçersiz sonuç');
    return { ileti: { t: 'bulundu', sureMs, cezaMs, saman } };
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

/** Aşım sayacı saniyede bu kadar azalır: seyrek patlama atmaz, süren taşkın atar. */
export const ASIM_AZALMA = 5;

/**
 * Jeton kovası: saniyede `dolum` ileti, en çok `kapasite` birikir. Reddedilen iletiler
 * `asimEkle` ile sayılır; sayaç zamanla azalır (bağlantı ömrü boyunca birikmez).
 */
export class HizSiniri {
  constructor(kapasite = 30, dolum = 15, simdi = Date.now()) {
    this.kapasite = kapasite;
    this.dolum = dolum;
    this.jeton = kapasite;
    this.son = simdi;
    this.asim = 0;
    this.asimSon = simdi;
  }

  /** Reddedilen bir iletiyi sayar; azalmış güncel aşım sayacını döndürür. */
  asimEkle(simdi = Date.now()) {
    const azalan = ((simdi - this.asimSon) / 1000) * ASIM_AZALMA;
    this.asim = Math.max(0, this.asim - azalan) + 1;
    this.asimSon = simdi;
    return this.asim;
  }

  izinVer(simdi = Date.now()) {
    this.jeton = Math.min(this.kapasite, this.jeton + ((simdi - this.son) / 1000) * this.dolum);
    this.son = simdi;
    if (this.jeton < 1) return false;
    this.jeton -= 1;
    return true;
  }
}
