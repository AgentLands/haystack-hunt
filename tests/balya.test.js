/** Balya makinesi ve balyalar: toplayıcı, balya bırakma, iğne/çivi paketleme, açma, çarpışma. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK } from '../js/kural/boyut.js';
import { tarlaKur, toplamSaman, cokert } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { igneDerinligi, igneHucreleri, igneKonumu } from '../js/kural/igne.js';
import { dedektorOku, miknatisCek, igneyiAlabilirMi } from '../js/kural/araclar.js';
import { alinabilirCivi } from '../js/kural/civi.js';
import { karakterYuru } from '../js/kural/karakter.js';
import '../js/kural/makineler/hepsi.js';
import { makineTanimi } from '../js/kural/makineler/kayit.js';
import { yeniMakine } from '../js/kural/makineler/garaj.js';
import { surusAdim } from '../js/kural/makineler/surus.js';
import {
  BALYA_KAPASITE, TOPLAYICI_EN, seritHucreleri,
} from '../js/kural/makineler/balya.js';
import {
  BALYA_YARICAP, ACMA_SURE, balyaBirak, balyaEngelleri, acilacakBalya, balyaAcIlerlet,
} from '../js/kural/balyalar.js';

const DT = 1 / 60;
const tanim = makineTanimi('balya');

function duzTarla(yuk = 0) {
  const t = tarlaKur(metindenTohum('balya'));
  t.h.fill(yuk);
  return t;
}

/** Hazne dolup bir balya bırakılana dek (en çok n kare) çalıştırır; olay adlarını döndürür. */
function balyaya(t, m, n = 2000) {
  const adlar = [];
  for (let i = 0; i < n && !adlar.includes('balya-birakildi'); i++) {
    for (const [ad] of tanim.calis(t, m, DT).olaylar) adlar.push(ad);
  }
  return adlar;
}

const balyaSamani = (t) => t.balyalar.reduce((s, b) => s + b.saman, 0);

test('balya makinesi kayıtlı: traktörden hızlı, tırmanma eşiği traktörünkünü aşmaz', () => {
  const tr = makineTanimi('traktor');
  assert.equal(tanim.ad, 'Balya makinesi');
  assert.ok(tanim.azamiHiz > tr.azamiHiz);
  assert.ok(tanim.tirmanma <= tr.tirmanma);
});

test('toplayıcı şeridi önünden ince ve geniş bir katman alır; yüksek duvara uzanmaz', () => {
  const t = duzTarla(10);
  const m = yeniMakine('balya', 'b', 100.5, 80.5, 0, 1);
  m.z = 10;
  const once = toplamSaman(t);
  const hucreler = seritHucreleri(m);
  const sutunlar = new Set(hucreler.map((i) => Math.floor(i / GENISLIK)));
  assert.ok(sutunlar.size >= TOPLAYICI_EN - 1, `şerit eni ${sutunlar.size}`);
  assert.ok(hucreler.every((i) => i % GENISLIK > 100)); // gövdenin önünde
  const r = tanim.calis(t, m, 0.1);
  assert.equal(r.miktar, hucreler.length * 6); // hücre başına az (60 kat/sn)
  assert.equal(toplamSaman(t) + m.icerik.saman, once);
  assert.ok(m.yuk > 0 && m.yuk < 1);
  assert.equal(t.kaldirilan, 0);
  // Gövde alçakta, önü yüksek duvar: toplayıcı erişemez.
  const d = duzTarla(60);
  const a = yeniMakine('balya', 'a', 100.5, 80.5, 0, 1);
  assert.equal(tanim.calis(d, a, 0.1).miktar, 0);
});

test('hazne dolunca arkaya balya bırakır; balyadaki saman tarlada sayılır', () => {
  const t = duzTarla(200);
  const m = yeniMakine('balya', 'b', 100.5, 80.5, 0, 1);
  m.z = 200;
  const once = toplamSaman(t);
  const adlar = balyaya(t, m);
  assert.ok(adlar.includes('balya-birakildi'));
  assert.equal(t.balyalar.length, 1);
  const [b] = t.balyalar;
  assert.equal(b.saman, BALYA_KAPASITE);
  assert.ok(b.x < m.x - tanim.yaricap - BALYA_YARICAP, `balya x ${b.x}`); // arkada
  assert.equal(Math.abs(b.y - m.y) < 1e-9, true);
  assert.deepEqual([b.acik, b.acilma, b.igne, b.civiler], [false, 0, false, []]);
  assert.equal(m.icerik.saman, 0);
  assert.equal(m.yuk, 0);
  assert.equal(toplamSaman(t) + balyaSamani(t), once);
  assert.equal(t.kaldirilan, 0);
  // Aynı yerde ikinci balya öncekinin yanına kayar.
  balyaya(t, m);
  assert.equal(t.balyalar.length, 2);
  const [p, q] = t.balyalar;
  assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 2 * BALYA_YARICAP);
});

