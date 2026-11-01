/** Çiftlik enerji: şebeke, oran formülü, talep, gucsuzOran, volan, lokomobil, yel, krank. */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { esyaTanimla, esyaKodu } from '../js/kural/ciftlik/esya.js';
import { parcaTanimla } from '../js/kural/ciftlik/parca-kayit.js';
import { komutEkle, ciftlikSamani } from '../js/kural/ciftlik/benzetim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti } from '../js/kural/ciftlik/sakla.js';
import { ENERJI, agiBul, gucRozeti } from '../js/kural/ciftlik/ag/enerji.js';
import { yakitTik } from '../js/kural/ciftlik/parcalar/enerji.js';
import { dunya, kur, kos, havaSabitle } from './ciftlik-yardim.mjs';

const BALYA = esyaTanimla('test-yakit-balya', { kod: 511, yakit: 1200, saman: 96 }).kod;
const KIYIM = esyaTanimla('test-yakit-kiyim', { kod: 510, yakit: 150 }).kod;

/** Deneme makinesi: iş ilerlemesi oran kadar artar; ozel.bos ise girdisi yok (talep etmez). */
const MAKINE = { ad: 'Deneme makinesi', aile: 'isleme', guc: 30, yonlu: false };
const makineKur = (p) => Object.assign(p.ozel, { is: 0, bos: 0 });
const makineAdim = (ctx, p) => { if (!p.ozel.bos) p.ozel.is += ctx.oran(p); };
const makineDurum = (p) => (p.ozel.bos ? 'girdi-yok' : 'calisiyor');
parcaTanimla('deneme-makine', {
  ...MAKINE, kod: 65001, kur: makineKur, adim: makineAdim, durum: makineDurum,
});
/** Pasif oranı 512 olan makine (huni gibi). */
parcaTanimla('deneme-pasif', {
  ...MAKINE, kod: 65002, gucsuzOran: 512, kur: makineKur, adim: makineAdim, durum: makineDurum,
});
for (const guc of [20, 30, 40]) {
  parcaTanimla(`deneme-guc${guc}`, { ...MAKINE, kod: 65100 + guc, guc });
}

const hava = (siddet, yon = 0) => havaSabitle({ yon, siddet });
afterEach(() => havaSabitle());

/** Makine (10,10) – şaft (11,10) – yel değirmeni (12,10; 2×2). */
function yelHatti(siddet = 2, makine = 'deneme-makine') {
  hava(siddet);
  const d = dunya();
  const m = kur(d.c, d.tarla, makine, 10, 10);
  kur(d.c, d.tarla, 'saft', 11, 10);
  const yel = kur(d.c, d.tarla, 'yel-degirmeni', 12, 10);
  return { ...d, m, yel };
}

/**
 * Lokomobil devresi: makine (17,19) – şaftlar (18..20,19); lokomobil (20,20) 3×2 yön 0:
 * kuzey kenarı şafta değer (aks iki yandan), arka (batı) kenarı değmez.
 */
function lokoDevresi(makine = 'deneme-makine', yakit = []) {
  hava(0);
  const d = dunya();
  const m = kur(d.c, d.tarla, makine, 17, 19);
  for (const x of [18, 19, 20]) kur(d.c, d.tarla, 'saft', x, 19);
  const loko = kur(d.c, d.tarla, 'lokomobil', 20, 20);
  for (const kod of yakit) loko.tanim.al(loko, 0, kod);
  return { ...d, m, loko };
}

test('oran = min(1024, arz*1024/talep): 16 bg yel, 30 bg makine', () => {
  const { c, tarla, m } = yelHatti(2);
  kos(c, tarla, 100);
  assert.equal(m.oran, Math.floor((16 * 1024) / 30));
  assert.equal(m.ozel.is, 100 * m.oran);
  const ag = agiBul(c, m);
  assert.deepEqual([ag.arz, ag.talep, ag.oran], [16, 30, 546]);
  assert.equal(gucRozeti(m), null);
});

test('arz talebi karşılarsa oran 1024 (tavan); eksikse yumuşak bozulma', () => {
  const { c, tarla, m } = yelHatti(3, 'deneme-guc20'); // 24 bg ≥ 20 bg
  kos(c, tarla, 3);
  assert.equal(m.oran, 1024);
  const b = yelHatti(3);
  kos(b.c, b.tarla, 3);
  assert.equal(b.m.oran, Math.floor((24 * 1024) / 30));
});

