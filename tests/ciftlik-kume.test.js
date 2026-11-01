/**
 * Çiftlik parça kümesi (I2): seçim, döndürme, aynalama, port yönleri, çakışma ve kuruş denetimi,
 * hepsi-ya-hiç yapıştırma komutu, şablon metin kodu, hazır "Önerilen ilk hat", pipet ortak ayarı.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parcaTanimla, parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaAt } from '../js/kural/ciftlik/izgara.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import {
  kumeAl, kumeDondur, kumeAynala, kumePortlari, kumeKonumla, kumeKaroSayisi, kumeDogrula,
  ayarAl, ortakAyar,
} from '../js/kural/ciftlik/izgara/kume.js';
import {
  yerlesimDenetle, sayacMetni, kumeBaglamKur, kumeBaglam,
} from '../js/kural/ciftlik/izgara/denetim.js';
import { sablonKodla, sablonCoz } from '../js/kural/ciftlik/izgara/sablon-kod.js';
import { hazirSablonlar } from '../js/kural/ciftlik/izgara/yapistir.js';
import { dunya, duzTarla, kur, kos } from './ciftlik-yardim.mjs';

// Simetrik dört yönlü dağıtıcı, tek yan çıkışlı (kiral) parça ve ayarlı parça.
parcaTanimla('test-dort', {
  kod: 60001, ad: 'Dörtlü', aile: 'tasima', boyut: [1, 1],
  girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 0, y: 0, yon: 0 }, { x: 0, y: 0, yon: 1 }, { x: 0, y: 0, yon: 3 }],
});
parcaTanimla('test-tek', {
  kod: 60002, ad: 'Tek yan', aile: 'tasima', boyut: [1, 1],
  girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 0, y: 0, yon: 0 }, { x: 0, y: 0, yon: 1 }],
});
parcaTanimla('test-ayar', {
  kod: 60003, ad: 'Ayarlı', aile: 'mantik', boyut: [1, 1], ayarlar: { renk: {}, mod: {} },
  kur(p) {
    Object.assign(p.ozel, { renk: 0, mod: 'sirayla', tampon: [1, 2] });
  },
  aynaAyar(ayar) {
    return ayar.mod === 'sol' ? { ...ayar, mod: 'sag' } : ayar.mod === 'sag'
      ? { ...ayar, mod: 'sol' } : ayar;
  },
});
parcaTanimla('test-ayar2', {
  kod: 60004, ad: 'Ayarlı 2', aile: 'mantik', boyut: [1, 1], ayarlar: ['renk', 'esik'],
  kur(p) {
    Object.assign(p.ozel, { renk: 3, esik: 50 });
  },
});
parcaTanimla('test-genis', {
  kod: 60005, ad: 'Geniş', aile: 'depo', boyut: [2, 1], yonlu: false,
});

const bul = (c, anahtar) => [...c.parcalar.values()].filter((p) => p.tanim.anahtar === anahtar);

function bantYolu(c, tarla) {
  kur(c, tarla, 'bant', 20, 20, 0);
  kur(c, tarla, 'bant', 21, 20, 1);
  kur(c, tarla, 'bant', 21, 21, 1);
  kur(c, tarla, 'sandik', 21, 22, 0);
}

/** Port → komşu karoda başka bir parça var mı: (türA → türB) bağlantı sayımı. */
function baglantilar(kume) {
  const alan = new Map();
  kume.parcalar.forEach((q, i) => {
    const t = parcaTanimi(q.kod);
    const [en, boy] = q.yon & 1 ? [t.boyut[1], t.boyut[0]] : t.boyut;
    for (let y = q.y; y < q.y + (t.yonlu ? boy : t.boyut[1]); y++) {
      for (let x = q.x; x < q.x + (t.yonlu ? en : t.boyut[0]); x++) alan.set(`${x},${y}`, i);
    }
  });
  const say = {};
  kumePortlari(kume).forEach((pp, i) => {
    for (const o of pp.cikis) {
      const dx = [1, 0, -1, 0][o.yon];
      const dy = [0, 1, 0, -1][o.yon];
      const j = alan.get(`${o.kx + dx},${o.ky + dy}`);
      if (j === undefined) continue;
      const anahtar = `${parcaTanimi(kume.parcalar[i].kod).anahtar}>${
        parcaTanimi(kume.parcalar[j].kod).anahtar}`;
      say[anahtar] = (say[anahtar] ?? 0) + 1;
    }
  });
  return say;
}

