/**
 * Senaryo (c): meydan okuma. Oyun bitince fişte "Meydan oku" bağlantısı üretilir (pano
 * yakalanır); bağlantıyla açılışta HUD'da "Geçilecek süre" etiketi görünür, bitişte fark
 * cümlesi yazılır; `ad` parametresindeki HTML (<img onerror>, <svg onload>) metin olarak
 * gösterilir (betik çalışmaz, öğe oluşmaz); geçersiz rakip etiket çıkarmaz; başka tarlada
 * etiket gizlenir; bağlantıdaki oturum rahat açılmaz.
 *   node tests/e2e/meydan.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const KISA_XSS = '<svg/onload=a()>'; // 16 karakter: ad sınırına sığan en kısa etkin yük
const UZUN_XSS = '<img src=x onerror=a()>';

/** Betikle zararlı yük çalışırsa window.__xss = 1 olur; yük işlevi sayfa yüklenmeden kurulur. */
async function xssKancasi(baglam) {
  await baglam.addInitScript(() => { window.a = () => { window.__xss = 1; }; });
}

/** Panoyu ve paylaşımı yakalanır yapar (paylaşım yok sayılır; metin window.__pano'da). */
function panoYakala(sayfa) {
  return sayfa.evaluate(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    window.__pano = null;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (t) => { window.__pano = t; } }, configurable: true,
    });
  });
}

const hedefEtiket = (s) => s.evaluate(() => {
  const e = document.querySelector('.meydan-etiket.hedef');
  return e ? { gizli: e.hidden, metin: e.textContent, cocuk: e.children.length } : null;
});

async function baglantiUret(sayfa, kok, sc) {
  await o.git(sayfa, `${kok}?tohum=mey1`);
  await panoYakala(sayfa);
  sc.dogrula('baslangicta-etiket-gizli', (await hedefEtiket(sayfa)).gizli,
    'rakipsiz oyunda "Geçilecek süre" etiketi görünüyor');
  const bitti = await o.igneyiHizlaBul(sayfa, 1500);
  sc.dogrula('fis-acildi', bitti, 'bitiş fişi açılmadı');
  await sayfa.fill('.meydan-ad input', 'Ayşe');
  await sayfa.click('.meydan-dugme');
  const kopya = await o.bekle(sayfa, () => window.__pano !== null);
  sc.dogrula('baglanti-kopyalandi', kopya, '"Meydan oku" panoya bir şey yazmadı');
  const pano = await sayfa.evaluate(() => window.__pano);
  const sure = await sayfa.evaluate(() => window.__e2e.durumAl().sonuc.sureMs);
  const satir = (pano || '').split('\n').find((l) => l.startsWith('http')) || '';
  const adres = new URL(satir || kok);
  sc.dogrula('baglanti-tohum', adres.searchParams.get('tohum') === 'mey1', `adres: ${satir}`);
  sc.dogrula('baglanti-zorluk', adres.searchParams.get('zorluk') === 'normal', `adres: ${satir}`);
  sc.dogrula('baglanti-rakip', Math.abs(Number(adres.searchParams.get('rakip')) - sure) <= 1,
    `rakip ${adres.searchParams.get('rakip')} ≠ süre ${sure}`);
  sc.dogrula('baglanti-ad', adres.searchParams.get('ad') === 'Ayşe', `adres: ${satir}`);
  sc.dogrula('baglanti-igne-yok', !/igne|x=|y=/i.test(adres.search),
    `bağlantıda iğne konumu olmamalı: ${adres.search}`);
  sc.dogrula('dugme-kopyalandi', (await sayfa.textContent('.meydan-dugme')) === 'Kopyalandı',
    'düğme "Kopyalandı" demedi');
  return satir;
}

