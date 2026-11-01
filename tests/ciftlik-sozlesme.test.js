/**
 * Çiftlik sözleşme taraması (iş K): kayıtlı HER parça ve eşya için genel kurallar. Faz 1
 * parçaları birleştikçe tarama kendiliğinden onları da kapsar (parcaTurleri() üzerinden); bu
 * yüzden birleşmede kırılan test gerçek bir sözleşme ihlalidir. İçerik: parça kayıt
 * tutarlılığı, tek başına kurulum/dönüş/koşu/söküm, kaydet-yükle, determinizm, rozet sözlüğü,
 * eski kayıt (v1 armağan dosyası) yüklenebilirliği, kural katmanı yasakları, olay kataloğu.
 */
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parcaTurleri, parcaTanimi, parcaDurumu, parcaIcerigi, AILELER } from
  '../js/kural/ciftlik/parca-kayit.js';
import { esyaTurleri, esyaKodu, ESYA_KAP } from '../js/kural/ciftlik/esya.js';
import { ciftlikSamani, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { dunyaKodla, dunyaCoz, dunyaOzeti, GOCLER, SURUM } from '../js/kural/ciftlik/sakla.js';
import { parcaKur, parcaSok } from '../js/kural/ciftlik/komut.js';
import { dunya, duzTarla, kos } from './ciftlik-yardim.mjs';
import { PARCALAR, bekleyen, dosyaVar } from './ciftlik-bekleyen.mjs';

const KOK = new URL('../', import.meta.url);
const oku = (yol) => fs.readFileSync(new URL(yol, KOK), 'utf8');

/** Rozet sözlüğü: `sistemler.md` §7 + çekirdeğin ilk kodları (`bos`, `girdi-yok`, `tikali`). */
const ROZETLER = new Set(['calisiyor', 'bos', 'girdi-yok', 'cikis-dolu', 'guc-yok', 'tikali',
  'guc-az', 'ac', 'sikisti', 'kirik', 'doymus', 'sivali', 'nemli', 'yabanci', 'hava',
  'yakit-yok', 'kapali', 'essiz', 'ayar', 'dolu']);

/** Çekirdek parça kodları kayıtta saklanır; bir kod hiç yeniden kullanılmaz (sabit tablo). */
const SABIT_KODLAR = { bant: 1, huni: 2, 'emici-huni': 2, sandik: 3 };

/** Dizindeki .js dosyaları (özyinelemeli), kök göreli yollar. */
function jsDosyalari(yol) {
  return fs.readdirSync(new URL(yol, KOK), { withFileTypes: true }).flatMap((d) => (
    d.isDirectory() ? jsDosyalari(`${yol}${d.name}/`)
      : (d.name.endsWith('.js') ? [`${yol}${d.name}`] : [])));
}

/** Yorum satırlarını atar (yasak desen taraması yorumlara takılmasın). */
const kodOnly = (m) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

test('belge parça listesi (parcalar.md) ile test listesi PARCALAR aynı', () => {
  const baslik = /^\*\*\d+\. [^*]+\*\* · `([a-z-]+)`/gm;
  const adlar = [...oku('docs/ciftlik/parcalar.md').matchAll(baslik)].map((m) => m[1]);
  assert.equal(adlar.length, 30);
  assert.deepEqual([...PARCALAR.slice(0, 30)].sort(), [...adlar].sort());
  assert.equal(PARCALAR[30], 'komsu-kapisi');
});

test('parça kaydı: kod/anahtar tutarlı, aile bilinen, çekirdek kodlar sabit', () => {
  for (const t of parcaTurleri()) {
    assert.equal(parcaTanimi(t.kod), t);
    assert.equal(parcaTanimi(t.anahtar), t);
    assert.ok(AILELER.includes(t.aile), `${t.anahtar}: aile ${t.aile}`);
    assert.ok(Object.isFrozen(t), `${t.anahtar} dondurulmuş`);
    if (SABIT_KODLAR[t.anahtar]) assert.equal(t.kod, SABIT_KODLAR[t.anahtar]);
  }
  for (const kod of new Set(Object.values(SABIT_KODLAR))) {
    const t = parcaTanimi(kod);
    if (t) assert.equal(SABIT_KODLAR[t.anahtar], kod, `kod ${kod} verildi: ${t.anahtar}`);
  }
});

test('eşya kaydı: kodlar 1..511 benzersiz, buluntu ve gömülü türler gömülü işaretli', () => {
  const kodlar = new Set();
  for (const e of esyaTurleri()) {
    assert.ok(e.kod >= 1 && e.kod < ESYA_KAP && !kodlar.has(e.kod), `${e.anahtar} kod ${e.kod}`);
    kodlar.add(e.kod);
    assert.ok(Number.isInteger(e.saman) && e.saman >= 0, `${e.anahtar} saman`);
  }
  for (const ad of ['igne', 'civi']) {
    assert.equal(esyaTurleri().find((e) => e.anahtar === ad).gomulu, true);
  }
  assert.ok(esyaTurleri().filter((e) => e.buluntu).every((e) => e.kod >= 100 && e.kod < 120));
});

test('her parça: 4 yönde kurulur, 100 tik koşar, rozeti sözlükte, sökülünce korunum sürer', () => {
  for (const t of parcaTurleri()) {
    for (const yon of t.yonlu ? [0, 1, 2, 3] : [0]) {
      const { c, tarla } = dunya(3, duzTarla(0));
      const s = parcaKur(c, tarla, t.anahtar, 40, 30, yon);
      assert.ok(s.parca, `${t.anahtar} yon ${yon}: ${s.neden}`);
      const toplam = () => ciftlikSamani(c, tarla) + tarla.kaldirilan;
      const once = toplam();
      kos(c, tarla, 100);
      assert.ok(ROZETLER.has(parcaDurumu(s.parca)), `${t.anahtar}: rozet ${parcaDurumu(s.parca)}`);
      const ic = parcaIcerigi(s.parca);
      assert.ok(Array.isArray(ic.esya) && ic.saman >= 0, `${t.anahtar} icerik biçimi`);
      if (t.incele) {
        const satirlar = t.incele(s.parca);
        assert.ok(Array.isArray(satirlar) && satirlar.every((x) => Array.isArray(x)
          && x.length === 2), `${t.anahtar}: incele [etiket, değer] satırları`);
      }
      assert.equal(toplam(), once, `${t.anahtar}: koşarken saman korunur`);
      parcaSok(c, tarla, s.parca);
      tikAt(c, tarla);
      assert.equal(toplam(), once, `${t.anahtar}: söküm korunumu`);
      assert.equal(c.parcalar.size, 0);
    }
  }
});

test('her parça: kaydet → yükle (JSON) özeti aynı; yüklenmiş dünya aynı akar (determinizm)', () => {
  for (const t of parcaTurleri()) {
    const a = dunya(5, duzTarla(2));
    parcaKur(a.c, a.tarla, t.anahtar, 40, 30, 0);
    kos(a.c, a.tarla, 150);
    const kayit = JSON.parse(JSON.stringify(dunyaKodla(a.c, a.tarla)));
    const tarla = { h: new Uint16Array(a.tarla.h.length), kirli: false, kaldirilan: 0 };
    const { c } = dunyaCoz(kayit, tarla);
    assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(a.c, a.tarla), `${t.anahtar}: yükleme birebir`);
    kos(a.c, a.tarla, 150);
    kos(c, tarla, 150);
    assert.equal(dunyaOzeti(c, tarla), dunyaOzeti(a.c, a.tarla), `${t.anahtar}: sürdürme aynı`);
  }
});

