/**
 * Çiftlik depo ve kol ailesi: sandık/ambar iğne-buluntuyu "bulundu" sayar (yarı kuruş, depoda
 * tutmaz), ambar çürümesi ⌈n/4⌉, defter masası tam kuruş, yaba kolu (filtreler, depodan/hattan
 * alma, hatta/parçaya bırakma, 16 tik), Komşu kapısı (sat/at/iade, sökülmez, tıkanmaz) ve
 * **iğne/buluntu hiçbir sink'te, makinede ya da sökümde yok olmaz**.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ekonomiAl } from '../js/kural/ciftlik/ekonomi/kurus.js';
import { tikAt, komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaDurumu, parcaIcerigi } from '../js/kural/ciftlik/parca-kayit.js';
import { DEPO_KOL } from '../js/kural/ciftlik/parcalar/depo-kol.js';
import { SANDIK_KAP } from '../js/kural/ciftlik/parcalar/temel.js';
import { degerliMi } from '../js/kural/ciftlik/isleme/esya-ozellik.js';
import { dunya, kur, bantCek, kos } from './ciftlik-yardim.mjs';
import { K, hatKur, ekle, bulunanlar } from './ciftlik-isleme-yardim.mjs';

/** Makineye kaynaktan eşya verir, n tik koşar; { c, m, olaylar, bulunan }. */
function besle(ad, esyalar, n = 20, secenek = {}) {
  const { c, tarla } = dunya();
  const { m, k, a } = hatKur(c, tarla, ad, 20, 20, { alici: false, ...secenek });
  for (const e of esyalar) ekle(k, e);
  const olaylar = kos(c, tarla, n);
  return { c, tarla, m, k, a, olaylar, bulunan: bulunanlar(olaylar) };
}
const degerliYok = (p) => parcaIcerigi(p).esya.every(([kod]) => !degerliMi(kod));

test('sandık ve ambar: iğne/buluntu "bulundu" (yarı kuruş), depoda tutulmaz; çivi saklanır', () => {
  for (const ad of ['sandik', 'ambar']) {
    const { c, m, bulunan } = besle(ad, ['igne', 'buluntu:yuzuk', 'civi', 'saman']);
    assert.deepEqual(bulunan.map((b) => [b.anahtar, b.kaynak, b.kip, b.kurus]),
      [['igne', ad, 'yari', 125], ['buluntu:yuzuk', ad, 'yari', 150]]);
    assert.equal(ekonomiAl(c).kurus, 300 + 275);
    assert.equal(m.ozel.toplam, 2);
    assert.ok(degerliYok(m));
    assert.equal(c.envanter[K('igne')], 0);
  }
});

test('sandık ve ambar doluyken de iğne alınır (tıkanmaz); başka eşya bekler', () => {
  for (const [ad, kap] of [['sandik', SANDIK_KAP], ['ambar', DEPO_KOL.ambar.kap]]) {
    const { c, tarla } = dunya();
    const { m, k } = hatKur(c, tarla, ad, 20, 20, { alici: false });
    Object.assign(m.ozel, { say: { [K('saman')]: kap }, toplam: kap });
    ekle(k, 'igne');
    ekle(k, 'saman');
    const b = bulunanlar(kos(c, tarla, 10));
    assert.deepEqual(k.ozel.kuyruk, [K('saman')], `${ad}: saman bekler`);
    if (ad === 'ambar') assert.equal(parcaDurumu(m), 'dolu');
    assert.equal(b.length, 1, `${ad}: dolu depo iğneyi yine "bulundu" sayar`);
  }
});

