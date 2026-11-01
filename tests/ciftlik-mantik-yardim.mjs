/**
 * Mantık testlerinin ortak kurgusu: renk sabitleri, sentetik depo türleri (kantarın
 * `tanim.doluluk` sözleşmesi için), bir sıra düzeni ve besleme döngüsü.
 */
import { karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { esyaKodu, esyaTanimla } from '../js/kural/ciftlik/esya.js';
import { parcaTanimla } from '../js/kural/ciftlik/parca-kayit.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { dunya, kur, bantCek, kos } from './ciftlik-yardim.mjs';

export const SAMAN = esyaKodu('saman');
export const IGNE = esyaKodu('igne');
export const CIVI = esyaKodu('civi');
export const [KIRMIZI, CIVIT, SARI, YESIL, MOR, BEYAZ] = [0, 1, 2, 3, 4, 5];
esyaTanimla('deneme-urun', { kod: 511, ad: 'Deneme ürünü', sinif: 'urun' });
export const URUN = esyaKodu('deneme-urun');

// Sentetik depolar: kantarın okuduğu `doluluk(p)` sözleşmesi (gerçek depolar F/B/E'den gelir).
export const DEPOLAR = ['ambar', 'kurutma', 'gubre', 'volan', 'miknatis'];
DEPOLAR.forEach((ad, i) => parcaTanimla(`deneme-${ad}`, {
  kod: 65001 + i, ad: `Deneme ${ad}`, aile: 'depo', boyut: [2, 2], yonlu: false,
  kur(p) { Object.assign(p.ozel, { n: 0, kap: 100 }); },
  doluluk: (p) => ({ n: p.ozel.n, kap: p.ozel.kap }),
}));

export const hatBul = (c, x, y) => c.hatlar[c.karoHat[karoIndeks(x, y)] - 1];
export const sandikDoldur = (p, n) => { p.ozel.toplam = n; p.ozel.say[SAMAN] = n; };
export const durumKodu = (p) => p.tanim.durum(p);

/** y = 10'da: bant 10-12, [orta] 13, bant 14-16, sandık 17. Hatlar kurulur. */
export function sira(orta) {
  const d = dunya();
  bantCek(d.c, d.tarla, 10, 10, 0, 3);
  const parca = kur(d.c, d.tarla, orta, 13, 10, 0);
  bantCek(d.c, d.tarla, 14, 10, 0, 3);
  const sandik = kur(d.c, d.tarla, 'sandik', 17, 10);
  kos(d.c, d.tarla, 1);
  return { ...d, parca, sandik };
}

/** Her tik girişe eşya koymayı dener; verilen eşya sayısı döner. */
export function besleKos(d, n, kod = SAMAN) {
  let verilen = 0;
  for (let t = 0; t < n; t++) {
    if (hatBasaKoy(hatBul(d.c, 10, 10), kod)) verilen += 1;
    kos(d.c, d.tarla, 1);
  }
  return verilen;
}
