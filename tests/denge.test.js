/**
 * Denge kurallarının birim testleri: zorluk sayıları, kulak (kural/sinyal.js ve ses deseni),
 * parıltı türü ve ekran kenarı işareti (kural/parilti.js), boşta iş yakıtı ve garaj ikmali,
 * iğneli balyanın parlaması.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarlaKur } from '../js/kural/tarla.js';
import { metindenTohum } from '../js/kural/rastgele.js';
import { igneDerinligi, igneHucreleri } from '../js/kural/igne.js';
import { ZORLUKLAR } from '../js/kural/zorluk.js';
import {
  kulakBasamagi, kulakUzakligi, basamakUzakliktan, basamakBandi, KULAK_MENZIL,
  KULAK_BASAMAKLARI, KULAK_DERINLIK_BOLEN,
} from '../js/kural/sinyal.js';
import { kulakDeseni, tikZamani } from '../js/ozellik/kulak-desen.js';
import { pariltiTuru, kenarIsareti } from '../js/kural/parilti.js';
import '../js/kural/makineler/hepsi.js';
import { makineTanimi } from '../js/kural/makineler/kayit.js';
import { isYakiti, BOSTA_IS_ORANI } from '../js/kural/makineler/surus.js';
import {
  ikmalKontrol, yeniMakine, IKMAL_UZAKLASMA, IKMAL_HAKKI,
} from '../js/kural/makineler/garaj.js';
import { KEPCE_KAPASITE } from '../js/kural/makineler/traktor.js';

/** Karakteri makinenin yanına (binme mesafesine) koyar. */
function yaninaKoy(k, m) {
  const r = makineTanimi(m.tur).yaricap + 1;
  Object.assign(k, { x: m.x + Math.cos(m.yon + Math.PI / 2) * r,
    y: m.y + Math.sin(m.yon + Math.PI / 2) * r });
}

/** İğnenin üstünü açar (derinlik 0). */
function igneyiAc(t) {
  for (const i of igneHucreleri(t.igne)) t.h[i] = Math.min(t.h[i], t.igne.z);
}

test('zorluk sayıları: dedektör 5/4/3, yakıt 1/0.9/0.7, parıltı derinliği 30/20/14', () => {
  const { kolay, normal, zor } = ZORLUKLAR;
  assert.deepEqual([kolay.dedektor, normal.dedektor, zor.dedektor], [5, 4, 3]);
  assert.deepEqual([kolay.yakit, normal.yakit, zor.yakit], [1, 0.9, 0.7]);
  assert.deepEqual([kolay.pariltiDerinlik, normal.pariltiDerinlik, zor.pariltiDerinlik],
    [30, 20, 14]);
  assert.equal(KEPCE_KAPASITE, 10000);
  assert.equal(makineTanimi('traktor').yakitTuketim, 1 / 260);
});

test('kulak: üç kaba basamak, menzil dışı ve geçersiz uzaklık sessiz', () => {
  assert.equal(basamakUzakliktan(0), 3);
  assert.equal(basamakUzakliktan(4), 3);
  assert.equal(basamakUzakliktan(4.01), 2);
  assert.equal(basamakUzakliktan(8), 2);
  assert.equal(basamakUzakliktan(KULAK_MENZIL), 1);
  assert.equal(basamakUzakliktan(KULAK_MENZIL + 0.01), 0);
  assert.equal(basamakUzakliktan(Infinity), 0);
  assert.equal(basamakUzakliktan(NaN), 0);
  assert.deepEqual(basamakBandi(3), { ic: 0, dis: 4 });
  assert.deepEqual(basamakBandi(2), { ic: 4, dis: 8 });
  assert.deepEqual(basamakBandi(1), { ic: 8, dis: KULAK_MENZIL });
  assert.deepEqual(basamakBandi(0), { ic: KULAK_MENZIL, dis: Infinity });
  assert.equal(KULAK_BASAMAKLARI.length, 3);
});

test('kulak: gömülü iğne zayıf duyulur; açıkta yakından en yüksek basamak', () => {
  const t = tarlaKur(metindenTohum('k2'));
  const { igne } = t;
  const derin = igneDerinligi(t);
  assert.ok(derin / KULAK_DERINLIK_BOLEN > KULAK_MENZIL, `derinlik ${derin}`);
  // Derindeyken tam üstünde kazmak bile sessiz: kulak bir tarama aracı değil.
  assert.equal(kulakBasamagi(t, igne.x, igne.y), 0);
  igneyiAc(t);
  assert.equal(kulakUzakligi(t, igne.x + 3, igne.y), 3);
  assert.equal(kulakBasamagi(t, igne.x + 3, igne.y), 3);
  assert.equal(kulakBasamagi(t, igne.x, igne.y + 7), 2);
  assert.equal(kulakBasamagi(t, igne.x + 10, igne.y), 1);
  assert.equal(kulakBasamagi(t, igne.x + 20, igne.y), 0);
  // Biraz gömülü: aynı yatay uzaklıkta basamak düşer.
  for (const i of igneHucreleri(igne)) t.h[i] = igne.z + 3 * KULAK_DERINLIK_BOLEN;
  assert.equal(kulakBasamagi(t, igne.x + 3, igne.y), 2);
  // Makinedeki ya da balyadaki iğne duyulmaz.
  igne.kepcede = true;
  assert.equal(kulakBasamagi(t, igne.x, igne.y), 0);
  igne.kepcede = false;
  igne.balyada = 'b1';
  assert.equal(kulakUzakligi(t, igne.x, igne.y), Infinity);
});

