/**
 * Yakın görünüm tarla çiziminin saf parçalarının birim testleri: dokular (js/cizim/doku.js),
 * alt piksel boyası ve çift doğrusal tablo (alt-piksel.js), artımlı tarla boyası
 * (tarla-boya.js) ve karo kaydı (karolar.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  karistir, samanDokusu, toprakDokusu, kapsama, SAMAN_AYAR,
} from '../js/cizim/doku.js';
import { bolgeBoya, tablo } from '../js/cizim/alt-piksel.js';
import { boya, KANAL, K_H, K_GOL } from '../js/cizim/tarla-boya.js';
import {
  KARO, karoKaydi, gorunurKarolar, halkaHalka, gecisAlfa,
} from '../js/cizim/karolar.js';
import { tarlaKur } from '../js/kural/tarla.js';
import { elIleAl } from '../js/kural/araclar.js';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';

const T = 64;
const S = 8;
const saman = samanDokusu(T, S, 3);
const dokular = { T, ...saman, toprak: toprakDokusu(T, S, 4) };
const ortalama = (d) => d.reduce((a, b) => a + b, 0) / d.length;

test('karistir deterministik ve [0, 1) aralığında', () => {
  for (let i = 0; i < 200; i++) {
    const v = karistir(i, i * 7, 3);
    assert.ok(v >= 0 && v < 1);
    assert.equal(v, karistir(i, i * 7, 3));
  }
});

test('saman dokusu: deterministik, ortalaması 0, çöplerle örtülü, sıralar 0..1', () => {
  const tekrar = samanDokusu(T, S, 3);
  assert.deepEqual(tekrar.ton, saman.ton);
  assert.ok(Math.abs(ortalama(saman.ton)) < 1e-3);
  const ortulu = saman.ust.filter((v) => v > 0).length / saman.ust.length;
  assert.ok(ortulu > 0.75, `örtü ${ortulu}`);
  for (const v of saman.ust) assert.ok(v >= 0 && v <= 1);
  // Tonlar farklı: karanlık boşluk, altın ve solgun çöpler birlikte.
  const tonlar = [...saman.ton];
  assert.ok(Math.min(...tonlar) < SAMAN_AYAR.dip / 2);
  assert.ok(Math.max(...tonlar) > 0.3);
  assert.notDeepEqual(samanDokusu(T, S, 9).ton, saman.ton);
});

test('saman dokusu döşenebilir: kenarı aşan çöp karşı kenarda sürer', () => {
  // Sol ve sağ kenar sütunları arasındaki ilinti, rastgele iki sütundan belirgin yüksek.
  const ilinti = (xa, xb) => {
    let s = 0;
    for (let y = 0; y < T; y++) s += saman.ton[y * T + xa] * saman.ton[y * T + xb];
    return s / T;
  };
  const kenar = ilinti(T - 1, 0);
  const uzak = (ilinti(5, T / 2) + ilinti(11, 40) + ilinti(20, 50)) / 3;
  assert.ok(kenar > uzak + 0.01, `kenar ${kenar} uzak ${uzak}`);
});

test('toprak dokusu: ortalaması 0, sınırlı sapma', () => {
  assert.ok(Math.abs(ortalama(dokular.toprak)) < 1e-3);
  for (const v of dokular.toprak) assert.ok(v > -0.6 && v < 0.6);
});

test('kapsama: çıplak toprakta yok, kalın samanda tam, yükseklikle artar', () => {
  for (const u of [0, 0.3, 1]) {
    assert.equal(kapsama(0, u), 0);
    assert.equal(kapsama(3.5, u), 1);
  }
  let once = 0;
  for (let H = 0; H <= 3.5; H += 0.25) {
    const k = kapsama(H, 0.8);
    assert.ok(k >= once);
    once = k;
  }
  // İnce samanda yalnız üst sıradaki çöpler görünür.
  assert.ok(kapsama(0.6, 0.98) > 0 && kapsama(0.6, 0.3) === 0);
});

test('tablo: hücre merkezinde ağırlık 0, uçlar kenetli', () => {
  const t = tablo(0, 4 * S, S, 4);
  // Alt piksel merkezleri (p + 0.5)/S; hücre 1'in ortası p = 1.5·S − 0.5.
  for (let p = 0; p < 4 * S; p++) {
    assert.ok(t.a[p] >= 0 && t.b[p] <= 3 && t.t[p] >= 0 && t.t[p] < 1);
  }
  assert.equal(t.a[0], 0);
  assert.equal(t.b[4 * S - 1], 3);
  const orta = tablo(1, 1, 2, 4); // dünya 1.25 → sol hücre 0 (merkez 0.5), t = 0.75
  assert.equal(orta.a[0], 0);
  assert.equal(orta.b[0], 1);
  assert.ok(Math.abs(orta.t[0] - 0.75) < 1e-6);
});

/** Düzgün olmayan küçük bir kanal ızgarası: bir yığın tepesi ve çıplak toprak. */
function kanalYap(en, boy) {
  const k = new Float32Array(en * boy * KANAL);
  for (let y = 0; y < boy; y++) {
    for (let x = 0; x < en; x++) {
      const i = (y * en + x) * KANAL;
      k[i + K_H] = Math.max(0, 30 - 4 * Math.hypot(x - 6, y - 5));
      k[i + 1] = -3 * Math.sign(x - 6);
      k[i + 2] = -3 * Math.sign(y - 5);
      k[i + K_GOL] = x > 8 ? 0.4 : 0;
      k.set([104, 78, 52], i + 4);
    }
  }
  return k;
}