async function baglantiyiAc(baglam, satir, sc) {
  const sayfa = await baglam.newPage();
  await o.git(sayfa, satir);
  const e = await hedefEtiket(sayfa);
  sc.dogrula('hedef-gorunur', e && !e.gizli && /^Geçilecek süre: \d+:\d\d \(Ayşe\)$/.test(e.metin),
    `etiket: ${JSON.stringify(e)}`);
  sc.dogrula('hedef-konumu', await sayfa.evaluate(() => {
    const r = document.querySelector('.meydan-etiket.hedef').getBoundingClientRect();
    const t = document.getElementById('tarla').getBoundingClientRect();
    return r.width > 0 && r.left >= t.left - 1 && r.top >= t.top - 1;
  }), 'hedef etiketi tuvalin üzerinde görünür değil');
  sc.dogrula('rahat-kapali', !(await o.ozet(sayfa)).rahat, 'bağlantı oyunu rahat açıldı');
  const bitti = await o.igneyiHizlaBul(sayfa, 1200);
  sc.dogrula('baglanti-fis', bitti, 'bağlantıyla açılan oyun bitmedi');
  const fark = await sayfa.evaluate(() => {
    const f = document.querySelector('.meydan-fark');
    return { gizli: f.hidden, metin: f.textContent, sinif: f.className };
  });
  sc.dogrula('fark-cumlesi', !fark.gizli
    && /^(Rakibi .+ farkla geçtin\.|.+ geride kaldın\.|Rakiple aynı sürede buldun\.)$/
      .test(fark.metin), `fark: ${JSON.stringify(fark)}`);
  // Başka tarlada etiket gizlenir, adresten rakip düşer.
  await sayfa.evaluate(() => window.__e2e.yeniOyun('baska', 'normal'));
  await o.kareBekle(sayfa, 2);
  const sonra = await hedefEtiket(sayfa);
  sc.dogrula('baska-tarlada-gizli', sonra.gizli, 'başka tarlada hedef etiketi kaldı');
  sc.dogrula('baska-tarlada-adres', !sayfa.url().includes('rakip='), `adres: ${sayfa.url()}`);
  await sayfa.close();
}

async function xssDenetle(baglam, kok, sc) {
  for (const [ad, yuk] of [['kisa', KISA_XSS], ['uzun', UZUN_XSS]]) {
    const sayfa = await baglam.newPage();
    const adres = `${kok}?tohum=xss&zorluk=normal&rakip=83000&ad=${encodeURIComponent(yuk)}`;
    await o.git(sayfa, adres);
    const e = await hedefEtiket(sayfa);
    const beklenen = [...yuk].slice(0, 16).join('');
    sc.dogrula(`xss-${ad}-metin`, e && e.metin === `Geçilecek süre: 1:23 (${beklenen})`,
      `etiket metni: ${e && e.metin}`);
    sc.dogrula(`xss-${ad}-ogesiz`, e && e.cocuk === 0 && await sayfa.locator(
      '.meydan-yigin img, .meydan-yigin svg, #etiket img').count() === 0,
    'ad HTML olarak yorumlandı (öğe oluştu)');
    await o.kareBekle(sayfa, 10); // betik çalışacaksa çalışmış olur
    sc.dogrula(`xss-${ad}-betik-yok`, !(await sayfa.evaluate(() => window.__xss)),
      'ad parametresindeki betik çalıştı (XSS)');
    await sayfa.close();
  }
  // Geçersiz rakip süresi: etiket çıkmaz.
  const gecersiz = await baglam.newPage();
  await o.git(gecersiz, `${kok}?tohum=xss&rakip=abc&ad=Ali`);
  sc.dogrula('gecersiz-rakip-gizli', (await hedefEtiket(gecersiz)).gizli,
    'geçersiz rakip süresiyle etiket çıktı');
  await gecersiz.close();
  // Rahat parametresi meydan okumayla birlikte gelirse süre oyunu rahat açılmaz.
  const rahat = await baglam.newPage();
  await o.git(rahat, `${kok}?tohum=xss&rakip=83000&rahat=1`);
  sc.dogrula('rahat-meydan', !(await o.ozet(rahat)).rahat, '?rahat=1 + rakip oyunu rahat açtı');
  await rahat.close();
}

o.calistir(async () => {
  const sc = new o.Senaryo('meydan');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, baglam, hatalar } = await o.sayfaYarat(tarayici);
  await xssKancasi(baglam);
  const baglanti = await baglantiUret(sayfa, kok, sc);
  await baglantiyiAc(baglam, baglanti, sc);
  await xssDenetle(baglam, kok, sc);
  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});