test('kumeAl: dikdörtgene değen parçalar, sol üste oturur; ayar kopyalanır', () => {
  const { c, tarla } = dunya(3, duzTarla(0));
  bantYolu(c, tarla);
  const a = kur(c, tarla, 'test-ayar', 30, 30, 0);
  a.ozel.renk = 5;
  const k = kumeAl(c, 20, 20, 21, 22);
  assert.equal(k.parcalar.length, 4);
  assert.deepEqual([k.en, k.boy], [2, 3]);
  assert.deepEqual(k.parcalar.map((q) => [q.x, q.y, q.yon]),
    [[0, 0, 0], [1, 0, 1], [1, 1, 1], [1, 2, 0]]);
  assert.equal(kumeAl(c, 50, 50, 55, 55), null, 'boş alan');
  const tek = kumeAl(c, 30, 30, 30, 30);
  assert.deepEqual(tek.parcalar[0].ayar, { renk: 5, mod: 'sirayla' }, 'yalnız ayar anahtarları');
  assert.equal(kumeKaroSayisi(k), 4);
  assert.equal(kumeDogrula(k), null);
});

test('döndürme: dört çeyrek tur aynı küme; bağlantılar korunur', () => {
  const { c, tarla } = dunya(3, duzTarla(0));
  bantYolu(c, tarla);
  const k = kumeAl(c, 20, 20, 21, 22);
  let d = k;
  const ilk = baglantilar(k);
  assert.deepEqual(ilk, { 'bant>bant': 2, 'bant>sandik': 1 });
  for (let i = 1; i <= 4; i++) {
    d = kumeDondur(d);
    assert.deepEqual(baglantilar(d), ilk, `${i}. dönüş bağlantıları korur`);
    if (i === 1) {
      assert.deepEqual([d.en, d.boy], [3, 2], 'boyut yer değiştirir');
      assert.deepEqual(d.parcalar.map((q) => q.yon), [1, 0, 2, 2]);
    }
  }
  assert.deepEqual(d, k, 'tam tur');
});

test('ayna: x yansır, yön 0↔2; simetrik parçada portlar yer değiştirir, bağlantı korunur', () => {
  const k = {
    en: 3, boy: 2, parcalar: [
      { kod: parcaTanimi('bant').kod, x: 0, y: 0, yon: 0, ayar: {} },
      { kod: parcaTanimi('test-dort').kod, x: 1, y: 0, yon: 0, ayar: {} },
      { kod: parcaTanimi('bant').kod, x: 2, y: 0, yon: 0, ayar: {} },
      { kod: parcaTanimi('bant').kod, x: 1, y: 1, yon: 1, ayar: {} },
    ],
  };
  assert.equal(kumeDogrula(k), null);
  const a = kumeAynala(k);
  assert.deepEqual(a.yaklasik, [], 'simetrik parçalar tam eşleşir');
  assert.deepEqual(a.parcalar.map((q) => [q.x, q.y, q.yon]),
    [[0, 0, 2], [1, 0, 2], [1, 1, 1], [2, 0, 2]].sort((p, q) => p[1] - q[1] || p[0] - q[0]));
  assert.deepEqual(baglantilar(a), baglantilar(k));
  // Port düzeyi: dörtlü parçanın giriş kenarı batıdan doğuya geçer (sol/sağ yer değiştirir).
  const girisYonu = (kume) => kumePortlari(kume).find((p) => p.giris.length).giris[0].yon;
  assert.equal(girisYonu(k), 2);
  assert.equal(girisYonu(a), 0);
  assert.deepEqual(kumeAynala(a).parcalar, k.parcalar, 'iki ayna = özdeş');
  // Aynalama dönüşle sıra bağımsız bağlantı: ayna(dön(k)) bağlantıları aynı.
  assert.deepEqual(baglantilar(kumeAynala(kumeDondur(k))), baglantilar(k));
});

