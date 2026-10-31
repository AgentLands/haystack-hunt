/**
 * Yığın kayması kirli bayrağının (kural/tarla.js cokert) birim testleri: durgun tarlada
 * tarama atlanır ama sonuç her zaman taranan (eski) davranışla bit bit aynıdır; yüksekliği
 * değiştiren her kural yolu bayrağı kurar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK } from '../js/kural/boyut.js';
import {
  tarlaKur, cokert, yerlesmisKur, yerlesmisEkle, yerlesmisVar,
} from '../js/kural/tarla.js';
import { uretec, metindenTohum } from '../js/kural/rastgele.js';
import { elIleAl, tirmikla } from '../js/kural/araclar.js';
import { balyaBirak, balyaAc } from '../js/kural/balyalar.js';
import '../js/kural/makineler/hepsi.js';
import { makineTanimi } from '../js/kural/makineler/kayit.js';
import { yeniMakine } from '../js/kural/makineler/garaj.js';
import { seritHucreleri } from '../js/kural/makineler/balya.js';

/** Kurulmuş tarlayı durgunlaştırır (bayrak iner). */
function durgun(etiket) {
  const t = tarlaKur(metindenTohum(etiket));
  for (let k = 0; k < 2000 && cokert(t); k++);
  assert.equal(t.kirli, false);
  return t;
}

test('durgun tarlada cokert taramaz: h aynı, yön sayacı yine ilerler', () => {
  const t = durgun('kirli-durgun');
  const h = t.h.slice();
  const adim = t.adim;
  assert.equal(cokert(t), false);
  assert.equal(t.adim, adim + 1);
  assert.deepEqual(t.h, h);
  t.h[80 * GENISLIK + 120] += 400;
  t.kirli = true;
  assert.equal(cokert(t), true);
  assert.equal(t.kirli, true);
});

test('bayraklı ve her karede tarayan cokert bit bit aynı sonuç verir', () => {
  const a = tarlaKur(metindenTohum('kirli-esit'));
  const b = tarlaKur(metindenTohum('kirli-esit'));
  const zar = uretec(7);
  let atlanan = 0;
  for (let kare = 0; kare < 400; kare++) {
    if (kare % 9 === 0 && zar() < 0.6) {
      const x = 20 + zar() * 200;
      const y = 20 + zar() * 120;
      const yx = zar() - 0.5;
      const yy = zar() - 0.5;
      for (const t of [a, b]) {
        if (kare % 2) elIleAl(t, x, y, 3);
        else tirmikla(t, x, y, yx, yy);
      }
    }
    if (!a.kirli) atlanan++;
    if (cokert(a)) cokert(a);
    b.kirli = true; // eski davranış: her karede tam tarama
    if (cokert(b)) cokert(b);
    assert.deepEqual(a.h, b.h, `kare ${kare}`);
    assert.equal(a.adim, b.adim);
  }
  assert.ok(atlanan > 100, `atlanan kare ${atlanan}`);
});

test('yüksekliği değiştiren kural yolları bayrağı kurar', () => {
  const t = durgun('kirli-yazicilar');
  const bak = (ad, islev) => {
    t.kirli = false;
    islev();
    assert.equal(t.kirli, true, ad);
  };
  const tepe = t.h.indexOf(Math.max(...t.h));
  const tx = tepe % GENISLIK;
  const ty = Math.floor(tepe / GENISLIK);
  bak('el', () => elIleAl(t, tx, ty, 2));
  bak('tırmık', () => tirmikla(t, tx, ty, 1, 0));
  const balya = balyaBirak(t, 60.5, 60.5, 0, { saman: 300, igne: false, civiler: [] });
  bak('balya açma', () => balyaAc(t, balya));
  const traktor = yeniMakine('traktor', 1, tx - 2, ty, 0, 1);
  bak('kepçe', () => {
    for (let i = 0; i < 30; i++) makineTanimi('traktor').calis(t, traktor, 1 / 60);
  });
  bak('kepçe boşaltma', () => makineTanimi('traktor').yakitBitince(t, traktor));
  const balyaci = yeniMakine('balya', 2, tx, ty, 0, 1);
  for (const i of seritHucreleri(balyaci)) t.h[i] = 10;
  bak('balya makinesi', () => {
    for (let i = 0; i < 30; i++) makineTanimi('balya').calis(t, balyaci, 1 / 60);
  });
  const ufleyici = yeniMakine('ufleyici', 3, tx, ty, 0, 1);
  ufleyici.calisiyor = true;
  bak('üfleyici', () => {
    for (let i = 0; i < 60; i++) makineTanimi('ufleyici').calis(t, ufleyici, 1 / 60);
  });
});

test('ön hazırlık (yerlesmisKur → yerlesmisEkle) tarlaKur ile bit bit aynı tarla verir', () => {
  const ornekler = [['hazir-a', 'kolay'], ['hazir-b', 'normal'], ['hazir-c', 'zor']];
  for (const [etiket, zorluk] of ornekler) {
    const tohum = metindenTohum(etiket);
    const duz = tarlaKur(tohum, zorluk);
    assert.equal(yerlesmisVar(tohum, zorluk), false);
    const arka = yerlesmisKur(tohum, zorluk);
    yerlesmisEkle(tohum, zorluk, { h: arka.h.slice(), adim: arka.adim });
    assert.equal(yerlesmisVar(tohum, zorluk), true);
    const hazir = tarlaKur(tohum, zorluk);
    assert.deepEqual(hazir.h, duz.h);
    assert.deepEqual(hazir.doku, duz.doku);
    assert.deepEqual(hazir.igne, duz.igne);
    assert.deepEqual(hazir.civiler, duz.civiler);
    assert.equal(hazir.adim, duz.adim);
    assert.equal(hazir.baslangicToplam, duz.baslangicToplam);
    assert.equal(hazir.kirli, true);
  }
});