test('ambar: her 1200 tikte ⌈yaş ot / 4⌉ yaş ot çürük ota döner', () => {
  const { c, m } = besle('ambar', Array(10).fill('yas-ot'), 20);
  const tarla = { h: new Uint16Array(240 * 160), kirli: false, kaldirilan: 0 };
  kos(c, tarla, DEPO_KOL.ambar.curume - 20 - 1);
  assert.equal(m.ozel.say[K('yas-ot')], 10);
  kos(c, tarla, 1);
  assert.equal(m.ozel.say[K('yas-ot')], 7);
  assert.equal(m.ozel.say[K('curuk-ot')], 3);
  kos(c, tarla, DEPO_KOL.ambar.curume * 3);
  assert.equal(m.ozel.say[K('yas-ot')], 2, '7 → 5 → 3 → 2');
  assert.equal(m.ozel.say[K('curuk-ot')], 8);
  assert.equal(m.ozel.toplam, 10);
});

test('defter masası: iğne ailesi ve buluntular tam kuruş; yabancı girişte bekler', () => {
  const esyalar = ['igne', 'cuvaldiz', 'altin-igne', 'buluntu:dugme', 'buluntu:saat'];
  const { c, m, bulunan } = besle('defter-masasi', esyalar);
  assert.deepEqual(bulunan.map((b) => [b.kaynak, b.kip, b.kurus]),
    [['masa', 'tam', 250], ['masa', 'tam', 400], ['masa', 'tam', 1500], ['masa', 'tam', 30],
      ['masa', 'tam', 300]]);
  assert.equal(ekonomiAl(c).kurus, 300 + 2480);
  assert.equal(m.ozel.sayi, 5);
  const d = dunya();
  const masa = kur(d.c, d.tarla, 'defter-masasi', 20, 20, 0);
  bantCek(d.c, d.tarla, 15, 20, 0, 5);
  tikAt(d.c, d.tarla);
  const h = d.c.hatlar[0];
  h.n = 1;
  h.tur[0] = K('civi');
  kos(d.c, d.tarla, 80);
  assert.equal(parcaDurumu(masa), 'yabanci');
  assert.equal(h.n, 1);
});

/** Kol (30, 30) doğuya: arkada (29, 30) kaynak sandık, önde (31, 30) hedef sandık. */
function kolKur(icerik, filtre = null) {
  const { c, tarla } = dunya();
  const kaynak = kur(c, tarla, 'sandik', 29, 30);
  const kol = kur(c, tarla, 'yaba-kolu', 30, 30, 0);
  const hedef = kur(c, tarla, 'sandik', 31, 30);
  for (const ad of icerik) kaynak.tanim.al(kaynak, 0, K(ad), { sayac() {}, olay() {}, c });
  if (filtre) komutEkle(c, { tur: 'ayar', x: 30, y: 30, ad: 'filtre', deger: filtre });
  return { c, tarla, kaynak, kol, hedef };
}
const icerigi = (s) => Object.fromEntries(Object.entries(s.ozel.say));

test('yaba kolu: 16 tikte bir eşya (75/dk), filtreye uyanı taşır', () => {
  const { c, tarla, hedef } = kolKur(Array(30).fill('saman'));
  kos(c, tarla, 16 * 10 + 1);
  assert.equal(hedef.ozel.toplam, 10);
  const durumlar = [
    [{ tur: 'esya', kod: K('tas') }, { [K('tas')]: 1 }],
    [{ tur: 'sinif', sinif: 'cop' }, { [K('toz')]: 1, [K('tas')]: 1 }],
    [{ tur: 'manyetik' }, { [K('civi')]: 1 }],
  ];
  for (const [filtre, beklenen] of durumlar) {
    const d = kolKur(['saman', 'toz', 'civi', 'tas'], filtre);
    kos(d.c, d.tarla, 200);
    assert.deepEqual(icerigi(d.hedef), beklenen, JSON.stringify(filtre));
  }
});

