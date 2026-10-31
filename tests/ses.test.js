/** Ses desenleri ve hız sınırlayıcının birim testleri (DOM/WebAudio yok). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEVIYELER } from '../js/kural/araclar.js';
import {
  bipDeseni, bipZamanlari, hizSinirlayici, kazimDuzeyi, sessizMi, sessizKaydet,
} from '../js/ozellik/ses-desen.js';

test('her dedektör seviyesinin deseni var; sıcaklıkla bip sayısı, perde ve hız artar', () => {
  const desenler = [...SEVIYELER].reverse().map((s) => bipDeseni(s)); // Soğuk → Yanıyor
  for (let i = 1; i < desenler.length; i++) {
    assert.ok(desenler[i].adet > desenler[i - 1].adet);
    assert.ok(desenler[i].frekans > desenler[i - 1].frekans);
  }
  assert.equal(desenler[0].adet, 1);
  assert.ok(desenler[3].aralikMs < desenler[1].aralikMs);
});

test('bilinmeyen ad mesafeye göre eşlenir, hiçbiri yoksa soğuk', () => {
  assert.equal(bipDeseni({ ad: '?', mesafe: 3 }), bipDeseni({ ad: 'Yanıyor!' }));
  assert.equal(bipDeseni({ ad: '?', mesafe: 20 }), bipDeseni({ ad: 'Ilık' }));
  assert.equal(bipDeseni({ ad: '?', mesafe: Infinity }), bipDeseni({ ad: 'Soğuk' }));
  assert.equal(bipDeseni(undefined), bipDeseni({ ad: 'Soğuk' }));
});

test('bip zamanları sıfırdan başlar ve aralıklıdır', () => {
  assert.deepEqual(bipZamanlari({ adet: 3, aralikMs: 100 }), [0, 100, 200]);
  assert.deepEqual(bipZamanlari({ adet: 1, aralikMs: 0 }), [0]);
});

test('hız sınırlayıcı aralıktan sık geçit vermez', () => {
  const izin = hizSinirlayici(80);
  assert.equal(izin(1000), true);
  assert.equal(izin(1030), false);
  assert.equal(izin(1079), false);
  assert.equal(izin(1080), true);
  assert.equal(izin(1100), false);
});

test('kazım düzeyi miktarla artar ve 0.15..1 arasında kalır', () => {
  assert.ok(kazimDuzeyi(1) < kazimDuzeyi(10));
  assert.ok(kazimDuzeyi(10) < kazimDuzeyi(100));
  assert.ok(kazimDuzeyi(0) >= 0.15 && kazimDuzeyi(1e9) <= 1);
  assert.ok(kazimDuzeyi(NaN) >= 0.15);
});

test('sessiz tercihi depoya yazılır ve okunur; bozuk depo sesi açık bırakır', () => {
  const m = new Map();
  const depo = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(sessizMi(depo), false);
  sessizKaydet(depo, true);
  assert.equal(sessizMi(depo), true);
  sessizKaydet(depo, false);
  assert.equal(sessizMi(depo), false);
  const bozuk = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const eski = console.error;
  console.error = () => {};
  try {
    assert.equal(sessizMi(bozuk), false);
    sessizKaydet(bozuk, true);
  } finally {
    console.error = eski;
  }
});
