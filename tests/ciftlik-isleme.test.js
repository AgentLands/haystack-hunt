/**
 * Çiftlik işleme ailesi: ot savurucu (hava × güç), kurutma ambarı (600 tik / 24 yuva, güçsüz
 * ¼), balya presi (saflık → 3 balya, nem reddi, sıkışma/Temizle, darbeli talep, 96 tik),
 * çekiçli kıyıcı (10 tik, kırılma/Onar 50 + 200 tik), gübre çukuru (puan, kapasite, 2400 tik
 * gübreleme); iğne/buluntu hiçbir makinede yok olmaz; kaydet → yükle aynı.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ekonomiAl } from '../js/kural/ciftlik/ekonomi/kurus.js';
import { tikAt, komutEkle, ciftlikSamani } from '../js/kural/ciftlik/benzetim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import { parcaDurumu } from '../js/kural/ciftlik/parca-kayit.js';
import { ISLEME } from '../js/kural/ciftlik/parcalar/isleme.js';
import { dunyaHazirla, ZEMIN } from '../js/kural/ciftlik/dunya/zemin.js';
import { karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { dunya, kur, bantCek, kos, havaSabitle } from './ciftlik-yardim.mjs';
import { K, hatKur, ekle, bulunanlar, kosKadar } from './ciftlik-isleme-yardim.mjs';

const hava = (gok, siddet) => havaSabitle({ yon: 0, gok, siddet });
const talep = (m) => m.tanim.talep(m);

test('ot savurucu: kuruma süresi havaya bağlı (200 / 240 / 400 tik), güçsüz ⅓', () => {
  for (const [gok, siddet, oran, beklenen] of [['gunes', 2, 1024, 200], ['gunes', 0, 1024, 240],
    ['bulut', 3, 1024, 400], ['gunes', 2, 341, 601]]) {
    hava(gok, siddet);
    const { c, tarla } = dunya();
    const { k, a } = hatKur(c, tarla, 'ot-savurucu', 20, 20, { guc: oran === 1024 });
    ekle(k, 'yas-ot');
    const t = kosKadar(c, tarla, tikAt, 1000, () => a.ozel.alinan.length > 0);
    assert.ok(Math.abs(t - beklenen) <= 1, `${gok}/${siddet}/${oran}: ${t} tik`);
    assert.deepEqual(a.ozel.alinan, [K('kuru-ot')]);
  }
  hava('gunes', 2);
});

test('ot savurucu: 9 yuva → 54/dk; yağmurda durur ("hava"), kuru eşya bekletmeden geçer', () => {
  hava('gunes', 2);
  let { c, tarla } = dunya();
  let { k, a, m } = hatKur(c, tarla, 'ot-savurucu', 20, 20);
  ekle(k, 'yas-ot', 200);
  kos(c, tarla, 600);
  const once = a.ozel.alinan.length;
  kos(c, tarla, 1200);
  const dk = a.ozel.alinan.length - once;
  assert.ok(Math.abs(dk - 54) <= 2, `dakikada ${dk}`);
  assert.equal(talep(m), ISLEME.savurucu.guc);
  hava('yagmur', 1);
  ({ c, tarla } = dunya());
  ({ k, a, m } = hatKur(c, tarla, 'ot-savurucu', 20, 20));
  ekle(k, 'yas-ot', 12);
  kos(c, tarla, 600);
  assert.equal(a.ozel.alinan.length, 0);
  assert.equal(m.ozel.tur.length, ISLEME.savurucu.kap, 'giriş dolar');
  assert.equal(parcaDurumu(m), 'hava');
  assert.equal(talep(m), 0, 'ilerleyemeyen makine güç istemez');
  ({ c, tarla } = dunya());
  ({ k, a, m } = hatKur(c, tarla, 'ot-savurucu', 20, 20));
  ekle(k, 'yas-ot');
  ekle(k, 'saman');
  ekle(k, 'igne');
  kos(c, tarla, 5);
  assert.deepEqual(a.ozel.alinan, [K('saman'), K('igne')], 'kuru eşya ve iğne geçer');
  hava('gunes', 2);
});

test('kurutma ambarı: 24 yuva, yaş ot başına 600 tik; güçsüz (256) dört kat; yalnız yaş ot', () => {
  for (const [oran, sure] of [[1024, 600], [256, 2400]]) {
    const { c, tarla } = dunya();
    const { m, k, a } = hatKur(c, tarla, 'kurutma-ambari', 20, 20, { guc: oran === 1024 });
    a.ozel.acik = 0;
    ekle(k, 'yas-ot', 30);
    kos(c, tarla, sure - 30);
    assert.equal(m.ozel.hazir, 0, `${oran}: henüz kurumadı`);
    kos(c, tarla, 60);
    assert.equal(m.ozel.hazir + m.ozel.yuva.length, ISLEME.kurutma.yuva, 'yuva sınırı');
    assert.equal(k.ozel.kuyruk.length, 6, 'fazlası girişte bekler');
    assert.ok(m.ozel.hazir >= 20, `${oran}: ${m.ozel.hazir} kurudu`);
    assert.equal(parcaDurumu(m), 'cikis-dolu');
  }
  const { c, tarla } = dunya();
  const { m } = hatKur(c, tarla, 'kurutma-ambari', 20, 20, { kaynak: false });
  bantCek(c, tarla, 15, 21, 0, 5);
  tikAt(c, tarla);
  c.hatlar[0].pos[0] = 0;
  c.hatlar[0].tur[0] = K('civi');
  c.hatlar[0].n = 1;
  kos(c, tarla, 80);
  assert.equal(parcaDurumu(m), 'yabanci', 'çivi girişte bekler');
  assert.equal(c.hatlar[0].n, 1, 'çivi kaybolmaz');
});

/** Pres: kaynaktan n eşya, k tik koş; alıcının aldığı balyalar. */
function presle(esyalar, tik) {
  const { c, tarla } = dunya();
  const { m, k, a } = hatKur(c, tarla, 'balya-presi', 20, 20);
  for (const ad of esyalar) ekle(k, ad);
  const olaylar = kos(c, tarla, tik);
  return { c, tarla, m, k, a, olaylar };
}

