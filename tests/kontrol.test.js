/** Kontrol durumu (js/kontrol.js): kaynakların birleşmesi ve hepsini bırakma (menü açılışı). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  kontrol, yonAyarla, kullanAyarla, ekranYonAyarla, kontrolSifirla,
} from '../js/kontrol.js';

test('kontrolSifirla: bütün kaynaklar, hedef ve istek bırakılır; sonra yeni girdi çalışır', () => {
  yonAyarla(1, 0, 'klavye');
  yonAyarla(0, 1, 'kol');
  kullanAyarla(true, 'klavye');
  kullanAyarla(true, 'dokunmatik');
  ekranYonAyarla(0.5, -0.5);
  Object.assign(kontrol, { hedef: { x: 3, y: 4 }, binIste: true });
  kontrolSifirla();
  assert.deepEqual(kontrol.yon, { x: 0, y: 0 });
  assert.deepEqual(kontrol.ekranYon, { x: 0, y: 0 });
  assert.equal(kontrol.kullan, false);
  assert.equal(kontrol.hedef, null);
  assert.equal(kontrol.binIste, false);
  // Eski kaynaklar geri gelmez: tek kaynak bırakılınca toplam yine sıfır.
  yonAyarla(0, -1, 'kol');
  assert.deepEqual(kontrol.yon, { x: 0, y: -1 });
  yonAyarla(0, 0, 'kol');
  assert.deepEqual(kontrol.yon, { x: 0, y: 0 });
  kullanAyarla(false, 'klavye');
  assert.equal(kontrol.kullan, false);
});
