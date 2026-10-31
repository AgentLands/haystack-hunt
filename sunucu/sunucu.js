/**
 * Yarış sunucusu (bağımlılıksız, Node 22): repo kökündeki oyunun statik dosyalarını sunar
 * ve /ws yolunda WebSocket ile yarış odalarını yürütür (protokol: sunucu/PROTOKOL.md).
 *   node sunucu/sunucu.js --port 8080 [--host 0.0.0.0]
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { elSikis, reddet, OLAGAN_KOPMA } from './websocket.js';
import { Odalar } from './odalar.js';
import { iletiCoz, HizSiniri } from './dogrulama.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MAKS_BAGLANTI = 1000;
/** Tek uzak adresten aynı anda en çok bağlantı ve kurulu oda (bir istemci herkesi dışlamasın). */
export const MAKS_IP_BAGLANTI = 8;
export const MAKS_IP_ODA = 3;
/** Hız sınırı aşım sayacı (zamanla azalır) bunu geçerse bağlantı 1008 ile kapatılır. */
const ASIM_TAVANI = 200;
export const SURUM = 1;
const TURLER = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
/**
 * Yalnız oyun dosyaları sunulur (beyaz liste): kökte index.html, *.css, manifest, sw.js,
 * favicon.ico; klasör olarak js/, font/, ikon/. CLAUDE.md, package.json, docs/, dev/,
 * araclar/, tests/, sunucu/ ve nokta ile başlayan her şey sunulmaz.
 */
const KOK_DOSYALAR = /^(index\.html|[\w-]+\.css|manifest\.webmanifest|sw\.js|favicon\.ico)$/;
const KLASORLER = new Set(['js', 'font', 'ikon']);

function sunulurMu(parcalar) {
  if (parcalar.length === 0) return true; // '/' -> index.html
  if (parcalar.length === 1) return KOK_DOSYALAR.test(parcalar[0]);
  return KLASORLER.has(parcalar[0]);
}

function yolAl(istek) {
  return URL.canParse(istek.url, 'http://x') ? new URL(istek.url, 'http://x').pathname : null;
}

/** İstemcinin adresi; `vekil` açıksa güvenilir vekilin eklediği X-Forwarded-For'un SON değeri. */
function uzakAdres(istek, vekil) {
  const xff = vekil ? String(istek.headers['x-forwarded-for'] || '') : '';
  const baslik = xff.split(',').pop().trim();
  return baslik || istek.socket.remoteAddress || 'bilinmiyor';
}

function bitir(yanit, durum, metin) {
  yanit.writeHead(durum, { 'Content-Type': 'text/plain; charset=utf-8' });
  yanit.end(metin);
}