test('rozet: oran < %50 guc-az, oran 0 guc-yok (asla kesmez, durgunda 0)', () => {
  const { c, tarla, m } = yelHatti(1); // 8 bg / 30 bg
  kos(c, tarla, 3);
  assert.equal(m.oran, 273);
  assert.equal(gucRozeti(m), 'guc-az');
  hava(0);
  kos(c, tarla, 3);
  assert.equal(m.oran, 0);
  assert.equal(gucRozeti(m), 'guc-yok');
});

test('boş makine talep etmez: lokomobil yakıt yakmaz; talep gelince yalnız onu karşılar', () => {
  const { c, tarla, m, loko } = lokoDevresi('deneme-makine', [BALYA]);
  m.ozel.bos = 1;
  kos(c, tarla, 100);
  assert.equal(loko.ozel.kalan, 0, 'talep yok: yakıt yanmadı');
  assert.equal(loko.ozel.tampon.length, 1);
  assert.equal(m.oran, 1024, 'talep 0: oran 1024');
  m.ozel.bos = 0;
  kos(c, tarla, 5);
  assert.equal(loko.ozel.yuk, 30, 'yalnız makinenin 30 bg talebi');
  assert.equal(m.oran, 1024);
});

test('gucsuzOran: şebekesizken pasif oran, şebekedeyse max(gucsuz, oran)', () => {
  const { c, tarla, m: p } = yelHatti(1, 'deneme-pasif'); // 8 bg / 30 bg → 273
  const tek = kur(c, tarla, 'deneme-pasif', 5, 5);
  kos(c, tarla, 10);
  assert.equal(tek.oran, 512, 'bağlı değil');
  assert.equal(tek.ozel.is, 10 * 512);
  assert.equal(p.oran, 512, 'zayıf şebeke (273) pasiften yavaş yapmaz');
  hava(3); // 24 bg / 30 = 819
  kos(c, tarla, 2);
  assert.equal(p.oran, 819);
});

test('volan: fazlalıkla 12 bg şarj, açıkta 30 bg deşarj, kapasite 2400', () => {
  hava(3); // 24 bg
  const { c, tarla } = dunya();
  const m = kur(c, tarla, 'deneme-makine', 10, 10);
  kur(c, tarla, 'saft', 11, 10);
  const v = kur(c, tarla, 'volan', 12, 10);
  kur(c, tarla, 'saft', 14, 10);
  kur(c, tarla, 'yel-degirmeni', 15, 10);
  m.ozel.bos = 1;
  kos(c, tarla, 10);
  assert.equal(v.ozel.dolu, 120, 'tik başına 12');
  kos(c, tarla, 190);
  assert.equal(v.ozel.dolu, ENERJI.VOLAN_KAP, '200 tikte dolar');
  kos(c, tarla, 50);
  assert.equal(v.ozel.dolu, ENERJI.VOLAN_KAP, 'taşmaz');
  hava(0); // rüzgâr kesilir (yön aynı); makine 30 bg ister: volan 30/tik verir
  m.ozel.bos = 0;
  kos(c, tarla, 79);
  assert.equal(m.oran, 1024);
  assert.equal(v.ozel.dolu, 2400 - 79 * 30);
  kos(c, tarla, 1);
  assert.equal(v.ozel.dolu, 0);
  kos(c, tarla, 1);
  assert.equal(m.oran, 0, 'boşalınca etkisiz');
});

test('volan arzı yumuşatır: açık 30 bg üstündeyse deşarj 30 ile sınırlı', () => {
  hava(0);
  const { c, tarla } = dunya();
  const m = kur(c, tarla, 'deneme-guc40', 10, 10);
  kur(c, tarla, 'saft', 11, 10);
  const v = kur(c, tarla, 'volan', 12, 10);
  v.ozel.dolu = 2400;
  kos(c, tarla, 1);
  assert.equal(m.oran, Math.floor((30 * 1024) / 40));
});