test('yaba kolu: seçimsiz filtre "ayar", geçersiz ayar red; hedef dolu → havada bekler', () => {
  const d = kolKur(['saman'], { tur: 'esya' });
  kos(d.c, d.tarla, 20);
  assert.equal(parcaDurumu(d.kol), 'ayar');
  komutEkle(d.c, { tur: 'ayar', x: 30, y: 30, ad: 'filtre', deger: { tur: 'renk' } });
  const red = kos(d.c, d.tarla, 1).find((o) => o.ad === 'komut-reddedildi');
  assert.equal(red.veri.neden, 'gecersiz');
  const e = kolKur(['saman', 'saman']);
  Object.assign(e.hedef.ozel, { say: { [K('toz')]: SANDIK_KAP }, toplam: SANDIK_KAP });
  kos(e.c, e.tarla, 40);
  assert.equal(parcaDurumu(e.kol), 'cikis-dolu');
  assert.equal(e.kol.ozel.el, K('saman'));
  assert.equal(e.kaynak.ozel.toplam, 1, 'elindekini bırakmadan yenisini almaz');
});

test('yaba kolu: arkadaki bant karosundan filtreye uyanı alır, öndeki banda bırakır', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 26, 30, 0, 4); // 26..29, ucu kola dayanır (kol porta sahip değil)
  const kol = kur(c, tarla, 'yaba-kolu', 30, 30, 0);
  bantCek(c, tarla, 31, 30, 0, 3);
  const son = kur(c, tarla, 'sandik', 34, 30);
  komutEkle(c, { tur: 'ayar', x: 30, y: 30, ad: 'filtre', deger: { tur: 'sinif', sinif: 'igne' } });
  tikAt(c, tarla);
  const giris = c.hatlar.find((h) => h.karolar.length === 4);
  for (const [i, ad] of ['saman', 'igne', 'saman'].entries()) {
    giris.pos[i] = giris.uzun - i * 80;
    giris.tur[i] = K(ad);
  }
  giris.n = 3;
  const b = bulunanlar(kos(c, tarla, 120));
  assert.deepEqual(b.map((v) => [v.anahtar, v.kaynak]), [['igne', 'sandik']]);
  assert.equal(giris.n, 2, 'samanlar bantta kaldı');
  assert.ok([...giris.tur.subarray(0, 2)].every((kod) => kod === K('saman')));
  assert.equal(kol.ozel.el, 0);
  assert.equal(son.ozel.toplam, 0);
});

test('yaba kolu: oluk mıknatısı tutucusundan çeker, defter masasına verir', () => {
  const { c, tarla } = dunya();
  const oluk = kur(c, tarla, 'oluk-miknatisi', 29, 30, 1);
  kur(c, tarla, 'yaba-kolu', 30, 30, 0);
  const masa = kur(c, tarla, 'defter-masasi', 31, 30, 0);
  oluk.ozel.tutucu.push(K('civi'), K('igne'));
  komutEkle(c, { tur: 'ayar', x: 30, y: 30, ad: 'filtre', deger: { tur: 'sinif', sinif: 'igne' } });
  const b = bulunanlar(kos(c, tarla, 40));
  assert.deepEqual(oluk.ozel.tutucu, [K('civi')], 'yalnız iğne alındı');
  assert.equal(masa.ozel.sayi, 1);
  assert.deepEqual(b.map((v) => [v.kaynak, v.kurus]), [['masa', 250]]);
});

test('Komşu kapısı: değeri olanı satar, olmayanı atar; iğne iade; ayarla satış kapanır', () => {
  const { c, m, k, olaylar, tarla } = besle('komsu-kapisi',
    ['saman', 'balya-ot', 'toz', 'civi', 'igne', 'buluntu:nal'], 10);
  assert.equal(ekonomiAl(c).kurus, 300 + 1 + 30);
  assert.deepEqual([m.ozel.satildi, m.ozel.atildi, m.ozel.iade], [2, 2, 2]);
  assert.equal(c.envanter[K('igne')], 1);
  assert.equal(c.envanter[K('buluntu:nal')], 1);
  assert.deepEqual(bulunanlar(olaylar).map((b) => b.kip), ['kurussuz', 'kurussuz']);
  assert.equal(c.cikanKat, 12 + 96 + 12, 'satılan/atılan saman dünyadan çıktı');
  komutEkle(c, { tur: 'kapiSat', acik: false });
  ekle(k, 'balya-ot', 300);
  kos(c, tarla, 310);
  assert.equal(k.ozel.kuyruk.length, 0, 'kapı asla tıkanmaz');
  assert.equal(ekonomiAl(c).kurus, 331, 'satış kapalı: atıldı');
  assert.equal(m.ozel.atildi, 302);
});

