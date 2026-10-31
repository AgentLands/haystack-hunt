/** Yeni tarla koruması: yarış sürerken onay ister, onayda yarıştan çıkar, yoksa karışmaz. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { korumaKaydet, yeniTarlaIzni } from '../js/ozellik/koruma.js';

function onayla(cevap) {
  const sorular = [];
  globalThis.window = { confirm: (m) => { sorular.push(m); return cevap; } };
  return sorular;
}

test('koruma kayıtlı değilse ya da yarış sürmüyorsa sormadan izin verir', () => {
  const sorular = onayla(false);
  assert.equal(yeniTarlaIzni(), true);
  korumaKaydet({ suruyor: () => false, ayril: () => assert.fail('ayrılmamalı') });
  assert.equal(yeniTarlaIzni(), true);
  assert.equal(sorular.length, 0);
});

test('yarış sürerken onaylanmazsa izin verilmez ve yarıştan çıkılmaz', () => {
  const sorular = onayla(false);
  let ayrildi = 0;
  korumaKaydet({ suruyor: () => true, ayril: () => { ayrildi += 1; } });
  assert.equal(yeniTarlaIzni(), false);
  assert.equal(sorular.length, 1);
  assert.equal(ayrildi, 0);
});

test('yarış sürerken onaylanırsa yarıştan ayrılır ve izin verilir', () => {
  onayla(true);
  let ayrildi = 0;
  korumaKaydet({ suruyor: () => true, ayril: () => { ayrildi += 1; } });
  assert.equal(yeniTarlaIzni(), true);
  assert.equal(ayrildi, 1);
});
