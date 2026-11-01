/**
 * Çiftlik ekonomisi: denge tablosu kapsamı, kilit kaynağı (üç kip), erişilebilirlik (her
 * damga yalnız önceki damgaların parçalarıyla; araştırma kipinde de), kurulum bedeli ve
 * %100 söküm iadesi, kuruş kuyuları, "bulundu" ödemesi, soft-lock (kuruş bitse de ilerlenir),
 * çevrimdışı ilerleme (tavan, %50, depo kenetlemesi, satış kuruşu, değişmeyenler).
 * Parça tanımlarının çoğu Faz 1 ajanlarında: erişilebilirlik ACILIS/URETIM veri tablosundan.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parcaTurleri, parcaTanimi, parcaTanimla } from '../js/kural/ciftlik/parca-kayit.js';
import { esyaKodu, esyaTurleri } from '../js/kural/ciftlik/esya.js';
import { komutEkle, ciftlikSamani } from '../js/kural/ciftlik/benzetim.js';
import {
  PARCA_MALIYET, ESYA_DEGER, DAMGALAR, BASLANGIC_KURUS, KUYU, KUYU_TABAN, parcaSabiti,
} from '../js/kural/ciftlik/ekonomi/denge.js';
import {
  ACILIS, URETIM, acikMi, acikParcalar, kalemUretilebilir, kilitBilgisi, damganinAcdiklari,
} from '../js/kural/ciftlik/ekonomi/acilis.js';
import {
  ilerlemeKur, ilerlemeBagla, ILK_DAMGALAR, damgaBas, yeniCiftlikKurusu,
} from '../js/kural/ciftlik/ekonomi/damga.js';
import {
  ekonomiAl, ekonomiBaslat, bulundu, esyaDegeri, kurusHarca,
} from '../js/kural/ciftlik/ekonomi/kurus.js';
import { teslimEt } from '../js/kural/ciftlik/ekonomi/siparis.js';
import {
  cevrimdisiHesapla, cevrimdisiIlerle, satisKaydet,
} from '../js/kural/ciftlik/ekonomi/cevrimdisi.js';
import { ESYA_KAP } from '../js/kural/ciftlik/esya.js';
import { dunyaHazirla } from '../js/kural/ciftlik/dunya/arazi.js';
import { dunya, duzTarla, kos, kur } from './ciftlik-yardim.mjs';

/** SAP: kalbur (E · ayıklama) henüz yoksa yalnız kilit testi için boş bir 2×1 parça. */
const KALBUR = parcaTanimi('kalbur')
  ?? parcaTanimla('kalbur', { kod: 64001, ad: 'Kalbur (sap)', boyut: [2, 1] });

const DAMGA_SIRA = ['T0', ...ILK_DAMGALAR.map((d) => d.id)];
const MANTIK = ['kantar', 'kile-sayaci', 'ruzgar-gulu', 'savak-kapagi'];

/** T0 + verilen damgalardan önceki damgaların açtığı parçalar. */
function oncekiParcalar(id) {
  const once = DAMGA_SIRA.slice(1, DAMGA_SIRA.indexOf(id));
  return acikParcalar({ ...ilerlemeKur(), damgalar: once });
}

const red = (olaylar) => olaylar.filter((o) => o.ad === 'komut-reddedildi')
  .map((o) => o.veri.neden);

test('denge: her kayıtlı parçanın fiyatı ve kilidi, her eşyanın değeri tabloda', () => {
  for (const t of parcaTurleri()) {
    if (t.kod >= 64000) continue;
    assert.ok(t.anahtar in PARCA_MALIYET, `${t.anahtar} fiyatı yok`);
    assert.ok(ACILIS[t.anahtar], `${t.anahtar} kilit satırı yok`);
  }
  for (const t of esyaTurleri()) {
    assert.ok(t.buluntu || t.anahtar in ESYA_DEGER, `${t.anahtar} değeri yok`);
  }
  assert.deepEqual(Object.keys(ACILIS).sort(), Object.keys(PARCA_MALIYET).sort());
  const toplam = Object.values(PARCA_MALIYET).reduce((s, n) => s + n, 0);
  assert.ok(toplam > 2200 && toplam < 2600, `30 parçanın toplamı ≈ 2400 (${toplam})`);
  assert.throws(() => parcaSabiti('yok-boyle-parca'), /parça sabiti yok/);
});

