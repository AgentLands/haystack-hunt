/**
 * Çiftlik inşa geçmişi (geri al / yinele, 100 adım, bir sürükleme tek adım, reddedilen
 * komutun çifti düşer) ve `ayar` komutu (şema, geçersiz değer, söküm geri alınınca ayarın
 * geri gelmesi). Komutlar gerçek benzetimden geçer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gecmisKur, gecmisEkle, gecmisGeriAl, gecmisYinele, gecmisReddet, geriKomutlari,
  yapKomutlari, kurCifti, sokCifti, dondurCifti, GECMIS_SINIRI,
} from '../js/kural/ciftlik/insa/gecmis.js';
import { ayarOku, ayarlariAl, ayarGecerli } from '../js/kural/ciftlik/insa/ayar.js';
import { lYolu, yolDenetle, yolCiftleri } from '../js/kural/ciftlik/insa/hat-yolu.js';
import { parcaTanimla } from '../js/kural/ciftlik/parca-kayit.js';
import { komutEkle, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { parcaAt } from '../js/kural/ciftlik/izgara.js';
import { dunyaKodla, dunyaCoz } from '../js/kural/ciftlik/sakla.js';
import { dunya, kur } from './ciftlik-yardim.mjs';

// Yalnız bu testte: iki ayarlı deneme parçası (kod test aralığında).
parcaTanimla('deneme-catal', {
  kod: 64999, ad: 'Deneme çatalı', aile: 'tasima', boyut: [1, 1],
  ayarlar: [
    { ad: 'kip', tur: 'iki', etiket: 'Dağıtım', varsayilan: 'sirayla',
      secenekler: [{ deger: 'sirayla', metin: 'Sırayla' }, { deger: 'tasma', metin: 'Taşma' }] },
    { ad: 'renk', tur: 'renk', etiket: 'Renk', varsayilan: 0, secenekler: [0, 1, 2, 3, 4, 5] },
  ],
});

/** Komutları verir ve bir tik atar; olayları döndürür. */
function uygula(c, tarla, komutlar) {
  for (const k of komutlar) komutEkle(c, k);
  return tikAt(c, tarla);
}

const adimYap = (c, tarla, g, ad, ciftler) => {
  gecmisEkle(g, { ad, ciftler });
  return uygula(c, tarla, ciftler.flatMap((x) => x.yap));
};

test('bir sürükleme tek adım: geri al hepsini söker, yinele geri kurar', () => {
  const { c, tarla } = dunya();
  const g = gecmisKur();
  const yol = lYolu({ kx: 10, ky: 10 }, { kx: 13, ky: 12 }, 'x', 0);
  adimYap(c, tarla, g, '6 bant', yolCiftleri(c, 'bant', yolDenetle(c, tarla, 'bant', yol)));
  assert.equal(c.parcalar.size, 6);
  uygula(c, tarla, geriKomutlari(gecmisGeriAl(g)));
  assert.equal(c.parcalar.size, 0);
  uygula(c, tarla, yapKomutlari(gecmisYinele(g)));
  assert.equal(c.parcalar.size, 6);
  assert.equal(parcaAt(c, 13, 11).yon, 1);
});

test('100 adım: en eski düşer, yeni adım yinelemeyi boşaltır', () => {
  const { c, tarla } = dunya();
  const g = gecmisKur();
  for (let i = 0; i < GECMIS_SINIRI + 5; i++) {
    adimYap(c, tarla, g, 'bant', [kurCifti('bant', 2 + (i % 100), 2 + Math.floor(i / 100), 0)]);
  }
  assert.equal(g.geri.length, GECMIS_SINIRI);
  assert.equal(c.parcalar.size, GECMIS_SINIRI + 5);
  let n = 0;
  for (let a = gecmisGeriAl(g); a; a = gecmisGeriAl(g)) {
    uygula(c, tarla, geriKomutlari(a));
    n += 1;
  }
  assert.equal(n, GECMIS_SINIRI);
  assert.equal(c.parcalar.size, 5, 'yalnız 100 adım geri alınır');
  assert.equal(g.ileri.length, GECMIS_SINIRI);
  adimYap(c, tarla, g, 'sandık', [kurCifti('sandik', 40, 40, 0)]);
  assert.equal(g.ileri.length, 0);
  assert.equal(gecmisYinele(g), null);
});

