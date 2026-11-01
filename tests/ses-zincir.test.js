/**
 * Ses çıkış zincirinin testi (sahte AudioContext): kaynak → kategori → ana kazanç → sıkıştırıcı
 * → limiter → yumuşak kırpıcı → hoparlör; ses düzeyi/sessiz ana kazancı sürer; kodda geçen her
 * `kat:` değeri tanımlı bir kategoridir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANA_KAZANC, KATEGORI_DB, kategoriKazanci } from '../js/ozellik/ses-seviye.js';

const param = (v = 0) => ({ value: v, hedefler: [], setTargetAtTime(d) { this.hedefler.push(d); },
  setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {},
  cancelScheduledValues() {} });

class Dugum {
  constructor(tur) {
    this.tur = tur;
    this.cikis = [];
    this.gain = param(1);
    this.frequency = param(440);
    this.Q = param(1);
    for (const ad of ['threshold', 'knee', 'ratio', 'attack', 'release']) this[ad] = param();
  }
  connect(hedef) { this.cikis.push(hedef); return hedef; }
  start() {}
  stop() {}
}

class SahteBaglam {
  constructor() {
    this.dugumler = [];
    this.destination = new Dugum('hedef');
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.state = 'running';
    SahteBaglam.son = this;
  }
  yeni(tur) { const d = new Dugum(tur); this.dugumler.push(d); return d; }
  createGain() { return this.yeni('kazanc'); }
  createDynamicsCompressor() { return this.yeni('sikistirici'); }
  createWaveShaper() { return this.yeni('kirpici'); }
  createOscillator() { return this.yeni('osc'); }
  createBiquadFilter() { return this.yeni('filtre'); }
  createBufferSource() { return this.yeni('kaynak'); }
  createBuffer(k, n) { return { getChannelData: () => new Float32Array(n) }; }
  resume() { return Promise.resolve(); }
}

globalThis.window = { AudioContext: SahteBaglam };
const motor = await import('../js/ozellik/ses-motor.js');

test('zincir sırası: kategoriler → ana kazanç → sıkıştırıcı → limiter → kırpıcı → hoparlör', () => {
  assert.equal(motor.uyandir(), true);
  const c = SahteBaglam.son;
  const kirpici = c.dugumler.find((d) => d.tur === 'kirpici');
  assert.deepEqual(kirpici.cikis, [c.destination]);
  assert.ok(kirpici.curve && kirpici.curve.length >= 512, 'kırpıcı eğrisi kuruldu');
  const [sikistirici, limiter] = c.dugumler.filter((d) => d.tur === 'sikistirici');
  assert.deepEqual(sikistirici.cikis, [limiter]);
  assert.deepEqual(limiter.cikis, [kirpici]);
  assert.ok(limiter.threshold.value > sikistirici.threshold.value, 'limiter daha yüksekte tutar');
  assert.ok(limiter.ratio.value > sikistirici.ratio.value);
  const ana = c.dugumler.find((d) => d.tur === 'kazanc' && d.cikis.includes(sikistirici));
  assert.ok(ana, 'ana kazanç sıkıştırıcıya bağlı');
  assert.ok(Math.abs(ana.gain.value - ANA_KAZANC) < 1e-9);
  const katlar = c.dugumler.filter((d) => d.tur === 'kazanc' && d.cikis.includes(ana));
  assert.equal(katlar.length, Object.keys(KATEGORI_DB).length);
  const beklenen = Object.keys(KATEGORI_DB).map((k) => kategoriKazanci(k)).sort();
  assert.deepEqual(katlar.map((d) => d.gain.value).sort(), beklenen);
});

test('ses düzeyi ve sessiz ana kazancı sürer', () => {
  const c = SahteBaglam.son;
  const ana = c.dugumler.find((d) => d.tur === 'kazanc'
    && d.cikis.some((h) => h.tur === 'sikistirici'));
  motor.duzeyAyarla(50);
  assert.ok(Math.abs(ana.gain.hedefler.at(-1) - ANA_KAZANC * 0.25) < 1e-9);
  motor.sessizAyarla(true);
  assert.equal(ana.gain.hedefler.at(-1), 0);
  motor.sessizAyarla(false);
  motor.duzeyAyarla(100);
  assert.ok(Math.abs(ana.gain.hedefler.at(-1) - ANA_KAZANC) < 1e-9);
});

test('nota/hışırtı kategori düğümüne bağlanır; bilinmeyen kategori hata verir', () => {
  const c = SahteBaglam.son;
  const once = c.dugumler.length;
  motor.nota({ frekans: 440, sure: 0.1, duzey: 0.1, kat: 'ortam' });
  const kazanc = c.dugumler.slice(once).find((d) => d.tur === 'kazanc');
  const kat = kazanc.cikis[0];
  assert.ok(kat && Math.abs(kat.gain.value - kategoriKazanci('ortam')) < 1e-9);
  const o = { frekans: 440, sure: 0.1, duzey: 0.1, kat: 'yok' };
  assert.throws(() => motor.nota(o), /Bilinmeyen/);
  assert.throws(() => motor.hisirti({ sure: 0.1, duzey: 0.1, f0: 1000, kat: 'yok' }), /Bilinmeyen/);
  assert.ok(motor.baglam('motor'), 'sürekli sesler motor kategorisini alır');
});

test('kodda kullanılan her kat: değeri tanımlı bir kategoridir', () => {
  const kok = path.join(path.dirname(fileURLToPath(import.meta.url)), '../js/ozellik');
  const bul = (klasor) => fs.readdirSync(klasor, { withFileTypes: true }).flatMap((d) => {
    const yol = path.join(klasor, d.name);
    if (d.isDirectory()) return bul(yol);
    return d.name.endsWith('.js') ? [yol] : [];
  });
  const kullanilan = new Set();
  for (const dosya of bul(kok)) {
    for (const [, ad] of fs.readFileSync(dosya, 'utf8').matchAll(/\bkat: '(\w+)'/g)) {
      kullanilan.add(ad);
    }
  }
  assert.ok(kullanilan.size >= 4, [...kullanilan].join());
  for (const ad of kullanilan) {
    assert.ok(Object.hasOwn(KATEGORI_DB, ad), `tanımsız kategori: ${ad}`);
  }
});
