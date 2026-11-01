/**
 * Çiftlik mantığı: renk kanalları (bir tik gecikme, toplam > 0, ters ayarı, olay), rüzgâr
 * gülü, savak kapağı (geri basınç), sistemler.md §2 örnek devreleri 1 ve 3, ayarlar ve
 * kayıt gidiş-dönüşü. Kile sayacı ve kantar: ciftlik-mantik-kile.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARALIK } from '../js/kural/ciftlik/olcu.js';
import { komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaAt } from '../js/kural/ciftlik/izgara.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import { sinyalOku, sinyalDegerleri } from '../js/kural/ciftlik/ag/sinyal.js';
import { ayarUygula } from '../js/kural/ciftlik/ag/ayar.js';
import { MANTIK, havaSapi } from '../js/kural/ciftlik/parcalar/mantik.js';
import { dunya, duzTarla, kur, bantCek, kos } from './ciftlik-yardim.mjs';
import {
  CIVI, CIVIT, KIRMIZI, MOR, SAMAN, SARI, besleKos, hatBul, sandikDoldur, sira,
} from './ciftlik-mantik-yardim.mjs';

test('bir tik gecikme: yazılan sinyal sonraki tikte okunur, sonra okuyucu tepki verir', () => {
  const d = dunya();
  const sandik = kur(d.c, d.tarla, 'sandik', 10, 10);
  kur(d.c, d.tarla, 'kantar', 11, 10);
  const savak = kur(d.c, d.tarla, 'savak-kapagi', 20, 20);
  sandikDoldur(sandik, 300); // %75 ≥ %50: kantar her tik yazar
  kos(d.c, d.tarla, 1);
  assert.equal(sinyalOku(d.c, KIRMIZI), 0, 'yazılan tik: henüz okunmaz');
  assert.equal(savak.ozel.kapali, 0);
  kos(d.c, d.tarla, 1);
  assert.equal(sinyalOku(d.c, KIRMIZI), 1, 'sonraki tik okunur');
  assert.equal(savak.ozel.kapali, 1);
  sandikDoldur(sandik, 0); // koşul biter: yazma durur, kanal bir tik sonra söner
  kos(d.c, d.tarla, 1);
  assert.equal(sinyalOku(d.c, KIRMIZI), 1, 'son yazılan hâlâ okunuyor');
  kos(d.c, d.tarla, 1);
  assert.equal(sinyalOku(d.c, KIRMIZI), 0);
  assert.equal(savak.ozel.kapali, 0);
});

test('kanal değeri = yazıcı sayısı; toplam > 0 açık; olay yalnız değişimde', () => {
  const d = dunya();
  const sandik = kur(d.c, d.tarla, 'sandik', 10, 10);
  const k1 = kur(d.c, d.tarla, 'kantar', 11, 10);
  const k2 = kur(d.c, d.tarla, 'kantar', 10, 11);
  sandikDoldur(sandik, 400);
  const olaylar = kos(d.c, d.tarla, 5).filter((o) => o.ad === 'sinyal-degisti');
  assert.deepEqual(olaylar.map((o) => o.veri), [{ renk: KIRMIZI, deger: 2 }]);
  assert.deepEqual(sinyalDegerleri(d.c), [2, 0, 0, 0, 0, 0]);
  ayarUygula(k2, 'renk', MOR);
  kos(d.c, d.tarla, 2);
  assert.deepEqual(sinyalDegerleri(d.c), [1, 0, 0, 0, 1, 0]);
  assert.ok(k1.ozel.yaz > 0 && k2.ozel.yaz === MOR + 1);
  assert.equal(ayarUygula(k1, 'renk', 6), false);
  assert.equal(ayarUygula(k1, 'renk', -1), false, 'yazıcı rengi "yok" olamaz');
});

test('savak kapağı: sinyalde kapan / sinyalde açıl (ters); kapalıyken geri basınç', () => {
  const d = sira('savak-kapagi');
  const [savak, sandik] = [d.parca, d.sandik];
  besleKos(d, 400);
  assert.ok(sandik.ozel.toplam >= 20, `açık savak akıtır (${sandik.ozel.toplam})`);
  kur(d.c, d.tarla, 'kantar', 30, 30); // kırmızıya yazar (komşu sandık %100)
  sandikDoldur(kur(d.c, d.tarla, 'sandik', 31, 30), 400);
  kos(d.c, d.tarla, 100); // sinyal kırmızı: savak kapanır, hat dolar
  assert.equal(savak.ozel.kapali, 1);
  const once = sandik.ozel.toplam;
  const bas = hatBul(d.c, 10, 10);
  besleKos(d, 600);
  assert.equal(sandik.ozel.toplam, once, 'kapalıyken geçmez');
  assert.equal(bas.n, bas.pos.length, 'geri basınç: arkadaki hat dolu');
  for (let k = 1; k < bas.n; k++) assert.ok(bas.pos[k - 1] - bas.pos[k] >= ARALIK);
  ayarUygula(savak, 'kip', 'acil'); // ters: sinyal varken açık
  kos(d.c, d.tarla, 1);
  assert.equal(savak.ozel.kapali, 0);
  besleKos(d, 200);
  assert.ok(sandik.ozel.toplam > once, 'ters ayarda sinyalle akar');
});

test('savak geçmiş eşyayı durdurmaz, aşağı akış boşalır; sökülünce tampon envantere', () => {
  const d = sira('savak-kapagi');
  ayarUygula(d.parca, 'kip', 'acil'); // sinyal yok → kapalı
  besleKos(d, 100);
  assert.equal(d.sandik.ozel.toplam, 0);
  ayarUygula(d.parca, 'kip', 'kapan');
  besleKos(d, 300);
  assert.ok(d.sandik.ozel.toplam > 0);
  d.parca.ozel.tampon.push(CIVI); // tampondaki eşya sökümde kaybolmaz
  const env = d.c.envanter[CIVI];
  komutEkle(d.c, { tur: 'sok', x: 13, y: 10 });
  kos(d.c, d.tarla, 1);
  assert.equal(d.c.envanter[CIVI], env + 1);
});

test('rüzgâr gülü: dik esiyor (eksen × yön × şiddet) ve şiddet eşiği', () => {
  const d = dunya();
  const gul = kur(d.c, d.tarla, 'ruzgar-gulu', 10, 10, 0); // doğu ekseni: kuzey/güney dik
  const yaz = (yon, siddet) => {
    havaSapi.hava = () => ({ yon, siddet, gok: 0 });
    gul.ozel.dilim = -1;
    kos(d.c, d.tarla, 1);
    return gul.ozel.yaz > 0;
  };
  try {
    for (let yon = 0; yon < 4; yon++) {
      for (let siddet = 0; siddet < 4; siddet++) {
        const beklenen = (yon & 1) === 1 && siddet >= 2;
        assert.equal(yaz(yon, siddet), beklenen, `yön ${yon} şiddet ${siddet}`);
      }
    }
    gul.yon = 1; // aynı parça kuzey-güney eksenli: şimdi doğu/batı dik
    assert.equal(yaz(0, 3), true);
    assert.equal(yaz(1, 3), false);
    ayarUygula(gul, 'kip', 'siddet');
    ayarUygula(gul, 'esik', 3);
    assert.equal(yaz(0, 2), false);
    assert.equal(yaz(2, 3), true, 'yönden bağımsız');
    assert.equal(ayarUygula(gul, 'esik', 4), false);
  } finally {
    havaSapi.hava = () => ({ yon: 0, siddet: 2, gok: 0 });
  }
});

test('rüzgâr gülü tahmini: şimdiki + sonraki 3 dilim, dilim değişince yenilenir', () => {
  const d = dunya();
  const gul = kur(d.c, d.tarla, 'ruzgar-gulu', 10, 10, 0);
  const cagrilar = [];
  havaSapi.hava = (tohum, dilim) => {
    cagrilar.push(dilim);
    return { yon: dilim & 3, siddet: 3, gok: 0 };
  };
  try {
    kos(d.c, d.tarla, 1);
    assert.deepEqual(gul.ozel.tahmin.map((t) => t[0]), [0, 1, 2, 3]);
    kos(d.c, d.tarla, MANTIK.dilimTik);
    assert.deepEqual(gul.ozel.tahmin.map((t) => t[0]), [1, 2, 3, 0]);
    assert.equal(gul.ozel.dilim, 1);
    assert.ok(gul.tanim.incele(gul).some(([e]) => e === '+1 dilim'));
  } finally {
    havaSapi.hava = () => ({ yon: 0, siddet: 2, gok: 0 });
  }
});

test('örnek devre 1: rüzgâra göre yol (iki kol, zıt savaklar, biri hep akar)', () => {
  const d = dunya();
  const kol = (y, kip) => {
    bantCek(d.c, d.tarla, 10, y, 0, 3);
    const s = kur(d.c, d.tarla, 'savak-kapagi', 13, y, 0);
    ayarUygula(s, 'kip', kip);
    bantCek(d.c, d.tarla, 14, y, 0, 3);
    return kur(d.c, d.tarla, 'sandik', 17, y);
  };
  const tinaz = kol(10, 'acil'); // rüzgâr dikken açık
  const seytan = kol(20, 'kapan'); // rüzgâr dikken kapalı
  kur(d.c, d.tarla, 'ruzgar-gulu', 30, 30, 0);
  kos(d.c, d.tarla, 1);
  const besle = () => {
    for (const y of [10, 20]) hatBasaKoy(hatBul(d.c, 10, y), SAMAN);
    kos(d.c, d.tarla, 1);
  };
  try {
    for (const [yon, tinazAkar] of [[1, true], [0, false], [3, true]]) {
      havaSapi.hava = () => ({ yon, siddet: 2, gok: 0 });
      kos(d.c, d.tarla, 150); // sinyal yerine otursun, yoldaki eşyalar boşalsın
      const [a, b] = [tinaz.ozel.toplam, seytan.ozel.toplam];
      for (let t = 0; t < 300; t++) besle();
      assert.equal(tinaz.ozel.toplam > a, tinazAkar, `yön ${yon}: tınaz kolu`);
      assert.equal(seytan.ozel.toplam > b, !tinazAkar, `yön ${yon}: şeytan yeli kolu`);
    }
  } finally {
    havaSapi.hava = () => ({ yon: 0, siddet: 2, gok: 0 });
  }
});

test('örnek devre 3: taşma koruması: depo dolunca toz hattı savaktan geçer', () => {
  const d = dunya();
  const cukur = kur(d.c, d.tarla, 'deneme-gubre', 30, 30);
  const kantar = kur(d.c, d.tarla, 'kantar', 32, 30);
  ayarUygula(kantar, 'renk', MOR);
  ayarUygula(kantar, 'esik', 100);
  bantCek(d.c, d.tarla, 10, 10, 0, 3);
  const savak = kur(d.c, d.tarla, 'savak-kapagi', 13, 10, 0);
  ayarUygula(savak, 'renk', MOR);
  ayarUygula(savak, 'kip', 'acil'); // normalde kapalı: toz çukura gider, taşınca sandığa
  bantCek(d.c, d.tarla, 14, 10, 0, 3);
  const sandik = kur(d.c, d.tarla, 'sandik', 17, 10);
  kos(d.c, d.tarla, 1);
  const d2 = { c: d.c, tarla: d.tarla };
  besleKos(d2, 300);
  assert.equal(sandik.ozel.toplam, 0, 'çukur boşken toz sandığa gitmez');
  cukur.ozel.n = 100;
  besleKos(d2, 300);
  assert.ok(sandik.ozel.toplam > 5, 'çukur %100: savak açılır');
  cukur.ozel.n = 60;
  besleKos(d2, 150); // yoldaki eşyalar boşalsın
  const simdi = sandik.ozel.toplam;
  besleKos(d2, 300);
  assert.equal(sandik.ozel.toplam, simdi, 'koşul bitince yeniden kapanır');
});

test('ayarUygula: bilinmeyen ad, kötü değer ve parçaya dokunmama', () => {
  const d = dunya();
  const savak = kur(d.c, d.tarla, 'savak-kapagi', 10, 10);
  const once = JSON.stringify(savak.ozel);
  for (const [ad, v] of [['yok', 1], ['kip', 'x'], ['renk', 'mor'], ['renk', 1.5],
    ['toString', 1], ['kapali', 1]]) {
    assert.equal(ayarUygula(savak, ad, v), false, `${ad}=${v}`);
  }
  assert.equal(JSON.stringify(savak.ozel), once);
  assert.equal(ayarUygula(savak, 'renk', CIVIT), true);
  assert.equal(savak.ozel.renk, CIVIT);
});

test('kaydet → yükle → sürdür: devre bit bit aynı (tampon, say, darbe, yazma bayrakları)', () => {
  const kurgu = () => {
    const d = dunya(5, duzTarla(0));
    bantCek(d.c, d.tarla, 10, 10, 0, 3);
    const kile = kur(d.c, d.tarla, 'kile-sayaci', 13, 10, 0);
    ayarUygula(kile, 'kip', 'darbe');
    ayarUygula(kile, 'n', 5);
    ayarUygula(kile, 'renk', MOR);
    bantCek(d.c, d.tarla, 14, 10, 0, 3);
    const savak = kur(d.c, d.tarla, 'savak-kapagi', 17, 10, 0);
    ayarUygula(savak, 'renk', MOR);
    bantCek(d.c, d.tarla, 18, 10, 0, 2);
    kur(d.c, d.tarla, 'sandik', 20, 10);
    const kantar = kur(d.c, d.tarla, 'kantar', 21, 10);
    ayarUygula(kantar, 'esik', 25);
    ayarUygula(kantar, 'renk', SARI);
    kur(d.c, d.tarla, 'ruzgar-gulu', 30, 30);
    kos(d.c, d.tarla, 1); // hatlar kurulsun
    return d;
  };
  const adim = (d, bas, n) => {
    for (let t = bas; t < bas + n; t++) {
      if (t % 5 === 0) hatBasaKoy(hatBul(d.c, 10, 10), SAMAN);
      kos(d.c, d.tarla, 1);
    }
  };
  const kesintisiz = kurgu();
  adim(kesintisiz, 0, 2000);
  for (const kesit of [1, 7, 333, 1000]) { // darbe sırasında ve arasında kes
    const parcali = kurgu();
    adim(parcali, 0, kesit);
    const kayit = JSON.parse(JSON.stringify(dunyaKodla(parcali.c, parcali.tarla)));
    const tarla = duzTarla(0);
    const { c } = dunyaCoz(kayit, tarla);
    const yuklu = { c, tarla };
    assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(parcali.c, parcali.tarla), `yükleme ${kesit}`);
    adim(yuklu, kesit, 2000 - kesit);
    const hedef = dunyaOzeti(kesintisiz.c, kesintisiz.tarla);
    assert.equal(dunyaOzeti(c, tarla), hedef, `kesit ${kesit}`);
    assert.deepEqual(sinyalDegerleri(c), sinyalDegerleri(kesintisiz.c));
  }
  assert.ok(parcaAt(kesintisiz.c, 20, 10).ozel.toplam > 0);
});