test('kulak sesi: yaklaştıkça sık ve tiz; yükselen basamak beklemeden çalar', () => {
  assert.equal(kulakDeseni(0), null);
  assert.equal(kulakDeseni(7), null);
  const [a, b, c] = [1, 2, 3].map(kulakDeseni);
  assert.ok(a.aralikMs > b.aralikMs && b.aralikMs > c.aralikMs);
  assert.ok(a.frekans < b.frekans && b.frekans < c.frekans);
  assert.equal(tikZamani(0, 0, 1000, 0), false);
  assert.equal(tikZamani(1, 1, 100, 0), false);
  assert.equal(tikZamani(1, 1, a.aralikMs, 0), true);
  assert.equal(tikZamani(2, 1, 10, 0), true);
  assert.equal(tikZamani(1, 2, 10, 0), false);
});

test('parıltı türü: yüzeye yakın iğne, iğneli balya; kepçedeki iğne parlamaz', () => {
  const t = tarlaKur(metindenTohum('parilti'));
  const derin = igneDerinligi(t);
  assert.equal(pariltiTuru(t, derin - 1), null);
  assert.equal(pariltiTuru(t, derin), 'igne');
  t.igne.kepcede = true;
  assert.equal(pariltiTuru(t, Infinity), null);
  t.igne.kepcede = false;
  t.igne.balyada = 'b1';
  assert.equal(pariltiTuru(t, 0), 'balya');
});

test('kenar işareti: içerideki nokta yok; dışarıdakinin yönünde, payla kenarda', () => {
  const alan = { x: 10, y: 20, en: 40, boy: 20 };
  assert.equal(kenarIsareti(alan, { x: 30, y: 30 }), null);
  assert.equal(kenarIsareti(alan, { x: 10, y: 20 }), null);
  const sag = kenarIsareti(alan, { x: 200, y: 30 }, 2);
  assert.deepEqual(sag, { x: 48, y: 30, aci: 0 });
  const ust = kenarIsareti(alan, { x: 30, y: 0 }, 1);
  assert.equal(ust.x, 30);
  assert.equal(ust.y, 21);
  assert.ok(Math.abs(ust.aci + Math.PI / 2) < 1e-9);
  // Çapraz: köşeye yakın ama dikdörtgenin içinde ve doğru üstünde.
  const capraz = kenarIsareti(alan, { x: 130, y: 110 }, 0);
  assert.ok(capraz.x <= 50 + 1e-9 && capraz.y <= 40 + 1e-9);
  assert.ok(Math.abs(capraz.x - 50) < 1e-9 || Math.abs(capraz.y - 40) < 1e-9);
  assert.ok(Math.abs(Math.atan2(capraz.y - 30, capraz.x - 30) - capraz.aci) < 1e-9);
});

test('iş yakıtı: saman alınmayan karede (boşta, dolu kepçe) yalnız küçük bir kesir', () => {
  const t = makineTanimi('traktor');
  const tam = isYakiti(t, { miktar: 5, olaylar: [] }, 1);
  assert.equal(tam, t.isYakit);
  assert.equal(isYakiti(t, { miktar: 0, olaylar: [] }, 1), t.isYakit * BOSTA_IS_ORANI);
  assert.ok(BOSTA_IS_ORANI <= 0.1);
});

test('garaj ikmali: uzaklaşıp dönen ve duran makine bir kez %100 olur', () => {
  const m = yeniMakine('traktor', 'traktor-1', 50, 4, Math.PI / 2, 0.5);
  assert.deepEqual(m.park, { x: 50, y: 4 });
  assert.equal(ikmalKontrol(m), null); // park yerinden hiç ayrılmadı
  Object.assign(m, { y: 4 + IKMAL_UZAKLASMA + 1 });
  assert.equal(ikmalKontrol(m), null);
  Object.assign(m, { y: 5, hiz: 3 });
  assert.equal(ikmalKontrol(m), null); // durmadan geçerken olmaz
  m.hiz = 0;
  m.yakit = 0.3;
  assert.equal(ikmalKontrol(m), 0.3);
  assert.equal(m.yakit, 1);
  assert.equal(m.ikmalHakki, IKMAL_HAKKI - 1);
  m.yakit = 0.2;
  assert.equal(ikmalKontrol(m), null);
  assert.equal(m.yakit, 0.2);
});

