/** Çiftlik ayıklama: esyalar.md §3 ayırma haritası (satır başına test), oluk mıknatısı, tambur,
 * kalbur (sıva), tınaz (yön × şiddet), şeytan yeli, iş süreleri, güç, korunum, kayıt. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DX, DY, tersYon } from '../js/kural/ciftlik/olcu.js';
import { esyaKodu, esyaTurleri } from '../js/kural/ciftlik/esya.js';
import { KATALOG } from '../js/kural/buluntu.js';
import { tikAt, komutEkle, ciftlikSamani } from '../js/kural/ciftlik/benzetim.js';
import { parcaIcerigi, parcaDurumu } from '../js/kural/ciftlik/parca-kayit.js';
import { hatBasaKoy } from '../js/kural/ciftlik/tasima/hat-adim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import { TUTUCU_YUVA } from '../js/kural/ciftlik/ayiklama/ayirma.js';
import { dunya, kur, bantCek, duzTarla, gucVer, havaSabitle } from './ciftlik-yardim.mjs';
import { toplamaBulunan } from './ciftlik-isleme-yardim.mjs';

const ruzgarAyarla = (yon, siddet) => havaSabitle({ yon, siddet }); // yon: gittiği yön
ruzgarAyarla(1, 2); // dosyanın varsayılanı (eski sap): güneye 2
const K = (ad) => esyaKodu(ad);
const BULUNTULAR = KATALOG.map((b) => K(`buluntu:${b.tur}`));
const IGNELER = [K('igne'), K('cuvaldiz'), K('altin-igne')];

/**
 * Sahne: makine (30, 30)'da; girişin arkasında 3 bant; her çıkışta bir sandık
 * (sandikYok: bu çıkış numaralarına sandık konmaz). d.kuyruk eşyaları sırayla hatta basılır.
 * Güç isteyen makineye gerçek enerji (şaft + yel değirmeni) bağlanır; `guc: false` ise
 * şebekesiz bırakılır (oran 0), `oran` < 1024 ise şebeke o orana düşürülür (gucVer).
 */
function sahne(anahtar, { yon = 0, sandikYok = [], guc = true, oran = 1024 } = {}) {
  const { c, tarla } = dunya();
  const p = kur(c, tarla, anahtar, 30, 30, yon);
  const sandiklar = p.cikis.map((o, i) => (sandikYok.includes(i) ? null
    : kur(c, tarla, 'sandik', o.hx, o.hy)));
  const g = p.giris[0];
  bantCek(c, tarla, g.hx + DX[g.yon] * 2, g.hy + DY[g.yon] * 2, tersYon(g.yon), 3);
  if (guc && p.tanim.guc > 0) gucVer(c, tarla, p, { oran });
  return { c, tarla, p, sandiklar, kuyruk: [], sonsuz: 0 };
}

const girisHat = (d) => d.c.hatlar.find((h) => h.cikis?.parca === d.p);
/** Sandığa giren tür sayısı (iğne/buluntu "bulundu" sayılır, ozel.bulunan'da; F kuralı). */
const say = (s, kod) => (s ? (s.ozel.say[kod] ?? 0) + (s.ozel.bulunan?.[kod] ?? 0) : 0);

/** n tik; her tik kuyruktaki (ya da sonsuz) eşyayı hat başına koymayı dener. */
function kos(d, n) {
  const olaylar = [];
  for (let i = 0; i < n; i++) {
    const h = girisHat(d);
    if (h && d.kuyruk.length && hatBasaKoy(h, d.kuyruk[0])) d.kuyruk.shift();
    else if (h && d.sonsuz) hatBasaKoy(h, d.sonsuz);
    olaylar.push(...tikAt(d.c, d.tarla));
  }
  return olaylar;
}

/** Tek eşyayı verip hangi çıkıştan gittiğini döndürür (-1: hiçbiri). */
function yol(anahtar, kod, secenek) {
  const d = sahne(anahtar, secenek);
  d.kuyruk.push(kod);
  kos(d, 60);
  return d.sandiklar.findIndex((s) => say(s, kod) === 1);
}