test('lokomobil yük oranında yakar: tam yük (40 bg) balya 1200, kıyım 150 tik', () => {
  for (const [kod, sure] of [[BALYA, 1200], [KIYIM, 150]]) {
    const { c, tarla, loko } = lokoDevresi('deneme-guc40', [kod]);
    assert.equal(yakitTik(kod), sure);
    kos(c, tarla, sure - 1);
    assert.ok(loko.ozel.kalan > 0, `${sure - 1} tikte bitmez`);
    kos(c, tarla, 1);
    assert.equal(loko.ozel.kalan, 0);
    assert.equal(loko.ozel.tampon.length, 0);
  }
});

test('lokomobil talep payı oranında yakar: yarım yük (20 bg) iki kat uzun, 30 bg 4/3', () => {
  for (const [guc, sure] of [[20, 2400], [30, 1600]]) {
    const { c, tarla, loko } = lokoDevresi(`deneme-guc${guc}`, [BALYA]);
    kos(c, tarla, sure - 1);
    assert.ok(loko.ozel.kalan > 0);
    kos(c, tarla, 1);
    assert.equal(loko.ozel.kalan, 0);
  }
});

test('lokomobil: yakıt biterken tek olay; sökümde tampon ve yanan yakıt iade edilir', () => {
  const { c, tarla, loko } = lokoDevresi('deneme-guc30', [KIYIM, BALYA]);
  const olaylar = kos(c, tarla, 10);
  assert.ok(!olaylar.some((o) => o.ad === 'yakit-bitti'));
  komutEkle(c, { tur: 'sok', x: 20, y: 20 });
  kos(c, tarla, 1);
  assert.equal(c.envanter[KIYIM], 1, 'yanan kıyım iade');
  assert.equal(c.envanter[BALYA], 1);
  const l2 = kur(c, tarla, 'lokomobil', 20, 20);
  l2.tanim.al(l2, 0, KIYIM);
  const son = kos(c, tarla, 400); // kıyım 30 bg'de 200 tik
  assert.equal(son.filter((o) => o.ad === 'yakit-bitti').length, 1, 'geçişte bir kez');
  assert.equal(l2.ozel.kalan, 0);
  assert.ok(loko);
});

test('lokomobil kabulü: yalnız yakıt, tampon 4', () => {
  const { c, tarla } = dunya();
  const loko = kur(c, tarla, 'lokomobil', 12, 10);
  assert.equal(loko.tanim.kabulEder(loko, 0, esyaKodu('saman')), false);
  for (let i = 0; i < ENERJI.LOKO_TAMPON; i++) {
    assert.equal(loko.tanim.kabulEder(loko, 0, BALYA), true);
    loko.tanim.al(loko, 0, BALYA);
  }
  assert.equal(loko.tanim.kabulEder(loko, 0, BALYA), false);
});

test('lokomobil aksı yalnız iki yandan: arka şaft bağlamaz, yan şaft bağlar', () => {
  const { c, tarla, loko } = lokoDevresi('deneme-makine');
  const arka = kur(c, tarla, 'saft', 19, 21); // batı: arka kenar (öteki şafttan ayrı)
  const guney = kur(c, tarla, 'saft', 21, 22); // güney kenar
  kos(c, tarla, 1);
  assert.ok(!agiBul(c, arka).uyeler.includes(loko), 'arka kenar aks vermez');
  assert.equal(agiBul(c, guney), agiBul(c, loko));
});

test('yel: kurulurken bekleme yok; şiddete göre 0/8/16/24; yön dönüşünde 100 tik 0', () => {
  const { c, tarla, yel } = yelHatti(2);
  kos(c, tarla, 3);
  assert.equal(yel.ozel.bg, 16);
  for (const [s, bg] of [[0, 0], [1, 8], [2, 16], [3, 24]]) {
    hava(s, 0);
    kos(c, tarla, 1);
    assert.equal(yel.ozel.bg, bg);
  }
  hava(3, 1); // yön döndü
  for (let t = 0; t < ENERJI.YEL_DONUS_TIK; t++) {
    kos(c, tarla, 1);
    assert.equal(yel.ozel.bg, 0, `bekleme ${t}`);
  }
  kos(c, tarla, 1);
  assert.equal(yel.ozel.bg, 24);
});