test('kilit tablosu parcalar.md ile aynı: T0 3 parça, D1-D8 3/3/4/2/3/4/4/4', () => {
  const say = {};
  for (const [a, s] of Object.entries(ACILIS)) {
    if (a !== 'komsu-kapisi') say[s.damga ?? 'T0'] = (say[s.damga ?? 'T0'] ?? 0) + 1;
  }
  assert.deepEqual(say, { T0: 3, D1: 3, D2: 3, D3: 4, D4: 2, D5: 3, D6: 4, D7: 4, D8: 4 });
  assert.deepEqual(damganinAcdiklari('D8').sort(), [...MANTIK].sort());
  assert.equal(ACILIS.huni.damga, null);
  assert.deepEqual(ACILIS['balya-presi'].arastirma.kurus, 300, 'araştırma = fiyat × 2');
});

test('erişilebilirlik (damga): her damga yalnız önceki damgaların parçalarıyla yapılır', () => {
  for (const d of ILK_DAMGALAR) {
    const acik = oncekiParcalar(d.id);
    for (const k of d.kalemler) {
      assert.ok(kalemUretilebilir(k, acik), `${d.id} ${JSON.stringify(k)} önceki parçalarla yok`);
    }
  }
  // D5 "temiz harman" tozun ayıklanmasını ister: T0-D3 parçalarıyla değil, D4 kalburuyla.
  const d5 = DAMGALAR.find((d) => d.id === 'D5').kalemler[0];
  assert.equal(kalemUretilebilir(d5, oncekiParcalar('D4')), false);
  assert.equal(kalemUretilebilir(d5, oncekiParcalar('D5')), true);
});

test('erişilebilirlik: hiçbir ürün ve damga mantık ailesi istemez', () => {
  for (const [urun, g] of Object.entries(URETIM)) {
    for (const grup of g.parca) {
      assert.ok(grup.some((p) => !MANTIK.includes(p)), `${urun} mantık istiyor`);
    }
  }
  const mantiksiz = new Set([...Object.keys(ACILIS)].filter((a) => !MANTIK.includes(a)));
  for (const d of ILK_DAMGALAR) {
    for (const k of d.kalemler) assert.ok(kalemUretilebilir(k, mantiksiz), d.id);
  }
});

test('erişilebilirlik (araştırma): T0dan başlayıp numunesi üretilebilen parça araştırılarak '
  + 'hepsi açılır', () => {
  const il = { ...ilerlemeKur({ kilit: 'arastirma' }) };
  for (let tur = 0; tur < 40; tur++) {
    const acik = acikParcalar(il);
    const yeni = Object.entries(ACILIS).filter(([a, s]) => !acik.has(a)
      && s.arastirma.numune.every((k) => kalemUretilebilir(k, acik)));
    if (!yeni.length) break;
    il.arastirilan.push(...yeni.map(([a]) => a));
  }
  assert.equal(acikParcalar(il).size, Object.keys(ACILIS).length, 'kapalı kalan var');
});

