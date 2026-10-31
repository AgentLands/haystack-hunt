/** Kamera dönüşüm matematiğinin (js/kural/gorunum.js) birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  varsayilan, sinirla, odakla, kaydir, merkezle, gorunurAlan,
  ekrandanDunyaya, ekrandanHucre, dunyadanEkrana, YAKIN_EN_AZ, YAKIN_EN_COK,
} from '../js/kural/gorunum.js';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';

const yakin = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('varsayılan görünüm eski ekran→hücre çevirisiyle birebir aynı', () => {
  const g = varsayilan();
  assert.deepEqual(g, { z: 1, gx: 0, gy: 0 });
  for (const [fx, fy] of [[0, 0], [0.5, 0.5], [0.999, 0.999], [0.37, 0.81]]) {
    assert.deepEqual(ekrandanHucre(g, fx, fy),
      { x: Math.floor(fx * GENISLIK), y: Math.floor(fy * YUKSEKLIK) });
  }
});

test('sinirla: yakınlaştırma 1–6 arası, alan tarla içinde', () => {
  assert.equal(sinirla({ z: 0.2, gx: 50, gy: 50 }).z, YAKIN_EN_AZ);
  assert.equal(sinirla({ z: 99, gx: 0, gy: 0 }).z, YAKIN_EN_COK);
  assert.deepEqual(sinirla({ z: 1, gx: 30, gy: 30 }), { z: 1, gx: 0, gy: 0 });
  const g = sinirla({ z: 2, gx: 9999, gy: -5 });
  assert.equal(g.gx, GENISLIK / 2);
  assert.equal(g.gy, 0);
  assert.deepEqual(sinirla({ z: NaN, gx: 0, gy: 0 }), varsayilan());
});

test('odakla: imlecin altındaki tarla noktası sabit kalır', () => {
  let g = varsayilan();
  const fx = 0.6;
  const fy = 0.4;
  const once = ekrandanDunyaya(g, fx, fy);
  g = odakla(g, fx, fy, 3);
  yakin(g.z, 3);
  const sonra = ekrandanDunyaya(g, fx, fy);
  yakin(sonra.x, once.x);
  yakin(sonra.y, once.y);
  // ikinci adım, başka bir odak
  const once2 = ekrandanDunyaya(g, 0.2, 0.7);
  g = odakla(g, 0.2, 0.7, 5);
  const sonra2 = ekrandanDunyaya(g, 0.2, 0.7);
  yakin(sonra2.x, once2.x);
  yakin(sonra2.y, once2.y);
});

test('odakla: köşede yakınlaştırınca kenetlenir, sınırı aşmaz', () => {
  const g = odakla(varsayilan(), 0, 0, 4);
  assert.deepEqual(g, { z: 4, gx: 0, gy: 0 });
  const h = odakla(varsayilan(), 1, 1, 4);
  yakin(h.gx, GENISLIK - GENISLIK / 4);
  yakin(h.gy, YUKSEKLIK - YUKSEKLIK / 4);
});

test('uzaklaştırınca görünüm sığdırılmış hâle döner', () => {
  const g = odakla(odakla(varsayilan(), 0.9, 0.9, 5), 0.5, 0.5, 1);
  assert.deepEqual(g, varsayilan());
});

test('kaydir: parmakla aynı yönde, kenetli', () => {
  const g0 = odakla(varsayilan(), 0.5, 0.5, 2);
  const g1 = kaydir(g0, 0.1, 0);
  yakin(g1.gx, g0.gx - (0.1 * GENISLIK) / 2);
  assert.deepEqual(kaydir(varsayilan(), 0.3, 0.3), varsayilan());
  assert.equal(kaydir(g0, 5, 5).gx, 0);
  assert.equal(kaydir(g0, -5, -5).gx, GENISLIK / 2);
});

test('merkezle ve gorunurAlan', () => {
  const g = merkezle({ z: 4, gx: 0, gy: 0 }, 120, 80);
  const a = gorunurAlan(g);
  yakin(a.x + a.en / 2, 120);
  yakin(a.y + a.boy / 2, 80);
  yakin(a.en, GENISLIK / 4);
  const k = merkezle({ z: 4, gx: 0, gy: 0 }, 0, 0);
  assert.equal(k.gx, 0);
  assert.equal(k.gy, 0);
});

test('ekrandanDunyaya ve dunyadanEkrana birbirinin tersi', () => {
  const g = { z: 3.3, gx: 40, gy: 25 };
  const d = ekrandanDunyaya(g, 0.25, 0.75);
  const e = dunyadanEkrana(g, d.x, d.y);
  yakin(e.fx, 0.25);
  yakin(e.fy, 0.75);
});

test('yakın görünümde hücre bulma görünür alana göre', () => {
  const g = odakla(varsayilan(), 0.5, 0.5, 4);
  const c = ekrandanHucre(g, 0.5, 0.5);
  assert.equal(c.x, Math.floor(GENISLIK / 2));
  assert.equal(c.y, Math.floor(YUKSEKLIK / 2));
});
