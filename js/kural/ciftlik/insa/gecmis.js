/**
 * İnşa geçmişi (saf; geri al / yinele): komut yığını. Bir adım bir oyuncu eylemidir (tek
 * tık, bir sürükleme, bir ayar, bir yapıştırma) ve komut çiftlerinden oluşur:
 *   { ad: '14 bant', ciftler: [{ yap: [komut...], geri: [komut...] }] }
 * Geri alma çiftleri ters sırayla `geri` komutlarıyla, yineleme sırayla `yap` komutlarıyla
 * benzetime verir (benzetimin kendisi geri alınmaz; kuruş, komutların kendisiyle döner).
 * Yığın en çok GECMIS_SINIRI adımdır, oturumluktur (kayda yazılmaz); yeni adım yineleme
 * yığınını boşaltır. Benzetim bir komutu reddederse (komut-reddedildi) gecmisReddet en son
 * adımdaki o çifti çıkarır: geri alma reddedilen işi "geri almaya" kalkmaz.
 * Çift üreticileri: kurCifti, sokCifti (ayarlar geri gelir), dondurCifti.
 */
import { ayarKomutlari, ayarlariAl } from './ayar.js';

/** Geri alma yığınının derinliği. */
export const GECMIS_SINIRI = 100;

export function gecmisKur(sinir = GECMIS_SINIRI) {
  return { geri: [], ileri: [], sinir };
}

/** Yeni adım (boş çiftli adım eklenmez); yineleme yığını boşalır. */
export function gecmisEkle(g, adim) {
  if (!adim.ciftler.length) return false;
  g.geri.push(adim);
  if (g.geri.length > g.sinir) g.geri.splice(0, g.geri.length - g.sinir);
  g.ileri.length = 0;
  return true;
}

/** Son adımı geri alma yığınından çıkarır (yinelemeye taşır); yoksa null. */
export function gecmisGeriAl(g) {
  const adim = g.geri.pop() ?? null;
  if (adim) g.ileri.push(adim);
  return adim;
}

/** Son geri alınan adımı yineler; yoksa null. */
export function gecmisYinele(g) {
  const adim = g.ileri.pop() ?? null;
  if (adim) g.geri.push(adim);
  return adim;
}

/** Adımı geri almak için verilecek komutlar (çiftler ters sırayla). */
export function geriKomutlari(adim) {
  return adim.ciftler.slice().reverse().flatMap((c) => c.geri);
}

/** Adımı (yeniden) yapmak için komutlar. */
export function yapKomutlari(adim) {
  return adim.ciftler.flatMap((c) => c.yap);
}

const ALANLAR = ['tur', 'x', 'y', 'parca', 'yon', 'ad', 'deger'];

/** İki komut aynı mı (benzetimin eklediği `tik` alanı sayılmaz)? */
export function komutEsit(a, b) {
  return ALANLAR.every((k) => a[k] === b[k]);
}

/** Reddedilen komutun çiftini en son adımdan çıkarır; adım boşalırsa adım da gider. */
export function gecmisReddet(g, komut) {
  const adim = g.geri[g.geri.length - 1];
  if (!adim) return false;
  const i = adim.ciftler.findIndex((c) => komutEsit(c.yap[0], komut));
  if (i < 0) return false;
  adim.ciftler.splice(i, 1);
  if (!adim.ciftler.length) g.geri.pop();
  return true;
}

/** Kur çifti; ayarlar ([[ad, deger]]) verilirse kurulunca uygulanır (pipet). */
export function kurCifti(anahtar, x, y, yon, ayarlar = []) {
  return {
    yap: [{ tur: 'kur', parca: anahtar, x, y, yon }, ...ayarKomutlari(x, y, ayarlar)],
    geri: [{ tur: 'sok', x, y }],
  };
}

/** Sök çifti: geri alınınca parça aynı yere, aynı yön ve ayarlarla gelir. */
export function sokCifti(p) {
  return {
    yap: [{ tur: 'sok', x: p.x, y: p.y }],
    geri: [{ tur: 'kur', parca: p.tanim.anahtar, x: p.x, y: p.y, yon: p.yon },
      ...ayarKomutlari(p.x, p.y, ayarlariAl(p))],
  };
}

/** Yerinde döndürme çifti. */
export function dondurCifti(p, yon) {
  return {
    yap: [{ tur: 'dondur', x: p.x, y: p.y, yon: yon & 3 }],
    geri: [{ tur: 'dondur', x: p.x, y: p.y, yon: p.yon }],
  };
}
