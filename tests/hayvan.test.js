/** Tarla hayvanlarının (js/kural/hayvan*.js) yerleşim ve hareket kuralı testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { tarlaKur } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { garajKur } from '../js/kural/makineler/garaj.js';
import '../js/kural/makineler/hepsi.js';
import { karakterKur } from '../js/kural/karakter.js';
import { hayvanKur, TURLER, KENAR } from '../js/kural/hayvan.js';
import {
  sasirt, rahatsizEt, uyandir, ilerlet, uyeKonumu, ziplama, DALIS_SURE,
} from '../js/kural/hayvan-hareket.js';

function dunya(etiket, zorluk) {
  const tarla = tarlaKur(metindenTohum(etiket), zorluk);
  const { garaj, makineler } = garajKur(tarla, tarla.zorluk);
  const karakter = karakterKur(tarla, garaj, []);
  return { tarla, garaj, makineler, karakter, hayvanlar: hayvanKur(tarla, garaj, karakter) };
}

const ozet = (hayvanlar) => JSON.stringify(hayvanlar);
const tur = (d, ad) => d.hayvanlar.find((h) => h.tur === ad);

/** Verilen türden bir hayvanı bulunana dek tohum deneyerek dünya kurar. */
function turluDunya(ad) {
  for (let i = 0; i < 60; i++) {
    const d = dunya(`hayvan-${ad}-${i}`);
    if (tur(d, ad)) return d;
  }
  throw new Error(`${ad} çıkmadı`);
}

test('yerleşim deterministik, tarlayı değiştirmez, sayı 4-8 ve tarla içinde', () => {
  let kedi = 0;
  for (let i = 0; i < 14; i++) {
    const a = dunya(`t${i}`);
    const b = dunya(`t${i}`);
    assert.equal(ozet(a.hayvanlar), ozet(b.hayvanlar));
    assert.deepEqual(a.tarla.h, b.tarla.h);
    assert.ok(a.hayvanlar.length >= 4 && a.hayvanlar.length <= 8, `sayı ${a.hayvanlar.length}`);
    for (const h of a.hayvanlar) {
      assert.ok(h.x >= KENAR && h.x <= GENISLIK - KENAR, `x ${h.x}`);
      assert.ok(h.y >= KENAR && h.y <= YUKSEKLIK - KENAR, `y ${h.y}`);
    }
    if (tur(a, 'kedi')) kedi++;
  }
  assert.ok(kedi < 12, `kedi nadir: ${kedi}/14`);
  assert.notEqual(ozet(dunya('x1').hayvanlar), ozet(dunya('x2').hayvanlar));
});

test('hayvan üretimi tarla, iğne ve çivi üretimini değiştirmez', () => {
  const tohum = metindenTohum('degismez');
  const once = tarlaKur(tohum);
  const { garaj } = garajKur(once, once.zorluk);
  hayvanKur(once, garaj, { x: 20, y: 80 });
  const sonra = tarlaKur(tohum);
  assert.deepEqual(once.h, sonra.h);
  assert.deepEqual(once.igne, sonra.igne);
  assert.deepEqual(once.civiler, sonra.civiler);
});

test('hayvanlar başta samanın içinde saklıdır; fare ve serçe samanda, kedi uykuda', () => {
  const d = dunya('saklı');
  for (const h of d.hayvanlar) {
    if (h.tur === 'kedi') assert.equal(h.durum, 'uyku');
    else assert.equal(h.durum, 'gizli');
    if (h.tur === 'fare' || h.tur === 'serce') assert.ok(h.h0 >= 3, `saman ${h.h0}`);
  }
});

test('yakın rahatsızlık ürkütür, uzak olan ürkütmez; ürkme yönü tehditten uzaktır', () => {
  const d = turluDunya('fare');
  const f = tur(d, 'fare');
  assert.equal(rahatsizEt(d.hayvanlar, d.tarla, f.x + 40, f.y).length, 0);
  assert.equal(f.durum, 'gizli');
  const urken = rahatsizEt(d.hayvanlar, d.tarla, f.x - 2, f.y);
  assert.ok(urken.includes(f));
  assert.equal(f.durum, 'sasirma');
  assert.ok(Math.cos(f.yon) > 0.99, 'tehdit solda: sağa bakar');
  assert.equal(sasirt(f, d.tarla, f.x, f.y), false, 'zaten ürkmüş');
});

