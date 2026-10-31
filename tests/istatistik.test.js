/** İstatistik kurallarının birim testleri (sahte depo, DOM yok). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANAHTAR, SON_SAYISI, TOHUM_SINIRI, bosIstatistik, bellekDeposu, temizle, yukle, kaydet,
  dunEtiketi, gecerliSeri, oynandiKaydet, pesKaydet, bulunduKaydet, ozet,
  okumalarEmoji, paylasimEki,
} from '../js/kural/istatistik.js';

const sonuc = (etiket, sureMs, ek = {}) => ({
  etiket, sureMs, kaldirilan: 100, dedektorKullanilan: 1, dedektorHakki: 3, okumalar: [], ...ek,
});

test('dunEtiketi ay ve yıl sınırlarını geçer', () => {
  assert.equal(dunEtiketi('2026-03-01'), '2026-02-28');
  assert.equal(dunEtiketi('2026-01-01'), '2025-12-31');
  assert.equal(dunEtiketi('2024-03-01'), '2024-02-29');
});

test('oynanan ve pes sayaçları artar, eski nesne değişmez', () => {
  const a = bosIstatistik();
  const b = pesKaydet(oynandiKaydet(a));
  assert.equal(a.oynanan, 0);
  assert.equal(b.oynanan, 1);
  assert.equal(b.pesEdilen, 1);
});

test('bulma: süre, ortalama, saman, en iyi ve rekor', () => {
  let ist = bosIstatistik();
  let r;
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('a', 60000), '2026-10-31'));
  assert.equal(r.rekor, false, 'ilk bulma rekor sayılmaz');
  assert.equal(ist.enIyiMs, 60000);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('b', 90000), '2026-10-31'));
  assert.equal(r.rekor, false);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('c', 30000), '2026-10-31'));
  assert.equal(r.rekor, true);
  assert.equal(r.oncekiEnIyiMs, 60000);
  const o = ozet({ ...ist, oynanan: 4 }, '2026-10-31');
  assert.equal(o.enIyiMs, 30000);
  assert.equal(o.ortalamaMs, 60000);
  assert.equal(o.toplamSaman, 300);
  assert.equal(o.bulmaYuzde, 75);
});

test('tohum başına en iyi süre ve tohum rekoru', () => {
  let ist = bosIstatistik();
  ({ ist } = bulunduKaydet(ist, sonuc('x', 50000), '2026-10-31'));
  let r;
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('x', 70000), '2026-10-31'));
  assert.equal(r.tohumRekoru, false);
  assert.equal(ist.tohumEnIyi.x, 50000);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('x', 40000), '2026-10-31'));
  assert.equal(r.tohumRekoru, true);
  assert.equal(r.rekor, true);
  assert.equal(ist.tohumEnIyi.x, 40000);
});

test('tohum tablosu sınırlıdır ve "__proto__" etiketi güvenlidir', () => {
  let ist = bosIstatistik();
  for (let i = 0; i < TOHUM_SINIRI + 20; i++) {
    ({ ist } = bulunduKaydet(ist, sonuc(`t${i}`, 1000 + i), '2026-10-31'));
  }
  assert.equal(Object.keys(ist.tohumEnIyi).length, TOHUM_SINIRI);
  assert.ok(!('t0' in ist.tohumEnIyi));
  ({ ist } = bulunduKaydet(ist, sonuc('__proto__', 5000), '2026-10-31'));
  assert.equal(ist.tohumEnIyi['__proto__'], 5000);
  const geri = temizle(JSON.parse(JSON.stringify(ist)));
  assert.equal(geri.tohumEnIyi['__proto__'], 5000);
});

test('son süreler en çok SON_SAYISI kadar tutulur, en yeni sonda', () => {
  let ist = bosIstatistik();
  for (let i = 1; i <= 14; i++) ({ ist } = bulunduKaydet(ist, sonuc(`t${i}`, i * 1000), 'x'));
  assert.equal(ist.sonSureler.length, SON_SAYISI);
  assert.equal(ist.sonSureler[0].sureMs, 5000);
  assert.equal(ist.sonSureler.at(-1).sureMs, 14000);
});

test('günün tarlası serisi: art arda günler artar, boşluk sıfırlar', () => {
  let ist = bosIstatistik();
  let r;
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-10-29', 1000), '2026-10-29'));
  assert.equal(r.seri, 1);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-10-30', 1000), '2026-10-30'));
  assert.equal(r.seri, 2);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-10-31', 1000), '2026-10-31'));
  assert.equal(r.seri, 3);
  assert.equal(ist.enUzunSeri, 3);
  assert.equal(ozet(ist, '2026-10-31').bugunCozuldu, true);
  // aynı gün tekrar çözmek seriyi artırmaz
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-10-31', 900), '2026-10-31'));
  assert.equal(r.seri, 3);
  // iki gün atlayınca seri kopar; yeni çözüm 1'den başlar, en uzun korunur
  assert.equal(gecerliSeri(ist, '2026-11-01'), 3, 'dün çözüldüyse hâlâ geçerli');
  assert.equal(gecerliSeri(ist, '2026-11-02'), 0);
  assert.equal(ozet(ist, '2026-11-02').bugunCozuldu, false);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-11-02', 1000), '2026-11-02'));
  assert.equal(r.seri, 1);
  assert.equal(ist.enUzunSeri, 3);
});

test('başka günün ya da rastgele tarla seriye sayılmaz', () => {
  let ist = bosIstatistik();
  let r;
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-10-20', 1000), '2026-10-31'));
  assert.equal(r.gunluk, false);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('a7k2p9', 1000), '2026-10-31'));
  assert.equal(r.seri, 0);
  assert.equal(ist.gunlukSon, null);
});

test('depo: kaydet/yukle gidiş dönüş, bozuk veri ve yazma hatası', () => {
  const depo = bellekDeposu();
  assert.deepEqual(yukle(depo), bosIstatistik());
  const { ist } = bulunduKaydet(oynandiKaydet(bosIstatistik()), sonuc('a', 4000), '2026-10-31');
  assert.equal(kaydet(depo, ist), true);
  assert.deepEqual(yukle(depo), ist);

  const hatalar = [];
  const eski = console.error;
  console.error = (...a) => hatalar.push(a);
  try {
    depo.setItem(ANAHTAR, '{bozuk');
    assert.deepEqual(yukle(depo), bosIstatistik());
    const dolu = { getItem: () => null, setItem: () => { throw new Error('kota'); } };
    assert.equal(kaydet(dolu, ist), false);
  } finally {
    console.error = eski;
  }
  assert.equal(hatalar.length, 2);
});

test('temizle: bozuk alanları atar', () => {
  const t = temizle({ oynanan: -3, bulunan: 'x', enIyiMs: 'a', gunlukSon: 'dün',
    sonSureler: [{ etiket: 'a', sureMs: 5 }, { etiket: 7 }, null], tohumEnIyi: { a: 'b', c: 2 } });
  assert.equal(t.oynanan, 0);
  assert.equal(t.bulunan, 0);
  assert.equal(t.enIyiMs, null);
  assert.equal(t.gunlukSon, null);
  assert.deepEqual(t.sonSureler, [{ etiket: 'a', sureMs: 5 }]);
  assert.deepEqual({ ...t.tohumEnIyi }, { c: 2 });
});

test('özet: veri yokken bölme hatası yok', () => {
  const o = ozet(bosIstatistik(), '2026-10-31');
  assert.equal(o.bulmaYuzde, null);
  assert.equal(o.ortalamaMs, null);
  assert.equal(o.seri, 0);
});

test('okuma emojileri ve paylaşım eki', () => {
  assert.equal(okumalarEmoji(['Soğuk', 'Ilık', 'Sıcak', 'Yanıyor!']), '🟦🟨🟧🟥');
  assert.equal(okumalarEmoji([]), '');
  assert.equal(okumalarEmoji(['???']), '⬜');
  const ek = paylasimEki(sonuc('a b', 1, { okumalar: ['Soğuk', 'Yanıyor!'] }), 'https://x.y/oyun/');
  assert.equal(ek, '🟦🟥\nhttps://x.y/oyun/?tohum=a%20b');
  assert.equal(paylasimEki(sonuc('k', 1), 'https://x.y/'), 'https://x.y/?tohum=k');
});
