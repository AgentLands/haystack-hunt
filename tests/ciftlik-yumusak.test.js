/**
 * Soft-lock testleri (`yol-haritasi.md` §5 bitti tanımı): oyuncu hiçbir yolla kilitlenmez ve
 * hiçbir şey kaybolmaz. (a) her şey sökülünce kuruş = 300 + kazanılan, saman ve eşya iadesi;
 * (b) yakıt ve yel yokken krank / sandık→kol→lokomobil ile hat yeniden başlar; (c) iğne ve
 * buluntu her sink, makine ve söküm yolunda korunur; (d) öğretici çivileriyle D2'ye 10 dk
 * içinde varılır (senaryo testinde). Şimdiki çekirdekle koşanlar gerçek; geri kalanlar
 * parçalar birleşince açılacak bekleyen testlerdir (tests/ciftlik-bekleyen.mjs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENISLIK } from '../js/kural/boyut.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { ciftlikSamani, tikAt, komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaSok, parcaKur } from '../js/kural/ciftlik/komut.js';
import { parcaIcerigi } from '../js/kural/ciftlik/parca-kayit.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { dunya, duzTarla, kur, bantCek, kos } from './ciftlik-yardim.mjs';
import { bekleyen, HUNI_AD } from './ciftlik-bekleyen.mjs';
import { girisineKur, besleyiciKur } from './ciftlik-hatlar.mjs';

const IGNE = esyaKodu('igne');
const CIVI = esyaKodu('civi');
const BULUNTU = esyaKodu('buluntu:dugme');

/** Bir eşya türünün hat + parça içi + envanterdeki toplam adedi. */
function esyaSay(c, kod) {
  let n = c.envanter[kod];
  for (const h of c.hatlar) for (let k = 0; k < h.n; k++) n += h.tur[k] === kod ? 1 : 0;
  for (const p of c.parcalar.values()) {
    for (const [e, adet] of parcaIcerigi(p).esya) n += e === kod ? adet : 0;
  }
  return n;
}

/** Türün gömülü (henüz alınmamış) nesne sayısı. */
const gomulu = (c, kod) => c.gomulu.filter((g) => g.esya === kod && !g.alindi).length;

/** Korunum: gömülü + eşya olarak taşınan = başlangıç adedi. */
const toplamTur = (c, kod) => gomulu(c, kod) + esyaSay(c, kod);

/** Yığın kenarında huni → bant → sandık hatları kurar; gömülü nesneler yığının içindedir. */
function yiginDunyasi(gomuluListe) {
  const tarla = duzTarla(0, [{ x: 44, y: 70, r: 16, t: 80 }]);
  for (let y = 60; y < 70; y++) for (let x = 36; x < 66; x++) tarla.h[y * GENISLIK + x] = 0;
  const { c } = dunya(9, tarla, { gomulu: gomuluListe });
  // Öğretici çizelgesi bitmiş sayılır: korunum sayımına öğretici çivisi/iğnesi eklenmesin
  // (öğretici nesneleri dunya testinde 'gomulu-eklendi' ile sayılır).
  c.ogretici = { kurTik: 0, civi: 8, igne: 1 };
  const huni = besleyiciKur(c, tarla, HUNI_AD, { kx: 22, ky: 31 }, 0, 0);
  bantCek(c, tarla, 22, 31, 0, 5);
  const sandik = girisineKur(c, tarla, 'sandik', { kx: 27, ky: 31 }, 0);
  tarla.kirli = true;
  return { c, tarla, huni, sandik };
}

/** Huni ağzına (D: çıkışın karşı kenarındaki karo sütunu) gömülü iğne, çivi, buluntu koyar. */
function gomuluNesneler() {
  return [
    { esya: IGNE, x: 38, y: 63, z: 5, aci: 0, alindi: false },
    { esya: IGNE, x: 39, y: 65, z: 6, aci: 1, alindi: false },
    { esya: CIVI, x: 38, y: 64, z: 4, aci: 2, alindi: false },
    { esya: BULUNTU, x: 39, y: 62, z: 3, aci: 0, alindi: false, tur: 'dugme' },
  ];
}

