/**
 * Yarış sunucusu dayanıklılığı: IP başına bağlantı ve oda sınırı, kapanıştan sonra tampon,
 * aşım sayacının azalması, ping hız sınırı, statik dosyalar için beyaz liste.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { sunucuAc } from '../sunucu/sunucu.js';
import { HizSiniri, ASIM_AZALMA } from '../sunucu/dogrulama.js';
import { Baglanti } from '../sunucu/websocket.js';

const sunucular = [];
async function ac(secenek = {}) {
  const s = await sunucuAc({ port: 0, host: '127.0.0.1', geriSayimMs: 20, ...secenek });
  sunucular.push(s);
  return s;
}
after(() => Promise.all(sunucular.map((s) => s.kapat())));

/** Bağlanır; 'merhaba' gelince çözülür, reddedilirse hata iletisiyle reddeder. */
function baglan(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const iletiler = [];
  const tamam = new Promise((coz, red) => {
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      iletiler.push(m);
      if (m.t === 'merhaba') coz(ws);
    });
    ws.addEventListener('error', () => red(new Error('bağlanamadı')));
  });
  return tamam.then(() => ({ ws, iletiler }));
}
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));

test('IP başına bağlantı sınırı: sınırdan sonrası reddedilir, kapanınca yer açılır', async () => {
  const s = await ac({ ipBaglanti: 3 });
  const acik = [];
  for (let i = 0; i < 3; i++) acik.push(await baglan(s.port));
  await assert.rejects(baglan(s.port), /bağlanamadı/);
  acik[0].ws.close();
  await bekle(100);
  const yeni = await baglan(s.port);
  for (const { ws } of [...acik, yeni]) ws.close();
});

test('IP başına oda sınırı: sınırı aşan oda kurulamaz, boşalan oda yer açar', async () => {
  const s = await ac({ ipOda: 2 });
  const o = [];
  for (let i = 0; i < 3; i++) o.push(await baglan(s.port));
  for (const { ws } of o.slice(0, 2)) ws.send(JSON.stringify({ t: 'kur', ad: 'K' }));
  await bekle(100);
  o[2].ws.send(JSON.stringify({ t: 'kur', ad: 'K' }));
  await bekle(100);
  assert.equal(o[2].iletiler.at(-1).kod, 'oda-siniri');
  o[0].ws.send(JSON.stringify({ t: 'ayril' }));
  await bekle(100);
  o[2].ws.send(JSON.stringify({ t: 'kur', ad: 'K' }));
  await bekle(100);
  assert.equal(o[2].iletiler.at(-1).t, 'oda');
  for (const { ws } of o) ws.close();
});

test('vekil açıksa sınır X-Forwarded-For adresine göre sayılır', async () => {
  const s = await ac({ ipBaglanti: 1, vekil: true });
  const istek = (xff) => new Promise((coz) => {
    const soket = net.connect(s.port, '127.0.0.1', () => soket.write(el(xff)));
    soket.once('data', (v) => coz({ soket, ilk: v.toString('latin1').split('\r\n')[0] }));
  });
  const a = await istek('10.0.0.1');
  const b = await istek('10.0.0.2');
  const c = await istek('10.0.0.1');
  assert.match(a.ilk, /101/);
  assert.match(b.ilk, /101/);
  assert.match(c.ilk, /429/);
  for (const { soket } of [a, b, c]) soket.destroy();
});

/** Ham el sıkışma isteği (isteğe bağlı X-Forwarded-For ile). */
function el(xff) {
  return 'GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
    + 'Sec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n'
    + `${xff ? `X-Forwarded-For: ${xff}\r\n` : ''}\r\n`;
}

/** Sahte soket: Baglanti'nın ihtiyaç duyduğu parçalar. */
function sahteSoket() {
  const soket = new EventEmitter();
  Object.assign(soket, {
    writableLength: 0, setNoDelay() {}, write() {}, end() {}, destroy() {}, pause() {},
  });
  return soket;
}

test('kapat() sonrası gelen veri tampona eklenmez', () => {
  const soket = sahteSoket();
  const b = new Baglanti(soket);
  soket.emit('data', Buffer.from([0xc1, 0x80, 0, 0, 0, 0])); // RSV bitli çerçeve -> 1002
  assert.equal(b.kapali, true);
  for (let i = 0; i < 20; i++) soket.emit('data', Buffer.alloc(1 << 16, 0x41));
  assert.equal(b.tamponBoyu, 0);
});

test('aşım sayacı zamanla azalır, süren taşkında artar', () => {
  const h = new HizSiniri(30, 15, 0);
  for (let i = 0; i < 150; i++) h.asimEkle(0);
  assert.equal(Math.round(h.asim), 150);
  const sonra = h.asimEkle((150 / ASIM_AZALMA + 1) * 1000);
  assert.ok(sonra <= 1.0001, `azalmadı: ${sonra}`);
  const g = new HizSiniri(30, 15, 0);
  let son = 0;
  for (let i = 0; i < 400; i++) son = g.asimEkle(i * 10); // 100 ret/sn >> azalma
  assert.ok(son > 200, `taşkında sayaç ${son}`);
});

/** Maskeli ping çerçevesi (yük boş). */
const PING = Buffer.from([0x89, 0x80, 1, 2, 3, 4]);

test('ping hız sınırı: yağdıran istemciye sınırsız pong yazılmaz', async () => {
  const s = await ac();
  const soket = net.connect(s.port, '127.0.0.1', () => soket.write(el()));
  let veri = Buffer.alloc(0);
  soket.on('data', (v) => { veri = Buffer.concat([veri, v]); });
  await bekle(100);
  const once = veri.length;
  soket.write(Buffer.concat(Array.from({ length: 100 }, () => PING)));
  await bekle(200);
  const pong = (veri.length - once) / 2; // her pong 2 bayt (0x8a 0x00)
  assert.ok(pong >= 1 && pong <= 15, `pong sayısı ${pong}`);
  soket.destroy();
});

test('statik: yalnız oyun dosyaları sunulur (beyaz liste)', async () => {
  const s = await ac();
  const durum = async (yol) => (await fetch(`http://127.0.0.1:${s.port}${yol}`)).status;
  for (const yol of ['/', '/index.html', '/stil.css', '/belirtec.css', '/sw.js', '/favicon.ico',
    '/manifest.webmanifest', '/js/ana.js', '/font/alfa-slab-one.woff2', '/ikon/ikon-192.png']) {
    assert.equal(await durum(yol), 200, yol);
  }
  for (const yol of ['/CLAUDE.md', '/README.md', '/package.json', '/KAYNAKLAR.md',
    '/docs/KARAKTER_TASARIM.md', '/dev/', '/araclar/denetim.mjs', '/tests/koruma.test.js',
    '/sunucu/sunucu.js', '/.git/HEAD', '/font/OFL-alfaslabone.txt.bak.yok']) {
    assert.equal(await durum(yol), 404, yol);
  }
});