test('ayna: kiral parça yaklasik listesine girer; ayna ayarı sol/sağı çevirir', () => {
  const tek = { kod: parcaTanimi('test-tek').kod, x: 0, y: 0, yon: 0, ayar: {} };
  const a = kumeAynala({ en: 1, boy: 1, parcalar: [tek] });
  assert.deepEqual(a.yaklasik, ['test-tek']);
  const ay = { kod: parcaTanimi('test-ayar').kod, x: 0, y: 0, yon: 0, ayar: { mod: 'sol' } };
  assert.equal(kumeAynala({ en: 1, boy: 1, parcalar: [ay] }).parcalar[0].ayar.mod, 'sag');
  const genis = { kod: parcaTanimi('test-genis').kod, x: 0, y: 0, yon: 0, ayar: {} };
  const d = kumeDondur({ en: 2, boy: 1, parcalar: [genis] });
  assert.deepEqual([d.parcalar[0].yon, d.en, d.boy], [0, 2, 1], 'yönsüz parça kutusunu korur');
});

test('yerleşim denetimi: karo karo engel, kilitli, kuruş; sayaç metni', () => {
  const { c, tarla } = dunya(4, duzTarla(0));
  kur(c, tarla, 'sandik', 40, 40, 0);
  const k = kumeAl(c, 40, 40, 40, 40);
  const bant = { kod: parcaTanimi('bant').kod, x: 0, y: 0, yon: 0, ayar: {} };
  const kume = { en: 3, boy: 1, parcalar: [0, 1, 2].map((x) => ({ ...bant, x })) };
  const d1 = yerlesimDenetle(c, tarla, kumeKonumla(kume, 39, 40));
  assert.equal(d1.gecerli, false);
  assert.equal(d1.engelliKaro, 1, 'yalnız sandık karosu dolu');
  assert.deepEqual(d1.engelli, [{ kx: 40, ky: 40, neden: 'dolu' }]);
  assert.equal(yerlesimDenetle(c, tarla, kumeKonumla(kume, 50, 40)).gecerli, true);
  assert.equal(yerlesimDenetle(c, tarla, kumeKonumla(kume, 118, 40)).engelliKaro, 2,
    'son karo yasak kenar, sonraki ızgara dışı');
  assert.ok(k);
  const eski = { ...kumeBaglam };
  try {
    kumeBaglamKur({
      kurus: () => 100, maliyet: (t) => (t.anahtar === 'bant' ? 40 : 0),
      kilitli: (t) => t.anahtar === 'sandik',
    });
    const d2 = yerlesimDenetle(c, tarla, kumeKonumla(kume, 50, 40));
    assert.deepEqual([d2.kurus, d2.eksik, d2.gecerli], [120, 20, false]);
    assert.equal(sayacMetni(d2), '20 kuruş eksik');
    const d3 = yerlesimDenetle(c, tarla, kumeKonumla(kume, 39, 40));
    assert.equal(sayacMetni(d3), '1 karo engelli · 20 kuruş eksik');
    const sandikli = {
      en: 2, boy: 1, parcalar: [
        { ...bant },
        { kod: parcaTanimi('sandik').kod, x: 1, y: 0, yon: 0, ayar: {} }],
    };
    const d4 = yerlesimDenetle(c, tarla, kumeKonumla(sandikli, 60, 40));
    assert.equal(d4.parcalar[1].neden, 'kilitli');
    assert.deepEqual(d4.engelli.map((e) => e.neden), ['kilitli'], 'kilitli parça karosu kırmızı');
    assert.equal(sayacMetni(d4), '1 karo engelli · 40 kuruş');
  } finally {
    kumeBaglamKur(eski);
  }
  assert.equal(sayacMetni({ engelliKaro: 3, eksik: 0, kurus: 40 }), '3 karo engelli · 40 kuruş');
});

