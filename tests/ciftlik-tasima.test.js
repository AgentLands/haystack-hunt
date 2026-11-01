/**
 * Çiftlik taşıma düğümleri: çatal (sırayla adil, taşma önceliği, rozet, söküm) ve birleştirme
 * oluğu (adil, boşu atlar, çıkış dolu), parça kayıtları ve kaydet → yükle gidiş-dönüşü.
 * Menfez: tests/ciftlik-menfez.test.js. Kurgular: tests/ciftlik-tasima-yardim.mjs.
 */
import { PARCA_MALIYET } from '../js/kural/ciftlik/ekonomi/denge.js';
import { ACILIS } from '../js/kural/ciftlik/ekonomi/acilis.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tikAt, komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { parcaIcerigi, parcaDurumu, parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { BEKLE_ESIK } from '../js/kural/ciftlik/tasima/dugum.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import { dunya, duzTarla, kos } from './ciftlik-yardim.mjs';
import {
  besle, esyaSay, araliklarDenetle, hatYeri, catalKur, kosBesle, olukKur, menfezKur,
} from './ciftlik-tasima-yardim.mjs';

const SAMAN = esyaKodu('saman');
const IGNE = esyaKodu('igne');
const CIVI = esyaKodu('civi');

test('çatal sırayla: 1000 eşya üç sandığa ±1 fark ve tam verimle dağılır', () => {
  const { c, tarla } = dunya();
  const { catal, sandiklar } = catalKur(c, tarla, ['sandik', 'sandik', 'sandik']);
  const tik0 = c.tik;
  assert.equal(kosBesle(c, tarla, 15, 20, SAMAN, 1000, 150), 1000);
  const say = sandiklar.map((s) => s.ozel.toplam);
  assert.equal(say.reduce((a, b) => a + b, 0), 1000);
  assert.ok(Math.max(...say) - Math.min(...say) <= 1, `sandıklar ${say}`);
  assert.deepEqual(catal.ozel.say, say, 'çıkış payı sayacı sandıklarla aynı');
  const sure = (c.tik - tik0) / 20;
  assert.ok(sure < 1000 / 4.5 + 10, `çatal bant hızını kısıyor: ${sure} sn`);
  assert.equal(esyaSay(c), 1000);
});

test('çatal sırayla: bağlı olmayan yan atlanır, kabul etmeyen yan atlanır', () => {
  const a = dunya();
  const { sandiklar } = catalKur(a.c, a.tarla, ['sandik', null, 'sandik']);
  kosBesle(a.c, a.tarla, 15, 20, SAMAN, 500, 150);
  assert.equal(sandiklar[0].ozel.toplam + sandiklar[2].ozel.toplam, 500);
  assert.ok(Math.abs(sandiklar[0].ozel.toplam - sandiklar[2].ozel.toplam) <= 1);

  const b = dunya();
  const k = catalKur(b.c, b.tarla, ['kor', 'sandik', 'sandik']);
  const verilen = kosBesle(b.c, b.tarla, 15, 20, SAMAN, 600, 150);
  const kor = hatYeri(b.c, 21, 20);
  const iki = k.sandiklar[1].ozel.toplam + k.sandiklar[2].ozel.toplam;
  assert.equal(kor.n, 7, 'kör kol dolu');
  assert.equal(iki + kor.n, verilen, 'kalan hepsi diğer iki yana gitti');
  assert.ok(Math.abs(k.sandiklar[1].ozel.toplam - k.sandiklar[2].ozel.toplam) <= 1);
});

