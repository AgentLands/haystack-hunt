/**
 * Senaryo (e): dokunmatik (390×844, hasTouch). Gerçek dokunma olaylarıyla (CDP): sanal kolla
 * yürüme, tuvale dokunup yürüme, Bin/İn düğmesiyle traktöre binme ve inme, kolla sürme (kol
 * ekran yönlüdür: yukarı itilince araç ekranda yukarı gider), "Kullan" basılı tutularak
 * kepçe. Kumanda kutuları ekranda ve dokunulabilir olmalı.
 *   node tests/e2e/dokunmatik.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const SANAL = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  deviceScaleFactor: 2 };
const aciFarki = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

o.calistir(async () => {
  const sc = new o.Senaryo('dokunmatik');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const { sayfa, baglam, hatalar } = await o.sayfaYarat(tarayici, SANAL);
  await baglam.addInitScript(() => localStorage.setItem('haystack-hunt:rehber-goruldu', '1'));
  await o.git(sayfa, `${kok}?tohum=deneme`);
  const dok = await o.dokunmaKur(sayfa);

  sc.dogrula('dokunmatik-kipi', await sayfa.evaluate(() => document.body.classList
    .contains('dokunmatik') && matchMedia('(pointer: coarse)').matches),
  'dokunmatik cihazda kumanda kurulmadı');
  const kol = await o.kutu(sayfa, '.dokunmatik-kol');
  const kullan = await o.kutu(sayfa, '.dokunmatik-dugme.kullan');
  const binin = await o.kutu(sayfa, '.dokunmatik-dugme.binin');
  const ekranda = (k) => k && k.sol >= 0 && k.sag <= 390 && k.ust >= 0 && k.alt <= 844;
  sc.dogrula('kumanda-ekranda', ekranda(kol) && ekranda(kullan) && ekranda(binin),
    `kumanda ekran dışında: ${JSON.stringify({ kol, kullan, binin })}`);
  sc.dogrula('kumanda-dokunulabilir', Math.min(kullan.w, kullan.h, binin.w, binin.h) >= 44,
    'düğmeler 44 pikselden küçük');
  const R = kol.w * 0.35; // kolun doyuma yakın itişi

  // Sanal kolla sağa yürü.
  const s0 = await o.ozet(sayfa);
  await dok.bas(1, kol.x, kol.y);
  await dok.tasi(1, kol.x + R, kol.y);
  const yurudu = await o.bekle(sayfa, (x) => window.__e2e.durumAl().karakter.x > x + 2, s0.k.x);
  sc.dogrula('kol-yuru', yurudu, 'sanal kol karakteri yürütmedi');
  sc.dogrula('kol-parmak-kayar', await sayfa.evaluate(() => document.querySelector(
    '.dokunmatik-kol-parmak').style.transform.includes('translate')), 'kol başparmağı kaymadı');
  await dok.birak(1);
  await o.kareBekle(sayfa, 6);
  const dur1 = (await o.ozet(sayfa)).k.x;
  await o.kareBekle(sayfa, 10);
  sc.dogrula('kol-birakinca-durur', (await o.ozet(sayfa)).k.x === dur1, 'kol bırakılınca durmadı');

  // Tuvale dokunup yürü: karakterin ekrandaki yerinin 60 piksel sağına (erişim dışı).
  const x1 = (await o.ozet(sayfa)).k;
  const { px, py } = await ekranYeri(sayfa, x1.x, x1.y);
  await sayfa.touchscreen.tap(px + 60, py);
  sc.dogrula('dokun-yuru', await o.bekle(sayfa, (x) => window.__e2e.durumAl().karakter.x > x + 3,
    x1.x), 'tuvale dokununca karakter yürümedi');

  // Kolla traktöre yürü.
  const ok = await kolaYuru(sayfa, dok, kol, R, kullan);
  sc.dogrula('kolla-traktore-yuru', ok, 'kolla traktöre yürünemedi');
  await dok.bas(3, binin.x, binin.y);
  await dok.birak(3);
  const bindi = await o.bekle(sayfa, () => window.__e2e.durumAl().karakter.makine !== null);
  sc.dogrula('bin-dugmesi', bindi, 'Bin/İn düğmesi traktöre bindirmedi');
  const ipucu = await sayfa.textContent('#makine-ipucu');
  sc.dogrula('makine-ipucu-dokunmatik', ipucu === 'Bin/İn: in', `ipucu: ${ipucu}`);

  // Kolu yukarı it: araç ekranda yukarı gider ve yukarı bakar.
  const m0 = (await o.ozet(sayfa)).makineler[0];
  await dok.bas(1, kol.x, kol.y);
  await dok.tasi(1, kol.x, kol.y - R);
  const yukari = await o.bekle(sayfa, (y) => window.__e2e.durumAl().makineler[0].y < y - 3,
    m0.y, 30000);
  const yon = (await o.ozet(sayfa)).makineler[0].yon;
  sc.dogrula('kol-yukari-ekranda-yukari', yukari && aciFarki(yon, -Math.PI / 2) < 0.6,
    `kol yukarı: araç yukarı gitmedi (yukari=${yukari}, yön=${yon.toFixed(2)})`);
  await dok.birak(1);

  // Kolu sağa it ve Kullan'ı basılı tut: kepçe saman alır.
  const m1 = (await o.ozet(sayfa)).makineler[0];
  await dok.bas(1, kol.x + R, kol.y);
  await dok.bas(2, kullan.x, kullan.y);
  const aldi = await o.bekle(sayfa, () => window.__e2e.durumAl().makineler[0].yuk > 0,
    null, 40000);
  sc.dogrula('kullan-kepce', aldi, 'Kullan basılıyken kepçe saman almadı');
  const m2 = (await o.ozet(sayfa)).makineler[0];
  sc.dogrula('kol-sag-ilerler', m2.x > m1.x, 'kol sağa itilince araç sağa gitmedi');
  await dok.birak(2);
  await dok.birak(1);

  await dok.bas(3, binin.x, binin.y);
  await dok.birak(3);
  sc.dogrula('in-dugmesi', await o.bekle(sayfa, () => window.__e2e.durumAl().karakter.makine
    === null), 'Bin/İn düğmesi traktörden indirmedi');
  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});

/**
 * Dünya noktasının (x, y) ekran pikseli. Kamera yakınlaşmış ve tuvalin en/boy oranı serbest
 * (dikey telefonda 3:2 değil) olabilir; eşleme oyunun kendi işleviyle (kural/gorunum.js) yapılır.
 */
