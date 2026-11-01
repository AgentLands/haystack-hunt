/**
 * Kuruş (ekonomi.md §2): dünyanın ekonomi durumu `c.ekonomi` (dünya kaydına girer), parça
 * fiyatı ve söküm iadesi (%100), eşya değeri, "bulundu" ödemesi, kuruş kuyularının bedeli.
 *   c.ekonomi = { kurus, kazanc, harcama, pano: [kart|null ×3], gelis: [tik ×3],
 *     siparisSira, sonTur, fazlasiniSat, satilan, bosa, arabaSon, arabaIstek, cayirEk,
 *     pencere }   (pano: siparis.js, pencere: cevrimdisi.js)
 * İlk okumada (`ekonomiAl`) varsayılanla kurulur; yeni çiftlik `ekonomiBaslat` ile damga
 * kuruşunu alır. Kural: kuruş asla eksiye inmez; parça kurulumu ve kuyular peşin ödenir;
 * söküm o anki fiyatı iade eder (taşımak = sök + kur, bedava). kazanc/harcama soft-lock
 * denetimi içindir: her şey sökülünce kuruş = başlangıç + kazanc − harcama.
 */
import { esyaTanimi } from '../esya.js';
import { KATALOG } from '../../buluntu.js';
import {
  BASLANGIC_KURUS, PARCA_MALIYET, ESYA_DEGER, BULUNTU_DEGER, YARI_ODEME, PANO, KUYU,
  KUYU_TABAN, CEVRIMDISI,
} from './denge.js';
import { acikMi } from './acilis.js';
import { ilerlemeAl, ilerlemeBagla, yeniCiftlikKurusu } from './damga.js';

const NADIRLIK = Object.fromEntries(KATALOG.map((b) => [b.tur, b.nadirlik]));
const IGNE_AILESI = new Set(['igne', 'cuvaldiz', 'altin-igne']);

/** Boş çevrimdışı ölçüm penceresi: son pencereDk dakikanın kovaları (cevrimdisi.js). */
export function pencereBos() {
  return {
    dk: 0, kova: Array.from({ length: CEVRIMDISI.pencereDk }, () => ({ d: {}, s: 0 })),
  };
}

/** Yeni ekonomi durumu. */
export function ekonomiKur({ kurus = BASLANGIC_KURUS } = {}) {
  return {
    kurus, kazanc: 0, harcama: 0, pano: Array(PANO.kart).fill(null),
    gelis: Array(PANO.kart).fill(0), siparisSira: 0, sonTur: null, fazlasiniSat: true,
    satilan: 0, bosa: 0, arabaSon: null, arabaIstek: 0, cayirEk: 0, pencere: pencereBos(),
  };
}

/** Dünyanın ekonomisi (yoksa varsayılanla kurulur). */
export function ekonomiAl(c) {
  if (!c.ekonomi) c.ekonomi = ekonomiKur();
  return c.ekonomi;
}

/** Yeni çiftlik: ilerlemeyi bağlar, kuruşu 300 + 100 × damga yapar. */
export function ekonomiBaslat(c, ilerleme) {
  ilerlemeBagla(c, ilerleme);
  c.ekonomi = ekonomiKur({ kurus: yeniCiftlikKurusu(ilerleme) });
  return c.ekonomi;
}

/** Kayda girecek kopya (+ çevrimdışı saman kaynağı sayacı c.cevrimdisiKat). */
export function ekonomiKodla(c) {
  const e = JSON.parse(JSON.stringify(ekonomiAl(c)));
  return { ...e, cevrimdisiKat: c.cevrimdisiKat ?? 0 };
}

/** Kayıttan ekonomiyi kurar; bozuk veri hata verir. */
export function ekonomiCoz(c, veri) {
  const tamMi = (v) => Number.isInteger(v) && v >= 0;
  if (!veri || !tamMi(veri.kurus) || !Array.isArray(veri.pano)
    || veri.pano.length !== PANO.kart || !Array.isArray(veri.pencere?.kova)) {
    throw new Error('kayıt: ekonomi bozuk');
  }
  const { cevrimdisiKat = 0, ...e } = JSON.parse(JSON.stringify(veri));
  c.ekonomi = e;
  c.cevrimdisiKat = cevrimdisiKat;
  return e;
}

/** Parçanın kurulum fiyatı (kuruş). Tabloda yoksa 0 (test her parçanın satırını arar). */
export function parcaMaliyeti(anahtar) {
  return PARCA_MALIYET[anahtar] ?? 0;
}

/** Eşya anahtarının taban değeri (buluntu: nadirliğe göre). */
export function anahtarDegeri(anahtar) {
  if (anahtar.startsWith('buluntu:')) {
    return BULUNTU_DEGER[NADIRLIK[anahtar.slice(8)]] ?? 0;
  }
  return ESYA_DEGER[anahtar] ?? 0;
}

/** Eşya kodunun taban değeri (bilinmeyen kod 0). */
export function esyaDegeri(kod) {
  const t = esyaTanimi(kod);
  return t ? anahtarDegeri(t.anahtar) : 0;
}

/** İğne ailesi ya da buluntu mu? ('igne' | 'buluntu' | null) */
export function bulunurSinif(kod) {
  const t = esyaTanimi(kod);
  if (!t) return null;
  if (t.buluntu || t.anahtar.startsWith('buluntu:')) return 'buluntu';
  return IGNE_AILESI.has(t.anahtar) || t.sinif === 'igne' ? 'igne' : null;
}

