/**
 * Standart ölçüm sahnesi (Node ve tarayıcıda aynı kod): 4 huni hattı (huni + 8 bant + sandık;
 * huniler yığın kenarında, tarlayı sürekli kirletir) + 36 halka bant (8×6, her birinde 56
 * eşya): ~900 parça, ~2000 eşya. `araclar/ciftlik-olc.mjs` (Node maliyeti ve telefon kare
 * süresi) ve `tests/ciftlik-olcum.test.js` bunu kullanır. Tarayıcıda `tarla.h` gerçek
 * tarlanın üzerine yazılır; `toleransli` kurulumda yasak alana düşen parça atlanır.
 */
import { GENISLIK } from '../js/kural/boyut.js';
import { tikAt } from '../js/kural/ciftlik/benzetim.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { parcaKur } from '../js/kural/ciftlik/komut.js';
import { duzTarla } from './ciftlik-yardim.mjs';

const HALKA_ESYA = 56;
const HUNI_KX = [5, 35, 65, 95];

/** Standart tarla yüksekliği: huni yığınları + halkaların altı düz. Yeni h dizisini döndürür. */
export function sahneTarlasi() {
  const yiginlar = HUNI_KX.map((kx) => ({ x: kx * 2 + 2, y: 62 * 2 + 16, r: 15, t: 150 }));
  const tarla = duzTarla(0, yiginlar);
  for (let y = 120; y < 130; y++) for (let x = 0; x < GENISLIK; x++) tarla.h[y * GENISLIK + x] = 0;
  return tarla.h;
}

/**
 * Sahneyi kurar: c çiftlik dünyasına parçaları koyar, halkalara eşya doldurur.
 * Dönüş: { parca, esya, atlanan }. toleransli false iken kurulamayan parça hata verir.
 */
export function sahneKur(c, tarla, { toleransli = false } = {}) {
  let atlanan = 0;
  const kur = (ad, x, y, yon = 0) => {
    const s = parcaKur(c, tarla, ad, x, y, yon);
    if (s.parca) return;
    if (!toleransli) throw new Error(`${ad} (${x}, ${y}) kurulamadı: ${s.neden}`);
    atlanan += 1;
  };
  const bant = (x, y, yon, n) => {
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][yon];
    for (let i = 0; i < n; i++) kur('bant', x + dx * i, y + dy * i, yon);
  };
  for (const kx of HUNI_KX) {
    kur('huni', kx, 61, 0);
    bant(kx + 2, 61, 0, 8);
    kur('sandik', kx + 10, 61);
  }
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 12; i++) {
      const x = 2 + 9 * i;
      const y = 6 + 8 * j;
      bant(x, y, 0, 7);
      bant(x + 7, y, 1, 5);
      bant(x + 7, y + 5, 2, 7);
      bant(x, y + 5, 3, 5);
    }
  }
  tikAt(c, tarla);
  const saman = esyaKodu('saman');
  for (const h of c.hatlar) {
    if (h.cikis?.hat !== h) continue;
    for (let k = 0; k < HALKA_ESYA; k++) {
      h.pos[k] = h.uzun - 100 * k;
      h.tur[k] = saman;
    }
    h.n = HALKA_ESYA;
  }
  return { parca: c.parcalar.size, esya: c.hatlar.reduce((s, h) => s + h.n, 0), atlanan };
}
