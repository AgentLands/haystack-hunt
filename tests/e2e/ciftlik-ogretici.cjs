/**
 * Senaryo (BEKLEYEN, iş J/D/G): "İlk 10 dakika" tablosu (docs/ciftlik/README.md) adım adım:
 * açılışta pano üç kart ve 300 kuruş, palet yalnız üç parça, öğretici notu; huni hayaleti
 * yığın eteğine konur, bant kapıya çekilir, 30 tutam gidince D1 basılır (+150 kuruş, çatal,
 * birleştirme oluğu, oluk mıknatısı açılır); öğretici çivisi gelince "Çivi geldi!" notu;
 * mıknatıs doyar, "Boşalt"; D2; kol; ilk iğne tutucuda parlar → D3 (pres, krank, yel açılır).
 * Pano/öğretici (J) yoksa "BEKLİYOR" yazılıp çıkılır; varsa CIFTLIK_BEKLEYEN=1 ile koşar.
 * Hâlâ BEKLEYEN (birleştirme notu): (1) palet ilk damgaya dek 3 parça değil, bütün parçaları
 * (kilitliler gri) gösteriyor (I1/J kararı: README'deki "palet yalnız üç parça" uygulanmadı),
 * (2) huni/bant/teslim adımlarını arayüzden süren kısım yazılmadı (ciftlik-hud.cjs öğretici
 * akışını G ekonomisiyle zaten koşuyor).
 *   CIFTLIK_BEKLEYEN=1 node tests/e2e/ciftlik-ogretici.cjs [--yavas N]
 */
const o = require('./ortak.cjs');
const { bekleyenAcik, menudenAc } = require('./ciftlik-ortak.cjs');

/** J'nin gerçek seçicileri (birleştirmede uyarlandı). */
const SEC = {
  pano: '[data-ciftlik-pano]', kart: '[data-ciftlik-pano] .cf-kart', ogretici: '.cf-ogretici',
  kurus: '.cf-kurus strong', damga: '.cf-damga-kod', palet: '.ciftlik-palet',
};
const DAKIKA = 1200;

async function adimlar(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(s, kok);
  sc.dogrula('ac', await menudenAc(s, o), 'menüden çiftlik açılmadı');
  const pano = await s.evaluate((q) => ({
    kart: document.querySelectorAll(q.kart).length,
    kurus: document.querySelector(q.kurus)?.textContent ?? '',
    palet: [...document.querySelectorAll('.ciftlik-parca')].map((b) => b.dataset.parca),
  }), SEC);
  sc.dogrula('0-00-pano', pano.kart === 3, `pano ${pano.kart} kart`);
  sc.dogrula('0-00-kurus', /300/.test(pano.kurus), `başlangıç kuruşu "${pano.kurus}"`);
  sc.dogrula('0-00-palet-uc', pano.palet.length === 3, `ilk damgaya kadar 3 parça: ${pano.palet}`);
  sc.dogrula('0-00-ogretici', await s.isVisible(SEC.ogretici), 'öğretici notu görünmüyor');
  // 0:20 huni → 1:00 bant → 2:00 teslim: sürücü komutları arayüzden (hayalet + sürükle) gelir;
  // J gelince insa.js akışıyla (ciftlik.cjs'teki tikla/ekran yardımcıları) doldurulur.
  sc.dogrula('2-00-d1', await o.bekle(s, () => (window.__e2e.durumAl().ciftlik.ilerleme?.damgalar
    ?? []).includes('D1'), null, 3 * DAKIKA * 50), 'D1 İlk teslim 3 dk içinde basılmadı');
  sc.dogrula('d1-kuruş', /450/.test(await s.textContent(SEC.kurus)), 'D1 ödülü +150 görünmüyor');
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-ogretici');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    const { sayfa: s } = await o.sayfaYarat(tarayici);
    await o.git(s, `${sunucu.kok}?mod=ciftlik`);
    const panoVar = await s.evaluate((q) => Boolean(document.querySelector(q)), SEC.pano);
    await s.close();
    if (!panoVar) sc.bekliyor('ilk-10-dakika', 'J D G', `${SEC.pano} (pano/öğretici) yok`);
    else if (!bekleyenAcik) sc.bekliyor('ilk-10-dakika', 'J D G', 'CIFTLIK_BEKLEYEN=1 ile aç');
    else sc.hatalariDenetle(await adimlar(tarayici, sunucu.kok, sc));
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
