/** Zorluk, paslı çivi, mıknatıs ve puan kurallarının birim testleri (node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarlaKur } from '../js/kural/tarla.js';
import { GENISLIK } from '../js/kural/boyut.js';
import { igneDerinligi, igneHucreleri } from '../js/kural/igne.js';
import { dedektorOku, miknatisCek, MIKNATIS_CEKIS } from '../js/kural/araclar.js';
import {
  civiDerinligi, alinabilirCivi, CIVI_CEZA_MS, CIVI_IGNE_ARALIK,
} from '../js/kural/civi.js';
import { ZORLUKLAR, zorlukTohumu, puanHesapla } from '../js/kural/zorluk.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import {
  yeniOyun, durumAl, bas, birak, adim, aracSec, sonucOlustur, varsayilanZorlukAyarla,
} from '../js/oyun.js';
import { dinle } from '../js/olaylar.js';

function kaydet(ad) {
  const gelen = [];
  const birak = dinle(ad, (veri) => gelen.push(veri));
  return { gelen, birak };
}

/** Karakteri hücre p'ye taşır (fare tıklaması artık yalnız erişimde araç kullanır). */
function buraya(d, p) {
  d.karakter.x = p.x + 0.5;
  d.karakter.y = p.y + 0.5;
}

/** Nesnenin üstünü (r > 0 ise çevresiyle birlikte, yamaç kayması dolduramasın) açar. */
function ac(tarla, nesne, r = 0) {
  for (const i of igneHucreleri(nesne)) tarla.h[i] = Math.min(tarla.h[i], nesne.z);
  for (let y = nesne.y - r; y <= nesne.y + r; y++) {
    for (let x = nesne.x - r; x <= nesne.x + r; x++) {
      const i = y * GENISLIK + x;
      tarla.h[i] = Math.min(tarla.h[i], nesne.z);
    }
  }
}

test('aynı etiket + aynı zorluk aynı tarlayı, çivileri ve iğneyi üretir', () => {
  for (const z of Object.keys(ZORLUKLAR)) {
    const a = tarlaKur(zorlukTohumu('deneme', z), z);
    const b = tarlaKur(zorlukTohumu('deneme', z), z);
    assert.deepEqual(a.h, b.h);
    assert.deepEqual(a.igne, b.igne);
    assert.deepEqual(a.civiler, b.civiler);
    assert.equal(a.zorluk, z);
  }
  const kolay = tarlaKur(zorlukTohumu('deneme', 'kolay'), 'kolay');
  const zor = tarlaKur(zorlukTohumu('deneme', 'zor'), 'zor');
  assert.notDeepEqual(kolay.h, zor.h);
});

test('Normal zorluk eski tohumla aynı tarlayı üretir; bilinmeyen zorluk Normal sayılır', () => {
  const eski = tarlaKur(metindenTohum('deneme'));
  const normal = tarlaKur(zorlukTohumu('deneme', 'normal'), 'normal');
  assert.deepEqual(normal.h, eski.h);
  assert.deepEqual(normal.igne, eski.igne);
  assert.equal(zorlukTohumu('deneme', 'acayip'), metindenTohum('deneme'));
});

test('her zorlukta iğne gömülü, çivi sayısı doğru ve çiviler iğneden uzak', () => {
  for (const [z, ayar] of Object.entries(ZORLUKLAR)) {
    for (const etiket of ['a', 'b', 'c', '2026-10-31']) {
      const t = tarlaKur(zorlukTohumu(etiket, z), z);
      assert.ok(igneDerinligi(t) > 0, `${z} ${etiket}`);
      assert.equal(t.civiler.length, ayar.civi, `${z} ${etiket}`);
      for (const c of t.civiler) {
        assert.ok(Math.hypot(c.x - t.igne.x, c.y - t.igne.y) >= CIVI_IGNE_ARALIK);
        assert.ok(civiDerinligi(t, c) > 0);
      }
    }
  }
});

test('zorluk hakları ve parıltı ayarlarını belirler; zorluk yeni oyunda sürer', () => {
  yeniOyun('z1', 'zor');
  let d = durumAl();
  assert.equal(d.zorluk, 'zor');
  assert.equal(d.dedektor, 2);
  assert.equal(d.miknatis, 1);
  assert.equal(d.pariltiAralik, ZORLUKLAR.zor.pariltiAralik);
  yeniOyun('z2');
  assert.equal(durumAl().zorluk, 'zor');
  yeniOyun('z3', 'kolay');
  d = durumAl();
  assert.equal(d.dedektor, 5);
  assert.equal(d.miknatis, 2);
  yeniOyun('z4', 'saçma');
  assert.equal(durumAl().zorluk, 'normal');
});

test('varsayılan zorluk ayarlanabilir', () => {
  varsayilanZorlukAyarla('kolay');
  yeniOyun('v1', 'normal');
  assert.equal(durumAl().zorluk, 'normal');
  varsayilanZorlukAyarla(null);
});

test('açıktaki çivi elle alınınca +10 sn ceza bir kez yazılır', () => {
  yeniOyun('civi', 'normal');
  const d = durumAl();
  const civi = d.tarla.civiler[0];
  assert.equal(alinabilirCivi(d.tarla, civi.x, civi.y), null);
  ac(d.tarla, civi);
  assert.equal(alinabilirCivi(d.tarla, civi.x, civi.y), civi);
  const olay = kaydet('civi-alindi');
  aracSec('el');
  buraya(d, { x: civi.x + 2, y: civi.y });
  assert.equal(bas({ x: civi.x, y: civi.y }, 1000), true);
  adim(1000);
  adim(1016);
  birak();
  olay.birak();
  assert.equal(civi.alindi, true);
  assert.deepEqual(olay.gelen, [{ x: civi.x, y: civi.y, ceza: CIVI_CEZA_MS }]);
  assert.equal(d.ceza, 10000);
  assert.equal(d.baslangic, 1000 - 10000);
  assert.equal(d.bitti, false);
  const sonuc = sonucOlustur(5000);
  assert.equal(sonuc.sureMs, 14000);
  assert.equal(sonuc.cezaMs, 10000);
});

