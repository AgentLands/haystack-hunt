/**
 * Hayvan çizimi ve sesi: sahte tuval bağlamıyla her tür ve durumda hatasız çizildiği,
 * save/restore dengesi, saklı hayvanın çizilmemesi; ses desenlerinin geçerliliği.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { zeminCiz, havaCiz } from '../js/ozellik/hayvan/cizim.js';
import { hayvanSesDeseni } from '../js/ozellik/hayvan/ses-desen.js';
import { TURLER } from '../js/kural/hayvan.js';

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

const hayvan = (tur, durum, ek = {}) => ({
  id: `${tur}-1`, tur, x: 30, y: 40, yon: 0.7, durum, t: 0.3, gecen: 0.2, bekle: 0, faz: 1.1,
  h0: 20, kacis: 1, ox: 30, oy: 40, tx: 0, ty: 0, hx: 40, hy: 40, sure: 5,
  uyeler: tur === 'serce' ? [{ a: 0, v: 1, g: 0, fz: 0, dx: 0, dy: 0 },
    { a: 0.3, v: 1.1, g: 0.1, fz: 1, dx: 1, dy: -1 }] : null,
  ...ek,
});

const DURUMLAR = ['gizli', 'sasirma', 'esneme', 'kacis', 'ucus', 'dalis', 'otur', 'uyku',
  'kayip'];

test('her tür ve durumda çizim hatasız ve save/restore dengeli', () => {
  for (const tur of Object.keys(TURLER)) {
    for (const durum of DURUMLAR) {
      const { ctx, cagrilar } = sahteBaglam();
      const liste = [hayvan(tur, durum)];
      zeminCiz(ctx, liste, 4321);
      havaCiz(ctx, liste, 4321);
      const say = (ad) => cagrilar.filter((c) => c === ad).length;
      assert.equal(say('save'), say('restore'), `${tur}/${durum}`);
    }
  }
});

test('saklı ve kayıp hayvan gövdesi çizilmez; yerdeki ve uçan çizilir', () => {
  const doldurulan = (tur, durum, ek) => {
    const { ctx, cagrilar } = sahteBaglam();
    const liste = [hayvan(tur, durum, ek)];
    zeminCiz(ctx, liste, 100, false);
    havaCiz(ctx, liste, 100);
    return cagrilar.filter((c) => c === 'fill').length;
  };
  assert.equal(doldurulan('fare', 'gizli'), 0);
  assert.equal(doldurulan('fare', 'kayip'), 0);
  assert.ok(doldurulan('fare', 'kacis') > 5);
  assert.ok(doldurulan('kedi', 'uyku') > 5);
  assert.equal(doldurulan('serce', 'gizli'), 0);
  assert.ok(doldurulan('serce', 'ucus', { t: 0.5 }) > 5, 'uçan serçe ve gölgesi');
});

test('sade modda (kıpırtı kapalı) saklı hayvanın üstüne bir şey çizilmez', () => {
  const { ctx, cagrilar } = sahteBaglam();
  zeminCiz(ctx, [hayvan('fare', 'gizli')], 100, false);
  assert.equal(cagrilar.length, 0);
});

test('ses desenleri: her tür için geçerli, deterministik, fare cıyaklamaz', () => {
  for (const tur of Object.keys(TURLER)) {
    const d = hayvanSesDeseni(tur, 0.4);
    assert.ok(d.length >= 2, tur);
    assert.deepEqual(d, hayvanSesDeseni(tur, 0.4));
    for (const o of d) {
      assert.ok(o.tip === 'hisirti' || o.tip === 'nota');
      assert.ok(o.sure > 0 && o.sure <= 0.6 && o.duzey > 0 && o.duzey <= 0.2, `${tur} ${o.sure}`);
      assert.ok(!o.gecikme || o.gecikme < 0.5);
    }
  }
  assert.equal(hayvanSesDeseni('ejderha').length, 0);
  const fare = hayvanSesDeseni('fare');
  assert.equal(fare[0].tip, 'hisirti', 'önce hışırtı');
  assert.ok(fare.filter((o) => o.tip === 'nota').every((o) => o.sure <= 0.06), 'minik cik');
  const serce = hayvanSesDeseni('serce');
  assert.ok(serce.filter((o) => o.tip === 'hisirti').length >= 5, 'kanat pırpırı');
  assert.notDeepEqual(hayvanSesDeseni('fare', 0), hayvanSesDeseni('fare', 1));
});
