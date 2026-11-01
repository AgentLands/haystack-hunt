/** Çiftlik saman bağı: cokertKaro (korunum, duvar, kirli bölge), samanAl/Dok, gömülü çıkışı. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { ESIK, CAPRAZ_ESIK, toplamSaman } from '../js/kural/tarla.js';
import {
  cokertKaro, samanAl, samanDok, gomuluCikar, bolgeNo, KIRLI_EN,
} from '../js/kural/ciftlik/saman.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { ciftlikSamani } from '../js/kural/ciftlik/benzetim.js';
import { dunya, duzTarla, kur, bantCek, kos } from './ciftlik-yardim.mjs';

const W = GENISLIK;

/** Hiçbir komşu çifti (taban dışı) eşiği aşmıyor mu? */
function durgun(tarla, taban) {
  const { h } = tarla;
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (taban[i]) continue;
      const cift = [[x + 1, y, ESIK], [x, y + 1, ESIK], [x + 1, y + 1, CAPRAZ_ESIK],
        [x - 1, y + 1, CAPRAZ_ESIK]];
      for (const [nx, ny, e] of cift) {
        if (nx < 0 || nx >= W || ny >= YUKSEKLIK || taban[ny * W + nx]) continue;
        if (Math.abs(h[i] - h[ny * W + nx]) > e) return false;
      }
    }
  }
  return true;
}

function yerlestir(tarla, c, en = 5000) {
  let n = 0;
  while (n < en && cokertKaro(tarla, c)) n += 1;
  return n;
}

test('cokertKaro: tarla.kirli tek başına → tam tarama; sonunda durgun, toplam korunur', () => {
  const { c, tarla } = dunya(1, duzTarla(0, [{ x: 60, y: 60, r: 20, t: 120 }]));
  const once = toplamSaman(tarla);
  const n = yerlestir(tarla, c);
  assert.ok(n > 10 && n < 5000, `geçiş ${n}`);
  assert.equal(toplamSaman(tarla), once);
  assert.ok(durgun(tarla, c.izgara.taban));
  assert.equal(tarla.kirli, false);
  assert.ok(c.kirli.every((k) => k === 0), 'kirli bölge kalmadı');
  assert.equal(cokertKaro(tarla, c), false, 'durgun tarlada tarama yok');
});

test('cokertKaro: yalnız işaretli bölge taranır, akış komşu bölgeyi kirletir', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  yerlestir(tarla, c);
  tarla.h[20 * W + 15] = 60; // bölge (0, 1) kenarı: x = 15 → komşu x = 16 başka bölge
  c.kirli[bolgeNo(15, 20)] = 1;
  assert.equal(cokertKaro(tarla, c), true);
  assert.equal(c.kirli[bolgeNo(16, 20)], 1, 'sağ komşu bölge kirlendi');
  yerlestir(tarla, c);
  assert.equal(toplamSaman(tarla), 60);
  assert.ok(durgun(tarla, c.izgara.taban));
});

test('cokertKaro: parça tabanı duvardır (oraya akmaz)', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  kur(c, tarla, 'sandik', 20, 20);
  tarla.h[41 * W + 42] = 200; // sandık hücreleri 40-41; hemen sağı
  tarla.kirli = true;
  yerlestir(tarla, c);
  for (let y = 40; y < 42; y++) {
    for (let x = 40; x < 42; x++) assert.equal(tarla.h[y * W + x], 0, `taban (${x}, ${y})`);
  }
  assert.equal(toplamSaman(tarla), 200);
});

test('samanAl en yüksekten alır, samanDok en alçağa döker; korunur ve kirletir', () => {
  const { c, tarla } = dunya(1, duzTarla(5));
  tarla.kirli = false;
  tarla.h[50 * W + 50] = 30;
  const once = toplamSaman(tarla);
  assert.equal(samanAl(tarla, c, 50, 50, 2, 10), 10);
  assert.equal(tarla.h[50 * W + 50], 20, 'önce en yüksek hücre');
  assert.equal(c.kirli[bolgeNo(50, 50)], 1);
  assert.equal(samanDok(tarla, c, 50, 50, 10), 10);
  assert.equal(toplamSaman(tarla), once);
  assert.equal(tarla.kaldirilan, 0, 'benzetim kaldırılan sayacına yazmaz');
  const bos = dunya(1, duzTarla(0));
  assert.equal(samanAl(bos.tarla, bos.c, 10, 10, 3, 5), 0);
});

test('gomuluCikar: yalnız açıkta (h ≤ z), alınmamış, taban dışı ve menzildeki nesne', () => {
  const igne = { esya: esyaKodu('igne'), x: 30, y: 30, z: 4, alindi: false };
  const civi = { esya: esyaKodu('civi'), x: 33, y: 30, z: 1, alindi: false };
  const uzak = { esya: esyaKodu('civi'), x: 60, y: 60, z: 9, alindi: false };
  const { c, tarla } = dunya(1, duzTarla(3), { gomulu: [igne, civi, uzak] });
  const cikan = gomuluCikar(tarla, c, 31, 30, 3);
  assert.deepEqual(cikan, [igne], 'çivi örtülü (h 3 > z 1), uzak menzil dışı');
  assert.equal(igne.alindi, true);
  assert.deepEqual(gomuluCikar(tarla, c, 31, 30, 3), [], 'bir kez çıkar');
});

test('saman korunumu: huni + bant + sandık 1500 tik koşarken toplam sabit', () => {
  const tarla = duzTarla(0, [{ x: 44, y: 70, r: 14, t: 90 }]);
  const { c } = dunya(3, tarla);
  yerlestir(tarla, c);
  for (let y = 60; y < 66; y++) for (let x = 40; x < 66; x++) tarla.h[y * W + x] = 0;
  tarla.kirli = true;
  const toplam = () => ciftlikSamani(c, tarla) + tarla.kaldirilan;
  const once = toplam();
  kur(c, tarla, 'huni', 20, 31, 0); // ağız yığının kenarında (hücre 42, 64)
  bantCek(c, tarla, 22, 31, 0, 6);
  const sandik = kur(c, tarla, 'sandik', 28, 31);
  assert.equal(toplam(), once, 'kurulum (alttaki saman çevreye) korur');
  for (let t = 0; t < 1500; t += 100) {
    kos(c, tarla, 100);
    assert.equal(toplam(), once, `tik ${c.tik}`);
  }
  assert.ok(sandik.ozel.toplam > 20, `sandıkta ${sandik.ozel.toplam}`);
  const sayac = Array.from(c.kirli).filter(Boolean).length;
  assert.ok(sayac < KIRLI_EN * 3, `kirli bölge az kalır: ${sayac}`);
});
