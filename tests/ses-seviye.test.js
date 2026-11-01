/** Ses seviyeleri, çıkış kırpıcısı, sapma yardımcısı ve ses düzeyi tercihinin birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANA_KAZANC, KATEGORI_DB, VARSAYILAN_DUZEY, dbKazanc, duzeyKaydet, duzeyKazanci, duzeyOku,
  kategoriKazanci, sapmali, yumusakKirpmaEgrisi,
} from '../js/ozellik/ses-seviye.js';
import { hizSinirlayici } from '../js/ozellik/ses-desen.js';
import { kulakDeseni, tikZamani } from '../js/ozellik/kulak-desen.js';

const sahteDepo = (baslangic = {}) => {
  const d = { ...baslangic };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; }, d };
};

test('altı kategori de tanımlı ve kazançları sonlu, pozitif', () => {
  assert.deepEqual(Object.keys(KATEGORI_DB).sort(),
    ['arac', 'arayuz', 'ipucu', 'makine', 'motor', 'ortam']);
  for (const kat of Object.keys(KATEGORI_DB)) {
    const k = kategoriKazanci(kat);
    assert.ok(k > 0 && k < 4, `${kat}: ${k}`);
  }
  assert.throws(() => kategoriKazanci('bilinmeyen'), /Bilinmeyen ses kategorisi/);
});

test('seviye hedefleri: motor ve ortam altta, ipucu öne çıkar', () => {
  assert.ok(KATEGORI_DB.motor < KATEGORI_DB.arac, 'sürekli motor kazıdan kısık');
  assert.ok(KATEGORI_DB.ortam < KATEGORI_DB.ipucu, 'hayvanlar ipucundan kısık');
  assert.ok(KATEGORI_DB.arac <= KATEGORI_DB.ipucu, 'ipucu kazıdan duyulur');
  assert.ok(KATEGORI_DB.motor < KATEGORI_DB.makine, 'motor makine olaylarından kısık');
});

test('dB → kazanç', () => {
  assert.equal(dbKazanc(0), 1);
  assert.ok(Math.abs(dbKazanc(-6) - 0.501) < 0.001);
  assert.ok(Math.abs(dbKazanc(20) - 10) < 1e-9);
});

test('ses düzeyi eğrisi: 0 sessiz, 100 tam, artan ve sınırlı', () => {
  assert.equal(duzeyKazanci(0), 0);
  assert.equal(duzeyKazanci(100), 1);
  assert.equal(duzeyKazanci(500), 1);
  assert.equal(duzeyKazanci(-5), 0);
  assert.equal(duzeyKazanci('abc'), 0);
  assert.equal(duzeyKazanci(50), 0.25);
  let onceki = -1;
  for (let y = 0; y <= 100; y += 5) {
    assert.ok(duzeyKazanci(y) > onceki);
    onceki = duzeyKazanci(y);
  }
  assert.ok(ANA_KAZANC > 0 && ANA_KAZANC <= 1);
});

test('yumuşak kırpıcı: küçükte olduğu gibi, büyükte tavan altında, tek yönlü ve simetrik', () => {
  const e = yumusakKirpmaEgrisi(2001);
  const orta = (e.length - 1) / 2;
  assert.equal(e[orta], 0);
  for (let i = 0; i < e.length; i++) {
    assert.ok(Math.abs(e[i]) < 1, 'çıkış 1\'i geçmez');
    assert.ok(Math.abs(e[i] + e[e.length - 1 - i]) < 1e-6, 'simetri');
    if (i > 0) assert.ok(e[i] >= e[i - 1], 'azalmayan');
  }
  const x = (i) => (i / (e.length - 1)) * 2 - 1;
  const i05 = Math.round(((0.5 + 1) / 2) * (e.length - 1));
  assert.ok(Math.abs(e[i05] - x(i05)) < 1e-6, '0.5 değişmeden geçer');
  assert.ok(e.at(-1) > 0.9 && e.at(-1) < 1, 'tavan ≈ -0.65 dBFS');
});

test('sapmalı: ±oran içinde kalır, r=0.5 tabanı verir, uçlar sınır', () => {
  assert.equal(sapmali(100, 0.2, 0.5), 100);
  assert.ok(Math.abs(sapmali(100, 0.2, 0) - 80) < 1e-9);
  assert.ok(Math.abs(sapmali(100, 0.2, 1) - 120) < 1e-9);
  for (let i = 0; i < 200; i++) {
    const v = sapmali(10, 0.15);
    assert.ok(v >= 8.5 && v <= 11.5);
  }
});

test('hız sınırlayıcı sapma: aralık her geçitten sonra değişir, hiç aralıktan hızlı değil', () => {
  const rs = [0, 1, 0.5];
  let i = 0;
  const izin = hizSinirlayici(100, 0.3, () => rs[i++ % rs.length]);
  assert.equal(izin(0), true); // sonraki aralık 70
  assert.equal(izin(60), false);
  assert.equal(izin(70), true); // sonraki aralık 130
  assert.equal(izin(190), false);
  assert.equal(izin(200), true); // sonraki aralık 100
  assert.equal(izin(299), false);
  assert.equal(izin(300), true);
});

test('hız sınırlayıcı sapmasızken eskisi gibi sabit aralıklı', () => {
  const izin = hizSinirlayici(50);
  assert.deepEqual([0, 49, 50, 99, 100].map(izin), [true, false, true, false, true]);
});

test('kulak tık zamanı aralık çarpanıyla ölçeklenir', () => {
  const a = kulakDeseni(2).aralikMs;
  assert.equal(tikZamani(2, 2, a * 0.9, 0), false);
  assert.equal(tikZamani(2, 2, a * 0.9, 0, 0.8), true);
  assert.equal(tikZamani(2, 2, a * 1.1, 0, 1.3), false);
  assert.equal(tikZamani(2, 2, a * 1.31, 0, 1.3), true);
});

test('ses düzeyi tercihi: yoksa 100, kaydedilen okunur, bozuk ve uç değerler düzelir', () => {
  assert.equal(duzeyOku(sahteDepo()), VARSAYILAN_DUZEY);
  const d = sahteDepo();
  duzeyKaydet(d, 42.4);
  assert.equal(duzeyOku(d), 42);
  assert.equal(duzeyOku(sahteDepo({ 'haystack-hunt-ses-duzeyi': 'x' })), VARSAYILAN_DUZEY);
  assert.equal(duzeyOku(sahteDepo({ 'haystack-hunt-ses-duzeyi': '250' })), 100);
  assert.equal(duzeyOku(sahteDepo({ 'haystack-hunt-ses-duzeyi': '-4' })), 0);
  assert.equal(duzeyOku(sahteDepo({ 'haystack-hunt-ses-duzeyi': '0' })), 0);
});

test('depo hata verirse çökmez (okuma varsayılan, yazma sessizce konsola)', () => {
  const bozuk = { getItem() { throw new Error('yok'); }, setItem() { throw new Error('yok'); } };
  const eski = console.error;
  console.error = () => {};
  try {
    assert.equal(duzeyOku(bozuk), VARSAYILAN_DUZEY);
    assert.doesNotThrow(() => duzeyKaydet(bozuk, 30));
  } finally {
    console.error = eski;
  }
});
