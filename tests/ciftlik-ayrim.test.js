/**
 * Mod ayrımı: çiftlik modülleri yüklenip bir çiftlik açılıp kapatıldıktan sonra normal
 * tarlanın 900 karelik izi, çiftlik hiç yüklenmeden alınan izle AYNI. Çiftlikte süre
 * başlamaz (ilk-hamle yok), iğne alınınca oyun bitmez, kayıt mod üstünden geri gelir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yeniOyun, durumAl, adim, modAc } from '../js/oyun.js';
import { kontrol, yonAyarla, kullanAyarla } from '../js/kontrol.js';
import { dinle } from '../js/olaylar.js';
import { ozetKat, OZET_BASI } from '../js/kural/ciftlik/olcu.js';

const KARE_MS = 1000 / 60;

/** 900 kare: yürü, kaz, dön; her 100 karede h özeti + karakter + sayaçlar. */
function iz(etiket) {
  yeniOyun(etiket, 'normal');
  const kayit = [];
  let h = OZET_BASI;
  for (let i = 0; i < 900; i++) {
    const evre = Math.floor(i / 150) % 4;
    yonAyarla([1, 0, -1, 0][evre], [0, 1, 0, -1][evre], 'klavye');
    kullanAyarla(i % 40 < 25, 'klavye');
    adim(1000 + i * KARE_MS);
    if (i % 100 === 99) {
      const d = durumAl();
      h = ozetKat(h, d.tarla.h);
      kayit.push([d.karakter.x, d.karakter.y, d.tarla.kaldirilan, d.baslangic, d.bitti]);
    }
  }
  yonAyarla(0, 0, 'klavye');
  kullanAyarla(false, 'klavye');
  return { h, kayit: JSON.stringify(kayit), mod: durumAl().mod };
}

test('normal tarla izi çiftlik açılıp kapatıldıktan sonra değişmez', async () => {
  const saf = iz('ayrim-1');
  assert.equal(saf.mod, 'tarla');
  await import('../js/oyun-ciftlik.js');
  const olaylar = [];
  const birak = [dinle('ilk-hamle', () => olaylar.push('ilk-hamle'))];
  modAc('ciftlik', { etiket: 'ayrim-ciftlik' });
  const d = durumAl();
  assert.equal(d.mod, 'ciftlik');
  for (let i = 0; i < 300; i++) {
    yonAyarla(1, 0, 'klavye');
    kullanAyarla(true, 'klavye');
    adim(5000 + i * KARE_MS);
  }
  kullanAyarla(false, 'klavye');
  assert.equal(d.baslangic, null, 'çiftlikte süre başlamaz');
  assert.ok(d.ciftlik.tik >= 95, `5 sn ≈ 100 tik: ${d.ciftlik.tik}`);
  birak[0]();
  birak.push(dinle('mod-kapaniyor', () => olaylar.push('mod-kapaniyor')));
  const sonra = iz('ayrim-1');
  birak[1]();
  assert.deepEqual(olaylar, ['mod-kapaniyor'], 'çiftlikte ilk-hamle yok; çıkarken kapanış');
  assert.equal(sonra.mod, 'tarla');
  assert.equal(sonra.h, saf.h);
  assert.equal(sonra.kayit, saf.kayit);
  assert.equal(kontrol.hedef, null);
});

test('çiftlikte elle alınan iğne envantere girer, oyun bitmez, aranan iğne değişir', async () => {
  const { IGNE_YOK } = await import('../js/oyun-ciftlik.js');
  const { esyaKodu } = await import('../js/kural/ciftlik/esya.js');
  modAc('ciftlik', { etiket: 'igne-testi' });
  const d = durumAl();
  const igne = d.tarla.igne;
  assert.equal(igne, d.ciftlik.gomulu[0], 'aranan iğne gömülü listesindeki nesne');
  const k = d.karakter;
  Object.assign(k, { x: igne.x + 0.5, y: igne.y + 1.5, yon: -Math.PI / 2 });
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) d.tarla.h[(igne.y + j) * 240 + igne.x + i] = igne.z;
  }
  const yayilan = [];
  const birak = dinle('ciftlik-igne', (v) => yayilan.push(v.kaynak));
  kullanAyarla(true, 'klavye');
  for (let i = 0; i < 30 && !igne.alindi; i++) adim(20000 + i * KARE_MS);
  kullanAyarla(false, 'klavye');
  birak();
  assert.equal(igne.alindi, true);
  assert.deepEqual(yayilan, ['el']);
  assert.equal(d.ciftlik.envanter[esyaKodu('igne')], 1);
  assert.equal(d.tarla.igne, IGNE_YOK);
  assert.equal(d.bitti, false);
});

test('çiftlik kaydı mod üstünden geri gelir (parçalar, tik, gömülü bağları)', async () => {
  const { dunyaKodla } = await import('../js/kural/ciftlik/sakla.js');
  const { komutEkle } = await import('../js/kural/ciftlik/benzetim.js');
  modAc('ciftlik', { etiket: 'kayit-testi' });
  const d = durumAl();
  komutEkle(d.ciftlik, { tur: 'kur', parca: 'sandik', x: 60, y: 40 });
  for (let i = 0; i < 20; i++) adim(30000 + i * KARE_MS);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(d.ciftlik, d.tarla, { etiket: d.etiket })));
  modAc('ciftlik', { kayit });
  const y = durumAl();
  assert.notEqual(y, d);
  assert.equal(y.ciftlik.tik, d.ciftlik.tik);
  assert.equal(y.ciftlik.parcalar.size, 1);
  assert.deepEqual(y.tarla.h, d.tarla.h);
  assert.equal(y.tarla.civiler.length, d.tarla.civiler.length);
  assert.ok(y.tarla.civiler.every((cv) => y.ciftlik.gomulu.includes(cv)));
  assert.equal(y.buluntular.length, d.buluntular.length);
  assert.equal(y.tarla.igne, y.ciftlik.gomulu[0]);
});
