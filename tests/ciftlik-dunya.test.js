/**
 * Çiftlik dünyası (kural/ciftlik/dunya/): normal tarlaKur izi AYNI (tarlaKurAyar çıkarımı),
 * arazi (çayır, kapı, döküm adayları), gömülü yoğunluğu (3 tohum), yuvarlanma, harman
 * arabası, çayır genişletme, öğretici çizelgesi (ilk iğne 4-8. dakika, çiviler 30 sn arayla),
 * kaynaklı saman korunumu 5000 tikte birebir, iğne/buluntu korunumu ve kayıt gidiş-dönüşü.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarlaKur } from '../js/kural/tarla.js';
import { ozetKat, OZET_BASI, KARO, KARO_EN, KARO_BOY } from '../js/kural/ciftlik/olcu.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli } from '../js/kural/ciftlik/izgara.js';
import { ciftlikSamani, komutEkle, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import {
  CAYIR, ZEMIN, zeminAl, bedelBagla, dunyaHazirla,
} from '../js/kural/ciftlik/dunya/arazi.js';
import { GOMULU_SAYI, yuvarla, igneMi } from '../js/kural/ciftlik/dunya/gomulu.js';
import { ARABA } from '../js/kural/ciftlik/dunya/araba.js';
import { OGRETICI } from '../js/kural/ciftlik/dunya/ogretici.js';
import { dunya, duzTarla, kur, kos } from './ciftlik-yardim.mjs';
import { gercekDunya, ogreticiHatti, ETIKETLER, degerliSay } from './ciftlik-dunya-yardim.mjs';

const W = 240;
const CIVI = esyaKodu('civi');
const TAS = esyaKodu('tas');
const gercekler = new Map(ETIKETLER.map((e) => [e, null]));
/** Gerçek dünya kurulumu pahalı (≈ 200 ms): etiket başına bir kez, testler kopyalamaz. */
const yeniGercek = (e) => gercekDunya(e);

test('normal tarlaKur izi tarlaKurAyar çıkarımından sonra AYNI (9 tarla)', () => {
  let s = OZET_BASI;
  for (const et of ['a', 'gun-2026-11-01', 'zxq']) {
    for (const z of ['kolay', 'normal', 'zor']) {
      const t = tarlaKur(et.length * 7919 + et.charCodeAt(0), z);
      s = ozetKat(ozetKat(s, t.h), t.doku);
      const j = JSON.stringify([t.igne, t.civiler, t.baslangicToplam, t.adim, t.zorluk, t.kirli]);
      for (let i = 0; i < j.length; i++) s = ozetKat(s, j.charCodeAt(i));
    }
  }
  assert.equal(s, 245577178, 'çıkarımdan önce ölçülen iz');
});