test('yapıştır: hepsi ya hiç (tek engel = hiçbiri), sonra başarılı; ayarlar taşınır', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  const a = kur(c, tarla, 'test-ayar', 30, 30, 0);
  Object.assign(a.ozel, { renk: 4, mod: 'sol' });
  kur(c, tarla, 'bant', 31, 30, 0);
  kur(c, tarla, 'sandik', 32, 30, 0);
  const kume = kumeAl(c, 30, 30, 32, 30);
  kur(c, tarla, 'sandik', 52, 40, 0); // üçüncü parçanın karosu dolu
  const onceki = c.parcalar.size;
  komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(kume, 50, 40) });
  const olay = kos(c, tarla, 1);
  assert.equal(c.parcalar.size, onceki, 'tek engel yüzünden hiçbiri kurulmadı');
  const red = olay.find((o) => o.ad === 'komut-reddedildi');
  assert.equal(red.veri.neden, 'yapistir-engelli');
  assert.equal(red.veri.engelliKaro, 1);
  assert.equal(parcaAt(c, 50, 40), null);
  komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(kume, 50, 50) });
  const olay2 = kos(c, tarla, 1);
  assert.equal(c.parcalar.size, onceki + 3);
  assert.equal(olay2.filter((o) => o.ad === 'parca-kuruldu').length, 3);
  assert.equal(olay2.filter((o) => o.ad === 'yapistirildi').length, 1, 'tek işlem');
  assert.deepEqual(parcaAt(c, 50, 50).ozel.renk, 4);
  assert.equal(parcaAt(c, 50, 50).ozel.mod, 'sol');
  assert.deepEqual(parcaAt(c, 50, 50).ozel.tampon, [1, 2], 'ayar olmayan alan varsayılan kalır');
});

test('yapıştır: kaydet/yükle ve aynı komutlarla aynı özet (determinizm)', () => {
  const kos2 = () => {
    const { c, tarla } = dunya(6, duzTarla(2));
    bantYolu(c, tarla);
    const k = kumeAl(c, 20, 20, 21, 22);
    komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(kumeDondur(k), 60, 30) });
    komutEkle(c, { tur: 'sokAlan', xa: 20, ya: 20, xb: 21, yb: 22 });
    kos(c, tarla, 5);
    return { c, tarla };
  };
  const a = kos2();
  const b = kos2();
  assert.equal(dunyaOzeti(a.c, a.tarla), dunyaOzeti(b.c, b.tarla));
  assert.equal(a.c.parcalar.size, 4, 'eski dört söküldü, döndürülmüş dört kuruldu');
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(a.c, a.tarla)));
  const y = dunyaCoz(kayit, a.tarla);
  assert.equal(dunyaOzeti(y.c, a.tarla), dunyaOzeti(a.c, a.tarla));
});

test('sökAlan: alandaki bütün parçalar tek komutla; boş alan reddedilir', () => {
  const { c, tarla } = dunya(7, duzTarla(0));
  bantYolu(c, tarla);
  kur(c, tarla, 'bant', 25, 25, 0);
  komutEkle(c, { tur: 'sokAlan', xa: 21, ya: 22, xb: 20, yb: 20 });
  const olay = kos(c, tarla, 1);
  assert.equal(c.parcalar.size, 1, 'yalnız uzaktaki bant kaldı');
  assert.equal(olay.filter((o) => o.ad === 'parca-sokuldu').length, 4);
  assert.equal(olay.filter((o) => o.ad === 'alan-sokuldu').length, 1);
  komutEkle(c, { tur: 'sokAlan', xa: 90, ya: 60, xb: 91, yb: 61 });
  assert.equal(kos(c, tarla, 1).find((o) => o.ad === 'komut-reddedildi').veri.neden, 'bos');
});

test('pipet: ortak ayar yalnız iki türün ortak anahtarlarını taşır; ayarTasi yazar', () => {
  const { c, tarla } = dunya(8, duzTarla(0));
  const a = kur(c, tarla, 'test-ayar', 30, 30, 0);
  Object.assign(a.ozel, { renk: 2, mod: 'sag' });
  const ayar = ayarAl(a);
  assert.deepEqual(ayar, { renk: 2, mod: 'sag' });
  assert.deepEqual(ortakAyar(ayar, parcaTanimi('test-ayar2')), { renk: 2 }, 'esik/mod ortak değil');
  assert.deepEqual(ortakAyar(ayar, parcaTanimi('bant')), {}, 'ayarsız tür');
  const b = kur(c, tarla, 'test-ayar2', 33, 30, 0);
  komutEkle(c, { tur: 'ayarTasi', x: 33, y: 30, ayar: ortakAyar(ayar, b.tanim) });
  kos(c, tarla, 1);
  assert.deepEqual([b.ozel.renk, b.ozel.esik], [2, 50]);
});