test('şebeke sökmede bölünür; her parça kendi şebekesinde yeniden hesaplanır', () => {
  hava(3);
  const { c, tarla } = dunya();
  const a = kur(c, tarla, 'deneme-pasif', 10, 10);
  kur(c, tarla, 'saft', 11, 10);
  kur(c, tarla, 'saft', 12, 10);
  const b = kur(c, tarla, 'deneme-pasif', 13, 10);
  kur(c, tarla, 'yel-degirmeni', 14, 10);
  kos(c, tarla, 3);
  assert.equal(agiBul(c, a), agiBul(c, b));
  assert.equal(a.oran, 512, 'ortak oran 24/60 → 409; pasif 512 üstte');
  komutEkle(c, { tur: 'sok', x: 12, y: 10 });
  kos(c, tarla, 2);
  assert.notEqual(agiBul(c, a), agiBul(c, b));
  assert.equal(agiBul(c, a).arz, 0, 'a tarafında üretici yok');
  assert.equal(b.oran, 819, 'b tarafı: 24 bg / 30 bg');
});

test('komşu makineler güç iletmez; iletken (yel) komşusu olan bağlanır', () => {
  hava(3);
  const { c, tarla } = dunya();
  const a = kur(c, tarla, 'deneme-pasif', 10, 10);
  const b = kur(c, tarla, 'deneme-pasif', 11, 10);
  kur(c, tarla, 'yel-degirmeni', 12, 10);
  kos(c, tarla, 3);
  assert.equal(b.oran, 819, 'b yel komşusu: 24 bg / 30 bg');
  assert.equal(a.oran, 512, 'a yalnız makineyle komşu: şebekesiz (pasif)');
  assert.equal(agiBul(c, a), null);
});

/** Krank denemeleri: çiftçi konumu hücre; krank (30,30) kutusu hücre 60..62. */
function krankDunyasi() {
  hava(0);
  const d = dunya();
  const m = kur(d.c, d.tarla, 'deneme-makine', 28, 30);
  kur(d.c, d.tarla, 'saft', 29, 30);
  const k = kur(d.c, d.tarla, 'el-kranki', 30, 30);
  return { ...d, m, k };
}
const dokun = (c, ciftci) => komutEkle(c, { tur: 'krank', x: 30, y: 30, ciftci });

test('krank komutu yalnız çiftçi 1 karo içindeyken kabul edilir', () => {
  const { c, tarla, k } = krankDunyasi();
  dokun(c, { x: 71, y: 61 });
  assert.ok(kos(c, tarla, 1).some((e) => e.veri?.neden === 'uzak'));
  dokun(c, undefined);
  assert.ok(kos(c, tarla, 1).some((e) => e.veri?.neden === 'uzak'), 'çiftçi bilgisi yok');
  dokun(c, { x: 66, y: 61 }); // kutudan 4 hücre = 2 karo
  assert.ok(kos(c, tarla, 1).some((e) => e.veri?.neden === 'uzak'));
  assert.equal(k.ozel.kalan, 0);
  dokun(c, { x: 63, y: 61 }); // 1 hücre = yarım karo
  assert.ok(kos(c, tarla, 1).some((e) => e.ad === 'krank-basladi'));
  assert.equal(k.ozel.kalan, ENERJI.KRANK_TIK - 1);
});

test('krank olmayan parçaya ya da boş karoya krank komutu reddedilir', () => {
  const { c, tarla } = krankDunyasi();
  komutEkle(c, { tur: 'krank', x: 29, y: 30, ciftci: { x: 59, y: 61 } });
  assert.ok(kos(c, tarla, 1).some((e) => e.veri?.neden === 'krank-degil'));
  komutEkle(c, { tur: 'krank', x: 90, y: 30, ciftci: { x: 59, y: 61 } });
  assert.ok(kos(c, tarla, 1).some((e) => e.veri?.neden === 'bos'));
});

test('tek dokunuş 600 tik: basılı tutmaya gerek yok, +6 bg, süre bitince 0', () => {
  const { c, tarla, m } = krankDunyasi();
  dokun(c, { x: 63, y: 61 });
  c.ciftci = { x: 63, y: 61 };
  kos(c, tarla, 599);
  assert.equal(m.oran, Math.floor((6 * 1024) / 30));
  const son = kos(c, tarla, 1);
  assert.ok(son.some((e) => e.ad === 'krank-durdu' && e.veri.neden === 'sure'));
  kos(c, tarla, 1);
  assert.equal(m.oran, 0);
});

