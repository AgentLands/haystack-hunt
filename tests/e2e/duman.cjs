/**
 * Tarayıcı duman testi: kendi statik sunucusunu açar, Chromium'da çiftçiyle oynar
 * (klavyeyle traktöre yürü, bin, kepçeyle saman al, in; dedektör; iğneye yürü, Boşlukla
 * kazıp bul), sayfa hatası olmadığını ve telefon genişliğinde yatay taşma olmadığını
 * denetler. ?tohum= verilince açılış menüsü atlanır (doğrudan o tarla); menü ayrıca tohumsuz
 * açılışta denetlenir (açık, klavye oyuna gitmiyor, "Günün tarlası" kapatıyor, ≡ yeniden açıyor).
 * Ekran görüntüsü için: --ekran KLASOR
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

/** Oyunun canlı durumundan özet (aynı modül örneği: /js/oyun.js). */
function durumOku(sayfa) {
  return sayfa.evaluate(async () => {
    const { durumAl } = await import('./js/oyun.js');
    const d = durumAl();
    const { karakter: k, makineler: [m], tarla } = d;
    return {
      k: { x: k.x, y: k.y, z: k.z, binik: k.makine !== null },
      m: { x: m.x, y: m.y, yuk: m.yuk, yakit: m.yakit },
      igne: { x: tarla.igne.x, y: tarla.igne.y }, dedektor: d.dedektor,
      kaldirilan: tarla.kaldirilan,
    };
  });
}

/** Tohumsuz açılış: menü açık mı, klavye oyuna gidiyor mu, düğmeler kapatıp açıyor mu. */
async function menuDenetle(sayfa, kok, ekranAl) {
  const sorunlar = [];
  await sayfa.goto(kok);
  await sayfa.waitForTimeout(600);
  await ekranAl('0-menu.png');
  const acik = () => sayfa.evaluate(() => document.getElementById('menu').open);
  if (!(await acik())) sorunlar.push('açılış menüsü açılmadı');
  const once = await durumOku(sayfa);
  await sayfa.keyboard.down('d');
  await sayfa.waitForTimeout(400);
  await sayfa.keyboard.up('d');
  if ((await durumOku(sayfa)).k.x !== once.k.x) sorunlar.push('menü açıkken klavye oyuna gitti');
  await sayfa.click('#gunun');
  await sayfa.waitForTimeout(400);
  if (await acik()) sorunlar.push('"Günün tarlası" menüyü kapatmadı');
  await sayfa.click('#menu-ac');
  await sayfa.waitForTimeout(300);
  if (!(await acik())) sorunlar.push('≡ düğmesi menüyü açmadı');
  await sayfa.keyboard.press('Escape');
  await sayfa.waitForTimeout(300);
  if (await acik()) sorunlar.push('Esc menüyü kapatmadı');
  return sorunlar;
}

/** Klavyeyle (WASD) hedefe yürür; takılırsa önündeki samanı Boşlukla kazarak ilerler. */
async function yuru(sayfa, hedefAl, yakinlik, ekranAl) {
  const basili = new Set();
  const ayarla = async (istenen) => {
    for (const t of [...basili]) {
      if (!istenen.has(t)) { await sayfa.keyboard.up(t); basili.delete(t); }
    }
    for (const t of istenen) {
      if (!basili.has(t)) { await sayfa.keyboard.down(t); basili.add(t); }
    }
  };
  let son = null;
  let sonZaman = Date.now();
  for (let i = 0; i < 1200; i++) {
    const s = await durumOku(sayfa);
    const [hx, hy] = hedefAl(s);
    const dx = hx - s.k.x;
    const dy = hy - s.k.y;
    if (Math.hypot(dx, dy) < yakinlik) { await ayarla(new Set()); return true; }
    const istenen = new Set();
    if (dx > 0.3) istenen.add('d');
    if (dx < -0.3) istenen.add('a');
    if (dy > 0.3) istenen.add('s');
    if (dy < -0.3) istenen.add('w');
    await ayarla(istenen);
    if (ekranAl && i === 40) await ekranAl();
    if (!son || Math.hypot(s.k.x - son.x, s.k.y - son.y) > 0.2) {
      son = s.k;
      sonZaman = Date.now();
    } else if (Date.now() - sonZaman > 1000) { // takıldı: önünü kaz
      await sayfa.keyboard.down('Space');
      await sayfa.waitForTimeout(400);
      await sayfa.keyboard.up('Space');
      sonZaman = Date.now();
    }
    await sayfa.waitForTimeout(50);
  }
  await ayarla(new Set());
  return false;
}