test('arazi (3 tohum): çayır köşede 12 kat, kapı garajın karşı kenarında, adaylar', () => {
  for (const e of ETIKETLER) {
    const d = yeniGercek(e);
    gercekler.set(e, d);
    const { c, tarla, garaj, yasak } = d;
    const { cayir, kapi, dokum } = c.arazi;
    assert.deepEqual([cayir.en, cayir.boy], [CAYIR.en, CAYIR.boy]);
    assert.ok(cayir.x === 1 || cayir.x + cayir.en === KARO_EN - 1, `${e} köşe x`);
    assert.ok(cayir.y === 1 || cayir.y + cayir.boy === KARO_BOY - 1, `${e} köşe y`);
    for (let y = cayir.y * KARO; y < (cayir.y + cayir.boy) * KARO; y++) {
      for (let x = cayir.x * KARO; x < (cayir.x + cayir.en) * KARO; x++) {
        assert.equal(tarla.h[y * W + x], CAYIR.kat);
        assert.equal(zeminAl(c, x >> 1, y >> 1), ZEMIN.CAYIR);
      }
    }
    const karsi = (garaj.kenar + 2) & 3;
    const kenarda = [kapi.y === 1, kapi.x === KARO_EN - 3, kapi.y === KARO_BOY - 3, kapi.x === 1];
    assert.ok(kenarda[karsi], `${e}: kapı garajın (kenar ${garaj.kenar}) karşısında`);
    const ic = (r, x, y) => x >= r.x && x < r.x + r.en && y >= r.y && y < r.y + r.boy;
    assert.ok(!ic(cayir, kapi.x, kapi.y) && !ic(cayir, kapi.x + 1, kapi.y + 1), 'kapı çayırda');
    const gx = Math.max(cayir.x * KARO, Math.min(yasak.x, (cayir.x + cayir.en) * KARO));
    const gy = Math.max(cayir.y * KARO, Math.min(yasak.y, (cayir.y + cayir.boy) * KARO));
    assert.ok((gx - yasak.x) ** 2 + (gy - yasak.y) ** 2 > yasak.r ** 2, 'çayır garaja değmez');
    assert.equal(dokum.length, 8);
    assert.ok(dokum.every(([x, y]) => zeminAl(c, x, y) === ZEMIN.HARMAN));
    assert.equal(tarla.baslangicToplam, tarla.h.reduce((s, v) => s + v, 0));
  }
});

test('gömülü yoğunluk (3 tohum): sayılar tam, h ≥ 25 harman, aralık 4 / iğne ailesi 6', () => {
  for (const e of ETIKETLER) {
    const { c, tarla } = gercekler.get(e) ?? yeniGercek(e);
    const say = (f) => c.gomulu.filter(f).length;
    assert.equal(say((g) => g.esya === CIVI), GOMULU_SAYI.civi, `${e} çivi`);
    assert.equal(say((g) => g.esya === TAS), GOMULU_SAYI.tas, `${e} taş`);
    assert.equal(say((g) => g.tur), GOMULU_SAYI.buluntu, `${e} buluntu`);
    assert.equal(say((g) => g.esya === esyaKodu('igne')), GOMULU_SAYI.igne, `${e} iğne`);
    assert.equal(say((g) => g.esya === esyaKodu('cuvaldiz')), 1);
    assert.ok(say((g) => g.esya === esyaKodu('altin-igne')) <= 1);
    for (const g of c.gomulu) {
      const h = tarla.h[g.y * W + g.x];
      assert.ok(h >= 25 && g.z < h && g.z >= Math.floor(h * 0.1), `${e} derinlik`);
      assert.equal(zeminAl(c, g.x >> 1, g.y >> 1), ZEMIN.HARMAN);
    }
    const igneler = c.gomulu.filter((g) => igneMi(g.esya));
    for (let i = 0; i < c.gomulu.length; i++) {
      for (let j = i + 1; j < c.gomulu.length; j++) {
        const a = c.gomulu[i];
        const b = c.gomulu[j];
        const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        assert.ok(d2 >= 16, `${e}: aralık`);
        if (igneler.includes(a) && igneler.includes(b)) assert.ok(d2 >= 36, 'iğne aralığı');
      }
    }
  }
});

test('çayır karosunda kurma eşiği yok (ayakta ot 12 kat), harmanda var', () => {
  const { c, tarla } = dunya(1, duzTarla(12));
  const a = dunyaHazirla(c);
  for (let ky = 10; ky < 12; ky++) for (let kx = 10; kx < 12; kx++) a.zemin[ky * 120 + kx] = 1;
  kur(c, tarla, 'huni', 10, 10, 0);
  assert.throws(() => kur(c, tarla, 'huni', 20, 10, 0), /saman/);
});

