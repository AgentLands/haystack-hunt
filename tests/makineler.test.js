/** Makine çerçevesinin (kayıt, garaj, sürüş, binme) ve kepçeli traktörün birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { tarlaKur, toplamSaman } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { igneDerinligi, igneHucreleri } from '../js/kural/igne.js';
import { ZORLUKLAR } from '../js/kural/zorluk.js';
import '../js/kural/makineler/hepsi.js';
import {
  makineTanimla, makineTanimi, makineTurleri,
} from '../js/kural/makineler/kayit.js';
import { garajKur, yeniMakine } from '../js/kural/makineler/garaj.js';
import { surusAdim, yakitHarca } from '../js/kural/makineler/surus.js';
import { binilebilir, inmeYeri, BINME_MESAFE } from '../js/kural/makineler/binme.js';
import {
  kepceNoktasi, kenardaMi, KEPCE_KAPASITE,
} from '../js/kural/makineler/traktor.js';

const DT = 1 / 60;

function duzTarla(yuk = 0) {
  const t = tarlaKur(metindenTohum('makine'));
  t.h.fill(yuk);
  return t;
}

function surDur(t, m, girdi, sn, engeller) {
  const olaylar = [];
  for (let i = 0; i < Math.round(sn * 60); i++) {
    const s = surusAdim(t, m, girdi, DT, engeller);
    if (s.takildi) olaylar.push('takildi');
    if (s.yakitBitti) olaylar.push('yakit-bitti');
  }
  return olaylar;
}

test('kayıt: tanım eksiksiz olmalı, bilinmeyen tür hata verir, traktör kayıtlı', () => {
  assert.throws(() => makineTanimla('eksik', { ad: 'Eksik' }), /eksik alan/);
  assert.throws(() => makineTanimi('yok'), /Bilinmeyen/);
  assert.deepEqual(makineTurleri(), ['traktor', 'ufleyici']);
  const t = makineTanimi('traktor');
  assert.equal(t.tur, 'traktor');
  assert.equal(typeof t.calis, 'function');
  assert.ok(t.yaricap > 0 && t.tirmanma > 0);
});

test('garaj: deterministik, tarla kenarında, makineler içeri bakar; yakıt zorluğa bağlı', () => {
  const t = tarlaKur(metindenTohum('garaj'));
  const a = garajKur(t, 'normal');
  assert.deepEqual(a, garajKur(t, 'normal'));
  const { garaj, makineler } = a;
  const kenaraUzaklik = Math.min(garaj.x, garaj.y, GENISLIK - garaj.x, YUKSEKLIK - garaj.y);
  assert.ok(kenaraUzaklik <= 5, `kenara ${kenaraUzaklik}`);
  assert.equal(makineler.length, makineTurleri().length);
  const m = makineler[0];
  assert.equal(m.yon, garaj.yon);
  // İçeri bakış: biraz ileri gidince kenardan uzaklaşır.
  const ileri = { x: m.x + Math.cos(m.yon) * 10, y: m.y + Math.sin(m.yon) * 10 };
  assert.ok(ileri.x > 5 && ileri.y > 5 && ileri.x < GENISLIK - 5 && ileri.y < YUKSEKLIK - 5);
  assert.ok(ZORLUKLAR.kolay.yakit > ZORLUKLAR.normal.yakit);
  assert.ok(ZORLUKLAR.normal.yakit > ZORLUKLAR.zor.yakit);
  assert.equal(garajKur(t, 'kolay').makineler[0].yakit, ZORLUKLAR.kolay.yakit);
  assert.equal(garajKur(t, 'zor').makineler[0].yakit, ZORLUKLAR.zor.yakit);
});

test('sürüş: gaz ileri götürür, geri yavaştır, dönüş yönü çevirir, yakıt harcanır', () => {
  const t = duzTarla();
  const m = yeniMakine('traktor', 't', 100, 80, 0, 1);
  surDur(t, m, { gaz: 1 }, 2);
  assert.ok(m.x > 115, `x ${m.x}`);
  assert.ok(Math.abs(m.y - 80) < 1e-9);
  assert.ok(m.yakit < 1);
  surDur(t, m, {}, 1.5); // fren
  assert.equal(m.hiz, 0);
  const x = m.x;
  surDur(t, m, { gaz: -1 }, 2);
  assert.ok(m.x < x && x - m.x < 15 * 0.5 * 2, `geri ${x - m.x}`);
  surDur(t, m, { donus: 1 }, 0.5);
  assert.ok(m.yon > 1, `yon ${m.yon}`); // D saat yönüne (y aşağı) çevirir
  const once = { x: m.x, y: m.y };
  surDur(t, m, {}, 1);
  assert.ok(Math.abs(m.hiz) < 1e-9);
  const sonra = { x: m.x, y: m.y };
  surDur(t, m, {}, 1);
  assert.deepEqual({ x: m.x, y: m.y }, sonra);
  assert.ok(Math.hypot(sonra.x - once.x, sonra.y - once.y) < 3);
});

test('sürüş: yüksek basamakta bir kez takılır, geri çıkınca kurtulur', () => {
  const t = duzTarla();
  for (let y = 0; y < YUKSEKLIK; y++) {
    for (let x = 120; x < GENISLIK; x++) t.h[y * GENISLIK + x] = 10;
  }
  const m = yeniMakine('traktor', 't', 110, 80, 0, 1);
  const olaylar = surDur(t, m, { gaz: 1 }, 3);
  assert.deepEqual(olaylar, ['takildi']);
  assert.equal(m.takili, true);
  assert.ok(m.x + makineTanimi('traktor').boy / 2 <= 120 + 1e-9);
  surDur(t, m, { gaz: -1 }, 1);
  assert.equal(m.takili, false);
  // Alçak basamağı (eşik kadar) çıkar.
  t.h.fill(0);
  for (let y = 0; y < YUKSEKLIK; y++) t.h[y * GENISLIK + 120] = makineTanimi('traktor').tirmanma;
  surDur(t, m, { gaz: 1 }, 2);
  assert.ok(m.x > 121);
});

test('sürüş: yakıt bitince bir kez olay, sonra makine kımıldamaz', () => {
  const t = duzTarla();
  const m = yeniMakine('traktor', 't', 30, 80, 0, 0.002);
  const olaylar = surDur(t, m, { gaz: 1 }, 3);
  assert.deepEqual(olaylar, ['yakit-bitti']);
  assert.equal(m.yakit, 0);
  surDur(t, m, {}, 1);
  const x = m.x;
  surDur(t, m, { gaz: 1, donus: 1 }, 1);
  assert.equal(m.x, x);
  assert.equal(yakitHarca(m, 0.1), false);
});

test('sürüş: tarla sınırında ve engelde durur', () => {
  const t = duzTarla();
  const m = yeniMakine('traktor', 't', 10, 80, Math.PI, 1);
  surDur(t, m, { gaz: -1 }, 0.1);
  surDur(t, m, { gaz: 1 }, 3);
  assert.ok(m.x >= makineTanimi('traktor').yaricap - 1e-9);
  const b = yeniMakine('traktor', 'b', 50, 40, 0, 1);
  const engel = { x: 60, y: 40, r: 1.7 };
  surDur(t, b, { gaz: 1 }, 3, [engel]);
  assert.ok(Math.hypot(b.x - engel.x, b.y - engel.y) >= engel.r + 1.7 - 1e-9);
});

test('binme: gövde kenarına ≤ 2.5 hücre; inme yanına, engelsiz', () => {
  const m = yeniMakine('traktor', 't', 100, 80, 0, 1);
  const r = makineTanimi('traktor').yaricap;
  assert.equal(binilebilir({ x: 100 + r + BINME_MESAFE - 0.1, y: 80 }, [m]), m);
  assert.equal(binilebilir({ x: 100 + r + BINME_MESAFE + 0.2, y: 80 }, [m]), null);
  m.surucu = true;
  assert.equal(binilebilir({ x: 101, y: 80 }, [m]), null);
  const yer = inmeYeri(m);
  assert.ok(Math.hypot(yer.x - 100, yer.y - 80) > r);
  assert.ok(Math.abs(yer.x - 100) < 1e-9 && yer.y < 80); // önce sol (yön 0 iken yukarı)
  const engelli = inmeYeri(m, [{ x: yer.x, y: yer.y, r: 1 }]);
  assert.ok(engelli.y > 80); // sol doluysa sağ
});

test('traktör kepçesi önündeki samanı alır, dolunca durur', () => {
  const t = duzTarla(800);
  const m = yeniMakine('traktor', 't', 100.5, 80.5, 0, 1);
  const tanim = makineTanimi('traktor');
  const once = toplamSaman(t);
  const r = tanim.calis(t, m, 0.1);
  assert.ok(r.miktar > 0);
  assert.equal(toplamSaman(t), once - r.miktar);
  assert.equal(m.icerik.saman, r.miktar);
  assert.ok(m.yuk > 0 && m.yuk < 1);
  const p = kepceNoktasi(m);
  assert.ok(t.h[Math.round(p.y) * GENISLIK + Math.round(p.x)] < 800);
  assert.equal(t.kaldirilan, 0); // saman kepçede, henüz tarladan çıkmadı
  let doldu = 0;
  for (let i = 0; i < 600; i++) {
    for (const [ad] of tanim.calis(t, m, DT).olaylar) if (ad === 'kepce-doldu') doldu++;
  }
  assert.equal(m.icerik.saman, KEPCE_KAPASITE);
  assert.equal(m.yuk, 1);
  assert.equal(doldu, 1);
  assert.equal(tanim.calis(t, m, DT).miktar, 0);
});

test('traktör kenarda boşaltır: saman tarladan çıkar, kilit Boşluk bırakılana dek', () => {
  const t = duzTarla(30);
  const m = yeniMakine('traktor', 't', 4, 80.5, Math.PI, 1);
  m.icerik.saman = 1234;
  assert.ok(kenardaMi(kepceNoktasi(m)));
  const r = makineTanimi('traktor').calis(t, m, DT);
  assert.equal(r.olaylar[0][0], 'kepce-bosaltildi');
  assert.equal(r.olaylar[0][1].miktar, 1234);
  assert.equal(t.kaldirilan, 1234);
  assert.equal(m.icerik.saman, 0);
  assert.equal(m.yuk, 0);
  assert.equal(m.kilitli, true);
  assert.equal(kenardaMi({ x: 120, y: 80 }), false);
});

test('kepçe iğnenin katına inince iğne kepçeye takılır, boşaltınca açıkta düşer', () => {
  const t = tarlaKur(metindenTohum('kepce-igne'));
  const { igne } = t;
  for (const i of igneHucreleri(igne)) t.h[i] = igne.z + 1;
  // Kepçe iğnenin üstüne gelecek biçimde, iğnenin solunda doğuya bakan traktör.
  const m = yeniMakine('traktor', 't', igne.x + 0.5 - 3, igne.y + 0.5, 0, 1);
  const tanim = makineTanimi('traktor');
  const adlar = [];
  for (let i = 0; i < 10; i++) for (const [ad] of tanim.calis(t, m, DT).olaylar) adlar.push(ad);
  assert.ok(adlar.includes('igne-kepcede'), adlar.join());
  assert.equal(igne.kepcede, true);
  assert.equal(m.icerik.igne, true);
  assert.equal(igneDerinligi(t), Infinity);
  // Traktör kenara gider: kare kancası iğneyi kepçeyle taşır.
  Object.assign(m, { x: 4, y: 60.5, yon: Math.PI });
  tanim.kare(t, m);
  assert.ok(Math.hypot(igne.x - (kepceNoktasi(m).x), igne.y - kepceNoktasi(m).y) < 3);
  const r = tanim.calis(t, m, DT);
  assert.equal(r.olaylar[0][1].igne, true);
  assert.equal(igne.kepcede, false);
  assert.equal(m.icerik.igne, false);
  assert.equal(igneDerinligi(t), 0);
  assert.ok(igne.x >= 2 && igne.y >= 2);
});

test('paslı çivi de kepçeye girer ve boşaltınca iğneden ayrı düşer', () => {
  const t = tarlaKur(metindenTohum('kepce-civi'), 'zor');
  const civi = t.civiler[0];
  for (const i of igneHucreleri(civi)) t.h[i] = civi.z;
  const m = yeniMakine('traktor', 't', civi.x + 0.5 - 3, civi.y + 0.5, 0, 1);
  const tanim = makineTanimi('traktor');
  const adlar = tanim.calis(t, m, DT).olaylar.map(([ad]) => ad);
  assert.ok(adlar.includes('civi-kepcede'));
  assert.equal(m.icerik.civiler.length, 1);
  Object.assign(m, { x: GENISLIK - 4, y: 80.5, yon: 0 });
  const r = tanim.calis(t, m, DT);
  assert.equal(r.olaylar[0][1].civi, 1);
  assert.equal(civi.kepcede, false);
  assert.ok(civi.x <= GENISLIK - 3);
});

test('oyunda: E ile bin, kepçe iğneyi alır, kenarda dök, in ve elle al', async () => {
  const { yeniOyun, durumAl, adim, aracSec } = await import('../js/oyun.js');
  const { kontrol } = await import('../js/kontrol.js');
  const { dinle } = await import('../js/olaylar.js');
  const adlar = [];
  const birak = ['makine-bin', 'igne-kepcede', 'kepce-bosaltildi', 'makine-in', 'bulundu']
    .map((ad) => dinle(ad, () => adlar.push(ad)));
  yeniOyun('kepce-oyun', 'kolay');
  const d = durumAl();
  const [m] = d.makineler;
  const { igne } = d.tarla;
  Object.assign(d.karakter, { x: m.x, y: m.y - 3.5 });
  let t = 0;
  const kare = (n = 1) => { for (let i = 0; i < n; i++) adim((t += 1000 / 60)); };
  kontrol.binIste = true;
  kare();
  assert.equal(d.karakter.makine, m);
  for (const i of igneHucreleri(igne)) d.tarla.h[i] = igne.z + 1;
  Object.assign(m, { x: igne.x + 0.5 - 3, y: igne.y + 0.5, yon: 0 });
  kontrol.kullan = true;
  kare(10);
  kontrol.kullan = false;
  kare();
  assert.equal(igne.kepcede, true);
  Object.assign(m, { x: 3, y: 80.5, yon: Math.PI });
  kontrol.kullan = true;
  kare(2);
  kontrol.kullan = false;
  assert.equal(igne.kepcede, false);
  assert.ok(d.tarla.kaldirilan > 0);
  kontrol.binIste = true;
  kare();
  assert.equal(d.karakter.makine, null);
  aracSec('el');
  Object.assign(d.karakter, { x: igne.x + 0.5 + 1.5, y: igne.y + 0.5, yon: Math.PI });
  kontrol.kullan = true;
  kare(2);
  kontrol.kullan = false;
  for (const b of birak) b();
  assert.deepEqual(adlar,
    ['makine-bin', 'igne-kepcede', 'kepce-bosaltildi', 'makine-in', 'bulundu']);
  assert.equal(d.bitti, true);
});
