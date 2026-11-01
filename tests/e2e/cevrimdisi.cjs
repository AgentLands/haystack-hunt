/**
 * Senaryo (h): çevrimdışı. Service worker kurulup sayfa ve tüm dosyalar önbelleğe girdikten
 * sonra sunucu GERÇEKTEN kapatılır (bağlantı reddedilir); ağsız açılışta oyun kurulur, çiftçi
 * yürür, yenileme ve farklı adres (?tohum=, ?zorluk=) de çalışır, yeni sekme de açılır.
 *   node tests/e2e/cevrimdisi.cjs [--yavas N]
 */
const net = require('node:net');
const o = require('./ortak.cjs');

/** Sunucu portuna bağlanılabiliyor mu (kapalıysa false). */
function portAcikMi(port) {
  return new Promise((coz) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.destroy(); coz(true); });
    s.on('error', () => coz(false));
  });
}

/** SW denetimde ve sayfanın yüklediği her dosya (ve sayfa) önbellekte mi. */
function onbellekHazirMi() {
  return (async () => {
    if (!navigator.serviceWorker.controller) return false;
    const adresler = performance.getEntriesByType('resource')
      .map((k) => k.name).filter((a) => a.startsWith(location.origin) && !a.includes('/sw.js'));
    if (adresler.length < 20) return false;
    const varlar = await Promise.all([location.origin + '/', ...adresler]
      .map((a) => caches.match(a)));
    return varlar.every(Boolean);
  })();
}

/** SW denetimde ve her dosya önbellekte olana dek (en çok 30 sn) sayfada yoklar. */
async function onbellekBekle(sayfa) {
  const bitis = Date.now() + o.pay(30000);
  while (Date.now() < bitis) {
    if (await sayfa.evaluate(onbellekHazirMi)) return true;
    await sayfa.waitForTimeout(200);
  }
  return false;
}

async function oyunCalisiyor(sayfa, sc, ad, etiket) {
  const d = await sayfa.evaluate(() => {
    const t = document.getElementById('tarla');
    const durum = window.__e2e.durumAl();
    return { etiket: durum.etiket, zorluk: durum.zorluk, tuval: t.width > 0 && t.height > 0,
      hud: document.getElementById('etiket').textContent };
  });
  sc.dogrula(`${ad}-oyun-kuruldu`, d.etiket === etiket && d.tuval,
    `oyun kurulmadı: ${JSON.stringify(d)}`);
  const x0 = (await o.ozet(sayfa)).k.x;
  await sayfa.keyboard.down('d');
  const yurudu = await o.bekle(sayfa, (x) => window.__e2e.durumAl().karakter.x > x + 2, x0);
  await sayfa.keyboard.up('d');
  sc.dogrula(`${ad}-yuruyor`, yurudu, 'çevrimdışı açılışta karakter yürümedi');
  return d;
}

o.calistir(async () => {
  const sc = new o.Senaryo('cevrimdisi');
  const { sunucu, kok, kapat } = await o.sunucuAc();
  const port = sunucu.address().port;
  const tarayici = await o.tarayiciAc();
  const { sayfa, baglam, hatalar } = await o.sayfaYarat(tarayici, { sw: true });
  await o.git(sayfa, `${kok}?tohum=cevrimdisi`);
  const hazir = await onbellekBekle(sayfa);
  sc.dogrula('sw-onbellek-hazir', hazir,
    'service worker kurulmadı ya da dosyalar önbelleğe girmedi');
  const ilkHata = hatalar.length;

  await kapat();
  sc.dogrula('sunucu-kapali', !(await portAcikMi(port)), 'sunucu kapatılamadı (test geçersiz)');

  await sayfa.goto(`${kok}?tohum=cevrimdisi`);
  await o.kancaBagla(sayfa);
  await oyunCalisiyor(sayfa, sc, 'acilis', 'cevrimdisi');
  const hud = await sayfa.textContent('#etiket');
  sc.dogrula('hud-etiketi', /Tarla No\. CEVRIMDISI · Normal/i.test(hud), `HUD: ${hud}`);

  await sayfa.reload();
  await o.kancaBagla(sayfa);
  await oyunCalisiyor(sayfa, sc, 'yenileme', 'cevrimdisi');

  await sayfa.goto(`${kok}?tohum=baska&zorluk=zor`);
  await o.kancaBagla(sayfa);
  const zor = await oyunCalisiyor(sayfa, sc, 'baska-adres', 'baska');
  sc.dogrula('baska-adres-zorluk', zor.zorluk === 'zor', `zorluk: ${zor.zorluk}`);

  const yeni = await baglam.newPage();
  yeni.on('pageerror', (e) => hatalar.push(e.message));
  await yeni.goto(`${kok}?tohum=yeni-sekme`);
  await o.kancaBagla(yeni);
  await oyunCalisiyor(yeni, sc, 'yeni-sekme', 'yeni-sekme');

  // Ağ hatası sayfanın kendi betik hatası sayılmaz; yalnız betik hataları denetlenir.
  const betikHatalari = hatalar.slice(ilkHata).filter((h) => !/Failed to load resource/.test(h));
  sc.hatalariDenetle(betikHatalari);
  await tarayici.close();
  sc.bitir();
});
