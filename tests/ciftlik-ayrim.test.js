/**
 * Mod ayrımı: çiftlik modülleri yüklenip bir çiftlik açılıp kapatıldıktan sonra normal
 * tarlanın 900 karelik izi, çiftlik hiç yüklenmeden alınan izle AYNI. Çiftlikte süre
 * başlamaz (ilk-hamle yok), iğne alınınca oyun bitmez, kayıt mod üstünden geri gelir.
 * Koruma satırları (iş K): istatistik, yarış, meydan, fiş (bulundu/pes/ilk-hamle hiç
 * yayılmaz), yarış onayı, ön hazırlık kancası, dönünce zorluk. Bilinen çekirdek hatası
 * `todo` ile koşar (CI'yı kırmaz, raporda: c-dogrulama.md).
 */
import fs from 'node:fs';
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
  assert.notEqual(d.tarla.igne, igne, 'aranan iğne sıradakine geçti (çiftlikte 5+ iğne)');
  assert.equal(d.tarla.igne.alindi, false);
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

/** Çiftlikte ve sonrasında bu olayların hiçbiri yayılmamalı: istatistik, yarış, meydan, fiş. */
const YASAK_OLAYLAR = ['ilk-hamle', 'bulundu', 'pes-edildi'];

/** n kare sürer; kareler 20 kare/sn'den hızlı değil, benzetim tikleri ilerler. */
function surdur(zaman0, n) {
  let z = zaman0;
  for (let i = 0; i < n; i++) {
    z += KARE_MS;
    adim(z);
  }
  return z;
}

test('çiftlik oturumunda bulundu/pes/ilk-hamle yayılmaz (istatistik, fiş, yarış, meydan)',
  async () => {
  const { esyaKodu } = await import('../js/kural/ciftlik/esya.js');
  const { komutEkle } = await import('../js/kural/ciftlik/benzetim.js');
  const yayilan = [];
  const birak = YASAK_OLAYLAR.map((ad) => dinle(ad, () => yayilan.push(ad)));
  modAc('ciftlik', { etiket: 'koruma-1' });
  const d = durumAl();
  komutEkle(d.ciftlik, { tur: 'kur', parca: 'sandik', x: 60, y: 40 });
  const igne = d.tarla.igne;
  Object.assign(d.karakter, { x: igne.x + 0.5, y: igne.y + 1.5, yon: -Math.PI / 2 });
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) d.tarla.h[(igne.y + j) * 240 + igne.x + i] = igne.z;
  }
  kullanAyarla(true, 'klavye');
  surdur(60000, 60);
  kullanAyarla(false, 'klavye');
  surdur(70000, 200);
  birak.forEach((b) => b());
  assert.equal(igne.alindi, true, 'iğne elle alındı (kazma gerçekten çalıştı)');
  assert.deepEqual(yayilan, [], 'çiftlik yarış/istatistik/fiş olayı yaymaz');
  assert.equal(d.bitti, false);
  assert.equal(d.baslangic, null);
  assert.equal(d.sonuc, null);
  assert.equal(d.rahat, true, 'çiftlik rahat: meydan hedefi (aktifMi) hiç açılmaz');
  assert.ok(d.ciftlik.envanter[esyaKodu('igne')] >= 1);
});

test('çiftlik oturumu (parçalar, kaydet/yükle) sonrası normal tarla izi AYNI', async () => {
  const { komutEkle } = await import('../js/kural/ciftlik/benzetim.js');
  const { dunyaKodla } = await import('../js/kural/ciftlik/sakla.js');
  const once = iz('ayrim-2');
  modAc('ciftlik', { etiket: 'iz-oturumu' });
  const d = durumAl();
  komutEkle(d.ciftlik, { tur: 'kur', parca: 'huni', x: 20, y: 31, yon: 0 });
  for (let i = 0; i < 5; i++) komutEkle(d.ciftlik, { tur: 'kur', parca: 'bant', x: 22 + i, y: 31 });
  komutEkle(d.ciftlik, { tur: 'kur', parca: 'sandik', x: 27, y: 31 });
  surdur(80000, 600);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(d.ciftlik, d.tarla, { etiket: d.etiket })));
  modAc('ciftlik', { kayit });
  surdur(90000, 300);
  const sonra = iz('ayrim-2');
  assert.equal(sonra.mod, 'tarla');
  assert.equal(sonra.h, once.h);
  assert.equal(sonra.kayit, once.kayit);
});

test('yarış sürerken çiftliğe girmek onay ister (koruma.js); menü düğmesi çağırır', async () => {
  const { korumaKaydet, yeniTarlaIzni } = await import('../js/ozellik/koruma.js');
  const sorular = [];
  let ayrildi = 0;
  globalThis.window = { confirm: (m) => { sorular.push(m); return sorular.length > 1; } };
  korumaKaydet({ suruyor: () => true, ayril: () => { ayrildi += 1; } });
  assert.equal(yeniTarlaIzni(), false, 'onay verilmezse çiftlik açılmaz');
  assert.equal(ayrildi, 0);
  assert.equal(yeniTarlaIzni(), true, 'onayda yarıştan çıkılır');
  assert.equal(ayrildi, 1);
  korumaKaydet({ suruyor: () => false, ayril: () => { ayrildi += 1; } });
  assert.equal(yeniTarlaIzni(), true, 'yarış yoksa soru yok');
  delete globalThis.window;
  const yol = new URL('../js/ozellik/ciftlik/menu-bag.js', import.meta.url);
  const kaynak = fs.readFileSync(yol, 'utf8');
  assert.match(kaynak, /else if \(yeniTarlaIzni\(\)\) ciftlikAc\(\)/, 'düğme izin ister');
});

test('açılış/kapanış olayları: oyun-basladi (mod ciftlik), mod-kapaniyor bir kez', async () => {
  const olaylar = [];
  const birak = [
    dinle('oyun-basladi', ({ durum }) => olaylar.push(`basladi:${durum.mod}`)),
    dinle('mod-kapaniyor', ({ durum }) => olaylar.push(`kapaniyor:${durum.mod}`)),
  ];
  modAc('ciftlik', { etiket: 'olay-1' });
  yeniOyun('olay-donus', 'normal');
  birak.forEach((b) => b());
  assert.deepEqual(olaylar, ['basladi:ciftlik', 'kapaniyor:ciftlik', 'basladi:tarla']);
});

test('çiftlikten normal moda dönünce seçilen zorluk korunur', { todo: 'ÇEKİRDEK HATASI '
  + '(c-dogrulama bulgu 2): çiftlik durumu zorluk "normal" kurar, yeniOyun zorluğu durumdan '
  + 'miras alır; zor/kolay seçen oyuncu çiftlikten dönünce "normal"e düşer' }, () => {
  yeniOyun('zorluk-1', 'zor');
  modAc('ciftlik', { etiket: 'zorluk-2' });
  yeniOyun('zorluk-3');
  assert.equal(durumAl().zorluk, 'zor');
});
