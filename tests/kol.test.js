/** Sanal kol matematiğinin (js/kural/kol.js) birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yeniOyun, durumAl, adim } from '../js/oyun.js';
import { kontrol, yonAyarla, ekranYonAyarla } from '../js/kontrol.js';
import { kolYonu, kolSurus, OLU_BOLGE, DONUS_BOLGE } from '../js/kural/kol.js';

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

test('klavye ve sanal kol birbirini sıfırlamaz', async () => {
  const { kontrol, yonAyarla, kullanAyarla } = await import('../js/kontrol.js');
  yonAyarla(1, 0, 'kol');
  yonAyarla(0, -1, 'klavye');
  assert.deepEqual(kontrol.yon, { x: 1, y: -1 });
  yonAyarla(0, 0, 'klavye');
  assert.deepEqual(kontrol.yon, { x: 1, y: 0 });
  yonAyarla(0, 0, 'kol');
  kullanAyarla(true, 'klavye');
  kullanAyarla(true, 'dokunmatik');
  kullanAyarla(false, 'klavye');
  assert.equal(kontrol.kullan, true);
  kullanAyarla(false, 'dokunmatik');
  assert.equal(kontrol.kullan, false);
});

test('kolSurus: hedef önündeyse düz ileri, kol bırakılınca durur', () => {
  assert.deepEqual(kolSurus(0, 1, 0), { gaz: 1, donus: 0 }); // doğuya bakıyor, kol sağda
  assert.deepEqual(kolSurus(1.2, 0, 0), { gaz: 0, donus: 0 });
  const yari = kolSurus(0, 0.5, 0);
  yakin(yari.gaz, 0.5);
  yakin(yari.donus, 0);
});

test('kolSurus: kol ekran yönlüdür; araç hedef yöne doğru döner', () => {
  // Doğuya bakan araç, kol yukarı (ekranda y negatif): sol (saat yönünün tersi) döner.
  const yukari = kolSurus(0, 0, -1);
  assert.equal(yukari.donus, -1);
  yakin(yukari.gaz, 0); // 90° ötesinde gaz yok: yerinde döner
  // Kol aşağı: saat yönü.
  assert.equal(kolSurus(0, 0, 1).donus, 1);
  // Küçük sapma orantılı dönüş verir, gaz neredeyse tam.
  const az = kolSurus(0, Math.cos(0.3), Math.sin(0.3));
  yakin(az.donus, 0.3 / DONUS_BOLGE);
  assert.ok(az.gaz > 0.95);
  // Arkaya: yerinde döner, geri gitmez.
  const geri = kolSurus(0, -1, 0);
  assert.equal(geri.gaz, 0);
  assert.equal(Math.abs(geri.donus), 1);
});

test('kolSurus: açı sarması en kısa yönü seçer', () => {
  // Araç neredeyse batıya bakıyor (3.0 rad), hedef batının öte yanı (-3.0 rad): kısa yol + yön.
  assert.ok(kolSurus(3.0, Math.cos(-3.0), Math.sin(-3.0)).donus > 0);
  assert.ok(kolSurus(-3.0, Math.cos(3.0), Math.sin(3.0)).donus < 0);
});

test('oyunda: traktördeyken kol yukarı = traktör ekranda yukarı gider', () => {
  yeniOyun('kol-sur', 'normal');
  const d = durumAl();
  d.tarla.h.fill(0);
  const m = d.makineler.find((x) => x.tur === 'traktor');
  Object.assign(m, { x: 100.5, y: 80.5, yon: 0, yakit: 1 });
  Object.assign(d.karakter, { x: 100.5, y: 80.5, yon: 0 });
  let t = 1000;
  adim(t);
  kontrol.binIste = true;
  adim((t += 16));
  assert.equal(d.karakter.makine, m);
  yonAyarla(0, -1, 'kol');
  ekranYonAyarla(0, -1);
  for (let i = 0; i < 180; i++) adim((t += 1000 / 60));
  yonAyarla(0, 0, 'kol');
  ekranYonAyarla(0, 0);
  assert.ok(m.y < 70, `traktör yukarı gitmedi: y=${m.y}`);
  yakin(m.yon, -Math.PI / 2, 0.2);
  assert.ok(Math.abs(m.x - 100.5) < 8, `yana kaydı: x=${m.x}`);
  kontrol.binIste = true;
  adim((t += 16));
});
