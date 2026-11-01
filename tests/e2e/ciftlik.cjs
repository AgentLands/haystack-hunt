/**
 * Senaryo: çiftlik modu. Menüden "Çiftlik"e girilir; B ile palet açılır, gerçek işaretçi
 * olaylarıyla emici huni, sürüklenerek bant ve sandık kurulur; birkaç saniye sonra sandıkta
 * saman olur. Kayıt (inşadan 2 sn sonra) yazılır; sayfa yenilenince (?mod=ciftlik) parçalar ve
 * sandık geri gelir. Menüden "Günün tarlası"na dönülür: normal mod açılır, istatistikteki
 * "oynanan" çiftlik yüzünden artmaz. Telefonda (390×844, dokunma): yatay taşma yok, palete
 * dokun + tuvale dokun kurar, tek parmak sürükleme bant çeker, iki parmak bir şey kurmaz.
 *   node tests/e2e/ciftlik.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const REHBER_GORULDU = () => {
  try {
    localStorage.setItem('haystack-hunt:rehber-goruldu', '1');
  } catch (hata) {
    console.error(hata);
  }
};

/** Çiftlik bilgisi: parça listesi, sandık içerikleri. */
const ciftlikOzet = (s) => s.evaluate(() => {
  const d = window.__e2e.durumAl();
  if (d.mod !== 'ciftlik') return { mod: d.mod };
  const parcalar = [...d.ciftlik.parcalar.values()];
  const sandik = parcalar.find((p) => p.tanim.anahtar === 'sandik');
  return { mod: d.mod, parca: parcalar.map((p) => p.tanim.anahtar).sort(),
    sandik: sandik ? sandik.ozel.toplam : null, tik: d.ciftlik.tik };
});

/** Huni + 4 bant + sandık sığan, huninin çevresi samanlı yer (karo) ve ekran çevirici. */
const yerBul = (s) => s.evaluate(async () => {
  const iz = await import('./js/kural/ciftlik/izgara.js');
  const pk = await import('./js/kural/ciftlik/parca-kayit.js');
  const d = window.__e2e.durumAl();
  const { ciftlik: c, tarla: t } = d;
  const tani = (ad) => pk.parcaTanimi(ad);
  let en = null;
  for (let ky = 2; ky < 76; ky++) {
    for (let kx = 2; kx < 110; kx++) {
      if (iz.yerlestirmeEngeli(c, t, tani('huni'), kx, ky, 0)) continue;
      let uygun = !iz.yerlestirmeEngeli(c, t, tani('sandik'), kx + 6, ky, 0);
      for (let i = 2; i <= 5 && uygun; i++) {
        uygun = !iz.yerlestirmeEngeli(c, t, tani('bant'), kx + i, ky, 0);
      }
      if (!uygun) continue;
      let top = 0;
      for (let y = ky * 2 - 2; y <= ky * 2 + 6; y++) {
        for (let x = kx * 2 - 2; x <= kx * 2 + 6; x++) top += t.h[y * 240 + x];
      }
      if (!en || top > en.top) en = { kx, ky, top };
    }
  }
  return en;
});

/** Karonun ekran (CSS px) merkezi. */
const ekran = (s, kx, ky) => s.evaluate(async ([x, y]) => {
  const { gorunum } = await import('./js/gorunum.js');
  const { dunyadanEkrana } = await import('./js/kural/gorunum.js');
  const r = document.getElementById('tarla').getBoundingClientRect();
  const p = dunyadanEkrana(gorunum, x * 2 + 1, y * 2 + 1);
  return { x: r.left + p.fx * r.width, y: r.top + p.fy * r.height };
}, [kx, ky]);

/** Kamerayı karoya getirir (takip bırakılmış olmalı: 0 tuşu ya da sığdır). */
const odakla = (s, kx, ky, z) => s.evaluate(async ([x, y, zz]) => {
  const { gorunumAyarla } = await import('./js/gorunum.js');
  const { odakla: od } = await import('./js/kural/gorunum.js');
  const { gorunum } = await import('./js/gorunum.js');
  const { takipBirak } = await import('./js/ozellik/kamera-takip.js');
  takipBirak();
  gorunumAyarla(od({ ...gorunum, gx: x * 2 - 20, gy: y * 2 - 14 }, 0.5, 0.5, zz));
}, [kx, ky, z]);

async function tikla(s, kx, ky) {
  const p = await ekran(s, kx, ky);
  await s.mouse.move(p.x, p.y);
  await s.mouse.down();
  await s.mouse.up();
}

