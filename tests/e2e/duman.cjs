/**
 * Tarayıcı duman testi: kendi statik sunucusunu açar, Chromium'da çiftçiyle oynar
 * (klavyeyle traktöre yürü, bin, kepçeyle saman al, in; dedektör; iğneye yürü, Boşlukla
 * kazıp bul), sayfa hatası olmadığını ve telefon genişliğinde yatay taşma olmadığını
 * denetler. ?tohum= verilince açılış menüsü atlanır (doğrudan o tarla); menü ayrıca tohumsuz
 * açılışta denetlenir (açık, klavye oyuna gitmiyor, "Günün tarlası" kapatıyor, ≡ yeniden açıyor).
 * Dayanıklı: sabit bekleme yok; her adım oyun durumuna (window.__e2e, bkz. ortak.cjs) bağlı
 * koşul bekler, zaman aşımları cömerttir. CPU yavaşlatma: --yavas 4.
 * Ekran görüntüsü için: --ekran KLASOR
 *   node tests/e2e/duman.cjs [--ekran /yol] [--yavas N]
 */
const path = require('node:path');
const o = require('./ortak.cjs');

const ekran = o.bayrak('ekran');
const ekranAl = (sayfa, ad) => (ekran ? sayfa.screenshot({ path: path.join(ekran, ad) }) : null);
const menuAcik = (s) => s.evaluate(() => document.getElementById('menu').open);

/** Tohumsuz açılış: menü açık mı, klavye oyuna gidiyor mu, düğmeler kapatıp açıyor mu. */
async function menuDenetle(sayfa, kok, sc) {
  await o.git(sayfa, kok);
  const ac = await o.bekle(sayfa, () => document.getElementById('menu').open);
  sc.dogrula('menu-acilis', ac, 'açılış menüsü açılmadı');
  await ekranAl(sayfa, '0-menu.png');
  const once = await o.ozet(sayfa);
  await sayfa.keyboard.down('d');
  await o.kareBekle(sayfa, 15);
  await sayfa.keyboard.up('d');
  const sonra = await o.ozet(sayfa);
  sc.dogrula('menu-klavye', sonra.k.x === once.k.x, 'menü açıkken klavye oyuna gitti');
  await sayfa.click('#gunun');
  const kapandi = await o.bekle(sayfa, () => !document.getElementById('menu').open);
  sc.dogrula('menu-gunun-kapatir', kapandi, '"Günün tarlası" menüyü kapatmadı');
  await sayfa.click('#menu-ac');
  sc.dogrula('menu-ac-dugmesi', await o.bekle(sayfa, () => document.getElementById('menu').open),
    '≡ düğmesi menüyü açmadı');
  await sayfa.keyboard.press('Escape');
  sc.dogrula('menu-esc', await o.bekle(sayfa, () => !document.getElementById('menu').open),
    'Esc menüyü kapatmadı');
}

/** Traktöre yürü, bin, kepçeyle saman al, in. Dönüş: son makine özeti. */
async function traktorDenetle(sayfa, sc) {
  const yurudu = await o.yuru(sayfa, (s) => [s.makineler[0].x, s.makineler[0].y], 3.6);
  sc.dogrula('traktore-yuru', yurudu, 'karakter traktöre yürüyemedi');
  const yakit0 = (await o.ozet(sayfa)).makineler[0].yakit;
  await sayfa.keyboard.press('e');
  const bindi = await o.bekle(sayfa, () => window.__e2e.durumAl().karakter.makine !== null);
  sc.dogrula('traktore-bin', bindi, 'traktöre binilemedi');
  // İleri sür ve kepçeyi çalıştır: yük dolana ve yakıt eksilene dek (en çok 30 sn).
  await sayfa.keyboard.down('w');
  await sayfa.keyboard.down('Space');
  const aldi = await o.bekle(sayfa, (y0) => {
    const m = window.__e2e.durumAl().makineler[0];
    return m.yuk > 0 && m.yakit < y0;
  }, yakit0, 30000);
  await ekranAl(sayfa, '2-traktor.png');
  await sayfa.keyboard.up('Space');
  await sayfa.keyboard.up('w');
  const t = (await o.ozet(sayfa)).makineler[0];
  sc.dogrula('kepce-saman', t.yuk > 0, 'kepçe saman almadı');
  sc.dogrula('yakit-harcandi', t.yakit < yakit0, 'yakıt harcanmadı');
  await sayfa.keyboard.press('e');
  const indi = await o.bekle(sayfa, () => window.__e2e.durumAl().karakter.makine === null);
  sc.dogrula('traktorden-in', indi, 'traktörden inilemedi');
  return { bindi, yuk: t.yuk, aldi };
}

/** Dedektör: durduğu yerde bir hak (Normal 4 haktan 3 kalır). */
async function dedektorDenetle(sayfa, sc) {
  await sayfa.keyboard.press('3');
  await sayfa.keyboard.down('Space');
  const kullanildi = await o.bekle(sayfa, () => window.__e2e.durumAl().dedektor === 3);
  await sayfa.keyboard.up('Space');
  sc.dogrula('dedektor-kullanildi', kullanildi, 'dedektör kullanılmadı');
}

/** İğneye yürü, el ile Boşluğu basılı tutup kaz; bitiş penceresini bekler. */
async function igneBul(sayfa, sc) {
  await sayfa.keyboard.press('1');
  const vardi = await o.yuru(sayfa, (s) => [s.igne.x + 0.5, s.igne.y + 0.5], 1.6);
  sc.dogrula('igneye-yuru', vardi, 'karakter iğneye yürüyemedi');
  await ekranAl(sayfa, '3-yurume.png');
  await sayfa.keyboard.down('Space');
  const bulundu = await o.bekle(sayfa, () => document.getElementById('bitis').open, null, 60000);
  await ekranAl(sayfa, '4-kaziliyor.png');
  await sayfa.keyboard.up('Space');
  await ekranAl(sayfa, '5-bulundu.png');
  sc.dogrula('igne-bulundu', bulundu, 'iğne bulunamadı (bitiş penceresi açılmadı)');
  return bulundu;
}

o.calistir(async () => {
  const sc = new o.Senaryo('duman');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, hatalar } = await o.sayfaYarat(tarayici, { sw: true });
  await menuDenetle(sayfa, kok, sc);
  await o.git(sayfa, `${kok}?tohum=deneme`);
  await ekranAl(sayfa, '1-baslangic.png');
  const t = await traktorDenetle(sayfa, sc);
  await dedektorDenetle(sayfa, sc);
  const bulundu = await igneBul(sayfa, sc);
  const fps = await sayfa.evaluate(() => new Promise((coz) => {
    let n = 0; const s = performance.now();
    const f = () => {
      n++;
      if (performance.now() - s < 1000) requestAnimationFrame(f);
      else coz(n);
    };
    requestAnimationFrame(f);
  }));
  const mobil = await o.sayfaYarat(tarayici, {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  await o.git(mobil.sayfa, `${kok}?tohum=deneme`);
  const { tasma } = await o.yerlesim(mobil.sayfa);
  await ekranAl(mobil.sayfa, '6-mobil.png');
  sc.dogrula('mobil-tasma-yok', !tasma, 'telefonda yatay taşma var');
  sc.hatalariDenetle([...hatalar, ...mobil.hatalar]);
  await tarayici.close();
  await kapat();
  sc.bitir(`(bindi=${t.bindi} kepce=${t.yuk.toFixed(2)} bulundu=${bulundu} fps=${fps})`);
});
