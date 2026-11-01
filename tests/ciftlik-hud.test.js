/**
 * Çiftlik HUD'unun saf parçaları (DOM yok): hava tahmini satırı, kuruş/süre metinleri, sorun
 * listesi ve darboğaz puanı, istatistik kovaları, öğretici adım koşulları, yardım sekmesi
 * simgeleri, fiş satırları. DOM'lu dosyalar (hud.js, pano.js...) e2e'de
 * (tests/e2e/ciftlik-hud.cjs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kurusMetni, tikSuresi, dakikaMetni, havaSatiri, havaMetni, DILIM_TIK, fisSatirlari }
  from '../js/ozellik/ciftlik/hud-veri.js';
import { hava } from '../js/kural/ciftlik/dunya/hava.js';
import {
  sorunlariTopla, darbogazGuncelle, enCokDuran, ESIK, sorunMu,
} from '../js/ozellik/ciftlik/sorun-veri.js';
import {
  istatistikKur, ozetEkle, hizlar, dakikaSerisi, kurusOzeti, DAKIKA_N, HIZ_PENCERE,
} from '../js/ozellik/ciftlik/istatistik-veri.js';
import {
  ADIMLAR, baglamKur, ilerlet, adimMetni, ipucuBul, IPUCLARI, BANT_ESIK,
} from '../js/ozellik/ciftlik/ogretici-adim.js';
import { CIFTLIK_SEKMESI } from '../js/ozellik/yardim-ciftlik.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { duzTarla, dunya, kur, bantCek, kos, havaSabitle } from './ciftlik-yardim.mjs';

const SAMAN = esyaKodu('saman');
const CIVI = esyaKodu('civi');
const IGNE = esyaKodu('igne');

test('metinler: kuruş, süre, dakika', () => {
  assert.equal(kurusMetni(1240), '1.240');
  assert.equal(kurusMetni(-5.7), '0');
  assert.equal(tikSuresi(1200), '1:00');
  assert.equal(tikSuresi(0), '0:00');
  assert.equal(dakikaMetni(45), '45 dk');
  assert.equal(dakikaMetni(192), '3 sa 12 dk');
  assert.equal(dakikaMetni(120), '2 sa');
});

test('hava satırı: şimdi + 3 dilim, dilim = 1200 tik, D havası (benzetimle aynı)', () => {
  assert.equal(DILIM_TIK, 1200);
  havaSabitle('gercek');
  const c = { tik: 2500, tohum: 77 };
  const a = havaSatiri(c);
  assert.equal(a.length, 4);
  assert.deepEqual(a.map((h) => h.dilim), [2, 3, 4, 5]);
  assert.deepEqual(havaSatiri(c), a);
  assert.equal(a[1].gok, hava(77, 3).gok);
  havaSabitle();
  assert.match(a[0].metin, /^Şimdi: /);
  assert.match(a[3].metin, /^3 dk sonra: /);
  assert.equal(havaMetni({ yon: 2, siddet: 0, gok: 'gunes' }), 'durgun, güneşli');
  assert.equal(havaMetni({ yon: 2, siddet: 3, gok: 'yagmur' }), 'sert rüzgâr batıya, yağmurlu');
});

test('hava (dunya/hava.js): şiddet dağılımı ≈ %15/35/35/15 ve yağmurda şiddet ≥ 1', () => {
  const say = [0, 0, 0, 0];
  let yagmur = 0;
  const N = 10000;
  for (let d = 0; d < N; d++) {
    const h = hava(123, d);
    say[h.siddet] += 1;
    if (h.gok === 'yagmur') {
      yagmur += 1;
      assert.ok(h.siddet >= 1);
    }
  }
  assert.ok(Math.abs(say[0] / N - 0.15) < 0.03, `durgun ${say[0] / N}`);
  assert.ok(Math.abs(say[3] / N - 0.15) < 0.03, `sert ${say[3] / N}`);
  assert.ok(yagmur / N > 0.04 && yagmur / N < 0.14, `yağmur ${yagmur / N}`);
});

/** Yığının eteğinde huni (karo 28, 19) ve ondan doğuya n bant; yığın merkezi hücre (40, 40). */
function hat(bant = 3, yigin = true) {
  const tarla = duzTarla(0, yigin ? [{ x: 40, y: 40, r: 16, t: 60 }] : []);
  const d = dunya(5, tarla);
  const huni = kur(d.c, d.tarla, 'huni', 28, 19, 0);
  if (bant) bantCek(d.c, d.tarla, 30, 19, 0, bant);
  return { ...d, huni };
}

