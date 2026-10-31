/**
 * Yarış sunucusu testleri (node --test): gerçek sunucu rastgele portta açılır, Node'un
 * yerleşik WebSocket istemcisiyle oyuncular bağlanır; oda kur/katıl/başlat/imleç/bulundu
 * akışı, girdi doğrulama, ileti sınırı ve statik dosya güvenliği denetlenir.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sunucuAc } from '../sunucu/sunucu.js';
import { adTemizle, kodTemizle, iletiCoz, HizSiniri } from '../sunucu/dogrulama.js';
import { cerceveCoz, kabulAnahtari, MAKS_ILETI } from '../sunucu/websocket.js';

let s;
let adres;
before(async () => {
  s = await sunucuAc({ port: 0, host: '127.0.0.1', geriSayimMs: 20 });
  adres = `127.0.0.1:${s.port}`;
});
after(() => s.kapat());

/** Bağlanır; gelen iletileri sırayla biriktirir. bekle(t, kosul) ilk uyanı döner. */
async function oyuncu() {
  const ws = new WebSocket(`ws://${adres}/ws`);
  const iletiler = [];
  const bekleyenler = [];
  let kapanis = null;
  const dene = () => {
    for (const b of [...bekleyenler]) {
      const i = iletiler.findIndex((m, n) => n >= b.baslangic && m.t === b.t && b.kosul(m));
      if (i >= 0) {
        bekleyenler.splice(bekleyenler.indexOf(b), 1);
        b.coz(iletiler[i]);
      }
    }
  };
  ws.addEventListener('message', (e) => {
    iletiler.push(JSON.parse(e.data));
    dene();
  });
  const kapandi = new Promise((coz) => ws.addEventListener('close', (e) => {
    kapanis = e.code;
    coz(e.code);
  }));
  await new Promise((coz, red) => {
    ws.addEventListener('open', coz);
    ws.addEventListener('error', red);
  });
  const o = {
    ws, iletiler, kapandi,
    get kapanis() { return kapanis; },
    gonder: (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)),
    bekle(t, kosul = () => true, baslangic = 0) {
      return new Promise((coz, red) => {
        const zaman = setTimeout(() => red(new Error(`'${t}' iletisi gelmedi`)), 2000);
        bekleyenler.push({ t, kosul, baslangic, coz: (m) => { clearTimeout(zaman); coz(m); } });
        dene();
      });
    },
  };
  o.merhaba = await o.bekle('merhaba');
  return o;
}

