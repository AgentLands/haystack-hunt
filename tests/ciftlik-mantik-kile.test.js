/**
 * Çiftlik mantığı: kile sayacı (iki kip, sıfırlama, filtre; örnek devre 2), kantar (eşik
 * tablosu, 6 depo türü) ve kapıların saman korunumu. Ortak kurgu: ciftlik-mantik-yardim.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parcaTurleri } from '../js/kural/ciftlik/parca-kayit.js';
import { ciftlikSamani } from '../js/kural/ciftlik/benzetim.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { sinyalOku } from '../js/kural/ciftlik/ag/sinyal.js';
import { ayarUygula } from '../js/kural/ciftlik/ag/ayar.js';
import { MANTIK } from '../js/kural/ciftlik/parcalar/mantik.js';
import { dunya, kur, kos } from './ciftlik-yardim.mjs';
import {
  BEYAZ, CIVI, DEPOLAR, IGNE, SAMAN, SARI, URUN, YESIL, besleKos, durumKodu, hatBul,
  sandikDoldur, sira,
} from './ciftlik-mantik-yardim.mjs';

test('örnek devre 2: tam N (kile): dolunca kapanır, fazlası geçmez, sıfırlayınca N daha', () => {
  const d = sira('kile-sayaci');
  const kile = d.parca;
  ayarUygula(kile, 'n', 20);
  ayarUygula(kile, 'renk', SARI);
  const olaylar = [];
  for (let t = 0; t < 900; t++) {
    hatBasaKoy(hatBul(d.c, 10, 10), SAMAN);
    olaylar.push(...kos(d.c, d.tarla, 1));
  }
  assert.equal(d.sandik.ozel.toplam, 20, 'tam N');
  assert.equal(kile.ozel.kapali, 1);
  assert.equal(olaylar.filter((o) => o.ad === 'kile-doldu').length, 1);
  assert.equal(sinyalOku(d.c, SARI), 1, 'kapalıyken yazma rengi 1');
  assert.equal(durumKodu(kile), 'kapali');
  assert.equal(ayarUygula(kile, 'sifirla', 1), true); // panelden sıfırla
  assert.equal(kile.ozel.say, 0);
  for (let t = 0; t < 900; t++) {
    hatBasaKoy(hatBul(d.c, 10, 10), SAMAN);
    kos(d.c, d.tarla, 1);
  }
  assert.equal(d.sandik.ozel.toplam, 40);
});

test('kile: sıfırlama rengi 1 olunca açılır ve sayaç sıfırlanır; N artınca açılır', () => {
  const d = sira('kile-sayaci');
  const kile = d.parca;
  ayarUygula(kile, 'n', 5);
  ayarUygula(kile, 'sifirRenk', BEYAZ);
  besleKos(d, 500);
  assert.equal(d.sandik.ozel.toplam, 5);
  assert.equal(kile.ozel.kapali, 1);
  const ek = kur(d.c, d.tarla, 'sandik', 30, 30);
  const kantar = kur(d.c, d.tarla, 'kantar', 31, 30);
  ayarUygula(kantar, 'renk', BEYAZ);
  sandikDoldur(ek, 400); // kantar beyaza yazar → kile sıfırlanır
  kos(d.c, d.tarla, 3);
  assert.equal(kile.ozel.say, 0);
  kos(d.c, d.tarla, 200);
  assert.ok(kile.ozel.say <= 5);
  ayarUygula(kile, 'sifirRenk', -1);
  besleKos(d, 400);
  assert.equal(kile.ozel.kapali, 1);
  ayarUygula(kile, 'n', 10); // N büyüyünce say < N: kapı açılır
  assert.equal(kile.ozel.kapali, 0);
  assert.equal(ayarUygula(kile, 'n', 7), false);
});

test('kile darbe kipi: her N eşyada yazma rengine DARBE_TIK tik 1, kapı hiç kapanmaz', () => {
  const d = sira('kile-sayaci');
  const kile = d.parca;
  ayarUygula(kile, 'kip', 'darbe');
  ayarUygula(kile, 'n', 5);
  ayarUygula(kile, 'renk', YESIL);
  const sureler = [];
  let onceki = 0;
  for (let t = 0; t < 600; t++) {
    hatBasaKoy(hatBul(d.c, 10, 10), SAMAN);
    kos(d.c, d.tarla, 1);
    const y = kile.ozel.yaz > 0 ? 1 : 0;
    if (y && !onceki) sureler.push(0);
    if (y) sureler[sureler.length - 1] += 1;
    onceki = y;
    assert.equal(kile.ozel.kapali, 0);
  }
  assert.ok(d.sandik.ozel.toplam >= 100);
  assert.ok(sureler.length >= 20, `darbe ${sureler.length}`);
  assert.ok(sureler.slice(0, -1).every((s) => s === MANTIK.darbeTik), `süreler ${sureler}`);
});

test('kile filtresi: yalnız seçilen tür/sınıf sayılır, ötekiler karışmaz', () => {
  const d = sira('kile-sayaci');
  const kile = d.parca;
  ayarUygula(kile, 'n', 5);
  assert.equal(ayarUygula(kile, 'filtre', { tur: 'esya', kod: 9999 }), false);
  assert.equal(ayarUygula(kile, 'filtre', { tur: 'sinif', sinif: 'yok' }), false);
  assert.equal(ayarUygula(kile, 'filtre', { tur: 'esya', kod: IGNE }), true);
  for (let t = 0; t < 40; t++) {
    hatBasaKoy(hatBul(d.c, 10, 10), t % 4 === 0 ? IGNE : CIVI);
    kos(d.c, d.tarla, 6);
  }
  assert.ok(kile.ozel.say >= 5 || kile.ozel.kapali === 1);
  assert.equal(d.sandik.ozel.say[IGNE], 5, 'tam 5 iğne sayıldı; kapanınca kalan geçmez');
  ayarUygula(kile, 'sifirla', 1);
  assert.equal(ayarUygula(kile, 'filtre', { tur: 'sinif', sinif: 'urun' }), true);
  for (let t = 0; t < 30; t++) {
    hatBasaKoy(hatBul(d.c, 10, 10), t % 2 ? URUN : CIVI);
    kos(d.c, d.tarla, 6);
  }
  assert.equal(kile.ozel.say, 5, 'sınıf süzgeci: yalnız ürünler sayılır');
});

test('kantar: eşik × (≥ / <) tablosu; komşu ilk depo (doğu önce); depo yoksa yazmaz', () => {
  const d = dunya();
  const sandik = kur(d.c, d.tarla, 'sandik', 10, 10);
  const kantar = kur(d.c, d.tarla, 'kantar', 11, 10);
  for (const esik of MANTIK.kantarEsik) {
    for (const kip of ['ge', 'lt']) {
      ayarUygula(kantar, 'esik', esik);
      ayarUygula(kantar, 'kip', kip);
      for (const dolu of [0, 99, 100, 101, 200, 300, 399, 400]) {
        sandikDoldur(sandik, dolu);
        kos(d.c, d.tarla, 1);
        const ge = dolu * 100 >= esik * 400;
        assert.equal(kantar.ozel.yaz > 0, kip === 'ge' ? ge : !ge, `${kip} %${esik} dolu ${dolu}`);
      }
    }
  }
  const bos = kur(d.c, d.tarla, 'kantar', 40, 40);
  kos(d.c, d.tarla, 1);
  assert.equal(bos.ozel.yaz, 0);
  assert.equal(durumKodu(bos), 'girdi-yok');
  assert.equal(durumKodu(kantar), 'calisiyor');
  // iki komşu: doğudaki (yön 0) önce okunur
  const orta = kur(d.c, d.tarla, 'kantar', 51, 50);
  const bati = kur(d.c, d.tarla, 'sandik', 50, 50);
  const dogu = kur(d.c, d.tarla, 'sandik', 52, 50);
  sandikDoldur(bati, 400);
  kos(d.c, d.tarla, 1);
  assert.equal(orta.ozel.yaz, 0, 'doğu sandık boş: ≥ %50 değil');
  sandikDoldur(dogu, 400);
  kos(d.c, d.tarla, 1);
  assert.ok(orta.ozel.yaz > 0);
});

test('kantar: doluluk(p) bildiren her depo türü okunur (sandık + sentetik 5 tür)', () => {
  const d = dunya();
  let y = 5;
  for (const ad of ['sandik', ...DEPOLAR.map((a) => `deneme-${a}`)]) {
    const depo = kur(d.c, d.tarla, ad, 10, y);
    const kantar = kur(d.c, d.tarla, 'kantar', ad === 'sandik' ? 11 : 12, y);
    ayarUygula(kantar, 'esik', 75);
    if (ad === 'sandik') sandikDoldur(depo, 100);
    else depo.ozel.n = 40;
    kos(d.c, d.tarla, 1);
    assert.equal(kantar.ozel.yaz, 0, `${ad} %${kantar.ozel.yuzde}`);
    if (ad === 'sandik') sandikDoldur(depo, 380);
    else depo.ozel.n = 90;
    kos(d.c, d.tarla, 1);
    assert.ok(kantar.ozel.yaz > 0, `${ad} %${kantar.ozel.yuzde}`);
    y += 4;
  }
});

test('gerçek depolar doluluk bildirmeli (ambar, kurutma ambarı, gübre çukuru, volan, mıknatıs)',
  { todo: 'F/B/E birleşince: tanim.doluluk(p) → { n, kap }' }, () => {
    const adlar = ['ambar', 'kurutma-ambari', 'gubre-cukuru', 'volan', 'oluk-miknatisi'];
    for (const ad of adlar) {
      const t = parcaTurleri().find((x) => x.anahtar === ad);
      assert.ok(t?.doluluk, `${ad}: doluluk(p) yok`);
    }
  });

test('saman korunumu ve boşluk: kapı eşya yutmaz, çoğaltmaz', () => {
  const d = sira('kile-sayaci');
  ayarUygula(d.parca, 'n', 10);
  const kaldirilan = d.tarla.kaldirilan;
  const enjekte = besleKos(d, 1);
  const baslangic = ciftlikSamani(d.c, d.tarla) + kaldirilan;
  let verilen = enjekte;
  for (let t = 0; t < 600; t++) {
    if (hatBasaKoy(hatBul(d.c, 10, 10), SAMAN)) verilen += 1;
    kos(d.c, d.tarla, 1);
  }
  const bantta = d.c.hatlar.reduce((n, h) => n + h.n, 0);
  const tampon = d.parca.ozel.tampon.length;
  assert.equal(d.sandik.ozel.toplam + bantta + tampon, verilen, 'eşya sayısı korunur');
  assert.equal(ciftlikSamani(d.c, d.tarla) + kaldirilan - baslangic, (verilen - enjekte) * 12);
});