test('sorun listesi: boş tarlada huni bekleyen, sorun sayılmaz; neden cümlesi var', () => {
  const { c, tarla } = hat(0, false);
  kos(c, tarla, 5);
  const { sorunlar, bekleyenler } = sorunlariTopla(c);
  assert.equal(sorunlar.length, 0);
  assert.equal(bekleyenler.length, 1);
  assert.equal(bekleyenler[0].ad, 'Emici huni');
  assert.equal(bekleyenler[0].durum, 'girdi-yok');
  assert.ok(!sorunMu('girdi-yok') && !sorunMu('calisiyor') && sorunMu('guc-yok'));
});

test('sorun listesi: çıkışı bağlanmayan huni dolunca "çıkış dolu" olur; konum karo', () => {
  const { c, tarla, huni } = hat(0, true);
  kos(c, tarla, 400);
  const { sorunlar } = sorunlariTopla(c);
  assert.equal(sorunlar.length, 1, JSON.stringify(sorunlar));
  const s = sorunlar[0];
  assert.deepEqual([s.id, s.durum, s.kx, s.ky, s.en, s.boy, s.agir],
    [huni.id, 'cikis-dolu', 28, 19, 2, 2, true]);
  assert.match(s.neden, /Çıkışı dolu/);
});

test('sıkışmış (tıkalı) parça sorun listesinde, bilinmeyen kod da satır olur', () => {
  const { c, tarla, huni } = hat(0, false);
  huni.tikali = true;
  assert.equal(sorunlariTopla(c).sorunlar[0].durum, 'tikali');
  huni.tikali = false;
  Object.defineProperty(huni, 'tanim', { value: { ...huni.tanim, durum: () => 'tuhaf' } });
  const s = sorunlariTopla(c).sorunlar[0];
  assert.equal(s.durum, 'tuhaf');
  assert.equal(s.neden, 'Durum: tuhaf.');
  assert.ok(tarla);
});

test('darboğaz puanı: ağır sorun artar, söner, silinen parça düşer; en çok 3', () => {
  const { c, huni } = hat(0, false);
  const puanlar = new Map();
  const agir = [{ id: huni.id, agir: true }];
  for (let i = 0; i < ESIK + 2; i++) darbogazGuncelle(puanlar, agir, c);
  assert.ok(puanlar.get(huni.id) >= ESIK);
  huni.tikali = true;
  const liste = enCokDuran(puanlar, c, 3);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].id, huni.id);
  assert.match(liste[0].neden, /Sıkıştı/);
  const once = puanlar.get(huni.id);
  darbogazGuncelle(puanlar, [], c);
  assert.ok(puanlar.get(huni.id) < once, 'sorun bitince söner');
  for (let i = 0; i < 20000; i++) darbogazGuncelle(puanlar, [], c);
  assert.equal(puanlar.size, 0, 'sönen puan silinir');
  puanlar.set(999, 50);
  darbogazGuncelle(puanlar, [], c);
  assert.ok(!puanlar.has(999), 'dünyada olmayan parça silinir');
  for (let i = 0; i < 5; i++) puanlar.set(100 + i, 10 + i);
  assert.equal(enCokDuran(puanlar, { parcalar: new Map() }, 3).length, 0);
});

