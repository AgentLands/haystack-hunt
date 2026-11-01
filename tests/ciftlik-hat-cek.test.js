/**
 * Çiftlik inşa yolu (saf): hat çekme izi (4 yön, köşe histerezisi, geri izleme), L yolu,
 * yol denetimi (geçerli önek, mevcut bandı yeniden yönlendirme, kesişme, kapıya bağlanma,
 * kuruş) ve tek parça önizleme durumu (geçerli / bağlantısız / geçersiz).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  izKur, izIlerle, lYolu, yonlariAta, yolDenetle, yolCiftleri, HISTEREZIS,
} from '../js/kural/ciftlik/insa/hat-yolu.js';
import { yerlesimKonumu, yerlesimDurumu } from '../js/kural/ciftlik/insa/yerlesim.js';
import { komutEkle, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { parcaAt } from '../js/kural/ciftlik/izgara.js';
import { dunya, kur, bantCek, duzTarla } from './ciftlik-yardim.mjs';

const xy = (iz) => iz.karolar.map((k) => `${k.kx},${k.ky}`).join(' ');

/** İmleci (karo birimi) a'dan b'ye küçük adımlarla sürer. */
function sur(iz, a, b, n = 20) {
  for (let i = 1; i <= n; i++) {
    izIlerle(iz, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
  }
  return iz;
}

test('iz 4 yönlü ilerler: çapraz atlama yok, sıçrayan imleçte de komşu adımlar', () => {
  const iz = izKur(5, 5);
  izIlerle(iz, 9.5, 8.5); // tek seferde uzak sıçrama
  const k = iz.karolar;
  assert.equal(xy(iz), '5,5 6,5 7,5 8,5 9,5 9,6 9,7 9,8');
  for (let i = 1; i < k.length; i++) {
    assert.equal(Math.abs(k[i].kx - k[i - 1].kx) + Math.abs(k[i].ky - k[i - 1].ky), 1);
  }
});

test('ilk karonun ekseni ilk baskın hareketten', () => {
  assert.equal(izIlerle(izKur(0, 0), 0.6, 1.7).eksen, 'y');
  assert.equal(izIlerle(izKur(0, 0), 1.7, 0.6).eksen, 'x');
  // yarım karodan az hareket: iz yerinde
  assert.equal(xy(izIlerle(izKur(0, 0), 0.9, 0.95)), '0,0');
});

test('köşe histerezisi: eksen değişimi için merkezden ≥ 0,6 karo sapma gerekir', () => {
  const iz = sur(izKur(0, 0), [0.5, 0.5], [3.5, 0.5]);
  assert.equal(xy(iz), '0,0 1,0 2,0 3,0');
  // imleç alttaki karoya girdi ama merkezden yalnız 0,55 saptı: köşe dönülmez
  izIlerle(iz, 3.5, 0.5 + 0.55);
  assert.equal(xy(iz), '0,0 1,0 2,0 3,0');
  izIlerle(iz, 3.5, 0.5 + HISTEREZIS);
  assert.equal(xy(iz), '0,0 1,0 2,0 3,0 3,1');
  // dönüşten sonra titreme geri çevirmez: yatay eksene dönmek için de 0,6 gerekir
  izIlerle(iz, 3.5 + 0.55, 1.5);
  assert.equal(xy(iz), '0,0 1,0 2,0 3,0 3,1');
  assert.equal(iz.eksen, 'y');
});

test('köşede yan titreme düz hatta dönemeç açmaz', () => {
  const iz = sur(izKur(0, 0), [0.5, 0.5], [1.6, 0.5]);
  for (let i = 0; i <= 40; i++) izIlerle(iz, 1.6 + i * 0.15, 0.5 + (i % 2 ? 0.58 : -0.58));
  assert.ok(iz.karolar.every((k) => k.ky === 0), xy(iz));
});

test('geri izleme kuyruğu siler; kendi izine basan adım da keser', () => {
  const iz = sur(izKur(0, 0), [0.5, 0.5], [6.5, 0.5]);
  sur(iz, [6.5, 0.5], [6.5, 3.5]);
  assert.equal(iz.karolar.length, 10);
  sur(iz, [6.5, 3.5], [6.5, 0.5]); // aynı yoldan geri
  assert.equal(xy(iz), '0,0 1,0 2,0 3,0 4,0 5,0 6,0');
  sur(iz, [6.5, 0.5], [2.5, 0.5]);
  assert.equal(xy(iz), '0,0 1,0 2,0');
  assert.equal(iz.eksen, 'x');
  // ilmek: aşağı, sola, yukarı → başlangıç sırasının karosuna basınca oraya kadar kesilir
  const ilmek = izKur(0, 0);
  sur(ilmek, [0.5, 0.5], [3.5, 0.5]);
  sur(ilmek, [3.5, 0.5], [3.5, 2.5]);
  sur(ilmek, [3.5, 2.5], [1.5, 2.5]);
  sur(ilmek, [1.5, 2.5], [1.5, 0.5]);
  assert.equal(xy(ilmek), '0,0 1,0');
});

test('yönler: her karo sonrakine bakar, son karo gelişi sürdürür; L yolu', () => {
  const y = yonlariAta([{ kx: 0, ky: 0 }, { kx: 1, ky: 0 }, { kx: 1, ky: 1 }], 3);
  assert.deepEqual(y.map((k) => k.yon), [0, 1, 1]);
  assert.deepEqual(yonlariAta([{ kx: 4, ky: 4 }], 2)[0].yon, 2);
  const l = lYolu({ kx: 0, ky: 0 }, { kx: 2, ky: -2 }, 'x', 0);
  assert.equal(l.map((k) => `${k.kx},${k.ky}:${k.yon}`).join(' '),
    '0,0:0 1,0:0 2,0:3 2,-1:3 2,-2:3');
  const l2 = lYolu({ kx: 0, ky: 0 }, { kx: 2, ky: -2 }, 'y', 0);
  assert.equal(l2[1].kx, 0);
  assert.equal(l2[1].ky, -1);
});

test('yol denetimi: engelde geçerli önek; engel kapıya bakıyorsa bağ', () => {
  const { c, tarla } = dunya();
  kur(c, tarla, 'sandik', 15, 10);
  const yol = lYolu({ kx: 10, ky: 10 }, { kx: 18, ky: 10 }, 'x', 0);
  const d = yolDenetle(c, tarla, 'bant', yol);
  assert.equal(d.karolar.length, 6);
  assert.deepEqual(d.karolar.map((k) => k.durum), ['yeni', 'yeni', 'yeni', 'yeni', 'yeni',
    'engel']);
  assert.equal(d.karolar[5].neden, 'dolu');
  assert.equal(d.yeni, 5);
  assert.equal(d.bag, true);
  // önek kurulur: komut çiftleri benzetimde 5 bant, sandığa akan hat
  for (const cift of yolCiftleri(c, 'bant', d)) for (const k of cift.yap) komutEkle(c, k);
  tikAt(c, tarla);
  assert.equal(c.parcalar.size, 6);
  assert.equal(parcaAt(c, 14, 10).yon, 0);
});

test('yol denetimi: baştaki parça atlanır, mevcut bant yeniden yönlenir, kuruş sınırı', () => {
  const { c, tarla } = dunya();
  const huni = kur(c, tarla, 'huni', 10, 10);
  bantCek(c, tarla, 13, 10, 2, 2); // batıya bakan iki bant (13, 12)
  const yol = lYolu({ kx: 11, ky: 10 }, { kx: 15, ky: 10 }, 'x', 0);
  const d = yolDenetle(c, tarla, 'bant', yol);
  assert.deepEqual(d.karolar.map((k) => k.durum), ['atla', 'don', 'don', 'yeni', 'yeni']);
  const ciftler = yolCiftleri(c, 'bant', d);
  assert.equal(ciftler.length, 4);
  assert.deepEqual(ciftler[0].geri[0], { tur: 'dondur', x: 12, y: 10, yon: 2 });
  assert.ok(huni);
  const pahali = yolDenetle(c, tarla, 'bant', yol, { fiyat: 2, butce: 3 });
  assert.equal(pahali.karolar.at(-1).neden, 'kurus');
  assert.equal(pahali.yeni, 1);
  const kilitli = yolDenetle(c, tarla, 'bant', lYolu({ kx: 30, ky: 30 }, { kx: 33, ky: 30 },
    'x', 0), { kilit: 'D4' });
  assert.equal(kilitli.karolar[0].neden, 'kilitli');
});

test('yol denetimi: dik geçilen hat kesişmedir (menfez önerisi), yasak ve saman engeldir', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 20, 5, 1, 6); // kuzey-güney hat
  const d = yolDenetle(c, tarla, 'bant', lYolu({ kx: 17, ky: 8 }, { kx: 23, ky: 8 }, 'x', 0));
  assert.equal(d.kesisme, 3);
  assert.equal(d.karolar.at(-1).durum, 'kesisme');
  assert.equal(d.yeni, 3);
  // hattın ucunda durmak kesişme değil, yeniden yönlendirmedir
  const uc = yolDenetle(c, tarla, 'bant', lYolu({ kx: 17, ky: 8 }, { kx: 20, ky: 8 }, 'x', 0));
  assert.equal(uc.karolar.at(-1).durum, 'don');
  const yasak = yolDenetle(c, tarla, 'bant', lYolu({ kx: 3, ky: 3 }, { kx: 0, ky: 3 }, 'x', 2));
  assert.deepEqual(yasak.karolar.map((k) => k.neden ?? k.durum), ['yeni', 'yeni', 'yeni', 'yasak']);
  const samanli = dunya(7, duzTarla(0, [{ x: 70, y: 20, r: 6, t: 40 }]));
  const s = yolDenetle(samanli.c, samanli.tarla, 'bant',
    lYolu({ kx: 30, ky: 10 }, { kx: 40, ky: 10 }, 'x', 0));
  assert.equal(s.karolar.at(-1).neden, 'saman');
});

