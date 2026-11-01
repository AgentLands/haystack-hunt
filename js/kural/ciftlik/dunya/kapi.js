/**
 * Komşu kapısını dünyaya kurar (F'nin `komsu-kapisi` parçası; sökülmez, palette yok). Yeri
 * arazinin `c.arazi.kapi`'sidir ({ x, y, yon }: yon arazinin İÇİNE bakar, arazi.js
 * kapiSec). Parçanın girişleri yon 0'da batı kenarındadır; arazinin içinden gelen eşyayı
 * alması için parça yönü = arazi yönü + 2. `kapiAlaniDuzle` (araziKur çağırır) kapı karolarının
 * samanını sıfırlar ki kurulum "saman" engeline takılmasın. `kapiKur` yeni çiftlikte ve eski
 * kayıt açılırken çağrılır; kapı zaten varsa ya da arazisiz (test) dünyada bir şey yapmaz.
 */
import { GENISLIK } from '../../boyut.js';
import { KARO } from '../olcu.js';
import { parcaKur } from '../komut.js';

export const KAPI_PARCA = 'komsu-kapisi';

/** Kapı parçasının yönü (arazi yönünden). */
export const kapiParcaYonu = (kapi) => (kapi.yon + 2) & 3;

/** Kapının 2×2 karosundaki hücrelerin samanını sıfırlar; kaldırılan katı döndürür. */
export function kapiAlaniDuzle(tarla, kapi) {
  let n = 0;
  for (let y = kapi.y * KARO; y < (kapi.y + kapi.boy) * KARO; y++) {
    for (let x = kapi.x * KARO; x < (kapi.x + kapi.en) * KARO; x++) {
      n += tarla.h[y * GENISLIK + x];
      tarla.h[y * GENISLIK + x] = 0;
    }
  }
  return n;
}

/** Dünyadaki kapı parçası (yoksa null). */
export function kapiParcasi(c) {
  for (const p of c.parcalar.values()) if (p.tanim.anahtar === KAPI_PARCA) return p;
  return null;
}

/**
 * Kapıyı kurar. Dönüş: { parca } (kuruldu ya da zaten vardı), { neden } (yer dolu: eski
 * kayıtta oyuncu oraya parça koymuş olabilir) ya da null (arazide kapı yeri yok).
 */
export function kapiKur(c, tarla) {
  const kapi = c.arazi?.kapi;
  if (!kapi) return null;
  const mevcut = kapiParcasi(c);
  if (mevcut) return { parca: mevcut };
  return parcaKur(c, tarla, KAPI_PARCA, kapi.x, kapi.y, kapiParcaYonu(kapi));
}
