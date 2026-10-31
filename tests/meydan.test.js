/** Meydan okuma bağlantısı kurallarının testleri (URL, ad güvenliği, fark metni). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_AZAMI, RAKIP_EN_AZ, RAKIP_EN_COK, sureYaz, adTemizle, meydanAyristir, meydanBaglantisi,
  hedefMetni, farkMetni, davetMetni,
} from '../js/kural/meydan.js';

const TABAN = 'https://ornek.org/oyun/index.html';

test('sureYaz: dakika:saniye, saatten uzunsa saatli', () => {
  assert.equal(sureYaz(83000), '1:23');
  assert.equal(sureYaz(5000), '0:05');
  assert.equal(sureYaz(3725000), '1:02:05');
  assert.equal(sureYaz(-5), '0:00');
});

test('adTemizle: uzunluk, boşluk ve denetim karakterleri', () => {
  assert.equal(adTemizle('  Ayşe  '), 'Ayşe');
  assert.equal(adTemizle('A\nB\tC'), 'A B C');
  assert.equal(adTemizle('a'.repeat(40)).length, AD_AZAMI);
  assert.equal(adTemizle('‮ters‬'), 'ters', 'çift yönlü denetim karakteri atılır');
  assert.equal(adTemizle(''), '');
  assert.equal(adTemizle(null), '');
  assert.equal(adTemizle(42), '');
});

test('adTemizle: yazının kod noktası kesilmez, etiket metin kalır', () => {
  const emoji = '😀'.repeat(20);
  assert.equal([...adTemizle(emoji)].length, AD_AZAMI);
  assert.equal(adTemizle('<img src=x onerror=alert(1)>'), '<img src=x onerr');
  assert.ok(!adTemizle('<b>x</b>').includes('\n'));
});

test('meydanAyristir: geçerli bağlantı', () => {
  const m = meydanAyristir('?tohum=abc&zorluk=zor&rakip=83000&ad=Ay%C5%9Fe');
  assert.deepEqual(m, { tohum: 'abc', zorluk: 'zor', rakipMs: 83000, ad: 'Ayşe' });
});

test('meydanAyristir: zorluk yoksa ya da bilinmiyorsa normal', () => {
  assert.equal(meydanAyristir('?tohum=a&rakip=5000').zorluk, 'normal');
  assert.equal(meydanAyristir('?tohum=a&rakip=5000&zorluk=imkansiz').zorluk, 'normal');
  assert.equal(meydanAyristir('?tohum=a&rakip=5000').ad, '');
});

test('meydanAyristir: bozuk ya da eksik parametre meydan okuma sayılmaz', () => {
  assert.equal(meydanAyristir(''), null);
  assert.equal(meydanAyristir('?tohum=a'), null);
  assert.equal(meydanAyristir('?rakip=5000'), null, 'tohum şart');
  assert.equal(meydanAyristir('?tohum=a&rakip=abc'), null);
  assert.equal(meydanAyristir('?tohum=a&rakip=-5000'), null);
  assert.equal(meydanAyristir('?tohum=a&rakip=1.5e4'), null);
  assert.equal(meydanAyristir(`?tohum=a&rakip=${RAKIP_EN_AZ - 1}`), null);
  assert.equal(meydanAyristir(`?tohum=a&rakip=${RAKIP_EN_COK + 1}`), null);
  assert.equal(meydanAyristir('?tohum=a&rakip=99999999999999'), null);
  assert.equal(meydanAyristir(`?tohum=${'x'.repeat(65)}&rakip=5000`), null);
  assert.notEqual(meydanAyristir(`?tohum=a&rakip=${RAKIP_EN_AZ}`), null);
  assert.notEqual(meydanAyristir(`?tohum=a&rakip=${RAKIP_EN_COK}`), null);
});

test('meydanAyristir: ad uzunluğu ve içeriği sınırlanır', () => {
  const m = meydanAyristir(`?tohum=a&rakip=5000&ad=${'z'.repeat(100)}`);
  assert.equal(m.ad.length, AD_AZAMI);
});

test('meydanBaglantisi: gidiş dönüş ve eski arama temizlenir', () => {
  const adres = meydanBaglantisi({
    taban: `${TABAN}?tohum=eski&rahat=1#x`, tohum: 'tarla 1', zorluk: 'kolay', sureMs: 83456.7,
    ad: 'Ayşe',
  });
  assert.ok(adres.startsWith(`${TABAN}?`));
  assert.ok(!adres.includes('rahat') && !adres.includes('#'));
  const geri = meydanAyristir(new URL(adres).search);
  assert.deepEqual(geri, { tohum: 'tarla 1', zorluk: 'kolay', rakipMs: 83457, ad: 'Ayşe' });
});

test('meydanBaglantisi: ad boşsa parametre yok, zorluk her zaman var', () => {
  const adres = new URL(meydanBaglantisi({
    taban: TABAN, tohum: 'a', zorluk: 'normal', sureMs: 9000, ad: '  ',
  }));
  assert.equal(adres.searchParams.has('ad'), false);
  assert.equal(adres.searchParams.get('zorluk'), 'normal');
  assert.equal(adres.searchParams.get('rakip'), '9000');
});

test('meydanBaglantisi: adda özel karakterler kaçırılır', () => {
  const adres = new URL(meydanBaglantisi({
    taban: TABAN, tohum: 'a', zorluk: 'zor', sureMs: 9000, ad: 'A&B=C?#',
  }));
  assert.equal(adres.searchParams.get('ad'), 'A&B=C?#');
  assert.equal(adres.hash, '');
});

test('hedefMetni', () => {
  assert.equal(hedefMetni({ rakipMs: 83000, ad: 'Ayşe' }), 'Geçilecek süre: 1:23 (Ayşe)');
  assert.equal(hedefMetni({ rakipMs: 83000, ad: '' }), 'Geçilecek süre: 1:23');
});

test('farkMetni: geçtin, geride kaldın, berabere', () => {
  assert.deepEqual(farkMetni(71000, 83000), { metin: 'Rakibi 0:12 farkla geçtin.', gecti: true });
  assert.deepEqual(farkMetni(91000, 83000), { metin: '0:08 geride kaldın.', gecti: false });
  assert.equal(farkMetni(83000, 83000).gecti, null);
});

test('farkMetni: saniyeden küçük fark ondalıklı yazılır', () => {
  assert.equal(farkMetni(82600, 83000).metin, 'Rakibi 0,4 sn farkla geçtin.');
  assert.equal(farkMetni(83300, 83000).metin, '0,3 sn geride kaldın.');
});

test('davetMetni', () => {
  assert.equal(davetMetni(83000, 'Ayşe'),
    "Ayşe: Haystack Hunt'ta iğneyi 1:23 sürede buldum. Geçebilir misin?");
  assert.ok(davetMetni(83000).startsWith("Haystack Hunt'ta"));
});