test('istatistik: hızlar eşya/dk, dakika kovaları 10 ile sınırlı, kuruş kazancı', () => {
  const ist = istatistikKur();
  for (let sn = 1; sn <= 90; sn++) {
    const veri = { tik: sn * 20, uretilen: { [SAMAN]: 1 }, depolanan: { [SAMAN]: sn % 2 } };
    ozetEkle(ist, veri, sn >= 80 ? 400 : sn >= 45 ? 450 : 300);
  }
  assert.equal(ist.saniyeler.length, HIZ_PENCERE);
  assert.deepEqual(hizlar(ist, 'uretilen'), { [SAMAN]: 60 });
  assert.deepEqual(hizlar(ist, 'depolanan'), { [SAMAN]: 30 });
  assert.deepEqual(hizlar(ist, 'teslim'), {});
  assert.deepEqual(dakikaSerisi(ist, 'uretilen'), [59, 31]);
  assert.deepEqual(kurusOzeti(ist), { toplam: 150, dakikada: 75 });
  for (let sn = 91; sn < 91 + 60 * 14; sn++) ozetEkle(ist, { tik: sn * 20 }, 450);
  assert.equal(ist.dakikalar.length, DAKIKA_N);
  assert.deepEqual(hizlar(istatistikKur(), 'uretilen'), {});
});

test('öğretici: 11 adım, ilerlet koşullara göre atlar, metin kartın sayısını okur', () => {
  assert.equal(ADIMLAR.length, 11);
  assert.equal(new Set(ADIMLAR.map((a) => a.kimlik)).size, 11);
  const { c, tarla } = hat(0, false);
  const kart = { baslik: 'Komşu Hatice teyze', metin: '30 saman tutamı', hedef: 30 };
  let b = baglamKur(c, { kart });
  assert.match(adimMetni(ADIMLAR[0], b, false), /Komşu Hatice teyze: 30 saman tutamı istiyor/);
  assert.equal(ilerlet(0, b), 2, 'huni var: amaç ve huni geçer, "yığın akar" izlenir');
  assert.equal(ilerlet(0, baglamKur(c, { kart, adimTik: 300 })), 3, 'izleme 300 tikte biter');
  assert.equal(ilerlet(0, baglamKur(c, { kart, uretilen: 1 })), 3);
  bantCek(c, tarla, 30, 19, 0, BANT_ESIK);
  b = baglamKur(c, { kart, uretilen: 5 });
  assert.equal(b.parca.bant, BANT_ESIK);
  assert.equal(ilerlet(0, b), 4, 'bant çekildi, teslim bekleniyor');
  assert.match(adimMetni(ADIMLAR[4], b, true), /30 tutam kapıya gidince/);
  const D = (...k) => new Set(k);
  assert.equal(ilerlet(4, baglamKur(c, { kart, damga: D('D1') })), 5, 'D1 → çivi adımı');
  const d2 = baglamKur(c, { kart, damga: D('D1', 'D2') });
  assert.equal(ilerlet(5, d2), 9, 'D2 çivi, mıknatıs, doyma ve çivisiz adımlarını geçer');
  assert.equal(ilerlet(5, baglamKur(c, { kart, damga: D('D1', 'D2', 'D3') })), 11, 'bitti');
  assert.notEqual(adimMetni(ADIMLAR[1], b, true), adimMetni(ADIMLAR[1], b, false), 'd/t ayrı');
});

test('öğretici: alınmış çivi ve iğne dünyadan okunur (sayfa yenilenince doğru yer)', () => {
  const { c } = hat(0, false);
  c.gomulu.push({ esya: CIVI, x: 1, y: 1, z: 0, alindi: false },
    { esya: IGNE, x: 2, y: 2, z: 0, alindi: false });
  let b = baglamKur(c, {});
  assert.deepEqual([b.civiAlindi, b.igneAlindi], [false, false]);
  c.gomulu.forEach((g) => { g.alindi = true; });
  b = baglamKur(c, {});
  assert.deepEqual([b.civiAlindi, b.igneAlindi], [true, true]);
});

test('öğretici ipuçları: bir kez, koşulu sağlanınca; güç ipucu D3 sonrası', () => {
  const { c } = hat(0, false);
  const kimlikler = IPUCLARI.map((i) => i.kimlik);
  assert.deepEqual(kimlikler, ['guc-yok', 'sikisma', 'ruzgar']);
  const durumlar = ['guc-yok'];
  assert.equal(ipucuBul(new Set(), baglamKur(c, { durumlar })), null, 'D3 öncesi yok');
  const b = baglamKur(c, { durumlar, damga: new Set(['D3']) });
  assert.equal(ipucuBul(new Set(), b).kimlik, 'guc-yok');
  assert.match(ipucuBul(new Set(), b).metin, /30 sn/, 'krank süresi tikten türetilir');
  assert.equal(ipucuBul(new Set(['guc-yok']), b), null, 'bir kez');
  assert.equal(ipucuBul(new Set(), baglamKur(c, { durumlar: ['tikali'] })).kimlik, 'sikisma');
});