test('çatal taşma: önce ön, ön almazsa sol, o da almazsa sağ; ön açılınca yine ön', () => {
  const { c, tarla } = dunya();
  const { catal, sandiklar } = catalKur(c, tarla, ['kor', 'kor', 'sandik'], 'tasma');
  let solIlkAnOn = null;
  for (let i = 0; i < 40; i++) {
    for (let t = 0; t < 12; t++) tikAt(c, tarla); // yavaş besleme: ön her zaman müsait olsun
    besle(c, 15, 20, SAMAN);
    if (solIlkAnOn === null && catal.ozel.say[1] > 0) solIlkAnOn = catal.ozel.say[0];
  }
  kos(c, tarla, 200);
  assert.equal(solIlkAnOn, 7, 'sol, ön 7 eşyayla dolduktan sonra başladı');
  assert.deepEqual(catal.ozel.say, [7, 7, 26]);
  assert.equal(sandiklar[2].ozel.toplam, 26);
  // Ön kolun ucuna sandık konunca ön yine önceliklidir.
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: 23, y: 20, yon: 0 });
  kos(c, tarla, 50);
  const onSandik = [...c.parcalar.values()].find((p) => p.x === 23 && p.y === 20);
  for (let i = 0; i < 10; i++) {
    besle(c, 15, 20, SAMAN);
    kos(c, tarla, 12);
  }
  kos(c, tarla, 200);
  assert.equal(onSandik.ozel.toplam, 7 + 10, 'kör koldaki 7 eşya ve yeni 10 ön sandığa');
  assert.equal(sandiklar[2].ozel.toplam, 26, 'sağa artık gitmedi');
});

test('çatal: ayar yalnız geçerli kipi alır; çıkışsız durur, rozet verir, sökümde iade', () => {
  const { c, tarla } = dunya();
  const { catal } = catalKur(c, tarla, [null, null, null]);
  assert.equal(catal.tanim.ayarla(catal, 'kip', 'kotu'), false);
  assert.equal(catal.tanim.ayarla(catal, 'baska', 'tasma'), false);
  assert.equal(catal.ozel.kip, 'sirayla');
  besle(c, 15, 20, SAMAN);
  kos(c, tarla, 150);
  assert.deepEqual(catal.ozel.tampon, [SAMAN]);
  assert.equal(parcaDurumu(catal), 'cikis-dolu');
  assert.match(catal.tanim.incele(catal)[0][1], /Çıkış yok/);
  assert.deepEqual(parcaIcerigi(catal).esya, [[SAMAN, 1]]);
  komutEkle(c, { tur: 'sok', x: 20, y: 20 });
  tikAt(c, tarla);
  assert.equal(c.envanter[SAMAN], 1, 'söküm tampondaki eşyayı envantere verdi');
});

test('çatal: iğne ve çivi türe bakılmadan geçer, hiçbiri yok olmaz', () => {
  const { c, tarla } = dunya();
  const { sandiklar } = catalKur(c, tarla, ['sandik', null, null]);
  besle(c, 15, 20, IGNE);
  kos(c, tarla, 40);
  besle(c, 15, 20, CIVI);
  kos(c, tarla, 150);
  assert.deepEqual(sandiklar[0].ozel.say, { [CIVI]: 1 });
  assert.deepEqual(sandiklar[0].ozel.bulunan, { [IGNE]: 1 }, 'iğne sandıkta "bulundu" sayıldı');
});

test('oluk: üç doygun giriş çıkışı adilce paylaşır (±1) ve bant hızı korunur', () => {
  const { c, tarla } = dunya();
  const { oluk, sandik } = olukKur(c, tarla);
  const kodlar = [[5, 10, SAMAN], [10, 5, IGNE], [10, 15, CIVI]];
  for (let t = 0; t < 1500; t++) {
    for (const [x, y, kod] of kodlar) besle(c, x, y, kod);
    tikAt(c, tarla);
    araliklarDenetle(c);
  }
  const pay = oluk.ozel.pay;
  assert.ok(Math.max(...pay) - Math.min(...pay) <= 1, `paylar ${pay}`);
  const toplam = pay.reduce((a, b) => a + b, 0);
  const beklenen = ((1500 - 70) * 4.5) / 20; // 70 tik: girişteki 5 karoluk bant yolculuğu
  assert.ok(Math.abs(toplam - beklenen) <= 5, `çıkış ${toplam} (beklenen ≈ ${beklenen})`);
  const say = { ...sandik.ozel.say, ...sandik.ozel.bulunan }; // iğne "bulundu" sayılır (F)
  assert.ok(Math.abs(say[SAMAN] - say[IGNE]) <= 2 && Math.abs(say[IGNE] - say[CIVI]) <= 2);
});

