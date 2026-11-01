/**
 * Çiftlik görsel altyapısı (H1), tuvalsiz: dönemeç geometrisi (bant dokusu ve eşya yolu aynı
 * çeyrek yay; uçlar kenar ortaları), halka dikişinde giriş yönü, bölge dizininin kaba taramayla
 * aynı parçaları her biri bir kez vermesi, rozet kodu eşlemesi ve şekillerin RENK DIŞINDA
 * ayrılması (çizim çağrı imzaları farklı), eşya çizimlerinin tasarımdaki 14 tür + 20 buluntu
 * ve kayıtlı her tür için var olması, toplu tariflerin ve bant çıtalarının sahte bağlamla
 * hatasız çalışması.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DX, DY } from '../js/kural/ciftlik/olcu.js';
import { esyaTurleri } from '../js/kural/ciftlik/esya.js';
import { KATALOG } from '../js/kural/buluntu.js';
import { dunya, kur, bantCek, kos } from './ciftlik-yardim.mjs';

/** Çağrıları kaydeden sahte Path2D (Node'da yok). */
class SahteYol {
  constructor() { this.cagrilar = []; }
}
for (const ad of ['moveTo', 'lineTo', 'quadraticCurveTo', 'arc', 'rect', 'closePath',
  'ellipse', 'roundRect', 'bezierCurveTo']) {
  SahteYol.prototype[ad] = function kaydet(...arg) {
    this.cagrilar.push([ad, ...arg.map((x) => (typeof x === 'number' ? Math.round(x * 100) : x))]);
  };
}
globalThis.Path2D = SahteYol;

const {
  donemec, donemecNoktasi, karoGirisi, bantCitalari, bantGovde,
} = await import('../js/ozellik/ciftlik/gorsel/bant.js');
const { KARO_PX, esyaCizimiVar, esyaCizimiAdla } = await import(
  '../js/ozellik/ciftlik/gorsel/kayit.js');
const { TASARIM_TURLERI, ESYA_R } = await import('../js/ozellik/ciftlik/gorsel/esya-atlas.js');
const { esyaKonumu } = await import('../js/ozellik/ciftlik/gorsel/esya-cizim.js');
const { gorunurParcalar, dizinHazirla } = await import('../js/ozellik/ciftlik/gorsel/bolge.js');
const { rozetKodu, rozetSekli, ROZET_KODLARI, rozetCizBirim } = await import(
  '../js/ozellik/ciftlik/gorsel/rozet.js');

/** Her çağrıyı (ad + yuvarlanmış sayılar) kaydeden sahte 2B bağlam. */
function sahteBaglam() {
  const cagrilar = [];
  const ctx = new Proxy({}, {
    get(hedef, ad) {
      if (ad in hedef) return hedef[ad];
      if (ad === 'getTransform') return () => ({ a: 1, b: 0 });
      return (...arg) => {
        cagrilar.push([ad, ...arg.map((x) => (typeof x === 'number' ? Math.round(x * 100) : 0))]);
      };
    },
    set(hedef, ad, deger) { hedef[ad] = deger; return true; },
  });
  return { ctx, cagrilar };
}

const yakin = (a, b, mesaj) => assert.ok(Math.abs(a - b) < 1e-9, `${mesaj}: ${a} ≠ ${b}`);

test('dönemeç: uçlar giriş ve çıkış kenarlarının ortası, düz ve ters null', () => {
  const K = KARO_PX;
  for (let g = 0; g < 4; g++) {
    for (let d = 0; d < 4; d++) {
      const dm = donemec(g, d);
      if (g === d || ((g + 2) & 3) === d) {
        assert.equal(dm, null);
        continue;
      }
      const a = donemecNoktasi(dm, 100, 100, 0);
      const b = donemecNoktasi(dm, 100, 100, 1);
      yakin(a.x, 100 - (DX[g] * K) / 2, `giriş x ${g}->${d}`);
      yakin(a.y, 100 - (DY[g] * K) / 2, `giriş y ${g}->${d}`);
      yakin(b.x, 100 + (DX[d] * K) / 2, `çıkış x ${g}->${d}`);
      yakin(b.y, 100 + (DY[d] * K) / 2, `çıkış y ${g}->${d}`);
      assert.ok(Math.abs(Math.abs(dm.fark) - Math.PI / 2) < 1e-9);
    }
  }
});

test('eşya yolu dönemeçte kesintisiz (karo kenarında sıçrama yok)', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 3); // doğu
  bantCek(c, tarla, 13, 10, 1, 3); // köşe (13,10) güneye döner
  kos(c, tarla, 1);
  const h = c.hatlar[0];
  assert.equal(c.hatlar.length, 1);
  let onceki = esyaKonumu(h, 0, c);
  for (let pos = 4; pos <= h.uzun; pos += 4) {
    const n = esyaKonumu(h, pos, c);
    assert.ok(Math.hypot(n.x - onceki.x, n.y - onceki.y) < 0.6, `pos ${pos} sıçradı`);
    onceki = n;
  }
});

test('halka dikişi: ilk karonun giriş yönü gerçek öncülden', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 20, 20, 0, 3);
  bantCek(c, tarla, 23, 20, 1, 2);
  bantCek(c, tarla, 23, 22, 2, 3);
  bantCek(c, tarla, 20, 22, 3, 2);
  kos(c, tarla, 1);
  const h = c.hatlar.find((x) => x.karolar[0] === 20 * 120 + 20);
  assert.ok(h, 'halka (20,20)de kesilmeli');
  assert.equal(h.girisYon[0], 0, 'kural tarafında ilk karo kendi yönü');
  assert.equal(karoGirisi(c, h, 0), 3, 'çizimde öncül (kuzeye giden) yönü');
});

