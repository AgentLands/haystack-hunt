/** Çiftlik bant hatları: hız, sıkışma (geri basınç), verim, hatlar arası devir, halka, topoloji. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARALIK, BIRIM, karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { tikAt, komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { HAT_EN_UZUN } from '../js/kural/ciftlik/tasima/hat.js';
import { BANT_HIZ } from '../js/kural/ciftlik/parcalar/temel.js';
import { dunya, kur, bantCek, kos } from './ciftlik-yardim.mjs';

const SAMAN = esyaKodu('saman');

/** Hatlar kurulsun diye boş bir tik. */
function hazirla(c, tarla) {
  tikAt(c, tarla);
  return c.hatlar;
}

function araliklarDenetle(h) {
  for (let k = 1; k < h.n; k++) {
    assert.ok(h.pos[k - 1] - h.pos[k] >= ARALIK, `aralık ${h.pos[k - 1] - h.pos[k]}`);
  }
  for (let k = 0; k < h.n; k++) assert.ok(h.pos[k] >= 0 && h.pos[k] <= h.uzun);
}

test('uç uca bantlar tek hat; dönemeç hattı bölmez', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 5);
  bantCek(c, tarla, 15, 10, 1, 4); // dönemeç: güneye
  const hatlar = hazirla(c, tarla);
  assert.equal(hatlar.length, 1);
  assert.equal(hatlar[0].karolar.length, 9);
  assert.equal(hatlar[0].uzun, 9 * BIRIM);
  assert.equal(hatlar[0].girisYon[5], 0, 'dönemeç karosuna doğudan girilir');
  assert.equal(hatlar[0].yonler[5], 1);
});

test('boş hatta eşya sabit hızla ilerler (HIZ birim/tik)', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 6);
  const [h] = hazirla(c, tarla);
  assert.ok(hatBasaKoy(h, SAMAN));
  kos(c, tarla, 20);
  assert.equal(h.pos[0], 20 * BANT_HIZ);
  kos(c, tarla, 200);
  assert.equal(h.pos[0], h.uzun, 'uçta durur (çıkış yok)');
});

test('uç kapalıyken sıkışma: aralık hep ≥ ARALIK, kapasite dolunca giriş reddedilir', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 4);
  const [h] = hazirla(c, tarla);
  let konan = 0;
  for (let t = 0; t < 400; t++) {
    if (hatBasaKoy(h, SAMAN)) konan += 1;
    tikAt(c, tarla);
    araliklarDenetle(h);
  }
  assert.equal(h.n, konan);
  assert.equal(h.n, Math.floor(h.uzun / ARALIK) + 1, 'tam dolu');
  assert.equal(h.pos[h.n - 1], 0);
  assert.equal(hatBasaKoy(h, SAMAN), false);
});

test('verim: sürekli beslenen hat saniyede 4,5 eşya taşır (sandık uçta)', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 8);
  const sandik = kur(c, tarla, 'sandik', 18, 10);
  const [h] = hazirla(c, tarla);
  kos(c, tarla, 200); // ısınma: hat dolsun
  for (let t = 0; t < 600; t++) {
    hatBasaKoy(h, SAMAN);
    tikAt(c, tarla);
  }
  const once = sandik.ozel.toplam;
  for (let t = 0; t < 400; t++) {
    hatBasaKoy(h, SAMAN);
    tikAt(c, tarla);
  }
  const saniyede = (sandik.ozel.toplam - once) / 20;
  const beklenen = (20 * BANT_HIZ) / ARALIK;
  assert.equal(beklenen, 4.5);
  assert.ok(Math.abs(saniyede - beklenen) <= 0.1, `saniyede ${saniyede}, beklenen ${beklenen}`);
});

test('hatlar arası devir: uzun hat HAT_EN_UZUN karoda bölünür, eşya aktarılır', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 2, 10, 0, HAT_EN_UZUN + 6);
  const sandik = kur(c, tarla, 'sandik', 2 + HAT_EN_UZUN + 6, 10);
  const hatlar = hazirla(c, tarla);
  assert.equal(hatlar.length, 2);
  const [ilk, ikinci] = hatlar;
  assert.equal(ilk.cikis.tur, 'hat');
  assert.equal(ilk.cikis.hat, ikinci);
  assert.equal(ikinci.cikis.tur, 'port');
  assert.deepEqual(c.hatSira.map((h) => h.id), [ikinci.id, ilk.id], 'aşağı akış önce');
  hatBasaKoy(ilk, SAMAN);
  kos(c, tarla, Math.ceil(((HAT_EN_UZUN + 6) * BIRIM) / BANT_HIZ) + 5);
  assert.equal(sandik.ozel.toplam, 1);
  assert.equal(ilk.n + ikinci.n, 0);
});

test('halka hat: eşyalar döner, sayı korunur, sıkışmaz', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 4);
  bantCek(c, tarla, 14, 10, 1, 3);
  bantCek(c, tarla, 14, 13, 2, 4);
  bantCek(c, tarla, 10, 13, 3, 3);
  const hatlar = hazirla(c, tarla);
  assert.equal(hatlar.length, 1);
  const [h] = hatlar;
  assert.equal(h.cikis.hat, h, 'halka kendine akar');
  for (let i = 0; i < 20; i++) {
    hatBasaKoy(h, SAMAN);
    kos(c, tarla, 5);
  }
  const n = h.n;
  assert.ok(n >= 15);
  const ilkKaro = h.karolar[0];
  assert.equal(ilkKaro, karoIndeks(10, 10), 'halka en küçük karo indeksinde kesilir');
  kos(c, tarla, 500);
  assert.equal(h.n, n);
  araliklarDenetle(h);
});

test('topoloji değişince eşyalar yeni hatta aktarılır; sökülen banttakiler envantere', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 6);
  let [h] = hazirla(c, tarla);
  for (let i = 0; i < 6; i++) {
    hatBasaKoy(h, SAMAN);
    kos(c, tarla, 5);
  }
  const once = h.n;
  komutEkle(c, { tur: 'kur', parca: 'bant', x: 16, y: 10, yon: 0 });
  tikAt(c, tarla);
  [h] = c.hatlar;
  assert.equal(h.karolar.length, 7);
  assert.equal(h.n, once, 'uzayan hatta eşya kaybolmaz');
  komutEkle(c, { tur: 'sok', x: 10, y: 10 });
  const olaylar = kos(c, tarla, 1);
  const sokuldu = olaylar.find((o) => o.ad === 'parca-sokuldu');
  assert.ok(sokuldu);
  const toplam = c.hatlar.reduce((s, x) => s + x.n, 0) + c.envanter[SAMAN];
  assert.equal(toplam, once, 'hat + envanter = önceki eşya');
});

test('yan yükleme yok: yandan gelen bant, arkadan beslenen hatta tıkanır', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 5); // ana hat
  kur(c, tarla, 'bant', 9, 10, 0); // arkadan (öncül)
  bantCek(c, tarla, 12, 7, 1, 3); // yandan 12,10'a akan
  const hatlar = hazirla(c, tarla);
  const yan = hatlar.find((h) => h.karolar[0] === karoIndeks(12, 7));
  assert.equal(yan.cikis, null, 'yan hat ana hatta bağlanmaz');
  const ana = hatlar.find((h) => h.karolar[0] === karoIndeks(9, 10));
  assert.equal(ana.karolar.length, 6);
});