test('oluk: boş giriş atlanır, yavaş giriş aç kalmaz, tek doygun giriş tam hız', () => {
  const { c, tarla } = dunya();
  const { oluk, sandik } = olukKur(c, tarla);
  let yavas = 0;
  for (let t = 0; t < 1000; t++) {
    besle(c, 5, 10, SAMAN);
    if (t % 40 === 0 && besle(c, 10, 5, IGNE)) yavas += 1;
    tikAt(c, tarla);
  }
  kos(c, tarla, 150);
  assert.equal(oluk.ozel.pay[2], 0);
  assert.equal(oluk.ozel.pay[1], yavas, 'yavaş girişin her eşyası geçti');
  assert.equal(sandik.ozel.bulunan[IGNE], yavas);
  const toplam = oluk.ozel.pay[0] + oluk.ozel.pay[1];
  assert.ok(toplam >= (1000 * 4.5) / 20 - 10, `çıkış ${toplam}: boş giriş hattı yavaşlattı`);
});

test('oluk: çıkış doluysa bütün girişler bekler, rozet verir, aralık bozulmaz, eşya durur', () => {
  const { c, tarla } = dunya();
  const { oluk } = olukKur(c, tarla, { cikisSandik: false });
  let verilen = 0;
  for (let t = 0; t < 1200; t++) {
    for (const [x, y, kod] of [[5, 10, SAMAN], [10, 5, IGNE], [10, 15, CIVI]]) {
      if (besle(c, x, y, kod)) verilen += 1;
    }
    tikAt(c, tarla);
    araliklarDenetle(c);
  }
  assert.ok(oluk.ozel.yuva.every(Boolean), 'üç yuva da dolu ve bekliyor');
  assert.ok(oluk.ozel.bekle >= BEKLE_ESIK);
  assert.equal(parcaDurumu(oluk), 'cikis-dolu');
  assert.equal(esyaSay(c), verilen, 'hiçbir eşya kaybolmadı');
  assert.equal(parcaIcerigi(oluk).esya.length, 3);
});

test('taşıma parçaları: kayıtlı, aile taşıma, kodlar sabit, palet verisi tam', () => {
  const kodlar = [];
  for (const ad of ['catal', 'birlestirme-olugu', 'menfez']) {
    const t = parcaTanimi(ad);
    assert.ok(t, ad);
    assert.equal(t.aile, 'tasima');
    assert.ok(PARCA_MALIYET[ad] > 0 && ACILIS[ad].damga, `${ad}: fiyat ve kilit (G tabloları)`);
    kodlar.push(t.kod);
  }
  assert.deepEqual(kodlar, [40, 41, 42]);
});

test('kaydet → yükle → sürdür: çatal, oluk ve menfezle kesintisiz koşuyla bit bit aynı', () => {
  const kurgu = () => {
    const d = dunya(5, duzTarla());
    catalKur(d.c, d.tarla, ['sandik', 'bant', 'kor'], 'tasma', 20);
    olukKur(d.c, d.tarla, {}, 40);
    menfezKur(d.c, d.tarla, true, 60);
    return d;
  };
  const dolas = (d, bas, son) => {
    for (let t = bas; t < son; t++) {
      if (t % 3 === 0) besle(d.c, 15, 20, SAMAN);
      if (t % 2 === 0) besle(d.c, 5, 40, IGNE);
      if (t % 5 === 0) besle(d.c, 10, 35, CIVI);
      if (t % 2 === 1) besle(d.c, 4, 60, SAMAN);
      if (t % 7 === 0) besle(d.c, 11, 55, CIVI);
      tikAt(d.c, d.tarla);
    }
  };
  const tam = kurgu();
  dolas(tam, 0, 1500);
  const parcali = kurgu();
  dolas(parcali, 0, 700);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(parcali.c, parcali.tarla)));
  const tarla = duzTarla();
  const { c } = dunyaCoz(kayit, tarla);
  assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(parcali.c, parcali.tarla));
  dolas({ c, tarla }, 700, 1500);
  assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(tam.c, tam.tarla));
  assert.ok(esyaSay(c) > 100);
});
