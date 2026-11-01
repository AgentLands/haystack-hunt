/**
 * Ses ölçümü: oyunu Chromium'da açar, AudioContext'i OfflineAudioContext ile değiştirip
 * her sesi gerçek olay yolundan (olaylar.js) çaldırır, çıkışı çözümler ve tablo basar:
 * tepe, RMS, yaklaşık LUFS, süre, spektral merkez ve 4 kHz üstü pay; ayrıca birlikte çalma
 * senaryolarında kırpılma (tepe > 0 dBFS) denetimi.
 *   node araclar/ses-olc.cjs [--kok KLASOR] [--cikti dosya.json] [--md dosya.md]
 * Ham mod (kırpmadan önceki toplam) ve normal mod (kullanıcının duyduğu) ayrı koşturulur.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { kAgirlikla, dilimOlc } = require('./ses-olc-analiz.cjs');
const { yama, calistir } = require('./ses-olc-sayfa.cjs');

const TURLER = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json',
  '.ogg': 'audio/ogg' };

function bayrak(ad, varsayilan) {
  const i = process.argv.indexOf(`--${ad}`);
  return i > 0 ? process.argv[i + 1] : varsayilan;
}

function sunucuAc(kok) {
  const sunucu = http.createServer((ist, yan) => {
    const yol = decodeURIComponent(new URL(ist.url, 'http://x').pathname);
    const dosya = path.join(kok, yol === '/' ? 'index.html' : yol);
    if (!dosya.startsWith(kok) || !fs.existsSync(dosya) || fs.statSync(dosya).isDirectory()) {
      yan.writeHead(404); yan.end(); return;
    }
    const tur = TURLER[path.extname(dosya)] || 'application/octet-stream';
    yan.writeHead(200, { 'Content-Type': tur });
    fs.createReadStream(dosya).pipe(yan);
  });
  return new Promise((coz) => sunucu.listen(0, '127.0.0.1', () => coz(sunucu)));
}

/** Bir senaryoyu bir sayfa yüklemesinde çalıştırır. */
async function kos(tarayici, adres, senaryo, ham) {
  const sure = { dilimler: 175, toplu: 10.6, ani: 6.4, asiri: 6.4 }[senaryo];
  const sayfa = await tarayici.newPage();
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await sayfa.addInitScript(yama, { sure, ham });
  await sayfa.goto(`${adres}/?tohum=olcum`);
  await sayfa.waitForTimeout(500);
  await sayfa.keyboard.press('Shift'); // kullanıcı hareketi: ses bağlamı kurulur
  const sonuc = await sayfa.evaluate(calistir, { senaryo });
  await sayfa.close();
  const x = new Float32Array(Buffer.from(sonuc.veri, 'base64').buffer.slice(0));
  const kx = kAgirlikla(x, sonuc.sr);
  const satirlar = sonuc.dilimler.map((d) => {
    const s = (v) => Math.round(v * sonuc.sr);
    return { ad: d.ad, kat: d.kat, ...dilimOlc(x, kx, sonuc.sr, s(d.bas), s(d.son),
      d.pencere.map(s)) };
  });
  return { satirlar, hatalar };
}

const f = (v, n = 1) => (v <= -170 ? '-inf' : v.toFixed(n));

function tablo(satirlar, ham) {
  const yaz = ['| ses | kat | tepe dBFS | RMS | LUFS | LUFS-400 | süre sn | merkez Hz | >4k % |',
    '|---|---|---|---|---|---|---|---|---|'];
  for (const s of satirlar) {
    const hamTepe = ham ? ham.find((h) => h.ad === s.ad).tepe : null;
    yaz.push(`| ${s.ad} | ${s.kat} | ${f(s.tepe)}${hamTepe !== null ? ` (ham ${f(hamTepe)})` : ''}`
      + ` | ${f(s.rms)} | ${f(s.lufs)} | ${f(s.lufs400)} | ${s.sure.toFixed(2)}`
      + ` | ${Math.round(s.merkez)} | ${Math.round(s.tiz * 100)} |`);
  }
  return yaz.join('\n');
}

(async () => {
  const kok = path.resolve(bayrak('kok', path.resolve(__dirname, '..')));
  const sunucu = await sunucuAc(kok);
  const adres = `http://127.0.0.1:${sunucu.address().port}`;
  const tarayici = await chromium.launch();
  const sonuc = { hatalar: [] };
  for (const senaryo of ['dilimler', 'toplu', 'ani', 'asiri']) {
    const normal = await kos(tarayici, adres, senaryo, false);
    const ham = await kos(tarayici, adres, senaryo, true);
    sonuc[senaryo] = { normal: normal.satirlar, ham: ham.satirlar };
    sonuc.hatalar.push(...new Set([...normal.hatalar, ...ham.hatalar]));
  }
  await tarayici.close();
  sunucu.close();
  const cikti = bayrak('cikti');
  if (cikti) fs.writeFileSync(cikti, JSON.stringify(sonuc, null, 1));
  const md = ['## Tek tek sesler', tablo(sonuc.dilimler.normal, sonuc.dilimler.ham),
    '## Birlikte çalma: toplu senaryo', tablo(sonuc.toplu.normal, sonuc.toplu.ham),
    '## Birlikte çalma: ani yığılma', tablo(sonuc.ani.normal, sonuc.ani.ham),
    '## Birlikte çalma: aşırı yığılma (her olay 4 kez)',
    tablo(sonuc.asiri.normal, sonuc.asiri.ham)].join('\n\n');
  const mdDosya = bayrak('md');
  if (mdDosya) fs.writeFileSync(mdDosya, md);
  console.log(md);
  if (sonuc.hatalar.length) console.log('SAYFA HATALARI:', JSON.stringify(sonuc.hatalar));
})();