test('erişilebilirlik (kuruş): her damganın en ucuz parça seti önceki ödüllerle alınır', () => {
  let kasa = BASLANGIC_KURUS;
  for (const d of ILK_DAMGALAR) {
    const acik = oncekiParcalar(d.id);
    // ham hat: huni + 30 bant; her kalemin istediği grupların en ucuzu
    const gerek = new Set(['huni']);
    const ekle = (urun) => {
      const g = URETIM[urun.startsWith('buluntu:') ? 'buluntu' : urun];
      for (const grup of g.parca) {
        const ucuz = grup.filter((p) => acik.has(p))
          .sort((a, b) => PARCA_MALIYET[a] - PARCA_MALIYET[b])[0];
        gerek.add(ucuz);
      }
      for (const u of g.urun ?? []) ekle(u);
    };
    for (const k of d.kalemler) {
      if (k.durum) ekle(k.durum === 'igne' ? 'igne' : 'buluntu');
      else ekle(k.kabul.find((u) => kalemUretilebilir({ kabul: [u] }, acik)));
    }
    gerek.delete('bant');
    const bedel = [...gerek].reduce((s, p) => s + PARCA_MALIYET[p], 30 * PARCA_MALIYET.bant);
    assert.ok(bedel <= kasa, `${d.id}: ${bedel} > ${kasa}`);
    kasa += d.odul;
  }
});

test('acikMi: damga, araştırma ve hepsi açık kipleri; tabloda olmayan kapalı', () => {
  const il = ilerlemeKur();
  assert.equal(acikMi('bant', il), true);
  assert.equal(acikMi('kalbur', il), false);
  assert.equal(acikMi('yok-boyle', il), false);
  damgaBas(il, 'D4');
  assert.equal(acikMi('kalbur', il), true);
  assert.equal(acikMi('seytan-yeli', il), false);
  const ar = ilerlemeKur({ kilit: 'arastirma' });
  assert.deepEqual(damgaBas(ar, 'D4'), { acilanlar: [] }, 'araştırmada damga parça açmaz');
  assert.equal(acikMi('kalbur', ar), false);
  ar.arastirilan.push('kalbur');
  assert.equal(acikMi('kalbur', ar), true);
  assert.equal(kilitBilgisi('volan', ar).arastirma.kurus, 160);
  const hepsi = ilerlemeKur({ kilit: 'acik' });
  assert.ok(Object.keys(ACILIS).every((a) => acikMi(a, hepsi)));
  assert.deepEqual(kilitBilgisi('kalbur', ilerlemeKur()),
    { acik: false, damga: 'D4', damgaAd: 'İlk balyalar', arastirma: null });
  assert.throws(() => ilerlemeKur({ kilit: 'kum' }), /bilinmeyen kilit/);
});

test('kur komutu: kilitli ve kuruş yetmezse reddedilir; kurulum öder, söküm %100 iade', () => {
  const { c, tarla } = dunya(3, duzTarla(0));
  const il = ilerlemeBagla(c, ilerlemeKur());
  komutEkle(c, { tur: 'kur', parca: 'kalbur', x: 10, y: 10 });
  assert.deepEqual(red(kos(c, tarla, 1)), ['kilitli']);
  damgaBas(il, 'D4');
  komutEkle(c, { tur: 'kur', parca: 'kalbur', x: 10, y: 10 });
  komutEkle(c, { tur: 'kur', parca: 'huni', x: 20, y: 10 });
  kos(c, tarla, 1);
  assert.equal(c.parcalar.size, 2);
  assert.equal(ekonomiAl(c).kurus, BASLANGIC_KURUS - PARCA_MALIYET.kalbur - PARCA_MALIYET.huni);
  komutEkle(c, { tur: 'sok', x: 10, y: 10 });
  const sok = kos(c, tarla, 1).find((o) => o.ad === 'parca-sokuldu');
  assert.equal(sok.veri.iade.kurus, PARCA_MALIYET.kalbur);
  assert.equal(ekonomiAl(c).kurus, BASLANGIC_KURUS - PARCA_MALIYET.huni);
  ekonomiAl(c).kurus = 1;
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: 30, y: 10 });
  komutEkle(c, { tur: 'kur', parca: 'yok-boyle', x: 30, y: 10 });
  assert.deepEqual(red(kos(c, tarla, 1)), ['kurus', 'bilinmeyen']);
  assert.equal(ekonomiAl(c).kurus, 1, 'red kuruş almaz');
  assert.ok(KALBUR);
});

