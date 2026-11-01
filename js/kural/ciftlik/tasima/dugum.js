/**
 * Düğüm parçaları için altyapı (çatal, birleştirme oluğu). Düğüm sıradan bir parçadır:
 * giriş ve çıkış portları, küçük bir tampon ve port protokolü. Buradaki saf yardımcılar adil
 * ve deterministik dağıtımı sağlar:
 *   dagit(ctx, p, kod, uygun)    çıkışları p.ozel.sira'dan başlayarak dönüşümlü dener
 *   oncelikle(ctx, p, kod, ...)  çıkışları sırayla (0, 1, 2...) dener; sıra ilerlemez (taşma)
 *   sirayla(p, n, dene)          n giriş/çıkış arasında dönüşümlü seçim (birleştirici adilliği)
 *   tamponKabul / tamponAl / tamponVer   tek tamponlu düğümün port protokolü (p.ozel.tampon)
 *   yuvaKabul / yuvaAl / yuvaVer         girişe bir yuvalı düğüm (p.ozel.yuva[port]; 0 = boş)
 *   bekleIsle / bekleyenVar              "çıkış dolu" rozeti için kesintisiz bekleme sayacı
 * Yeraltı bandı ve kaldırıcı hat parçasıdır: tanim.hat.ardil ve tanim.hat.uzunluk ile sanal
 * (uzun) karo kurar (tasima/hat.js).
 */
import { hedefKabul, hedefeVer } from './hat-adim.js';
import { parcaSabiti } from '../ekonomi/denge.js';

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

/** Dağıtımın öncelikli kipi: ilk kabul eden çıkışa verir (0, 1, 2 sırasıyla); port ya da -1. */
export function oncelikle(ctx, p, kod, uygun = () => true) {
  const n = p.cikisHedef.length;
  for (let k = 0; k < n; k++) {
    if (!uygun(k, kod) || !hedefKabul(ctx, p.cikisHedef[k], kod)) continue;
    hedefeVer(ctx, p.cikisHedef[k], kod);
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

/** Giriş başına bir yuvalı düğüm: o girişin yuvası boşsa kabul (yan etkisiz). */
export function yuvaKabul(p, port) {
  return p.ozel.yuva[port] === 0;
}

export function yuvaAl(p, port, kod) {
  p.ozel.yuva[port] = kod;
}

/**
 * Dolu yuvalardan p.ozel.sira'dan başlayıp ilkini `ver(kod, port)` true dönerse boşaltır
 * (dönüşümlü: her yuva sırayla hak kazanır, boş yuva atlanır). Verilen port ya da -1.
 */
export function yuvaVer(p, ver) {
  const k = sirayla(p, p.ozel.yuva.length, (i) => p.ozel.yuva[i] !== 0 && ver(p.ozel.yuva[i], i));
  if (k >= 0) p.ozel.yuva[k] = 0;
  return k;
}

/**
 * Bu kadar tik ilerleyemeden bekleyen eşya "çıkış dolu" rozeti verir (kısa beklemeler ve
 * sürekli akıp tek tek sırasını bekleyen yuvalar değil: her geçişte sayaç sıfırlanır).
 */
export const BEKLE_ESIK = parcaSabiti('catal').bekleEsik;
const BEKLE_TAVAN = 100000;

/** Tik sonunda: eşya ilerleyemeden bekliyorsa sayaç artar, değilse sıfırlanır. */
export function bekleIsle(p, bekliyor) {
  p.ozel.bekle = bekliyor ? Math.min(BEKLE_TAVAN, p.ozel.bekle + 1) : 0;
}

export function bekleyenVar(p) {
  return p.ozel.bekle >= BEKLE_ESIK;
}
