/**
 * Senaryo: çiftlik kaydı. İnşadan sonra kayıt yazılır (parçalar + tik); sayfa yenilenince aynı
 * dünya gelir (tik geriye gitmez); sekme gizlenince kayıt tazelenir; bozuk son kayıtta yedek
 * kullanılır; ikisi de bozuksa yeni çiftlik + bildirim (parça yok, çökme yok); normal moda
 * dönüp çiftliğe dönmek aynı dünyayı verir; depo dolunca (kota) oyuncuya bildirim gelir ve
 * oyun sürer. Hata günlükleri bilinçli (bozuk kayıt console.error'u izinli).
 *   node tests/e2e/ciftlik-kayit.cjs [--yavas N]
 */
const o = require('./ortak.cjs');
const {
  REHBER_GORULDU, ciftlikOzet, yerBul, komut, depoOku, menudenAc, menuAc,
} = require('./ciftlik-ortak.cjs');

const ANAHTAR = 'haystack-hunt:ciftlik';
const YEDEK = 'haystack-hunt:ciftlik-yedek';
const KAYIT_HATALARI = ['Çiftlik kaydı bozuk', 'Çiftlik kaydı yüklenemedi',
  'Çiftlik kaydedilemedi'];

const kayitliParca = (s) => s.evaluate(([a]) => {
  const m = localStorage.getItem(a);
  return m ? JSON.parse(m).parcalar.filter((p) => p[1] !== 31).length : -1; // 31: kapı
}, [ANAHTAR]);

/** Sandık + iki bant kurar (kurulabilir yerde); 3 parçalı kayıt yazılana dek bekler. */
async function kurVeKaydet(s) {
  const { kx, ky } = await yerBul(s);
  await komut(s, { tur: 'kur', parca: 'sandik', x: kx + 6, y: ky });
  await o.kareBekle(s, 8);
  await komut(s, { tur: 'kur', parca: 'bant', x: kx + 2, y: ky, yon: 0 });
  await komut(s, { tur: 'kur', parca: 'bant', x: kx + 3, y: ky, yon: 0 });
  return o.bekle(s, () => {
    const m = localStorage.getItem('haystack-hunt:ciftlik');
    return Boolean(m) && JSON.parse(m).parcalar.filter((p) => p[1] !== 31).length === 3;
  }, null, 8000);
}

