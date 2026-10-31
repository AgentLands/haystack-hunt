/** Akış sayacı ve temizlik yüzdesi kurallarının testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSLUK_MS, DOLMA_SN, SONME_SN, yeniAkis, akisSeviyesi, akisOlayi, akisAksadi, akisPerdesi,
} from '../js/kural/akis.js';
import { temizYuzde, yuzdeYaz } from '../js/kural/ilerleme.js';
import { tarlaKur } from '../js/kural/tarla.js';

/** 60 Hz kazı: ms boyunca her ~16 ms'de bir olay. */
function kaz(akis, bas, sureMs) {
  let a = akis;
  for (let t = bas; t <= bas + sureMs; t += 16) a = akisOlayi(a, t);
  return a;
}

test('yeni akış sıfırdır', () => {
  assert.equal(akisSeviyesi(yeniAkis(), 5000), 0);
});

test('kesintisiz kazı seviyeyi yükseltir ve tavanda kalır', () => {
  const a = kaz(yeniAkis(), 0, 3000);
  assert.ok(akisSeviyesi(a, 3000) > 0.4 && akisSeviyesi(a, 3000) < 0.6, 'yarı yol');
  const dolu = kaz(a, 3016, DOLMA_SN * 1000);
  assert.equal(akisSeviyesi(dolu, 3016 + DOLMA_SN * 1000), 1);
});

test('tek olay (ritim yok) seviyeyi yükseltmez', () => {
  const a = akisOlayi(yeniAkis(), 1000);
  assert.equal(a.seviye, 0);
  const b = akisOlayi(a, 1000 + BOSLUK_MS + 200);
  assert.equal(b.seviye, 0, 'boşluk büyükse ritim kopmuştur');
});

test('ara verince boşluktan sonra söner', () => {
  const a = kaz(yeniAkis(), 0, 4000);
  const son = a.son;
  const tepe = akisSeviyesi(a, son);
  assert.equal(akisSeviyesi(a, son + BOSLUK_MS), tepe, 'boşluk içinde değişmez');
  const yarim = akisSeviyesi(a, son + BOSLUK_MS + (SONME_SN * 1000) / 2);
  assert.ok(yarim < tepe && yarim > 0);
  assert.equal(akisSeviyesi(a, son + BOSLUK_MS + SONME_SN * 1000 + 1), 0);
});

test('kopan ritim sönmüş seviyeden yeniden başlar', () => {
  const a = kaz(yeniAkis(), 0, 4000);
  const beklemeSonu = a.son + BOSLUK_MS + SONME_SN * 1000 + 100;
  const b = akisOlayi(a, beklemeSonu);
  assert.equal(b.seviye, 0);
});

test('çivi aksaması seviyeyi yarıya indirir', () => {
  const a = kaz(yeniAkis(), 0, 3000);
  const once = akisSeviyesi(a, a.son);
  const b = akisAksadi(a, a.son);
  assert.ok(Math.abs(akisSeviyesi(b, b.son) - once / 2) < 1e-9);
});

test('akış perdesi 1 ile 1,18 arasında ve sınırlı', () => {
  assert.equal(akisPerdesi(0), 1);
  assert.ok(Math.abs(akisPerdesi(1) - 1.18) < 1e-9);
  assert.equal(akisPerdesi(5), akisPerdesi(1));
  assert.equal(akisPerdesi(-1), 1);
});

test('akış puana bağlı değil: kural dosyası oyun durumunu bilmez', () => {
  const a = kaz(yeniAkis(), 0, 2000);
  assert.deepEqual(Object.keys(a).sort(), ['seviye', 'son']);
});

test('temizYuzde: kaldırılan / başlangıç, 0..100, 0,1 basamak', () => {
  const t = tarlaKur(12345);
  assert.ok(t.baslangicToplam > 0);
  assert.equal(temizYuzde(t), 0);
  t.kaldirilan = t.baslangicToplam / 2;
  assert.equal(temizYuzde(t), 50);
  t.kaldirilan = t.baslangicToplam * 3;
  assert.equal(temizYuzde(t), 100);
  t.kaldirilan = -4;
  assert.equal(temizYuzde(t), 0);
  assert.equal(temizYuzde({ baslangicToplam: 0, kaldirilan: 5 }), 0);
  assert.equal(temizYuzde({ baslangicToplam: 10000, kaldirilan: 247 }), 2.4);
  assert.equal(temizYuzde({ baslangicToplam: 10000, kaldirilan: 3799 }), 37.9);
});

test('yuzdeYaz: 10 altı ondalıklı, üstü tam sayı', () => {
  assert.equal(yuzdeYaz(0), '%0,0');
  assert.equal(yuzdeYaz(2.4), '%2,4');
  assert.equal(yuzdeYaz(9.9), '%9,9');
  assert.equal(yuzdeYaz(37.9), '%37');
  assert.equal(yuzdeYaz(100), '%100');
});
