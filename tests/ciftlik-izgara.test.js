/** Çiftlik ızgarası ve parça kaydı: döndürme, portlar, yerleştirme kuralları, söküm, engeller. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK } from '../js/kural/boyut.js';
import { toplamSaman } from '../js/kural/tarla.js';
import { yerelDondur, donmusBoyut, KARO_EN, karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { parcaTanimla, parcaTanimi, parcaOrnegi } from '../js/kural/ciftlik/parca-kayit.js';
import { esyaTanimla, esyaKodu } from '../js/kural/ciftlik/esya.js';
import {
  yerlestirmeEngeli, engelleriTopla, parcaAt, KURMA_ESIK,
} from '../js/kural/ciftlik/izgara.js';
import { parcaKur, parcaSok, parcaDondur } from '../js/kural/ciftlik/komut.js';
import { ciftlikSamani, komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { dunya, duzTarla, kur, kos } from './ciftlik-yardim.mjs';

const W = GENISLIK;

test('yerelDondur: dört çeyrek tur kutuyu saat yönünde çevirir', () => {
  assert.deepEqual(yerelDondur(1, 0, 2, 1, 1), { x: 0, y: 1 }, 'doğu ucu güneye');
  assert.deepEqual(yerelDondur(1, 0, 2, 1, 2), { x: 0, y: 0 }, 'batıya bakınca uç solda');
  assert.deepEqual(yerelDondur(1, 0, 2, 1, 3), { x: 0, y: 0 });
  assert.deepEqual(yerelDondur(0, 0, 3, 2, 4), { x: 0, y: 0 }, 'tam tur');
  assert.deepEqual(donmusBoyut([3, 2], 1), [2, 3]);
});

test('huni portu döndürmeyle döner (yerel karo içeride, komşu karo dışarıda)', () => {
  const t = parcaTanimi('huni');
  const yonler = [0, 1, 2, 3].map((yon) => parcaOrnegi(t, 1, 10, 10, yon).cikis[0]);
  assert.deepEqual(yonler.map((p) => p.yon), [0, 1, 2, 3]);
  assert.deepEqual([yonler[0].kx, yonler[0].ky, yonler[0].hx], [11, 10, 12]);
  assert.deepEqual([yonler[1].kx, yonler[1].ky, yonler[1].hy], [11, 11, 12]);
  assert.deepEqual([yonler[2].kx, yonler[2].ky, yonler[2].hx], [10, 11, 9]);
  assert.deepEqual([yonler[3].kx, yonler[3].ky, yonler[3].hy], [10, 10, 9]);
});

test('parcaTanimla / esyaTanimla: şema hataları açıkça reddedilir', () => {
  assert.throws(() => parcaTanimla('bant', { kod: 900 }), /zaten tanımlı/);
  assert.throws(() => parcaTanimla('test-a', { kod: 1 }), /kod 1 kullanılıyor/);
  assert.throws(() => parcaTanimla('test-b', { kod: 0 }), /kod/);
  assert.throws(() => parcaTanimla('test-c', { kod: 901, boyut: [0, 1] }), /boyut/);
  assert.throws(() => parcaTanimla('test-d', { kod: 902, cikislar: [{ x: 2, y: 0, yon: 0 }] }),
    /port/);
  assert.throws(() => parcaTanimla('test-e', { kod: 903, boyut: [2, 1], hat: { hiz: 5 } }),
    /hat parçası 1×1/);
  assert.throws(() => parcaTanimla('test-f', { kod: 904, adim: 3 }), /işlev/);
  assert.throws(() => esyaTanimla('saman', { kod: 400 }), /zaten tanımlı/);
  assert.throws(() => esyaKodu('yok-boyle'), /Bilinmeyen eşya/);
  const t = parcaTanimla('test-tamam', { kod: 905, boyut: [3, 2], aile: 'yeni-aile' });
  assert.equal(t.yonlu, true);
  assert.equal(t.yurunur, false);
  assert.ok(Object.isFrozen(t));
});

test('yerleştirme kuralları: dışarıda, yasak (kenar ve verilen daire), dolu, saman eşiği', () => {
  const { c, tarla } = dunya(1, duzTarla(0), { yasak: [{ x: 100, y: 100, r: 6 }] });
  const huni = parcaTanimi('huni');
  assert.equal(yerlestirmeEngeli(c, tarla, huni, KARO_EN - 1, 10, 0), 'disarida');
  assert.equal(yerlestirmeEngeli(c, tarla, huni, 0, 10, 0), 'yasak', 'tarla kenarı');
  assert.equal(yerlestirmeEngeli(c, tarla, huni, 49, 49, 0), 'yasak', 'garaj dairesi');
  assert.equal(yerlestirmeEngeli(c, tarla, huni, 10, 10, 0), null);
  kur(c, tarla, 'huni', 10, 10);
  assert.equal(yerlestirmeEngeli(c, tarla, huni, 11, 11, 0), 'dolu');
  tarla.h[30 * W + 30] = KURMA_ESIK;
  assert.equal(yerlestirmeEngeli(c, tarla, parcaTanimi('sandik'), 15, 15, 0), null, 'eşik dahil');
  tarla.h[30 * W + 30] = KURMA_ESIK + 1;
  assert.equal(yerlestirmeEngeli(c, tarla, parcaTanimi('sandik'), 15, 15, 0), 'saman');
});

test('kurulum: alttaki saman çevre halkasına eşit dağılır (toplam korunur), gömülü halkaya itilir',
  () => {
    const igne = { esya: esyaKodu('igne'), x: 41, y: 41, z: 2, alindi: false };
    const { c, tarla } = dunya(1, duzTarla(0), { gomulu: [igne] });
    for (let y = 40; y < 44; y++) for (let x = 40; x < 44; x++) tarla.h[y * W + x] = 7;
    const once = toplamSaman(tarla);
    kur(c, tarla, 'huni', 20, 20);
    assert.equal(toplamSaman(tarla), once);
    for (let y = 40; y < 44; y++) {
      for (let x = 40; x < 44; x++) assert.equal(tarla.h[y * W + x], 0);
    }
    // 112 kat, halka 20 hücre: 5 kat + ilk 12 hücreye 1 fazla
    assert.equal(tarla.h[39 * W + 39], 6);
    assert.equal(tarla.h[44 * W + 44], 5);
    assert.ok(igne.x < 40 || igne.y < 40 || igne.x > 43 || igne.y > 43, 'iğne taban dışında');
    assert.equal(igne.z, 0);
    assert.equal(c.izgara.taban[41 * W + 41], 1);
  });

test('söküm: içerik envantere, ham saman yere; doluluk ve taban temizlenir', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  const huni = kur(c, tarla, 'huni', 20, 20);
  huni.ozel.cikis.push(esyaKodu('saman'), esyaKodu('igne'));
  huni.ozel.birikim = 7;
  const once = ciftlikSamani(c, tarla);
  const iade = parcaSok(c, tarla, huni);
  assert.equal(iade.saman, 7);
  assert.equal(c.envanter[esyaKodu('saman')], 1);
  assert.equal(c.envanter[esyaKodu('igne')], 1);
  assert.equal(ciftlikSamani(c, tarla), once, 'söküm korur');
  assert.equal(parcaAt(c, 20, 20), null);
  assert.equal(c.izgara.taban[41 * W + 41], 0);
  assert.equal(parcaKur(c, tarla, 'huni', 20, 20, 0).parca.id, 2, 'id yeniden kullanılmaz');
});

test('döndürme yerinde: kare parça her yöne; dikdörtgen yeni kutu boşsa', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  const huni = kur(c, tarla, 'huni', 20, 20);
  assert.equal(parcaDondur(c, tarla, huni, 1), null);
  assert.equal(huni.cikis[0].yon, 1);
  const sandik = kur(c, tarla, 'sandik', 30, 30);
  assert.equal(parcaDondur(c, tarla, sandik, 1), 'yonsuz');
  parcaTanimla('test-uzun', { kod: 906, boyut: [3, 1] });
  const uzun = kur(c, tarla, 'test-uzun', 40, 40);
  kur(c, tarla, 'sandik', 40, 42);
  assert.equal(parcaDondur(c, tarla, uzun, 1), 'dolu', '3 karo aşağı uzanamaz');
  assert.equal(parcaDondur(c, tarla, uzun, 2), null);
  assert.deepEqual([uzun.en, uzun.boy], [3, 1]);
});

test('komutlar tik başında uygulanır; reddedilen komut olay verir', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: 10, y: 10 });
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: 10, y: 10 });
  komutEkle(c, { tur: 'sok', x: 50, y: 50 });
  komutEkle(c, { tur: 'ucur' });
  assert.equal(c.parcalar.size, 0, 'tikten önce uygulanmaz');
  const olaylar = kos(c, tarla, 1).filter((o) => o.ad !== 'ciftlik-ozet');
  assert.deepEqual(olaylar.map((o) => [o.ad, o.veri.neden]), [
    ['parca-kuruldu', undefined], ['komut-reddedildi', 'dolu'], ['komut-reddedildi', 'bos'],
    ['komut-reddedildi', 'bilinmeyen'],
  ]);
});

test('engelleriTopla: karakter yürünür bantta geçer, makine hiçbir parçadan geçemez', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  kur(c, tarla, 'bant', 10, 10, 0);
  kur(c, tarla, 'sandik', 11, 10);
  const karakter = engelleriTopla(c, 22, 21, 4, false);
  const makine = engelleriTopla(c, 22, 21, 4, true);
  assert.deepEqual(karakter, [{ x: 23, y: 21, r: 1 }]);
  assert.equal(makine.length, 2);
  assert.deepEqual(engelleriTopla(c, 100, 100, 4, true), []);
  assert.equal(c.izgara.dolu[karoIndeks(11, 10)] > 0, true);
});
