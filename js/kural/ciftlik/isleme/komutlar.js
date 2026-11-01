/**
 * Parça komutları (tik numaralı kuyruk; arayüz benzetimi yalnız bunlarla değiştirir):
 *   { tur: 'ayar', x, y, ad, deger }   TEK genel ayar komutu (panel, pipet, geri al, kile
 *                                      sıfırlama ad 'sifirla'): şema insa/ayar.js okur;
 *                                      tanim.ayarla(p, ad, deger, { c, tarla }) varsa o (false
 *                                      → red), yoksa nesne şemada ag/ayar.js ayarUygula, dizi
 *                                      şemada seçenek denetimi + p.ozel[ad] = deger
 *   { tur: 'temizle', x, y }           sıkışmış presi açar: tanim.temizle(p, komut, ortam)
 *   { tur: 'onar', x, y }              kırık kıyıcıyı onarır: tanim.onar(p, komut, ortam)
 * temizle/onar kancası null (başarı) ya da red nedeni döndürür; ortam = { c, tarla, olay }.
 * Olaylar: 'parca-ayarlandi' { parca, komut, ad, deger } | 'parca-temizlendi' |
 * 'parca-onarildi' { parca, komut };
 * red: 'komut-reddedildi' { komut, neden: 'bos' | 'desteklenmez' | 'gecersiz' | kancanınki }.
 */
import { komutTanimla } from '../komut.js';
import { parcaAt } from '../izgara.js';
import { ayarUygula } from '../ag/ayar.js';
import { ayarSemalari, ayarGecerli } from '../insa/ayar.js';

const red = (olaylar, komut, neden) => {
  olaylar.push({ ad: 'komut-reddedildi', veri: { komut, neden } });
};

komutTanimla('ayar', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  if (!p) return red(olaylar, k, 'bos');
  const sema = ayarSemalari(p.tanim).find((s) => s.ad === k.ad);
  if (!sema) return red(olaylar, k, 'gecersiz');
  let tamam;
  if (p.tanim.ayarla) {
    tamam = (sema.nesne || ayarGecerli(p.tanim, k.ad, k.deger))
      && p.tanim.ayarla(p, k.ad, k.deger, { c, tarla }) !== false;
  } else if (sema.nesne) {
    tamam = ayarUygula(p, k.ad, k.deger);
  } else {
    tamam = ayarGecerli(p.tanim, k.ad, k.deger);
    if (tamam) p.ozel[k.ad] = k.deger;
  }
  if (!tamam) return red(olaylar, k, 'gecersiz');
  olaylar.push({ ad: 'parca-ayarlandi', veri: { parca: p, komut: k, ad: k.ad, deger: k.deger } });
  return undefined;
});

/** Parça kancasını çağıran komut: tur → tanim[kanca]; başarıda olay `olayAdi`. */
function parcaKomutu(tur, kanca, olayAdi) {
  komutTanimla(tur, (c, tarla, k, olaylar) => {
    const p = parcaAt(c, k.x, k.y);
    if (!p) return red(olaylar, k, 'bos');
    if (!p.tanim[kanca]) return red(olaylar, k, 'desteklenmez');
    const ortam = { c, tarla, olay: (ad, veri) => olaylar.push({ ad, veri }) };
    const neden = p.tanim[kanca](p, k, ortam);
    if (neden) return red(olaylar, k, neden);
    olaylar.push({ ad: olayAdi, veri: { parca: p, komut: k } });
    return undefined;
  });
}
parcaKomutu('temizle', 'temizle', 'parca-temizlendi');
parcaKomutu('onar', 'onar', 'parca-onarildi');