test('balya presi: saflık 3 balya türünü seçer; döngü 96 tik (12,5 balya/dk)', () => {
  assert.deepEqual(presle(Array(8).fill('saman'), 200).a.ozel.alinan, [K('balya-saman')]);
  assert.deepEqual(presle(Array(8).fill('kuru-ot'), 200).a.ozel.alinan, [K('balya-ot')]);
  const karisik = ['saman', 'saman', 'toz', 'kiyim', 'kuru-ot', 'saman', 'saman', 'saman'];
  assert.deepEqual(presle(karisik, 200).a.ozel.alinan, [K('balya-karisik')]);
  const { a } = presle(Array(8 * 30).fill('saman'), 1200);
  assert.ok(Math.abs(a.ozel.alinan.length - 12.5) <= 1, `dakikada ${a.ozel.alinan.length} balya`);
});

test('balya presi: darbeli talep (dolum 4 bg, basma 30 bg; boşta 0)', () => {
  const { c, tarla } = dunya();
  const { m, k } = hatKur(c, tarla, 'balya-presi', 20, 20);
  ekle(k, 'saman', 8);
  const gorulen = new Map();
  for (let i = 0; i < 150; i++) {
    tikAt(c, tarla);
    gorulen.set(talep(m), (gorulen.get(talep(m)) ?? 0) + 1);
  }
  assert.equal(gorulen.get(ISLEME.pres.gucDolum), 56, 'dolum 8 × 7 tik');
  assert.equal(gorulen.get(ISLEME.pres.gucBasma), 40, 'basma 40 tik');
  assert.equal(talep(m), 0);
});

test('balya presi: yaş ot ve hafif buluntu reddedilir ("nemli", "yabancı"), kaybolmaz', () => {
  for (const [ad, rozet] of [['yas-ot', 'nemli'], ['buluntu:tuy', 'yabanci']]) {
    const { c, tarla } = dunya();
    const { m } = hatKur(c, tarla, 'balya-presi', 20, 20, { kaynak: false });
    bantCek(c, tarla, 15, 20, 0, 5);
    tikAt(c, tarla);
    const h = c.hatlar[0];
    Object.assign(h, { n: 1 });
    h.tur[0] = K(ad);
    kos(c, tarla, 80);
    assert.equal(parcaDurumu(m), rozet);
    assert.equal(h.n, 1);
    assert.equal(m.ozel.kalip.length, 0);
  }
});

test('balya presi: sert eşya sıkıştırır; Temizle eşyayı oyuncuya verir, kalıp kalır', () => {
  const { c, tarla, m, k, olaylar } = presle(['saman', 'saman', 'civi', 'saman'], 100);
  assert.equal(m.tikali, true);
  assert.equal(parcaDurumu(m), 'tikali');
  assert.ok(olaylar.some((o) => o.ad === 'parca-tikandi' && o.veri.neden === 'sikisti'));
  assert.equal(m.ozel.kalip.length, 2);
  assert.equal(k.ozel.kuyruk.length, 1, 'sıkışık pres almaz');
  komutEkle(c, { tur: 'temizle', x: m.x, y: m.y });
  const sonra = kos(c, tarla, 1);
  assert.ok(sonra.some((o) => o.ad === 'parca-temizlendi'));
  assert.equal(m.tikali, false);
  assert.equal(c.envanter[K('civi')], 1);
  assert.equal(m.ozel.kalip.length, 3, 'kalıptaki 2 tutam kaldı, sıradaki girdi');
  komutEkle(c, { tur: 'temizle', x: m.x, y: m.y });
  const red = kos(c, tarla, 1).find((o) => o.ad === 'komut-reddedildi');
  assert.equal(red.veri.neden, 'gereksiz');
});

