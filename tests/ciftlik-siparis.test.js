/**
 * Siparişler ve pano: üretim deterministik, yalnız üretilebilir ürün, aynı tür arka arkaya
 * yok, boy ve ödül formülleri, kapı teslimi (damga önce, soldan sağa, sat / at / iade), D2
 * çivi sıfırlaması, damga basma ve kilit açma, "Geri çevir", ekonominin kayıtla gidiş-dönüşü
 * ve 1 → 2 göçü, ilerleme kaydı.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { komutEkle } from '../js/kural/ciftlik/benzetim.js';
import {
  dunyaKodla, dunyaCoz, dunyaOzeti, gocUygula, SURUM,
} from '../js/kural/ciftlik/sakla.js';
import { SIPARIS, PANO } from '../js/kural/ciftlik/ekonomi/denge.js';
import { ACILIS, acikParcalar, uretilebilir } from '../js/kural/ciftlik/ekonomi/acilis.js';
import {
  ilerlemeKur, ilerlemeBagla, ilerlemeKodla, ilerlemeCoz, etkinDamgaNo, damgaBas,
} from '../js/kural/ciftlik/ekonomi/damga.js';
import { ekonomiAl } from '../js/kural/ciftlik/ekonomi/kurus.js';
import {
  siparisUret, siparisBoyu, odulHesapla, odenecekOdul, teslimEt,
} from '../js/kural/ciftlik/ekonomi/siparis.js';
import { dunya, duzTarla, kos, kur } from './ciftlik-yardim.mjs';

const T0 = acikParcalar(ilerlemeKur());
const HEPSI = new Set(Object.keys(ACILIS));
const SAMAN = esyaKodu('saman');
const CIVI = esyaKodu('civi');
const IGNE = esyaKodu('igne');
const DUGME = esyaKodu('buluntu:dugme');
const olayAdlari = (ol) => ol.map((o) => o.ad).filter((a) => a !== 'ciftlik-ozet');

test('siparisUret: deterministik; zar tohum ve sıraya bağlı', () => {
  const s = { acik: HEPSI, gorulen: ['dugme'], d: 3 };
  for (let sira = 0; sira < 50; sira++) {
    assert.deepEqual(siparisUret(77, sira, s), siparisUret(77, sira, s));
  }
  const a = Array.from({ length: 50 }, (_, i) => JSON.stringify(siparisUret(77, i, s)));
  const b = Array.from({ length: 50 }, (_, i) => JSON.stringify(siparisUret(78, i, s)));
  assert.ok(new Set(a).size > 20, 'çeşitli');
  assert.notDeepEqual(a, b, 'tohum değişince dizi değişir');
});

test('siparisUret: yalnız üretilebilir ürün; T0da karışım ve nadir yok', () => {
  const turler = new Set();
  for (let sira = 0; sira < 400; sira++) {
    const k = siparisUret(5, sira, { acik: T0 });
    turler.add(k.tur);
    for (const kl of k.kalemler) {
      assert.ok(kl.kabul.every((u) => uretilebilir(u, T0)), `${k.tur} ${kl.kabul}`);
    }
  }
  assert.deepEqual([...turler].sort(), ['cop', 'hacim', 'sureli', 'temiz']);
  const hepsi = new Set();
  const urunler = new Set();
  for (let sira = 0; sira < 1000; sira++) {
    const k = siparisUret(5, sira, { acik: HEPSI, gorulen: ['dugme', 'nal'] });
    hepsi.add(k.tur);
    for (const kl of k.kalemler) urunler.add(kl.kabul[0]);
  }
  assert.equal(hepsi.size, 6, 'bütün türler açılınca gelir');
  for (const u of ['saman', 'kuru-ot', 'kiyim', 'balya-saman', 'balya-ot', 'toz', 'civi',
    'tas', 'buluntu:dugme', 'buluntu:nal']) assert.ok(urunler.has(u), u);
  assert.ok(!urunler.has('buluntu:pusula'), 'nadir kart yalnız görülmüş türden');
});

test('siparisUret: aynı tür arka arkaya gelmez; ağırlıklar kabaca tutar', () => {
  let onceki = null;
  const say = {};
  for (let sira = 0; sira < 2000; sira++) {
    const k = siparisUret(9, sira, { acik: HEPSI, gorulen: ['dugme'], onceki });
    assert.notEqual(k.tur, onceki, `sıra ${sira}`);
    say[k.tur] = (say[k.tur] ?? 0) + 1;
    onceki = k.tur;
  }
  assert.ok(say.hacim > say.temiz && say.temiz > say.nadir, JSON.stringify(say));
});

test('boy: yuvarla5(taban × (1 + 0,25 d)); çivi/taş sabit; süreli taban boyda', () => {
  assert.equal(siparisBoyu(120, 2), 180);
  assert.equal(siparisBoyu(20, 5), 45);
  assert.equal(siparisBoyu(15, 8), 45);
  assert.equal(siparisBoyu(30, 1), 40);
  for (let sira = 0; sira < 600; sira++) {
    const k = siparisUret(3, sira, { acik: HEPSI, d: 7 });
    const [kl] = k.kalemler;
    if (k.tur === 'cop' && kl.kabul[0] === 'civi') assert.equal(kl.miktar, 4);
    if (k.tur === 'cop' && kl.kabul[0] === 'tas') assert.equal(kl.miktar, 6);
    if (k.tur === 'cop' && kl.kabul[0] === 'toz') assert.equal(kl.miktar, siparisBoyu(30, 7));
    if (k.tur === 'sureli') {
      assert.equal(kl.miktar, SIPARIS.taban[kl.kabul[0]]);
      assert.equal(k.sure, 6000);
    }
    if (k.tur === 'hacim') assert.equal(kl.miktar, siparisBoyu(SIPARIS.taban[kl.kabul[0]], 7));
    assert.ok(k.kalemler.every((x) => x.miktar % 5 === 0 || x.miktar === 1 || k.tur === 'cop'));
  }
});

test('ödül: Σ miktar × değer × çarpan; çöp sabit; nadir ×1,5; süreli geç ve temiz cezası', () => {
  const k = (u, m) => ({ kabul: [u], miktar: m });
  assert.equal(odulHesapla('hacim', [k('balya-saman', 12)]), 288);
  assert.equal(odulHesapla('temiz', [k('kuru-ot', 40)]), 360);
  assert.equal(odulHesapla('karisim', [k('balya-ot', 6), k('kiyim', 30)]), 600);
  assert.equal(odulHesapla('sureli', [k('balya-saman', 10)]), 360);
  assert.equal(odulHesapla('cop', [k('civi', 4)]), 48);
  assert.equal(odulHesapla('cop', [k('toz', 30)]), 60);
  assert.equal(odulHesapla('nadir', [k('buluntu:pusula', 1)]), 180);
  const sureli = { tur: 'sureli', odul: 360, bitis: 1000 };
  assert.equal(odenecekOdul(sureli, 1000), 360);
  assert.equal(odenecekOdul(sureli, 1001), 180, '×1,5');
  assert.equal(odenecekOdul({ tur: 'temiz', odul: 360, yabanci: 3 }, 0), 252);
  assert.equal(odenecekOdul({ tur: 'temiz', odul: 360, yabanci: 99 }, 0), 180, 'en az %50');
});

/** Boş dünya; pano başlangıçta dolar (olaysız). */
function panoDunya(tohum = 11, il = ilerlemeKur()) {
  const d = dunya(tohum, duzTarla(0));
  ilerlemeBagla(d.c, il);
  const ol = kos(d.c, d.tarla, 1);
  return { ...d, il, e: ekonomiAl(d.c), ol };
}

