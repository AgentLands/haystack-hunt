/** Kod denetim betiğinin (araclar/denetim.mjs) testleri: geçici klasörde kural ihlalleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { denetle, dosyaDenetle, bicimle } from '../araclar/denetim.mjs';

const BELGE = '/** belge */\n';

function geciciAgac(dosyalar, islev) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'denetim-'));
  try {
    for (const [goreli, metin] of Object.entries(dosyalar)) {
      const yol = path.join(kok, goreli);
      fs.mkdirSync(path.dirname(yol), { recursive: true });
      fs.writeFileSync(yol, metin);
    }
    return islev(kok);
  } finally {
    fs.rmSync(kok, { recursive: true, force: true });
  }
}

test('temiz dosyada bulgu yok', () => {
  assert.deepEqual(dosyaDenetle('js/a.js', BELGE + 'const a = 1;\n'), []);
});

test('belge yorumu olmayan modül bulunur; kaydırılmış belge yorumu da', () => {
  const yok = dosyaDenetle('js/a.js', 'const a = 1;\n');
  assert.equal(yok.length, 1);
  assert.equal(yok[0].satir, 1);
  assert.match(yok[0].aciklama, /belge yorumu/);
  assert.equal(dosyaDenetle('js/a.js', '// not\n' + BELGE).length, 1);
  assert.deepEqual(dosyaDenetle('js/a.js', '#!/usr/bin/env node\n' + BELGE), []);
});

test('satır uzunluğu karakter (kod noktası) sayısıyla ölçülür', () => {
  assert.deepEqual(dosyaDenetle('js/a.js', BELGE + 'ş'.repeat(100) + '\n'), []);
  const bulgular = dosyaDenetle('js/a.js', BELGE + 'x\n' + 'ş'.repeat(101) + '\n');
  assert.equal(bulgular.length, 1);
  assert.equal(bulgular[0].satir, 3);
  assert.match(bulgular[0].aciklama, /101 karakter/);
});

test('kod dosyası 300 satıra kadar serbest, 301 satırda bulgu', () => {
  const satirlar = (n) => BELGE + Array.from({ length: n - 1 }, () => 'a;').join('\n') + '\n';
  assert.deepEqual(dosyaDenetle('js/a.js', satirlar(300)), []);
  const bulgu = dosyaDenetle('js/a.js', satirlar(301));
  assert.equal(bulgu.length, 1);
  assert.match(bulgu[0].aciklama, /301 satır \(tavan 300\)/);
});

test('test dosyası 400 satıra kadar serbest, 401 satırda bulgu', () => {
  const satirlar = (n) => BELGE + Array.from({ length: n - 1 }, () => 'a;').join('\n') + '\n';
  assert.deepEqual(dosyaDenetle('tests/x.test.js', satirlar(400)), []);
  const bulgu = dosyaDenetle('tests/x.test.js', satirlar(401));
  assert.equal(bulgu.length, 1);
  assert.match(bulgu[0].aciklama, /test dosyası 401/);
});

test('js/kural/ içinde Math.random yasak, başka klasörde serbest', () => {
  const metin = BELGE + 'const x = Math.random();\n';
  const bulgu = dosyaDenetle('js/kural/a.js', metin);
  assert.equal(bulgu.length, 1);
  assert.equal(bulgu[0].satir, 2);
  assert.deepEqual(dosyaDenetle('js/ozellik/a.js', metin), []);
});

test('boş catch bloğu yakalanır, dolu olan yakalanmaz', () => {
  const bos = BELGE + 'try { f(); } catch {}\n';
  assert.equal(dosyaDenetle('js/a.js', bos).length, 1);
  assert.equal(dosyaDenetle('js/a.js', BELGE + 'try { f(); } catch (e) {}\n').length, 1);
  const yorumlu = BELGE + 'try {\n  f();\n} catch (e) {\n  // yok\n}\n';
  assert.equal(dosyaDenetle('js/a.js', yorumlu).length, 1);
  const dolu = BELGE + 'try { f(); } catch (e) { console.error(e); }\n';
  assert.deepEqual(dosyaDenetle('js/a.js', dolu), []);
  assert.deepEqual(dosyaDenetle('js/a.js', BELGE + "const s = 'catch {}';\n"), []);
});

test('denetle proje ağacını tarar; node_modules ve desteklenmeyen uzantılar atlanır', () => {
  const bulgular = geciciAgac({
    'js/iyi.js': BELGE + 'export const a = 1;\n',
    'js/kotu.js': 'export const b = 2;\n',
    'js/kural/rnd.mjs': BELGE + 'export const c = Math.random();\n',
    'js/node_modules/x.js': 'bozuk\n',
    'js/notlar.txt': 'x'.repeat(200) + '\n',
    'tests/a.test.js': BELGE + 'import x from "y";\n',
    'sunucu/s.cjs': BELGE + 'try {} catch {}\n',
    'kok.js': 'bozuk\n',
  }, denetle);
  const dosyalar = [...new Set(bulgular.map((b) => b.dosya))];
  assert.deepEqual(dosyalar, ['js/kotu.js', 'js/kural/rnd.mjs', 'sunucu/s.cjs']);
  assert.equal(bulgular.find((b) => b.dosya === 'js/kural/rnd.mjs').satir, 2);
});

test('sunucu klasörü yoksa denetim hata vermeden çalışır', () => {
  const bulgular = geciciAgac({ 'js/a.js': BELGE + 'a;\n' }, denetle);
  assert.deepEqual(bulgular, []);
});

test('bulgu "dosya:satır: açıklama" biçiminde yazılır', () => {
  assert.equal(bicimle({ dosya: 'js/a.js', satir: 3, aciklama: 'x' }), 'js/a.js:3: x');
});