test('yuvarlanma: açıkta z := h, en alçak komşu ≥ 2 alçaksa oraya; taban duvar', () => {
  const tarla = duzTarla(10);
  const g = (x, y, z) => ({ esya: CIVI, x, y, z, aci: 0, alindi: false });
  const yuv = g(50, 50, 12);
  const sig = g(60, 50, 10);
  const ortulu = g(70, 50, 4);
  const duvar = g(81, 50, 10);
  tarla.h[50 * W + 51] = 8;
  tarla.h[50 * W + 49] = 7;
  tarla.h[50 * W + 61] = 9;
  tarla.h[50 * W + 71] = 0;
  tarla.h[50 * W + 82] = 0;
  for (const y of [50, 51]) for (const x of [82, 83]) tarla.h[y * W + x] = 0;
  const { c } = dunya(2, tarla, { gomulu: [yuv, sig, ortulu, duvar] });
  kur(c, tarla, 'sandik', 41, 25);
  yuvarla(c, tarla);
  assert.deepEqual([yuv.x, yuv.z], [49, 7], 'en alçak (batı 7) komşuya, z := h');
  assert.deepEqual([sig.x, sig.z], [60, 10], 'fark 1: kalır');
  assert.deepEqual([ortulu.x, ortulu.z], [70, 4], 'örtülü (h > z) kalır');
  assert.equal(duvar.x, 81, 'parça tabanına yuvarlanmaz');
});

test('harman arabası: 6000 tikte yoklama, eşik, duyuru → 600 tik → döküm; korunum sayacı', () => {
  const { c, tarla } = dunya(4, duzTarla(0));
  const a = dunyaHazirla(c);
  a.dokum = [[20, 20], [60, 40]];
  kur(c, tarla, 'sandik', 22, 22);
  a.baslangicStok = 0;
  c.tuketilenKat = ARABA.esik - 1;
  const once = ciftlikSamani(c, tarla);
  kos(c, tarla, ARABA.yoklama + 1);
  assert.equal(c.araba.bekleyen, null, 'eşiğin altında gelmez');
  c.tuketilenKat = ARABA.esik;
  const olaylar = kos(c, tarla, ARABA.yoklama + ARABA.duyuru);
  const araba = olaylar.filter((o) => o.ad === 'harman-arabasi').map((o) => o.veri);
  assert.deepEqual(araba.map((v) => v.asama), ['duyuru', 'dokum']);
  assert.deepEqual([araba[0].x, araba[0].y], [121, 81], 'ilk aday dolu (sandık): ikincisi');
  assert.equal(c.arabaKat, araba[1].kat);
  assert.ok(c.arabaKat > 9000 && c.arabaKat < 11000, `≈ 10 bin kat: ${c.arabaKat}`);
  assert.equal(ciftlikSamani(c, tarla) - c.arabaKat, once, 'korunum (kaynak sayacıyla)');
  assert.equal(c.tuketilenKat, 0);
  const eklenen = olaylar.find((o) => o.ad === 'gomulu-eklendi').veri.nesneler;
  assert.equal(eklenen.length, 1 + ARABA.civi + ARABA.tas + ARABA.buluntu);
  assert.ok(igneMi(eklenen[0].esya));
  assert.ok(eklenen.every((g) => c.gomulu.includes(g) && g.z <= tarla.h[g.y * W + g.x]));
});