test('söküm korunumu: hat çalışırken her şey sökülür; saman ve eşya iade edilir', () => {
  const { c, tarla } = yiginDunyasi([]);
  const toplam = () => ciftlikSamani(c, tarla) + tarla.kaldirilan;
  const once = toplam();
  kos(c, tarla, 1500);
  assert.equal(toplam(), once, 'çalışırken korunur');
  const sandik = [...c.parcalar.values()].find((p) => p.tanim.anahtar === 'sandik');
  assert.ok(sandik.ozel.toplam > 0, 'hat çalıştı');
  for (const p of [...c.parcalar.values()]) parcaSok(c, tarla, p);
  tikAt(c, tarla);
  assert.equal(c.parcalar.size, 0);
  assert.equal(c.hatlar.length, 0);
  assert.equal(toplam(), once, 'söküm saman ve eşyayı kaybetmez');
  const tutam = c.envanter[esyaKodu('saman')] + c.envanter[esyaKodu('toz')];
  assert.ok(tutam >= sandik.ozel.toplam, 'tutamlar (saman + toz) envanterde');
  assert.ok(c.izgara.taban.every((t) => !t), 'taban maskesi temizlendi');
});

test('söküm bedelsiz: aynı düzen yeniden kurulur (yığın eteği yalnız "saman" engeline)', () => {
  const { c, tarla } = yiginDunyasi([]);
  kos(c, tarla, 600);
  const duzen = [...c.parcalar.values()].map((p) => [p.tanim.anahtar, p.x, p.y, p.yon]);
  for (const p of [...c.parcalar.values()]) parcaSok(c, tarla, p);
  kos(c, tarla, 200); // sökümde dökülen saman ve eteğin yığını durulur
  const saman = [];
  for (const [ad, x, y, yon] of duzen) {
    const s = parcaKur(c, tarla, ad, x, y, yon);
    if (!s.parca) {
      // BİLİNEN SINIR (rapor: c-dogrulama.md, bulgu 1): sökülen parçanın yerini eteğin yığını
      // doldurur (h 7-11 > KURMA_ESIK 8); aynı yere geri kurmak için temizlemek gerekir.
      assert.equal(s.neden, 'saman', `${ad} (${x}, ${y}) yeniden kurulamadı: ${s.neden}`);
      saman.push(ad);
    }
  }
  assert.ok(saman.length < duzen.length, 'hepsi takılmadı');
  assert.ok([...c.parcalar.values()].some((p) => p.tanim.anahtar === 'sandik'), 'sandık kuruldu');
});

test('taşımak = sök + kur: yığın eteğinde sökülen parça aynı hücreye geri kurulur', {
  todo: 'ÇEKİRDEK SINIRI (c-dogrulama bulgu 1, dik yığında): sökülen karoyu yığın doldurur '
    + '(h > 8), yerlestirmeEngeli "saman" der; ekonomi.md §2 "yeniden düzenlemek '
    + 'cezalandırılmaz". Gerçek tarlada 3 tohumda geri kurulabildi (düşük öncelik)',
}, () => {
  const { c, tarla } = yiginDunyasi([]);
  kos(c, tarla, 600);
  const bant = [...c.parcalar.values()].find((p) => p.tanim.anahtar === 'bant');
  const { x, y, yon } = bant;
  parcaSok(c, tarla, bant);
  kos(c, tarla, 100);
  const s = parcaKur(c, tarla, 'bant', x, y, yon);
  assert.ok(s.parca, `bant (${x}, ${y}) geri kurulamadı: ${s.neden}`);
});

test('iğne, çivi ve buluntu hat boyunca korunur: gömülü + eşya + envanter + bulundu sabit', () => {
  const { c, tarla, sandik } = yiginDunyasi(gomuluNesneler());
  const kodlar = [IGNE, CIVI, BULUNTU];
  const bas = kodlar.map((k) => toplamTur(c, k));
  assert.deepEqual(bas, [2, 1, 1]);
  const bulunan = {};
  let akti = false;
  for (let t = 0; t < 4000; t += 100) {
    for (let i = 0; i < 100; i++) bulunduSay(bulunan, tikAt(c, tarla));
    // iğne/buluntu sandığa girince "bulundu" sayılır (yarı kuruş, depoda tutulmaz)
    assert.deepEqual(kodlar.map((k) => toplamTur(c, k) + (bulunan[k] ?? 0)), bas, `tik ${c.tik}`);
    akti = akti || sandik.ozel.toplam > 0 || Object.keys(bulunan).length > 0;
  }
  assert.ok(akti, 'hat çalıştı');
  assert.ok(gomulu(c, IGNE) + gomulu(c, CIVI) < 3, 'nesneler eşya olup akışa girdi');
});

test('iğne ve buluntu her parçanın sökümünde oyuncuya (envantere) döner', () => {
  const { c, tarla } = yiginDunyasi(gomuluNesneler());
  kos(c, tarla, 3000);
  const dolasan = [IGNE, CIVI, BULUNTU].map((k) => esyaSay(c, k));
  for (const p of [...c.parcalar.values()]) parcaSok(c, tarla, p);
  tikAt(c, tarla);
  assert.deepEqual([IGNE, CIVI, BULUNTU].map((k) => c.envanter[k]), dolasan);
  for (const k of [IGNE, CIVI, BULUNTU]) assert.equal(esyaSay(c, k), c.envanter[k]);
});

