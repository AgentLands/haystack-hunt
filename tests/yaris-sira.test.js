/** Yarış sıralaması: ceza dahil süreye göre sıra; ilk bulan hemen duyurulur. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Odalar } from '../sunucu/odalar.js';
import { iletiCoz } from '../sunucu/dogrulama.js';

/** Ağsız oyuncu: gönderilen iletiler `gelen` dizisinde. */
function sahteOyuncu(id) {
  const gelen = [];
  return { id, ip: '10.0.0.1', gelen, gonder: (metin) => gelen.push(JSON.parse(metin)) };
}

async function yarisBaslat() {
  const odalar = new Odalar({ geriSayimMs: 1, ipOda: 10 });
  const [a, b, c] = [1, 2, 3].map(sahteOyuncu);
  odalar.kur(a, 'Ayşe');
  const kod = a.gelen.find((m) => m.t === 'oda').kod;
  odalar.katil(b, kod, 'Bora');
  odalar.katil(c, kod, 'Can');
  odalar.baslat(a, 'normal');
  await new Promise((coz) => setTimeout(coz, 60));
  assert.equal([...odalar.odalar.values()][0].durum, 'yaris');
  return { odalar, a, b, c };
}

const sonOda = (o) => o.gelen.findLast((m) => m.t === 'oda');
const kayit = (o, kim) => sonOda(o).oyuncular.find((k) => k.id === kim.id);

test('bulundu iletisi cezaMs taşır (yoksa 0); geçersizi reddedilir', () => {
  const tam = iletiCoz(JSON.stringify({ t: 'bulundu', sureMs: 9000, cezaMs: 4000, saman: 5 }));
  assert.deepEqual(tam.ileti, { t: 'bulundu', sureMs: 9000, cezaMs: 4000, saman: 5 });
  assert.equal(iletiCoz('{"t":"bulundu","sureMs":9000,"saman":5}').ileti.cezaMs, 0);
  assert.ok(iletiCoz('{"t":"bulundu","sureMs":9,"cezaMs":-1,"saman":5}').hata);
  assert.ok(iletiCoz('{"t":"bulundu","sureMs":9,"cezaMs":"x","saman":5}').hata);
});

test('ilk bulan kazanan duyurulur ama sıra ceza dahil süreye göre belirlenir', async () => {
  const { odalar, a, b, c } = await yarisBaslat();
  // Ayşe önce bulur ama 8 sn çivi cezası yedi (14 sn); Bora sonra bulur, cezasız 10 sn.
  odalar.bulundu(a, { sureMs: 14000, cezaMs: 8000, saman: 100 });
  const kazananlar = c.gelen.filter((m) => m.t === 'kazanan');
  assert.equal(kazananlar.length, 1);
  assert.equal(kazananlar[0].ad, 'Ayşe');
  assert.equal(kayit(c, a).sira, 1, 'tek bulan geçici birinci');
  odalar.bulundu(b, { sureMs: 10000, cezaMs: 0, saman: 120 });
  assert.equal(c.gelen.filter((m) => m.t === 'kazanan').length, 1, 'ikinci bulan duyurulmaz');
  assert.equal(kayit(c, b).sira, 1, 'ceza dahil süresi kısa olan öne geçer');
  assert.equal(kayit(c, a).sira, 2);
  assert.equal(kayit(c, a).cezaMs, 8000);
  assert.equal(sonOda(c).durum, 'yaris', 'Can hâlâ arıyor');
  odalar.pes(c);
  const son = sonOda(a);
  assert.equal(son.durum, 'bitti');
  const bulanlar = son.oyuncular.filter((k) => k.sira).sort((x, y) => x.sira - y.sira);
  assert.deepEqual(bulanlar.map((k) => k.ad), ['Bora', 'Ayşe']);
  odalar.kapat();
});

test('süre eşitliğinde önce bulan öne geçer', async () => {
  const { odalar, a, b } = await yarisBaslat();
  odalar.bulundu(b, { sureMs: 7000, cezaMs: 0, saman: 1 });
  odalar.bulundu(a, { sureMs: 7000, cezaMs: 0, saman: 1 });
  assert.equal(kayit(a, b).sira, 1);
  assert.equal(kayit(a, a).sira, 2);
  odalar.kapat();
});
