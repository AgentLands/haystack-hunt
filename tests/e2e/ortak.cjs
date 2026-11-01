/**
 * Uçtan uca testlerin ortak araçları: statik sunucu, tarayıcı/sayfa açma, oyun durumu kancası,
 * koşul bekleme (sabit bekleme yok), klavye ile yürüme, CDP dokunma ve sonuç toplayıcı.
 *
 * Durum kancası: sayfa açılınca `window.__e2e = await import('./js/oyun.js')` ile oyunun
 * AYNI modül örneği (durumAl, yeniOyun...) sayfaya bağlanır; böylece waitForFunction içinde
 * eşzamanlı okunur. Oyun koduna dokunulmaz.
 * Yavaşlatma: `--yavas N` (ya da E2E_YAVAS=N) CDP ile işlemciyi N kat yavaşlatır.
 * Bilinen hatalar: tests/e2e/bilinen.cjs (Senaryo.dogrula kimliği listedeyse CI'yı kırmaz).
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BILINEN = require('./bilinen.cjs');

const KOK = path.resolve(__dirname, '../..');
const TURLER = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/** Komut satırı bayrağı değeri (`--ad deger`) ya da null. */
function bayrak(ad) {
  const i = process.argv.indexOf(`--${ad}`);
  return i > 0 ? process.argv[i + 1] : null;
}

/** CPU yavaşlatma çarpanı (1 = yok). */
const YAVAS = Number(bayrak('yavas') || process.env.E2E_YAVAS || 1);
/** Bekleme zaman aşımlarına yavaşlatma payı eklenir. */
const pay = (ms) => ms * Math.max(1, YAVAS);

/** Kökten statik sunucu (rastgele port). kapat(): bağlantıları da keser (çevrimdışı testi). */
function sunucuAc() {
  const sunucu = http.createServer((ist, yan) => {
    const yol = decodeURIComponent(new URL(ist.url, 'http://x').pathname);
    const dosya = path.join(KOK, yol === '/' ? 'index.html' : yol);
    if (!dosya.startsWith(KOK) || !fs.existsSync(dosya) || fs.statSync(dosya).isDirectory()) {
      yan.writeHead(404); yan.end(); return;
    }
    const tur = TURLER[path.extname(dosya)] || 'application/octet-stream';
    yan.writeHead(200, { 'Content-Type': tur });
    fs.createReadStream(dosya).pipe(yan);
  });
  return new Promise((coz) => sunucu.listen(0, '127.0.0.1', () => coz({
    sunucu,
    kok: `http://127.0.0.1:${sunucu.address().port}/`,
    kapat: () => new Promise((bit) => { sunucu.closeAllConnections(); sunucu.close(bit); }),
  })));
}

/**
 * Sonuç toplayıcı: dogrula(kimlik, kosul, aciklama). Kimlik BILINEN'de ise başarısızlık
 * "bilinen hata" olarak yazılır ve çıkış kodunu bozmaz; bilinen hata geçerse uyarılır.
 */
class Senaryo {
  constructor(ad) {
    this.ad = ad;
    this.basla = Date.now();
    this.sorunlar = [];
    this.bilinenler = [];
    this.gecenler = 0;
  }

  dogrula(kimlik, kosul, aciklama) {
    const anahtar = `${this.ad}:${kimlik}`;
    if (kosul) {
      this.gecenler += 1;
      if (BILINEN[anahtar]) this.bilinenler.push(`${anahtar} GEÇTİ, bilinenden çıkarılabilir`);
    } else if (BILINEN[anahtar]) {
      this.bilinenler.push(`${anahtar} BİLİNEN HATA: ${aciklama} (${BILINEN[anahtar]})`);
    } else {
      this.sorunlar.push(`${kimlik}: ${aciklama}`);
    }
  }

  /** Sayfa hatalarını (pageerror/console.error) toplu denetim olarak ekler. */
  hatalariDenetle(hatalar, izinli = []) {
    const kalan = hatalar.filter((h) => !izinli.some((i) => h.includes(i)));
    const metin = `sayfa hataları: ${JSON.stringify(kalan)}`;
    this.dogrula('sayfa-hatasi-yok', kalan.length === 0, metin);
  }

  /** Özeti yazar, çıkış kodunu ayarlar. */
  bitir(ek = '') {
    const sure = ((Date.now() - this.basla) / 1000).toFixed(1);
    for (const b of this.bilinenler) console.log(`  ! ${b}`);
    if (this.sorunlar.length) {
      console.error(`[${this.ad}] BAŞARISIZ (${sure} sn):\n- ${this.sorunlar.join('\n- ')}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[${this.ad}] GEÇTİ: ${this.gecenler} denetim, ${sure} sn ${ek}`.trim());
  }
}

/** Betik gövdesini çalıştırır; yakalanmamış hata çıkış kodu 1 verir. */
function calistir(govde) {
  govde().catch((hata) => { console.error(hata); process.exit(1); });
}

async function tarayiciAc() {
  return chromium.launch();
}

/** İşlemciyi yavaşlatır (CDP); YAVAS = 1 ise bir şey yapmaz. */
async function yavaslat(sayfa, kat = YAVAS) {
  if (kat <= 1) return;
  const cdp = await sayfa.context().newCDPSession(sayfa);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: kat });
}

