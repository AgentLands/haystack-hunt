/**
 * Senaryo (i): ekran boyutları. Dikey telefonlar (320, 360, 390, 412 genişlik), yatay telefon
 * (844×390), dizüstü (1280×800) ve geniş ekran (1920×1080): yatay taşma yok, tuval görünür
 * (ekrana sığar, boyutu var, boş değil), HUD ve alet rafı ekran içinde, dokunmatik cihazda
 * kumanda ekran içinde; açık menü kartı da ekrana sığar ve taşma yapmaz.
 *   node tests/e2e/ekranlar.cjs [--yavas N]
 */
const o = require('./ortak.cjs');

const T = { hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
const EKRANLAR = [
  { ad: '320x568', viewport: { width: 320, height: 568 }, ...T },
  { ad: '360x740', viewport: { width: 360, height: 740 }, ...T },
  { ad: '390x844', viewport: { width: 390, height: 844 }, ...T },
  { ad: '412x915', viewport: { width: 412, height: 915 }, ...T },
  { ad: '844x390-yatay', viewport: { width: 844, height: 390 }, ...T },
  { ad: '1280x800', viewport: { width: 1280, height: 800 } },
  { ad: '1920x1080', viewport: { width: 1920, height: 1080 } },
];

/** Sayfadaki öğelerin ekrana göre konumu ve tuvalin boş olup olmadığı. */
function olc(sayfa) {
  return sayfa.evaluate(() => {
    const kutu = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { sol: r.left, sag: r.right, ust: r.top, alt: r.bottom, w: r.width, h: r.height };
    };
    const de = document.documentElement;
    const tuval = document.getElementById('tarla');
    const ctx = tuval.getContext('2d');
    const renk = new Set();
    for (let i = 1; i < 12; i++) {
      for (let j = 1; j < 8; j++) {
        const p = ctx.getImageData(Math.floor(tuval.width * i / 12),
          Math.floor(tuval.height * j / 8), 1, 1).data;
        renk.add(`${p[0]},${p[1]},${p[2]}`);
      }
    }
    return { iw: innerWidth, ih: innerHeight, tasma: Math.max(de.scrollWidth, document.body
      .scrollWidth) - innerWidth, tuval: kutu('#tarla'), renkSayisi: renk.size,
    hud: kutu('.hud-baslik'), raf: kutu('.araclar'), kumanda: kutu('.kumanda'),
    menu: kutu('#menu'), menuKutu: (() => {
      const m = document.getElementById('menu');
      return { sol: m.offsetLeft, sag: m.offsetLeft + m.offsetWidth, ust: m.offsetTop,
        alt: m.offsetTop + m.offsetHeight, kayar: m.scrollHeight <= m.clientHeight
          || ['auto', 'scroll'].includes(getComputedStyle(m).overflowY) };
    })(), kol: kutu('.dokunmatik-kol'), kullan: kutu('.dokunmatik-dugme.kullan'),
    binin: kutu('.dokunmatik-dugme.binin'), dokunmatik: document.body
      .classList.contains('dokunmatik') };
  });
}

const icinde = (k, iw) => k && k.sol >= -0.5 && k.sag <= iw + 0.5;

function denetle(sc, e, m, menuAcik) {
  const ad = `${e.ad}${menuAcik ? '-menu' : ''}`;
  sc.dogrula(`${ad}-tasma-yok`, m.tasma <= 0, `yatay taşma ${m.tasma}px (genişlik ${m.iw})`);
  if (menuAcik) {
    // Kart hafif eğik (döndürülmüş) olduğundan sınır kutusu değil yerleşim kutusu ölçülür.
    const k = m.menuKutu;
    sc.dogrula(`${ad}-kart-sigar`, icinde(k, m.iw) && k.ust >= 0 && k.alt <= m.ih + 0.5,
      `menü kartı ekrana sığmıyor: ${JSON.stringify(k)}`);
    sc.dogrula(`${ad}-kart-kayar`, k.kayar, 'menü içeriği ekrandan uzun ama kaydırılamıyor');
    return;
  }
  const t = m.tuval;
  const gorunenAlan = Math.max(0, Math.min(t.alt, m.ih) - Math.max(t.ust, 0)) * t.w;
  sc.dogrula(`${ad}-tuval-boyut`, t.w >= 200 && t.h >= 100, `tuval çok küçük: ${t.w}×${t.h}`);
  sc.dogrula(`${ad}-tuval-yatay`, icinde(t, m.iw), `tuval yatayda taşıyor: ${t.sol}..${t.sag}`);
  sc.dogrula(`${ad}-tuval-gorunur`, gorunenAlan >= 0.6 * t.w * t.h,
    `tuvalin çoğu ekranda değil (görünen ${(100 * gorunenAlan / (t.w * t.h)).toFixed(0)}%)`);
  sc.dogrula(`${ad}-tuval-dolu`, m.renkSayisi >= 4, `tuval boş görünüyor (${m.renkSayisi} renk)`);
  sc.dogrula(`${ad}-hud-icinde`, icinde(m.hud, m.iw), `HUD taşıyor: ${JSON.stringify(m.hud)}`);
  sc.dogrula(`${ad}-raf-icinde`, icinde(m.raf, m.iw),
    `alet rafı taşıyor: ${JSON.stringify(m.raf)}`);
  if (e.hasTouch) {
    sc.dogrula(`${ad}-kumanda`, m.dokunmatik && icinde(m.kol, m.iw) && icinde(m.kullan, m.iw)
      && icinde(m.binin, m.iw) && m.kol.alt <= m.ih + 0.5 && m.kullan.alt <= m.ih + 0.5,
    `kumanda ekran dışında: ${JSON.stringify({ kol: m.kol, kullan: m.kullan, binin: m.binin })}`);
  }
}

o.calistir(async () => {
  const sc = new o.Senaryo('ekranlar');
  const { kok, kapat } = await o.sunucuAc();
  const tarayici = await o.tarayiciAc();
  const hatalar = [];
  for (const e of EKRANLAR) {
    const { ad, ...secenek } = e;
    const { sayfa, baglam, hatalar: h } = await o.sayfaYarat(tarayici, secenek);
    await baglam.addInitScript(() => localStorage.setItem('haystack-hunt:rehber-goruldu', '1'));
    await o.git(sayfa, `${kok}?tohum=ekran`);
    await o.kareBekle(sayfa, 5);
    denetle(sc, e, await olc(sayfa), false);
    const tiklanir = await sayfa.evaluate(() => {
      const d = document.getElementById('menu-ac');
      const r = d.getBoundingClientRect();
      const ust = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { tiklanir: d.contains(ust), ust: ust && (ust.id || ust.className || ust.tagName),
        kutu: [r.left, r.top, r.width, r.height].map(Math.round) };
    });
    sc.dogrula(`${ad}-menu-dugmesi-tiklanir`, tiklanir.tiklanir,
      `≡ düğmesinin üstünde başka öğe var: ${JSON.stringify(tiklanir)}`);
    await sayfa.evaluate(() => document.getElementById('menu-ac').click());
    await o.bekle(sayfa, () => document.getElementById('menu').open);
    await o.kareBekle(sayfa, 3);
    denetle(sc, e, await olc(sayfa), true);
    hatalar.push(...h);
    await baglam.close();
  }
  sc.hatalariDenetle(hatalar);
  await tarayici.close();
  await kapat();
  sc.bitir();
});