test('aktif parçalar (adim ya da kabulEder tanımlayan) rozet üretir: sessiz tıkanma yok', () => {
  for (const t of parcaTurleri()) {
    if (t.adim || t.kabulEder) assert.equal(typeof t.durum, 'function', `${t.anahtar}: durum yok`);
  }
});

test('eski kayıt (v1 armağan dosyası) bugünkü kodla yüklenir, akar ve korunur', () => {
  const v1 = JSON.parse(fs.readFileSync(new URL('tests/veri/ciftlik-kayit-v1.json', KOK)));
  assert.equal(v1.surum, 1);
  for (let s = 1; s < SURUM; s++) assert.equal(typeof GOCLER[s], 'function', `göç ${s}→${s + 1}`);
  const tarla = { h: new Uint16Array(240 * 160), kirli: false, kaldirilan: 0 };
  const { c, ek } = dunyaCoz(v1, tarla);
  assert.equal(ek.etiket, 'v1-armağan');
  assert.equal(c.tik, 900);
  assert.equal(c.parcalar.size, 8);
  assert.equal(c.gomulu.length, 3);
  const toplam = () => ciftlikSamani(c, tarla) + tarla.kaldirilan;
  const once = toplam();
  kos(c, tarla, 600);
  assert.equal(toplam(), once, 'yüklenen eski kayıtta korunum');
  const iki = [esyaKodu('igne'), esyaKodu('civi')];
  for (const kod of iki) {
    const say = c.gomulu.filter((g) => g.esya === kod && !g.alindi).length + c.envanter[kod]
      + [...c.parcalar.values()].reduce((n, p) => n + parcaIcerigi(p).esya
        .reduce((m, [e, k]) => m + (e === kod ? k : 0), 0), 0)
      + c.hatlar.reduce((n, h) => n + h.tur.slice(0, h.n).filter((e) => e === kod).length, 0);
    assert.equal(say, 1, `kod ${kod} korunur`);
  }
});

