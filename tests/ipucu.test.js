/**
 * İpucu kurallarının birim testleri: zorluğa göre dedektör telafi sınırı (Zor'da hiçbiri
 * Sıcak çıkmazsa da telafi), telafi bildiriminin nedeni ve mıknatısın kaba uzaklık bilgisi
 * (kural/araclar.js miknatisKabaUzaklik, 'miknatis' olayının uzaklik alanı).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarlaKur } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import {
  SEVIYELER, MIKNATIS_MENZIL, MIKNATIS_KABA_KAT, miknatisKabaUzaklik,
} from '../js/kural/araclar.js';
import { telafiHakki, telafiNedeni, ILIK_SINIRI } from '../js/kural/dedektor.js';
import { ZORLUKLAR } from '../js/kural/zorluk.js';
import { dinle } from '../js/olaylar.js';

const [yanar, sicak, ilik, soguk] = SEVIYELER.map((seviye) => ({ seviye }));

test('telafi sınırı: Kolay/Normal Ilık, Zor Sıcak bandı', () => {
  assert.equal(ILIK_SINIRI, SEVIYELER[2].mesafe);
  assert.equal(ZORLUKLAR.kolay.telafiSiniri, ILIK_SINIRI);
  assert.equal(ZORLUKLAR.normal.telafiSiniri, ILIK_SINIRI);
  assert.equal(ZORLUKLAR.zor.telafiSiniri, SEVIYELER[1].mesafe);
});

test('telafi: varsayılan sınırda yalnız hepsi Soğuk; Zor sınırında Soğuk/Ilık da', () => {
  assert.equal(telafiHakki([ilik, soguk, ilik], 0), 0);
  assert.equal(telafiHakki([soguk, soguk, soguk], 0), 1);
  const zor = ZORLUKLAR.zor.telafiSiniri;
  assert.equal(telafiHakki([ilik, soguk, ilik], 0, 0, zor), 1);
  assert.equal(telafiHakki([ilik, sicak, soguk], 0, 0, zor), 0);
  assert.equal(telafiHakki([yanar], 0, 0, zor), 0);
  assert.equal(telafiHakki([ilik, ilik], 1, 0, zor), 0, 'hak kalmışken telafi yok');
  assert.equal(telafiHakki([ilik, ilik, ilik], 0, 1, zor), 0, 'tur başına bir kez');
});

test('telafi nedeni bildirimde sınıra göre yazılır', () => {
  assert.equal(telafiNedeni(), 'Hepsi Soğuk çıktı');
  assert.equal(telafiNedeni(ZORLUKLAR.normal.telafiSiniri), 'Hepsi Soğuk çıktı');
  assert.equal(telafiNedeni(ZORLUKLAR.zor.telafiSiniri), 'Hiçbiri Sıcak çıkmadı');
});

/** İğneden `m` hücre uzakta, tarla içinde bir hücre. */
function uzaginda(igne, m) {
  const x = igne.x + (igne.x < 120 ? m : -m);
  return { x: Math.round(x), y: Math.round(igne.y) };
}

/** Bütün dedektör haklarını iğneye `m` hücre uzaktan okur. */
async function hepsiniOku(zorluk, m) {
  const { yeniOyun, durumAl, bas, birak, aracSec } = await import('../js/oyun.js');
  yeniOyun('telafi-bant', zorluk);
  const d = durumAl();
  const p = uzaginda(d.tarla.igne, m);
  aracSec('dedektor');
  Object.assign(d.karakter, { x: p.x + 0.5, y: p.y + 0.5 });
  for (let i = 0; i < d.dedektorHakki; i++) {
    bas(p, 100 * i);
    birak();
  }
  return d;
}

test('oyunda: Zor\'da hepsi Ilık okunursa telafi verilir, Normal\'de verilmez', async () => {
  const zor = await hepsiniOku('zor', 40);
  assert.ok(zor.halkalar.every((h) => h.seviye.ad === 'Ilık'));
  assert.equal(zor.dedektorTelafi, 1);
  assert.equal(zor.dedektor, 1);
  const normal = await hepsiniOku('normal', 40);
  assert.equal(normal.dedektorTelafi || 0, 0);
  assert.equal(normal.dedektor, 0);
  const sicakZor = await hepsiniOku('zor', 20);
  assert.equal(sicakZor.dedektorTelafi || 0, 0, 'Sıcak okuma yön gösterir');
});

test('mıknatıs kaba uzaklık: menzilde, biraz (≤ 2 menzil), çok', () => {
  const t = tarlaKur(metindenTohum('miknatis-kaba'));
  const { igne } = t;
  const at = (m) => miknatisKabaUzaklik(t, uzaginda(igne, m).x, igne.y);
  assert.equal(MIKNATIS_KABA_KAT, 2);
  assert.equal(at(0), 'menzilde');
  assert.equal(at(MIKNATIS_MENZIL), 'menzilde');
  assert.equal(at(MIKNATIS_MENZIL + 1), 'biraz');
  assert.equal(at(MIKNATIS_MENZIL * MIKNATIS_KABA_KAT), 'biraz');
  assert.equal(at(MIKNATIS_MENZIL * MIKNATIS_KABA_KAT + 1), 'cok');
});

test('oyunda: boşa giden mıknatıs olayı kaba uzaklığı taşır', async () => {
  const { yeniOyun, durumAl, bas, birak, aracSec } = await import('../js/oyun.js');
  const gelen = [];
  const kaldir = dinle('miknatis', (v) => gelen.push(v));
  yeniOyun('miknatis-olay', 'normal');
  const d = durumAl();
  const p = uzaginda(d.tarla.igne, MIKNATIS_MENZIL + 5);
  aracSec('miknatis');
  Object.assign(d.karakter, { x: p.x + 0.5, y: p.y + 0.5 });
  bas(p, 10);
  birak();
  kaldir();
  assert.equal(gelen.length, 1);
  assert.equal(gelen[0].cekti, false);
  assert.equal(gelen[0].uzaklik, 'biraz');
});