/** İğnesi toplayıcıya giren balya makinesi kurar, sonra makineyi uzağa sürüp balyalar. */
function igneliBalya() {
  const t = tarlaKur(metindenTohum('balya-igne'));
  const { igne } = t;
  const ilk = { x: igne.x, y: igne.y };
  for (const i of igneHucreleri(igne)) t.h[i] = igne.z + 1;
  const m = yeniMakine('balya', 'b', igne.x + 0.5 - 3.1, igne.y + 0.5, 0, 1);
  m.z = 300;
  const adlar = [];
  for (let i = 0; i < 10; i++) for (const [ad] of tanim.calis(t, m, DT).olaylar) adlar.push(ad);
  assert.ok(adlar.includes('igne-yutuldu'), adlar.join());
  assert.equal(igne.kepcede, true);
  assert.equal(m.icerik.igne, true);
  assert.equal(t.balyalar.length, 0);
  // Makine uzağa gider (iğne hazneyle taşınır), orada hazne dolar.
  Object.assign(m, { x: igne.x > 120 ? igne.x - 70 : igne.x + 70, y: 80.5 });
  tanim.kare(t, m);
  assert.ok(Math.hypot(igne.x - (m.x - 0.5), igne.y - (m.y - 0.5)) < 1);
  for (const i of seritHucreleri(m)) t.h[i] = 50;
  m.icerik.saman = BALYA_KAPASITE - 5;
  assert.ok(balyaya(t, m).includes('balya-birakildi'));
  return { t, m, igne, ilk, balya: t.balyalar[0] };
}

test('yutulan iğne o sırada oluşan balyaya paketlenir; dedektör balyanın yerini gösterir', () => {
  const { t, igne, ilk, balya } = igneliBalya();
  assert.equal(balya.igne, true);
  assert.equal(igne.balyada, balya.id);
  assert.equal(igne.kepcede, false);
  assert.equal(igneDerinligi(t), Infinity); // görünmez, parlamaz
  assert.deepEqual(igneKonumu(t), { x: balya.x - 0.5, y: balya.y - 0.5 });
  assert.equal(dedektorOku(t, balya.x - 0.5, balya.y - 0.5).ad, 'Yanıyor!');
  assert.equal(dedektorOku(t, ilk.x, ilk.y).ad, 'Soğuk');
  assert.equal(miknatisCek(t, balya.x - 0.5, balya.y - 0.5), false); // balyadakini çekemez
  assert.equal(igneyiAlabilirMi(t, igne.x, igne.y), false);
});

test('balya açılınca saman çevreye döner, iğne açıkta kalır ve elle alınabilir', () => {
  const { t, igne, balya } = igneliBalya();
  const once = toplamSaman(t);
  const kaldirilan = t.kaldirilan;
  assert.equal(balyaAcIlerlet(t, balya, ACMA_SURE / 2), null);
  assert.equal(balya.acik, true);
  assert.ok(Math.abs(balya.acilma - 0.5) < 1e-9);
  const sonuc = balyaAcIlerlet(t, balya, ACMA_SURE / 2 + 0.01);
  assert.deepEqual(sonuc, { balya, igne: true, civiSayisi: 0 });
  assert.equal(t.balyalar.length, 0);
  assert.equal(toplamSaman(t), once + BALYA_KAPASITE);
  assert.equal(t.kaldirilan, kaldirilan);
  assert.equal(igne.balyada, null);
  assert.ok(Math.hypot(igne.x - (balya.x - 0.5), igne.y - (balya.y - 0.5)) < 1);
  for (let k = 0; k < 200 && cokert(t); k++);
  assert.equal(igneDerinligi(t), 0); // yayılan saman kayınca da gömülmez
  assert.equal(igneyiAlabilirMi(t, igne.x, igne.y), true);
});

test('paslı çivi de balyaya girer; açılınca açıkta, elle alınabilir', () => {
  const t = tarlaKur(metindenTohum('balya-civi'), 'zor');
  const civi = t.civiler[0];
  for (const i of igneHucreleri(civi)) t.h[i] = civi.z;
  const m = yeniMakine('balya', 'b', civi.x + 0.5 - 3.1, civi.y + 0.5, 0, 1);
  m.z = 300;
  m.icerik.saman = BALYA_KAPASITE - 3;
  const adlar = balyaya(t, m);
  assert.ok(adlar.includes('civi-yutuldu'), adlar.join());
  const balya = t.balyalar.at(-1);
  assert.deepEqual(balya.civiler, [civi]);
  assert.equal(civi.balyada, balya.id);
  assert.equal(alinabilirCivi(t, civi.x, civi.y), null);
  const sonuc = balyaAcIlerlet(t, balya, ACMA_SURE);
  assert.equal(sonuc.civiSayisi, 1);
  assert.equal(alinabilirCivi(t, civi.x, civi.y), civi);
});