test('kural katmanı (js/kural/ciftlik): rastgelelik, zaman, DOM ve kayan nokta işlevi yok', () => {
  const YASAK = new RegExp([
    'Math\\.(random|sin|cos|tan|atan2?|pow|exp|log\\w*|hypot)\\b', '\\bDate\\b',
    '\\bperformance\\b', '\\bwindow\\b', '\\bdocument\\b', '\\blocalStorage\\b',
    '\\bsetTimeout\\b', '\\brequestAnimationFrame\\b'].join('|'));
  for (const yol of jsDosyalari('js/kural/ciftlik/')) {
    const m = kodOnly(oku(yol)).match(YASAK);
    assert.equal(m, null, `${yol}: yasak desen ${m?.[0]}`);
  }
});

test('olay kataloğu: çiftlikte yayılan her olay js/olaylar.js kataloğunda yazılı', () => {
  const katalog = oku('js/olaylar.js');
  const dosyalar = [...jsDosyalari('js/kural/ciftlik/'), 'js/oyun-ciftlik.js',
    ...jsDosyalari('js/ozellik/ciftlik/')];
  const bulunan = new Set();
  for (const yol of dosyalar) {
    const m = kodOnly(oku(yol));
    for (const r of m.matchAll(/\bad: '([a-z0-9-]+)'/g)) bulunan.add(r[1]);
    for (const r of m.matchAll(/\b(?:ctx\.olay|yay)\('([a-z0-9-]+)'/g)) bulunan.add(r[1]);
  }
  assert.ok(bulunan.size >= 8, `olay sayısı ${bulunan.size}`);
  for (const ad of bulunan) assert.ok(katalog.includes(ad), `olay "${ad}" katalogda yok`);
});

bekleyen('her parçanın çizimi (govde) gorsel/*.js içinde tanımlı (yedek kutu kalmadı)', {
  is: 'H1 H2', dosya: ['js/ozellik/ciftlik/gorsel/bant.js'],
}, () => {
  const kaynak = jsDosyalari('js/ozellik/ciftlik/gorsel/').map(oku).join('\n');
  for (const t of parcaTurleri()) {
    assert.ok(kaynak.includes(`'${t.anahtar}'`), `${t.anahtar}: parcaCizimiTanimla yok`);
  }
});

test('çiftlik test yardımcıları parça kaydından beslenir (boş kayıt sessiz geçmesin)', () => {
  assert.ok(parcaTurleri().length >= 3);
  assert.equal(dosyaVar('tests/veri/ciftlik-kayit-v1.json'), true);
});
