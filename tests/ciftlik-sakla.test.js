/**
 * Çiftlik kaydı ve determinizm: h kodlama gidiş-dönüş, ozel kodlama, göç zinciri, bozuk veri,
 * aynı komutlar = aynı dünya, kaydet → yükle → sürdür = kesintisiz koşu (bit bit).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarlaKur } from '../js/kural/tarla.js';
import { uretec } from '../js/kural/rastgele.js';
import {
  hKodla, hCoz, ozelKodla, ozelCoz, gocUygula, dunyaKodla, dunyaCoz, dunyaOzeti, SURUM,
} from '../js/kural/ciftlik/sakla.js';
import { ciftlikKur, komutEkle, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import '../js/kural/ciftlik/parcalar/hepsi.js';
import { duzTarla } from './ciftlik-yardim.mjs';

test('hKodla / hCoz: gerçek tarla ve rastgele alan gidiş-dönüş; gerçek tarla ≤ 40 KB', () => {
  const t = tarlaKur(4242, 'normal');
  const metin = hKodla(t.h);
  assert.deepEqual(hCoz(metin), t.h);
  assert.ok(metin.length < 40000, `kodlu boy ${metin.length}`);
  const zar = uretec(9);
  const h = new Uint16Array(t.h.length).map(() => Math.floor(zar() * 65536));
  assert.deepEqual(hCoz(hKodla(h)), h);
  assert.ok(hKodla(new Uint16Array(t.h.length)).length < 16, 'düz alan çok kısa');
  assert.throws(() => hCoz(hKodla(t.h).slice(0, 400)), /kayıt: h/);
});

test('ozelKodla / ozelCoz: sayı, dizi, nesne ve seyrek tipli dizi', () => {
  const ozel = { a: 3, b: [1, 2, { c: 'x' }], d: new Uint32Array(512), e: null };
  ozel.d[7] = 9;
  ozel.d[300] = 1;
  const kod = JSON.parse(JSON.stringify(ozelKodla(ozel)));
  assert.equal(kod.d.s.length, 2, 'seyrek');
  assert.deepEqual(ozelCoz(kod), ozel);
  assert.throws(() => ozelCoz({ $t: 'Kötü', n: 1, s: [] }), /bilinmeyen tip/);
});

test('göç: sürümler sırayla uygulanır; eksik göç ve gelecekteki sürüm hata verir', () => {
  const gocler = {
    1: (v) => ({ ...v, surum: 2, iki: true }),
    2: (v) => ({ ...v, surum: 3, uc: v.iki && true }),
  };
  assert.deepEqual(gocUygula({ surum: 1 }, gocler, 3), { surum: 3, iki: true, uc: true });
  assert.throws(() => gocUygula({ surum: 0 }, gocler, 3), /göç yok/);
  assert.throws(() => gocUygula({ surum: SURUM + 1 }), /yeni/);
  assert.throws(() => gocUygula(null), /sürüm yok/);
  assert.throws(() => gocUygula('bozuk'), /sürüm yok/);
});

/** Standart küçük çiftlik: yığın, huni, bant (dönemeçli), sandık; komutlar tik numaralı. */
function kurgu(c) {
  komutEkle(c, { tur: 'kur', parca: 'huni', x: 20, y: 31, yon: 0 });
  for (let i = 0; i < 5; i++) komutEkle(c, { tur: 'kur', parca: 'bant', x: 22 + i, y: 31, yon: 0 });
  komutEkle(c, { tur: 'kur', parca: 'bant', x: 27, y: 31, yon: 1 });
  komutEkle(c, { tur: 'kur', parca: 'bant', x: 27, y: 32, yon: 1 });
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: 27, y: 33 });
}

function yeniDunya() {
  const tarla = duzTarla(0, [{ x: 44, y: 70, r: 14, t: 90 }, { x: 30, y: 58, r: 8, t: 40 }]);
  for (let y = 60; y < 70; y++) for (let x = 40; x < 60; x++) tarla.h[y * 240 + x] = 0;
  const igne = { esya: esyaKodu('igne'), x: 44, y: 70, z: 6, aci: 0.5, alindi: false };
  const c = ciftlikKur(11, { gomulu: [igne], yasak: [{ x: 200, y: 140, r: 5 }] });
  kurgu(c);
  return { c, tarla };
}

function kos(d, n, ara = null) {
  for (let i = 0; i < n; i++) {
    if (ara) ara(d, i);
    tikAt(d.c, d.tarla);
  }
}

/** Ara komutlar: söküm ve yeniden kurma da izde olsun. */
const araKomut = (d, i) => {
  if (i === 900) komutEkle(d.c, { tur: 'sok', x: 24, y: 31 });
  if (i === 1100) komutEkle(d.c, { tur: 'kur', parca: 'bant', x: 24, y: 31, yon: 0 });
};

test('determinizm: aynı tohum + aynı komutlar → 5000 tik sonra aynı özet', () => {
  const a = yeniDunya();
  const b = yeniDunya();
  kos(a, 5000, araKomut);
  kos(b, 5000, araKomut);
  assert.equal(dunyaOzeti(a.c, a.tarla), dunyaOzeti(b.c, b.tarla));
  const sandik = [...a.c.parcalar.values()].find((p) => p.tanim.anahtar === 'sandik');
  assert.ok(sandik.ozel.toplam > 50, `sandıkta ${sandik.ozel.toplam}`);
  const farkli = yeniDunya();
  kos(farkli, 5000, (d, i) => araKomut(d, i === 900 ? 901 : i));
  assert.notEqual(dunyaOzeti(farkli.c, farkli.tarla), dunyaOzeti(a.c, a.tarla));
});

test('kaydet → yükle → sürdür: kesintisiz 5000 tik ile bit bit aynı', () => {
  const ekKomut = (d) => komutEkle(d.c, { tur: 'kur', parca: 'sandik', x: 60, y: 10 });
  const kesintisiz = yeniDunya();
  kos(kesintisiz, 3000, araKomut);
  ekKomut(kesintisiz);
  kos(kesintisiz, 2000, (d, i) => araKomut(d, i + 3000));

  const parcali = yeniDunya();
  kos(parcali, 3000, araKomut);
  ekKomut(parcali); // kayıt anında kuyrukta bekleyen komut da saklanır
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(parcali.c, parcali.tarla, { etiket: 'e' })));
  assert.equal(kayit.surum, SURUM);
  const tarla = duzTarla(0);
  const { c, ek } = dunyaCoz(kayit, tarla);
  assert.equal(ek.etiket, 'e');
  assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(parcali.c, parcali.tarla), 'yükleme aynı');
  kos({ c, tarla }, 2000, (d, i) => araKomut(d, i + 3000));
  assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(kesintisiz.c, kesintisiz.tarla));
  assert.equal(c.tik, 5000);
});

test('bozuk kayıt: bilinmeyen parça kodu ve kesik h hata verir', () => {
  const d = yeniDunya();
  kos(d, 10);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(d.c, d.tarla)));
  kayit.parcalar[0][1] = 64000;
  assert.throws(() => dunyaCoz(kayit, duzTarla(0)), /bilinmeyen parça kodu/);
  const kesik = JSON.parse(JSON.stringify(dunyaKodla(d.c, d.tarla)));
  kesik.h = kesik.h.slice(0, 100);
  assert.throws(() => dunyaCoz(kesik, duzTarla(0)), /kayıt: h/);
});
