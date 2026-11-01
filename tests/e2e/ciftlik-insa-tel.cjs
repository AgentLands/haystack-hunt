/**
 * Senaryo: çiftlik inşa arayüzü, telefon (390×844, CDP dokunma). Palet alet rafının yerine
 * oturur (kumanda tablasıyla çakışmaz, yatay taşma yok); tek dokunuş hayalet + ↻ ✓ ✕
 * baloncuğu (✓ kurar); bas-sürükle-bırak hayaleti parmağın 48 px üstünde taşır ve bırakınca
 * kurar; palete geri sürükleyip bırakmak iptal; tek parmak sürükleme hat çeker; iki dokunuşlu
 * L yedeği (↻ köşeyi çevirir, ✓ kurar); ↶ geri alır; ✂ sil kipinde sürükleyerek söker;
 * gezde dokunuş inceleme panelini alttan açar, çift dokunuş pipettir; Kullan'a bir dokunuş
 * krankı çevirir (basılı tutmadan, her dokunuş bir komut); iki parmak hiçbir şey kurmaz.
 *   node tests/e2e/ciftlik-insa-tel.cjs [--ekran KLASOR] [--yavas N]
 */
const o = require('./ortak.cjs');
const I = require('./ciftlik-insa-ortak.cjs');

const TUT_MS = 160;
/** Hareketler arası insan payı: tarayıcı art arda gelen dokunuşu çift dokunuş sayıp tıklamayı
 *  yutmasın (gerçek kullanıcı da jestler arasında bekler). */
const ARA_MS = 350;

async function dokunucu(s) {
  const d = await o.dokunmaKur(s);
  const tap = async (p) => {
    await s.waitForTimeout(ARA_MS);
    await d.bas(1, p.x, p.y);
    await d.birak(1);
  };
  const ciftTap = async (p) => {
    await tap(p);
    await d.bas(1, p.x, p.y);
    await d.birak(1);
  };
  const surukle = async (a, b, adim = 8) => {
    await s.waitForTimeout(ARA_MS);
    await d.bas(1, a.x, a.y);
    await s.waitForTimeout(TUT_MS);
    for (let i = 1; i <= adim; i++) {
      await d.tasi(1, a.x + ((b.x - a.x) * i) / adim, a.y + ((b.y - a.y) * i) / adim);
    }
  };
  return { ...d, tap, ciftTap, surukle };
}

/**
 * Düğmeye dokunur; tıklama gelmezse (yüklü makinede CDP dokunuşu uzun basış sayılıp tıklama
 * yutulabilir) en çok iki kez yeniden dokunur. Etki tıklamadan geldiğinden çift sayılmaz.
 */
async function kutuTap(s, d, secici) {
  for (let i = 0; i < 3; i++) {
    // palet şeridi yatay kayar: kart görünür alana getirilir (sekmeye dokunmak gibi)
    await s.evaluate((sec) => document.querySelector(sec)?.scrollIntoView({ block: 'nearest',
      inline: 'center' }), secici);
    await s.waitForTimeout(50);
    const k = await o.kutu(s, secici);
    if (!k || !k.w) {
      if (i) return; // önceki dokunuş geç de olsa işledi, öğe kapandı
      throw new Error(`${secici} görünmüyor`);
    }
    await s.evaluate((sec) => {
      window.__tik = false;
      document.querySelector(sec).addEventListener('click', () => { window.__tik = true; },
        { once: true, capture: true });
    }, secici);
    await d.tap(k);
    if (await o.bekle(s, () => window.__tik, null, 2500)) return;
  }
}
const kullanTap = async (s, d) => d.tap(await o.kutu(s, '.dokunmatik-dugme.kullan'));

async function yerlesimDenetle(s, sc, ad) {
  const y = await o.yerlesim(s);
  sc.dogrula(`${ad}-tasma-yok`, !y.tasma, `scrollWidth ${y.scrollWidth} > ${y.innerWidth}`);
}

