/**
 * Hava (kural/ciftlik/dunya/hava.js): durumsuzluk, 10 bin dilimde dağılım (±%2), cephe ve
 * yağmur penceresi kuralları, olay, B/C saplarının gerçek havaya bağlanması; çayır büyümesi
 * (240 / yağmurda 120 / gübreli yarısı tik, tavan 12) ve gübre.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hava, havaAl, havaTahmini, DILIM_TIK, CEPHE_DILIM, GUN_DILIM, GOK, ruzgarDik,
} from '../js/kural/ciftlik/dunya/hava.js';
import { havaAl as enerjiHavasi } from '../js/kural/ciftlik/ag/enerji.js';
import { CAYIR, cayirBuyut, gubrele, gubreliMi, ZEMIN } from '../js/kural/ciftlik/dunya/arazi.js';
import { dunyaHazirla } from '../js/kural/ciftlik/dunya/zemin.js';
import { karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { dunya, duzTarla, kos, havaSabitle } from './ciftlik-yardim.mjs';

havaSabitle('gercek'); // bu dosya tohum havasını sınar

const TOHUMLAR = [1, 12345, 0xdeadbeef];
const N = 10000;

test('hava durumsuz: aynı tohum + dilim her çağrıda ve her sırada aynı', () => {
  const ileri = Array.from({ length: 200 }, (_, d) => hava(77, d));
  const geri = Array.from({ length: 200 }, (_, d) => hava(77, 199 - d)).reverse();
  assert.deepEqual(ileri, geri);
  const { c } = dunya(77);
  c.tik = 5 * DILIM_TIK + 17;
  assert.deepEqual(havaAl(c), hava(c.tohum, 5));
  assert.deepEqual(havaAl(c, 3 * DILIM_TIK - 1), hava(c.tohum, 2));
  assert.deepEqual(havaTahmini(c), [5, 6, 7, 8].map((d) => hava(c.tohum, d)));
  assert.notDeepEqual(Array.from({ length: 50 }, (_, d) => hava(1, d)),
    Array.from({ length: 50 }, (_, d) => hava(2, d)), 'tohum havayı değiştirir');
});

test('dağılım 10 bin dilimde ±%2: şiddet 15/35/35/15, yön eşit, yağmur ≈ %8', () => {
  for (const t of TOHUMLAR) {
    const siddet = [0, 0, 0, 0];
    const yon = [0, 0, 0, 0];
    let yagmur = 0;
    let bulut = 0;
    for (let d = 0; d < N; d++) {
      const h = hava(t, d);
      siddet[h.siddet] += 1;
      yon[h.yon] += 1;
      if (h.gok === GOK.YAGMUR) yagmur += 1;
      if (h.gok === GOK.BULUT) bulut += 1;
    }
    const yuzde = (n) => (100 * n) / N;
    [15, 35, 35, 15].forEach((b, k) => {
      assert.ok(Math.abs(yuzde(siddet[k]) - b) <= 2, `tohum ${t} şiddet ${k}: ${siddet[k]}`);
    });
    for (const n of yon) assert.ok(Math.abs(yuzde(n) - 25) <= 2, `tohum ${t} yön: ${yon}`);
    assert.ok(Math.abs(yuzde(yagmur) - 8) <= 2, `tohum ${t} yağmur ${yagmur}`);
    const bulutPay = bulut / (N - yagmur);
    assert.ok(Math.abs(bulutPay - 0.3) <= 0.02, `bulutlu pay ${bulutPay}`);
  }
});

test('yön cephe boyunca sabit; yağmur günde tek 2 dilimlik pencere ve şiddet ≥ 1', () => {
  for (const t of TOHUMLAR) {
    for (let d = 0; d < 3000; d++) {
      const cephe = Math.floor(d / CEPHE_DILIM) * CEPHE_DILIM;
      assert.equal(hava(t, d).yon, hava(t, cephe).yon);
    }
    for (let gun = 0; gun < 300; gun++) {
      const gunler = Array.from({ length: GUN_DILIM }, (_, k) => hava(t, gun * GUN_DILIM + k));
      const yagan = gunler.map((h, k) => (h.gok === GOK.YAGMUR ? k : -1)).filter((k) => k >= 0);
      assert.ok(yagan.length === 0 || (yagan.length === 2 && yagan[1] === yagan[0] + 1),
        `gün ${gun}: ${yagan}`);
      for (const h of gunler) if (h.gok === GOK.YAGMUR) assert.ok(h.siddet >= 1);
    }
  }
});

test('ruzgarDik: eksene dik ve esiyorsa', () => {
  assert.equal(ruzgarDik({ yon: 1, siddet: 2 }, 0), true);
  assert.equal(ruzgarDik({ yon: 2, siddet: 2 }, 0), false);
  assert.equal(ruzgarDik({ yon: 1, siddet: 0 }, 0), false);
});

test('hava-degisti yeni dilim başında; enerji aynı havayı okur; c.havaSabit kancası', () => {
  const { c, tarla } = dunya(9);
  const olaylar = kos(c, tarla, 2 * DILIM_TIK + 1).filter((o) => o.ad === 'hava-degisti');
  assert.deepEqual(olaylar.map((o) => o.veri), [hava(c.tohum, 1), hava(c.tohum, 2)]);
  for (const tik of [0, 1300, 99999]) {
    assert.deepEqual(enerjiHavasi(c, tik), havaAl(c, tik), 'yel değirmeni');
  }
  const d = { tohum: 3, tik: 0, havaSabit: { yon: 2, siddet: 1, gok: 'bulut' } };
  assert.deepEqual(havaAl(d, 5000), { dilim: 4, yon: 2, siddet: 1, gok: 'bulut' });
  d.havaSabit = (dilim) => ({ yon: dilim & 3, siddet: 3, gok: 'gunes' });
  assert.equal(havaAl(d, 2 * DILIM_TIK).yon, 2, 'işlev biçimi dilimi alır');
});

/** Çayırlı küçük dünya: (10..13, 10..11) karoları çayır, hücreleri 0. */
function cayirDunyasi(tohum) {
  const { c, tarla } = dunya(tohum, duzTarla(0));
  const a = dunyaHazirla(c);
  a.cayir = { x: 10, y: 10, en: 4, boy: 2, kose: 0 };
  for (let ky = 10; ky < 12; ky++) {
    for (let kx = 10; kx < 14; kx++) a.zemin[karoIndeks(kx, ky)] = ZEMIN.CAYIR;
  }
  return { c, tarla, a };
}