test('araba eşiği stok %10 altında 8000; yer yoksa bekler; arabaCagir sınırları', () => {
  const { c, tarla } = dunya(5, duzTarla(0));
  const a = dunyaHazirla(c);
  a.dokum = [[20, 20]];
  a.baslangicStok = 1000000;
  c.tuketilenKat = ARABA.dusukEsik;
  kur(c, tarla, 'sandik', 23, 20);
  const o1 = kos(c, tarla, ARABA.yoklama + 1).filter((o) => o.ad === 'harman-arabasi');
  assert.deepEqual(o1.map((o) => o.veri.asama), ['yer-yok'], 'düşük eşik aşıldı, yer yok');
  komutEkle(c, { tur: 'sok', x: 23, y: 20 });
  const o2 = kos(c, tarla, ARABA.duyuru * 2).filter((o) => o.ad === 'harman-arabasi');
  assert.deepEqual(o2.map((o) => o.veri.asama), ['duyuru', 'dokum'], 'yer açılınca gelir');
  komutEkle(c, { tur: 'arabaCagir' });
  komutEkle(c, { tur: 'arabaCagir' });
  const o3 = kos(c, tarla, 1);
  assert.equal(o3.filter((o) => o.ad === 'harman-arabasi').length, 1);
  assert.equal(o3.find((o) => o.ad === 'komut-reddedildi').veri.neden, 'yolda');
  kos(c, tarla, ARABA.duyuru);
  komutEkle(c, { tur: 'arabaCagir' });
  assert.equal(kos(c, tarla, 1).find((o) => o.ad === 'komut-reddedildi').veri.neden, 'erken');
  bedelBagla(() => false);
  c.araba.sonCagri = -ARABA.cagri;
  komutEkle(c, { tur: 'arabaCagir' });
  assert.equal(kos(c, tarla, 1).find((o) => o.ad === 'komut-reddedildi').veri.neden, 'kurus');
  bedelBagla(() => true);
});

test('cayirGenislet: +6 karo sütunu köşeden uzağa, en çok 3; samana dokunmaz', () => {
  const d = gercekler.get('ciftlik') ?? yeniGercek('ciftlik');
  const { c, tarla } = d;
  const ilk = { ...c.arazi.cayir };
  const toplam = () => tarla.h.reduce((s, v) => s + v, 0) - c.cayirKat;
  const once = toplam();
  for (let k = 0; k < 4; k++) komutEkle(c, { tur: 'cayirGenislet' });
  const olaylar = tikAt(c, tarla);
  assert.equal(olaylar.filter((o) => o.ad === 'cayir-genisledi').length, 3);
  assert.equal(olaylar.find((o) => o.ad === 'komut-reddedildi').veri.neden, 'en-cok');
  assert.equal(c.arazi.cayir.en, ilk.en + 3 * CAYIR.genislet);
  const solda = ilk.kose === 0 || ilk.kose === 3;
  const yeniX = solda ? ilk.x + ilk.en : ilk.x - 1;
  assert.equal(zeminAl(c, yeniX, ilk.y), ZEMIN.CAYIR);
  assert.equal(toplam(), once, 'saman yerinde (yalnız çayır büyümesi eklenir)');
});

/** Parçanın kurulabildiği ilk karo (tarama sırası) ya da hata. */
function bosYer(c, tarla, ad, x0, y0) {
  for (let y = y0; y < KARO_BOY - 2; y++) {
    for (let x = x0; x < KARO_EN - 2; x++) {
      if (!yerlestirmeEngeli(c, tarla, parcaTanimi(ad), x, y, 0)) return [x, y];
    }
  }
  throw new Error(`${ad} için yer yok`);
}

test('öğretici (3 tohum): çiviler 30 sn arayla, ilk iğne 4-8. dakikada çıkar', () => {
  for (const e of ETIKETLER) {
    const { c, tarla } = yeniGercek(e);
    const { sandik } = ogreticiHatti(c, tarla);
    const cikan = [];
    for (let t = 0; t < 8 * 1200; t++) {
      if (t % 1000 === 0) sandik.tanim.kur(sandik);
      for (const o of tikAt(c, tarla)) {
        if (o.ad === 'gomulu-cikti' && o.veri.nesne.ogretici) cikan.push([c.tik, o.veri.tur]);
      }
    }
    const civi = cikan.filter(([, tur]) => tur === CIVI).map(([t]) => t);
    assert.equal(civi.length, OGRETICI.civi, `${e}: 8 çivi`);
    assert.ok(civi[0] >= 2400 && civi[0] <= 3600, `${e}: ilk çivi ≈ 2:10-3:00 (${civi[0]})`);
    civi.slice(1).forEach((t, k) => {
      assert.ok(Math.abs(t - civi[k] - 600) <= 60, `${e}: ≈ 30 sn ara (${t - civi[k]})`);
    });
    const igne = cikan.find(([, tur]) => igneMi(tur));
    assert.ok(igne, `${e}: ilk iğne çıktı`);
    const dk = (igne[0] + 400) / 1200; // huni oyunun ≈ 20. saniyesinde kurulur
    assert.ok(dk >= 4 && dk <= 8, `${e}: ilk iğne ${dk.toFixed(2)}. dakikada`);
  }
});

