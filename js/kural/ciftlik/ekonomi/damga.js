/**
 * Kalıcı ilerleme ve damgalar (ekonomi.md §4-5). İlerleme dünyadan bağımsızdır
 * (`haystack-hunt:ciftlik-ilerleme`; depolama ozellik tarafında): damgalar (→ açık parçalar),
 * kilit kipi, araştırılan parçalar, toplamlar, çiftliğin kendi defter sayacı, ayarlar.
 *   { surum, kilit, damgalar: ['D1'...], arastirilan: [anahtar], rozetler: [],
 *     toplam: { igne, buluntu, siparis }, defterCiftlik: { tur: adet },
 *     ayarlar: { cevrimdisi, ortakDefter } }
 * Benzetim ilerlemeyi `c.ilerleme` üzerinden okur (numaralanmaz, dünya kaydına girmez):
 * oyun açılışta `ilerlemeBagla(c, il)` der; bağlanmamışsa ilk okumada varsayılan (damga kipi)
 * bağlanır. Damga kartı panonun 0. yuvasıdır; koşulu tutunca basılır (siparis.js).
 */
import { DAMGALAR, BASLANGIC_KURUS, YENI_CIFTLIK_DAMGA_KURUS, SIPARIS } from './denge.js';
import { KILIT_KIPLERI, damganinAcdiklari } from './acilis.js';

export const ILERLEME_SURUM = 1;
/** İlk sürümde basılabilen damgalar (dalga 2 hariç), sırayla. */
export const ILK_DAMGALAR = Object.freeze(DAMGALAR.filter((d) => !d.dalga));

/** Yeni ilerleme. kilit: 'damga' | 'arastirma' | 'acik'. */
export function ilerlemeKur({ kilit = 'damga' } = {}) {
  if (!KILIT_KIPLERI.includes(kilit)) throw new Error(`ilerleme: bilinmeyen kilit ${kilit}`);
  return {
    surum: ILERLEME_SURUM, kilit, damgalar: [], arastirilan: [], rozetler: [],
    toplam: { igne: 0, buluntu: 0, siparis: 0 }, defterCiftlik: {},
    ayarlar: { cevrimdisi: true, ortakDefter: true },
  };
}

/** İlerlemeyi dünyaya bağlar (numaralanmaz; dunyaKodla'ya girmez). */
export function ilerlemeBagla(c, ilerleme) {
  Object.defineProperty(c, 'ilerleme', {
    value: ilerleme, enumerable: false, writable: true, configurable: true,
  });
  return ilerleme;
}

/** Dünyanın ilerlemesi; bağlanmamışsa varsayılanı bağlar. */
export function ilerlemeAl(c) {
  return c.ilerleme ?? ilerlemeBagla(c, ilerlemeKur());
}

/** JSON'lanabilir kopya. */
export function ilerlemeKodla(il) {
  return JSON.parse(JSON.stringify(il));
}

const diziMi = (x) => Array.isArray(x) && x.every((s) => typeof s === 'string');

/** Kayıttan ilerleme; bozuk ya da tanınmayan veri hata verir (çağıran yenisini kurar). */
export function ilerlemeCoz(veri) {
  if (!veri || typeof veri !== 'object' || veri.surum !== ILERLEME_SURUM) {
    throw new Error('ilerleme: sürüm yok ya da tanınmıyor');
  }
  const il = ilerlemeKur({ kilit: veri.kilit });
  for (const ad of ['damgalar', 'arastirilan', 'rozetler']) {
    if (!diziMi(veri[ad])) throw new Error(`ilerleme: ${ad} bozuk`);
    il[ad] = [...veri[ad]];
  }
  const sayilar = (o, ad) => {
    if (!o || typeof o !== 'object') throw new Error(`ilerleme: ${ad} bozuk`);
    for (const [k, v] of Object.entries(o)) {
      if (!Number.isInteger(v) || v < 0) throw new Error(`ilerleme: ${ad}.${k} bozuk`);
    }
    return { ...o };
  };
  il.toplam = { ...il.toplam, ...sayilar(veri.toplam, 'toplam') };
  il.defterCiftlik = sayilar(veri.defterCiftlik, 'defterCiftlik');
  il.ayarlar = { ...il.ayarlar, ...veri.ayarlar };
  return il;
}

/** Sıradaki (basılmamış ilk) damga; hepsi bittiyse null. */
export function siradakiDamga(ilerleme) {
  return ILK_DAMGALAR.find((d) => !ilerleme.damgalar.includes(d.id)) ?? null;
}

/** Damganın numarası ('D4' → 4). */
export const damgaNo = (id) => Number(id.slice(1));

/** Sipariş boyundaki d: etkin damganın numarası (D2 iken 2); hepsi bittiyse dTavan. */
export function etkinDamgaNo(ilerleme) {
  const d = siradakiDamga(ilerleme);
  return Math.min(SIPARIS.dTavan, d ? damgaNo(d.id) : SIPARIS.dTavan);
}

/** Damga siparişi kartı (pano yuvası 0). */
export function damgaKarti(damga) {
  return {
    tur: 'damga', damga: damga.id, ad: damga.ad, odul: damga.odul,
    civisiz: Boolean(damga.civisiz),
    kalemler: damga.kalemler.map((k) => (k.durum ? { durum: k.durum, miktar: k.miktar }
      : { kabul: [...k.kabul], miktar: k.miktar, teslim: 0 })),
  };
}

/** Kalemin şimdiki değeri: teslim sayısı ya da durum sayacı (ilerlemeden). */
export function kalemDegeri(kalem, ilerleme) {
  if (kalem.durum === 'igne') return ilerleme.toplam.igne;
  if (kalem.durum === 'buluntuTuru') return Object.keys(ilerleme.defterCiftlik).length;
  if (kalem.durum) throw new Error(`damga: bilinmeyen durum kalemi ${kalem.durum}`);
  return kalem.teslim;
}

/** Kartın bütün kalemleri tuttu mu? */
export function kartTamam(kart, ilerleme) {
  return kart.kalemler.every((k) => kalemDegeri(k, ilerleme) >= k.miktar);
}

/**
 * Damgayı basar (kuruşu çağıran ekler). Dönüş { acilanlar }: damga kipinde açılan parçalar,
 * diğer kiplerde boş (araştırma kipinde damga yalnız kuruş verir).
 */
export function damgaBas(ilerleme, id) {
  if (ilerleme.damgalar.includes(id)) return { acilanlar: [] };
  ilerleme.damgalar.push(id);
  return { acilanlar: ilerleme.kilit === 'damga' ? damganinAcdiklari(id) : [] };
}

/** "Yeni çiftlik" kuruşu: 300 + 100 × basılmış damga (damgalar ve açık parçalar kalır). */
export function yeniCiftlikKurusu(ilerleme) {
  return BASLANGIC_KURUS + YENI_CIFTLIK_DAMGA_KURUS * ilerleme.damgalar.length;
}
