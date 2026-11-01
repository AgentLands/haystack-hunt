/**
 * Çiftlik benzetimi ölçümü (Node). Standart çiftlik: 4 huni hattı (huni + 8 bant + sandık;
 * huniler yığın kenarında, tarlayı sürekli kirletir) + 36 halka bant (8×6, her birinde
 * 56 eşya): ~900 parça, ~2000 eşya. 10.000 tikin süresini yazar; hedef ≤ 1500 ms.
 *   node araclar/ciftlik-olc.mjs [--tik N]
 * tests/ciftlik-olcum.test.js aynı kurulumu gevşek tavanla (O(n²) gerilemesi) koşar.
 */
import { fileURLToPath } from 'node:url';
import { tikAt } from '../js/kural/ciftlik/benzetim.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { dunya, duzTarla, kur, bantCek } from '../tests/ciftlik-yardim.mjs';

export const HEDEF_MS = 1500;
const HALKA_ESYA = 56;

/** Standart ölçüm çiftliği: { c, tarla, parca, esya }. */
export function standartCiftlik() {
  const yiginlar = [5, 35, 65, 95].map((kx) => ({ x: kx * 2 + 2, y: 62 * 2 + 16, r: 15, t: 150 }));
  const tarla = duzTarla(0, yiginlar);
  for (let y = 120; y < 130; y++) for (let x = 0; x < 240; x++) tarla.h[y * 240 + x] = 0;
  const { c } = dunya(5, tarla);
  for (const kx of [5, 35, 65, 95]) {
    kur(c, tarla, 'huni', kx, 61, 0);
    bantCek(c, tarla, kx + 2, 61, 0, 8);
    kur(c, tarla, 'sandik', kx + 10, 61);
  }
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 12; i++) {
      const x = 2 + 9 * i;
      const y = 6 + 8 * j;
      bantCek(c, tarla, x, y, 0, 7);
      bantCek(c, tarla, x + 7, y, 1, 5);
      bantCek(c, tarla, x + 7, y + 5, 2, 7);
      bantCek(c, tarla, x, y + 5, 3, 5);
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
  return { c, tarla, parca: c.parcalar.size, esya: c.hatlar.reduce((s, h) => s + h.n, 0) };
}

/** Halka hatlarındaki eşya (huni hatlarında yoldaki eşya sayılmaz; başta hepsi halkada). */
const halkaEsyasi = (c) => c.hatlar.filter((h) => h.cikis?.hat === h)
  .reduce((s, h) => s + h.n, 0);

/** Sandıkları boşaltır (huniler hiç durmasın, tarla sürekli kirlensin). */
function bosalt(c) {
  for (const p of c.parcalar.values()) if (p.tanim.anahtar === 'sandik') p.tanim.kur(p);
}

/** n tik koşar; süreyi (ms), son durumu ve hunilerin çalıştığı tik oranını döndürür. */
export function olc(n = 10000) {
  const d = standartCiftlik();
  const huniler = [...d.c.parcalar.values()].filter((p) => p.tanim.anahtar === 'huni');
  let calisan = 0;
  const bas = performance.now();
  for (let i = 0; i < n; i++) {
    if (i % 500 === 0) bosalt(d.c);
    tikAt(d.c, d.tarla);
    if (huniler.every((p) => p.ozel.son > 0)) calisan += 1;
  }
  const ms = performance.now() - bas;
  const esya = halkaEsyasi(d.c);
  return {
    ms, tikUs: (ms / n) * 1000, parca: d.parca, esyaBas: d.esya, esyaSon: esya, d,
    huniOrani: calisan / n,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--tik');
  const n = i > 0 ? Number(process.argv[i + 1]) : 10000;
  const s = olc(n);
  const kirli = Array.from(s.d.c.kirli).filter(Boolean).length;
  console.log(`${n} tik: ${s.ms.toFixed(0)} ms (tik başına ${s.tikUs.toFixed(1)} µs), `
    + `${s.parca} parça, ${s.esyaBas} → ${s.esyaSon} eşya, 4 huni tiklerin `
    + `%${Math.round(s.huniOrani * 100)}'inde çalıştı, kirli bölge ${kirli}; `
    + `hedef ≤ ${HEDEF_MS} ms: ${s.ms <= HEDEF_MS ? 'TAMAM' : 'AŞILDI'}`);
}
