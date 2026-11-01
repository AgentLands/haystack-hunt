/**
 * Çiftlik benzetim maliyeti: standart çiftlik (araclar/ciftlik-olc.mjs: ~900 parça, ~2000
 * eşya, 4 huni) 10.000 tik. Tavan gevşek (6000 ms; hedef 1500 ms ölçüm betiğinde): yalnız
 * O(n²) gerilemesini yakalar, yavaş CI makinesinde kırılmaz.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { olc, standartCiftlik } from '../araclar/ciftlik-olc.mjs';

test('standart çiftlik: ≥ 300 parça, ≥ 2000 eşya kurulur', () => {
  const d = standartCiftlik();
  assert.ok(d.parca >= 300, `parça ${d.parca}`);
  assert.ok(d.esya >= 2000, `eşya ${d.esya}`);
});

test('10.000 tik ≤ 6000 ms (gevşek tavan); halka eşyaları kaybolmaz', () => {
  const s = olc(10000);
  assert.ok(s.ms <= 6000, `${s.ms.toFixed(0)} ms`);
  assert.equal(s.esyaSon, s.esyaBas);
  assert.ok(s.huniOrani > 0.2, `huniler çalıştı: ${s.huniOrani}`);
});