(async () => {
  const ekranIdx = process.argv.indexOf('--ekran');
  const ekran = ekranIdx > 0 ? process.argv[ekranIdx + 1] : null;
  const ekranAl = (sayfa, ad) => (ekran ? sayfa.screenshot({ path: path.join(ekran, ad) }) : null);
  const sunucu = await sunucuAc();
  const kok = `http://127.0.0.1:${sunucu.address().port}/`;
  const adres = `${kok}?tohum=deneme`;
  const tarayici = await chromium.launch();
  const hatalar = [];
  const sayfa = await tarayici.newPage({ viewport: { width: 1040, height: 1000 } });
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  const sorunlar = await menuDenetle(sayfa, kok, (ad) => ekranAl(sayfa, ad));
  await sayfa.goto(adres);
  await sayfa.waitForTimeout(800);
  await ekranAl(sayfa, '1-baslangic.png');
  // Traktöre yürü, bin, ileri sürüp kepçeyle saman al, in.
  await yuru(sayfa, (s) => [s.m.x, s.m.y], 3.6);
  await sayfa.keyboard.press('e');
  await sayfa.waitForTimeout(100);
  const bindi = (await durumOku(sayfa)).k.binik;
  if (!bindi) sorunlar.push('traktöre binilemedi');
  await sayfa.keyboard.down('w');
  await sayfa.waitForTimeout(1500);
  await sayfa.keyboard.down('Space');
  await sayfa.waitForTimeout(2500);
  await ekranAl(sayfa, '2-traktor.png');
  await sayfa.keyboard.up('Space');
  await sayfa.keyboard.up('w');
  const traktor = await durumOku(sayfa);
  if (!(traktor.m.yuk > 0)) sorunlar.push('kepçe saman almadı');
  if (!(traktor.m.yakit < 1)) sorunlar.push('yakıt harcanmadı');
  await sayfa.keyboard.press('e');
  await sayfa.waitForTimeout(100);
  if ((await durumOku(sayfa)).k.binik) sorunlar.push('traktörden inilemedi');
  // Dedektör: durduğu yerde bir hak.
  await sayfa.keyboard.press('3');
  await sayfa.keyboard.press('Space');
  await sayfa.waitForTimeout(100);
  if ((await durumOku(sayfa)).dedektor !== 2) sorunlar.push('dedektör kullanılmadı');
  // İğneye yürü, el ile Boşluğu basılı tutup kaz.
  await sayfa.keyboard.press('1');
  const vardi = await yuru(sayfa, (s) => [s.igne.x + 0.5, s.igne.y + 0.5], 1.6,
    () => ekranAl(sayfa, '3-yurume.png'));
  if (!vardi) sorunlar.push('karakter iğneye yürüyemedi');
  await sayfa.keyboard.down('Space');
  let bulundu = false;
  for (let i = 0; i < 300 && !bulundu; i++) {
    await sayfa.waitForTimeout(100);
    bulundu = await sayfa.evaluate(() => document.getElementById('bitis').open);
    if (i === 10) await ekranAl(sayfa, '4-kaziliyor.png');
  }
  await sayfa.keyboard.up('Space');
  await ekranAl(sayfa, '5-bulundu.png');
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
  await ekranAl(mobil, '6-mobil.png');
  await tarayici.close();
  sunucu.close();
  if (!bulundu) sorunlar.push('iğne bulunamadı (bitiş penceresi açılmadı)');
  if (tasma) sorunlar.push('telefonda yatay taşma var');
  if (hatalar.length) sorunlar.push(`sayfa hataları: ${JSON.stringify(hatalar)}`);
  console.log(`bindi=${bindi} kepce=${traktor.m.yuk.toFixed(2)} bulundu=${bulundu} fps=${fps} `
    + `mobil_tasma=${tasma} hatalar=${hatalar.length}`);
  if (sorunlar.length) { console.error('BAŞARISIZ:\n- ' + sorunlar.join('\n- ')); process.exit(1); }
  console.log('DUMAN TESTİ GEÇTİ');
})().catch((e) => { console.error(e); process.exit(1); });