async function statikSun(kok, istek, yanit) {
  if (istek.method !== 'GET' && istek.method !== 'HEAD') return bitir(yanit, 405, 'İzin yok');
  const yol = yolAl(istek);
  const parcalar = (yol || '').split('/').filter(Boolean);
  const gecerli = yol !== null && /^[\w\-./]*$/.test(yol)
    && parcalar.every((p) => !p.startsWith('.')) && sunulurMu(parcalar);
  if (!gecerli) return bitir(yanit, 404, 'Bulunamadı');
  const dosya = path.join(kok, ...(parcalar.length ? parcalar : ['index.html']));
  let bilgi;
  try {
    bilgi = await stat(dosya);
  } catch (hata) {
    if (hata.code !== 'ENOENT' && hata.code !== 'ENOTDIR') console.error('stat hatası:', hata);
    return bitir(yanit, 404, 'Bulunamadı');
  }
  if (!bilgi.isFile()) return bitir(yanit, 404, 'Bulunamadı');
  yanit.writeHead(200, {
    'Content-Type': TURLER[path.extname(dosya)] || 'application/octet-stream',
    'Content-Length': bilgi.size,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  if (istek.method === 'HEAD') return yanit.end();
  // pipeline: istemci kopunca (yanıt yok edilince) okuma akışı da kapanır, fd sızmaz.
  return pipeline(createReadStream(dosya), yanit, (hata) => {
    if (hata && hata.code !== 'ERR_STREAM_PREMATURE_CLOSE' && !OLAGAN_KOPMA.has(hata.code)) {
      console.error('Dosya okunamadı:', hata);
    }
  });
}

/** Bir WebSocket bağlantısını oyuncuya çevirir ve odalara bağlar. */
function oyuncuBagla(ws, id, ip, odalar) {
  const oyuncu = { id, ip, gonder: (metin) => ws.gonder(metin) };
  const hiz = new HizSiniri();
  let reddedilen = 0;
  const hataGonder = (kod, mesaj) => oyuncu.gonder(JSON.stringify({ t: 'hata', kod, mesaj }));
  ws.on('ileti', (metin) => {
    if (!hiz.izinVer()) {
      reddedilen += 1;
      if (hiz.asimEkle() > ASIM_TAVANI) ws.kapat(1008, 'hız sınırı');
      else if (reddedilen % 20 === 1) hataGonder('hiz', 'Çok hızlı ileti gönderiyorsun');
      return;
    }
    const { ileti, hata } = iletiCoz(metin);
    if (hata) return hataGonder('gecersiz', hata);
    return odalar.isle(oyuncu, ileti);
  });
  ws.on('kapandi', () => odalar.ayril(oyuncu));
  oyuncu.gonder(JSON.stringify({ t: 'merhaba', id, surum: SURUM }));
}

/**
 * Sunucuyu açar. Seçenekler: port (0 = rastgele), host, kok (statik kök),
 * geriSayimMs, yarisMs, nabizMs, ipBaglanti, ipOda, vekil (güvenilir ters vekil arkasında
 * X-Forwarded-For kullan). Döner: { sunucu, port, odalar, kapat() }.
 */
export function sunucuAc({
  port = 8080, host, kok = KOK, geriSayimMs = 1000, yarisMs, nabizMs = 15000,
  ipBaglanti = MAKS_IP_BAGLANTI, ipOda = MAKS_IP_ODA, vekil = false,
} = {}) {
  const odalar = new Odalar({ geriSayimMs, yarisMs, ipOda });
  const baglantilar = new Set();
  const ipSayac = new Map(); // uzak adres -> açık bağlantı sayısı
  let sayac = 0;
  const sunucu = http.createServer((istek, yanit) => {
    statikSun(kok, istek, yanit).catch((hata) => {
      console.error('İstek işlenemedi:', hata);
      if (!yanit.headersSent) bitir(yanit, 500, 'Sunucu hatası');
    });
  });
  sunucu.on('upgrade', (istek, soket) => {
    soket.on('error', (hata) => {
      if (!OLAGAN_KOPMA.has(hata.code)) console.error('Yükseltme soketi hatası:', hata);
    });
    if (yolAl(istek) !== '/ws') return reddet(soket, '404 Not Found');
    if (baglantilar.size >= MAKS_BAGLANTI) return reddet(soket, '503 Service Unavailable');
    const ip = uzakAdres(istek, vekil);
    if ((ipSayac.get(ip) || 0) >= ipBaglanti) return reddet(soket, '429 Too Many Requests');
    const ws = elSikis(istek, soket);
    if (!ws) return undefined;
    baglantilar.add(ws);
    ipSayac.set(ip, (ipSayac.get(ip) || 0) + 1);
    ws.on('kapandi', () => {
      baglantilar.delete(ws);
      const kalan = (ipSayac.get(ip) || 1) - 1;
      if (kalan > 0) ipSayac.set(ip, kalan);
      else ipSayac.delete(ip);
    });
    sayac += 1;
    return oyuncuBagla(ws, sayac, ip, odalar);
  });
  const nabiz = setInterval(() => {
    for (const ws of baglantilar) ws.nabiz();
  }, nabizMs);
  nabiz.unref();
  const kapat = () => new Promise((coz) => {
    clearInterval(nabiz);
    odalar.kapat();
    for (const ws of baglantilar) ws.soket.destroy();
    sunucu.close(() => coz());
    sunucu.closeAllConnections();
  });
  return new Promise((coz, red) => {
    sunucu.once('error', red);
    sunucu.listen(port, host, () => {
      sunucu.off('error', red);
      coz({ sunucu, port: sunucu.address().port, odalar, kapat });
    });
  });
}

function argumanlar(argv) {
  const deger = (ad) => {
    const i = argv.indexOf(ad);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const port = Number(deger('--port') ?? 8080);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Geçersiz port: ${deger('--port')}`);
  }
  return { port, host: deger('--host') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const secenek = argumanlar(process.argv.slice(2));
  const { port } = await sunucuAc(secenek);
  console.log(`Haystack Hunt yarış sunucusu: http://localhost:${port} (WebSocket: /ws)`);
}