/** Kuruş ekler (gelir). */
export function kurusEkle(c, n) {
  const e = ekonomiAl(c);
  e.kurus += n;
  e.kazanc += n;
}

/** Kuruş harcar (onarım, kuyu): yetmezse false, kuruş değişmez. */
export function kurusHarca(c, n) {
  const e = ekonomiAl(c);
  if (e.kurus < n) return false;
  e.kurus -= n;
  e.harcama += n;
  return true;
}

/** Kurulu parçaların iade değeri toplamı. */
export function parcaDegeri(c) {
  let s = 0;
  for (const p of c.parcalar.values()) s += parcaMaliyeti(p.tanim.anahtar);
  return s;
}

/**
 * Kurulum engeli: 'kilitli' | 'kurus' | null (bilinmeyen parça çekirdeğe kalır). Fiyat
 * tablosunda olmayan parça ekonomi dışıdır (yalnız testlerin 64000+ kodlu parçaları; her
 * kayıtlı oyun parçasının satırı olduğunu ciftlik-ekonomi testi denetler): kilitsiz, bedava.
 */
export function kurulumEngeli(c, anahtar) {
  if (!Object.hasOwn(PARCA_MALIYET, anahtar)) return null;
  if (!acikMi(anahtar, ilerlemeAl(c))) return 'kilitli';
  return ekonomiAl(c).kurus < parcaMaliyeti(anahtar) ? 'kurus' : null;
}

/** Kurulan parçanın bedelini öder (kurulumEngeli null iken çağrılır). */
export function kurulumOde(c, p) {
  ekonomiAl(c).kurus -= parcaMaliyeti(p.tanim.anahtar);
}

/** Sökülen parçanın bedelini iade eder (%100); iade edilen kuruşu döndürür. */
export function sokumIade(c, p) {
  const n = parcaMaliyeti(p.tanim.anahtar);
  ekonomiAl(c).kurus += n;
  return n;
}

/**
 * Kuruş kuyusu bedeli ve engeli: tur 'araba' | 'cayir'. Dönüş { bedel } ya da { neden }:
 * 'tavan' (çayır 3 kez), 'kurus', 'taban' (KUYU_TABAN). Çağrı aralığı ('erken'), yolda
 * araba, yer ve çayır sınırları dünyanın (dunya/araba.js, arazi.js) komutlarındadır.
 * seviye: çayırın kaçıncı genişletmesi (varsayılan: e.cayirEk).
 */
export function kuyuDenetle(c, tur, seviye = ekonomiAl(c).cayirEk) {
  const e = ekonomiAl(c);
  let bedel;
  if (tur === 'araba') {
    bedel = KUYU.araba.bedel;
  } else if (tur === 'cayir') {
    if (seviye >= KUYU.cayir.bedeller.length) return { neden: 'tavan' };
    bedel = KUYU.cayir.bedeller[seviye];
  } else {
    throw new Error(`kuyu: bilinmeyen tür ${tur}`);
  }
  if (e.kurus < bedel) return { neden: 'kurus' };
  if (e.kurus - bedel + parcaDegeri(c) < KUYU_TABAN) return { neden: 'taban' };
  return { bedel };
}

/**
 * Kuyu bedelini öder (dünyanın arabaCagir / cayirGenislet komutları çağırır): red nedeni
 * ya da null. Ödenince c.ekonomi'ye arabaSon/arabaIstek ya da cayirEk yazılır ve
 * olay('kuyu-kullanildi', { tur, bedel }) verilir.
 */
export function kuyuOde(c, tur, seviye, olay = null) {
  const s = kuyuDenetle(c, tur, seviye);
  if (s.neden) return s.neden;
  kurusHarca(c, s.bedel);
  const e = ekonomiAl(c);
  if (tur === 'araba') {
    e.arabaSon = c.tik;
    e.arabaIstek += 1;
  } else {
    e.cayirEk = seviye + 1;
  }
  olay?.('kuyu-kullanildi', { tur, bedel: s.bedel });
  return null;
}

/**
 * İğne ya da buluntu "bulundu" sayılır: kip 'tam' (Defter masası, elle, Boşalt, Temizle),
 * 'yari' (sandık/ambar girişi), 'kurussuz' (kapı/gübre iadesi, nadir sipariş). Defter ve
 * toplamlar her kipte yazılır. olay(ad, veri) verilirse 'ciftlik-bulundu' yayılır. Ödenen
 * kuruşu döndürür; iğne/buluntu değilse hata (yanlış çağrı sessiz geçmesin).
 */
export function bulundu(c, kod, kip, olay = null) {
  const sinif = bulunurSinif(kod);
  if (!sinif) throw new Error(`bulundu: ${kod} iğne ya da buluntu değil`);
  const deger = esyaDegeri(kod);
  let kurus = 0;
  if (kip === 'tam') kurus = deger;
  else if (kip === 'yari') kurus = Math.floor((deger * YARI_ODEME.pay) / YARI_ODEME.payda);
  else if (kip !== 'kurussuz') throw new Error(`bulundu: bilinmeyen kip ${kip}`);
  if (kurus) kurusEkle(c, kurus);
  const il = ilerlemeAl(c);
  il.toplam[sinif] += 1;
  if (sinif === 'buluntu') {
    const tur = esyaTanimi(kod).anahtar.replace(/^buluntu:/, '');
    il.defterCiftlik[tur] = (il.defterCiftlik[tur] ?? 0) + 1;
  }
  olay?.('ciftlik-bulundu', { kod, kip, kurus });
  return kurus;
}