function ekranYeri(sayfa, x, y) {
  return sayfa.evaluate(async (n) => {
    const { gorunum: g } = await import('./js/gorunum.js');
    const { dunyadanEkrana } = await import('./js/kural/gorunum.js');
    const t = document.getElementById('tarla').getBoundingClientRect();
    const e = dunyadanEkrana(g, n.x, n.y);
    return { px: t.left + e.fx * t.width, py: t.top + e.fy * t.height };
  }, { x, y });
}

/** Kolu hedefe doğru yöneltip traktörün yanına varır; takılırsa Kullan ile kazar. */
async function kolaYuru(sayfa, dok, kol, R, kullan) {
  const bitis = Date.now() + o.pay(60000);
  let son = null;
  let sonZaman = Date.now();
  await dok.bas(1, kol.x, kol.y);
  try {
    while (Date.now() < bitis) {
      const s = await o.ozet(sayfa);
      const m = s.makineler[0];
      const dx = m.x - s.k.x;
      const dy = m.y - s.k.y;
      const d = Math.hypot(dx, dy);
      if (d < 3.6) return true;
      await dok.tasi(1, kol.x + (dx / d) * R, kol.y + (dy / d) * R);
      if (!son || Math.hypot(s.k.x - son.x, s.k.y - son.y) > 0.2) {
        son = s.k;
        sonZaman = Date.now();
      } else if (Date.now() - sonZaman > o.pay(1500)) {
        await dok.bas(2, kullan.x, kullan.y);
        await o.bekle(sayfa, (k) => window.__e2e.durumAl().tarla.kaldirilan >= k + 20,
          s.kaldirilan, 2000);
        await dok.birak(2);
        sonZaman = Date.now();
      }
      await sayfa.waitForTimeout(30);
    }
    return false;
  } finally {
    await dok.birak(1);
  }
}
