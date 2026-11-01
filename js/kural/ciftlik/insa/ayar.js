/**
 * Parça ayar şemalarının ortak okuyucusu (saf): inceleme paneli, pipet, geri al ve tek 'ayar'
 * komutu (isleme/komutlar.js) buradan okur. Tanım ayarlarını iki biçimde bildirebilir:
 *   nesne (aileler):  ayarlar: { kip: { tur: 'iki' | 'secim' | 'renk' | 'filtre' | 'eylem',
 *                       secenekler: [deger | [deger, metin]], etiket?, yok? (renk -1),
 *                       manyetik? (filtre), degisti?, uygula? (eylem) } }
 *                     (ag/ayar.js ayarUygula doğrular ve yazar; tur yoksa seçimdir)
 *   dizi:             ayarlar: [{ ad, tur, etiket, secenekler: [{ deger, metin }] | (tanim)
 *                       → aynı dizi, varsayilan }]  (değer p.ozel[ad]'a yazılır)
 *   ayarOku(p, ad) → değer, ayarla(p, ad, deger, { c, tarla }) → false ise red (isteğe bağlı)
 * Hepsi tek biçime çevrilir: [{ ad, tur, etiket, secenekler: [{ deger, metin }], varsayilan,
 * nesne }]. Filtre değerleri nesnedir ({ tur: 'hepsi' | 'esya' kod | 'sinif' sinif |
 * 'manyetik' }); karşılaştırma ayarAnahtari ile yapılır.
 */
import { esyaTurleri } from '../esya.js';
import { SINIFLAR, renkAdi } from '../ag/ayar.js';
import { RENK_SAYISI } from '../ag/sinyal.js';

const SINIF_AD = { saman: 'Saman', urun: 'Ürün', igne: 'İğne', metal: 'Metal', cop: 'Çöp',
  buluntu: 'Buluntu' };

/** Değerin karşılaştırma anahtarı (filtre nesneleri JSON'la). */
export const ayarAnahtari = (d) => (d !== null && typeof d === 'object'
  ? JSON.stringify(d) : String(d));

/** Filtre seçenekleri: hepsi, sınıflar, (manyetik), buluntu dışı eşya türleri. */
function filtreSecenekleri(manyetik) {
  const liste = [{ deger: { tur: 'hepsi' }, metin: 'Hepsi' }];
  for (const s of SINIFLAR) liste.push({ deger: { tur: 'sinif', sinif: s }, metin: SINIF_AD[s] });
  if (manyetik) liste.push({ deger: { tur: 'manyetik' }, metin: 'Manyetik' });
  for (const t of esyaTurleri()) {
    if (!t.buluntu && !t.anahtar.startsWith('buluntu:')) {
      liste.push({ deger: { tur: 'esya', kod: t.kod }, metin: t.ad });
    }
  }
  return liste;
}

const secenekNormal = (s) => {
  if (Array.isArray(s)) return { deger: s[0], metin: s[1] ?? String(s[0]) };
  return typeof s === 'object' && s !== null ? s : { deger: s, metin: String(s) };
};

/** Nesne biçimli bir şemayı ortak biçime çevirir. */
function nesneSemasi(ad, s) {
  const secim = s.secenekler ?? s.secim ?? [];
  const tur = s.tur ?? (secim.length === 2 ? 'iki' : 'secim');
  let liste;
  if (tur === 'renk') {
    liste = Array.from({ length: RENK_SAYISI + (s.yok ? 1 : 0) }, (_, i) => i - (s.yok ? 1 : 0))
      .map((r) => ({ deger: r, metin: renkAdi(r) }));
  } else if (tur === 'filtre') {
    liste = filtreSecenekleri(Boolean(s.manyetik));
  } else if (tur === 'eylem') {
    liste = [{ deger: true, metin: s.etiket ?? 'Uygula' }];
  } else {
    liste = secim.map(secenekNormal);
  }
  const etiket = s.etiket ?? (typeof s.ad === 'string' ? s.ad : ad);
  return { ad, tur, etiket, secenekler: liste, varsayilan: s.varsayilan, nesne: true };
}

const onbellek = new WeakMap();

/** Tanımın ayar şemaları (ortak biçim; yoksa boş dizi). */
export function ayarSemalari(tanim) {
  if (!tanim.ayarlar) return [];
  let liste = onbellek.get(tanim);
  if (!liste) {
    liste = Array.isArray(tanim.ayarlar) ? tanim.ayarlar.map((s) => ({ ...s }))
      : Object.entries(tanim.ayarlar).map(([ad, s]) => nesneSemasi(ad, s));
    onbellek.set(tanim, liste);
  }
  return liste;
}

/** Şemanın seçenekleri: [{ deger, metin }] (işlevse tanımla çağrılır). */
export function secenekler(tanim, sema) {
  const liste = typeof sema.secenekler === 'function' ? sema.secenekler(tanim) : sema.secenekler;
  return (liste ?? []).map(secenekNormal);
}

/** Parçanın bir ayarının şimdiki değeri (eylem ayarının değeri yoktur). */
export function ayarOku(p, ad) {
  const sema = ayarSemalari(p.tanim).find((s) => s.ad === ad);
  if (!sema || sema.tur === 'eylem') return undefined;
  if (p.tanim.ayarOku) return p.tanim.ayarOku(p, ad);
  return p.ozel[ad] ?? sema.varsayilan;
}

/** Parçanın bütün ayarları: [[ad, deger]] (pipet, söküm geri alma). */
export function ayarlariAl(p) {
  return ayarSemalari(p.tanim).map((s) => [s.ad, ayarOku(p, s.ad)])
    .filter(([, deger]) => deger !== undefined);
}

/** Ayarları uygulayan komutlar. */
export function ayarKomutlari(x, y, ayarlar) {
  return ayarlar.map(([ad, deger]) => ({ tur: 'ayar', x, y, ad, deger }));
}

/** Değer bu şemada geçerli mi (seçeneklerden biri)? */
export function ayarGecerli(tanim, ad, deger) {
  const sema = ayarSemalari(tanim).find((s) => s.ad === ad);
  const anahtar = ayarAnahtari(deger);
  return Boolean(sema) && secenekler(tanim, sema).some((s) => ayarAnahtari(s.deger) === anahtar);
}