test('bölge dizini: görünür parçalar kaba taramayla aynı, her biri bir kez', () => {
  const { c, tarla } = dunya();
  for (let y = 2; y < 70; y += 5) bantCek(c, tarla, 2 + (y % 7), y, 0, 40);
  for (let x = 3; x < 110; x += 9) kur(c, tarla, 'sandik', x, 75);
  kur(c, tarla, 'huni', 60, 60);
  kos(c, tarla, 1);
  dizinHazirla(c);
  for (const alan of [{ kx0: 0, ky0: 0, kx1: 119, ky1: 79 }, { kx0: 15, ky0: 14, kx1: 33, ky1: 31 },
    { kx0: 59, ky0: 59, kx1: 59, ky1: 59 }, { kx0: 100, ky0: 70, kx1: 130, ky1: 90 }]) {
    const gorulen = [];
    gorunurParcalar(c, alan, (p) => gorulen.push(p.id));
    const beklenen = [...c.parcalar.values()].filter((p) => !(p.x + p.en < alan.kx0
      || p.y + p.boy < alan.ky0 || p.x > alan.kx1 || p.y > alan.ky1)).map((p) => p.id);
    assert.deepEqual([...gorulen].sort((a, b) => a - b), beklenen.sort((a, b) => a - b));
    assert.equal(new Set(gorulen).size, gorulen.length, 'tekrar yok');
  }
});

test('rozet kodları: Faz 0 eşlemesi, sessiz durumlar, bilinmeyen görünür', () => {
  assert.equal(rozetKodu('calisiyor'), null);
  assert.equal(rozetKodu('bos'), null);
  assert.equal(rozetKodu('girdi-yok'), 'ac');
  assert.equal(rozetKodu('tikali'), 'sikisti');
  assert.equal(rozetKodu('guc-yok'), 'guc-yok');
  assert.equal(rozetKodu('cikis-dolu'), 'cikis-dolu');
  assert.equal(rozetKodu('uydurma'), 'bilinmeyen');
  for (const kod of ['guc-az', 'dolu', 'kirik', 'doymus', 'sivali', 'nemli', 'yabanci',
    'hava', 'yakit-yok', 'kapali', 'ayar', 'essiz']) assert.equal(rozetKodu(kod), kod);
});

test('rozetler renk dışında şekille ayrılır (çizim imzaları farklı)', () => {
  const imzalar = new Map();
  for (const kod of ROZET_KODLARI) {
    const { ctx, cagrilar } = sahteBaglam();
    rozetSekli(kod)(ctx, { ic: '#000', pl: '#fff', lw: 0.2 });
    const imza = JSON.stringify(cagrilar);
    assert.ok(cagrilar.length > 1, `${kod} şekilsiz`);
    assert.ok(!imzalar.has(imza), `${kod} ile ${imzalar.get(imza)} aynı şekil`);
    imzalar.set(imza, kod);
    rozetCizBirim(sahteBaglam().ctx, kod, 0.1);
  }
});

test('eşya çizimleri: tasarımdaki 14 tür, 20 buluntu ve kayıtlı her tür', () => {
  assert.equal(TASARIM_TURLERI.length, 14);
  for (const ad of TASARIM_TURLERI) assert.ok(esyaCizimiVar(ad), ad);
  assert.equal(KATALOG.length, 20);
  for (const b of KATALOG) assert.ok(esyaCizimiVar(`buluntu:${b.tur}`), b.tur);
  for (const t of esyaTurleri()) assert.ok(esyaCizimiVar(t.anahtar), t.anahtar);
  for (const ad of [...TASARIM_TURLERI, 'buluntu:nal']) {
    const { ctx, cagrilar } = sahteBaglam();
    ctx.save();
    esyaCizimiAdla(ad)(ctx, ESYA_R, 0.25);
    ctx.restore();
    assert.ok(cagrilar.length > 2, `${ad} hiçbir şey çizmedi`);
  }
});

test('bant: düz ve dönemeç çıtaları toplu yola, gövde dönemeçte çeyrek halka', () => {
  const { c, tarla } = dunya();
  bantCek(c, tarla, 10, 10, 0, 2);
  const kose = kur(c, tarla, 'bant', 12, 10, 1);
  kos(c, tarla, 1);
  const duz = c.parcalar.get(c.izgara.dolu[10 * 120 + 10] - 1);
  for (const [p, yolTuru] of [[duz, 'dolgu'], [kose, 'cizgi']]) {
    const yollar = { dolgu: new SahteYol(), cizgi: new SahteYol() };
    const an = { faz: 0.7, c, dolgu: () => yollar.dolgu, cizgi: () => yollar.cizgi };
    bantCitalari(sahteBaglam().ctx, p, an, 0.05);
    assert.ok(yollar[yolTuru].cagrilar.length >= 4, `${yolTuru} çıta yok`);
    const { ctx, cagrilar } = sahteBaglam();
    bantGovde(ctx, p, 0.05, c);
    assert.equal(cagrilar.some(([ad]) => ad === 'arc'), yolTuru === 'cizgi');
  }
  // Uzak görünümde (karo < 7 CSS px) çıta çizilmez.
  const yol = new SahteYol();
  bantCitalari(sahteBaglam().ctx, duz, { faz: 0, c, dolgu: () => yol, cizgi: () => yol }, 2);
  assert.equal(yol.cagrilar.length, 0);
});
