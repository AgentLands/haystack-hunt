/**
 * HUD metinleri (js/hud.js): süre biçimi ve tarla lot etiketi (günün tarlası tarihli).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sureMetni, etiketMetni } from '../js/hud.js';
import { gununEtiketi } from '../js/kural/rastgele.js';

test('sureMetni dakika:saniye yazar', () => {
  assert.equal(sureMetni(0), '0:00');
  assert.equal(sureMetni(65_400), '1:05');
});

test('etiketMetni: tohumlu tarla lot numarası ve zorlukla', () => {
  assert.equal(etiketMetni('deneme', 'normal'), 'Tarla No. deneme · Normal');
  assert.equal(etiketMetni('abc', 'zor'), 'Tarla No. abc · Zor');
});

test('etiketMetni: günün tarlası gün ve ay adıyla', () => {
  const metin = etiketMetni(gununEtiketi(), 'kolay');
  assert.match(metin, /^Günün tarlası · \d{1,2} [A-ZÇŞÖÜİ][a-zçğıöşü]+ · Kolay$/);
  // Tarih biçimli ama bugün olmayan etiket, sıradan tarla numarasıdır.
  assert.equal(etiketMetni('2000-01-02', 'normal'), 'Tarla No. 2000-01-02 · Normal');
});