test('reddedilen komutun çifti son adımdan düşer; boşalan adım silinir', () => {
  const { c, tarla } = dunya();
  const g = gecmisKur();
  kur(c, tarla, 'sandik', 21, 20);
  const olaylar = adimYap(c, tarla, g, '2 bant', [kurCifti('bant', 20, 20, 0),
    kurCifti('bant', 21, 20, 0)]);
  const red = olaylar.filter((o) => o.ad === 'komut-reddedildi');
  assert.equal(red.length, 1);
  assert.ok(gecmisReddet(g, red[0].veri.komut));
  assert.equal(g.geri[0].ciftler.length, 1);
  uygula(c, tarla, geriKomutlari(gecmisGeriAl(g)));
  assert.equal(c.parcalar.size, 1, 'sandık geri almada sökülmedi');
  assert.equal(parcaAt(c, 21, 20).tanim.anahtar, 'sandik');
  adimYap(c, tarla, g, 'bant', [kurCifti('bant', 21, 20, 0)]);
  assert.ok(gecmisReddet(g, { tur: 'kur', parca: 'bant', x: 21, y: 20, yon: 0, tik: 9 }));
  assert.equal(g.geri.length, 0);
});

test('döndürme ve söküm geri alınır; söküm ayarlarla geri gelir', () => {
  const { c, tarla } = dunya();
  const g = gecmisKur();
  const p = kur(c, tarla, 'deneme-catal', 30, 30, 0);
  assert.equal(ayarOku(p, 'kip'), 'sirayla');
  uygula(c, tarla, [{ tur: 'ayar', x: 30, y: 30, ad: 'kip', deger: 'tasma' },
    { tur: 'ayar', x: 30, y: 30, ad: 'renk', deger: 4 }]);
  assert.deepEqual(ayarlariAl(p), [['kip', 'tasma'], ['renk', 4]]);
  adimYap(c, tarla, g, 'döndür', [dondurCifti(p, 1)]);
  assert.equal(p.yon, 1);
  uygula(c, tarla, geriKomutlari(gecmisGeriAl(g)));
  assert.equal(p.yon, 0);
  adimYap(c, tarla, g, 'sök', [sokCifti(p)]);
  assert.equal(parcaAt(c, 30, 30), null);
  uygula(c, tarla, geriKomutlari(gecmisGeriAl(g)));
  const yeni = parcaAt(c, 30, 30);
  assert.equal(yeni.tanim.anahtar, 'deneme-catal');
  assert.deepEqual(ayarlariAl(yeni), [['kip', 'tasma'], ['renk', 4]]);
});

test('ayar komutu: geçersiz ad/değer reddedilir, ayar kayda girer', () => {
  const { c, tarla } = dunya();
  kur(c, tarla, 'deneme-catal', 30, 30, 0);
  assert.equal(ayarGecerli(parcaAt(c, 30, 30).tanim, 'kip', 'yok'), false);
  const olaylar = uygula(c, tarla, [
    { tur: 'ayar', x: 30, y: 30, ad: 'kip', deger: 'yok' },
    { tur: 'ayar', x: 30, y: 30, ad: 'hiz', deger: 1 },
    { tur: 'ayar', x: 31, y: 30, ad: 'kip', deger: 'tasma' },
    { tur: 'ayar', x: 30, y: 30, ad: 'kip', deger: 'tasma' },
  ]);
  const nedenler = olaylar.filter((o) => o.ad === 'komut-reddedildi').map((o) => o.veri.neden);
  assert.deepEqual(nedenler, ['ayar', 'ayar', 'bos']);
  assert.ok(olaylar.some((o) => o.ad === 'parca-ayarlandi' && o.veri.deger === 'tasma'));
  const geri = dunyaCoz(JSON.parse(JSON.stringify(dunyaKodla(c, tarla))), tarla).c;
  assert.equal(ayarOku(parcaAt(geri, 30, 30), 'kip'), 'tasma');
});
