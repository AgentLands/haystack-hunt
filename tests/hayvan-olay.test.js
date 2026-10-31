/** Hayvan özelliğinin olay bağlantısı: oyun olaylarıyla ürkme ve 'hayvan-kacti' yayını. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { yeniOyun, durumAl, adim } from '../js/oyun.js';
import { dinle, yay } from '../js/olaylar.js';
import { hayvanlariAl } from '../js/ozellik/hayvan/hayvan.js';

function kacanlar() {
  const liste = [];
  dinle('hayvan-kacti', (v) => liste.push(v));
  return liste;
}
const kaciyor = kacanlar();

test('oyun başlayınca 4-8 saklı hayvan kurulur; aynı tohum aynı hayvanlar', () => {
  yeniOyun('olay-1');
  const a = JSON.stringify(hayvanlariAl());
  const n = hayvanlariAl().length;
  assert.ok(n >= 4 && n <= 8);
  yeniOyun('olay-1');
  assert.equal(JSON.stringify(hayvanlariAl()), a);
});

test('kazı olayı yakındaki hayvanı ürkütür ve hayvan-kacti yayar (hücre → dünya)', () => {
  yeniOyun('olay-2');
  const f = hayvanlariAl().find((h) => h.tur === 'fare');
  kaciyor.length = 0;
  yay('kazildi', { x: f.x + 30, y: f.y, miktar: 1 });
  assert.equal(kaciyor.length, 0, 'uzaktaki kazı ürkütmez');
  yay('kazildi', { x: f.x - 1.5 - 0.5, y: f.y - 0.5, miktar: 1 });
  assert.equal(kaciyor.length, 1);
  assert.equal(kaciyor[0].tur, 'fare');
  assert.ok(Math.abs(kaciyor[0].x - f.ox) < 1e-9 && Math.abs(kaciyor[0].y - f.oy) < 1e-9);
  assert.equal(f.durum, 'sasirma');
});

test('adımlar hayvanları ilerletir; hayvanlar tarlayı ve oyun sonucunu değiştirmez', () => {
  yeniOyun('olay-3');
  const d = durumAl();
  const h0 = Uint16Array.from(d.tarla.h);
  const f = hayvanlariAl().find((h) => h.tur === 'fare');
  yay('kazildi', { x: f.x - 2, y: f.y - 0.5, miktar: 1 });
  for (let i = 0; i < 90; i++) adim(1000 + i * 16);
  assert.ok(f.durum === 'kacis' || f.durum === 'dalis' || f.durum === 'gizli');
  assert.deepEqual(d.tarla.h, h0, 'saman değişmedi');
  assert.equal(d.tarla.kaldirilan, 0);
});

test('makineye binmek uyuyan kediyi uyandırır', () => {
  for (let i = 0; i < 40; i++) {
    yeniOyun(`kedi-olay-${i}`);
    const kedi = hayvanlariAl().find((h) => h.tur === 'kedi');
    if (!kedi) continue;
    kaciyor.length = 0;
    yay('makine-bin', { makine: durumAl().makineler[0] });
    assert.equal(kedi.durum, 'esneme');
    assert.equal(kaciyor.at(-1).tur, 'kedi');
    return;
  }
  assert.fail('kedili tarla bulunamadı');
});