test('iki oyuncu: kur, katıl, başlat, imleç, bulundu, pes, rövanş', async () => {
  const a = await oyuncu();
  const b = await oyuncu();
  a.gonder({ t: 'kur', ad: '  Ayşe  ' });
  const oda = await a.bekle('oda');
  assert.match(oda.kod, /^[A-Z]{4}$/);
  assert.equal(oda.kurucu, a.merhaba.id);
  assert.equal(oda.oyuncular[0].ad, 'Ayşe');

  b.gonder({ t: 'katil', oda: oda.kod.toLowerCase(), ad: 'Bora' });
  const lobi = await a.bekle('oda', (m) => m.oyuncular.length === 2);
  assert.deepEqual(lobi.oyuncular.map((k) => k.ad), ['Ayşe', 'Bora']);
  assert.notEqual(lobi.oyuncular[0].renk, lobi.oyuncular[1].renk);

  b.gonder({ t: 'baslat' });
  assert.equal((await b.bekle('hata')).kod, 'kurucu-degil');

  a.gonder({ t: 'baslat', zorluk: 'zor' });
  const sayimlar = [];
  for (const n of [3, 2, 1]) sayimlar.push((await b.bekle('geri-sayim', (m) => m.n === n)).n);
  assert.deepEqual(sayimlar, [3, 2, 1]);
  const [ba, bb] = await Promise.all([a.bekle('basla'), b.bekle('basla')]);
  assert.match(ba.etiket, /^[0-9a-z]{6}$/);
  assert.equal(ba.etiket, bb.etiket);
  assert.equal(ba.zorluk, 'zor');
  assert.equal(bb.zorluk, 'zor');
  await b.bekle('oda', (m) => m.durum === 'yaris');

  a.gonder({ t: 'imlec', x: 10, y: 20, saman: 55 });
  const im = await b.bekle('imlec');
  assert.deepEqual(im, { t: 'imlec', id: a.merhaba.id, x: 10, y: 20, saman: 55 });
  assert.equal(a.iletiler.some((m) => m.t === 'imlec'), false, 'kendi imleci geri gelmez');

  b.gonder({ t: 'bulundu', sureMs: 4321, saman: 900 });
  const kazanan = await a.bekle('kazanan');
  assert.equal(kazanan.id, b.merhaba.id);
  assert.equal(kazanan.ad, 'Bora');
  const ara = await a.bekle('oda', (m) => m.oyuncular.some((k) => k.sira === 1));
  assert.equal(ara.durum, 'yaris', 'biri hâlâ arıyor');

  a.gonder({ t: 'pes' });
  const son = await b.bekle('oda', (m) => m.durum === 'bitti');
  const bora = son.oyuncular.find((k) => k.id === b.merhaba.id);
  const ayse = son.oyuncular.find((k) => k.id === a.merhaba.id);
  assert.deepEqual([bora.durum, bora.sira, bora.sureMs, bora.saman], ['buldu', 1, 4321, 900]);
  assert.deepEqual([ayse.durum, ayse.sira], ['pes', null]);

  const n = a.iletiler.length;
  a.gonder({ t: 'baslat' });
  const yeni = await a.bekle('basla', () => true, n);
  assert.notEqual(yeni.etiket, ba.etiket);
  a.ws.close();
  b.ws.close();
});

test('katılma hataları, ayrılınca kurucu devri, yarışta bağlantı kopması', async () => {
  const a = await oyuncu();
  const b = await oyuncu();
  const c = await oyuncu();
  c.gonder({ t: 'katil', oda: 'ZZZZ', ad: 'Cem' });
  assert.equal((await c.bekle('hata')).kod, 'oda-yok');
  c.gonder({ t: 'katil', oda: 'AB1', ad: 'Cem' });
  assert.equal((await c.bekle('hata', (m) => m.kod === 'gecersiz')).kod, 'gecersiz');

  a.gonder({ t: 'kur', ad: 'Ali' });
  const { kod } = await a.bekle('oda');
  b.gonder({ t: 'katil', oda: kod, ad: 'Banu' });
  await a.bekle('oda', (m) => m.oyuncular.length === 2);
  a.gonder({ t: 'kur', ad: 'Ali' });
  assert.equal((await a.bekle('hata')).kod, 'zaten-odada');

  a.gonder({ t: 'baslat' });
  await c.bekle('merhaba');
  await b.bekle('oda', (m) => m.durum === 'yaris');
  c.gonder({ t: 'katil', oda: kod, ad: 'Cem' });
  assert.equal((await c.bekle('hata', (m) => m.kod === 'yaris-suruyor')).kod, 'yaris-suruyor');

  a.ws.close();
  const kalan = await b.bekle('oda', (m) => m.kurucu === b.merhaba.id);
  const ali = kalan.oyuncular.find((k) => k.ad === 'Ali');
  assert.deepEqual([ali.durum, ali.bagli], ['ayrildi', false]);
  assert.equal(kalan.durum, 'yaris');
  b.gonder({ t: 'pes' });
  await b.bekle('oda', (m) => m.durum === 'bitti');
  b.ws.close();
  c.ws.close();
  await b.kapandi;
  await new Promise((coz) => setTimeout(coz, 50));
  assert.equal(s.odalar.odalar.has(kod), false, 'boş oda silinir');
});