test('krank: çiftçi 3 karoyu aşarsa durur; yeni dokunuş süreyi yeniler', () => {
  const { c, tarla, k } = krankDunyasi();
  dokun(c, { x: 63, y: 61 });
  c.ciftci = { x: 66, y: 61 }; // 2 karo: sürer
  kos(c, tarla, 100);
  assert.equal(k.ozel.kalan, ENERJI.KRANK_TIK - 100);
  dokun(c, { x: 63, y: 61 });
  kos(c, tarla, 1);
  assert.equal(k.ozel.kalan, ENERJI.KRANK_TIK - 1, 'yenilendi, eklenmedi');
  c.ciftci = { x: 70, y: 61 }; // 4 karo
  const o = kos(c, tarla, 1);
  assert.equal(k.ozel.kalan, 0);
  assert.ok(o.some((e) => e.ad === 'krank-durdu' && e.veri.neden === 'uzak'));
});

test('ölü döngü: yakıt ve yel yok → krank canlandırır, yakıt gelince lokomobil', () => {
  const { c, tarla, m, loko } = lokoDevresi('deneme-makine');
  const k = kur(c, tarla, 'el-kranki', 16, 19); // makinenin batısı
  kos(c, tarla, 50);
  assert.equal(m.oran, 0, 'yakıt yok, yel yok: hat durdu');
  komutEkle(c, { tur: 'krank', x: 16, y: 19, ciftci: { x: 35, y: 39 } });
  kos(c, tarla, 20);
  assert.ok(k.ozel.kalan > 0);
  assert.equal(m.oran, Math.floor((6 * 1024) / 30), 'krank hattı yürütüyor');
  const is0 = m.ozel.is;
  loko.tanim.al(loko, 0, BALYA); // yaba kolunun yapacağı iş (güç istemez)
  kos(c, tarla, 20);
  assert.equal(m.oran, 1024, 'krank 6 + lokomobil 24');
  assert.ok(m.ozel.is > is0);
});

test('saman korunumu: yanan yakıt sayılır; bitince "yakilan" özetine geçer', () => {
  const { c, tarla } = lokoDevresi('deneme-guc40', [BALYA]);
  const once = ciftlikSamani(c, tarla);
  kos(c, tarla, 1199);
  assert.equal(ciftlikSamani(c, tarla), once, 'yanarken içerik sayılır');
  const olaylar = kos(c, tarla, 21);
  assert.equal(ciftlikSamani(c, tarla), once - 96, 'yanan balyanın samanı çıktı');
  const yakilan = olaylar.filter((o) => o.ad === 'ciftlik-ozet')
    .reduce((t, o) => t + (o.veri.yakilan?.[BALYA] ?? 0), 0);
  assert.equal(yakilan, 1);
});

test('kaydet → yükle → sürdür: bit bit aynı', () => {
  hava(2);
  const a = dunya(3);
  kur(a.c, a.tarla, 'deneme-makine', 10, 10);
  kur(a.c, a.tarla, 'saft', 11, 10);
  kur(a.c, a.tarla, 'volan', 12, 10);
  kur(a.c, a.tarla, 'saft', 14, 10);
  kur(a.c, a.tarla, 'yel-degirmeni', 15, 10);
  const loko = kur(a.c, a.tarla, 'lokomobil', 10, 12);
  kur(a.c, a.tarla, 'saft', 10, 11);
  loko.tanim.al(loko, 0, BALYA);
  kos(a.c, a.tarla, 300);
  const kayit = JSON.parse(JSON.stringify(dunyaKodla(a.c, a.tarla)));
  const b = dunya(3);
  const yuklu = dunyaCoz(kayit, b.tarla).c;
  assert.equal(dunyaOzeti(yuklu, b.tarla), dunyaOzeti(a.c, a.tarla));
  kos(a.c, a.tarla, 400);
  kos(yuklu, b.tarla, 400);
  assert.equal(dunyaOzeti(yuklu, b.tarla), dunyaOzeti(a.c, a.tarla));
});