test('başlangıç kuruşu öğretici ilk hattı karşılar (huni + 30 bant + sandık)', () => {
  const bedel = PARCA_MALIYET.huni + 30 * PARCA_MALIYET.bant + PARCA_MALIYET.sandik;
  assert.ok(bedel <= BASLANGIC_KURUS && bedel <= BASLANGIC_KURUS - KUYU_TABAN);
});

/** Ham hat: huni + n bant + sandık komutla kurulur. */
function hatKur(c, n) {
  komutEkle(c, { tur: 'kur', parca: 'huni', x: 10, y: 20, yon: 0 });
  for (let i = 0; i < n; i++) komutEkle(c, { tur: 'kur', parca: 'bant', x: 12 + i, y: 20 });
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: 12 + n, y: 20 });
}
/** Sentetik dünyaya araba döküm yeri ve küçük bir çayır (kuyu komutları dünyanın). */
function kuyuDunyasi(c) {
  const a = dunyaHazirla(c);
  a.dokum = [[60, 50]];
  a.cayir = { x: 90, y: 5, en: 4, boy: 4, kose: 1 };
}
function hepsiniSok(c, tarla) {
  for (const p of [...c.parcalar.values()]) komutEkle(c, { tur: 'sok', x: p.x, y: p.y });
  kos(c, tarla, 1);
  assert.equal(c.parcalar.size, 0);
}

test('soft-lock (a): her şey sökülünce kuruş = 300 + kazanılan − kuyu harcaması', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  kuyuDunyasi(c);
  hatKur(c, 20);
  kos(c, tarla, 2);
  const e = ekonomiAl(c);
  assert.equal(e.kurus, 300 - 40 - 40 - 15);
  for (let i = 0; i < 400; i++) teslimEt(c, esyaKodu('saman'));
  kos(c, tarla, 2);
  bulundu(c, esyaKodu('igne'), 'tam');
  komutEkle(c, { tur: 'arabaCagir' });
  kos(c, tarla, 1);
  assert.equal(e.harcama, KUYU.araba.bedel);
  assert.ok(e.kazanc > 400);
  hepsiniSok(c, tarla);
  assert.equal(e.kurus, BASLANGIC_KURUS + e.kazanc - e.harcama);
});

test('soft-lock (b): kuruş 0 iken söküm kuruşu geri verir, hat yeniden kurulur', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  hatKur(c, 20);
  kos(c, tarla, 1);
  const e = ekonomiAl(c);
  e.kurus = 0;
  komutEkle(c, { tur: 'kur', parca: 'bant', x: 40, y: 40 });
  assert.deepEqual(red(kos(c, tarla, 1)), ['kurus']);
  hepsiniSok(c, tarla);
  assert.equal(e.kurus, 95);
  hatKur(c, 20);
  kos(c, tarla, 1);
  assert.equal(c.parcalar.size, 22);
  assert.equal(e.kurus, 0);
});

test('soft-lock (c): kuyular kuruş + parça değerini KUYU_TABAN altına indiremez', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  kuyuDunyasi(c);
  const e = ekonomiAl(c);
  komutEkle(c, { tur: 'arabaCagir' });
  assert.deepEqual(red(kos(c, tarla, 1)), ['taban'], '300 − 300 + 0 < 100');
  e.kurus = 350;
  hatKur(c, 10);
  kos(c, tarla, 1);
  komutEkle(c, { tur: 'arabaCagir' });
  assert.deepEqual(red(kos(c, tarla, 1)), ['kurus'], '275 < 300');
  e.kurus = 300;
  komutEkle(c, { tur: 'arabaCagir' });
  assert.deepEqual(red(kos(c, tarla, 1)), ['taban'], '300 − 300 + 75 parça < 100');
  e.kurus = 330;
  komutEkle(c, { tur: 'arabaCagir' });
  assert.deepEqual(red(kos(c, tarla, 1)), [], '30 + 75 ≥ 100');
  assert.equal(e.kurus, 30);
  hepsiniSok(c, tarla);
  assert.equal(e.kurus, 105, 'söküm sonrası taban üstünde: yeni hat kurulabilir');
});

