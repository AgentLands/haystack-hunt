/**
 * Görsel çizimler: sahte tuval bağlamıyla karakter, makine ve balya çizimlerinin her
 * durumda hatasız çalıştığını, kayıtlı durumda save/restore dengesini ve sürülen
 * üfleyicinin ayrıca çizilmediğini doğrular. (Görünüm dev/onizleme.html ile elle bakılır.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { karakterCiz } from '../js/ozellik/gorsel/karakter-cizim.js';
import { makineCiz } from '../js/ozellik/gorsel/makine-cizim.js';
import { balyaCiz } from '../js/ozellik/gorsel/balya-cizim.js';
import { yakitGostergesi } from '../js/ozellik/gorsel/yakit-gosterge.js';

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
  const g = sahteBaglam();
  yakitGostergesi(g.ctx, makine('ufleyici', { surucu: true }), 0, 1.3);
  assert.deepEqual(a.cagrilar, g.cagrilar); // yalnız yakıt göstergesi
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