test('balya presi: iğne kalıbı sıkıştırır; Temizle iğneyi tam ödemeyle oyuncuya verir', () => {
  const { c, tarla, m } = presle(['igne'], 10);
  assert.equal(m.tikali, true);
  komutEkle(c, { tur: 'temizle', x: m.x, y: m.y });
  const [b] = bulunanlar(kos(c, tarla, 1));
  assert.equal(b.kaynak, 'temizle');
  assert.equal(b.kurus, 250);
  assert.equal(c.envanter[K('igne')], 1);
  assert.equal(ekonomiAl(c).kurus, 300 + 250);
});

test('kıyıcı: saman/kuru ot → kıyım, 10 tik (≈ 120/dk); yabancı reddedilir', () => {
  const { c, tarla } = dunya();
  const { m, a } = hatKur(c, tarla, 'cekicli-kiyici', 20, 20, { kaynak: false });
  const k = kur(c, tarla, 'test-kaynak', 19, 20, 0); // makineden sonra: adil sıra
  ekle(k, 'saman', 100);
  ekle(k, 'kuru-ot', 100);
  kos(c, tarla, 1200);
  assert.ok(Math.abs(a.ozel.alinan.length - 120) <= 2, `dakikada ${a.ozel.alinan.length}`);
  assert.ok(a.ozel.alinan.every((kod) => kod === K('kiyim')));
  assert.equal(talep(m), ISLEME.kiyici.guc);
  const d = dunya();
  const y = hatKur(d.c, d.tarla, 'cekicli-kiyici', 20, 20);
  ekle(y.k, 'toz');
  kos(d.c, d.tarla, 30);
  assert.equal(y.k.ozel.kuyruk.length, 1, 'toz kıyıcıya girmez');
});

test('kıyıcı: sert eşya çekici kırar, çıkıştan atılır; Onar 50 kuruş + 200 tik', () => {
  const { c, tarla } = dunya();
  const { m, k, a } = hatKur(c, tarla, 'cekicli-kiyici', 20, 20);
  ekle(k, 'tas');
  ekle(k, 'saman');
  const olaylar = kos(c, tarla, 50);
  assert.deepEqual(a.ozel.alinan, [K('tas')], 'taş olduğu gibi atıldı');
  assert.equal(parcaDurumu(m), 'kirik');
  assert.ok(olaylar.some((o) => o.ad === 'parca-tikandi' && o.veri.neden === 'kirik'));
  assert.equal(k.ozel.kuyruk.length, 1, 'kırıkken almaz');
  ekonomiAl(c).kurus = 20;
  komutEkle(c, { tur: 'onar', x: m.x, y: m.y });
  let red = kos(c, tarla, 1).find((o) => o.ad === 'komut-reddedildi');
  assert.equal(red.veri.neden, 'kurus-yok');
  ekonomiAl(c).kurus = 80;
  komutEkle(c, { tur: 'onar', x: m.x, y: m.y });
  kos(c, tarla, 1);
  assert.equal(ekonomiAl(c).kurus, 80 - ISLEME.kiyici.onarKurus);
  komutEkle(c, { tur: 'onar', x: m.x, y: m.y });
  red = kos(c, tarla, 1).find((o) => o.ad === 'komut-reddedildi');
  assert.equal(red.veri.neden, 'suruyor');
  kos(c, tarla, ISLEME.kiyici.onarTik - 3);
  assert.equal(parcaDurumu(m), 'kirik', 'onarım sürüyor');
  kos(c, tarla, 20);
  assert.deepEqual(a.ozel.alinan, [K('tas'), K('kiyim')], 'onarılınca yeniden kıyar');
});

test('kıyıcı: iğne çekici kırar ama kaybolmaz (çıkıştan atılır)', () => {
  const { c, tarla } = dunya();
  const { a, k } = hatKur(c, tarla, 'cekicli-kiyici', 20, 20);
  ekle(k, 'igne');
  kos(c, tarla, 10);
  assert.deepEqual(a.ozel.alinan, [K('igne')]);
});