// --- esyalar.md §3 ayırma haritası: her satır, her ayıklayıcı için ---
const HARITA = [
  // eşya, hafiflik (hafif | cok | agir), manyetik, ince
  ['saman', 'hafif', false, false], ['toz', 'cok', false, true],
  ['yas-ot', 'agir', false, false], ['igne', 'agir', true, true],
  ['cuvaldiz', 'agir', true, false], ['altin-igne', 'agir', false, true],
  ['civi', 'agir', true, false], ['tas', 'agir', false, false],
];

for (const [ad, haf, mik, ince] of HARITA) {
  test(`ayırma haritası: ${ad}`, () => {
    const kod = K(ad);
    assert.equal(yol('miknatisli-tambur', kod), mik ? 1 : 0, 'tambur');
    assert.equal(yol('kalbur', kod), ince ? 1 : 0, 'kalbur');
    assert.equal(yol('seytan-yeli', kod), { hafif: 0, cok: 1, agir: 2 }[haf], 'şeytan yeli');
    ruzgarAyarla(1, 2); // dik rüzgâr (güneye): savrulan sağdan çıkar
    assert.equal(yol('tinaz', kod), haf === 'agir' ? 0 : 2, 'tınaz');
    const d = sahne('oluk-miknatisi');
    d.kuyruk.push(kod);
    kos(d, 60);
    assert.deepEqual(d.p.ozel.tutucu, mik ? [kod] : [], 'oluk tutucusu');
    assert.equal(say(d.sandiklar[0], kod), mik ? 0 : 1, 'oluk geçişi');
  });
}

test('klasik bulmacalar: iğne ↔ çivi kalburla; altın iğne mıknatısı geçer; toka taklitçi', () => {
  assert.equal(yol('miknatisli-tambur', K('igne')), yol('miknatisli-tambur', K('civi')));
  assert.notEqual(yol('kalbur', K('igne')), yol('kalbur', K('civi')));
  assert.equal(yol('miknatisli-tambur', K('altin-igne')), 0);
  assert.equal(yol('kalbur', K('altin-igne')), 1, 'mıknatıstan geçen ağır akışta kalbur ince');
  // toka iğnenin taklitçisi: hiçbir kaba yol ayıramaz (yalnız tür filtresi)
  const toka = K('buluntu:toka');
  for (const ayik of ['miknatisli-tambur', 'kalbur', 'seytan-yeli']) {
    assert.equal(yol(ayik, toka), yol(ayik, K('igne')), `toka = iğne (${ayik})`);
  }
  // tüy, mektup, yonca tozla savrulur
  for (const t of ['tuy', 'mektup', 'yonca']) {
    assert.equal(yol('seytan-yeli', K(`buluntu:${t}`)), yol('seytan-yeli', K('toz')), t);
  }
});

// --- Oluk mıknatısı ---
test('oluk mıknatısı: tutucu 6 yuva; dolunca manyetikler geçer; doymuş rozeti ve olay', () => {
  assert.equal(TUTUCU_YUVA, 6);
  const d = sahne('oluk-miknatisi');
  d.kuyruk.push(...Array(8).fill(K('civi')), K('saman'));
  const olaylar = kos(d, 200);
  assert.equal(d.p.ozel.tutucu.length, 6);
  assert.equal(say(d.sandiklar[0], K('civi')), 2, '7. ve 8. çivi geçti');
  assert.equal(say(d.sandiklar[0], K('saman')), 1);
  assert.equal(parcaDurumu(d.p), 'doymus');
  assert.equal(olaylar.filter((o) => o.ad === 'tutucu-doldu').length, 1);
  assert.deepEqual(d.p.tanim.doluluk(d.p), { n: 6, kap: 6 });
});

test('oluk mıknatısı: bant hızında geçirir (düz bantla aynı kararlı verim ±1)', () => {
  const pencere = (sandik, adim) => {
    for (let i = 0; i < 300; i++) adim();
    const bas = say(sandik, K('saman'));
    for (let i = 0; i < 1200; i++) adim();
    return say(sandik, K('saman')) - bas;
  };
  const d = sahne('oluk-miknatisi');
  d.sonsuz = K('saman');
  const oluk = pencere(d.sandiklar[0], () => kos(d, 1));
  const { c, tarla } = dunya();
  bantCek(c, tarla, 27, 30, 0, 4);
  const sandik = kur(c, tarla, 'sandik', 31, 30);
  const kontrol = pencere(sandik, () => {
    if (c.hatlar[0]) hatBasaKoy(c.hatlar[0], K('saman'));
    tikAt(c, tarla);
  });
  assert.ok(Math.abs(oluk - kontrol) <= 1, `oluk ${oluk} kontrol ${kontrol}`);
  assert.ok(oluk >= 268, `bant hızı 4,5/sn (270/dk): ${oluk}`);
});

