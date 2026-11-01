/**
 * Çiftlik menfezi: eşleme (1-5 ara karo, yön, zincir, sıra bağımsızlığı), sanal hat (boy,
 * süre, verim, aralık), çapraz geçiş, eşsiz rozeti, ara karolara kurulum, çıkış önceliği,
 * söküm korunumu. Kurgular: tests/ciftlik-tasima-yardim.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARALIK, BIRIM, karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { tikAt, komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaDurumu } from '../js/kural/ciftlik/parca-kayit.js';
import { menfezEsi } from '../js/kural/ciftlik/tasima/menfez.js';
import { BANT_HIZ } from '../js/kural/ciftlik/parcalar/temel.js';
import { dunya, kur, bantCek, kos } from './ciftlik-yardim.mjs';
import {
  besle, esyaSay, araliklarDenetle, hatYeri, menfezKur,
} from './ciftlik-tasima-yardim.mjs';

const SAMAN = esyaKodu('saman');
const IGNE = esyaKodu('igne');
const CIVI = esyaKodu('civi');

test('menfez: giriş ağzı ardıl olarak çıkış ağzına bağlanır, hat boyu mesafe × BIRIM', () => {
  const { c, tarla } = dunya();
  const { giris, cikis } = menfezKur(c, tarla);
  assert.equal(c.hatlar.length, 1, 'tek sürekli hat');
  const h = c.hatlar[0];
  const gi = h.karolar.indexOf(karoIndeks(9, 10));
  assert.equal(h.karolar[gi + 1], karoIndeks(13, 10));
  assert.equal(h.ofset[gi + 1] - h.ofset[gi], 4 * BIRIM);
  assert.equal(h.ofset[gi + 2] - h.ofset[gi + 1], BIRIM);
  assert.equal(h.hiz, BANT_HIZ);
  assert.equal(giris.ozel.rol, 1);
  assert.equal(cikis.ozel.rol, 2);
  assert.equal(giris.ozel.es, cikis.id);
  assert.equal(parcaDurumu(giris), 'calisiyor');
});

test('menfez: geçiş süresi aynı mesafedeki düz bantla bire bir aynı; verim 4,5/sn', () => {
  const m = dunya();
  const { sandik: mSandik } = menfezKur(m.c, m.tarla);
  const d = dunya();
  bantCek(d.c, d.tarla, 4, 10, 0, 15);
  const dSandik = kur(d.c, d.tarla, 'sandik', 19, 10);
  tikAt(d.c, d.tarla);
  const varis = (w, sandik) => {
    besle(w.c, 4, 10, SAMAN);
    let t = 0;
    while (sandik.ozel.toplam === 0 && t < 1000) {
      tikAt(w.c, w.tarla);
      t += 1;
    }
    return t;
  };
  const tm = varis(m, mSandik);
  assert.equal(tm, varis(d, dSandik));
  assert.ok(tm > 150 && tm < 250, `varış ${tm} tik`);

  const v = dunya();
  const { sandik } = menfezKur(v.c, v.tarla);
  const besleKos = (n) => {
    for (let t = 0; t < n; t++) {
      besle(v.c, 4, 10, SAMAN);
      tikAt(v.c, v.tarla);
    }
  };
  besleKos(700);
  const once = sandik.ozel.toplam;
  besleKos(400);
  assert.ok(Math.abs((sandik.ozel.toplam - once) / 20 - 4.5) <= 0.1);
});

test('menfez: sıkışınca aralık ≥ ARALIK, kapasite sanal hat boyuna göre, eşya kaybolmaz', () => {
  const { c, tarla } = dunya();
  menfezKur(c, tarla);
  komutEkle(c, { tur: 'sok', x: 19, y: 10 }); // uç kör kalsın
  let verilen = 0;
  for (let t = 0; t < 800; t++) {
    if (besle(c, 4, 10, SAMAN)) verilen += 1;
    tikAt(c, tarla);
    araliklarDenetle(c);
  }
  const h = c.hatlar[0];
  assert.equal(h.n, Math.floor(h.uzun / ARALIK) + 1, 'hat tamamen dolu');
  assert.equal(h.uzun, (5 + 4 + 1 + 5) * BIRIM);
  assert.equal(esyaSay(c), verilen);
});

test('menfez: çapraz hat ara karodan geçer, iki akış karışmaz', () => {
  const { c, tarla } = dunya();
  const { sandik, caprazSandik } = menfezKur(c, tarla, true);
  assert.equal(c.hatlar.length, 2);
  for (let t = 0; t < 600; t++) {
    besle(c, 4, 10, SAMAN);
    besle(c, 11, 5, CIVI);
    tikAt(c, tarla);
  }
  kos(c, tarla, 300);
  assert.deepEqual(Object.keys(sandik.ozel.say), [String(SAMAN)]);
  assert.deepEqual(Object.keys(caprazSandik.ozel.say), [String(CIVI)]);
  assert.ok(sandik.ozel.toplam > 100 && caprazSandik.ozel.toplam > 100);
});

/** y = 30'da doğuya bakan menfezleri verilen x konumlarına kurar. */
function menfezSirasi(xler, yon = 0) {
  const { c, tarla } = dunya();
  const liste = xler.map((x) => kur(c, tarla, 'menfez', x, 30, yon));
  tikAt(c, tarla);
  return { c, tarla, liste };
}