test('bölge boyası: karolar dikişsiz (tek parça = parça parça), doku dünyaya sabit', () => {
  const en = 16;
  const boy = 12;
  const k = kanalYap(en, boy);
  const tum = new Uint8ClampedArray(en * S * boy * S * 4);
  bolgeBoya(k, en, boy, dokular, 0, 0, en, boy, S, tum);
  const parca = new Uint8ClampedArray(4 * S * 4 * S * 4);
  for (const [x0, y0] of [[0, 0], [4, 0], [8, 4], [12, 8]]) {
    bolgeBoya(k, en, boy, dokular, x0, y0, 4, 4, S, parca);
    for (let py = 0; py < 4 * S; py++) {
      for (let px = 0; px < 4 * S; px++) {
        const a = (py * 4 * S + px) * 4;
        const b = ((y0 * S + py) * en * S + x0 * S + px) * 4;
        assert.deepEqual([...parca.subarray(a, a + 4)], [...tum.subarray(b, b + 4)]);
      }
    }
  }
});

test('bölge boyası: çıplak toprak toprak renginde, tepe samanla örtülü ve daha parlak', () => {
  const en = 16;
  const boy = 12;
  const k = kanalYap(en, boy);
  const c = new Uint8ClampedArray(en * S * boy * S * 4);
  bolgeBoya(k, en, boy, dokular, 0, 0, en, boy, S, c);
  const ort = (cx, cy) => {
    const t = [0, 0, 0];
    for (let py = cy * S; py < (cy + 1) * S; py++) {
      for (let px = cx * S; px < (cx + 1) * S; px++) {
        for (let j = 0; j < 3; j++) t[j] += c[(py * en * S + px) * 4 + j];
      }
    }
    return t.map((v) => v / (S * S));
  };
  const toprak = ort(0, 11);
  assert.ok(Math.abs(toprak[0] - 104) < 12 && Math.abs(toprak[2] - 52) < 10, `${toprak}`);
  const tepe = ort(6, 5);
  assert.ok(tepe[0] > 150 && tepe[1] > tepe[2] * 1.6, `${tepe}`);
  for (let o = 3; o < c.length; o += 4) assert.equal(c[o], 255);
});

