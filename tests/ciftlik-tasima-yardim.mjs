/**
 * Taşıma testlerinin ortak kurgusu (çatal, oluk, menfez düzenleri ve eşya sayımı). Her düzen
 * `oy` (y kaydırması) alır: aynı dünyada yan yana kurulabilsinler.
 */
import assert from 'node:assert/strict';
import { ARALIK, karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { tikAt } from '../js/kural/ciftlik/benzetim.js';
import { parcaIcerigi } from '../js/kural/ciftlik/parca-kayit.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { kur, bantCek, kos } from './ciftlik-yardim.mjs';

/** (kx, ky) karosunun hattı (topoloji için en az bir tik atılmış olmalı). */
export const hatYeri = (c, kx, ky) => c.hatlar[c.karoHat[karoIndeks(kx, ky)] - 1];

/** Hattın başına eşya koymayı dener (sürekli besleme için her tik çağrılır). */
export function besle(c, kx, ky, kod) {
  return hatBasaKoy(hatYeri(c, kx, ky), kod);
}

/** Dünyadaki bütün eşyalar: hat + parça içerikleri + envanter (korunum denetimi). */
export function esyaSay(c) {
  let n = 0;
  for (const h of c.hatlar) n += h.n;
  for (const p of c.parcalar.values()) for (const [, adet] of parcaIcerigi(p).esya) n += adet;
  c.envanter.forEach((adet) => { n += adet; });
  return n;
}

/** Her hatta eşyalar arası ≥ ARALIK ve hat içinde. */
export function araliklarDenetle(c) {
  for (const h of c.hatlar) {
    for (let k = 1; k < h.n; k++) {
      const fark = h.pos[k - 1] - h.pos[k];
      assert.ok(fark >= ARALIK, `hat ${h.id}: aralık ${fark}`);
    }
    for (let k = 0; k < h.n; k++) assert.ok(h.pos[k] >= 0 && h.pos[k] <= h.uzun);
  }
}

/**
 * (20, oy)'de doğuya bakan çatal; girişi (15..19, oy) bandı. Her yan için: 'sandik' (bitişik
 * sandık), 'kor' (2 karo kör bant: dolunca tıkanır), 'bant' (2 karo bant + uçta sandık) ya da
 * null. Yan sırası ön (doğu), sol (kuzey), sağ (güney). Besleme noktası (15, oy).
 */
export function catalKur(c, tarla, yanlar, kip = 'sirayla', oy = 20) {
  const catal = kur(c, tarla, 'catal', 20, oy, 0);
  assert.ok(catal.tanim.ayarla(catal, 'kip', kip));
  bantCek(c, tarla, 15, oy, 0, 5);
  const yerler = [[21, oy, 0], [20, oy - 1, 3], [20, oy + 1, 1]];
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  const sandiklar = [];
  yanlar.forEach((tur, i) => {
    if (!tur) return;
    const [x, y, yon] = yerler[i];
    if (tur === 'sandik') {
      sandiklar[i] = kur(c, tarla, 'sandik', x, y);
      return;
    }
    bantCek(c, tarla, x, y, yon, 2);
    if (tur === 'bant') sandiklar[i] = kur(c, tarla, 'sandik', x + 2 * dx[yon], y + 2 * dy[yon]);
  });
  tikAt(c, tarla);
  return { catal, sandiklar };
}

/** Her tik besler (kabul edilirse sayar), n eşya olana dek; sonra `bekle` tik daha koşar. */
export function kosBesle(c, tarla, kx, ky, kod, n, bekle) {
  let verilen = 0;
  for (let t = 0; t < 20000 && verilen < n; t++) {
    if (besle(c, kx, ky, kod)) verilen += 1;
    tikAt(c, tarla);
  }
  kos(c, tarla, bekle);
  return verilen;
}

/**
 * Üç girişli oluk (10, oy) doğuya bakar: girişler arka (5..9, oy), sol (10, oy-5..oy-1),
 * sağ (10, oy+5..oy+1); çıkış (11..14, oy) bandı ve (15, oy) sandığı. Besleme noktaları
 * arka (5, oy), sol (10, oy-5), sağ (10, oy+5).
 */
export function olukKur(c, tarla, { cikisSandik = true } = {}, oy = 10) {
  const oluk = kur(c, tarla, 'birlestirme-olugu', 10, oy, 0);
  bantCek(c, tarla, 5, oy, 0, 5);
  bantCek(c, tarla, 10, oy - 5, 1, 5);
  bantCek(c, tarla, 10, oy + 5, 3, 5);
  bantCek(c, tarla, 11, oy, 0, 4);
  const sandik = cikisSandik ? kur(c, tarla, 'sandik', 15, oy) : null;
  tikAt(c, tarla);
  return { oluk, sandik };
}

/**
 * Menfez düzeni: (4..8, oy) bant, (9, oy) giriş, (13, oy) çıkış (4 karo mesafe), (14..18, oy)
 * bant, (19, oy) sandık. `capraz`: x = 11'de (ara karo) güneye giden hat, ucunda sandık;
 * besleme noktası (11, oy-5). Ana besleme noktası (4, oy).
 */
export function menfezKur(c, tarla, capraz = false, oy = 10) {
  bantCek(c, tarla, 4, oy, 0, 5);
  const giris = kur(c, tarla, 'menfez', 9, oy, 0);
  const cikis = kur(c, tarla, 'menfez', 13, oy, 0);
  bantCek(c, tarla, 14, oy, 0, 5);
  const sandik = kur(c, tarla, 'sandik', 19, oy);
  let caprazSandik = null;
  if (capraz) {
    bantCek(c, tarla, 11, oy - 5, 1, 11);
    caprazSandik = kur(c, tarla, 'sandik', 11, oy + 6);
  }
  tikAt(c, tarla);
  return { giris, cikis, sandik, caprazSandik };
}