test('kuyular: araba 6000 tikte bir; çayır 400/800/1200 sonra en çok; sayaçlar yazılır', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  kuyuDunyasi(c);
  const e = ekonomiAl(c);
  e.kurus = 5000;
  komutEkle(c, { tur: 'arabaCagir' });
  const ol = kos(c, tarla, 1);
  assert.deepEqual(ol.filter((o) => o.ad === 'kuyu-kullanildi').map((o) => o.veri),
    [{ tur: 'araba', bedel: 300 }]);
  assert.equal(e.arabaIstek, 1);
  kos(c, tarla, 700);
  komutEkle(c, { tur: 'arabaCagir' });
  assert.deepEqual(red(kos(c, tarla, 4300)), ['erken'], 'araba döktü, çağrı aralığı dolmadı');
  kos(c, tarla, 1000);
  komutEkle(c, { tur: 'arabaCagir' });
  assert.deepEqual(red(kos(c, tarla, 1)), []);
  assert.equal(e.arabaIstek, 2);
  const once = e.kurus;
  for (let i = 0; i < 4; i++) komutEkle(c, { tur: 'cayirGenislet' });
  assert.deepEqual(red(kos(c, tarla, 1)), ['en-cok']);
  assert.equal(e.cayirEk, 3);
  assert.equal(c.arazi.seviye, 3, 'dünyanın çayır seviyesi ve ekonominin sayacı aynı');
  assert.equal(once - e.kurus, 2400);
  assert.equal(kurusHarca(c, 1e6), false, 'yetmeyen harcama kuruşu değiştirmez');
});

test('bulundu: tam / yarı / kuruşsuz; defter ve toplamlar her kipte yazılır', () => {
  const { c } = dunya(5, duzTarla(0));
  const il = ilerlemeBagla(c, ilerlemeKur());
  const igne = esyaKodu('igne');
  const dugme = esyaKodu('buluntu:dugme');
  const pusula = esyaKodu('buluntu:pusula');
  const olaylar = [];
  const olay = (ad, veri) => olaylar.push({ ad, veri });
  assert.equal(bulundu(c, igne, 'tam', olay), 250);
  assert.equal(bulundu(c, igne, 'yari', olay), 125);
  assert.equal(bulundu(c, igne, 'kurussuz', olay), 0);
  assert.equal(bulundu(c, dugme, 'tam'), 30, 'yaygın');
  assert.equal(bulundu(c, pusula, 'yari'), 60, 'nadir 120 / 2');
  assert.equal(esyaDegeri(pusula), 120);
  assert.equal(ekonomiAl(c).kurus, 300 + 250 + 125 + 30 + 60);
  assert.deepEqual(il.toplam, { igne: 3, buluntu: 2, siparis: 0 });
  assert.deepEqual(il.defterCiftlik, { dugme: 1, pusula: 1 });
  assert.deepEqual(olaylar.map((o) => o.veri.kurus), [250, 125, 0]);
  assert.throws(() => bulundu(c, esyaKodu('saman'), 'tam'), /iğne ya da buluntu değil/);
  assert.throws(() => bulundu(c, igne, 'bedava'), /bilinmeyen kip/);
});

test('yeni çiftlik: kuruş 300 + 100 × damga; damgalar ve açık parçalar kalır', () => {
  const il = ilerlemeKur();
  damgaBas(il, 'D1');
  damgaBas(il, 'D2');
  assert.equal(yeniCiftlikKurusu(il), 500);
  const { c } = dunya(8, duzTarla(0));
  ekonomiBaslat(c, il);
  assert.equal(ekonomiAl(c).kurus, 500);
  assert.equal(acikMi('catal', c.ilerleme), true);
});

