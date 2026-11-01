/**
 * Düğüm parçaları için altyapı (ayırıcı, birleştirici; parçaların kendisi Faz 1'de). Düğüm
 * sıradan bir parçadır: giriş ve çıkış portları, küçük bir tampon (p.ozel.tampon: kod dizisi)
 * ve port protokolü. Buradaki saf yardımcılar adil ve deterministik dağıtımı sağlar:
 *   dagit(ctx, p, kod, uygun)   çıkışları p.ozel.sira'dan başlayarak dönüşümlü dener
 *   sirayla(p, n, dene)         n giriş/çıkış arasında dönüşümlü seçim (birleştirici adilliği)
 *   tamponKabul / tamponAl / tamponVer   tek tamponlu düğümün port protokolü
 * Yeraltı bandı ve kaldırıcı hat parçasıdır: tanim.hat.ardil ve tanim.hat.uzunluk ile sanal
 * (uzun) karo kurar (tasima/hat.js).
 */
import { hedefKabul, hedefeVer } from './hat-adim.js';

/**
 * Eşyayı çıkışlardan birine verir: p.ozel.sira'dan başlayarak sırayla, `uygun(port, kod)`
 * true olan ve kabul eden ilk çıkış. Verildiyse port numarası, değilse -1. Sıra ilerler.
 */
export function dagit(ctx, p, kod, uygun = () => true) {
  const n = p.cikisHedef.length;
  const bas = p.ozel.sira ?? 0;
  for (let i = 0; i < n; i++) {
    const k = (bas + i) % n;
    if (!uygun(k, kod) || !hedefKabul(ctx, p.cikisHedef[k], kod)) continue;
    hedefeVer(ctx, p.cikisHedef[k], kod);
    p.ozel.sira = (k + 1) % n;
    return k;
  }
  return -1;
}

/** n seçenek arasında p.ozel.sira'dan başlayıp dene(k) true olan ilkini seçer (ya da -1). */
export function sirayla(p, n, dene) {
  const bas = p.ozel.sira ?? 0;
  for (let i = 0; i < n; i++) {
    const k = (bas + i) % n;
    if (dene(k)) {
      p.ozel.sira = (k + 1) % n;
      return k;
    }
  }
  return -1;
}

/** Tek tamponlu parça: tamponda yer var mı (kap: p.tanim.tampon?.giris ?? 1). */
export function tamponKabul(p) {
  return p.ozel.tampon.length < (p.tanim.tampon?.giris ?? 1);
}

export function tamponAl(p, kod) {
  p.ozel.tampon.push(kod);
}

/** Tamponun başındaki eşyayı `ver(kod)` true dönerse çıkarır. */
export function tamponVer(p, ver) {
  if (p.ozel.tampon.length && ver(p.ozel.tampon[0])) p.ozel.tampon.shift();
}
