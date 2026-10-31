/** Karakter kuralının (js/kural/karakter.js) ve oyundaki karakterin birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { tarlaKur, yukseklik } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import {
  karakterKur, karakterYuru, karakterHizi, aracNoktasi, karakterNoktasi, erisimde,
  erisimeCek, TEMEL_HIZ, TIRMANMA, ERISIM, ARAC_UZAKLIK,
} from '../js/kural/karakter.js';
import { yeniOyun, durumAl, adim, bas, birak, aracSec } from '../js/oyun.js';
import { kontrol, yonAyarla } from '../js/kontrol.js';
import { dinle } from '../js/olaylar.js';

/** Düz, boş tarla (tohum yalnız iğne/çivi alanları için). */
function duzTarla() {
  const t = tarlaKur(metindenTohum('duz'));
  t.h.fill(0);
  return t;
}

function karakter(x, y, yon = 0) {
  return { x, y, yon, hareketli: false, adimFaz: 0, z: 0, kullaniyor: false, makine: null };
}

const yakin = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('yukseklik dünya noktasının hücresini okur, tarla dışı 0', () => {
  const t = duzTarla();
  t.h[10 * GENISLIK + 20] = 7;
  assert.equal(yukseklik(t, 20.0, 10.0), 7);
  assert.equal(yukseklik(t, 20.99, 10.5), 7);
  assert.equal(yukseklik(t, 21.0, 10.5), 0);
  assert.equal(yukseklik(t, -1, 5), 0);
  assert.equal(yukseklik(t, GENISLIK + 3, 5), 0);
});

test('kurulum deterministik: garajın önünde, alçak ve engelsiz hücre', () => {
  const t = tarlaKur(metindenTohum('k1'));
  const garaj = { x: 4, y: 80, yon: 0 };
  const a = karakterKur(t, garaj);
  assert.deepEqual(a, karakterKur(t, garaj));
  assert.ok(Math.hypot(a.x - 12, a.y - 80) <= 6 * Math.SQRT2 + 1);
  assert.equal(a.makine, null);
  assert.equal(a.z, yukseklik(t, a.x, a.y));
  const d = duzTarla();
  const engel = { x: 12.5, y: 80.5, r: 3 };
  const b = karakterKur(d, garaj, [engel]);
  assert.ok(Math.hypot(b.x - engel.x, b.y - engel.y) >= engel.r + 0.6);
});

test('düz zeminde TEMEL_HIZ ile yürür, yön ve adım fazı güncellenir', () => {
  const t = duzTarla();
  const k = karakter(50.5, 50.5);
  let adimlar = 0;
  for (let i = 0; i < 60; i++) if (karakterYuru(t, k, 0, 1, 1 / 60).adim) adimlar++;
  yakin(k.y, 50.5 + TEMEL_HIZ, 1e-6);
  yakin(k.yon, Math.PI / 2);
  assert.ok(k.hareketli);
  assert.ok(adimlar >= 10, `adım sayısı ${adimlar}`);
  // Çapraz istek kırpılır: hız TEMEL_HIZ'ı aşmaz.
  const c = karakter(50.5, 50.5);
  karakterYuru(t, c, 1, 1, 0.1);
  yakin(Math.hypot(c.x - 50.5, c.y - 50.5), TEMEL_HIZ * 0.1);
  karakterYuru(t, c, 0, 0, 0.1);
  assert.equal(c.hareketli, false);
});

test('samanda yavaşlar', () => {
  assert.ok(karakterHizi(50) < karakterHizi(0) / 2);
  const t = duzTarla();
  t.h.fill(40);
  const k = karakter(50.5, 50.5);
  k.z = 40;
  karakterYuru(t, k, 1, 0, 0.1);
  yakin(k.x - 50.5, karakterHizi(40) * 0.1);
  assert.equal(k.z, 40);
});