/**
 * Yeni bağlam + sayfa açar. Dönen nesne: { sayfa, baglam, hatalar }. hatalar sayfa hatalarını
 * (pageerror, console.error) biriktirir. secenek: Playwright newContext seçenekleri +
 * { sw: true } (service worker'a izin; yoksa engellenir: hızlı ve deterministik).
 */
async function sayfaYarat(tarayici, secenek = {}) {
  const { sw = false, ...baglamSecenek } = secenek;
  const baglam = await tarayici.newContext({
    viewport: { width: 1040, height: 1000 },
    serviceWorkers: sw ? 'allow' : 'block',
    ...baglamSecenek,
  });
  const sayfa = await baglam.newPage();
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await yavaslat(sayfa);
  return { sayfa, baglam, hatalar };
}

/** Adrese gider, oyunun hazır olmasını (ilk tarla kuruldu) bekler ve durum kancasını bağlar. */
async function git(sayfa, adres) {
  await sayfa.goto(adres);
  await kancaBagla(sayfa);
}

async function kancaBagla(sayfa) {
  await sayfa.evaluate(async () => { window.__e2e = await import('./js/oyun.js'); });
  await sayfa.waitForFunction(() => window.__e2e.durumAl() !== null, null,
    { timeout: pay(10000) });
  // İlk kare çizilsin (olay dinleyicileri, düzen).
  await kareBekle(sayfa, 3);
}

/** n kare (requestAnimationFrame) geçmesini bekler: yüke göre kendiliğinden uzar. */
function kareBekle(sayfa, n = 2) {
  return sayfa.evaluate((say) => new Promise((coz) => {
    let k = 0;
    const f = () => (++k >= say ? coz() : requestAnimationFrame(f));
    requestAnimationFrame(f);
  }), n);
}

/**
 * Koşul bekler (sayfa içinde, eşzamanlı). Sağlanırsa true; zaman aşımında false (testi
 * düşürmez, çağıran dogrula ile kaydeder). fn(arg) true/dolu dönmeli.
 */
async function bekle(sayfa, fn, arg = null, ms = 10000) {
  if (fn.constructor.name === 'AsyncFunction') {
    // Playwright dönen Promise'i doğru kabul eder: koşul hiç beklenmeden "sağlanmış" olur.
    throw new Error('bekle: async koşul verilemez; eşzamanlı yaz ya da evaluate ile yokla');
  }
  try {
    await sayfa.waitForFunction(fn, arg, { timeout: pay(ms) });
    return true;
  } catch (hata) {
    if (!/Timeout/i.test(hata.message)) throw hata;
    return false;
  }
}

/** Oyun durumundan küçük, JSON'lanabilir özet. */
function ozet(sayfa) {
  return sayfa.evaluate(() => {
    const d = window.__e2e.durumAl();
    const k = d.karakter;
    return {
      etiket: d.etiket, zorluk: d.zorluk, rahat: d.rahat, arac: d.arac, bitti: d.bitti,
      baslangic: d.baslangic, ceza: d.ceza, zaman: d.sonZaman,
      k: { x: k.x, y: k.y, z: k.z, binik: k.makine !== null, makine: k.makine && k.makine.tur },
      makineler: d.makineler.map((m) => ({
        tur: m.tur, x: m.x, y: m.y, yon: m.yon, yuk: m.yuk, yakit: m.yakit, hiz: m.hiz,
        park: m.park, ikmalHakki: m.ikmalHakki,
      })),
      igne: { x: d.tarla.igne.x, y: d.tarla.igne.y },
      civiler: d.tarla.civiler.map((c) => ({ x: c.x, y: c.y, z: c.z, alindi: c.alindi })),
      buluntular: d.buluntular.map((b) => ({
        x: b.x, y: b.y, z: b.z, tur: b.tur, alindi: b.alindi, goruldu: b.goruldu,
      })),
      dedektor: d.dedektor, kaldirilan: d.tarla.kaldirilan,
    };
  });
}

module.exports = {
  KOK, YAVAS, bayrak, pay, sunucuAc, Senaryo, calistir, tarayiciAc, yavaslat, sayfaYarat, git,
  kancaBagla, kareBekle, bekle, ozet,
};
// Girdi araçları (yürüme, dokunma, ölçüm) ayrı dosyada; buradan da erişilir.
Object.assign(module.exports, require('./ortak-girdi.cjs'));