async function paletVeKur(s, sc, d, kx, ky) {
  await kutuTap(s, d, '.ciftlik-insa-ac');
  const p = await o.kutu(s, '.ciftlik-palet');
  const kol = await o.kutu(s, '.dokunmatik-kol');
  const kullan = await o.kutu(s, '.dokunmatik-dugme.kullan');
  sc.dogrula('palet-tabla', p && kol && p.alt <= kol.ust && p.alt <= kullan.ust && p.sag <= 390,
    `palet ${JSON.stringify(p)} kol ${JSON.stringify(kol)}`);
  await yerlesimDenetle(s, sc, 'palet');
  await I.ekranAl(s, 't1-palet.png');
  await kutuTap(s, d, '.ciftlik-parca[data-parca="sandik"]');
  await I.kameraDurdu(s);
  await d.tap(await I.ekran(s, kx + 8, ky));
  const balon = await o.bekle(s, () => !document.querySelector('.ciftlik-baloncuk').hidden);
  sc.dogrula('tek-dokunus-bekler', balon && (await I.parcalar(s)).length === 0,
    'tek dokunuş baloncuk açmadı ya da hemen kurdu');
  await I.ekranAl(s, 't2-onay.png');
  await kutuTap(s, d, '.ciftlik-onay');
  sc.dogrula('onay-kurar', await I.parcaSayisi(s, 1), '✓ sandığı kurmadı');

  await kutuTap(s, d, '.ciftlik-parca[data-parca="huni"]');
  const hedef = await I.ekran(s, kx + 2, ky + 3);
  const bas = await I.ekran(s, kx + 2, ky + 6);
  await d.surukle(bas, { x: hedef.x, y: hedef.y + 48 });
  const h = await s.evaluate(() => window.__insa.hayalet);
  await I.ekranAl(s, 't3-surukle.png');
  await d.birak(1);
  const p2 = await I.parcaSayisi(s, 2) && (await I.parcalar(s)).find((x) => x.a === 'huni');
  sc.dogrula('surukle-birak-48px', p2 && p2.x === kx + 2 && p2.y === ky + 3,
    `hayalet ${JSON.stringify(h)}, huni ${JSON.stringify(p2)}`);
  await d.surukle(await I.ekran(s, kx + 6, ky + 6), await o.kutu(s, '.ciftlik-palet-serit'));
  await d.birak(1);
  await o.kareBekle(s, 4);
  sc.dogrula('palete-iptal', (await I.parcalar(s)).length === 2, 'palete bırakınca kurdu');
}

async function hat(s, sc, d, kx, ky) {
  await kutuTap(s, d, '.ciftlik-parca[data-parca="bant"]');
  await d.surukle(await I.ekran(s, kx + 4, ky + 3), await I.ekran(s, kx + 8, ky + 3));
  await d.birak(1);
  sc.dogrula('hat-surukle', await I.parcaSayisi(s, 7), 'sürükleme 5 bant çekmedi');
  await d.tap(await I.ekran(s, kx + 4, ky + 6));
  await d.tap(await I.ekran(s, kx + 6, ky + 7));
  await o.bekle(s, () => window.__insa.bekleyen?.bitis);
  const once = await s.evaluate(() => window.__insa.yol.map((k) => [k.kx, k.ky]));
  await kutuTap(s, d, '.ciftlik-balon-don');
  const sonra = await s.evaluate(() => window.__insa.yol.map((k) => [k.kx, k.ky]));
  sc.dogrula('iki-dokunus-l', once.length === 4 && sonra.length === 4
    && once[1][0] === kx + 5 && sonra[1][1] === ky + 7, `${JSON.stringify(once)} ↻ ${
    JSON.stringify(sonra)}`);
  await I.ekranAl(s, 't4-iki-dokunus.png');
  await kutuTap(s, d, '.ciftlik-onay');
  sc.dogrula('iki-dokunus-kurar', await I.parcaSayisi(s, 11), 'iki dokunuşlu yol kurulmadı');
  await kutuTap(s, d, '.ciftlik-gerial button');
  sc.dogrula('geri-dugmesi', await I.parcaSayisi(s, 7), '↶ geri almadı');
  await kutuTap(s, d, '.ciftlik-sok');
  await d.surukle(await I.ekran(s, kx + 4, ky + 3), await I.ekran(s, kx + 8, ky + 3));
  await d.birak(1);
  sc.dogrula('sil-surukle', await I.parcaSayisi(s, 2), 'sürüklemeyle sökülmedi');
  await kutuTap(s, d, '.ciftlik-gerial button');
  sc.dogrula('sil-geri', await I.parcaSayisi(s, 7), 'söküm geri gelmedi');
}

