/**
 * Senaryo testleri (iş K): sabit komut dizisiyle çiftlik. Şimdi koşan: komut dizisi
 * determinizmi ve kaydet/yükle/sürdür = kesintisiz koşu (çekirdek parçalarıyla, dünya özeti bit
 * bit aynı). Bekleyen: D1-D5'e ≤ 30 oyun dakikasında varılır (tests/ciftlik-senaryo.mjs
 * koşucusu gerçek oyun yolundan sürer; parçalar birleşince açılır). Turnuva yok: hedef damgaya
 * varınca durur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ciftlikKur, komutEkle, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { duzTarla } from './ciftlik-yardim.mjs';
import { bekleyen } from './ciftlik-bekleyen.mjs';

/** Sabit komut dizisi: [tik, komut] (huni hattı, dönemeç, sandık; sonra yeniden düzen). */
const DIZI = [
  [0, { tur: 'kur', parca: 'huni', x: 20, y: 31, yon: 0 }],
  ...[0, 1, 2, 3, 4].map((i) => [0, { tur: 'kur', parca: 'bant', x: 22 + i, y: 31, yon: 0 }]),
  [0, { tur: 'kur', parca: 'bant', x: 27, y: 31, yon: 1 }],
  [0, { tur: 'kur', parca: 'sandik', x: 27, y: 32 }],
  [400, { tur: 'kur', parca: 'sandik', x: 27, y: 40 }],
  [900, { tur: 'sok', x: 24, y: 31 }],
  [1000, { tur: 'kur', parca: 'bant', x: 24, y: 31, yon: 0 }],
  [1500, { tur: 'dondur', x: 27, y: 31, yon: 0 }],
  [1800, { tur: 'sok', x: 27, y: 32 }],
];

function yeni() {
  const tarla = duzTarla(0, [{ x: 44, y: 70, r: 14, t: 90 }]);
  for (let y = 60; y < 70; y++) for (let x = 40; x < 60; x++) tarla.h[y * 240 + x] = 0;
  const igne = { esya: esyaKodu('igne'), x: 44, y: 70, z: 6, aci: 0.5, alindi: false };
  return { c: ciftlikKur(31, { gomulu: [igne] }), tarla };
}

/** DIZI'yi tik numaralarına göre uygular; aradaki tikleri koşturur. */
function kos(d, bitis) {
  while (d.c.tik < bitis) {
    for (const [tik, komut] of DIZI) if (tik === d.c.tik) komutEkle(d.c, komut);
    tikAt(d.c, d.tarla);
  }
}

test('aynı komut dizisi iki koşuda aynı dünya özetini verir (3000 tik)', () => {
  const a = yeni();
  const b = yeni();
  kos(a, 3000);
  kos(b, 3000);
  assert.equal(dunyaOzeti(a.c, a.tarla), dunyaOzeti(b.c, b.tarla));
  // Yığın eteğinde reddedilen komutlar ('saman') da determinizme dahildir (c-dogrulama bulgu 1).
  assert.ok(a.c.parcalar.size >= 6, 'dizi parçaları kurdu');
});

test('kaydet → yükle → sürdür = kesintisiz koşu; kayıt JSON gidiş-dönüşünden geçer', () => {
  const tam = yeni();
  kos(tam, 3000);
  const yarim = yeni();
  kos(yarim, 1300); // dizinin ortası: kuyrukta komut, hatta eşya var
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(yarim.c, yarim.tarla)));
  const tarla = { h: new Uint16Array(yarim.tarla.h.length), kirli: false, kaldirilan: 0 };
  const { c } = dunyaCoz(kayit, tarla);
  assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(yarim.c, yarim.tarla), 'yükleme birebir');
  const devam = { c, tarla };
  kos(devam, 3000);
  assert.equal(dunyaOzeti(devam.c, devam.tarla), dunyaOzeti(tam.c, tam.tarla));
});

bekleyen('senaryo: D1-D5 sabit kurma dizisiyle ≤ 30 oyun dakikasında (36000 tik)', {
  is: 'A B D E F G J', dosya: [
    'js/kural/ciftlik/ekonomi/damga.js', 'js/kural/ciftlik/dunya/arazi.js'],
  parca: ['komsu-kapisi', 'oluk-miknatisi', 'balya-presi', 'el-kranki', 'kalbur'],
}, async () => {
  const { senaryoKos } = await import('./ciftlik-senaryo.mjs');
  const s = await senaryoKos({ hedef: 'D5', tikTavan: 30 * 1200 });
  assert.ok(s.basildi, `D5 ${s.tik} tikte basılmadı; basılanlar ${JSON.stringify(s.damgaTik)}`);
  assert.ok(s.tik <= 30 * 1200);
  for (const [ad, dk] of Object.entries({ D1: 5, D2: 10, D3: 15, D4: 20, D5: 30 })) {
    assert.ok(s.damgaTik[ad] <= dk * 1200, `${ad} ${s.damgaTik[ad]} tik (tavan ${dk} dk)`);
  }
});

bekleyen('senaryo: aynı etiket iki koşuda aynı damga tikleri (determinizm)', {
  is: 'D G', dosya: ['js/kural/ciftlik/ekonomi/damga.js', 'js/kural/ciftlik/dunya/arazi.js'],
  parca: ['komsu-kapisi', 'oluk-miknatisi'],
}, async () => {
  const { senaryoKos } = await import('./ciftlik-senaryo.mjs');
  const a = await senaryoKos({ hedef: 'D2', tikTavan: 12 * 1200, etiket: 'det-1' });
  const b = await senaryoKos({ hedef: 'D2', tikTavan: 12 * 1200, etiket: 'det-1' });
  assert.deepEqual(a.damgaTik, b.damgaTik);
});
