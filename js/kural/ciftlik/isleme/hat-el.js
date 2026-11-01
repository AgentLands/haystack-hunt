/**
 * Kolun (yaba kolu) dünya ile alışverişi: bir karodaki hattan eşya çekmek, bir karodaki hatta
 * ya da parça giriş portuna eşya bırakmak, bir depodan (tanim.cek) çekmek. Hat dizileri
 * (pos azalan, tur) doğrudan düzenlenir; aralık kuralı (≥ ARALIK) korunur, üst üste binme yok.
 *   karodanCek(ctx, kol, kx, ky, uygun) → kod | 0    depo parçası ya da hat karosu
 *   karoyaBirak(ctx, kol, kx, ky, kod, deneme) → bool   parça girişi ya da hat karosu
 * deneme true ise yalnız sorar (yan etkisiz; "bırakabilir mi").
 */
import { ARALIK } from '../olcu.js';
import { parcaAt } from '../izgara.js';
import { karoHatti, karodakiIndeksler } from './bulundu.js';

/** Hattın k. eşyasını çıkarır (diziler kayar). */
function hattanSil(h, k) {
  h.pos.copyWithin(k, k + 1, h.n);
  h.tur.copyWithin(k, k + 1, h.n);
  h.n -= 1;
}

/** Karodaki depo parçasından (tanim.cek) ya da hattan uygun ilk eşyayı alır; yoksa 0. */
export function karodanCek(ctx, kol, kx, ky, uygun) {
  const q = parcaAt(ctx.c, kx, ky);
  if (q && q !== kol && q.tanim.cek) return q.tanim.cek(q, uygun, ctx);
  if (!q?.tanim.hat) return 0;
  const yer = karoHatti(ctx.c, kx, ky);
  if (!yer) return 0;
  for (const k of karodakiIndeksler(yer.h, yer.sira)) {
    const kod = yer.h.tur[k];
    if (!uygun(kod)) continue;
    hattanSil(yer.h, k);
    return kod;
  }
  return 0;
}

/**
 * Hattın `sira`. karosuna, aralık kuralına uyan en öndeki boşluğa yerleşim: { j, x } ya da
 * null. j: eklenecek indeks (öndekiler önce), x: konum.
 */
function hatYeri(h, sira) {
  const bas = h.ofset[sira];
  const son = sira + 1 < h.karolar.length ? h.ofset[sira + 1] - 1 : h.uzun;
  if (h.n >= h.pos.length) return null;
  for (let j = 0; j <= h.n; j++) {
    const ust = Math.min(son, j > 0 ? h.pos[j - 1] - ARALIK : son);
    const alt = Math.max(bas, j < h.n ? h.pos[j] + ARALIK : bas);
    if (ust >= alt) return { j, x: ust };
  }
  return null;
}

/** Hatta j. sıraya x konumunda eşya ekler. */
function hattaEkle(h, j, x, kod) {
  h.pos.copyWithin(j + 1, j, h.n);
  h.tur.copyWithin(j + 1, j, h.n);
  h.pos[j] = x;
  h.tur[j] = kod;
  h.n += 1;
}

/**
 * Kolun önündeki karoya bırakır: kola bakan giriş portu olan parçaya (kabulEder → al) ya da
 * hat karosuna. deneme: yalnız sor. Bırakıldıysa (ya da bırakılabilirse) true.
 */
export function karoyaBirak(ctx, kol, kx, ky, kod, deneme = false) {
  const q = parcaAt(ctx.c, kx, ky);
  if (!q || q === kol) return false;
  if (!q.tanim.hat) {
    const i = q.giris.findIndex((g) => g.kx === kx && g.ky === ky
      && g.hx === kol.x && g.hy === kol.y);
    if (i < 0 || !q.tanim.kabulEder?.(q, i, kod, ctx)) return false;
    if (!deneme) q.tanim.al(q, i, kod, ctx);
    return true;
  }
  const yer = karoHatti(ctx.c, kx, ky);
  const bos = yer && yer.h.etkin ? hatYeri(yer.h, yer.sira) : null;
  if (!bos) return false;
  if (!deneme) hattaEkle(yer.h, bos.j, bos.x, kod);
  return true;
}