test('Boşalt: iğne ve buluntu envantere (olayla), çivi atılır; reddedilen hedef', () => {
  const d = sahne('oluk-miknatisi');
  const toka = K('buluntu:toka');
  d.kuyruk.push(K('igne'), K('civi'), K('civi'), K('cuvaldiz'), toka, K('buluntu:nal'));
  kos(d, 150);
  assert.equal(d.p.ozel.tutucu.length, 6);
  komutEkle(d.c, { tur: 'bosalt', x: d.p.x, y: d.p.y });
  komutEkle(d.c, { tur: 'bosalt', x: 5, y: 5 });
  const olaylar = kos(d, 1);
  const bos = olaylar.find((o) => o.ad === 'tutucu-bosaldi').veri;
  assert.equal(bos.atilan, 2);
  assert.deepEqual([...bos.bulunan].sort(), [K('igne'), K('cuvaldiz'), toka, K('buluntu:nal')]
    .sort());
  assert.equal(d.c.envanter[K('igne')], 1);
  assert.equal(d.c.envanter[toka], 1);
  assert.equal(d.c.envanter[K('civi')], 0, 'çivi atıldı');
  const tam = olaylar.filter((o) => o.ad === 'ciftlik-bulundu').map((o) => o.veri.kip);
  assert.deepEqual(tam, ['tam', 'tam', 'tam', 'tam'], 'Boşalt "bulundu" tam öder (G)');
  assert.equal(parcaDurumu(d.p), 'calisiyor');
  assert.equal(olaylar.find((o) => o.ad === 'komut-reddedildi').veri.neden, 'bos');
  komutEkle(d.c, { tur: 'bosalt', x: 30 - 3, y: 30 });
  assert.equal(kos(d, 1).find((o) => o.ad === 'komut-reddedildi').veri.neden, 'bosaltilamaz');
});

test('oluk mıknatısı: cek (yaba kolu) filtreli alır; söküm tutucuyu envantere verir', () => {
  const d = sahne('oluk-miknatisi');
  d.kuyruk.push(K('civi'), K('igne'), K('civi'));
  kos(d, 100);
  const igne = d.p.tanim.cek(d.p, (k) => k === K('igne'));
  assert.equal(igne, K('igne'));
  assert.equal(d.p.tanim.cek(d.p, (k) => k === K('igne')), 0);
  assert.deepEqual(parcaIcerigi(d.p).esya, [[K('civi'), 2]].flatMap(([k, n]) =>
    Array(n).fill([k, 1])));
  komutEkle(d.c, { tur: 'sok', x: d.p.x, y: d.p.y });
  kos(d, 1);
  assert.equal(d.c.envanter[K('civi')], 2);
});

// --- Mıknatıslı tambur ---
test('tambur: doymaz (50 çivi hepsi sağdan); güçsüz durur; yan çıkış dolu akışı durdurur', () => {
  const d = sahne('miknatisli-tambur');
  d.kuyruk.push(...Array(50).fill(K('civi')));
  kos(d, 600);
  assert.equal(say(d.sandiklar[1], K('civi')), 50);
  const g = sahne('miknatisli-tambur', { guc: false }); // şebekesiz: oran 0
  g.kuyruk.push(K('saman'));
  kos(g, 300);
  assert.equal(g.p.oran, 0);
  assert.equal(say(g.sandiklar[0], K('saman')), 0, 'güçsüz durur');
  assert.equal(parcaDurumu(g.p), 'calisiyor', 'durum güç oranına bakmaz (talep döngüsü yok)');
  gucVer(g.c, g.tarla, g.p); // enerji bağlanınca kaldığı yerden sürer
  kos(g, 10);
  assert.equal(g.p.oran, 1024);
  assert.equal(say(g.sandiklar[0], K('saman')), 1);
  const k = sahne('miknatisli-tambur', { sandikYok: [1] });
  k.kuyruk.push(K('civi'), K('saman'), K('saman'));
  kos(k, 400);
  assert.equal(say(k.sandiklar[0], K('saman')), 0, 'bekleyen manyetik bütün akışı durdurur');
  assert.equal(parcaDurumu(k.p), 'cikis-dolu');
});