test('dedektör çiviyi değil yalnız iğneyi algılar', () => {
  const t = tarlaKur(zorlukTohumu('dedektor', 'zor'), 'zor');
  for (const c of t.civiler) assert.notEqual(dedektorOku(t, c.x, c.y).ad, 'Yanıyor!');
});

test('çivi yüzeye yakınsa parıltı zamanında parlar', () => {
  yeniOyun('parla', 'normal');
  const d = durumAl();
  const civi = d.tarla.civiler[1];
  ac(d.tarla, civi, 8);
  const olay = kaydet('civi-parladi');
  aracSec('tirmik');
  buraya(d, { x: 2, y: 2 });
  bas({ x: 0, y: 0 }, 0);
  birak();
  adim(d.pariltiAralik + 1);
  olay.birak();
  assert.ok(olay.gelen.some((o) => o.x === civi.x && o.y === civi.y));
  assert.ok(d.civiPariltilar.length >= 1);
});

test('mıknatıs menzildeki iğneyi 15 kat çeker, en çok yüzeye kadar', () => {
  const t = tarlaKur(zorlukTohumu('m', 'zor'), 'zor');
  const once = igneDerinligi(t);
  assert.ok(once > MIKNATIS_CEKIS);
  assert.equal(miknatisCek(t, t.igne.x + 6, t.igne.y + 6), true);
  assert.equal(igneDerinligi(t), once - MIKNATIS_CEKIS);
  const z = t.igne.z;
  assert.equal(miknatisCek(t, t.igne.x + 11, t.igne.y), false);
  assert.equal(t.igne.z, z);
  const yuzey = Math.min(...igneHucreleri(t.igne).map((i) => t.h[i]));
  t.igne.z = yuzey - 4;
  assert.equal(miknatisCek(t, t.igne.x, t.igne.y), true);
  assert.equal(t.igne.z, yuzey);
  assert.equal(igneDerinligi(t), 0);
});

test('mıknatıs oyunda hak harcar, çekince parıltı tetikler, boşa da gidebilir', () => {
  yeniOyun('mk', 'normal');
  const d = durumAl();
  const { igne } = d.tarla;
  const olay = kaydet('miknatis');
  const parilti = kaydet('parilti');
  const bos = kaydet('miknatis-bos');
  aracSec('miknatis');
  assert.equal(d.aracYaricap, 10);
  buraya(d, { x: igne.x + 3, y: igne.y });
  bas({ x: igne.x + 3, y: igne.y }, 100);
  birak();
  assert.deepEqual(olay.gelen, [{ x: igne.x + 3, y: igne.y, cekti: true, kalan: 0 }]);
  assert.equal(parilti.gelen.length, 1);
  assert.ok(d.parilti && d.parilti.bitis > 100);
  bas({ x: igne.x + 4, y: igne.y }, 200);
  birak();
  assert.equal(bos.gelen.length, 1);

  yeniOyun('mk', 'kolay');
  const k = durumAl();
  const uzakX = k.tarla.igne.x > 120 ? 5 : 230;
  const zOnce = k.tarla.igne.z;
  buraya(k, { x: uzakX, y: k.tarla.igne.y });
  bas({ x: uzakX, y: k.tarla.igne.y }, 100);
  birak();
  for (const o of [olay, parilti, bos]) o.birak();
  assert.equal(olay.gelen[1].cekti, false);
  assert.equal(k.miknatis, 1);
  assert.equal(k.tarla.igne.z, zOnce);
  assert.equal(parilti.gelen.length, 1);
  assert.equal(k.parilti, null);
});

test('puan: çarpan × (1000 − 2·sn − saman/100 − 50·hak), en az 100 × çarpan', () => {
  const s = { sureMs: 60500, kaldirilan: 5050, kullanilanHak: 2 };
  assert.equal(puanHesapla(s, 'kolay'), 1000 - 120 - 50 - 100);
  assert.equal(puanHesapla(s, 'normal'), 2 * 730);
  assert.equal(puanHesapla(s, 'zor'), 3 * 730);
  assert.equal(puanHesapla({ sureMs: 3600000, kaldirilan: 0, kullanilanHak: 0 }, 'zor'), 300);
});

test('sonuç nesnesi zorluk, puan ve mıknatıs kullanımını taşır', () => {
  yeniOyun('sonuc', 'zor');
  const d = durumAl();
  aracSec('dedektor');
  buraya(d, { x: 10, y: 10 });
  bas({ x: 10, y: 10 }, 0);
  birak();
  aracSec('miknatis');
  bas({ x: 10, y: 10 }, 10);
  birak();
  d.tarla.kaldirilan = 2000;
  const s = sonucOlustur(30000);
  assert.equal(s.zorluk, 'zor');
  assert.equal(s.dedektorKullanilan, 1);
  assert.equal(s.miknatisKullanilan, 1);
  assert.equal(s.miknatisHakki, 1);
  assert.equal(s.puan, 3 * (1000 - 60 - 20 - 100));
});