test('tırmanma eşiği: yüksek duvar o eksende durdurur, diğer eksende kayar', () => {
  const t = duzTarla();
  for (let y = 0; y < YUKSEKLIK; y++) t.h[y * GENISLIK + 60] = TIRMANMA + 1;
  const k = karakter(59.5, 50.5);
  let sonuc;
  for (let i = 0; i < 30; i++) sonuc = karakterYuru(t, k, 1, 1, 1 / 60);
  assert.ok(k.x < 60, 'duvarı aştı');
  assert.ok(k.y > 52, 'duvar boyunca kaymadı');
  assert.equal(sonuc.engel, true);
  // Eşikte (TIRMANMA kat) tırmanabilir; inmek her zaman serbest.
  for (let y = 0; y < YUKSEKLIK; y++) t.h[y * GENISLIK + 60] = TIRMANMA;
  for (let i = 0; i < 30; i++) karakterYuru(t, k, 1, 0, 1 / 60);
  assert.ok(k.x > 61);
});

test('tarla sınırını ve engel dairesini geçmez', () => {
  const t = duzTarla();
  const k = karakter(1, 1);
  for (let i = 0; i < 60; i++) karakterYuru(t, k, -1, -1, 1 / 60);
  assert.ok(k.x >= 0.6 && k.y >= 0.6);
  const e = { x: 30, y: 30.5, r: 2 };
  const b = karakter(25.5, 30.5);
  for (let i = 0; i < 120; i++) karakterYuru(t, b, 1, 0, 1 / 60, [e]);
  assert.ok(Math.hypot(b.x - e.x, b.y - e.y) >= e.r + 0.6 - 1e-9);
});

test('araç noktası önde, erişim ve erişime çekme', () => {
  const k = karakter(20.5, 30.5, 0);
  const p = aracNoktasi(k);
  yakin(p.x, 20 + ARAC_UZAKLIK);
  yakin(p.y, 30);
  assert.deepEqual(karakterNoktasi(k), { x: 20, y: 30 });
  assert.equal(erisimde(k, { x: 20 + ERISIM, y: 30 }), true);
  assert.equal(erisimde(k, { x: 20 + ERISIM + 1, y: 30 }), false);
  const c = erisimeCek(k, { x: 30, y: 30 });
  yakin(c.x, 20 + ERISIM);
  yakin(c.y, 30);
});

test('oyunda: kontrol.yon karakteri yürütür, hedefe tıkla-yürü varınca durur', () => {
  yeniOyun('yuru', 'normal');
  const d = durumAl();
  const k = d.karakter;
  k.x = 120.5;
  k.y = 80.5;
  d.tarla.h.fill(0);
  let t = 1000;
  adim(t);
  yonAyarla(1, 0);
  for (let i = 0; i < 30; i++) adim((t += 1000 / 60));
  yonAyarla(0, 0);
  assert.ok(k.x > 125, `x ${k.x}`);
  assert.notEqual(d.baslangic, null);
  assert.equal(bas({ x: 140, y: 80 }, t), false); // erişim dışı: tıkla-yürü
  kontrol.hedef = { x: 140, y: 80 };
  for (let i = 0; i < 200 && kontrol.hedef; i++) adim((t += 1000 / 60));
  assert.equal(kontrol.hedef, null);
  assert.ok(Math.hypot(k.x - 140.5, k.y - 80.5) < 0.5);
});

/** 60 Hz kare süresi (ms): el kazısı saniyede sabit hızla biriktiği için tam 1/60 kullanılır. */
const KARE = 1000 / 60;

test('oyunda: Boşluk el ile önündeki samanı kazar, imleç araç noktasını gösterir', () => {
  yeniOyun('kaz', 'normal');
  const d = durumAl();
  const k = d.karakter;
  Object.assign(k, { x: 100.5, y: 70.5, yon: 0 });
  d.tarla.h.fill(10);
  aracSec('el');
  const kazilar = [];
  const bitir = dinle('kazildi', (v) => kazilar.push(v));
  kontrol.kullan = true;
  adim(0);
  adim(KARE);
  kontrol.kullan = false;
  bitir();
  assert.ok(kazilar.length >= 1);
  yakin(kazilar[0].x, 100 + ARAC_UZAKLIK);
  assert.equal(d.tarla.h[70 * GENISLIK + 101], 8);
  adim(2 * KARE);
  yakin(d.imlec.x, 100 + ARAC_UZAKLIK);
  // Fare erişimdeyse orada kazar; bırakınca durur.
  adim(3 * KARE);
  assert.equal(bas({ x: 98, y: 70 }, 3 * KARE), true);
  adim(4 * KARE);
  birak();
  adim(5 * KARE);
  assert.equal(d.tarla.h[70 * GENISLIK + 98], 9);
});
