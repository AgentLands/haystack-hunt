/**
 * Erişilebilirlik yardımcılarının birim testleri: radyo grubunda ok tuşu gezinmesi
 * (ozellik/radyo-grubu.js radyoHedefi; menüdeki zorluk damgaları).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { radyoHedefi } from '../js/ozellik/radyo-grubu.js';

test('radyo grubu: oklar döngülü gezer, Home/End uçlara gider, diğer tuşlar yok', () => {
  assert.equal(radyoHedefi(0, 3, 'ArrowRight'), 1);
  assert.equal(radyoHedefi(2, 3, 'ArrowDown'), 0);
  assert.equal(radyoHedefi(0, 3, 'ArrowLeft'), 2);
  assert.equal(radyoHedefi(1, 3, 'ArrowUp'), 0);
  assert.equal(radyoHedefi(1, 3, 'Home'), 0);
  assert.equal(radyoHedefi(1, 3, 'End'), 2);
  assert.equal(radyoHedefi(1, 3, ' '), null);
  assert.equal(radyoHedefi(1, 3, 'Enter'), null);
});