test('fare kaçar, yüksek samana dalar ve tarla içinde kalır', () => {
  const d = turluDunya('fare');
  const f = tur(d, 'fare');
  const bas = { x: f.x, y: f.y };
  rahatsizEt(d.hayvanlar, d.tarla, f.x - 1, f.y - 1);
  assert.ok(d.tarla.h[Math.floor(f.hy) * GENISLIK + Math.floor(f.hx)] >= TURLER.fare.siginak
    || Math.hypot(f.hx - bas.x, f.hy - bas.y) >= TURLER.fare.enAz, 'sığınak ya da uzak nokta');
  let kacti = false;
  let daldi = false;
  for (let i = 0; i < 1200 && f.durum !== 'kayip' && !(daldi && f.durum === 'gizli'); i++) {
    ilerlet(d.hayvanlar, d.tarla, 1 / 30);
    if (f.durum === 'kacis') kacti = true;
    if (f.durum === 'dalis') daldi = true;
    assert.ok(f.x >= 0 && f.x <= GENISLIK && f.y >= 0 && f.y <= YUKSEKLIK, 'sınır içinde');
  }
  assert.ok(kacti && daldi, 'kaçtı ve daldı');
  assert.ok(f.durum === 'gizli' || f.durum === 'kayip');
  assert.ok(Math.hypot(f.x - bas.x, f.y - bas.y) >= TURLER.fare.enAz - 1, 'uzaklaştı');
  if (f.durum === 'gizli') assert.ok(f.bekle > 0, 'dalıştan sonra kısa bağışıklık');
});

test('fare en çok iki kez kaçar; sonra samanda kaybolur', () => {
  const d = turluDunya('fare');
  const f = tur(d, 'fare');
  for (let tur2 = 0; tur2 < 3 && f.durum !== 'kayip'; tur2++) {
    rahatsizEt(d.hayvanlar, d.tarla, f.x - 0.5, f.y, 10);
    for (let i = 0; i < 1500 && f.durum !== 'gizli' && f.durum !== 'kayip'; i++) {
      ilerlet(d.hayvanlar, d.tarla, 1 / 30);
    }
    ilerlet(d.hayvanlar, d.tarla, 2);
  }
  assert.equal(f.durum, 'kayip');
  assert.equal(f.kacis, TURLER.fare.azamiKacis);
});

test('kazı sonucu saklandığı saman azalırsa hayvan kendiliğinden kaçar', () => {
  const d = turluDunya('fare');
  const f = tur(d, 'fare');
  ilerlet(d.hayvanlar, d.tarla, 1, { x: f.x - 8, y: f.y });
  assert.equal(f.durum, 'gizli', 'saman duruyor: kımıldamaz');
  d.tarla.h[Math.floor(f.y) * GENISLIK + Math.floor(f.x)] = 0;
  ilerlet(d.hayvanlar, d.tarla, 0.1);
  assert.equal(f.durum, 'gizli', 'tehdit noktası yoksa denetlenmez');
  ilerlet(d.hayvanlar, d.tarla, 0.1, { x: f.x - 8, y: f.y });
  assert.equal(f.durum, 'sasirma');
});

test('serçe sürüsü havalanır, sürü ekrandan çıkar ve kaybolur', () => {
  const d = turluDunya('serce');
  const s = tur(d, 'serce');
  rahatsizEt(d.hayvanlar, d.tarla, s.x + 1, s.y);
  assert.ok(s.sure > 0.5);
  ilerlet(d.hayvanlar, d.tarla, 0.2);
  assert.equal(s.durum, 'ucus');
  ilerlet(d.hayvanlar, d.tarla, 0.2);
  assert.ok(s.uyeler.every((u) => uyeKonumu(s, u).z > 0), 'yerden kalktı');
  ilerlet(d.hayvanlar, d.tarla, s.sure - s.t - 0.01);
  for (const u of s.uyeler) {
    const k = uyeKonumu(s, u);
    assert.ok(k.x < 0 || k.y < 0 || k.x > GENISLIK || k.y > YUKSEKLIK, 'tarla dışında');
  }
  ilerlet(d.hayvanlar, d.tarla, 0.05);
  assert.equal(s.durum, 'kayip');
});

