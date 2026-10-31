/** İstatistik kurallarının birim testleri (sahte depo, DOM yok). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANAHTAR, SON_SAYISI, TOHUM_SINIRI, bosIstatistik, bellekDeposu, temizle, yukle, kaydet,
  dunEtiketi, gecerliSeri, oynandiKaydet, pesKaydet, bulunduKaydet, ozet,
  okumalarEmoji, paylasimEki, gunFarki, dondurmaVar, dondurmaKurtarir, tarlaAnahtari,
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
  // üç gün atlayınca (dondurma yalnız tek günü kurtarır) seri kopar; yeni çözüm 1'den
  // başlar, en uzun korunur
  assert.equal(gecerliSeri(ist, '2026-11-01'), 3, 'dün çözüldüyse hâlâ geçerli');
  assert.equal(gecerliSeri(ist, '2026-11-03'), 0);
  assert.equal(ozet(ist, '2026-11-03').bugunCozuldu, false);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('2026-11-03', 1000), '2026-11-03'));
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

// --- Seri dondurma (haftada bir) ---
/** gunlukSon ve seri verilmiş bir istatistik. */
const seriIst = (gunlukSon, seri, dondurmaSon = null) => ({
  ...bosIstatistik(), gunlukSon, seri, enUzunSeri: seri, dondurmaSon,
});

test('gunFarki: ay, yıl ve artık yıl sınırları', () => {
  assert.equal(gunFarki('2026-02-27', '2026-03-01'), 2);
  assert.equal(gunFarki('2024-02-27', '2024-03-01'), 3);
  assert.equal(gunFarki('2025-12-31', '2026-01-01'), 1);
  assert.equal(gunFarki('2026-10-31', '2026-10-24'), -7);
});

test('dondurma: tek kaçırılan gün seriyi kurtarır, hak harcanır', () => {
  const ist = seriIst('2026-10-29', 5);
  assert.equal(gecerliSeri(ist, '2026-10-31'), 5, 'bugün oynanana dek korunur');
  const { ist: yeni, rapor } = bulunduKaydet(ist, sonuc('2026-10-31', 60000), '2026-10-31');
  assert.equal(yeni.seri, 6);
  assert.equal(rapor.dondurma, true);
  assert.equal(rapor.seri, 6);
  assert.equal(yeni.dondurmaSon, '2026-10-31');
  assert.equal(yeni.enUzunSeri, 6);
});

test('dondurma: iki gün kaçırılırsa seri kopar', () => {
  const ist = seriIst('2026-10-28', 5);
  assert.equal(gecerliSeri(ist, '2026-10-31'), 0);
  const { ist: yeni, rapor } = bulunduKaydet(ist, sonuc('2026-10-31', 60000), '2026-10-31');
  assert.equal(yeni.seri, 1);
  assert.equal(rapor.dondurma, false);
  assert.equal(yeni.dondurmaSon, null, 'hak harcanmadı');
});

test('dondurma: bir hafta dolmadan ikinci hak yok, dolunca yeniden var', () => {
  const kullanilmis = seriIst('2026-10-29', 6, '2026-10-26');
  assert.equal(dondurmaVar(kullanilmis, '2026-10-31'), false);
  assert.equal(dondurmaKurtarir(kullanilmis, '2026-10-31'), false);
  assert.equal(gecerliSeri(kullanilmis, '2026-10-31'), 0);
  const { ist: kopuk } = bulunduKaydet(kullanilmis, sonuc('2026-10-31', 1000), '2026-10-31');
  assert.equal(kopuk.seri, 1);
  assert.equal(dondurmaVar(seriIst('2026-10-29', 6, '2026-10-24'), '2026-10-31'), true);
  assert.equal(dondurmaVar(seriIst('2026-10-29', 6, '2026-10-25'), '2026-10-31'), false);
});

test('dondurma: dün ya da bugün çözülmüşse hak harcanmaz', () => {
  const dun = seriIst('2026-10-30', 3);
  const { ist, rapor } = bulunduKaydet(dun, sonuc('2026-10-31', 1000), '2026-10-31');
  assert.equal(ist.seri, 4);
  assert.equal(rapor.dondurma, false);
  assert.equal(ist.dondurmaSon, null);
});

