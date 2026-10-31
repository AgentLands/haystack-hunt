/** Buluntu kuralları (js/kural/buluntu.js, buluntu-defter.js) ve oyun entegrasyonu testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { tarlaKur } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import {
  KATALOG, NADIRLIK, EN_AZ, EN_COK, ALMA_BEKLEME_MS, buluntulariSakla, buluntuDerinligi,
  alinabilirBuluntu, yakinBuluntular, turBilgisi,
} from '../js/kural/buluntu.js';
import {
  bosDefter, defterTemizle, defterYukle, defterKaydet, buluntuEkle, defterOzeti, DEFTER_ANAHTAR,
} from '../js/kural/buluntu-defter.js';
import { bellekDeposu } from '../js/kural/istatistik.js';
import { SEKIL_TURLERI } from '../js/ozellik/buluntu-sekil.js';
import { zilNotalari } from '../js/ozellik/ses-buluntu.js';

const sag = (t) => { // tarlanın parmak izi: yükseklik toplamsal sağlaması, iğne, çiviler
  let ck = 0;
  for (let i = 0; i < t.h.length; i++) ck = (ck * 31 + t.h[i]) >>> 0;
  return { ck, igne: { ...t.igne }, civiler: t.civiler.map((c) => ({ ...c })) };
};

test('buluntular aynı tarlada aynı, farklı tarlada farklı', () => {
  const t = tarlaKur(metindenTohum('2026-10-31'));
  const a = buluntulariSakla(t);
  assert.deepEqual(a, buluntulariSakla(t));
  assert.deepEqual(a, buluntulariSakla(tarlaKur(metindenTohum('2026-10-31'))));
  assert.notDeepEqual(a, buluntulariSakla(tarlaKur(metindenTohum('2026-11-01'))));
});

test('tarla başına 3-6 buluntu, kuralları sağlar', () => {
  for (const etiket of ['a', 'b', 'c', 'deneme', 'x7', '2026-01-01', '2026-02-02', 'k9k9']) {
    for (const zorluk of ['kolay', 'normal', 'zor']) {
      const t = tarlaKur(metindenTohum(etiket), zorluk);
      const liste = buluntulariSakla(t);
      assert.ok(liste.length >= EN_AZ && liste.length <= EN_COK, `${etiket}: ${liste.length}`);
      assert.equal(new Set(liste.map((b) => b.tur)).size, liste.length, 'tür tekrarı yok');
      for (const b of liste) {
        assert.ok(turBilgisi(b.tur));
        assert.ok(b.x >= 0 && b.x < GENISLIK && b.y >= 0 && b.y < YUKSEKLIK);
        assert.ok(t.h[b.y * GENISLIK + b.x] >= 20);
        assert.ok(buluntuDerinligi(t, b) > 0, 'başlangıçta samanın altında');
        assert.ok(Math.hypot(b.x - t.igne.x, b.y - t.igne.y) >= 12);
        assert.ok(t.civiler.every((c) => Math.hypot(b.x - c.x, b.y - c.y) >= 6));
        assert.equal(b.alindi, false);
      }
      for (let i = 0; i < liste.length; i++) {
        for (let j = i + 1; j < liste.length; j++) {
          assert.ok(Math.hypot(liste[i].x - liste[j].x, liste[i].y - liste[j].y) >= 14);
        }
      }
    }
  }
});

test('buluntu üretimi tarlayı, iğneyi ve çivileri değiştirmez; üretim eskisi gibi', () => {
  const t = tarlaKur(metindenTohum('2026-10-31'));
  const once = sag(t);
  buluntulariSakla(t);
  assert.deepEqual(sag(t), once);
  // Buluntu eklenmeden önceki üretimin altın değerleri (main'deki tarla/iğne/çivi).
  assert.equal(once.ck, 3849178024);
  assert.equal(once.igne.x, 160);
  assert.equal(once.igne.y, 117);
  assert.equal(once.civiler.length, 4);
  assert.ok(!('buluntular' in t), 'buluntu tarlaya yazılmaz; oyun durumunda tutulur');
});

test('katalog: 16-24 tür, benzersiz anahtar, her biri açıklamalı ve çizimli', () => {
  assert.ok(KATALOG.length >= 16 && KATALOG.length <= 24);
  assert.equal(new Set(KATALOG.map((b) => b.tur)).size, KATALOG.length);
  for (const b of KATALOG) {
    assert.ok(NADIRLIK[b.nadirlik], b.tur);
    assert.ok(b.ad.length > 2 && b.not.length > 15, b.tur);
    assert.ok(SEKIL_TURLERI.includes(b.tur), `${b.tur} için çizim yok`);
  }
  for (const k of Object.keys(NADIRLIK)) assert.ok(KATALOG.some((b) => b.nadirlik === k), k);
  assert.deepEqual([...SEKIL_TURLERI].sort(), KATALOG.map((b) => b.tur).sort());
});

test('nadirlik dağılımı: yaygınlar çok, çok nadirler az', () => {
  const sayim = { yaygin: 0, seyrek: 0, nadir: 0, cokNadir: 0 };
  for (let i = 0; i < 400; i++) {
    for (const b of buluntulariSakla(tarlaKur(metindenTohum(`t${i}`)))) {
      sayim[turBilgisi(b.tur).nadirlik] += 1;
    }
  }
  assert.ok(sayim.yaygin > sayim.seyrek && sayim.seyrek > sayim.nadir);
  assert.ok(sayim.nadir > sayim.cokNadir && sayim.cokNadir > 0, JSON.stringify(sayim));
});

test('buluntu açığa çıkınca ve bekleyince alınır; el uzaksa alınmaz', () => {
  const t = tarlaKur(metindenTohum('al'));
  const liste = buluntulariSakla(t);
  const b = liste[0];
  assert.equal(alinabilirBuluntu(t, liste, b.x, b.y, 0), null, 'gömülüyken alınmaz');
  t.h[b.y * GENISLIK + b.x] = b.z; // üstü açıldı
  assert.equal(buluntuDerinligi(t, b), 0);
  b.acikSure = 1000;
  assert.equal(alinabilirBuluntu(t, liste, b.x, b.y, 1000 + ALMA_BEKLEME_MS - 1), null);
  assert.equal(alinabilirBuluntu(t, liste, b.x, b.y, 1000 + ALMA_BEKLEME_MS), b);
  assert.equal(alinabilirBuluntu(t, liste, b.x + 20, b.y, 5000), null, 'el uzakta');
  b.alindi = true;
  assert.equal(alinabilirBuluntu(t, liste, b.x, b.y, 5000), null, 'bir daha alınmaz');
});

test('yüzeye yakın buluntular pırıltı için seçilir', () => {
  const t = tarlaKur(metindenTohum('pirilti'));
  const liste = buluntulariSakla(t);
  const b = liste[0];
  t.h[b.y * GENISLIK + b.x] = b.z + 3;
  assert.ok(yakinBuluntular(t, liste, 4).includes(b));
  assert.ok(!yakinBuluntular(t, liste, 2).includes(b));
  t.h[b.y * GENISLIK + b.x] = b.z; // açık: pırıltı değil
  assert.ok(!yakinBuluntular(t, liste, 4).includes(b));
});

test('defter: ekleme, yeni sayfa, özet ve kalıcılık', () => {
  let d = bosDefter();
  let s = buluntuEkle(d, 'yuksek');
  assert.equal(s.yeni, true);
  d = s.defter;
  s = buluntuEkle(d, 'yuksek');
  assert.equal(s.yeni, false);
  assert.equal(s.defter.bulunan.yuksek, 2);
  assert.equal(d.bulunan.yuksek, 1, 'eski defter değişmez');
  const o = defterOzeti(buluntuEkle(s.defter, 'yuzuk').defter);
  assert.deepEqual(o, { bulunanTur: 2, toplamTur: KATALOG.length, toplamAdet: 3 });
  const depo = bellekDeposu();
  defterKaydet(depo, s.defter);
  assert.deepEqual(defterYukle(depo), s.defter);
});

test('defter: bozuk depo verisi temizlenir, boş başlanır', () => {
  const t = defterTemizle({ bulunan: { yuksek: 2, yok: 5, nal: -1, kasik: 1.5, anahtar: 'x' } });
  assert.deepEqual({ ...t.bulunan }, { yuksek: 2 });
  assert.deepEqual({ ...defterTemizle(null).bulunan }, {});
  const depo = bellekDeposu();
  depo.setItem(DEFTER_ANAHTAR, '{bozuk json');
  const eski = console.error;
  console.error = () => {};
  try {
    assert.deepEqual({ ...defterYukle(depo).bulunan }, {});
  } finally {
    console.error = eski;
  }
});

test('zil sesi: nadirlik arttıkça nota sayısı artar', () => {
  const uzunluk = (tur) => zilNotalari(tur).length;
  assert.ok(uzunluk('dugme') < uzunluk('kurus'));
  assert.ok(uzunluk('kurus') < uzunluk('oyuncak'));
  assert.ok(uzunluk('oyuncak') < uzunluk('yuzuk'));
  assert.equal(uzunluk('bilinmeyen'), 2);
});
