/** Hareket efektlerinin saf hesaplarının birim testleri (DOM/parçacık havuzu yok). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adimEfekti, arkaTekerlekler, ayakKaymasi, dunyaNoktasi, izAlfa, koniNoktasi, tozHizi,
  uretimAdimi, SAMAN_ESIGI, IZ_ESIGI,
} from '../js/ozellik/efekt/hareket-desen.js';

const yakin = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);

test('adım efekti: toprakta toz ve iz yok; samanda çöp, yüksekte iz', () => {
  const toprak = adimEfekti(0);
  assert.equal(toprak.tur, 'toz');
  assert.equal(toprak.iz, false);
  const alcak = adimEfekti(SAMAN_ESIGI + 1);
  assert.equal(alcak.tur, 'saman');
  assert.equal(alcak.iz, false);
  const yuksek = adimEfekti(80);
  assert.equal(yuksek.tur, 'saman');
  assert.equal(yuksek.iz, true);
  assert.ok(yuksek.adet > alcak.adet && yuksek.adet <= 5);
  assert.ok(yuksek.izAlfa >= alcak.izAlfa && yuksek.izAlfa <= 0.32);
  assert.equal(adimEfekti(IZ_ESIGI).iz, false);
  assert.equal(adimEfekti(NaN).tur, 'toz');
});

test('ayak kayması yöne diktir ve ayaklar karşılıklı yandadır', () => {
  const sol = ayakKaymasi(0, 0);
  const sag = ayakKaymasi(0, 1);
  yakin(sol.x, 0);
  yakin(sol.y, -0.28);
  yakin(sag.y, 0.28);
  const k = ayakKaymasi(Math.PI / 2, 0);
  assert.ok(Math.abs(k.x - 0.28) < 1e-9 && Math.abs(k.y) < 1e-9);
});

test('arka tekerlekler gövdenin arkasında, iki yanda', () => {
  const [a, b] = arkaTekerlekler(4, 2.6);
  assert.ok(a[0] < 0 && b[0] < 0);
  assert.equal(a[1], -b[1]);
  assert.ok(Math.abs(a[1]) < 2.6 / 2);
});

test('dünya noktası makine yönüne göre döner', () => {
  const m = { x: 10, y: 20, yon: 0 };
  assert.deepEqual(dunyaNoktasi(m, 2, 1), { x: 12, y: 21 });
  const d = dunyaNoktasi({ x: 10, y: 20, yon: Math.PI / 2 }, 2, 1);
  yakin(d.x, 9);
  yakin(d.y, 22);
});

test('iz solması: başta azami, sonda 0, aralıkta azalır; süre dışı 0', () => {
  assert.equal(izAlfa(0, 1000, 0.3), 0.3);
  assert.equal(izAlfa(1000, 1000, 0.3), 0);
  assert.equal(izAlfa(-5, 1000, 0.3), 0);
  assert.equal(izAlfa(10, 0, 0.3), 0);
  assert.ok(izAlfa(250, 1000, 0.3) > izAlfa(500, 1000, 0.3));
  assert.ok(izAlfa(500, 1000, 0.3) > izAlfa(900, 1000, 0.3));
});

test('üretim adımı kesri biriktirir, hız 0 ise sıfırlar', () => {
  let u = uretimAdimi(0, 30, 1 / 60); // 0.5/kare
  assert.equal(u.n, 0);
  u = uretimAdimi(u.birikim, 30, 1 / 60);
  assert.equal(u.n, 1);
  yakin(u.birikim, 0);
  assert.equal(uretimAdimi(0.9, 0, 0.016).birikim, 0);
  assert.equal(uretimAdimi(0, 100, 0.1).n, 10);
});

test('koni: yönde ileri uzanır, uzaklık menzile sınırlı, yanlar mesafeyle açılır', () => {
  const orta = koniNoktasi(0, 10, 1, 0.5);
  yakin(orta.dx, 10);
  yakin(orta.dy, 0);
  const yakinNokta = koniNoktasi(0, 10, 0, 0.5);
  yakin(yakinNokta.uzaklik, 3);
  const yan = koniNoktasi(0, 10, 1, 1);
  assert.ok(yan.dy > 0 && yan.dy <= 10 * 0.35 + 1e-9);
  const ters = koniNoktasi(Math.PI, 10, 1, 0.5);
  yakin(ters.dx, -10);
  assert.ok(koniNoktasi(0, 10, 5, -3).uzaklik <= 10);
});

test('toz hızı: duran makinede 0, hızla artar', () => {
  assert.equal(tozHizi(0, 15), 0);
  assert.equal(tozHizi(0.5, 15), 0);
  assert.ok(tozHizi(15, 15) > tozHizi(3, 15));
  assert.equal(tozHizi(-15, 15), tozHizi(15, 15));
  assert.equal(tozHizi(5, 0), 0);
});