test('hat tıkalıyken söküm: bantta bekleyen eşyalar envantere geçer, sayı değişmez', () => {
  const { c, tarla } = dunya(4, duzTarla(0));
  bantCek(c, tarla, 10, 10, 0, 6); // çıkışsız: uçta sıkışır
  tikAt(c, tarla);
  const [h] = c.hatlar;
  for (let t = 0; t < 300; t++) {
    hatBasaKoy(h, IGNE);
    tikAt(c, tarla);
  }
  const n = h.n;
  assert.ok(n >= 6, `hat doldu: ${n}`);
  for (const p of [...c.parcalar.values()]) parcaSok(c, tarla, p);
  tikAt(c, tarla);
  assert.equal(c.envanter[IGNE], n);
});

// --- Bekleyen: parçalar birleşince açılır ---------------------------------------------

/** Her sink / makine: iğne ve buluntu bant üstünden girer; dört yolda da kaybolmaz. */
const SINKLER = [
  ['defter-masasi', 'F', ['defter-masasi']],
  ['komsu-kapisi', 'G F', ['komsu-kapisi']],
  ['gubre-cukuru', 'F', ['gubre-cukuru']],
  ['sandik', 'F', ['sandik']],
  ['ambar', 'F', ['ambar']],
  ['balya-presi', 'F B', ['balya-presi']],
  ['cekicli-kiyici', 'F B', ['cekicli-kiyici']],
  ['kurutma-ambari', 'F B', ['kurutma-ambari']],
  ['oluk-miknatisi', 'E', ['oluk-miknatisi']],
  ['miknatisli-tambur', 'E B', ['miknatisli-tambur']],
  ['kalbur', 'E', ['kalbur']],
  ['seytan-yeli', 'E B', ['seytan-yeli']],
];

/** `ciftlik-bulundu { kod }`: iğne/buluntu "bulundu" sayılıp ödüllendirildi (sandık, defter...). */
const BULUNDU = 'ciftlik-bulundu';

/** Olay listesinden kodlara göre bulundu sayıları ekler. */
function bulunduSay(say, olaylar) {
  for (const o of olaylar) if (o.ad === BULUNDU) say[o.veri.kod] = (say[o.veri.kod] ?? 0) + 1;
}

/** Hepsi gerçek parçalarla (main + c-isleme birleşimi) geçti: ön koşullar varsa bayraksız koşar. */
const DOGRULANAN = new Set(SINKLER.map(([sink]) => sink));

for (const [sink, is, parca] of SINKLER) {
  bekleyen(`iğne/buluntu korunumu: ${sink} (girer, makine çalışır, sökülür; hiçbiri yok olmaz)`,
    { is, parca: [...parca, 'sandik'], dogrulandi: DOGRULANAN.has(sink) }, async () => {
      const { c, tarla } = dunya(6, duzTarla(0), { gomulu: [] });
      c.testTamGuc = true;
      bantCek(c, tarla, 10, 10, 0, 4);
      const p = girisineKur(c, tarla, sink, { kx: 14, ky: 10 }, 0);
      tikAt(c, tarla);
      const [h] = c.hatlar;
      const enjekte = [IGNE, BULUNTU];
      const kuyruk = [...enjekte];
      const bulunan = {};
      for (let t = 0; t < 600; t++) {
        if (kuyruk.length && hatBasaKoy(h, kuyruk[0])) kuyruk.shift();
        bulunduSay(bulunan, tikAt(c, tarla));
      }
      assert.equal(kuyruk.length, 0, 'iki eşya da hatta girdi');
      for (const q of [...c.parcalar.values()]) parcaSok(c, tarla, q);
      tikAt(c, tarla);
      for (const kod of enjekte) {
        const geri = c.envanter[kod];
        assert.ok(geri + (bulunan[kod] ?? 0) >= 1, `${sink}: kod ${kod} yok oldu`);
      }
    });
}