test('gübre çukuru: toz 1, çürük ot 2, karışık balya 8 puan; 120 dolu; 2400 tikte −20', () => {
  const { c, tarla } = dunya();
  const { m, k } = hatKur(c, tarla, 'gubre-cukuru', 20, 20, { alici: false });
  const arazi = dunyaHazirla(c);
  const cayir = [[m.x + 3, m.y], [m.x, m.y + 4], [m.x + 5, m.y + 5], [m.x + 9, m.y + 8]];
  for (const [x, y] of cayir) arazi.zemin[karoIndeks(x, y)] = ZEMIN.CAYIR;
  ekle(k, 'toz', 2);
  ekle(k, 'curuk-ot');
  ekle(k, 'balya-karisik', 20);
  ekle(k, 'saman');
  const olaylar = kos(c, tarla, 40);
  assert.equal(m.ozel.puan, 2 + 2 + 8 * 14, 'kapasiteye dek');
  assert.equal(k.ozel.kuyruk.length, 7, 'fazlası ve saman girişte bekler');
  assert.equal(c.cikanKat, 3 * 12 + 14 * 96, 'gübrelenen saman korunum sayacına');
  assert.equal(olaylar.filter((o) => o.ad === 'gubre-serpildi').length, 0);
  const sonra = kos(c, tarla, ISLEME.gubre.aralik);
  assert.equal(sonra.find((o) => o.ad === 'gubre-serpildi').veri.karo, 3, 'menzildeki çayır');
  assert.ok(arazi.gubre[karoIndeks(m.x + 3, m.y)] > c.tik, 'çayır gübreli (dunya/zemin.js)');
  assert.equal(arazi.gubre[karoIndeks(m.x + 9, m.y + 8)], 0, 'menzil dışı');
  assert.equal(m.ozel.puan, ISLEME.gubre.kap, '−20 sonra 3 balya daha girdi');
  assert.equal(k.ozel.kuyruk.length, 4);
  arazi.zemin.fill(ZEMIN.HARMAN);
  kos(c, tarla, ISLEME.gubre.aralik);
  assert.match(m.tanim.incele(m)[0][1], /Yalnız çöp/);
});

test('gübre çukuru: iğne ve buluntu oyuncuya iade (defter, kuruş yok)', () => {
  const { c, tarla } = dunya();
  const { k } = hatKur(c, tarla, 'gubre-cukuru', 20, 20, { alici: false });
  ekle(k, 'igne');
  ekle(k, 'buluntu:tuy');
  const b = bulunanlar(kos(c, tarla, 5));
  assert.deepEqual(b.map((v) => [v.kaynak, v.kip, v.kurus]), [['gubre', 'kurussuz', 0],
    ['gubre', 'kurussuz', 0]]);
  assert.equal(c.envanter[K('igne')], 1);
  assert.equal(c.envanter[K('buluntu:tuy')], 1);
});

test('saman korunumu: pres + kıyıcı + gübre hattında ciftlikSamani + cikanKat sabit', () => {
  const { c, tarla } = dunya();
  const p = hatKur(c, tarla, 'balya-presi', 20, 20);
  const y = hatKur(c, tarla, 'cekicli-kiyici', 20, 30);
  const g = hatKur(c, tarla, 'gubre-cukuru', 20, 40, { alici: false });
  ekle(p.k, 'saman', 40);
  ekle(y.k, 'kuru-ot', 40);
  ekle(g.k, 'toz', 30);
  const bas = ciftlikSamani(c, tarla);
  for (let i = 0; i < 20; i++) {
    kos(c, tarla, 30);
    assert.equal(ciftlikSamani(c, tarla) + (c.cikanKat ?? 0), bas);
  }
});

test('kaydet → yükle: işleme parçaları yarı yoldayken aynı özet ve aynı devam', () => {
  hava('gunes', 2);
  const { c, tarla } = dunya();
  ekle(hatKur(c, tarla, 'ot-savurucu', 20, 20).k, 'yas-ot', 20);
  ekle(hatKur(c, tarla, 'kurutma-ambari', 20, 26).k, 'yas-ot', 20);
  ekle(hatKur(c, tarla, 'balya-presi', 20, 32).k, 'saman', 20);
  const y = hatKur(c, tarla, 'cekicli-kiyici', 20, 38);
  ekle(y.k, 'saman', 3);
  ekle(y.k, 'civi');
  ekle(hatKur(c, tarla, 'gubre-cukuru', 20, 44, { alici: false }).k, 'toz', 20);
  kos(c, tarla, 77);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(c, tarla)));
  const t2 = { h: tarla.h.slice(), kirli: tarla.kirli, kaldirilan: tarla.kaldirilan };
  const c2 = dunyaCoz(kayit, t2).c;
  assert.equal(dunyaOzeti(c2, t2), dunyaOzeti(c, tarla));
  kos(c, tarla, 400);
  kos(c2, t2, 400);
  assert.equal(dunyaOzeti(c2, t2), dunyaOzeti(c, tarla));
});