test('oyunda: Boşluk basılı duran traktör boş zeminde yakıtı neredeyse yakmaz', async () => {
  const { yeniOyun, durumAl, adim } = await import('../js/oyun.js');
  const { kontrol } = await import('../js/kontrol.js');
  yeniOyun('bosta', 'normal');
  const d = durumAl();
  const m = d.makineler.find((x) => x.tur === 'traktor');
  yaninaKoy(d.karakter, m);
  let zaman = 0;
  const kare = (n = 1) => { for (let i = 0; i < n; i++) adim((zaman += 1000 / 60)); };
  kontrol.binIste = true;
  kare();
  assert.equal(d.karakter.makine, m);
  d.tarla.h.fill(0);
  const once = m.yakit;
  kontrol.kullan = true;
  kare(300);
  kontrol.kullan = false;
  kare();
  const harcanan = once - m.yakit;
  const tanim = makineTanimi('traktor');
  assert.ok(harcanan > 0, 'çok az da olsa harcar');
  assert.ok(harcanan <= tanim.isYakit * 5 * BOSTA_IS_ORANI + 1e-9, `harcanan ${harcanan}`);
  kontrol.binIste = true;
  kare();
});

test('oyunda: garaja dönen makine yakit-ikmal yayar; iğneli balya parlar', async () => {
  const { yeniOyun, durumAl, adim } = await import('../js/oyun.js');
  const { kontrol } = await import('../js/kontrol.js');
  const { dinle } = await import('../js/olaylar.js');
  const gelen = [];
  const birak = ['yakit-ikmal', 'balya-parladi', 'parilti']
    .map((ad) => dinle(ad, (v) => gelen.push([ad, v])));
  yeniOyun('ikmal', 'zor');
  const d = durumAl();
  const m = d.makineler.find((x) => x.tur === 'traktor');
  yaninaKoy(d.karakter, m);
  let zaman = 0;
  const kare = (n = 1) => { for (let i = 0; i < n; i++) adim((zaman += 1000 / 60)); };
  kontrol.binIste = true;
  kare();
  const park = { ...m.park };
  Object.assign(m, { x: park.x + 30, y: park.y + 30, yakit: 0.25 });
  kare();
  Object.assign(m, { x: park.x, y: park.y, hiz: 0 });
  kare();
  assert.equal(m.yakit, 1);
  assert.deepEqual(gelen.filter(([ad]) => ad === 'yakit-ikmal').map(([, v]) => v.onceki), [0.25]);
  kontrol.binIste = true;
  kare();
  // İğne bir balyada: parıltı anında balya hafifçe parlar (iğne parıltısı değil).
  d.tarla.balyalar.push({ id: 'b9', x: 60.5, y: 70.5, yon: 0, acik: false, acilma: 0,
    saman: 100, igne: true, civiler: [] });
  d.tarla.igne.balyada = 'b9';
  d.sonrakiParilti = zaman + 1;
  kare(2);
  for (const f of birak) f();
  assert.deepEqual(gelen.filter(([ad]) => ad !== 'yakit-ikmal'),
    [['balya-parladi', { x: 60, y: 70 }]]);
  assert.ok(d.balyaParilti && d.balyaParilti.bitis > zaman);
});

test('dedektör telafisi: hepsi Soğuk çıkıp hak bitince bir kez bir hak daha', async () => {
  const { telafiHakki } = await import('../js/kural/dedektor.js');
  const soguk = { seviye: { mesafe: Infinity } };
  const ilik = { seviye: { mesafe: 35 } };
  assert.equal(telafiHakki([soguk, soguk], 0), 1);
  assert.equal(telafiHakki([soguk, soguk], 1), 0);
  assert.equal(telafiHakki([soguk, ilik], 0), 0);
  assert.equal(telafiHakki([soguk], 0, 1), 0);
  assert.equal(telafiHakki([], 0), 0);
  const { yeniOyun, durumAl, bas, birak, aracSec } = await import('../js/oyun.js');
  yeniOyun('telafi', 'zor');
  const d = durumAl();
  const { igne } = d.tarla;
  const uzak = { x: igne.x > 120 ? 2 : 237, y: igne.y > 80 ? 2 : 157 };
  aracSec('dedektor');
  Object.assign(d.karakter, { x: uzak.x + 0.5, y: uzak.y + 0.5 });
  for (let i = 0; i < 4; i++) {
    bas(uzak, 100 * i);
    birak();
  }
  assert.equal(d.halkalar.length, 4);
  assert.equal(d.dedektor, 0);
  assert.equal(d.dedektorTelafi, 1);
});