/** Tohumun ilk yağmurlu ve ilk güneşli/bulutlu dilimi. */
function dilimBul(tohum, yagmur) {
  for (let d = 0; ; d++) if ((hava(tohum, d).gok === GOK.YAGMUR) === yagmur) return d;
}

const hucre = (tarla, x, y) => tarla.h[y * 240 + x];

test('çayır büyümesi: 240 tikte +1, yağmurda 120, gübreli yarısı; tavan 12; sayaç', () => {
  const t = 5;
  const kuru = cayirDunyasi(t);
  kuru.c.tik = dilimBul(t, false) * DILIM_TIK;
  const say = [];
  for (let i = 0; i < 480; i++) {
    say.push(cayirBuyut(kuru.c, kuru.tarla));
    kuru.c.tik += 1;
  }
  const buyuyen = say.map((n, i) => (n ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(buyuyen, [0, 240], 'güneşli/bulutlu: 240 tikte bir');
  assert.equal(say[0], 4 * 2 * 4, '32 hücre');
  assert.equal(kuru.c.cayirKat, 64);
  assert.equal(hucre(kuru.tarla, 20, 20), 2);
  assert.equal(hucre(kuru.tarla, 19, 20), 0, 'çayır dışı büyümez');

  const islak = cayirDunyasi(t);
  islak.c.tik = dilimBul(t, true) * DILIM_TIK;
  let n = 0;
  for (let i = 0; i < 240; i++) {
    if (cayirBuyut(islak.c, islak.tarla)) n += 1;
    islak.c.tik += 1;
  }
  assert.equal(n, 2, 'yağmurda 120 tikte bir');

  const gubreli = cayirDunyasi(t);
  gubreli.c.tik = dilimBul(t, false) * DILIM_TIK;
  gubrele(gubreli.c, 10, 10, 0, 2400);
  assert.equal(gubreliMi(gubreli.c, 10, 10), true);
  assert.equal(gubreliMi(gubreli.c, 11, 10), false, 'yarıçap 0: tek karo');
  for (let i = 0; i < 240; i++) {
    cayirBuyut(gubreli.c, gubreli.tarla);
    gubreli.c.tik += 1;
  }
  assert.equal(hucre(gubreli.tarla, 20, 20), 2, 'gübreli karo 120 tikte');
  assert.equal(hucre(gubreli.tarla, 22, 20), 1, 'gübresiz karo 240 tikte');

  const dolu = cayirDunyasi(t);
  for (let i = 0; i < 40 * CAYIR.buyume; i++) {
    cayirBuyut(dolu.c, dolu.tarla);
    dolu.c.tik += 1;
  }
  assert.equal(hucre(dolu.tarla, 20, 20), CAYIR.kat, 'tavan');
  assert.equal(dolu.c.cayirKat, 32 * CAYIR.kat);
});

test('gübre yalnız çayır karosuna ve süresi bitince söner', () => {
  const { c } = cayirDunyasi(3);
  gubrele(c, 12, 11, 3, 100);
  assert.equal(gubreliMi(c, 13, 11), true);
  assert.equal(gubreliMi(c, 15, 11), false, 'çayır dışı');
  c.tik = 100;
  assert.equal(gubreliMi(c, 13, 11), false, 'süre bitti');
});