test('pano: damga kartı yuva 0, iki dönen kart; başlangıç olaysız', () => {
  const { e, ol } = panoDunya();
  assert.deepEqual(olayAdlari(ol), []);
  assert.equal(e.pano[0].damga, 'D1');
  assert.deepEqual(e.pano[0].kalemler, [{ kabul: ['saman'], miktar: 30, teslim: 0 }]);
  assert.ok(e.pano[1] && e.pano[2] && !e.pano[1].damga);
  assert.notEqual(e.pano[1].tur, e.pano[2].tur);
});

test('teslim: damga önce, sonra soldan sağa; tamamlanınca ödül, damga ve yeni kart', () => {
  const { c, tarla, e, il } = panoDunya();
  e.pano[1] = { tur: 'hacim', odul: 360, kalemler: [{ kabul: ['saman'], miktar: 5, teslim: 0 }] };
  for (let i = 0; i < 30; i++) assert.equal(teslimEt(c, SAMAN).yuva, 0);
  for (let i = 0; i < 5; i++) assert.deepEqual(teslimEt(c, SAMAN), { sonuc: 'siparis', yuva: 1 });
  assert.equal(teslimEt(c, SAMAN).sonuc, 'satildi', 'dolan kalem artık almaz');
  const kurus = e.kurus;
  const ol = kos(c, tarla, 1);
  assert.deepEqual(olayAdlari(ol), ['siparis-tamam', 'damga-basildi', 'siparis-tamam']);
  const damga = ol.find((o) => o.ad === 'damga-basildi').veri;
  assert.deepEqual(damga.acilanlar, ['catal', 'birlestirme-olugu', 'oluk-miknatisi']);
  assert.equal(e.kurus, kurus + 150 + 360);
  assert.deepEqual(il.damgalar, ['D1']);
  assert.equal(il.toplam.siparis, 2);
  assert.deepEqual([e.pano[0], e.pano[1]], [null, null]);
  const gelen = kos(c, tarla, PANO.yenileTik).filter((o) => o.ad === 'siparis-geldi');
  assert.deepEqual(gelen.map((o) => [o.veri.yuva, o.veri.kart.damga ?? null]),
    [[0, 'D2'], [1, null]]);
  assert.equal(etkinDamgaNo(il), 2);
});