test('şablon kodu: gidiş-dönüş, bozulma ve geçersiz içerik reddi', () => {
  const [hazir] = hazirSablonlar();
  assert.equal(kumeDogrula(hazir.kume), null);
  const kod = sablonKodla({ ad: 'Çiftlik hattı ğüşiöç', kume: hazir.kume });
  assert.match(kod, /^CS1-[\w-]+-[0-9a-f]{8}$/);
  const s = sablonCoz(kod);
  assert.equal(s.sablon.ad, 'Çiftlik hattı ğüşiöç');
  assert.deepEqual(s.sablon.kume, hazir.kume);
  const bozuk = kod.slice(0, 20) + (kod[20] === 'A' ? 'B' : 'A') + kod.slice(21);
  assert.match(sablonCoz(bozuk).hata, /sağlama|bozuk/);
  assert.match(sablonCoz('merhaba').hata, /tanınmadı/);
  assert.match(sablonCoz(kod.replace('CS1', 'CS2')).hata, /tanınmadı/);
  const yok = sablonKodla({ ad: 'x', kume: { en: 1, boy: 1, parcalar: [
    { kod: 59999, x: 0, y: 0, yon: 0, ayar: {} }] } });
  assert.match(sablonCoz(yok).hata, /bilinmeyen parça/);
  const cak = sablonKodla({ ad: 'x', kume: { en: 1, boy: 1, parcalar: [
    { kod: 1, x: 0, y: 0, yon: 0, ayar: {} }, { kod: 1, x: 0, y: 0, yon: 0, ayar: {} }] } });
  assert.match(sablonCoz(cak).hata, /çakış/);
  const ayarli = sablonKodla({ ad: 'a', kume: { en: 1, boy: 1, parcalar: [
    { kod: 60003, x: 0, y: 0, yon: 0, ayar: { renk: 1, tampon: [9] } }] } });
  assert.match(sablonCoz(ayarli).hata, /ayar bozuk \(tampon\)/, 'ayar olmayan anahtar reddedilir');
});

test('Önerilen ilk hat: yapıştırılınca (dört dönüşte ve aynada) sandığa saman akar', () => {
  const [hazir] = hazirSablonlar();
  let k = hazir.kume;
  const adlar = [];
  for (let tur = 0; tur < 4; tur++) {
    const { c, tarla } = dunya(9, duzTarla(3));
    komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(k, 50, 30) });
    kos(c, tarla, 800);
    const [sandik] = bul(c, 'sandik');
    assert.ok(sandik.ozel.toplam > 0, `${tur}. dönüşte sandık doldu`);
    adlar.push(sandik.ozel.toplam);
    k = kumeDondur(k);
  }
  assert.equal(adlar.length, 4);
  const a = kumeAynala(hazir.kume);
  assert.deepEqual(a.yaklasik, [], 'huni gövdesi kayarak portunu bantla hizalar');
  const { c, tarla } = dunya(9, duzTarla(3));
  komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(a, 50, 30) });
  kos(c, tarla, 800);
  assert.ok(bul(c, 'sandik')[0].ozel.toplam > 0, 'ayna hat da sandığı doldurur');
  assert.equal(bul(c, 'huni')[0].yon, 2);
  const cift = kumeKonumla(kumeAynala(kumeAynala(hazir.kume)), 0, 0);
  assert.deepEqual(cift.map((q) => [q.x, q.y, q.yon]).sort(),
    hazir.kume.parcalar.map((q) => [q.x, q.y, q.yon]).sort(), 'iki ayna = özdeş');
  // Kayma komşuya çarpıyorsa kaydırmasız yaklaşık aynaya düşülür ve uyarılır.
  const sikisik = {
    en: 2, boy: 3, parcalar: [
      { kod: parcaTanimi('bant').kod, x: 1, y: 0, yon: 0, ayar: {} },
      { kod: parcaTanimi('huni').kod, x: 0, y: 1, yon: 0, ayar: {} },
    ],
  };
  assert.equal(kumeDogrula(sikisik), null);
  assert.deepEqual(kumeAynala(sikisik).yaklasik, ['huni']);
});

