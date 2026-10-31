/** Kare hızı bağımsızlığı: el kazısı, yığın kayması ve üfleyici; fare erişim sınırı. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK } from '../js/kural/boyut.js';
import { tarlaKur, toplamSaman } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { elAdimi, EL_HIZI } from '../js/kural/araclar.js';
import { kaymaAdimi, kaymaKos, KAYMA_HIZI } from '../js/kural/kayma.js';
import '../js/kural/makineler/hepsi.js';
import { makineTanimi } from '../js/kural/makineler/kayit.js';
import { yeniMakine } from '../js/kural/makineler/garaj.js';
import { yeniOyun, durumAl, adim, bas } from '../js/oyun.js';
import { kontrol, yonAyarla } from '../js/kontrol.js';

const HIZLAR = [30, 60, 144, 240];

test('elAdimi: saniyede EL_HIZI kat, kesir sonraki kareye kalır', () => {
  for (const hz of HIZLAR) {
    let b = 0;
    let toplam = 0;
    for (let i = 0; i < hz; i++) {
      const a = elAdimi(b, 1 / hz);
      b = a.birikim;
      toplam += a.n;
    }
    assert.ok(Math.abs(toplam - EL_HIZI) <= 1, `${hz} Hz: ${toplam}`);
  }
  assert.equal(elAdimi(0, 1 / 60).n, 1, '60 Hz: karede tam 1 kat');
  assert.equal(elAdimi(0, 10).n, 4, 'uzun karede tavan');
});

test('kaymaAdimi: saniyede KAYMA_HIZI geçiş, kare hızından bağımsız', () => {
  for (const hz of HIZLAR) {
    let b = 0;
    let toplam = 0;
    for (let i = 0; i < hz; i++) {
      const a = kaymaAdimi(b, 1 / hz);
      b = a.birikim;
      toplam += a.n;
    }
    assert.ok(Math.abs(toplam - KAYMA_HIZI) <= 1, `${hz} Hz: ${toplam}`);
  }
});

test('kaymaKos: kaymayan tarlada ilk boş geçişte durur, birikim sıfırlanır', () => {
  let cagri = 0;
  const b = kaymaKos(() => { cagri += 1; return false; }, 3, 0.05);
  assert.equal(cagri, 1);
  assert.equal(b, 0);
});

/** Karakteri en yüksek hücrenin yanında 1 sn Boşluk basılı tutar; alınan toplam kat. */
function elleKaz(hz) {
  yeniOyun('kare-hizi', 'normal');
  const d = durumAl();
  let en = 0;
  for (let i = 0; i < d.tarla.h.length; i++) if (d.tarla.h[i] > d.tarla.h[en]) en = i;
  Object.assign(d.karakter, { x: (en % GENISLIK) - 0.5, y: Math.floor(en / GENISLIK) + 0.5 });
  d.karakter.yon = 0;
  kontrol.kullan = true;
  let t = 1000;
  adim(t);
  const bas0 = d.tarla.kaldirilan;
  for (let i = 0; i < hz; i++) {
    t += 1000 / hz;
    adim(t);
  }
  kontrol.kullan = false;
  adim(t + 16);
  return d.tarla.kaldirilan - bas0;
}

test('el kazısı 30-240 Hz arasında aynı hızda kazar (60 Hz değeri korunur)', () => {
  const referans = elleKaz(60);
  assert.ok(referans > 0);
  for (const hz of HIZLAR) {
    const kazilan = elleKaz(hz);
    assert.ok(Math.abs(kazilan - referans) / referans < 0.05, `${hz} Hz: ${kazilan} / ${referans}`);
  }
});

test('el: basış anında 1 kat hemen alınır (yüksek tazelemede de)', () => {
  yeniOyun('ilk-kat', 'normal');
  const d = durumAl();
  let en = 0;
  for (let i = 0; i < d.tarla.h.length; i++) if (d.tarla.h[i] > d.tarla.h[en]) en = i;
  Object.assign(d.karakter, { x: (en % GENISLIK) - 0.5, y: Math.floor(en / GENISLIK) + 0.5 });
  d.karakter.yon = 0;
  adim(1000);
  kontrol.kullan = true;
  adim(1000 + 1000 / 240);
  kontrol.kullan = false;
  assert.ok(d.tarla.kaldirilan > 0);
});

test('üfleyici 48 Hz altında (20 Hz) da saniyede aynı kat savurur', () => {
  const tanim = makineTanimi('ufleyici');
  const sonuc = [];
  for (const hz of [20, 60, 144]) {
    const t = tarlaKur(metindenTohum('ufle-hz'));
    t.h.fill(24); // 0,25 sn'de yakın hücre 12 kat verir: kaynak tükenip hızı gizlemez
    const m = yeniMakine('ufleyici', 'u', 100.5, 80.5, 0, 1);
    const once = toplamSaman(t);
    let miktar = 0;
    for (let i = 0; i < hz / 4; i++) miktar += tanim.calis(t, m, 1 / hz).miktar;
    assert.equal(toplamSaman(t) + t.kaldirilan, once, 'saman korunur');
    sonuc.push(miktar);
  }
  const [a, b, c] = sonuc;
  assert.ok(b > 100, `60 Hz ${b}`);
  assert.ok(Math.abs(a - b) / b < 0.08, `20 Hz ${a} / 60 Hz ${b}`);
  assert.ok(Math.abs(c - b) / b < 0.08, `144 Hz ${c} / 60 Hz ${b}`);
});

test('fare basılıyken klavyeyle uzaklaşınca fare noktası erişime çekilir', () => {
  yeniOyun('fare-erisim', 'normal');
  const d = durumAl();
  d.tarla.h.fill(0);
  const k = d.karakter;
  Object.assign(k, { x: 100.5, y: 80.5, yon: 0 });
  for (let y = 75; y <= 85; y++) for (let x = 97; x <= 107; x++) d.tarla.h[y * GENISLIK + x] = 50;
  let t = 1000;
  adim(t);
  assert.equal(bas({ x: 102, y: 80 }, t), true);
  yonAyarla(-1, 0, 'klavye');
  for (let i = 0; i < 180; i++) {
    t += 1000 / 60;
    adim(t);
  }
  yonAyarla(0, 0, 'klavye');
  const uzak = Math.hypot(d.fare.x - (k.x - 0.5), d.fare.y - (k.y - 0.5));
  assert.ok(uzak <= 3.0001, `uzaklık ${uzak}`);
});