test('teslim: uymayan eşya satılır, kapalıysa atılır; iğne/buluntu iade (defter, kuruş yok)',
  () => {
    const { c, tarla, e, il } = panoDunya();
    const temiz = { tur: 'temiz', odul: 100, yabanci: 0,
      kalemler: [{ kabul: ['kiyim'], miktar: 50, teslim: 0 }] };
    e.pano = [null, null, temiz];
    const k = e.kurus;
    assert.deepEqual(teslimEt(c, SAMAN), { sonuc: 'satildi', kurus: 1 });
    komutEkle(c, { tur: 'kapiSat', acik: false });
    kos(c, tarla, 1);
    assert.equal(e.fazlasiniSat, false);
    e.pano = [null, null, temiz];
    assert.deepEqual(teslimEt(c, SAMAN), { sonuc: 'atildi' });
    assert.deepEqual(teslimEt(c, CIVI), { sonuc: 'atildi' });
    assert.deepEqual(teslimEt(c, IGNE), { sonuc: 'iade' });
    assert.deepEqual(teslimEt(c, DUGME), { sonuc: 'iade' });
    assert.equal(e.kurus, k + 1);
    assert.deepEqual([e.satilan, e.bosa], [1, 2]);
    assert.equal(e.pano[2].yabanci, 5, 'temiz kartta uymayan her eşya yabancı');
    assert.deepEqual(il.toplam, { igne: 1, buluntu: 1, siparis: 0 });
    assert.deepEqual(il.defterCiftlik, { dugme: 1 });
  });

test('nadir kart: buluntu siparişe gider ve deftere de yazılır', () => {
  const { c, tarla, e, il } = panoDunya();
  e.pano[1] = { tur: 'nadir', odul: 45, kalemler: [{ kabul: ['buluntu:dugme'], miktar: 1,
    teslim: 0 }] };
  const k = e.kurus;
  assert.equal(teslimEt(c, DUGME).sonuc, 'siparis');
  kos(c, tarla, 1);
  assert.equal(e.kurus, k + 45);
  assert.deepEqual(il.defterCiftlik, { dugme: 1 });
});

test('D2 Çivisiz: kart etkinken kapıya çivi gelirse sayaç sıfırlanır', () => {
  const il = ilerlemeKur();
  damgaBas(il, 'D1');
  const { c, tarla, e } = panoDunya(4, il);
  assert.equal(e.pano[0].damga, 'D2');
  for (let i = 0; i < 39; i++) teslimEt(c, SAMAN);
  const ol = [];
  teslimEt(c, CIVI, (ad, veri) => ol.push({ ad, veri }));
  assert.deepEqual(ol, [{ ad: 'siparis-sifirlandi', veri: { yuva: 0, neden: 'civi' } }]);
  assert.equal(e.pano[0].kalemler[0].teslim, 0);
  for (let i = 0; i < 40; i++) teslimEt(c, SAMAN);
  kos(c, tarla, 1);
  assert.deepEqual(il.damgalar, ['D1', 'D2']);
});