test('Nasıl oynanır Çiftlik sekmesi: simgeler sprite içinde, metinler dolu', () => {
  const sprite = fs.readFileSync(new URL('../ikon/arayuz.svg', import.meta.url), 'utf8');
  const kimlikler = new Set([...sprite.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  assert.equal(CIFTLIK_SEKMESI.ad, 'Çiftlik');
  assert.ok(CIFTLIK_SEKMESI.maddeler.length >= 10);
  for (const [ikon, metin] of CIFTLIK_SEKMESI.maddeler) {
    assert.ok(kimlikler.has(ikon), `ikon yok: ${ikon}`);
    const dizi = typeof metin === 'string' ? [metin] : [metin.t, metin.d];
    for (const m of dizi) assert.ok(m && m.length > 20, m);
  }
  const bantMi = ([, m]) => typeof m !== 'string' && /Bant/.test(m.t);
  const bant = CIFTLIK_SEKMESI.maddeler.find(bantMi);
  assert.match(bant[1].t, /4,5 eşya/, 'bant verimi kural sabitlerinden: 20 × 18 / 80');
});

test('fiş satırları: yalnız sayısal anahtarlı pozitif eşya, ada göre sıralı', () => {
  const s = fisSatirlari({ esya: { [SAMAN]: 312, [CIVI]: 0, [IGNE]: 2 }, kurus: 40 });
  assert.equal(s.length, 2);
  assert.deepEqual(s.map((x) => x[1]).sort((a, b) => a - b), [2, 312]);
  assert.ok(s.every(([ad]) => typeof ad === 'string' && ad.length > 0));
  assert.deepEqual(fisSatirlari({ [SAMAN]: 5, kurus: 9, dolu: ['Ambar'] }).map((x) => x[1]), [5]);
  assert.deepEqual(fisSatirlari({}), []);
});

test('benzetime komut eklemek HUD için güvenli: red nedeni olayla döner', () => {
  const { c, tarla } = hat(0, false);
  komutEkle(c, { tur: 'yok-boyle' });
  komutEkle(c, { tur: 'arabaCagir' });
  const red = kos(c, tarla, 2).filter((o) => o.ad === 'komut-reddedildi');
  assert.deepEqual(red.map((o) => o.veri.neden), ['bilinmeyen', 'yer-yok'],
    'sentetik dünyada döküm yeri yok');
});

test('eko-veri: G panosu → HUD kartları, damga defteri ve kapı bilgisi', async () => {
  const { ekonomiOzeti, kapiBilgisi } = await import('../js/ozellik/ciftlik/eko-veri.js');
  const { teslimEt } = await import('../js/kural/ciftlik/ekonomi/siparis.js');
  const { c, tarla } = dunya(5, duzTarla(0));
  kos(c, tarla, 1);
  let eko = ekonomiOzeti(c);
  assert.equal(eko.kurus, 300);
  assert.equal(eko.siradaki, 'D1');
  const d1 = eko.kartlar.find((k) => k.damga === 'D1');
  assert.deepEqual([d1.yuva, d1.metin, d1.hedef, d1.geriCevir], [0, '30 saman tutamı', 30, false]);
  assert.equal(eko.kartlar.length, 3);
  assert.ok(eko.kartlar.slice(1).every((k) => k.geriCevir && Number.isInteger(k.yuva)));
  assert.equal(eko.damgalar.length, 14);
  assert.ok(eko.damgalar[0].acar.includes('Çatal'));
  for (let i = 0; i < 30; i++) teslimEt(c, SAMAN);
  kos(c, tarla, 1);
  eko = ekonomiOzeti(c);
  assert.equal(eko.siradaki, 'D2');
  assert.ok(eko.damgalar[0].basildi);
  const kapi = kapiBilgisi(c);
  assert.equal(kapi.araba.uygun, false, 'sentetik dünyada döküm yeri yok');
  assert.match(kapi.araba.neden, /boş yer/);
  assert.equal(kapi.cayir.neden, 'Bu çiftlikte çayır yok.');
});
