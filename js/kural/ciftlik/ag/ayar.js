/**
 * Parça ayarları (mantık ailesi ve ileride başkaları): tanım `ayarlar` şeması
 *   { ad: { tur: 'renk' | 'iki' | 'secim' | 'filtre' | 'eylem', secenekler?, yok?, degisti?,
 *           uygula? } }
 * ve `ayarUygula(p, ad, deger)`: değeri doğrular, p.ozel[ad]'a yazar, `degisti(p)` çağırır;
 * eylem türü `uygula(p)` çalıştırır. Geçersiz ad/değer false verir, parçaya dokunmaz. Bu işlev
 * 'ayar' komutunun (arayüz/birleştirme; tik numaralı kuyruk) tek giriş noktasıdır.
 * Renk: 0..5 (yok: true ise -1 de olur). Filtre: { tur: 'hepsi' | 'esya' (kod) | 'sinif' }.
 */
import { esyaTanimi } from '../esya.js';
import { RENK_ADLARI, RENK_SAYISI } from './sinyal.js';

/** Eşya sınıfları (esyalar.md §1): kile sayacı filtresi. */
export const SINIFLAR = ['saman', 'urun', 'igne', 'metal', 'cop', 'buluntu'];

function filtreNormal(f) {
  if (!f || typeof f !== 'object') return undefined;
  if (f.tur === 'hepsi') return { tur: 'hepsi' };
  if (f.tur === 'esya' && esyaTanimi(f.kod)) return { tur: 'esya', kod: f.kod };
  if (f.tur === 'sinif' && SINIFLAR.includes(f.sinif)) return { tur: 'sinif', sinif: f.sinif };
  return undefined;
}

function ayarDeger(s, d) {
  switch (s.tur) {
    case 'renk': {
      const en = s.yok ? -1 : 0;
      return Number.isInteger(d) && d >= en && d < RENK_SAYISI ? d : undefined;
    }
    case 'iki':
    case 'secim': return s.secenekler.includes(d) ? d : undefined;
    case 'filtre': return filtreNormal(d);
    default: return undefined;
  }
}

/** Ayarı doğrulayıp uygular; geçersizse (bilinmeyen ad, kötü değer) false. */
export function ayarUygula(p, ad, deger) {
  const s = Object.hasOwn(p.tanim.ayarlar ?? {}, ad) ? p.tanim.ayarlar[ad] : null;
  if (!s) return false;
  if (s.tur === 'eylem') {
    s.uygula(p);
    return true;
  }
  const v = ayarDeger(s, deger);
  if (v === undefined) return false;
  p.ozel[ad] = v;
  s.degisti?.(p);
  return true;
}

/** Renk numarasının görünen adı (-1 = yok). */
export const renkAdi = (r) => (r >= 0 ? RENK_ADLARI[r] : 'yok');
