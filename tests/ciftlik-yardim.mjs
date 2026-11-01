/**
 * Çiftlik testlerinin ortak yardımcıları: düz (sentetik) tarla, boş dünya, hızlı kurulum
 * ve tik koşturma. Benzetim yalnız tarla.h / kirli / kaldirilan okur; sentetik tarla
 * tarlaKur'dan çok hızlıdır. Perf betiği (araclar/ciftlik-olc.mjs) de kullanır.
 */
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { ciftlikKur, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { parcaKur } from '../js/kural/ciftlik/komut.js';
import '../js/kural/ciftlik/parcalar/hepsi.js';

/** Bütün hücreleri `taban` kat olan tarla; `yigin` verilirse (x, y, r, t) koni eklenir. */
export function duzTarla(taban = 0, yiginlar = []) {
  const h = new Uint16Array(GENISLIK * YUKSEKLIK).fill(taban);
  for (const { x, y, r, t } of yiginlar) {
    for (let j = Math.max(0, y - r); j < Math.min(YUKSEKLIK, y + r); j++) {
      for (let i = Math.max(0, x - r); i < Math.min(GENISLIK, x + r); i++) {
        const d2 = ((i - x) ** 2 + (j - y) ** 2) / (r * r);
        if (d2 < 1) h[j * GENISLIK + i] += Math.floor(t * (1 - d2));
      }
    }
  }
  return { h, kirli: true, kaldirilan: 0 };
}

/** Boş dünya + sentetik tarla. */
export function dunya(tohum = 7, tarla = duzTarla(), secenek = {}) {
  return { c: ciftlikKur(tohum, secenek), tarla };
}

/** Hemen kurar; kurulamazsa hata (test kurulumu sessiz geçmesin). */
export function kur(c, tarla, ad, x, y, yon = 0) {
  const s = parcaKur(c, tarla, ad, x, y, yon);
  if (!s.parca) throw new Error(`${ad} (${x}, ${y}) kurulamadı: ${s.neden}`);
  return s.parca;
}

/** (x, y)'den yon yönünde n bant. */
export function bantCek(c, tarla, x, y, yon, n) {
  const dx = [1, 0, -1, 0][yon];
  const dy = [0, 1, 0, -1][yon];
  for (let i = 0; i < n; i++) kur(c, tarla, 'bant', x + dx * i, y + dy * i, yon);
}

/** n tik koşar; bütün olayları döndürür. */
export function kos(c, tarla, n) {
  const olaylar = [];
  for (let i = 0; i < n; i++) olaylar.push(...tikAt(c, tarla));
  return olaylar;
}

/** Bir sandığın toplam içeriği. */
export const sandikToplam = (p) => p.ozel.toplam;