test('tek parça önizleme: ortalanmış konum, bağlantılı / bağlantısız / geçersiz', () => {
  const { c, tarla } = dunya();
  assert.deepEqual(yerlesimKonumu('huni', 10, 10, 0), { x: 10, y: 10 });
  assert.deepEqual(yerlesimKonumu('bant', 10, 10, 1), { x: 10, y: 10 });
  const bos = yerlesimDurumu(c, tarla, 'huni', 10, 10, 0);
  assert.equal(bos.durum, 'uyari');
  bantCek(c, tarla, 12, 10, 0, 2);
  const bagli = yerlesimDurumu(c, tarla, 'huni', 10, 10, 0);
  assert.equal(bagli.durum, 'gecerli');
  assert.deepEqual(bagli.baglar, [{ kx: 12, ky: 10 }]);
  // bant porta geri bakıyorsa bağlanmaz
  const ters = dunya();
  bantCek(ters.c, ters.tarla, 12, 10, 2, 1);
  assert.equal(yerlesimDurumu(ters.c, ters.tarla, 'huni', 10, 10, 0).durum, 'uyari');
  // sandık: kendine akan banda bağlanır; kapısız parça (bant) hep geçerli
  assert.equal(yerlesimDurumu(c, tarla, 'sandik', 14, 10, 0).durum, 'gecerli');
  assert.equal(yerlesimDurumu(c, tarla, 'sandik', 14, 12, 0).durum, 'uyari');
  assert.equal(yerlesimDurumu(c, tarla, 'bant', 30, 30, 0).durum, 'gecerli');
  const dolu = yerlesimDurumu(c, tarla, 'huni', 11, 9, 0);
  assert.deepEqual([dolu.durum, dolu.neden], ['gecersiz', 'dolu']);
  assert.equal(yerlesimDurumu(c, tarla, 'sandik', 40, 40, 0, { fiyat: 15, butce: 10 }).neden,
    'kurus');
  assert.equal(yerlesimDurumu(c, tarla, 'sandik', 40, 40, 0, { kilit: 'D4' }).neden, 'kilitli');
});
