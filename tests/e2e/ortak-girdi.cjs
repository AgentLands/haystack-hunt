/**
 * Uçtan uca testlerin girdi ve ölçüm araçları (ortak.cjs'ye karışır): klavyeyle yürüme ve
 * kazma, hızlı bitirme, CDP ile çok parmaklı dokunma, öğe kutusu ve yatay taşma ölçümü.
 */
const { bekle, ozet, pay } = require('./ortak.cjs');

/**
 * Klavyeyle (WASD) hedefe yürür; takılırsa önündeki samanı Boşlukla kazarak ilerler.
 * hedefAl(ozet) → [x, y] (dünya birimi). Vardıysa true. Tuşlar her durumda bırakılır.
 */
async function yuru(sayfa, hedefAl, yakinlik, { azamiMs = 90000, takilmaMs = 1000 } = {}) {
  const basili = new Set();
  const ayarla = async (istenen) => {
    for (const t of [...basili]) {
      if (!istenen.has(t)) { await sayfa.keyboard.up(t); basili.delete(t); }
    }
    for (const t of istenen) {
      if (!basili.has(t)) { await sayfa.keyboard.down(t); basili.add(t); }
    }
  };
  const bitis = Date.now() + pay(azamiMs);
  let son = null;
  let sonZaman = Date.now();
  try {
    while (Date.now() < bitis) {
      const s = await ozet(sayfa);
      const [hx, hy] = hedefAl(s);
      const dx = hx - s.k.x;
      const dy = hy - s.k.y;
      if (Math.hypot(dx, dy) < yakinlik) return true;
      const istenen = new Set();
      if (dx > 0.3) istenen.add('d');
      if (dx < -0.3) istenen.add('a');
      if (dy > 0.3) istenen.add('s');
      if (dy < -0.3) istenen.add('w');
      await ayarla(istenen);
      if (!son || Math.hypot(s.k.x - son.x, s.k.y - son.y) > 0.2) {
        son = s.k;
        sonZaman = Date.now();
      } else if (Date.now() - sonZaman > pay(takilmaMs)) { // takıldı: önünü kaz
        await kaz(sayfa, s.kaldirilan);
        sonZaman = Date.now();
      }
      await sayfa.waitForTimeout(30);
    }
    return false;
  } finally {
    await ayarla(new Set());
  }
}

/** Boşluğu basılı tutup kazının gerçekten saman aldığını bekler (en çok 2 sn), bırakır. */
async function kaz(sayfa, onceki) {
  await sayfa.keyboard.down('Space');
  await bekle(sayfa, (o) => window.__e2e.durumAl().tarla.kaldirilan >= o + 20, onceki, 2000);
  await sayfa.keyboard.up('Space');
}

/**
 * Test girdisi (durum kancası): çiftçiyi (x, y) hücresinin üstüne ışınlar ve çevresindeki
 * 7×7 hücrede saman kalınlığını z katına indirir (nesne açığa çıkar; elle kazmanın kısası).
 */
function isinlaVeAc(sayfa, x, y, z) {
  return sayfa.evaluate(async (a) => {
    const { GENISLIK } = await import('./js/kural/boyut.js');
    const d = window.__e2e.durumAl();
    const { h } = d.tarla;
    for (let yy = a.y - 3; yy <= a.y + 3; yy++) {
      for (let xx = a.x - 3; xx <= a.x + 3; xx++) {
        const i = yy * GENISLIK + xx;
        if (h[i] > a.z) h[i] = a.z;
      }
    }
    d.karakter.x = a.x + 0.5;
    d.karakter.y = a.y + 0.5;
  }, { x, y, z });
}

/**
 * Oyunu hızlı bitirir (iğneyi bulmak bu senaryonun konusu değilse): süreyi başlatır, oyun
 * saati enAzMs'e varınca çiftçiyi iğnenin üstüne ışınlar, iğnenin üstündeki samanı açar
 * (durum kancasıyla yazılan test girdisi) ve Boşlukla iğneyi alıp bitiş fişini bekler.
 * Dönüş: fiş açıldı mı.
 */
async function igneyiHizlaBul(sayfa, enAzMs = 1300) {
  await sayfa.keyboard.down('d');
  await bekle(sayfa, () => window.__e2e.durumAl().baslangic !== null);
  await sayfa.keyboard.up('d');
  await bekle(sayfa, (ms) => {
    const d = window.__e2e.durumAl();
    return d.sonZaman - d.baslangic >= ms;
  }, enAzMs, 10000);
  const igne = (await ozet(sayfa)).igne;
  const z = await sayfa.evaluate(() => window.__e2e.durumAl().tarla.igne.z);
  await isinlaVeAc(sayfa, igne.x, igne.y, z);
  await sayfa.keyboard.down('Space');
  const bitti = await bekle(sayfa, () => document.getElementById('bitis').open, null, 15000);
  await sayfa.keyboard.up('Space');
  return bitti;
}

/** Dokunma yardımcısı (CDP Input.dispatchTouchEvent): çok parmaklı basma/sürükleme/bırakma. */
async function dokunmaKur(sayfa) {
  const cdp = await sayfa.context().newCDPSession(sayfa);
  const noktalar = new Map();
  const gonder = (tur) => cdp.send('Input.dispatchTouchEvent', {
    type: tur,
    touchPoints: [...noktalar].map(([id, p]) => ({ x: p.x, y: p.y, id })),
  });
  return {
    async bas(id, x, y) { noktalar.set(id, { x, y }); await gonder('touchStart'); },
    async tasi(id, x, y) { noktalar.set(id, { x, y }); await gonder('touchMove'); },
    async birak(id) { noktalar.delete(id); await gonder('touchEnd'); },
    async hepsiniBirak() { noktalar.clear(); await gonder('touchEnd'); },
  };
}

/** Bir öğenin sayfa içindeki merkezi ve kutusu. */
function kutu(sayfa, secici) {
  return sayfa.evaluate((s) => {
    const o = document.querySelector(s);
    if (!o) return null;
    const r = o.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
      sol: r.left, ust: r.top, sag: r.right, alt: r.bottom };
  }, secici);
}

/** Yatay taşma ve tuval görünürlüğü ölçümü. */
function yerlesim(sayfa) {
  return sayfa.evaluate(() => {
    const t = document.getElementById('tarla').getBoundingClientRect();
    const de = document.documentElement;
    return {
      tasma: de.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
      scrollWidth: de.scrollWidth, innerWidth,
      tuval: { x: t.left, y: t.top, w: t.width, h: t.height },
    };
  });
}

module.exports = { yuru, kaz, isinlaVeAc, igneyiHizlaBul, dokunmaKur, kutu, yerlesim };
