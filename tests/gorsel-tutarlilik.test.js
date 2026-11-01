/**
 * Görsel tutarlılık: ekran-sabit boyların (dış hat, işaret) cihaz piksel oranından (DPR)
 * bağımsız, CSS pikseli cinsinden aynı kalması; yakıt göstergesinin tuval genişliğine göre
 * ölçeği ve sade harekette (prefers-reduced-motion) yanıp sönmenin kalkması.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.matchMedia = () => ({ matches: true, addEventListener() {} }); // sade hareket AÇIK
const { ekran, ekranBirim, DUNYA_EN } = await import('../js/cizim/tuval-olcek.js');
const { disHat } = await import('../js/ozellik/gorsel/ortak.js');
const { yakitGostergesi, gostergeOlcegi } = await import(
  '../js/ozellik/gorsel/yakit-gosterge.js');
const { sadeHareket, nabizSade } = await import('../js/ozellik/sade-hareket.js');

/** Dönüşümü verilen ölçekte olan, çağrıları ve çizgi kalınlıklarını kaydeden bağlam. */
function baglam(olcek) {
  const kayit = { cagrilar: [], kalinlik: [] };
  const durum = {};
  const ctx = new Proxy(durum, {
    get(hedef, ad) {
      if (ad === 'getTransform') return () => ({ a: olcek, b: 0 });
      if (ad === 'stroke') {
        return () => { kayit.cagrilar.push('stroke'); kayit.kalinlik.push(hedef.lineWidth); };
      }
      if (ad in hedef) return hedef[ad];
      return (...arg) => { kayit.cagrilar.push(ad); return arg; };
    },
    set(hedef, ad, deger) { hedef[ad] = deger; return true; },
  });
  return { ctx, kayit };
}

/** Aynı CSS ölçeğini (yerel birim başına 6 CSS pikseli) verilen DPR ile kurar. */
function dprIle(dpr) {
  ekran.dpr = dpr;
  return baglam(6 * dpr);
}

test('ekranBirim: DPR 1 ve DPR 3 aynı yerel boyu (1 CSS pikseli) verir', () => {
  const bir = ekranBirim(dprIle(1).ctx);
  const uc = ekranBirim(dprIle(3).ctx);
  assert.ok(Math.abs(bir - 1 / 6) < 1e-12);
  assert.ok(Math.abs(uc - bir) < 1e-12);
  // Düzeltme olmasaydı DPR 3'te 3 kat ince çıkardı.
  assert.ok(Math.abs(1 / (6 * 3) - bir) > 0.1);
});

test('disHat: dış hat kalınlığı DPR 1 ve DPR 3 için aynı yerel değerdir', () => {
  const kal = [1, 2, 3].map((dpr) => {
    const { ctx, kayit } = dprIle(dpr);
    disHat(ctx, {}, '#fff', 1.5);
    return kayit.kalinlik[0];
  });
  assert.ok(Math.abs(kal[0] - 0.5) < 1e-12);
  assert.deepEqual(kal.map((k) => k.toFixed(9)), Array(3).fill(kal[0].toFixed(9)));
  ekran.dpr = 1;
});

test('yakıt göstergesi ölçeği: telefonda karekök telafi, geniş ekranda orantılı, DPR yok', () => {
  assert.equal(gostergeOlcegi(DUNYA_EN), 1);
  assert.equal(gostergeOlcegi(2 * DUNYA_EN), 2);
  assert.ok(Math.abs(gostergeOlcegi(390) - Math.sqrt(390 / DUNYA_EN)) < 1e-12);
  // Aynı CSS genişliği, farklı DPR: gösterge yerel ölçeği (CSS pikseli başına) aynı kalır.
  const olcekler = [1, 3].map((dpr) => {
    ekran.cssEn = 390;
    const { ctx, kayit } = dprIle(dpr);
    ctx.scale = (k) => kayit.cagrilar.push(`scale:${k.toFixed(9)}`);
    yakitGostergesi(ctx, { x: 5, y: 5, yakit: 0.5, surucu: true }, 0, 1);
    return kayit.cagrilar.find((c) => c.startsWith('scale:'));
  });
  assert.equal(olcekler[0], olcekler[1]);
  Object.assign(ekran, { cssEn: DUNYA_EN, dpr: 1 });
});

test('sade hareket: yakıt kritikken gösterge yanıp sönmez, nabız sabittir', () => {
  assert.equal(sadeHareket(), true);
  assert.equal(nabizSade(0.9, 0.4), 0.4);
  const yayAdedi = (t) => {
    const { ctx, kayit } = baglam(6);
    yakitGostergesi(ctx, { x: 5, y: 5, yakit: 0.05, surucu: true }, t, 1);
    return kayit.cagrilar.filter((c) => c === 'stroke').length;
  };
  // sin(t·10) pozitif ve negatif olduğu iki an: biri yanıkken biri sönükken çizilirdi.
  assert.equal(yayAdedi(100), yayAdedi(471));
});