test('artımlı tarla boyası tümden boyamayla birebir aynı', () => {
  const tarla = tarlaKur('cizim-deneme');
  const n = GENISLIK * YUKSEKLIK;
  const veri = new Uint8ClampedArray(n * 4);
  const kanal = new Float32Array(n * KANAL);
  const kayit = karoKaydi(GENISLIK, YUKSEKLIK);
  assert.ok(kayit.hDegisti(tarla).yeni);
  boya(tarla, veri, kanal, null);
  assert.equal(kayit.hDegisti(tarla), null);
  // Bir yığının tepesini ve yamacını kaz; yalnız etkilenen koni yeniden boyanır.
  let tepe = 0;
  for (let i = 1; i < n; i++) if (tarla.h[i] > tarla.h[tepe]) tepe = i;
  const tx = tepe % GENISLIK;
  const ty = (tepe / GENISLIK) | 0;
  for (let k = 0; k < 6; k++) elIleAl(tarla, tx - 3 + k, ty - 2 + (k % 3), 9);
  const degisen = kayit.hDegisti(tarla);
  assert.ok(degisen && !degisen.yeni);
  let boyanan = 0;
  const kutu = boya(tarla, veri, kanal, degisen, () => boyanan++);
  assert.ok(kutu && boyanan > 0 && boyanan < n / 3, `boyanan ${boyanan}`);
  const veriA = veri.slice();
  const kanalA = kanal.slice();
  boya(tarla, veri, kanal, null);
  assert.deepEqual(veriA, veri);
  assert.deepEqual(kanalA, kanal);
});

test('karo kaydı: değişen hücrenin ±2 komşuluğundaki karolar kirlenir', () => {
  const kayit = karoKaydi(32, 32);
  const tarla = { h: new Uint16Array(32 * 32) };
  kayit.hDegisti(tarla);
  kayit.kirli.fill(0);
  const sayac = kayit.sayac;
  tarla.h[9 * 32 + 9] = 5; // karo (2, 2); ±2 → hücre 7..11 → karolar 1..2
  const d = kayit.hDegisti(tarla);
  assert.deepEqual([d.y0, d.y1, d.sMin[9], d.sMax[9]], [9, 9, 9, 9]);
  const kirliler = [];
  kayit.kirli.forEach((v, i) => v && kirliler.push([i % kayit.kx, (i / kayit.kx) | 0]));
  assert.equal(KARO, 4);
  assert.deepEqual(kirliler, [[1, 1], [2, 1], [1, 2], [2, 2]]);
  assert.equal(kayit.kirli[kayit.kx + 1], sayac + 1); // kirlendiği kare
});

test('görünür karolar, halka sırası ve geçiş karışımı', () => {
  const a = gorunurKarolar({ x: 10.5, y: 3.2, en: 20, boy: 10 }, 1, 64, 40);
  assert.deepEqual([a.x0, a.y0, a.x1, a.y1], [9, 2, 32, 15]);
  assert.deepEqual([a.tx0, a.ty0, a.tx1, a.ty1], [2, 0, 7, 3]);
  const sira = [];
  halkaHalka(a, 4, 1, (tx, ty) => { sira.push([tx, ty]); });
  assert.equal(sira.length, 6 * 4);
  assert.equal(new Set(sira.map(String)).size, sira.length);
  assert.deepEqual(sira[0], [4, 1]);
  const uzak = sira.map(([x, y]) => Math.max(Math.abs(x - 4), Math.abs(y - 1)));
  for (let i = 1; i < uzak.length; i++) assert.ok(uzak[i] >= uzak[i - 1]);
  let n = 0;
  halkaHalka(a, 4, 1, () => ++n < 3);
  assert.equal(n, 3);
  assert.equal(gecisAlfa(1, 1.15, 1.6), 0);
  assert.equal(gecisAlfa(2, 1.15, 1.6), 1);
  assert.ok(Math.abs(gecisAlfa(1.375, 1.15, 1.6) - 0.5) < 1e-9);
});