test('açılacak balya: kenarına ≤ 1.5 hücre yakın ve yüzü dönük olmalı', () => {
  const t = duzTarla();
  const b = balyaBirak(t, 50, 50, 0, { saman: 10, igne: false, civiler: [] });
  const k = { x: 50 - BALYA_YARICAP - 1.2, y: 50, yon: 0 };
  assert.equal(acilacakBalya(t.balyalar, k), b);
  assert.equal(acilacakBalya(t.balyalar, { ...k, yon: Math.PI }), null); // sırtı dönük
  assert.equal(acilacakBalya(t.balyalar, { ...k, x: 50 - BALYA_YARICAP - 1.7 }), null);
});

test('çarpışma: karakter ve makineler balyanın içinden geçemez', () => {
  const t = duzTarla();
  balyaBirak(t, 60.5, 40.5, 0, { saman: 10, igne: false, civiler: [] });
  const engeller = balyaEngelleri(t.balyalar);
  const k = { x: 55.5, y: 40.5, yon: 0, z: 0, adimFaz: 0 };
  for (let i = 0; i < 120; i++) karakterYuru(t, k, 1, 0, DT, engeller);
  assert.ok(k.x < 60.5 - BALYA_YARICAP - 0.6 + 1e-9, `karakter x ${k.x}`);
  const m = yeniMakine('balya', 'b', 50, 40.5, 0, 1);
  for (let i = 0; i < 180; i++) surusAdim(t, m, { gaz: 1 }, DT, engeller);
  assert.ok(Math.hypot(m.x - 60.5, 0) >= BALYA_YARICAP + tanim.yaricap - 1e-9, `m.x ${m.x}`);
});

test('oyunda: balya makinesine bin, balya bırak, in ve El ile Boşlukla aç', async () => {
  const { yeniOyun, durumAl, adim, aracSec } = await import('../js/oyun.js');
  const { kontrol } = await import('../js/kontrol.js');
  const { dinle } = await import('../js/olaylar.js');
  const adlar = [];
  const birak = ['makine-bin', 'balya-birakildi', 'makine-in', 'balya-acildi']
    .map((ad) => dinle(ad, () => adlar.push(ad)));
  yeniOyun('balya-oyun', 'kolay');
  const d = durumAl();
  assert.equal(d.balyalar, d.tarla.balyalar);
  const m = d.makineler.find((x) => x.tur === 'balya');
  Object.assign(d.karakter, { x: m.x, y: m.y - tanim.yaricap - 1 });
  let zaman = 0;
  const kare = (n = 1) => { for (let i = 0; i < n; i++) adim((zaman += 1000 / 60)); };
  kontrol.binIste = true;
  kare();
  assert.equal(d.karakter.makine, m);
  Object.assign(m, { x: 120.5, y: 80.5, yon: 0 });
  for (const i of seritHucreleri(m)) d.tarla.h[i] = 40;
  m.icerik.saman = BALYA_KAPASITE - 20;
  kontrol.kullan = true;
  kare(30);
  kontrol.kullan = false;
  kare();
  assert.equal(d.balyalar.length, 1);
  const [b] = d.balyalar;
  kontrol.binIste = true;
  kare();
  assert.equal(d.karakter.makine, null);
  aracSec('el');
  Object.assign(d.karakter, { x: b.x - BALYA_YARICAP - 1, y: b.y, yon: 0 });
  kontrol.kullan = true;
  kare(Math.ceil(ACMA_SURE * 60) + 5);
  const kaldirilan = d.tarla.kaldirilan;
  kare(20); // açtıktan sonra basılı tutmak kazmaz (Boşluk bırakılana dek el bekler)
  assert.equal(d.tarla.kaldirilan, kaldirilan);
  kontrol.kullan = false;
  kare();
  kontrol.kullan = true;
  kare(5);
  assert.ok(d.tarla.kaldirilan > kaldirilan);
  kontrol.kullan = false;
  kare();
  for (const f of birak) f();
  assert.deepEqual(adlar, ['makine-bin', 'balya-birakildi', 'makine-in', 'balya-acildi']);
  assert.equal(d.balyalar.length, 0);
});