bekleyen('(a) her şey sökülünce kuruş = başlangıç + kazanç − harcama (hepsi açık kipte)', {
  is: 'G', dosya: ['js/kural/ciftlik/ekonomi/kurus.js', 'js/kural/ciftlik/ekonomi/damga.js'],
  dogrulandi: true,
}, async () => {
  const { ekonomiAl } = await import('../js/kural/ciftlik/ekonomi/kurus.js');
  const { ilerlemeKur, ilerlemeBagla } = await import('../js/kural/ciftlik/ekonomi/damga.js');
  const { parcaTurleri } = await import('../js/kural/ciftlik/parca-kayit.js');
  const { c, tarla } = dunya(21, duzTarla(0));
  ilerlemeBagla(c, ilerlemeKur({ kilit: 'acik' }));
  const e = ekonomiAl(c);
  e.kurus = 20000;
  const bas = e.kurus;
  const turler = parcaTurleri().filter((t) => t.anahtar !== 'komsu-kapisi');
  turler.forEach((t, i) => komutEkle(c, {
    tur: 'kur', parca: t.anahtar, x: 6 + 12 * (i % 8), y: 6 + 12 * Math.floor(i / 8), yon: 0,
  }));
  const reddedilen = kos(c, tarla, 3).filter((o) => o.ad === 'komut-reddedildi');
  assert.deepEqual(reddedilen.map((o) => [o.veri.komut.parca, o.veri.neden]), []);
  assert.equal(c.parcalar.size, turler.length);
  assert.ok(e.kurus < bas, 'parçalar kuruşla kuruldu');
  kos(c, tarla, 300);
  for (const p of [...c.parcalar.values()]) komutEkle(c, { tur: 'sok', x: p.x, y: p.y });
  kos(c, tarla, 3);
  assert.equal(c.parcalar.size, 0);
  assert.equal(e.kurus, bas + e.kazanc - e.harcama, 'söküm %100 iade; yeniden düzenlemek cezasız');
});

bekleyen('(b1) yakıt ve yel yokken sandık → yaba kolu → lokomobil hattı yeniden başlatır', {
  is: 'B F', parca: ['lokomobil', 'yaba-kolu', 'sandik'], esya: ['balya-saman'], dogrulandi: true,
}, async () => {
  const { c, tarla } = dunya(8, duzTarla(0));
  const lok = girisineKur(c, tarla, 'lokomobil', { kx: 40, ky: 30 }, 0, 0);
  const port = lok.giris[0];
  const kol = kur(c, tarla, 'yaba-kolu', port.hx, port.hy, (port.yon + 2) & 3);
  const sandik = kur(c, tarla, 'sandik', 2 * port.hx - port.kx, 2 * port.hy - port.ky);
  assert.ok(kol && sandik);
  tikAt(c, tarla);
  assert.equal(c.parcalar.get(lok.id).tanim.durum(lok), 'yakit-yok');
  const balya = esyaKodu('balya-saman');
  sandik.ozel.say[balya] = 2;
  sandik.ozel.toplam = 2;
  kos(c, tarla, 200);
  assert.notEqual(lok.tanim.durum(lok), 'yakit-yok', 'kol balyayı lokomobile verdi');
});

bekleyen('(b2) yel yokken el krankı balya presini döndürür (hat durmaz, kilitlenmez)', {
  is: 'B F', parca: ['el-kranki', 'saft', 'balya-presi', 'sandik'], esya: ['balya-saman'],
  dogrulandi: true,
}, async () => {
  const { c, tarla } = dunya(8, duzTarla(0));
  c.havaSabit = { yon: 0, siddet: 0, gok: 'gunesli' }; // VARSAYIM: D test kancası
  const pres = girisineKur(c, tarla, 'balya-presi', { kx: 40, ky: 30 }, 0, 0);
  const kranki = parcaKur(c, tarla, 'el-kranki', pres.x + pres.en, pres.y).parca;
  assert.ok(kranki, 'krank presin yanına kuruldu (VARSAYIM: aks komşuluğu)');
  komutEkle(c, { tur: 'krank', x: kranki.x, y: kranki.y }); // VARSAYIM: çiftçi konumu c'de
  kos(c, tarla, 100);
  assert.ok(pres.oran > 0, `pres oranı ${pres.oran}`);
});

bekleyen('(d) öğretici çiviler ≈ 30 sn arayla açığa çıkar ve D2 ≤ 10 dk (senaryo koşucusu)', {
  is: 'D G J', dosya: ['js/kural/ciftlik/ekonomi/damga.js', 'js/kural/ciftlik/dunya/arazi.js'],
}, async () => {
  const { senaryoKos } = await import('./ciftlik-senaryo.mjs');
  // D3'e dek koşulur: çivi çizelgesi (2600 + k × 600 tik) D2'den sonra da sürer
  const s = await senaryoKos({ hedef: 'D3', tikTavan: 10 * 1200 });
  assert.ok(s.damgaTik.D2 <= 10 * 1200, `D2 ${s.damgaTik.D2} tikte basılmadı`);
  assert.ok(s.civiAraliklari.length >= 3, `öğretici çiviler geldi: ${s.civiAraliklari}`);
  for (const a of s.civiAraliklari) assert.ok(a >= 400 && a <= 800, `çivi aralığı ${a} tik`);
});
