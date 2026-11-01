/**
 * Senaryo: çiftlik modu. Menüden "Çiftlik"e girilir; B ile palet açılır, gerçek işaretçi
 * olaylarıyla emici huni, sürüklenerek bant ve sandık kurulur; birkaç saniye sonra sandıkta
 * saman olur. Kayıt (inşadan 2 sn sonra) yazılır; sayfa yenilenince (?mod=ciftlik) parçalar ve
 * sandık geri gelir. Menüden "Günün tarlası"na dönülür: normal mod açılır, istatistikteki
 * "oynanan" çiftlik yüzünden artmaz. Telefonda (390×844, dokunma): yatay taşma yok, palete
 * dokun + tuvale dokun + ✓ kurar, tek parmak sürükleme bant çeker, iki parmak bir şey kurmaz.
 * (İnşa arayüzünün ayrıntılı senaryoları: ciftlik-insa.cjs, ciftlik-insa-tel.cjs.)
 *   node tests/e2e/ciftlik.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const {
  REHBER_GORULDU, ciftlikOzet, yerBul, ekran, odakla, tikla,
} = require('./ciftlik-ortak.cjs');

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
  await odakla(s, yer.kx + 3, yer.ky, 6); // kur kipi en yakına (z 6) yaklaşır: baştan orada
  const dokun = await o.dokunmaKur(s);
  const tap = async (p) => { await dokun.bas(1, p.x, p.y); await dokun.birak(1); };
  await tap(await o.kutu(s, '.ciftlik-insa-ac'));
  sc.dogrula('tel-palet', await s.isVisible('.ciftlik-palet'), 'İnşa düğmesi paleti açmadı');
  const y2 = await o.yerlesim(s);
  sc.dogrula('tel-palet-tasma-yok', !y2.tasma, `palette taşma ${y2.scrollWidth}`);
  await tap(await o.kutu(s, '.ciftlik-parca[data-parca="sandik"]'));
  await tap(await ekran(s, yer.kx + 6, yer.ky)); // tek dokunuş: hayalet + ✓ baloncuğu
  await o.bekle(s, () => !document.querySelector('.ciftlik-baloncuk').hidden);
  await tap(await o.kutu(s, '.ciftlik-onay'));
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
  // İkinci parmak yukarıda: aşağısı paletin düğmelerine düşebilir (tuval görmez).
  await dokun.bas(2, c.x + 60, c.y - 60);
  await dokun.tasi(2, c.x + 90, c.y - 90);
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