test('kilitli parçalı şablon: denetim kırmızı verir, komut kurmaz', () => {
  const { c, tarla } = dunya(10, duzTarla(0));
  const eski = { ...kumeBaglam };
  try {
    kumeBaglamKur({ kilitli: (t) => t.anahtar === 'huni' });
    const [hazir] = hazirSablonlar();
    const d = yerlesimDenetle(c, tarla, kumeKonumla(hazir.kume, 50, 30));
    assert.equal(d.gecerli, false);
    assert.equal(d.engelliKaro, 4, 'huninin dört karosu');
    assert.ok(d.engelli.every((e) => e.neden === 'kilitli'));
    komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(hazir.kume, 50, 30) });
    kos(c, tarla, 1);
    assert.equal(c.parcalar.size, 0);
  } finally {
    kumeBaglamKur(eski);
  }
});

test('şablon deposu: 10 yuva, bozuk yuva boş sayılır, içe aktarma ve dolu depo', async () => {
  const sablon = await import('../js/ozellik/ciftlik/sablon.js');
  let ham = [];
  sablon.sablonDeposuKur({ oku: () => ham, yaz: (d) => { ham = d; return true; } });
  const [hazir] = hazirSablonlar();
  assert.equal(sablon.SABLON_YUVA, 10);
  assert.equal(sablon.sablonlariOku().filter(Boolean).length, 0);
  assert.equal(sablon.hazirlariOku()[0].ad, 'Önerilen ilk hat');
  assert.equal(sablon.sablonKaydet(2, '  Benim hat  ', hazir.kume), true);
  assert.equal(sablon.sablonlariOku()[2].ad, 'Benim hat');
  assert.equal(sablon.sablonKaydet(10, 'x', hazir.kume), false, 'yuva sınırı');
  assert.equal(sablon.sablonKaydet(0, 'x', { en: 1, boy: 1, parcalar: [] }), false, 'boş küme');
  const kod = sablon.sablonKodu(2);
  const eski = console.error;
  console.error = () => {};
  try {
    ham[5] = kod.slice(0, -2) + 'zz';
    assert.equal(sablon.sablonlariOku()[5], null, 'bozuk yuva boş sayılır');
  } finally {
    console.error = eski;
  }
  ham[5] = null;
  assert.deepEqual(sablon.sablonIceAktar(kod), { yuva: 0 }, 'ilk boş yuva');
  assert.deepEqual(sablon.sablonIceAktar(kod, 7), { yuva: 7 });
  assert.match(sablon.sablonIceAktar('CS1-xx-yy').hata, /bozuk|tanınmadı|sağlama/);
  for (let i = 0; i < 10; i++) sablon.sablonKaydet(i, `s${i}`, hazir.kume);
  assert.match(sablon.sablonIceAktar(kod).hata, /Boş yuva yok/);
  assert.equal(sablon.sablonSil(3), true);
  assert.equal(sablon.sablonlariOku()[3], null);
  sablon.sablonBaglam.hazirAcik = () => false;
  assert.deepEqual(sablon.hazirlariOku(), [], 'öğretici bitmeden hazır şablon yok');
});

test('yapıştır bedel öder, alan sökümü iade eder (G ekonomisi; kapı sökülmez)', async () => {
  const { ekonomiAl } = await import('../js/kural/ciftlik/ekonomi/kurus.js');
  const { c, tarla } = dunya(5, duzTarla(0));
  const [ilk] = hazirSablonlar();
  komutEkle(c, { tur: 'yapistir', parcalar: kumeKonumla(ilk.kume, 20, 20) });
  kos(c, tarla, 1);
  assert.equal(ekonomiAl(c).kurus, 300 - 40 - 6 * 2 - 15, 'huni + 6 bant + sandık');
  komutEkle(c, { tur: 'sokAlan', xa: 19, ya: 19, xb: 30, yb: 22 });
  kos(c, tarla, 1);
  assert.equal(c.parcalar.size, 0);
  assert.equal(ekonomiAl(c).kurus, 300, 'hepsi iade');
});