test('menfez eşleme: ara karo 1..5 çift olur; 0 ve 6 olmaz; farklı yön eşleşmez', () => {
  for (const [ara, beklenen] of [[0, false], [1, true], [3, true], [5, true], [6, false]]) {
    const { liste } = menfezSirasi([10, 10 + ara + 1]);
    assert.equal(liste[0].ozel.rol !== 0, beklenen, `ara ${ara}`);
    assert.equal(liste[1].ozel.rol !== 0, beklenen, `ara ${ara}`);
  }
  const { c, tarla } = dunya();
  kur(c, tarla, 'menfez', 10, 30, 0);
  const ters = kur(c, tarla, 'menfez', 14, 30, 2);
  kur(c, tarla, 'menfez', 20, 30, 1);
  tikAt(c, tarla);
  assert.equal(menfezEsi(c, ters), null, 'batıya bakan doğuya bakanla eşleşmez');
});

test('menfez eşleme: zincirde giriş-çıkış-giriş...; yerleştirme sırasından bağımsız', () => {
  const roller = (xler) => menfezSirasi(xler).liste.map((p) => p.ozel.rol);
  assert.deepEqual(roller([10, 12, 14, 16]), [1, 2, 1, 2]);
  assert.deepEqual(roller([10, 12, 14]), [1, 2, 0], 'üçüncü eşsiz');
  const { c, tarla } = dunya();
  const karisik = [14, 10, 16, 12].map((x) => kur(c, tarla, 'menfez', x, 30, 0));
  tikAt(c, tarla);
  assert.deepEqual(karisik.map((p) => p.ozel.rol), [1, 1, 2, 2], 'x=14, 10 giriş; 16, 12 çıkış');
});

test('menfez eşsiz: eşya girmez, rozet essiz; ara karolara kurulur; eş kurulunca akar', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 4, 10, 0, 5);
  const yalniz = kur(c, tarla, 'menfez', 9, 10, 0);
  const onSandik = kur(c, tarla, 'sandik', 10, 10); // ara karo: hemen önünde sandık
  kur(c, tarla, 'bant', 11, 9, 1); // ara karolarda çapraz hat
  kur(c, tarla, 'bant', 11, 10, 1);
  kur(c, tarla, 'catal', 12, 10, 0);
  tikAt(c, tarla);
  assert.equal(parcaDurumu(yalniz), 'essiz');
  assert.match(yalniz.tanim.incele(yalniz)[0][1], /Eşsiz/);
  besle(c, 4, 10, SAMAN);
  kos(c, tarla, 300);
  assert.equal(onSandik.ozel.toplam, 0, 'eşsiz menfez önündeki sandığa da vermez');
  const h = hatYeri(c, 8, 10);
  assert.equal(h.n, 1, 'eşya bant ucunda bekliyor, menfeze girmedi');
  assert.equal(h.pos[0], h.uzun);
  assert.equal(c.karoHat[karoIndeks(9, 10)], 0, 'eşsiz menfez hat dışı');

  kur(c, tarla, 'menfez', 13, 10, 0);
  bantCek(c, tarla, 14, 10, 0, 3);
  const sonSandik = kur(c, tarla, 'sandik', 17, 10);
  tikAt(c, tarla);
  assert.equal(parcaDurumu(yalniz), 'calisiyor');
  assert.equal(yalniz.ozel.mesafe, 4);
  kos(c, tarla, 300);
  assert.equal(sonSandik.ozel.toplam, 1, 'bekleyen eşya tünelden geçti');
  assert.equal(onSandik.ozel.toplam, 0);
});

test('menfez: çıkış ağzının hemen arkasına bant konsa bile tünel öncül kalır', () => {
  const { c, tarla } = dunya();
  const { sandik } = menfezKur(c, tarla);
  bantCek(c, tarla, 12, 10, 0, 1);
  tikAt(c, tarla);
  besle(c, 4, 10, SAMAN);
  kos(c, tarla, 300);
  assert.equal(sandik.ozel.toplam, 1, 'tünel hâlâ çıkışı besliyor');
});

test('menfez sökümü: tüneldeki eşyalar hatta sığar ya da envantere döner, yok olmaz', () => {
  const { c, tarla } = dunya();
  menfezKur(c, tarla);
  let verilen = 0;
  for (let t = 0; t < 120; t++) {
    if (besle(c, 4, 10, t % 2 ? IGNE : SAMAN)) verilen += 1;
    tikAt(c, tarla);
  }
  komutEkle(c, { tur: 'sok', x: 13, y: 10 });
  kos(c, tarla, 3);
  assert.equal(esyaSay(c), verilen);
  assert.ok(c.envanter[IGNE] + c.envanter[SAMAN] > 0, 'sığmayanlar envantere düştü');
  araliklarDenetle(c);
});