async function kayitAkisi(tarayici, kok, sc) {
  const { sayfa: s, baglam, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, kok);
  sc.dogrula('ac', await menudenAc(s, o), 'menüden çiftlik açılmadı');
  sc.dogrula('kaydedildi', await kurVeKaydet(s), 'inşadan sonra 3 parçalı kayıt yazılmadı');
  const once = await ciftlikOzet(s);

  // sekme gizlenince kayıt tazelenir (tik ilerler)
  const tik0 = JSON.parse(await depoOku(s, ANAHTAR)).tik;
  await o.bekle(s, () => false, null, 1500);
  await s.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const tik1 = JSON.parse(await depoOku(s, ANAHTAR)).tik;
  sc.dogrula('gizlenince-kayit', tik1 > tik0, `kayıt tazelenmedi: tik ${tik0} → ${tik1}`);
  await s.evaluate(() => { delete document.visibilityState; });
  sc.dogrula('yedek-var', Boolean(await depoOku(s, YEDEK)),
    'ikinci kayıtta eski kayıt yedeğe geçmedi');

  // yenile: aynı dünya, tik geriye gitmez
  await s.reload();
  await o.kancaBagla(s);
  const sonra = await ciftlikOzet(s);
  sc.dogrula('yenile-mod', sonra.mod === 'ciftlik', `yenileyince mod ${sonra.mod}`);
  sc.dogrula('yenile-parca', JSON.stringify(sonra.parca) === JSON.stringify(once.parca),
    `parçalar ${JSON.stringify(sonra.parca)}`);
  sc.dogrula('yenile-tik', sonra.tik >= tik1, `tik geriye gitti: ${tik1} → ${sonra.tik}`);

  // normal moda dön, çiftliğe dön: aynı dünya
  await menuAc(s, o);
  await s.click('#gunun');
  sc.dogrula('normal', await o.bekle(s, () => window.__e2e.durumAl().mod === 'tarla'),
    'normal moda dönülemedi');
  const kayitNormalde = await kayitliParca(s);
  sc.dogrula('donuste-kayit', kayitNormalde === 3, `çıkışta kayıt ${kayitNormalde} parça`);
  sc.dogrula('geri-ac', await menudenAc(s, o), 'çiftliğe geri dönülemedi');
  sc.dogrula('geri-parca', (await ciftlikOzet(s)).parca.length === 3,
    'dönünce parçalar geri gelmedi');

  // bozuk son kayıt → yedek. Sayfa kapanırken (pagehide) güncel kayıt yazıldığından bozma,
  // YENİ sayfanın başında (addInitScript, bir kez) yapılır.
  const yedekSayisi = JSON.parse(await depoOku(s, YEDEK)).parcalar.filter((p) => p[1] !== 31)
    .length;
  await s.addInitScript(([a, ad]) => {
    if (sessionStorage.getItem(ad)) return;
    sessionStorage.setItem(ad, '1');
    localStorage.setItem(a, '{bozuk');
  }, [ANAHTAR, 'boz-1']);
  await s.goto(`${kok}?mod=ciftlik`);
  await o.kancaBagla(s);
  const yedektenGelen = await ciftlikOzet(s);
  sc.dogrula('yedekten', yedektenGelen.mod === 'ciftlik'
    && yedektenGelen.parca.length === yedekSayisi,
    `yedekten ${JSON.stringify(yedektenGelen.parca)} (beklenen ${yedekSayisi} parça)`);

  // ikisi de bozuk → yeni çiftlik + bildirim
  await s.addInitScript(([a, y, ad]) => {
    if (sessionStorage.getItem(ad)) return;
    sessionStorage.setItem(ad, '1');
    localStorage.setItem(a, '{bozuk');
    localStorage.setItem(y, '{bozuk');
  }, [ANAHTAR, YEDEK, 'boz-2']);
  await s.goto(`${kok}?mod=ciftlik`);
  await o.kancaBagla(s);
  const yeni = await ciftlikOzet(s);
  sc.dogrula('yeni-ciftlik', yeni.mod === 'ciftlik' && yeni.parca.length === 0,
    `iki kayıt bozukken ${JSON.stringify(yeni)}`);
  sc.dogrula('bozuk-bildirim', await s.evaluate(() => /yeni bir çiftlik/.test(
    document.getElementById('bildirim').textContent)), 'okunamayan kayıtta bildirim yok');

  // ikisi de ayrıştırılabilir ama bu oyundan yeni sürüm → yüklenemez → yeni çiftlik + bildirim
  await s.addInitScript(([a, y, ad]) => {
    if (sessionStorage.getItem(ad)) return;
    sessionStorage.setItem(ad, '1');
    localStorage.setItem(a, '{"surum":99}');
    localStorage.setItem(y, '{"surum":99}');
  }, [ANAHTAR, YEDEK, 'boz-3']);
  await s.goto(`${kok}?mod=ciftlik`);
  await o.kancaBagla(s);
  sc.dogrula('yeni-yapi-ciftlik', (await ciftlikOzet(s)).parca.length === 0,
    'yüklenemeyen kayıtta yeni çiftlik açılmadı');
  sc.dogrula('yeni-yapi-bildirim', await s.evaluate(() => /yeni bir çiftlik/.test(
    document.getElementById('bildirim').textContent)), 'yüklenemeyen kayıtta bildirim yok');
  await baglam.close();
  return hatalar.filter((h) => !KAYIT_HATALARI.some((k) => h.includes(k)) && !/JSON/.test(h));
}

async function kotaDolu(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await s.addInitScript(REHBER_GORULDU);
  await o.git(s, `${kok}?mod=ciftlik`);
  await s.evaluate(() => {
    const orijinal = Storage.prototype.setItem;
    Storage.prototype.setItem = function dolu(a, v) {
      if (String(a).startsWith('haystack-hunt:ciftlik')) {
        throw new DOMException('dolu', 'QuotaExceededError');
      }
      return orijinal.call(this, a, v);
    };
  });
  const yer = await yerBul(s);
  await komut(s, { tur: 'kur', parca: 'sandik', x: yer.kx + 6, y: yer.ky });
  sc.dogrula('kota-bildirim', await o.bekle(s, () => /deposu dolu/.test(
    document.getElementById('bildirim').textContent), null, 6000), 'depo dolunca bildirim gelmedi');
  const t0 = (await ciftlikOzet(s)).tik;
  await o.bekle(s, () => false, null, 800);
  sc.dogrula('kota-surer', (await ciftlikOzet(s)).tik > t0, 'kota hatasından sonra oyun durdu');
  await s.close();
  return hatalar.filter((h) => !/QuotaExceeded|kaydedilemedi|dolu/.test(h));
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-kayit');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle([...await kayitAkisi(tarayici, sunucu.kok, sc),
      ...await kotaDolu(tarayici, sunucu.kok, sc)]);
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
