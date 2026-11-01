/**
 * Senaryo (b): buluntu. Durum kancasıyla en yakın buluntunun konumu bulunur; çiftçi oraya
 * yürür (takılınca kazar), Boşlukla üstündeki samanı kazar, buluntu açığa çıkar ve alınır.
 * Alınan tür "yeni sayfa" bildirimi verir, defter penceresinde ad/adet/"Yeni" ile görünür
 * (bulunmayanlar "?"), localStorage'a yazılır ve sayfa yenilenince kalıcıdır.
 *   node tests/e2e/buluntu.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const ANAHTAR = 'haystack-hunt:buluntu-defter';
const defterAc = (s) => s.click('button[aria-label^="Buluntu defteri"]');

/** Defter penceresindeki kartlar: { dolu, ad, yeni, adet } listesi ve özet metni. */
function defterKartlari(sayfa) {
  return sayfa.evaluate(() => ({
    acik: document.getElementById('buluntu-pencere').open,
    ozet: document.querySelector('.buluntu-ozet').textContent,
    kartlar: [...document.querySelectorAll('.buluntu-kart')].map((k) => ({
      dolu: !k.classList.contains('bos'),
      ad: k.querySelector('.buluntu-ad').textContent,
      yeni: Boolean(k.querySelector('.buluntu-yeni')),
      adet: (k.querySelector('.buluntu-adet') || {}).textContent || '',
    })),
  }));
}

async function defterKapat(sayfa) {
  await sayfa.keyboard.press('Escape');
  await o.bekle(sayfa, () => !document.getElementById('buluntu-pencere').open);
}

/**
 * Karaktere en yakın buluntusu olan tarlayı seçer (testi kısa tutar): adaylar sırayla
 * kurulur, en yakın olanın etiketi döner. Kurulan son tarla seçilen olur.
 */
async function yakinTarla(sayfa, adaylar) {
  const etiket = await sayfa.evaluate((liste) => {
    let en = null;
    for (const e of liste) {
      window.__e2e.yeniOyun(e, 'normal');
      const d = window.__e2e.durumAl();
      const uzak = Math.min(...d.buluntular.map((b) => Math.hypot(b.x - d.karakter.x,
        b.y - d.karakter.y)));
      if (!en || uzak < en.uzak) en = { e, uzak };
    }
    window.__e2e.yeniOyun(en.e, 'normal');
    return en.e;
  }, adaylar);
  await o.kareBekle(sayfa, 3);
  return etiket;
}

o.calistir(async () => {
  const sc = new o.Senaryo('buluntu');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, baglam, hatalar } = await o.sayfaYarat(tarayici);
  await o.git(sayfa, `${kok}?tohum=deneme`);
  await yakinTarla(sayfa, ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10']);

  // Başta defter boş: tüm sayfalar "?".
  await defterAc(sayfa);
  const bos = await defterKartlari(sayfa);
  sc.dogrula('defter-bos-acilir', bos.acik && bos.kartlar.length > 0
    && bos.kartlar.every((k) => !k.dolu && k.ad === '?'), 'başlangıçta defter boş değil');
  sc.dogrula('defter-bos-ozet', /^0 \/ \d+ sayfa dolu/.test(bos.ozet), `özet: ${bos.ozet}`);
  await defterKapat(sayfa);

  const s0 = await o.ozet(sayfa);
  sc.dogrula('buluntu-var', s0.buluntular.length >= 3 && s0.buluntular.length <= 6,
    `buluntu sayısı ${s0.buluntular.length} (3-6 beklenir)`);
  const hedef = [...s0.buluntular].sort((a, b) => Math.hypot(a.x - s0.k.x, a.y - s0.k.y)
    - Math.hypot(b.x - s0.k.x, b.y - s0.k.y))[0];
  const ad = await sayfa.evaluate(async (tur) => {
    const { turBilgisi } = await import('./js/kural/buluntu.js');
    return turBilgisi(tur).ad;
  }, hedef.tur);

  const vardi = await o.yuru(sayfa, () => [hedef.x + 0.5, hedef.y + 0.5], 1.6);
  sc.dogrula('buluntuya-yuru', vardi, `buluntuya (${hedef.x},${hedef.y}) yürünemedi`);
  await sayfa.keyboard.down('Space');
  const idx = s0.buluntular.findIndex((b) => b.x === hedef.x && b.y === hedef.y);
  const alindi = await o.bekle(sayfa, (i) => window.__e2e.durumAl().buluntular[i].alindi,
    idx, 60000);
  await sayfa.keyboard.up('Space');
  sc.dogrula('buluntu-alindi', alindi, `${hedef.tur} kazılıp alınamadı`);
  const b1 = (await o.ozet(sayfa)).buluntular[idx];
  sc.dogrula('buluntu-goruldu', b1.goruldu, 'alınan buluntu önce "görüldü" olmadı');
  const bildirim = await o.bekle(sayfa, (a) => document.getElementById('bildirim').textContent
    .includes(`Deftere yeni sayfa: ${a}`), ad, 4000);
  sc.dogrula('yeni-sayfa-bildirimi', bildirim, `"Deftere yeni sayfa: ${ad}" bildirimi yok`);

  const depo = await sayfa.evaluate((a) => JSON.parse(localStorage.getItem(a)), ANAHTAR);
  sc.dogrula('localstorage-yazildi', depo && depo.bulunan && depo.bulunan[hedef.tur] === 1,
    `localStorage defteri: ${JSON.stringify(depo)}`);

  await defterAc(sayfa);
  const dolu = await defterKartlari(sayfa);
  const kart = dolu.kartlar.find((k) => k.dolu);
  const doluKartlar = dolu.kartlar.filter((k) => k.dolu);
  sc.dogrula('defterde-gorunur', doluKartlar.length === 1 && kart && kart.ad === ad,
    `dolu kartlar: ${JSON.stringify(doluKartlar)}`);
  sc.dogrula('defter-adet-yeni', kart && kart.adet === 'Bir kez bulundu' && kart.yeni,
    `kart: ${JSON.stringify(kart)}`);
  sc.dogrula('defter-dolu-ozet', /^1 \/ \d+ sayfa dolu, toplam 1 buluntu/.test(dolu.ozet),
    `özet: ${dolu.ozet}`);
  sc.dogrula('defter-dolular-onde', dolu.kartlar[0].dolu, 'bulunan sayfa listenin başında değil');
  await defterKapat(sayfa);

  // Kalıcılık: yeni sayfada (aynı bağlam, aynı localStorage) defter hâlâ dolu.
  const ikinci = await baglam.newPage();
  ikinci.on('pageerror', (e) => hatalar.push(e.message));
  await o.git(ikinci, `${kok}?tohum=baska`);
  await defterAc(ikinci);
  const kalici = await defterKartlari(ikinci);
  sc.dogrula('defter-kalici', kalici.kartlar.some((k) => k.dolu && k.ad === ad),
    `yeniden açılışta defter boş: ${JSON.stringify(kalici.kartlar.filter((k) => k.dolu))}`);

  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir(`(${hedef.tur})`);
});
