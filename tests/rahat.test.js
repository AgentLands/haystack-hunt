/** Rahat mod: çivi cezası 0, puan kuralı değişmez; durum bayrağı sonuca taşınır. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { civiAl, CIVI_CEZA_MS } from '../js/kural/civi.js';
import { yeniOyun, durumAl, rahatAyarla, rahatMi, sonucOlustur } from '../js/oyun.js';
import { elKullan } from '../js/oyun-arac.js';
import { puanHesapla } from '../js/kural/zorluk.js';

test('civiAl: normalde 10 sn ceza, rahat modda 0', () => {
  assert.equal(civiAl({ alindi: false }), CIVI_CEZA_MS);
  const c = { alindi: false };
  assert.equal(civiAl(c, true), 0);
  assert.equal(c.alindi, true, 'çivi yine alınır');
});

/** Elin altına açıkta bir çivi getirir; çiviyi döndürür. */
function civiHazirla() {
  const d = durumAl();
  d.tarla.h.fill(0);
  const civi = d.tarla.civiler[0];
  civi.z = 0;
  d.baslangic = 5000;
  return civi;
}

test('oyun: rahat bayrağı yeniOyun ile gelir ve çivi süreye ceza eklemez', () => {
  rahatAyarla(false);
  yeniOyun('rahat-deneme', 'normal');
  assert.equal(durumAl().rahat, false);
  let civi = civiHazirla();
  elKullan(durumAl(), { x: civi.x, y: civi.y });
  assert.equal(durumAl().ceza, CIVI_CEZA_MS);
  assert.equal(durumAl().baslangic, 5000 - CIVI_CEZA_MS);

  rahatAyarla(true);
  assert.equal(rahatMi(), true);
  yeniOyun('rahat-deneme', 'normal');
  assert.equal(durumAl().rahat, true);
  civi = civiHazirla();
  elKullan(durumAl(), { x: civi.x, y: civi.y });
  assert.equal(civi.alindi, true);
  assert.equal(durumAl().ceza, 0);
  assert.equal(durumAl().baslangic, 5000, 'süre kaymadı');
  assert.equal(sonucOlustur(9000).rahat, true);
  assert.equal(sonucOlustur(9000).cezaMs, 0);
  rahatAyarla(false);
});

test('oyun: secenek.rahat genel ayarı geçer (yarış rahat açılmaz)', () => {
  rahatAyarla(true);
  yeniOyun('yaris', 'normal', { rahat: false });
  assert.equal(durumAl().rahat, false);
  yeniOyun('yaris', 'normal');
  assert.equal(durumAl().rahat, true);
  rahatAyarla(false);
});

test('puan kuralı rahat moddan etkilenmez', () => {
  const girdi = { sureMs: 60000, kaldirilan: 500, kullanilanHak: 1 };
  assert.equal(puanHesapla(girdi, 'normal'), 2 * (1000 - 120 - 5 - 50));
});