async function masaustu(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, kok);
  const istOnce = await s.evaluate(() => localStorage.getItem('haystack-hunt:istatistik'));
  await s.click('.menu-ciftlik');
  sc.dogrula('ciftlik-acildi', await o.bekle(s, () => window.__e2e.durumAl().mod === 'ciftlik'),
    'menüden çiftliğe girilemedi');
  sc.dogrula('adres', await s.evaluate(() => location.search === '?mod=ciftlik'),
    'adres ?mod=ciftlik değil');
  const yer = await yerBul(s);
  sc.dogrula('yer-bulundu', Boolean(yer), 'kurulacak yer yok');
  await odakla(s, yer.kx + 3, yer.ky, 3);
  await s.keyboard.press('b');
  sc.dogrula('palet', await s.isVisible('.ciftlik-palet'), 'B paleti açmadı');
  await s.click('.ciftlik-parca[data-parca="huni"]');
  await tikla(s, yer.kx, yer.ky);
  await s.click('.ciftlik-parca[data-parca="bant"]');
  const a = await ekran(s, yer.kx + 2, yer.ky);
  const b = await ekran(s, yer.kx + 5, yer.ky);
  await s.mouse.move(a.x, a.y);
  await s.mouse.down();
  await s.mouse.move(b.x, b.y, { steps: 10 });
  await s.mouse.up();
  await s.click('.ciftlik-parca[data-parca="sandik"]');
  await tikla(s, yer.kx + 6, yer.ky);
  const kuruldu = await o.bekle(s, () => window.__e2e.durumAl().ciftlik.parcalar.size === 6);
  sc.dogrula('kuruldu', kuruldu, `parçalar: ${JSON.stringify((await ciftlikOzet(s)).parca)}`);
  const doldu = await o.bekle(s, () => [...window.__e2e.durumAl().ciftlik.parcalar.values()]
    .some((p) => p.tanim.anahtar === 'sandik' && p.ozel.toplam >= 1), null, 20000);
  sc.dogrula('sandikta-saman', doldu, `sandık boş: ${JSON.stringify(await ciftlikOzet(s))}`);
  const kayitli = await o.bekle(s, () => {
    const m = localStorage.getItem('haystack-hunt:ciftlik');
    return Boolean(m) && JSON.parse(m).parcalar.length === 6;
  }, null, 8000);
  sc.dogrula('kaydedildi', kayitli, 'inşadan sonra kayıt yazılmadı');
  const once = await ciftlikOzet(s);
  await s.reload();
  await o.kancaBagla(s);
  const sonra = await ciftlikOzet(s);
  sc.dogrula('yenile-mod', sonra.mod === 'ciftlik', `yenileyince mod ${sonra.mod}`);
  sc.dogrula('yenile-parca', JSON.stringify(sonra.parca) === JSON.stringify(once.parca),
    `parçalar ${JSON.stringify(sonra.parca)}`);
  sc.dogrula('yenile-sandik', sonra.sandik >= 1, `sandık ${sonra.sandik}`);
  await s.keyboard.press('Escape');
  await o.bekle(s, () => document.getElementById('menu').open);
  await s.click('#gunun');
  sc.dogrula('normal-mod', await o.bekle(s, () => window.__e2e.durumAl().mod === 'tarla'),
    'menüden normal moda dönülemedi');
  sc.dogrula('normal-adres', await s.evaluate(() => /tohum=/.test(location.search)
    && !/mod=/.test(location.search)), 'normal modda adres düzelmedi');
  const istSonra = await s.evaluate(() => localStorage.getItem('haystack-hunt:istatistik'));
  sc.dogrula('istatistik-ayni', istSonra === istOnce, 'çiftlik istatistiğe yazdı');
  await s.close();
  return hatalar;
}

async function telefon(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, {
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  });
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, `${kok}?mod=ciftlik`);
  const y = await o.yerlesim(s);
  sc.dogrula('tel-tasma-yok', !y.tasma, `scrollWidth ${y.scrollWidth} > ${y.innerWidth}`);
  const yer = await yerBul(s);
  await odakla(s, yer.kx + 3, yer.ky, 4);
  const dokun = await o.dokunmaKur(s);
  const tap = async (p) => { await dokun.bas(1, p.x, p.y); await dokun.birak(1); };
  await tap(await o.kutu(s, '.ciftlik-insa-ac'));
  sc.dogrula('tel-palet', await s.isVisible('.ciftlik-palet'), 'İnşa düğmesi paleti açmadı');
  const y2 = await o.yerlesim(s);
  sc.dogrula('tel-palet-tasma-yok', !y2.tasma, `palette taşma ${y2.scrollWidth}`);
  await tap(await o.kutu(s, '.ciftlik-parca[data-parca="sandik"]'));
  await tap(await ekran(s, yer.kx + 6, yer.ky));
  sc.dogrula('tel-dokun-kur', await o.bekle(s, () => window.__e2e.durumAl().ciftlik.parcalar
    .size === 1), 'dokununca sandık kurulmadı');
  await tap(await o.kutu(s, '.ciftlik-parca[data-parca="bant"]'));
  const a = await ekran(s, yer.kx + 2, yer.ky);
  const b = await ekran(s, yer.kx + 5, yer.ky);
  await dokun.bas(1, a.x, a.y);
  for (let i = 1; i <= 8; i++) await dokun.tasi(1, a.x + ((b.x - a.x) * i) / 8, a.y);
  await dokun.birak(1);
  sc.dogrula('tel-surukle-bant', await o.bekle(s, () => window.__e2e.durumAl().ciftlik.parcalar
    .size === 5), `bant çekilmedi: ${JSON.stringify((await ciftlikOzet(s)).parca)}`);
  const c = await ekran(s, yer.kx + 2, yer.ky + 4);
  await dokun.bas(1, c.x, c.y);
  await dokun.bas(2, c.x + 60, c.y + 60);
  await dokun.tasi(2, c.x + 90, c.y + 90);
  await dokun.hepsiniBirak();
  await o.kareBekle(s, 6);
  sc.dogrula('tel-iki-parmak', (await ciftlikOzet(s)).parca.length === 5,
    'iki parmak hareketi parça kurdu');
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle([...await masaustu(tarayici, sunucu.kok, sc),
      ...await telefon(tarayici, sunucu.kok, sc)]);
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
