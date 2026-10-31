/**
 * Görsel çizimler: sahte tuval bağlamıyla karakter, makine ve balya çizimlerinin her
 * durumda hatasız çalıştığını, kayıtlı durumda save/restore dengesini ve sürülen
 * üfleyicinin ayrıca çizilmediğini; saf yardımcıların (ekranBirim, disHat, çiftçi pozları,
 * iğne/çivi boyu) sözleşmesini doğrular. (Görünüm dev/onizleme.html ile elle bakılır.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { karakterCiz } from '../js/ozellik/gorsel/karakter-cizim.js';
import { makineCiz } from '../js/ozellik/gorsel/makine-cizim.js';
import { balyaCiz } from '../js/ozellik/gorsel/balya-cizim.js';
import { disHat, ekranBirim } from '../js/ozellik/gorsel/ortak.js';
import { aracPozu, govdePozu } from '../js/ozellik/gorsel/karakter-poz.js';
import { igneYariBoyu, OLCEK } from '../js/cizim.js';
import { civiYariBoyu } from '../js/ozellik/civi-cizim.js';

/** Her yöntemi kaydeden, durum özelliklerini serbest bırakan sahte 2B bağlam. */
function sahteBaglam() {
  const cagrilar = [];
  const ozellik = {};
  return {
    cagrilar,
    ctx: new Proxy(ozellik, {
      get(hedef, ad) {
        if (ad in hedef) return hedef[ad];
        return (...arg) => { cagrilar.push(ad); return arg; };
      },
      set(hedef, ad, deger) { hedef[ad] = deger; return true; },
    }),
  };
}

const karakter = (ek = {}) => ({
  x: 10, y: 12, yon: 1, hareketli: true, adimFaz: 0.3, z: 40, kullaniyor: true,
  makine: null, ...ek,
});
const makine = (tur, ek = {}) => ({
  id: 1, tur, x: 20, y: 20, yon: 2, hiz: 2, yakit: 0.8, surucu: true, calisiyor: true,
  yuk: 0.6, ...ek,
});

test('karakter her araçla ve her durumda çizilir; save/restore dengeli', () => {
  for (const arac of ['el', 'tirmik', 'dedektor', 'miknatis']) {
    for (const kullaniyor of [false, true]) {
      const { ctx, cagrilar } = sahteBaglam();
      karakterCiz(ctx, karakter({ kullaniyor }), 1234, arac);
      assert.equal(cagrilar.filter((c) => c === 'save').length,
        cagrilar.filter((c) => c === 'restore').length);
      assert.ok(cagrilar.includes('fill'));
    }
  }
});

test('karakter sırt üfleyicisiyle ve eksik alanlarla çizilir', () => {
  const { ctx, cagrilar } = sahteBaglam();
  karakterCiz(ctx, karakter({ makine: makine('ufleyici') }), 500);
  assert.ok(cagrilar.length > 20);
  karakterCiz(sahteBaglam().ctx, { x: 1, y: 1, yon: 0 }, 0);
});

test('üç makine türü ve her durumları çizilir', () => {
  for (const tur of ['traktor', 'balya', 'ufleyici']) {
    for (const ek of [{}, { surucu: false }, { yakit: 0 }, { hiz: -3, yuk: 1 }, { yuk: 0 }]) {
      const { ctx, cagrilar } = sahteBaglam();
      makineCiz(ctx, makine(tur, ek), 777);
      assert.equal(cagrilar.filter((c) => c === 'save').length,
        cagrilar.filter((c) => c === 'restore').length);
      if (!(tur === 'ufleyici' && ek.surucu !== false)) assert.ok(cagrilar.length > 10);
    }
  }
});

test('sürülen üfleyici makine olarak ayrıca çizilmez; bilinmeyen tür yok sayılır', () => {
  const a = sahteBaglam();
  makineCiz(a.ctx, makine('ufleyici', { surucu: true }), 0);
  assert.equal(a.cagrilar.length, 0);
  const b = sahteBaglam();
  makineCiz(b.ctx, makine('ucak'), 0);
  assert.equal(b.cagrilar.length, 0);
});

