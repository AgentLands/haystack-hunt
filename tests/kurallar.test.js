/** Tarla, iğne ve araç kurallarının birim testleri (node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/boyut.js';
import { tarlaKur, cokert, toplamSaman } from '../js/tarla.js';
import { igneAcikMi, igneDerinligi, igneHucreleri } from '../js/igne.js';
import { elIleAl, tirmikla, dedektorOku, igneyiAlabilirMi } from '../js/araclar.js';
import { metindenTohum, gununEtiketi } from '../js/rastgele.js';

test('aynı tohum aynı tarlayı ve iğneyi üretir', () => {
  const a = tarlaKur(metindenTohum('2026-10-31'));
  const b = tarlaKur(metindenTohum('2026-10-31'));
  assert.deepEqual(a.h, b.h);
  assert.deepEqual(a.igne, b.igne);
  const c = tarlaKur(metindenTohum('2026-11-01'));
  assert.notDeepEqual(a.h, c.h);
});

test('iğne başta gömülü ve tarlanın içinde', () => {
  for (const etiket of ['a', 'b', 'c', 'd', 'e']) {
    const t = tarlaKur(metindenTohum(etiket));
    assert.ok(igneDerinligi(t) > 0, etiket);
    assert.ok(t.igne.x >= 0 && t.igne.x < GENISLIK && t.igne.y >= 0 && t.igne.y < YUKSEKLIK);
  }
});

test('yığın kayması samanı korur', () => {
  const t = tarlaKur(1);
  const once = toplamSaman(t);
  const i = 80 * GENISLIK + 120;
  t.h[i] += 500;
  for (let k = 0; k < 50; k++) cokert(t);
  assert.equal(toplamSaman(t), once + 500);
  assert.ok(t.h[i] < 300);
});

test('el samanı alır ve sayar', () => {
  const t = tarlaKur(2);
  const once = toplamSaman(t);
  const alinan = elIleAl(t, t.igne.x, t.igne.y);
  assert.ok(alinan > 0);
  assert.equal(toplamSaman(t), once - alinan);
  assert.equal(t.kaldirilan, alinan);
});

test('tırmık içerideki samanı korur, dışarı ittiğini sayar', () => {
  const t = tarlaKur(3);
  const once = toplamSaman(t);
  assert.equal(tirmikla(t, 120, 80, 1, 0), 0);
  assert.equal(toplamSaman(t), once);
  for (let y = 0; y < YUKSEKLIK; y++) t.h[y * GENISLIK + GENISLIK - 2] = 30;
  const ara = toplamSaman(t);
  const disari = tirmikla(t, GENISLIK - 2, 80, 1, 0);
  assert.ok(disari > 0);
  assert.equal(toplamSaman(t), ara - disari);
});

test('dedektör uzaklığa göre seviye verir', () => {
  const t = tarlaKur(4);
  assert.equal(dedektorOku(t, t.igne.x, t.igne.y).ad, 'Yanıyor!');
  const uzak = t.igne.x > GENISLIK / 2 ? 0 : GENISLIK - 1;
  assert.equal(dedektorOku(t, uzak, t.igne.y).ad, 'Soğuk');
});

test('iğne yalnız açığa çıkınca alınır', () => {
  const t = tarlaKur(5);
  assert.equal(igneyiAlabilirMi(t, t.igne.x, t.igne.y), false);
  for (const i of igneHucreleri(t.igne)) t.h[i] = t.igne.z;
  assert.ok(igneAcikMi(t));
  assert.equal(igneyiAlabilirMi(t, t.igne.x, t.igne.y), true);
  assert.equal(igneyiAlabilirMi(t, t.igne.x + 20, t.igne.y), false);
});

test('günün etiketi yerel tarihten', () => {
  assert.equal(gununEtiketi(new Date(2026, 0, 5)), '2026-01-05');
});