/** Sandıklı dünya; s saniye boyunca her saniye 2 saman + 1 iğne depolanır, 1 kuruş satılır. */
function olcumluDunya(s) {
  const { c, tarla } = dunya(13, duzTarla(3));
  const il = ilerlemeBagla(c, ilerlemeKur());
  kur(c, tarla, 'sandik', 30, 30);
  kur(c, tarla, 'sandik', 40, 30);
  for (let i = 0; i < s; i++) {
    const d = (c.sayaclar.depolanan ??= new Uint32Array(ESYA_KAP));
    d[esyaKodu('saman')] += 2;
    d[esyaKodu('igne')] += 1;
    satisKaydet(c, 1);
    kos(c, tarla, 20);
  }
  return { c, tarla, il };
}
const yakin = (a, b, pay) => assert.ok(Math.abs(a - b) <= pay, `${a} ≈ ${b}`);

test('çevrimdışı: son 5 dk hızı × dk × %50; satış kuruşu; iğne çevrimdışı bulunmaz', () => {
  const { c } = olcumluDunya(400);
  const h = cevrimdisiHesapla(c, 10);
  assert.equal(h.dk, 10);
  assert.equal(h.esya.length, 1, 'yalnız saman (iğne sayılmaz)');
  assert.equal(h.esya[0][0], esyaKodu('saman'));
  yakin(h.esya[0][1], 2 * 60 * 10 / 2, 6);
  yakin(h.kurus, 60 * 10 / 2, 3);
  assert.equal(h.doldu, false);
  assert.equal(cevrimdisiHesapla(c, 0.5).dk, 0);
  assert.deepEqual(cevrimdisiHesapla(c, -3).esya, []);
});

test('çevrimdışı: 480 dk tavanı ve depoların boş yeriyle kenetleme (oransal dağıtım)', () => {
  const { c } = olcumluDunya(400);
  const h = cevrimdisiHesapla(c, 100000);
  assert.equal(h.dk, 480);
  assert.equal(h.doldu, true);
  const top = h.esya.reduce((s, [, n]) => s + n, 0);
  assert.ok(top <= 800 && top >= 798, `iki sandığın boş yeri 800 (${top})`);
  cevrimdisiIlerle(c, 100000);
  const sandiklar = [...c.parcalar.values()];
  assert.ok(sandiklar.every((p) => p.ozel.toplam >= 399 && p.ozel.toplam <= 400));
});

test('çevrimdışı: değişmeyenler (tarla, gömülü, sipariş, damga, tik) ve saman korunumu', () => {
  const { c, tarla, il } = olcumluDunya(320);
  const e = ekonomiAl(c);
  for (let i = 0; i < 10; i++) teslimEt(c, esyaKodu('saman'));
  const once = {
    h: tarla.h.slice(), pano: JSON.stringify(e.pano), damga: [...il.damgalar], tik: c.tik,
    gomulu: JSON.stringify(c.gomulu), kurus: e.kurus,
    korunum: ciftlikSamani(c, tarla) + tarla.kaldirilan - (c.cevrimdisiKat ?? 0),
  };
  const fis = cevrimdisiIlerle(c, 60);
  assert.ok(fis.esya[0][1] > 0 && fis.kurus > 0);
  assert.deepEqual(tarla.h, once.h);
  assert.equal(JSON.stringify(e.pano), once.pano, 'sipariş çevrimdışı dolmaz');
  assert.deepEqual(il.damgalar, once.damga);
  assert.equal(c.tik, once.tik);
  assert.equal(JSON.stringify(c.gomulu), once.gomulu);
  assert.equal(e.kurus, once.kurus + fis.kurus);
  assert.equal(ciftlikSamani(c, tarla) + tarla.kaldirilan - c.cevrimdisiKat, once.korunum);
  assert.equal(c.cevrimdisiKat, fis.esya[0][1] * 12);
  il.ayarlar.cevrimdisi = false;
  assert.deepEqual(cevrimdisiHesapla(c, 60).esya, [], 'ayar kapalı');
});
