/** Sanal kol matematiğinin (js/kural/kol.js) birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kolYonu, OLU_BOLGE } from '../js/kural/kol.js';

const yakin = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('merkezde ve ölü bölgede yön sıfır', () => {
  assert.deepEqual(kolYonu(0, 0, 50).yon, { x: 0, y: 0 });
  const k = kolYonu(50 * OLU_BOLGE * 0.9, 0, 50);
  assert.deepEqual(k.yon, { x: 0, y: 0 });
  assert.equal(k.guc, 0);
});

test('ölü bölge sınırından sonra güç 0dan başlayıp yarıçapta 1e ulaşır', () => {
  yakin(kolYonu(50 * OLU_BOLGE, 0, 50).guc, 0);
  yakin(kolYonu(50, 0, 50).yon.x, 1);
  const orta = kolYonu(50 * (OLU_BOLGE + 1) / 2, 0, 50);
  yakin(orta.guc, 0.5);
  yakin(orta.yon.x, 0.5);
});

test('yarıçapın dışı doygundur: bileşke uzunluğu 1i aşmaz, yön korunur', () => {
  const k = kolYonu(300, 400, 50);
  yakin(Math.hypot(k.yon.x, k.yon.y), 1);
  yakin(k.yon.x, 0.6);
  yakin(k.yon.y, 0.8);
  yakin(Math.hypot(k.parmak.x, k.parmak.y), 50);
});

test('eksenler ekran yönünde: sağ +x, aşağı +y, sol -x, yukarı -y', () => {
  assert.ok(kolYonu(40, 0, 50).yon.x > 0);
  assert.ok(kolYonu(-40, 0, 50).yon.x < 0);
  assert.ok(kolYonu(0, 40, 50).yon.y > 0);
  assert.ok(kolYonu(0, -40, 50).yon.y < 0);
  assert.equal(kolYonu(40, 0, 50).yon.y, 0);
});

test('başparmak ölü bölgede de parmağı izler (yarıçapla sınırlı)', () => {
  const k = kolYonu(3, 0, 50);
  yakin(k.parmak.x, 3);
  assert.equal(k.yon.x, 0);
});

test('geçersiz girdi güvenli: sıfır yön', () => {
  assert.deepEqual(kolYonu(10, 10, 0).yon, { x: 0, y: 0 });
  assert.deepEqual(kolYonu(NaN, 1, 50).yon, { x: 0, y: 0 });
});
