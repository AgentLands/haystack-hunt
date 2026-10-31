/** Yakıt bitince makinedeki iğne mahsur kalmasın: makine içindekileri dışarı bırakır. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarlaKur, toplamSaman } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { igneAcikMi, igneKonumu, tarlada } from '../js/kural/igne.js';
import '../js/kural/makineler/hepsi.js';
import { makineTanimi } from '../js/kural/makineler/kayit.js';
import { yeniMakine } from '../js/kural/makineler/garaj.js';

function kur(tur) {
  const t = tarlaKur(metindenTohum('yakit'));
  t.h.fill(5);
  const m = yeniMakine(tur, 1, 100.5, 80.5, 0, 0);
  t.igne.kepcede = true;
  m.icerik.igne = true;
  m.icerik.saman = 300;
  return { t, m, tanim: makineTanimi(tur) };
}

test('traktör: yakıt bitince kepçedeki iğne ve saman önüne dökülür', () => {
  const { t, m, tanim } = kur('traktor');
  const once = toplamSaman(t);
  const olaylar = tanim.yakitBitince(t, m);
  assert.equal(olaylar[0][0], 'kepce-bosaltildi');
  assert.equal(toplamSaman(t), once + 300, 'saman tarlaya döner, kaybolmaz');
  assert.ok(tarlada(t.igne));
  assert.ok(igneAcikMi(t), 'iğne dökülen samanın üstünde açıkta');
  assert.deepEqual(m.icerik, { saman: 0, igne: false, civiler: [] });
});

test('balya makinesi: yakıt bitince hazne yarım balya olarak bırakılır', () => {
  const { t, m, tanim } = kur('balya');
  const olaylar = tanim.yakitBitince(t, m);
  assert.equal(olaylar[0][0], 'balya-birakildi');
  assert.equal(t.balyalar.length, 1);
  const b = t.balyalar[0];
  assert.equal(b.igne, true);
  const k = igneKonumu(t);
  assert.ok(Math.hypot(k.x - b.x, k.y - b.y) < 2, 'dedektör iğneyi balyada bulur');
  assert.equal(m.icerik.igne, false);
});

test('boş makine yakıt bitince hiçbir şey bırakmaz', () => {
  const { t, m, tanim } = kur('traktor');
  Object.assign(m.icerik, { saman: 0, igne: false });
  t.igne.kepcede = false;
  assert.deepEqual(tanim.yakitBitince(t, m), []);
});