test('dondurma: seri yokken (0) hak kurtaracak bir şey bulmaz', () => {
  assert.equal(dondurmaKurtarir(seriIst('2026-10-29', 0), '2026-10-31'), false);
  assert.equal(dondurmaKurtarir(bosIstatistik(), '2026-10-31'), false);
});

test('dondurma: temizle ve özet eski veriyle uyumlu', () => {
  const eski = temizle({ seri: 2, gunlukSon: '2026-10-30' });
  assert.equal(eski.dondurmaSon, null);
  assert.equal(temizle({ dondurmaSon: 'bozuk' }).dondurmaSon, null);
  assert.equal(temizle({ dondurmaSon: '2026-10-20' }).dondurmaSon, '2026-10-20');
  assert.equal(ozet(eski, '2026-10-31').dondurmaVar, true);
  assert.equal(ozet(seriIst('2026-10-29', 3, '2026-10-30'), '2026-10-31').dondurmaVar, false);
});

test('dondurma: rahat modda süresiz kayıt rekora girmez, seri sayılır', () => {
  const { ist, rapor } = bulunduKaydet(seriIst('2026-10-30', 2),
    { ...sonuc('2026-10-31', 1), sureMs: null }, '2026-10-31');
  assert.equal(ist.enIyiMs, null);
  assert.equal(rapor.rekor, false);
  assert.equal(ist.seri, 3);
});

test('rekor zorluğa göre ayrılır: aynı etiket Zor ve Kolay farklı tarladır', () => {
  let ist = bosIstatistik();
  let r;
  ({ ist } = bulunduKaydet(ist, sonuc('abc', 300000, { zorluk: 'zor' }), '2026-10-31'));
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('abc', 60000, { zorluk: 'kolay' }), '2026-10-31'));
  assert.equal(r.tohumRekoru, false, 'Kolay tarla Zor tarlanın rekoruyla karşılaşmaz');
  assert.equal(r.rekor, false, 'Kolay için ilk bulma rekor sayılmaz');
  assert.equal(ist.tohumEnIyi['abc|zor'], 300000);
  assert.equal(ist.tohumEnIyi['abc|kolay'], 60000);
  ({ ist, rapor: r } = bulunduKaydet(ist, sonuc('abc', 250000, { zorluk: 'zor' }), '2026-10-31'));
  assert.equal(r.tohumRekoru, true);
  assert.equal(r.rekor, true);
  assert.equal(r.oncekiEnIyiMs, 300000, 'önceki en iyi o zorluğun en iyisi');
  assert.equal(ist.enIyiMs, 60000, 'genel en iyi süre hepsinin en kısası');
});

test('zorluğu olmayan eski kayıt normal sayılır (geriye uyum)', () => {
  assert.equal(tarlaAnahtari('x', undefined), 'x');
  assert.equal(tarlaAnahtari('x', 'normal'), 'x');
  assert.equal(tarlaAnahtari('x', 'zor'), 'x|zor');
  const eski = temizle({ enIyiMs: 40000, tohumEnIyi: { x: 40000 } });
  assert.equal(eski.zorlukEnIyi.normal, 40000);
  const { rapor } = bulunduKaydet(eski, sonuc('x', 30000, { zorluk: 'normal' }), '2026-10-31');
  assert.equal(rapor.tohumRekoru, true);
  assert.equal(rapor.rekor, true);
  const zor = bulunduKaydet(eski, sonuc('x', 30000, { zorluk: 'zor' }), '2026-10-31').rapor;
  assert.equal(zor.rekor, false, 'eski kayıt Zor rekoru sayılmaz');
  assert.equal(zor.tohumRekoru, false);
});

test('paylaşım bağlantısı: zorluk normal değilse &zorluk= eklenir', () => {
  const ek = (zorluk) => paylasimEki({ etiket: 'abc', zorluk, okumalar: [] }, 'https://o/');
  assert.equal(ek('zor'), 'https://o/?tohum=abc&zorluk=zor');
  assert.equal(ek('kolay'), 'https://o/?tohum=abc&zorluk=kolay');
  assert.equal(ek('normal'), 'https://o/?tohum=abc');
  assert.equal(ek(undefined), 'https://o/?tohum=abc');
});
