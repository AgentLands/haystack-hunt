/** Ayak ve motor ses desenlerinin birim testleri (DOM/WebAudio yok). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adimDeseni, hizOrani, motorDeseni, MOTOR_PROFILLERI, TOPRAK_ESIGI,
} from '../js/ozellik/ses-makine-desen.js';

test('toprakta kuru tık, samanda hışırtı; saman yükseldikçe dolgun, boğuk ve uzun', () => {
  assert.equal(adimDeseni(0).tur, 'toprak');
  assert.equal(adimDeseni(TOPRAK_ESIGI - 0.1).tur, 'toprak');
  const dusuk = adimDeseni(5);
  const orta = adimDeseni(30);
  const yuksek = adimDeseni(120);
  assert.equal(dusuk.tur, 'saman');
  assert.ok(dusuk.f0 > orta.f0 && orta.f0 > yuksek.f0, 'frekans düşer (boğuklaşır)');
  assert.ok(dusuk.duzey < orta.duzey && orta.duzey < yuksek.duzey, 'düzey artar');
  assert.ok(dusuk.sure < yuksek.sure);
  assert.ok(dusuk.dolgunluk < yuksek.dolgunluk);
  assert.equal(yuksek.dolgunluk, 1);
});

test('adım deseni geçersiz z için güvenli (toprak)', () => {
  assert.equal(adimDeseni(NaN).tur, 'toprak');
  assert.equal(adimDeseni(undefined).tur, 'toprak');
  assert.equal(adimDeseni(-4).tur, 'toprak');
});

test('hız oranı 0..1 arasına kenetlenir, geri vites de sayılır', () => {
  assert.equal(hizOrani(0, 15), 0);
  assert.equal(hizOrani(7.5, 15), 0.5);
  assert.equal(hizOrani(-7.5, 15), 0.5);
  assert.equal(hizOrani(40, 15), 1);
  assert.equal(hizOrani(5, 0), 0);
  assert.equal(hizOrani(NaN, 15), 0);
});

test('hız arttıkça motor perdesi, düzeyi ve filtresi yükselir (her tür)', () => {
  for (const tur of Object.keys(MOTOR_PROFILLERI)) {
    const dur = motorDeseni(tur, { hizOrani: 0 });
    const gaz = motorDeseni(tur, { hizOrani: 1 });
    assert.ok(gaz.frekans > dur.frekans, `${tur}: perde`);
    assert.ok(gaz.kesim > dur.kesim, `${tur}: kesim`);
    assert.ok(gaz.duzey > dur.duzey, `${tur}: düzey`);
    assert.ok(gaz.altFrekans > 0 && Number.isFinite(gaz.lfoHz));
  }
});

test('traktör kalın, üfleyici tiz; balya ortada', () => {
  const f = (tur) => motorDeseni(tur, { hizOrani: 0.5 }).frekans;
  assert.ok(f('traktor') < f('balya'));
  assert.ok(f('balya') < f('ufleyici'));
  assert.equal(motorDeseni('traktor', {}).dalga1, 'sawtooth');
});

test('çalışma: düzey artar; balyada tambur ritmi, üfleyicide hava gürültüsü güçlenir', () => {
  for (const tur of Object.keys(MOTOR_PROFILLERI)) {
    const bos = motorDeseni(tur, { hizOrani: 0, calisiyor: false });
    const is = motorDeseni(tur, { hizOrani: 0, calisiyor: true });
    assert.ok(is.duzey > bos.duzey, `${tur}: düzey`);
    assert.ok(is.gurultuDuzey > bos.gurultuDuzey, `${tur}: gürültü`);
  }
  const balya = motorDeseni('balya', { calisiyor: true });
  assert.equal(balya.lfoHz, 5.5);
  assert.ok(balya.lfoDerinlik > motorDeseni('balya', {}).lfoDerinlik * 2);
  const uf = motorDeseni('ufleyici', { calisiyor: true });
  assert.ok(uf.gurultuDuzey > 3 * motorDeseni('ufleyici', {}).gurultuDuzey);
});

test('takılma motoru zorlar: perde düşer, vuruş hızlanır; değerler sınırlı', () => {
  const normal = motorDeseni('traktor', { hizOrani: 0.5 });
  const zor = motorDeseni('traktor', { hizOrani: 0.5, takili: true });
  assert.ok(zor.frekans < normal.frekans);
  assert.ok(zor.lfoHz > normal.lfoHz);
  assert.ok(zor.lfoDerinlik <= 0.7 && zor.lfoDerinlik >= 0);
});

test('bilinmeyen tür traktör profiline düşer; boş girdi çökmez', () => {
  assert.deepEqual(motorDeseni('?', { hizOrani: 0.3 }), motorDeseni('traktor', { hizOrani: 0.3 }));
  assert.ok(motorDeseni('traktor').frekans > 0);
});