test('D3 İlk iğne: herhangi yolla bulunan iğne damgayı basar (durum kalemi)', () => {
  const il = ilerlemeKur();
  damgaBas(il, 'D1');
  damgaBas(il, 'D2');
  il.toplam.igne = 1;
  const { c, tarla } = panoDunya(4, il);
  const ol = kos(c, tarla, 1);
  assert.deepEqual(ol.find((o) => o.ad === 'damga-basildi').veri.acilanlar,
    ['el-kranki', 'saft', 'balya-presi', 'yel-degirmeni']);
  assert.equal(etkinDamgaNo(il), 4);
});

test('Geri çevir: damga kartı çevrilmez; dönen kartın yerine 1200 tik sonra yenisi', () => {
  const { c, tarla, e } = panoDunya();
  komutEkle(c, { tur: 'siparisCevir', yuva: 0 });
  komutEkle(c, { tur: 'siparisCevir', yuva: 1 });
  const ol = kos(c, tarla, 1);
  assert.deepEqual(ol.filter((o) => o.ad === 'komut-reddedildi').map((o) => o.veri.neden),
    ['damga']);
  assert.ok(ol.some((o) => o.ad === 'siparis-cevrildi'));
  assert.equal(e.pano[1], null);
  kos(c, tarla, PANO.geriCevirTik - 2);
  assert.equal(e.pano[1], null);
  assert.ok(olayAdlari(kos(c, tarla, 2)).includes('siparis-geldi'));
  assert.ok(e.pano[1]);
});

test('kayıt: ekonomi dünyayla gidiş-dönüş; ilerleme ayrı kayıt; sürdürmek kesintisizle aynı',
  () => {
    const kurgu = () => {
      const d = panoDunya(21);
      kur(d.c, d.tarla, 'sandik', 30, 30);
      komutEkle(d.c, { tur: 'kur', parca: 'huni', x: 10, y: 10 });
      return d;
    };
    const a = kurgu();
    const b = kurgu();
    for (const d of [a, b]) for (let i = 0; i < 30; i++) teslimEt(d.c, SAMAN);
    kos(a.c, a.tarla, 300);
    kos(b.c, b.tarla, 100);
    const kayit = JSON.parse(JSON.stringify(dunyaKodla(b.c, b.tarla)));
    assert.equal(kayit.surum, SURUM);
    const il2 = ilerlemeCoz(JSON.parse(JSON.stringify(ilerlemeKodla(b.il))));
    const tarla2 = duzTarla(0);
    const yuklu = dunyaCoz(kayit, tarla2, { ilerleme: il2 }).c;
    assert.equal(yuklu.ilerleme, il2);
    kos(yuklu, tarla2, 200);
    assert.equal(dunyaOzeti(yuklu, tarla2), dunyaOzeti(a.c, a.tarla));
    assert.deepEqual(il2.damgalar, ['D1']);
    assert.equal(ekonomiAl(yuklu).kurus, ekonomiAl(a.c).kurus);
  });

test('göç 1 → 2: ekonomi eklenir, eski parçalar ödenmiş sayılır', () => {
  const { c, tarla } = dunya(2, duzTarla(0));
  kur(c, tarla, 'huni', 10, 10);
  kur(c, tarla, 'sandik', 20, 10);
  const v1 = JSON.parse(JSON.stringify(dunyaKodla(c, tarla)));
  delete v1.ekonomi;
  v1.surum = 1;
  const v2 = gocUygula(v1);
  assert.equal(v2.surum, 2);
  assert.equal(v2.ekonomi.kurus, 300 - 40 - 15);
  const yuklu = dunyaCoz(v1, duzTarla(0)).c;
  assert.equal(ekonomiAl(yuklu).kurus, 245);
  assert.throws(() => dunyaCoz({ ...v2, ekonomi: { kurus: -1 } }, duzTarla(0)), /ekonomi/);
});

test('ilerleme kaydı: gidiş-dönüş; bozuk veri hata verir', () => {
  const il = ilerlemeKur({ kilit: 'arastirma' });
  il.arastirilan.push('kalbur');
  il.defterCiftlik.nal = 2;
  assert.deepEqual(ilerlemeCoz(ilerlemeKodla(il)), il);
  assert.throws(() => ilerlemeCoz(null), /sürüm/);
  assert.throws(() => ilerlemeCoz({ ...il, surum: 9 }), /sürüm/);
  assert.throws(() => ilerlemeCoz({ ...il, damgalar: 'D1' }), /damgalar/);
  assert.throws(() => ilerlemeCoz({ ...il, toplam: { igne: -1 } }), /toplam/);
  assert.throws(() => ilerlemeCoz({ ...il, kilit: 'kum' }), /kilit/);
});
