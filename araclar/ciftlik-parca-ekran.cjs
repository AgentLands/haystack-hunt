/**
 * Çiftlik parça önizlemesinin ekran görüntüleri (dev/ciftlik-onizleme.html): A (19 px, 4 yön),
 * B (56 px, 4 durum), C (hat sahnesi) bölümleri 1280×800 DPR 1 ve 390×844 DPR 3'te, sabit
 * zamanda; ayrıca hareketli/gövde çizim süresini (window.__olc) yazar. Sunucuyu açmaz:
 *   python3 -m http.server PORT &   node araclar/ciftlik-parca-ekran.cjs --adres
 *   http://127.0.0.1:PORT --cikti KLASOR [--zaman 2400] [--bolum A]
 */
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

function arg(ad, varsayilan) {
  const i = process.argv.indexOf(`--${ad}`);
  return i > 0 ? process.argv[i + 1] : varsayilan;
}

const adres = arg('adres', 'http://127.0.0.1:8000');
const cikti = arg('cikti', 'ekran-ciftlik-parca');
const zaman = Number(arg('zaman', '2400'));
const bolumler = arg('bolum', 'A,B,C').split(',');
const OLCULER = [
  { ad: 'masaustu', en: 1280, boy: 800, dpr: 1 },
  { ad: 'telefon', en: 390, boy: 844, dpr: 3 },
];

(async () => {
  fs.mkdirSync(cikti, { recursive: true });
  const tarayici = await chromium.launch();
  for (const o of OLCULER) {
    const sayfa = await tarayici.newPage({
      viewport: { width: o.en, height: o.boy }, deviceScaleFactor: o.dpr,
    });
    sayfa.on('pageerror', (h) => console.error('sayfa hatası:', h.message));
    sayfa.on('console', (m) => m.type() === 'error' && console.error('konsol:', m.text()));
    for (const b of bolumler) {
      await sayfa.goto(`${adres}/dev/ciftlik-onizleme.html?zaman=${zaman}&bolum=${b}`);
      await sayfa.waitForFunction(() => window.__hazir === true);
      const dosya = path.join(cikti, `${b}-${o.ad}.png`);
      await sayfa.screenshot({ path: dosya, fullPage: true });
      console.log('yazıldı', dosya);
    }
    if (o.dpr === 1) {
      console.log('süre', JSON.stringify(await sayfa.evaluate(() => window.__olc())));
    }
    await sayfa.close();
  }
  await tarayici.close();
})().catch((hata) => {
  console.error(hata);
  process.exit(1);
});