test('kirpi ve kurbağa yavaştır; kirpi önce kıvrılır, kurbağa zıplayarak ilerler', () => {
  for (const ad of ['kirpi', 'kurbaga']) {
    const d = turluDunya(ad);
    const h = tur(d, ad);
    rahatsizEt(d.hayvanlar, d.tarla, h.x - 1, h.y);
    assert.equal(h.durum, 'sasirma');
    ilerlet(d.hayvanlar, d.tarla, ad === 'kirpi' ? 1.0 : 0.1);
    assert.equal(h.durum, 'sasirma', `${ad}: ürkme süresi sürüyor`);
    ilerlet(d.hayvanlar, d.tarla, 0.5);
    assert.equal(h.durum, 'kacis');
    const bas = { x: h.x, y: h.y };
    ilerlet(d.hayvanlar, d.tarla, 1);
    const yol = Math.hypot(h.x - bas.x, h.y - bas.y);
    assert.ok(yol > 0.5 && yol <= TURLER[ad].hiz * 1.0 + 0.01, `${ad} 1 sn yolu ${yol}`);
    assert.ok(TURLER[ad].hiz <= 11 && TURLER.kirpi.hiz < 4);
  }
  assert.ok(ziplama(0.1).havada && !ziplama(0.5).havada && ziplama(0.155).yuk > 0.9);
});

test('kedi makine çalışınca esner, kalkar, yürür ve oturup kalır', () => {
  let d;
  for (let i = 0; i < 80 && !(d && tur(d, 'kedi')); i++) d = dunya(`kedi-${i}`);
  const k = tur(d, 'kedi');
  assert.ok(k, 'kedi çıktı');
  assert.equal(k.durum, 'uyku');
  ilerlet(d.hayvanlar, d.tarla, 5);
  assert.equal(k.durum, 'uyku', 'kendiliğinden uyanmaz');
  const bas = { x: k.x, y: k.y };
  assert.equal(uyandir(d.hayvanlar, d.tarla, 'kedi', d.karakter.x, d.karakter.y).length, 1);
  assert.equal(k.durum, 'esneme');
  ilerlet(d.hayvanlar, d.tarla, TURLER.kedi.tepki + 0.1);
  assert.equal(k.durum, 'kacis');
  ilerlet(d.hayvanlar, d.tarla, 6);
  assert.equal(k.durum, 'otur');
  assert.ok(Math.hypot(k.x - bas.x, k.y - bas.y) > 4, 'yer değiştirdi');
  assert.ok(k.x >= KENAR && k.x <= GENISLIK - KENAR && k.y >= KENAR && k.y <= YUKSEKLIK - KENAR);
  ilerlet(d.hayvanlar, d.tarla, 5);
  assert.equal(k.durum, 'otur');
  assert.equal(rahatsizEt(d.hayvanlar, d.tarla, k.x, k.y).length, 0, 'oturan kedi yeniden ürkmez');
});

test('aynı olaylar ve kare süreleri aynı sonucu verir; kare hızından bağımsız', () => {
  const kos = (dt) => {
    const d = dunya('sabit');
    const f = tur(d, 'fare');
    rahatsizEt(d.hayvanlar, d.tarla, f.x - 1, f.y);
    for (let t = 0; t < 2.4; t += dt) ilerlet(d.hayvanlar, d.tarla, dt);
    return ozet(d.hayvanlar);
  };
  assert.equal(kos(1 / 30), kos(1 / 30));
  assert.equal(kos(0.04), kos(0.04));
  assert.ok(DALIS_SURE > 0);
});
