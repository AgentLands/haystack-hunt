/**
 * Makine görselleri: yakıt göstergesinin görünürlüğü ve rengi, görsel hal (yondan
 * direksiyon açısı, hızlanmada pof, balya bırakılınca kapak), yeni balyanın yuvarlanarak
 * çıkması, garajın ölçüleri, çizimi ve çatının altında biri varken dolu sayılması.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { yay } from '../js/olaylar.js';
import { OLCEK } from '../js/cizim.js';
import {
  YAKIT_KRITIK, gostergeGorunur, yakitRengi,
} from '../js/ozellik/gorsel/yakit-gosterge.js';
import {
  DIREKSIYON_AZAMI, halAl, kapakAcikligi, pofYasi,
} from '../js/ozellik/gorsel/makine-hal.js';
import { balyaCiz } from '../js/ozellik/gorsel/balya-cizim.js';
import { makineCiz } from '../js/ozellik/gorsel/makine-cizim.js';
import {
  garajCatiCiz, garajOlcu, garajZeminCiz,
} from '../js/ozellik/gorsel/garaj-cizim.js';
import { catiDolu } from '../js/ozellik/gorsel/garaj-cati.js';

/** Çağrıları argümanlarıyla kaydeden sahte 2B bağlam. */
function sahteBaglam() {
  const cagrilar = [];
  const ozellik = {};
  return {
    cagrilar,
    ctx: new Proxy(ozellik, {
      get(hedef, ad) {
        if (ad in hedef) return hedef[ad];
        return (...arg) => { cagrilar.push([ad, arg]); return arg; };
      },
      set(hedef, ad, deger) { hedef[ad] = deger; return true; },
    }),
  };
}

const makine = (tur, ek = {}) => ({
  id: 1, tur, x: 20, y: 20, yon: 0, hiz: 0, yakit: 1, surucu: false, calisiyor: false,
  yuk: 0, ...ek,
});

test('yakıt göstergesi: sürülürken ya da yakıt azken görünür; renk yeşilden kırmızıya', () => {
  assert.equal(gostergeGorunur(makine('traktor')), false);
  assert.equal(gostergeGorunur(makine('traktor', { surucu: true })), true);
  assert.equal(gostergeGorunur(makine('traktor', { yakit: 0.2 })), true);
  assert.equal(gostergeGorunur(makine('traktor', { yakit: 0 })), true);
  assert.equal(yakitRengi(1), 'rgb(104, 178, 64)');
  assert.equal(yakitRengi(YAKIT_KRITIK / 2), 'rgb(214, 58, 38)');
  const [, , g] = yakitRengi(0.3).match(/rgb\((\d+), (\d+)/).map(Number);
  assert.ok(g > 58 && g < 178, 'ara değer turuncumsu');
  const { ctx, cagrilar } = sahteBaglam();
  makineCiz(ctx, makine('traktor'), 0);
  const dolu = cagrilar.length;
  const b = sahteBaglam();
  makineCiz(b.ctx, makine('traktor', { yakit: 0.2 }), 0);
  assert.ok(b.cagrilar.length > dolu, 'az yakıtta gösterge eklenir');
});

test('görsel hal: dönüşte direksiyon açısı yönü izler ve sınırlıdır', () => {
  for (const [donus, isaret] of [[2.4, 1], [-2.4, -1]]) {
    const m = makine('traktor', { surucu: true, hiz: 6 });
    for (let i = 0; i <= 30; i++) {
      m.yon += donus / 60;
      halAl(m, 1000 + i * (1000 / 60));
    }
    const { direksiyon } = halAl(m, 1000 + 30 * (1000 / 60));
    assert.equal(Math.sign(direksiyon), isaret);
    assert.ok(Math.abs(direksiyon) > 0.2 && Math.abs(direksiyon) <= DIREKSIYON_AZAMI + 1e-9);
  }
  const geri = makine('traktor', { surucu: true, hiz: -4 });
  for (let i = 0; i <= 20; i++) {
    geri.yon += 0.04;
    halAl(geri, i * 16);
  }
  assert.ok(halAl(geri, 20 * 16).direksiyon < 0, 'geri giderken açı ters');
});

test('görsel hal: hızlanmada pof, kepçe kalkışı, balya bırakılınca kapak açılır', () => {
  const m = makine('traktor', { surucu: true });
  halAl(m, 0);
  m.hiz = 2;
  const h = halAl(m, 100);
  assert.ok(pofYasi(h, 0.1) < 1, 'hızlanınca pof');
  m.yuk = 1;
  for (let i = 1; i <= 60; i++) halAl(m, 100 + i * 16);
  assert.ok(halAl(m, 100 + 60 * 16).kalkis > 0.5, 'dolu kepçe kalkık taşınır');
  const bm = makine('balya', { surucu: true });
  const h2 = halAl(bm, 5000);
  assert.equal(kapakAcikligi(h2, 5), 0);
  yay('balya-birakildi', { balya: { x: 0, y: 0 }, makine: bm });
  halAl(bm, 5100);
  assert.ok(kapakAcikligi(h2, 5.4) > 0.9, 'kapak açık');
  assert.equal(kapakAcikligi(h2, 7), 0, 'sonra kapanır');
});

test('yeni bırakılan balya makineye doğru önden yuvarlanarak yerine gelir', () => {
  const ilkTasima = (balya, zaman) => {
    const { ctx, cagrilar } = sahteBaglam();
    balyaCiz(ctx, balya, zaman);
    return cagrilar.find(([ad]) => ad === 'translate')[1];
  };
  const eski = { x: 10, y: 10, yon: 0, acik: false, acilma: 0 };
  assert.deepEqual(ilkTasima(eski, 0), [10 * OLCEK, 10 * OLCEK]);
  const yeni = { x: 10, y: 10, yon: 0, acik: false, acilma: 0 };
  yay('balya-birakildi', { balya: yeni, makine: null });
  const [x0] = ilkTasima(yeni, 1000);
  assert.ok(x0 > 11 * OLCEK, 'başta makineye doğru önde');
  const [x1] = ilkTasima(yeni, 3000);
  assert.equal(x1, 10 * OLCEK, 'sonunda yerinde');
});

test('garaj: park yeri sayısı, zemin ve çatı çizimi, çatı altında çiftçi', () => {
  const garaj = { x: 4, y: 80, kenar: 3, yon: 0, en: 17 };
  const o = garajOlcu(garaj);
  assert.equal(o.n, 3);
  const tarla = { h: new Uint16Array(240 * 160) };
  tarla.h[80 * 240 + 3] = 5;
  const karakter = { x: 30, y: 80 };
  const durum = { garaj, tarla, karakter, makineler: [makine('traktor', { x: 4, y: 80 })] };
  const a = sahteBaglam();
  garajZeminCiz(a.ctx, durum);
  assert.ok(a.cagrilar.some(([ad]) => ad === 'fillRect'), 'zemindeki saman görünür');
  assert.equal(catiDolu(durum, o), false, 'park etmiş sürücüsüz makine çatıyı doldurmaz');
  const b = sahteBaglam();
  garajCatiCiz(b.ctx, durum, 0);
  const say = (ad) => b.cagrilar.filter(([c]) => c === ad).length;
  assert.equal(say('save'), say('restore'));
  assert.ok(say('fill') > 5, 'çatı ve direkler çizilir');
  karakter.x = 2;
  assert.equal(catiDolu(durum, o), true);
  durum.makineler[0].surucu = true;
  karakter.x = 30;
  assert.equal(catiDolu(durum, o), true, 'sürülen makine altında');
});