async function panelVeKrank(s, sc, d, kx, ky) {
  await kutuTap(s, d, '.ciftlik-kapat');
  await o.kareBekle(s, 4); // tuval büyüdü: görünüm oranı yenilensin
  const t = await I.ekran(s, kx + 8, ky);
  await d.tap(t);
  const acik = await o.bekle(s, () => !document.querySelector('.ciftlik-panel').hidden);
  const k = await o.kutu(s, '.ciftlik-panel');
  sc.dogrula('panel-alttan', acik && k.alt <= 845 && k.sol >= 0 && k.sag <= 390 && k.ust > 300,
    JSON.stringify(k));
  await yerlesimDenetle(s, sc, 'panel');
  await I.ekranAl(s, 't5-panel.png');
  await d.ciftTap(await I.ekran(s, kx + 8, ky));
  const pip = await s.evaluate(() => [window.__insa.kip, window.__insa.secili]);
  sc.dogrula('cift-dokunus-pipet', pip[0] === 'kur' && pip[1] === 'sandik', JSON.stringify(pip));
  const kuruldu = await s.evaluate(async () => {
    const pk = await import('./js/kural/ciftlik/parca-kayit.js');
    const { parcaKur } = await import('./js/kural/ciftlik/komut.js');
    if (!pk.parcaTanimi('el-kranki')) {
      pk.parcaTanimla('el-kranki', { kod: 64990, ad: 'El krankı (deneme)', aile: 'enerji',
        yonlu: false });
    }
    const dd = window.__e2e.durumAl();
    const c = dd.ciftlik;
    let kuyruk = c.kuyruk;
    window.__krank = 0;
    const sar = (v) => Object.assign(v, { push(...a) {
      window.__krank += a.filter((x) => x.tur === 'krank').length;
      return Array.prototype.push.apply(this, a);
    } });
    Object.defineProperty(c, 'kuyruk', { configurable: true, enumerable: true,
      get: () => kuyruk, set: (v) => { kuyruk = sar(v); } });
    c.kuyruk = kuyruk;
    // Çiftçinin başladığı garaj çevresi kurma yasağı: krank boş bir yere kurulur, çiftçi
    // yanına (bir hücre sağına) taşınır (kuralın başlatma menzili 1 karo).
    for (let ky = 12; ky < 70; ky += 3) {
      for (let kx = 20; kx < 100; kx += 3) {
        const p = parcaKur(c, dd.tarla, 'el-kranki', kx, ky).parca;
        if (!p) continue;
        Object.assign(dd.karakter, { x: kx * 2 + 2.5, y: ky * 2 + 1 });
        return true;
      }
    }
    return false;
  });
  await kullanTap(s, d);
  const bir = await s.evaluate(() => window.__krank);
  await kullanTap(s, d);
  const iki = await s.evaluate(() => window.__krank);
  sc.dogrula('krank-tek-dokunus', kuruldu && bir === 1 && iki === 2, `kuruldu ${kuruldu}, ${bir}/${
    iki}`);
}

async function ikiParmak(s, sc, d, kx, ky) {
  await kutuTap(s, d, '.ciftlik-parca[data-parca="bant"]');
  const n = (await I.parcalar(s)).length;
  const c = await I.ekran(s, kx + 3, ky + 9);
  await s.waitForTimeout(ARA_MS);
  await d.bas(1, c.x, c.y);
  await s.waitForTimeout(TUT_MS);
  await d.bas(2, c.x + 60, c.y + 30);
  await d.tasi(1, c.x + 40, c.y);
  await d.tasi(2, c.x + 100, c.y + 40);
  await d.hepsiniBirak();
  await o.kareBekle(s, 6);
  sc.dogrula('iki-parmak', (await I.parcalar(s)).length === n, 'iki parmak parça kurdu');
}

async function telefon(tarayici, kok, sc) {
  const { sayfa: s, hatalar } = await o.sayfaYarat(tarayici, {
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  });
  await I.ciftlikAc(s, kok);
  await yerlesimDenetle(s, sc, 'acilis');
  const yer = await I.yerBul(s, 12, 11);
  sc.dogrula('yer', Boolean(yer), 'boş yer yok');
  await I.odakla(s, yer.kx + 5, yer.ky + 4, 6);
  const d = await dokunucu(s);
  await paletVeKur(s, sc, d, yer.kx, yer.ky);
  await hat(s, sc, d, yer.kx, yer.ky);
  await panelVeKrank(s, sc, d, yer.kx, yer.ky);
  await ikiParmak(s, sc, d, yer.kx, yer.ky);
  await yerlesimDenetle(s, sc, 'son');
  await s.close();
  return hatalar;
}

o.calistir(async () => {
  const sc = new o.Senaryo('ciftlik-insa-tel');
  const sunucu = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  try {
    sc.hatalariDenetle(await telefon(tarayici, sunucu.kok, sc));
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  sc.bitir();
});
