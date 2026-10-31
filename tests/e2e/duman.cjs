/**
 * Tarayıcı duman testi: kendi statik sunucusunu açar, Chromium'da oyunu oynar
 * (dedektör, tırmık, iğneyi kazıp bulma), sayfa hatası olmadığını ve telefon
 * genişliğinde yatay taşma olmadığını denetler. Ekran görüntüsü için: --ekran KLASOR
 *   node tests/e2e/duman.cjs [--ekran /yol]
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const KOK = path.resolve(__dirname, '../..');
const TURLER = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png' };

function sunucuAc() {
  const sunucu = http.createServer((ist, yan) => {
    const yol = decodeURIComponent(new URL(ist.url, 'http://x').pathname);
    let dosya = path.join(KOK, yol === '/' ? 'index.html' : yol);
    if (!dosya.startsWith(KOK) || !fs.existsSync(dosya) || fs.statSync(dosya).isDirectory()) {
      yan.writeHead(404); yan.end(); return;
    }
    const tur = TURLER[path.extname(dosya)] || 'application/octet-stream';
    yan.writeHead(200, { 'Content-Type': tur });
    fs.createReadStream(dosya).pipe(yan);
  });
  return new Promise((coz) => sunucu.listen(0, '127.0.0.1', () => coz(sunucu)));
}

(async () => {
  const ekranIdx = process.argv.indexOf('--ekran');
  const ekran = ekranIdx > 0 ? process.argv[ekranIdx + 1] : null;
  const sunucu = await sunucuAc();
  const adres = `http://127.0.0.1:${sunucu.address().port}/?tohum=deneme`;
  const tarayici = await chromium.launch();
  const hatalar = [];
  const sayfa = await tarayici.newPage({ viewport: { width: 1040, height: 1000 } });
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await sayfa.goto(adres);
  await sayfa.waitForTimeout(800);
  if (ekran) await sayfa.screenshot({ path: path.join(ekran, '1-baslangic.png') });
  const igne = await sayfa.evaluate(async () => {
    const { tarlaKur } = await import('./js/kural/tarla.js');
    const { metindenTohum } = await import('./js/kural/rastgele.js');
    return tarlaKur(metindenTohum('deneme')).igne;
  });
  const k = await sayfa.locator('#tarla').boundingBox();
  const px = (x, y) => [k.x + ((x + 0.5) / 240) * k.width, k.y + ((y + 0.5) / 160) * k.height];
  await sayfa.keyboard.press('3');
  await sayfa.mouse.click(...px(20, 20));
  await sayfa.mouse.click(...px(igne.x + 5, igne.y - 3));
  await sayfa.keyboard.press('2');
  const [ax, ay] = px(igne.x - 30, igne.y + 25);
  await sayfa.mouse.move(ax, ay);
  await sayfa.mouse.down();
  for (let i = 0; i < 20; i++) {
    await sayfa.mouse.move(ax + i * 8, ay);
    await sayfa.waitForTimeout(16);
  }
  await sayfa.mouse.up();
  await sayfa.keyboard.press('1');
  await sayfa.mouse.move(...px(igne.x, igne.y));
  await sayfa.mouse.down();
  let bulundu = false;
  for (let i = 0; i < 300 && !bulundu; i++) {
    await sayfa.waitForTimeout(100);
    bulundu = await sayfa.evaluate(() => document.getElementById('bitis').open);
    if (ekran && i === 15) await sayfa.screenshot({ path: path.join(ekran, '2-kaziliyor.png') });
  }
  await sayfa.mouse.up();
  if (ekran) await sayfa.screenshot({ path: path.join(ekran, '3-bulundu.png') });
  const fps = await sayfa.evaluate(() => new Promise((coz) => {
    let n = 0; const s = performance.now();
    const f = () => {
      n++;
      if (performance.now() - s < 1000) requestAnimationFrame(f);
      else coz(n);
    };
    requestAnimationFrame(f);
  }));
  const mobil = await tarayici.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  mobil.on('pageerror', (e) => hatalar.push(e.message));
  await mobil.goto(adres);
  await mobil.waitForTimeout(500);
  const tasma = await mobil.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (ekran) await mobil.screenshot({ path: path.join(ekran, '4-mobil.png') });
  await tarayici.close();
  sunucu.close();
  const sorunlar = [];
  if (!bulundu) sorunlar.push('iğne bulunamadı (bitiş penceresi açılmadı)');
  if (tasma) sorunlar.push('telefonda yatay taşma var');
  if (hatalar.length) sorunlar.push(`sayfa hataları: ${JSON.stringify(hatalar)}`);
  console.log(`bulundu=${bulundu} fps=${fps} mobil_tasma=${tasma} hatalar=${hatalar.length}`);
  if (sorunlar.length) { console.error('BAŞARISIZ:\n- ' + sorunlar.join('\n- ')); process.exit(1); }
  console.log('DUMAN TESTİ GEÇTİ');
})().catch((e) => { console.error(e); process.exit(1); });