test('Komşu kapısı sökülmez ve döndürülmez', () => {
  const { c, tarla } = dunya();
  kur(c, tarla, 'komsu-kapisi', 20, 20, 0);
  komutEkle(c, { tur: 'sok', x: 21, y: 21 });
  komutEkle(c, { tur: 'dondur', x: 20, y: 20 });
  const red = kos(c, tarla, 1).filter((o) => o.ad === 'komut-reddedildi');
  assert.deepEqual(red.map((o) => o.veri.neden), ['sokulmez', 'sokulmez']);
  assert.equal(c.parcalar.size, 1);
});

test('söküm: içindeki iğne/buluntu oyuncuya döner (envanter + "bulundu", tam ödeme)', () => {
  const kurulum = [
    ['balya-presi', (m) => Object.assign(m.ozel, { sikisan: K('igne') })],
    ['cekicli-kiyici', (m) => m.ozel.cikis.push(K('buluntu:can'))],
    ['ot-savurucu', (m) => { m.ozel.tur.push(K('igne')); m.ozel.puan.push(0); }],
    ['yaba-kolu', (m) => { m.ozel.el = K('cuvaldiz'); }],
    ['oluk-miknatisi', (m) => m.ozel.tutucu.push(K('igne'))],
  ];
  for (const [ad, koy] of kurulum) {
    const { c, tarla } = dunya();
    const m = kur(c, tarla, ad, 20, 20, 0);
    koy(m);
    komutEkle(c, { tur: 'sok', x: 20, y: 20 });
    const b = bulunanlar(kos(c, tarla, 1));
    assert.equal(b.length, 1, ad);
    assert.equal(b[0].kaynak, 'sokum');
    assert.equal(b[0].kip, 'tam');
    assert.equal(c.envanter[b[0].kod], 1, `${ad}: envantere döndü`);
  }
});

test('söküm: sökülen bant karosundaki iğne oyuncuya döner, öteki karodaki bantta kalır', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 20, 20, 0, 3);
  tikAt(c, tarla);
  const h = c.hatlar[0];
  h.pos[0] = 2 * 240 + 100;
  h.tur[0] = K('igne');
  h.pos[1] = 100;
  h.tur[1] = K('igne');
  h.n = 2;
  komutEkle(c, { tur: 'sok', x: 22, y: 20 });
  const b = bulunanlar(kos(c, tarla, 1));
  assert.equal(b.length, 1);
  assert.equal(c.envanter[K('igne')], 1);
  assert.equal(c.hatlar[0].n, 1, 'öteki iğne bantta');
});

test('iğne korunumu: her sink ve makine iğneyi ve buluntuyu ya "bulundu" sayar ya tutar', () => {
  const sinkler = ['sandik', 'ambar', 'defter-masasi', 'komsu-kapisi', 'gubre-cukuru'];
  for (const ad of sinkler) {
    const { c, m, bulunan } = besle(ad, ['igne', 'buluntu:tuy', 'altin-igne'], 10);
    assert.equal(bulunan.length, 3, ad);
    assert.ok(degerliYok(m), `${ad}: içinde değerli kalmadı`);
    assert.ok(c.parcalar.size >= 2);
  }
  for (const ad of ['balya-presi', 'cekicli-kiyici', 'ot-savurucu', 'kurutma-ambari']) {
    const { c, tarla } = dunya();
    const { m, k, a } = hatKur(c, tarla, ad, 20, 20);
    ekle(k, 'igne');
    ekle(k, 'buluntu:tuy');
    kos(c, tarla, 30);
    const say = (p) => parcaIcerigi(p).esya.filter(([kod]) => degerliMi(kod))
      .reduce((t, [, n]) => t + n, 0);
    assert.equal(say(m) + say(a) + say(k), 2, `${ad}: iki değerli eşya hâlâ dünyada`);
  }
});
