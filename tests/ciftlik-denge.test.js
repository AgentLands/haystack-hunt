/**
 * Çiftlik denge doğrulaması (`docs/ciftlik/ekonomi.md` §8): turnuva/uzun simülasyon YOK; yalnız
 * referans hatlar A/B/C 6000 tik (5 dk) koşar ve hızları belgedeki sayıların ±%10'unda olmalı;
 * rüzgârlı verim ayrı bir "beklenen değer" testidir (rüzgâr sabit şiddet 3 iken hatlar tam
 * hız). Hatlar parçalar birleşince kurulur (bekleyen: tests/ciftlik-bekleyen.mjs); ŞİMDİ
 * koşan testler çekirdek hızlarını (bant 270/dk) ve hat kurucusunun port çözümünü doğrular.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARALIK } from '../js/kural/ciftlik/olcu.js';
import { esyaKodu, esyaTanimi } from '../js/kural/ciftlik/esya.js';
import { tikAt } from '../js/kural/ciftlik/benzetim.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { BANT_HIZ } from '../js/kural/ciftlik/parcalar/temel.js';
import { dunya, duzTarla, bantCek } from './ciftlik-yardim.mjs';
import { bekleyen, HUNI_AD } from './ciftlik-bekleyen.mjs';
import {
  girisineKur, besleyiciKur, bantlar, cikisImleci, olcHat,
} from './ciftlik-hatlar.mjs';
import { hatA, hatB, hatC, hedefKodu, TOLERANS } from './ciftlik-referans.mjs';

const SAMAN = esyaKodu('saman');

test('bant: doymuş hat 270 eşya/dk verir (HIZ 18, ARALIK 80; ekonomi §8 hız tablosu)', () => {
  const { c, tarla } = dunya(3, duzTarla(0));
  bantCek(c, tarla, 10, 10, 0, 6);
  const sink = girisineKur(c, tarla, 'sandik', { kx: 16, ky: 10 }, 0);
  tikAt(c, tarla);
  const [h] = c.hatlar;
  let once = 0;
  for (let t = 0; t < 1400; t++) {
    if (t === 200) once = sink.ozel.toplam; // ısınma bitti
    hatBasaKoy(h, SAMAN);
    tikAt(c, tarla);
  }
  const dk = sink.ozel.toplam - once; // 1200 tik = 1 dk
  const beklenen = ((20 * BANT_HIZ) / ARALIK) * 60; // eşya/dk
  assert.ok(Math.abs(dk - beklenen) / beklenen <= TOLERANS, `${dk} eşya/dk, beklenen ${beklenen}`);
  assert.equal(beklenen, 270);
});

test('hat kurucusu: port bilgisinden üretici → bant → depo zinciri akar (huni ile)', () => {
  const tarla = duzTarla(0, [{ x: 60, y: 100, r: 14, t: 90 }]);
  const { c } = dunya(5, tarla);
  const sandik = girisineKur(c, tarla, 'sandik', { kx: 36, ky: 40 }, 0);
  const bas = { kx: 30, ky: 40, yon: 0 };
  bantCek(c, tarla, bas.kx, bas.ky, 0, 6);
  const huni = besleyiciKur(c, tarla, HUNI_AD, bas, 0, 0);
  assert.equal(huni.cikis[0].hx, 30, 'çıkış ilk banta bakar');
  tarla.kirli = true;
  for (let y = 70; y < 92; y++) for (let x = 40; x < 80; x++) tarla.h[y * 240 + x] = 40;
  for (let t = 0; t < 1500; t++) tikAt(c, tarla);
  assert.ok(sandik.ozel.toplam > 0, `depoya ${sandik.ozel.toplam} eşya geldi`);
  const im = cikisImleci(huni, 0);
  assert.deepEqual(bantlar(c, tarla, { kx: 30, ky: 10, yon: 0 }, 3), { kx: 33, ky: 10, yon: 0 });
  assert.equal(im.yon, 0);
});

test('hat kurucusu: yön döndürerek giriş portu eşleştirir (kuzeye akan hat)', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  const p = girisineKur(c, tarla, 'sandik', { kx: 50, ky: 30 }, 3);
  assert.deepEqual([p.x, p.y], [50, 30]);
  assert.throws(() => girisineKur(c, tarla, 'bant', { kx: 50, ky: 30 }, 0), /dolu|eşleşmedi/);
});

const A = { is: 'A B D E F G', esya: ['balya-saman'] };
const HATLAR = [
  ['A (saman balyası, 11/dk, 132 kuruş/dk)', hatA, {
    ...A, parca: [HUNI_AD, 'birlestirme-olugu', 'oluk-miknatisi', 'seytan-yeli', 'balya-presi',
      'gubre-cukuru', 'sandik'],
  }],
  ['B (ot balyası, 10,5/dk, 315 kuruş/dk)', hatB, {
    is: 'A B D E F G', esya: ['balya-ot', 'yas-ot', 'kuru-ot'],
    parca: [HUNI_AD, 'tirmik-kolu', 'birlestirme-olugu', 'ot-savurucu', 'catal',
      'kurutma-ambari', 'balya-presi', 'sandik'],
    dosya: ['js/kural/ciftlik/dunya/arazi.js', 'js/kural/ciftlik/dunya/hava.js'],
  }],
  ['C (kıyım, 120/dk, 240 kuruş/dk)', hatC, {
    is: 'A B D E F G', esya: ['kiyim'],
    dogrulandi: true, // kıyıcı 120/dk tavanı: gerçek parçalarla (main + F) geçti
    parca: [HUNI_AD, 'birlestirme-olugu', 'oluk-miknatisi', 'seytan-yeli', 'cekicli-kiyici',
      'sandik'],
  }],
];

for (const [ad, kurucu, on] of HATLAR) {
  bekleyen(`referans hat ${ad}: 6000 tikte hız ve gelir ±%10`, on, async () => {
    const d = await kurucu();
    const kod = hedefKodu(d.hedef);
    const hiz = olcHat(d.c, d.tarla, d.sinkler, [kod])[kod];
    const sapma = Math.abs(hiz - d.hedef.dk) / d.hedef.dk;
    assert.ok(sapma <= TOLERANS, `${hiz.toFixed(2)}/dk, hedef ${d.hedef.dk} (sapma ${sapma})`);
    const kurus = hiz * esyaTanimi(kod).deger;
    const ks = Math.abs(kurus - d.hedef.kurus) / d.hedef.kurus;
    assert.ok(ks <= TOLERANS, `${kurus.toFixed(0)} kuruş/dk, hedef ${d.hedef.kurus}`);
  });
}

bekleyen('rüzgârlı verim: 2 yel ≈ %76, 3 yel ≈ %85, 4 yel ≈ %85 (Hat A beklenen değer)', {
  is: 'D B G', dosya: ['js/kural/ciftlik/dunya/hava.js'],
}, async () => {
  const { hava } = await import('../js/kural/ciftlik/dunya/hava.js');
  const YEL = [0, 8, 16, 24]; // bg: durgun, esinti, rüzgâr, sert (sistemler.md §1)
  const TALEP = 21; // Hat A ortalama bg (ekonomi.md §8)
  const N = 10000;
  const verim = (yel) => {
    let top = 0;
    for (let d = 0; d < N; d++) top += Math.min(1, (yel * YEL[hava(7, d).siddet]) / TALEP);
    return top / N;
  };
  assert.ok(Math.abs(verim(2) - 0.76) <= 0.04, `2 yel ${verim(2)}`);
  assert.ok(Math.abs(verim(3) - 0.85) <= 0.04, `3 yel ${verim(3)}`);
  assert.ok(Math.abs(verim(4) - 0.85) <= 0.04, `4 yel ${verim(4)}`);
});
