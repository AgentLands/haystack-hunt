/**
 * Yarış konum yardımcıları (saf): yerel durumdan konum iletisi kurma ve gelen konumların
 * gecikmeli doğrusal ara değerlemesi (js/ozellik/yaris-konum.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  konumIletisi, anlikEkle, ornekle, aciAra, GONDERIM_ARALIGI, BOSLUK,
} from '../js/ozellik/yaris-konum.js';

const durumKur = (karakter, arac = 'el') => ({ karakter, arac, tarla: { kaldirilan: 12.4 } });
const yurur = { x: 50.123, y: 20, yon: 0.5, hareketli: true, kullaniyor: false, makine: null };

test('konumIletisi: yuvarlar, sınırlar, makineyi ve aracı taşır', () => {
  const ileti = konumIletisi(durumKur(yurur, 'tirmik'));
  assert.deepEqual(ileti, {
    t: 'imlec', x: 50.12, y: 20, yon: 0.5, hareketli: true, kullan: false, arac: 'tirmik',
    makine: null, saman: 12,
  });
  const binmis = konumIletisi(durumKur({
    ...yurur, x: 999, y: -4, yon: 7, makine: { tur: 'traktor', yon: 7, yuk: 1.5 },
  }));
  assert.equal(binmis.x, 240);
  assert.equal(binmis.y, 0);
  assert.equal(binmis.yon, 0.72);
  assert.deepEqual(binmis.makine, { tur: 'traktor', yon: 0.72, yuk: 1 });
  assert.equal(konumIletisi({ karakter: null }), null);
});

test('aciAra: en kısa yoldan döner', () => {
  assert.ok(Math.abs(aciAra(3, -3, 0.5) - (3 + (2 * Math.PI - 6) / 2)) < 1e-9);
  assert.equal(aciAra(0, 1, 0.5), 0.5);
});

test('ornekle: anlıklar arasında doğrusal ara değer, uçlarda tutar', () => {
  const g = [];
  anlikEkle(g, { x: 0, y: 0, yon: 0, hareketli: true }, 1000);
  anlikEkle(g, { x: 10, y: 20, yon: 1, hareketli: true }, 1100);
  assert.equal(ornekle([], 5), null);
  assert.equal(ornekle(g, 900).x, 0);
  const o = ornekle(g, 1050);
  assert.deepEqual([o.x, o.y, o.yon], [5, 10, 0.5]);
  assert.equal(ornekle(g, 5000).x, 10, 'ileri tahmin yok: son konumda bekler');
});

test('ornekle: makine yönü ve yükü ara değerlenir', () => {
  const g = [];
  anlikEkle(g, { x: 0, y: 0, makine: { tur: 'balya', yon: 0, yuk: 0 } }, 0);
  anlikEkle(g, { x: 4, y: 0, makine: { tur: 'balya', yon: 1, yuk: 1 } }, 100);
  const o = ornekle(g, 50);
  assert.deepEqual([o.x, o.makine.tur, o.makine.yon, o.makine.yuk], [2, 'balya', 0.5, 0.5]);
});

test('anlikEkle: uzun sessizlikten sonra eski yerde bekler, kaymaz; geçmiş sınırlı', () => {
  const g = [];
  anlikEkle(g, { x: 0, y: 0, hareketli: false }, 0);
  anlikEkle(g, { x: 10, y: 0, hareketli: true }, BOSLUK + 5000);
  // Yeni konuma gelmeden hemen önce hâlâ eski yerde.
  const once = ornekle(g, BOSLUK + 5000 - GONDERIM_ARALIGI - 1);
  assert.equal(once.x, 0);
  assert.equal(ornekle(g, BOSLUK + 5000).x, 10);
  for (let i = 0; i < 100; i++) anlikEkle(g, { x: i, y: 0 }, 10_000 + i * 100);
  assert.ok(g.length <= 16);
});