test('korunum 5000 tik: saman (kaynak sayaçlarıyla) birebir, iğne/buluntu hiç kaybolmaz', () => {
  const { c, tarla } = yeniGercek('dunya-2');
  ogreticiHatti(c, tarla);
  const { cayir } = c.arazi;
  const huni = kur(c, tarla, 'huni', cayir.x + 4, cayir.y + 4, 0);
  kur(c, tarla, 'sandik', huni.cikis[0].hx, huni.cikis[0].hy);
  kur(c, tarla, 'tas-toplayici', ...bosYer(c, tarla, 'tas-toplayici', 40, 30), 0);
  const saman = () => ciftlikSamani(c, tarla) + tarla.kaldirilan - c.cayirKat - c.arabaKat;
  const once = saman();
  let degerli = degerliSay(c);
  komutEkle(c, { tur: 'arabaCagir' });
  for (let t = 0; t < 5000; t++) {
    for (const o of tikAt(c, tarla)) {
      if (o.ad !== 'gomulu-eklendi') continue;
      degerli += o.veri.nesneler.filter((g) => igneMi(g.esya) || g.tur).length;
    }
    if (t % 250 === 0) {
      assert.equal(saman(), once, `saman, tik ${c.tik}`);
      assert.equal(degerliSay(c), degerli, `iğne/buluntu, tik ${c.tik}`);
    }
  }
  assert.ok(c.cayirKat > 0 && c.arabaKat > 0, 'iki kaynak da çalıştı');
  assert.equal(saman(), once);
  for (const p of [...c.parcalar.values()]) komutEkle(c, { tur: 'sok', x: p.x, y: p.y });
  tikAt(c, tarla);
  assert.equal(c.parcalar.size, 0);
  assert.equal(degerliSay(c), degerli, 'söküm sonrası envanterde');
  assert.equal(saman(), once);
});

test('kayıt: arazi, sayaçlar, araba ve öğretici gidiş-dönüş; sürdürünce bit bit aynı', () => {
  const a = yeniGercek('harman-3');
  ogreticiHatti(a.c, a.tarla);
  komutEkle(a.c, { tur: 'arabaCagir' });
  kos(a.c, a.tarla, 300);
  const veri = JSON.parse(JSON.stringify(dunyaKodla(a.c, a.tarla)));
  const tarla = duzTarla(0);
  const b = { c: dunyaCoz(veri, tarla).c, tarla };
  assert.equal(dunyaOzeti(b.c, b.tarla), dunyaOzeti(a.c, a.tarla));
  assert.deepEqual(b.c.araba.bekleyen, a.c.araba.bekleyen);
  assert.equal(b.c.ogretici.kurTik, a.c.ogretici.kurTik);
  kos(a.c, a.tarla, 3000);
  kos(b.c, b.tarla, 3000);
  assert.equal(dunyaOzeti(b.c, b.tarla), dunyaOzeti(a.c, a.tarla));
  assert.equal(b.c.arabaKat, a.c.arabaKat);
  const eski = { ...veri, alanlar: undefined };
  const e = dunyaCoz(eski, duzTarla(0)).c;
  assert.equal(e.arazi.cayir, null, 'alanı olmayan eski kayıt: boş arazi');
  assert.equal(e.tuketilenKat, 0);
});