// --- Kalbur ---
test('kalbur: yaş ot sıvar; sıva 4 iken her şey öne; yaş ot gelmeyen her 200 tikte -1', () => {
  const d = sahne('kalbur');
  d.kuyruk.push(...Array(4).fill(K('yas-ot')), K('igne'));
  const olaylar = kos(d, 200);
  assert.equal(d.p.ozel.siva, 4);
  assert.equal(parcaDurumu(d.p), 'sivali');
  assert.equal(say(d.sandiklar[0], K('igne')), 1, 'sıvalı: ince iğne de öne gitti');
  assert.equal(olaylar.filter((o) => o.ad === 'kalbur-sivandi').length, 1);
  d.p.ozel.sivaSure = 0;
  kos(d, 199);
  assert.equal(d.p.ozel.siva, 4);
  kos(d, 1);
  assert.equal(d.p.ozel.siva, 3, '200. tikte -1');
  d.kuyruk.push(K('igne'));
  kos(d, 60);
  assert.equal(say(d.sandiklar[1], K('igne')), 1, 'sıva 3: delikler açık, ince sağdan');
  kos(d, 600);
  assert.equal(d.p.ozel.siva, 0);
  d.p.ozel.siva = 3;
  d.p.ozel.sivaSure = 150;
  d.kuyruk.push(K('yas-ot'));
  kos(d, 40);
  assert.equal(d.p.ozel.siva, 4, 'yaş ot sıvayı +1 yapar');
  assert.ok(d.p.ozel.sivaSure < 50, 'yaş ot sayacı sıfırlar');
  for (let i = 0; i < 10; i++) d.kuyruk.push(K('yas-ot'));
  kos(d, 100);
  assert.equal(d.p.ozel.siva, 8, 'sıva tavanı');
});

// --- Tınaz: yön × şiddet (16 durum) ---
test('tınaz: rüzgâr yönü × şiddet tablosu (16 durum), eksene dik ve yanında savrulur', () => {
  // beklenen çıkış [saman (hafif), toz (çok hafif), taş (ağır)]; 0 dip, 1 sol, 2 sağ
  const dik = (yan) => [[0, 0, 0], [0, yan, 0], [yan, yan, 0], [yan, yan, 0]];
  const beklenen = {
    0: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], // doğu: eksen boyunca
    1: dik(2), // güneye: sağdan
    2: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], // batı: eksen boyunca
    3: dik(1), // kuzeye: soldan
  };
  const kodlar = [K('saman'), K('toz'), K('tas')];
  for (const r of [0, 1, 2, 3]) {
    for (let s = 0; s < 4; s++) {
      ruzgarAyarla(r, s);
      const sonuc = kodlar.map((kod) => yol('tinaz', kod));
      assert.deepEqual(sonuc, beklenen[r][s], `rüzgâr yönü ${r}, şiddet ${s}`);
    }
  }
  ruzgarAyarla(0, 2); // döndürülmüş tınaz (güneye bakar): doğu rüzgârı dik, sağ = batı
  assert.deepEqual(kodlar.map((kod) => yol('tinaz', kod, { yon: 1 })), [1, 1, 0]);
  ruzgarAyarla(2, 2);
  assert.deepEqual(kodlar.map((kod) => yol('tinaz', kod, { yon: 1 })), [2, 2, 0]);
});

