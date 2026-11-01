/**
 * Parça ayarları (saf): şema okuma ve `ayar` komutu. Parça tanımı ayarlarını şöyle bildirir
 * (inceleme paneli bunlardan anahtar/seçici çizer, pipet ve geri al bunları taşır):
 *   ayarlar: [{ ad: 'kip', tur: 'iki' | 'secim' | 'filtre' | 'renk', etiket: 'Dağıtım',
 *              secenekler: [{ deger: 'sirayla', metin: 'Sırayla' }, ...]  (ya da (tanim) →
 *              aynı dizi), varsayilan: 'sirayla' }]
 *   ayarOku(p, ad) → değer       (isteğe bağlı; yoksa p.ozel[ad] ?? varsayilan)
 *   ayarla(p, ad, deger, { c, tarla })  (isteğe bağlı; yoksa p.ozel[ad] = deger)
 * Değerler JSON'lanabilir ilkel değerdir (dize/sayı/bool); p.ozel'e yazıldığından kayda girer.
 * Komut: { tur: 'ayar', x, y, ad, deger } → 'parca-ayarlandi' { parca, ad, deger }; şemada
 * olmayan ad ya da seçeneklerde olmayan değer 'komut-reddedildi' (neden 'ayar') verir.
 */
import { komutTanimla } from '../komut.js';
import { parcaAt } from '../izgara.js';

/** Tanımın ayar şemaları (yoksa boş dizi). */
export function ayarSemalari(tanim) {
  return Array.isArray(tanim.ayarlar) ? tanim.ayarlar : [];
}

/** Şemanın seçenekleri: [{ deger, metin }] (işlevse tanımla çağrılır). */
export function secenekler(tanim, sema) {
  const liste = typeof sema.secenekler === 'function' ? sema.secenekler(tanim) : sema.secenekler;
  return (liste ?? []).map((s) => (typeof s === 'object' && s !== null
    ? s : { deger: s, metin: String(s) }));
}

/** Parçanın bir ayarının şimdiki değeri. */
export function ayarOku(p, ad) {
  const sema = ayarSemalari(p.tanim).find((s) => s.ad === ad);
  if (!sema) return undefined;
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

/** Değer bu şemada geçerli mi? */
export function ayarGecerli(tanim, ad, deger) {
  const sema = ayarSemalari(tanim).find((s) => s.ad === ad);
  return Boolean(sema) && secenekler(tanim, sema).some((s) => s.deger === deger);
}

komutTanimla('ayar', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  const red = (neden) => olaylar.push({ ad: 'komut-reddedildi', veri: { komut: k, neden } });
  if (!p) return red('bos');
  if (!ayarGecerli(p.tanim, k.ad, k.deger)) return red('ayar');
  if (p.tanim.ayarla) p.tanim.ayarla(p, k.ad, k.deger, { c, tarla });
  else p.ozel[k.ad] = k.deger;
  olaylar.push({ ad: 'parca-ayarlandi', veri: { parca: p, ad: k.ad, deger: k.deger } });
  return undefined;
});
