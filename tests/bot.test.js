/**
 * Bot testleri (node --test): beynin hile yapmadığı, olası küme çıkarımının doğru olduğu ve
 * botun sabit tohumlarda iğneyi makul sürede bulduğu. DOM ve oyun.js kullanılmaz; benzetim
 * js/kural/ işlevleriyle kurulur (tests/yardim/bot-benzetim.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GENISLIK } from '../js/kural/boyut.js';
import { tarlaKur } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { dedektorOku, SEVIYELER } from '../js/kural/araclar.js';
import { adaylariBul, okumaOlustur, okumaYeriSec } from '../js/ozellik/bot-aday.js';
import { botOynat } from './yardim/bot-benzetim.js';

const BEYIN_DOSYALARI = ['bot-aday', 'bot-beyin', 'bot-plan', 'bot-serit', 'bot-surucu'];
const SABIT_TOHUMLAR = ['s0', 's1', 's2'];
const KARE_LIMITI = 3600; // 60 sn oyun süresi

test('bot beyni iğnenin konumunu (tarla.igne) okumaz', () => {
  for (const ad of BEYIN_DOSYALARI) {
    const kaynak = fs.readFileSync(new URL(`../js/ozellik/${ad}.js`, import.meta.url), 'utf8');
    const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\.igne\b|tarla\.igne|igneAcikMi|igneDerinligi/.test(kod), `${ad} iğneye bakıyor`);
  }
});

test('dedektör okumalarından çıkan olası küme gerçek iğneyi içerir ve daralır', () => {
  for (const etiket of ['s0', 's1', 's2', 's3', 's4']) {
    const tarla = tarlaKur(metindenTohum(etiket));
    const { x, y } = tarla.igne;
    const okumalar = [];
    let onceki = Infinity;
    for (let k = 0; k < 3; k++) {
      const liste = adaylariBul(tarla.h, okumalar);
      assert.ok(liste.includes(y * GENISLIK + x), `${etiket}: iğne kümede değil (k=${k})`);
      assert.ok(liste.length <= onceki, `${etiket}: küme büyüdü`);
      onceki = liste.length;
      const yer = okumaYeriSec(liste, SEVIYELER, { x: 120, y: 80 });
      okumalar.push(okumaOlustur(yer.x, yer.y, dedektorOku(tarla, yer.x, yer.y), SEVIYELER));
    }
    assert.ok(adaylariBul(tarla.h, okumalar).includes(y * GENISLIK + x), etiket);
  }
});

test('bot sabit tohumlarda iğneyi 60 sn oyun süresi içinde bulur', () => {
  for (const etiket of SABIT_TOHUMLAR) {
    const sonuc = botOynat(etiket, KARE_LIMITI);
    console.log(`  ${etiket}: bulundu=${sonuc.bulundu} ${sonuc.saniye.toFixed(1)} sn`);
    assert.ok(sonuc.bulundu, `${etiket}: ${KARE_LIMITI} karede bulunamadı`);
    assert.ok(sonuc.okumalar <= 3);
  }
});