test('tınaz: savrulma yanı kapalıysa akış durur; rüzgâr dönünce dipten akar; panel yazısı', () => {
  ruzgarAyarla(1, 3);
  const d = sahne('tinaz', { sandikYok: [2] });
  d.kuyruk.push(K('saman'), K('tas'));
  kos(d, 200);
  assert.equal(say(d.sandiklar[0], K('tas')), 0, 'sağ yan dolu: arkadaki taş da bekler');
  assert.equal(parcaDurumu(d.p), 'cikis-dolu');
  assert.equal(d.p.tanim.incele(d.p).at(-1)[1], 'Dik rüzgâr: toz ve saman ayrılıyor');
  ruzgarAyarla(0, 3);
  kos(d, 20);
  assert.equal(say(d.sandiklar[0], K('saman')), 1);
  assert.equal(say(d.sandiklar[0], K('tas')), 1);
  assert.equal(d.p.tanim.incele(d.p).at(-1)[1], 'Paralel: hepsi dipten');
});

// --- Şeytan yeli ---
test('şeytan yeli: üç yol (ön hafif, sol çok hafif, sağ ağır); tüy ve yonca solda', () => {
  const d = sahne('seytan-yeli');
  const girdi = [K('saman'), K('kuru-ot'), K('toz'), K('buluntu:tuy'), K('yas-ot'), K('civi')];
  d.kuyruk.push(...girdi);
  kos(d, 200);
  assert.equal(say(d.sandiklar[0], K('saman')) + say(d.sandiklar[0], K('kuru-ot')), 2);
  assert.equal(say(d.sandiklar[1], K('toz')) + say(d.sandiklar[1], K('buluntu:tuy')), 2);
  assert.equal(say(d.sandiklar[2], K('yas-ot')) + say(d.sandiklar[2], K('civi')), 2);
});

// --- İş süreleri (tik) ve güç oranı ---
const SURELER = [['miknatisli-tambur', 5], ['kalbur', 6], ['tinaz', 4], ['seytan-yeli', 6]];

for (const [anahtar, sure] of SURELER) {
  test(`${anahtar}: eşya başına ${sure} tik (±1); sürekli beslemede ${1200 / sure}/dk`, () => {
    ruzgarAyarla(1, 3);
    const e = sahne(anahtar);
    assert.equal(parcaDurumu(e.p), 'girdi-yok');
    e.p.tanim.al(e.p, 0, K('civi'), { olay() {}, ver: () => false });
    assert.equal(parcaDurumu(e.p), 'calisiyor');
    let t = 0;
    while (parcaDurumu(e.p) === 'calisiyor' && t < 50) {
      tikAt(e.c, e.tarla);
      t++;
    }
    assert.ok(Math.abs(t - sure) <= 1, `${t} tik (beklenen ${sure})`);
    if (anahtar === 'tinaz') return; // tınaz bantı (4,4 tik/eşya) aşar: bant sınırlar
    const s = sahne(anahtar);
    s.sonsuz = K('saman');
    kos(s, 400);
    const bas = s.sandiklar.reduce((n, x) => n + (x ? x.ozel.toplam : 0), 0);
    kos(s, 1200);
    const son = s.sandiklar.reduce((n, x) => n + (x ? x.ozel.toplam : 0), 0);
    assert.ok(Math.abs(son - bas - 1200 / sure) <= 1, `${son - bas}/dk`);
  });
}

test('güç oranı: 512 → süre ikiye katlanır; oran 0 → ilerlemez (tambur, şeytan yeli)', () => {
  for (const [anahtar, sure] of [['miknatisli-tambur', 5], ['seytan-yeli', 6]]) {
    const d = sahne(anahtar, { oran: 512 });
    d.p.tanim.al(d.p, 0, K('saman'), { olay() {} });
    let t = 0;
    while (parcaDurumu(d.p) === 'calisiyor' && t < 80) {
      tikAt(d.c, d.tarla);
      t++;
    }
    assert.equal(d.p.oran, 512, 'şebeke oranı gerçekten 512');
    assert.ok(Math.abs(t - 2 * sure) <= 1, `${anahtar}: ${t}`);
    // şebekesiz makine (oran 0) ilerlemez
    const g = sahne(anahtar, { guc: false });
    g.p.tanim.al(g.p, 0, K('saman'), { olay() {} });
    kos(g, 100);
    assert.equal(g.p.ozel.ilerleme, 0, `${anahtar}: oran 0 ilerlemez`);
  }
});