test('oda en çok 8 oyuncu alır', async () => {
  const kurucu = await oyuncu();
  kurucu.gonder({ t: 'kur', ad: 'K' });
  const { kod } = await kurucu.bekle('oda');
  const digerleri = await Promise.all(Array.from({ length: 8 }, () => oyuncu()));
  for (const [i, o] of digerleri.entries()) o.gonder({ t: 'katil', oda: kod, ad: `O${i}` });
  await kurucu.bekle('oda', (m) => m.oyuncular.length === 8);
  const reddedilen = await Promise.race(digerleri.map((o) => o.bekle('hata')));
  assert.equal(reddedilen.kod, 'oda-dolu');
  for (const o of [kurucu, ...digerleri]) o.ws.close();
});

test('64 KB üstü ileti bağlantıyı 1009 ile kapatır; bozuk JSON hata döner', async () => {
  const a = await oyuncu();
  a.gonder('{bozuk');
  assert.equal((await a.bekle('hata')).kod, 'gecersiz');
  a.gonder('x'.repeat(MAKS_ILETI + 1));
  assert.equal(await a.kapandi, 1009);
});

test('statik dosyalar: oyun sunulur, gizli/sunucu dosyaları sunulmaz, /ws dışı yükseltme yok',
  async () => {
    const durum = async (yol) => (await fetch(`http://${adres}${yol}`)).status;
    assert.equal(await durum('/'), 200);
    assert.equal(await durum('/js/ana.js'), 200);
    for (const yol of ['/.git/HEAD', '/sunucu/sunucu.js', '/%2e%2e/etc/passwd', '/yok.js']) {
      assert.equal(await durum(yol), 404, yol);
    }
    const ws = new WebSocket(`ws://${adres}/baska`);
    await new Promise((coz) => ws.addEventListener('error', coz));
  });

test('doğrulama: ad, oda kodu, ileti kalıpları, hız sınırı', () => {
  assert.equal(adTemizle('  a‮b\u0000c   d  '), 'abc d');
  assert.equal(adTemizle('<script>'), 'script');
  assert.equal([...adTemizle('ç'.repeat(40))].length, 16);
  assert.equal(adTemizle('   '), null);
  assert.equal(adTemizle(42), null);
  assert.equal(kodTemizle(' abcd '), 'ABCD');
  assert.equal(kodTemizle('AB1D'), null);
  assert.deepEqual(iletiCoz('{"t":"imlec","x":3.4,"y":5,"saman":1,"fazla":true}').ileti,
    { t: 'imlec', x: 3, y: 5, saman: 1 });
  assert.ok(iletiCoz('{"t":"imlec","x":-1,"y":5,"saman":1}').hata);
  assert.ok(iletiCoz('{"t":"bulundu","sureMs":"1","saman":1}').hata);
  assert.ok(iletiCoz('{"t":"__proto__"}').hata);
  assert.ok(iletiCoz('[1]').hata);
  const hiz = new HizSiniri(3, 1, 0);
  assert.deepEqual([0, 0, 0, 0].map(() => hiz.izinVer(0)), [true, true, true, false]);
  assert.equal(hiz.izinVer(1000), true);
});

test('WebSocket çerçeveleri: RFC 6455 örneği, maskesiz çerçeve reddi', () => {
  assert.equal(kabulAnahtari('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
  const maskeli = Buffer.from([0x81, 0x85, 0x37, 0xfa, 0x21, 0x3d, 0x7f, 0x9f, 0x4d, 0x51, 0x58]);
  const c = cerceveCoz(maskeli);
  assert.deepEqual([c.fin, c.kod, c.yuk.toString(), c.toplam], [true, 1, 'Hello', 11]);
  assert.equal(cerceveCoz(maskeli.subarray(0, 6)), null);
  assert.equal(cerceveCoz(Buffer.from([0x81, 0x05, 72, 101, 108, 108, 111])).hata, 1002);
});
