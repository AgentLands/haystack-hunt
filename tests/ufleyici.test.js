/** Sırt üfleyicisinin (giyilen makine) birim testleri: kural ve oyun içi takma/çıkarma. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { tarlaKur, toplamSaman } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { igneDerinligi } from '../js/kural/igne.js';
import { TEMEL_HIZ } from '../js/kural/karakter.js';
import '../js/kural/makineler/hepsi.js';
import { makineTanimi } from '../js/kural/makineler/kayit.js';
import { yeniMakine } from '../js/kural/makineler/garaj.js';
import { MENZIL, KONI_ACI, namluNoktasi, DERIN_ESIK } from '../js/kural/makineler/ufleyici.js';
import { yeniOyun, durumAl, adim } from '../js/oyun.js';
import { kontrol, yonAyarla } from '../js/kontrol.js';
import { dinle } from '../js/olaylar.js';

const DT = 1 / 60;
const tanim = makineTanimi('ufleyici');

function duzTarla(yuk) {
  const t = tarlaKur(metindenTohum('ufle'));
  t.h.fill(yuk);
  return t;
}

/** Makineyi 1 sn çalıştırır; toplam savrulan katı ve olayları döndürür. */
function ufle(t, m, sn = 1) {
  let miktar = 0;
  const olaylar = [];
  for (let i = 0; i < Math.round(sn * 60); i++) {
    const s = tanim.calis(t, m, DT);
    miktar += s.miktar;
    olaylar.push(...s.olaylar);
  }
  return { miktar, olaylar };
}

/** Hücrenin namluya göre koni içinde olup olmadığı. */
function koniIcinde(m, x, y) {
  const o = namluNoktasi(m);
  const d = Math.hypot(x - o.x, y - o.y);
  if (d < 0.7 || d > MENZIL) return false;
  const a = Math.abs(Math.atan2(y - o.y, x - o.x) - m.yon);
  return a <= KONI_ACI;
}

test('üfleyici kayıtlı, giyilir bir makinedir', () => {
  assert.equal(tanim.giyilir, true);
  assert.ok(tanim.yuruHizi < 1 && tanim.yuruHizi > 0.5);
  assert.equal(makineTanimi('traktor').giyilir, false);
});

test('çalışınca konideki yüzey samanı azalır, ileri taşınır, toplam korunur', () => {
  const t = duzTarla(10);
  const m = yeniMakine('ufleyici', 'u', 100.5, 80.5, 0, 1);
  const once = toplamSaman(t);
  const { miktar } = ufle(t, m);
  assert.ok(miktar > 300, `savrulan ${miktar}`);
  assert.equal(toplamSaman(t) + t.kaldirilan, once);
  assert.equal(t.kaldirilan, 0); // tarla içine düştü
  let konide = 0;
  let onde = 0;
  let geride = 0;
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 0; x < GENISLIK; x++) {
      const h = t.h[y * GENISLIK + x];
      if (h === 10) continue;
      if (koniIcinde(m, x, y)) {
        konide++;
        assert.ok(h < 10, `koni hücresi ${x},${y} = ${h}`);
      } else {
        assert.ok(h > 10, `konide olmayan hücre ${x},${y} = ${h}`);
        if (x > 100.5 + MENZIL) onde++;
        else geride++;
      }
    }
  }
  assert.ok(konide > 20);
  assert.ok(onde > 10 && geride === 0, `önde ${onde}, geride ${geride}`);
  // Hücre başına kare başına ≤ 1 kat: bir karede koniden en çok hücre sayısı kadar kat çıkar.
  const bir = ufle(duzTarla(10), yeniMakine('ufleyici', 'u', 100.5, 80.5, 0, 1), DT);
  assert.ok(bir.miktar <= konide);
});

test('yakın hücre uzaktan daha çok etkilenir', () => {
  const t = duzTarla(20);
  const m = yeniMakine('ufleyici', 'u', 100.5, 80.5, 0, 1);
  ufle(t, m, 0.3);
  const o = namluNoktasi(m);
  const yakin = 20 - t.h[80 * GENISLIK + Math.round(o.x + 2)];
  const uzak = 20 - t.h[80 * GENISLIK + Math.round(o.x + 8)];
  assert.ok(yakin > uzak && uzak > 0, `yakın ${yakin} uzak ${uzak}`);
});

test('tarla dışına savrulan saman gider (kaldirilan artar), toplam korunur', () => {
  const t = duzTarla(10);
  const m = yeniMakine('ufleyici', 'u', GENISLIK - 12.5, 80.5, 0, 1);
  const once = toplamSaman(t);
  ufle(t, m);
  assert.ok(t.kaldirilan > 100, `kaldirilan ${t.kaldirilan}`);
  assert.equal(toplamSaman(t) + t.kaldirilan, once);
});