// --- Korunum: iğne, buluntu ve saman hiçbir yolda yok olmaz ---
function envanterToplam(c) {
  const t = new Map();
  const ekle = (kod, n) => t.set(kod, (t.get(kod) ?? 0) + n);
  for (const h of c.hatlar) for (let k = 0; k < h.n; k++) ekle(h.tur[k], 1);
  for (const p of c.parcalar.values()) for (const [kod, n] of parcaIcerigi(p).esya) ekle(kod, n);
  c.envanter.forEach((n, kod) => { if (n) ekle(kod, n); });
  return t;
}

const TUMU = [...IGNELER, ...BULUNTULAR, K('civi'), K('tas'), K('saman'), K('toz'), K('yas-ot')];

for (const anahtar of ['oluk-miknatisi', 'miknatisli-tambur', 'kalbur', 'tinaz', 'seytan-yeli']) {
  test(`korunum: ${anahtar} hiçbir eşyayı yok etmez (akarken ve sökülünce)`, () => {
    for (const sokTik of [0, 17, 90]) {
      ruzgarAyarla(1, 2);
      const d = sahne(anahtar);
      d.kuyruk.push(...TUMU, ...TUMU);
      const olaylar = [];
      for (let i = 0; i < 160; i++) {
        if (sokTik && i === sokTik) komutEkle(d.c, { tur: 'sok', x: d.p.x, y: d.p.y });
        olaylar.push(...kos(d, 1));
      }
      olaylar.push(...kos(d, 100));
      const toplam = envanterToplam(d.c);
      // Sandık iğne/buluntuyu tutmaz, "bulundu" sayar (F kuralı): onlar da korunmuş sayılır.
      const sinkte = toplamaBulunan(olaylar);
      const kuyrukta = new Map();
      for (const kod of d.kuyruk) kuyrukta.set(kod, (kuyrukta.get(kod) ?? 0) + 1);
      for (const kod of TUMU) {
        const n = (toplam.get(kod) ?? 0) + (kuyrukta.get(kod) ?? 0) + (sinkte.get(kod) ?? 0);
        assert.equal(n, 2,
          `${anahtar} sök@${sokTik}: kod ${kod}`);
      }
      assert.equal(ciftlikSamani(d.c, d.tarla) + d.tarla.kaldirilan, [...toplam].reduce(
        (n, [kod, say2]) => n + say2 * (esyaTurleri().find((e) => e.kod === kod)?.saman ?? 0), 0));
    }
  });
}

// --- Kayıt ---
test('kaydet → yükle → sürdür: beş ayıklayıcı zinciri bit bit aynı (yuva, tutucu, sıva)', () => {
  ruzgarAyarla(1, 2);
  const kur2 = () => {
    const { c, tarla } = dunya(9, duzTarla());
    const adlar = ['oluk-miknatisi', 'miknatisli-tambur', 'kalbur', 'tinaz', 'seytan-yeli'];
    adlar.forEach((ad, i) => {
      const p = kur(c, tarla, ad, 10, 10 + 8 * i);
      bantCek(c, tarla, 7, p.giris[0].hy, 0, 3);
      p.cikis.forEach((o) => kur(c, tarla, 'sandik', o.hx, o.hy));
    });
    return { c, tarla };
  };
  const besle = (d, i) => {
    for (const h of d.c.hatlar) {
      if (h.cikis?.tur === 'port' && i % 5 === 0) {
        hatBasaKoy(h, TUMU[(i / 5 + h.id) % TUMU.length | 0]);
      }
    }
    tikAt(d.c, d.tarla);
  };
  const a = kur2();
  for (let i = 0; i < 400; i++) besle(a, i);
  const sandikta = [...a.c.parcalar.values()].filter((p) => p.tanim.anahtar === 'sandik')
    .reduce((n, p) => n + p.ozel.toplam, 0);
  assert.ok(sandikta >= 20, `zincirler eşya geçirmeli: ${sandikta}`);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(a.c, a.tarla)));
  const tarla = duzTarla();
  const { c } = dunyaCoz(kayit, tarla);
  const b = { c, tarla };
  assert.equal(dunyaOzeti(b.c, b.tarla), dunyaOzeti(a.c, a.tarla));
  for (let i = 400; i < 900; i++) { besle(a, i); besle(b, i); }
  assert.equal(dunyaOzeti(b.c, b.tarla), dunyaOzeti(a.c, a.tarla));
});