test('balya kapalı, açılırken ve açılmış çizilir', () => {
  for (const [acik, acilma] of [[false, 0], [true, 0], [true, 0.5], [true, 1], [false, 0.7]]) {
    const { ctx, cagrilar } = sahteBaglam();
    balyaCiz(ctx, { x: 5, y: 5, yon: 0.4, acik, acilma }, 99);
    assert.ok(cagrilar.includes('fill'));
  }
});

test('ekranBirim: yerel uzayda 1 ekran pikseli (dönüşümün ölçeğinden)', () => {
  assert.equal(ekranBirim({ getTransform: () => ({ a: 4, b: 0 }) }), 0.25);
  const a = 0.7;
  const eb = ekranBirim({ getTransform: () => ({ a: 5 * Math.cos(a), b: 5 * Math.sin(a) }) });
  assert.ok(Math.abs(eb - 0.2) < 1e-12);
});

test('disHat: önce koyu kahve dış hat (ekran-sabit kalınlık), sonra dolgu', () => {
  const sira = [];
  const ctx = {
    getTransform: () => ({ a: 10, b: 0 }),
    stroke(yol) { sira.push(['stroke', yol, this.strokeStyle, this.lineWidth]); },
    fill(yol) { sira.push(['fill', yol, this.fillStyle]); },
  };
  const yol = {};
  disHat(ctx, yol, '#c23a26', 1.5);
  assert.ok(Math.abs(sira[0][3] - 0.3) < 1e-12);
  sira[0][3] = 0.3;
  assert.deepEqual(sira, [['stroke', yol, '#2a1a0d', 0.3], ['fill', yol, '#c23a26']]);
});

test('yürüme: faz 0 ve 0.5 aynadır; kollar bacaklarla karşı fazda; beklerken bot yok', () => {
  const a = govdePozu(0, true, 0);
  const b = govdePozu(0.5, true, 0);
  const yakin = (x, y) => Math.abs(x - y) < 1e-9;
  assert.ok(yakin(a.yanal, -b.yanal) && yakin(a.burulma, -b.burulma) && yakin(a.olcek, b.olcek));
  assert.ok(yakin(a.botlar[0][0], b.botlar[1][0]) && yakin(a.botlar[0][1], -b.botlar[1][1]));
  assert.ok(yakin(a.eller[0][0], b.eller[1][0]) && yakin(a.eller[0][1], -b.eller[1][1]));
  // Sağ ayak öndeyken sağ el geride.
  assert.ok(a.botlar[0][0] > a.botlar[1][0] && a.eller[0][0] < a.eller[1][0]);
  // Adım vurgusu: geçişte (0.25) gövde temastan (0) büyük.
  assert.ok(govdePozu(0.25, true, 0).olcek > a.olcek);
  assert.equal(govdePozu(0.3, false, 1).botlar, null);
});

test('alet pozları bekleme duruşundan belirgin ayrılır', () => {
  const bekle = govdePozu(0, false, 0).eller;
  for (const t of [0, 0.1, 0.2, 0.3]) {
    const el = aracPozu('el', true, t);
    assert.ok(el.egilme > 0.1 && el.eller[0][0] - bekle[0][0] > 0.4, 'el öne eğilip kürek');
  }
  const tirmik = [0, 0.26, 0.52, 0.78].map((t) => aracPozu('tirmik', true, t).aci);
  assert.ok(Math.max(...tirmik) - Math.min(...tirmik) > 0.8, 'tırmık sap yayı');
  assert.ok(aracPozu('miknatis', true, 0).uzat > 0.3, 'mıknatıs ileri uzanır');
  assert.notEqual(aracPozu('dedektor', true, 0.2).iz, 0);
  assert.deepEqual(aracPozu('el', false, 1).eller, null);
});

test('iğne oyun ölçeğinde 22-34 px, z=6 ile en çok 45 px; çivi ondan kısa', () => {
  const ekranda = (z) => 2 * igneYariBoyu(1 / z) * z;
  assert.ok(ekranda(3.5) >= 22 && ekranda(3.5) <= 34);
  assert.ok(ekranda(6) <= 45);
  assert.ok(igneYariBoyu(1) <= OLCEK * 2.2);
  for (const z of [1, 2, 3.5, 6, 10]) assert.ok(civiYariBoyu(1 / z) < igneYariBoyu(1 / z));
});