test('derin hücrede etki azalır: yığını tek başına bitiremez', () => {
  const sade = duzTarla(DERIN_ESIK / 2);
  const derin = duzTarla(DERIN_ESIK * 8);
  const a = ufle(sade, yeniMakine('ufleyici', 'a', 100.5, 80.5, 0, 1)).miktar;
  const b = ufle(derin, yeniMakine('ufleyici', 'b', 100.5, 80.5, 0, 1)).miktar;
  assert.ok(b < a * 0.3, `derin ${b} sade ${a}`);
  assert.ok(b > 0);
});

test('iğne ve çiviler uçmaz; üstündeki saman uçunca açıkta kalır', () => {
  const t = tarlaKur(metindenTohum('ufle-igne'));
  t.h.fill(0);
  const { igne } = t;
  const [x, y, z] = [igne.x, igne.y, igne.z];
  const civiler = t.civiler.map((c) => [c.x, c.y, c.z]);
  // İğne konide, 100 hücre sağındaki namlu yönünde değil: namluyu iğnenin 4 hücre soluna kur.
  const m = yeniMakine('ufleyici', 'u', x + 0.5 - 4 - 1.8, y + 0.5, 0, 1);
  for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
    t.h[yy * GENISLIK + xx] = z + 6;
  }
  assert.ok(igneDerinligi(t) > 0);
  ufle(t, m, 3);
  assert.deepEqual([igne.x, igne.y, igne.z], [x, y, z]);
  assert.deepEqual(t.civiler.map((c) => [c.x, c.y, c.z]), civiler);
  assert.equal(igneDerinligi(t), 0); // üstü açıldı
});

/** Oyunu kurar; yürünebilir düz tarla, üfleyiciye yakın karakter. */
function oyunKur(etiket) {
  yeniOyun(etiket, 'kolay');
  const d = durumAl();
  d.tarla.h.fill(0);
  const m = d.makineler.find((x) => x.tur === 'ufleyici');
  Object.assign(d.karakter, { x: 120.5, y: 80.5, yon: 0, z: 0 });
  Object.assign(m, { x: 122, y: 80.5, yon: 0 });
  let t = 0;
  const kare = (n = 1) => { for (let i = 0; i < n; i++) adim((t += 1000 / 60)); };
  kare();
  return { d, m, kare };
}

test('oyunda: takınca makine karakterle birlikte yürür (biraz yavaş), E ile yere bırakılır', () => {
  const { d, m, kare } = oyunKur('ufle-giy');
  const k = d.karakter;
  kontrol.binIste = true;
  kare();
  assert.equal(k.makine, m);
  assert.equal(m.surucu, true);
  assert.equal(m.x, k.x);
  yonAyarla(0, 1); // aşağı
  const y0 = k.y;
  kare(60);
  yonAyarla(0, 0);
  kare();
  const yol = k.y - y0;
  assert.ok(yol > 8 && yol < TEMEL_HIZ * 0.8 + 0.5, `yürünen ${yol}`);
  assert.equal(m.x, k.x);
  assert.equal(m.y, k.y);
  assert.ok(Math.abs(m.yon - Math.PI / 2) < 1e-9);
  kontrol.binIste = true;
  kare();
  assert.equal(k.makine, null);
  assert.equal(m.surucu, false);
  const yer = { x: m.x, y: m.y };
  assert.ok(Math.hypot(yer.x - k.x, yer.y - k.y) < 1e-9);
  yonAyarla(1, 0);
  kare(30);
  yonAyarla(0, 0);
  assert.deepEqual({ x: m.x, y: m.y }, yer); // yerinde kaldı
  assert.ok(k.x > yer.x + 3);
  // Yeniden alınabilir.
  Object.assign(k, { x: yer.x + 1, y: yer.y });
  kontrol.binIste = true;
  kare();
  assert.equal(k.makine, m);
});

test('oyunda: yakıt yalnız Boşlukla çalışırken azalır; olaylar ~10 Hz', () => {
  const { d, m, kare } = oyunKur('ufle-yakit');
  const olaylar = { ufleme: 0, calisti: 0 };
  const birak = [
    dinle('ufleme', (v) => {
      olaylar.ufleme++;
      assert.equal(v.menzil, MENZIL);
      assert.ok(Number.isFinite(v.x) && Number.isFinite(v.yon));
    }),
    dinle('makine-calisti', () => olaylar.calisti++),
  ];
  d.tarla.h.fill(5);
  kontrol.binIste = true;
  kare();
  const yakit0 = m.yakit;
  yonAyarla(0, 1);
  kare(60); // yürürken tüketmez
  yonAyarla(0, 0);
  assert.equal(m.yakit, yakit0);
  assert.equal(olaylar.ufleme, 0);
  kontrol.kullan = true;
  kare(60);
  kontrol.kullan = false;
  kare();
  const harcanan = yakit0 - m.yakit;
  assert.ok(Math.abs(harcanan - 1 / 120) < 0.002, `harcanan ${harcanan}`);
  assert.ok(olaylar.ufleme >= 9 && olaylar.ufleme <= 11, `ufleme ${olaylar.ufleme}`);
  assert.ok(olaylar.calisti >= 50);
  assert.equal(m.calisiyor, false);
  for (const b of birak) b();
});
