/**
 * Önizleme: sahte verilerle çiftçiyi (8 yön, yürüme fazları, her araç), üç makineyi
 * (yuk/calisiyor/yakit/surucu durumları) ve balyaları ızgarada çizer.
 * Adres bayrakları: ?z=3 (yakınlaştırma), ?animasyon=0 (dur), ?zaman=ms (sabit zaman).
 */
import { OLCEK } from '../js/cizim.js';
import { karakterCiz } from '../js/ozellik/gorsel/karakter-cizim.js';
import { makineCiz } from '../js/ozellik/gorsel/makine-cizim.js';
import { balyaCiz } from '../js/ozellik/gorsel/balya-cizim.js';

const adres = new URLSearchParams(location.search);
let z = Number(adres.get('z')) || 3;
const sabit = adres.get('zaman') !== null ? Number(adres.get('zaman')) : null;
const YONLER = [
  'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı', 'Kuzey', 'Kuzeydoğu',
];
const ARACLAR = ['el', 'tirmik', 'dedektor', 'miknatis'];

const k = (yon, ek = {}) => ({
  x: 0, y: 0, yon, hareketli: false, adimFaz: 0, z: 0, kullaniyor: false, makine: null, ...ek,
});
const m = (tur, ek = {}) => ({
  id: 1, tur, x: 0, y: 0, yon: 0, hiz: 0, yakit: 1, surucu: false, calisiyor: false, yuk: 0,
  ...ek,
});

/** Bölüm: { baslik, sutun, satir, en, boy, hucreler: [{ etiket, ciz(ctx, zaman, cx, cy) }] }. */
function bolumler() {
  const yonAci = (i) => (i * Math.PI) / 4;
  const karakterler = [];
  for (const faz of [0, 0.25, 0.5, 0.75]) {
    for (let i = 0; i < 8; i++) {
      karakterler.push({
        etiket: i === 0 ? `faz ${faz}` : '',
        ciz: (c, t, x, y) => karakterCiz(
          c, k(yonAci(i), { x, y, hareketli: true, adimFaz: faz }), t),
      });
    }
  }
  const araclar = [];
  for (const ad of ARACLAR) {
    araclar.push({ etiket: ad, ciz: (c, t, x, y) => karakterCiz(c, k(0.3, { x, y }), t, ad) });
    for (const dt of [0, 130, 260, 390]) {
      araclar.push({
        etiket: dt === 0 ? 'kullan' : '',
        ciz: (c, t, x, y) => karakterCiz(
          c, k(0.3, { x, y, kullaniyor: true, hareketli: dt === 260 }), t + dt * 3, ad),
      });
    }
  }
  const yuksek = [
    { etiket: 'z=0', ciz: (c, t, x, y) => karakterCiz(c, k(0, { x, y, z: 0 }), t) },
    { etiket: 'z=60', ciz: (c, t, x, y) => karakterCiz(c, k(0, { x, y, z: 60 }), t) },
    { etiket: 'z=120', ciz: (c, t, x, y) => karakterCiz(c, k(0, { x, y, z: 120 }), t) },
  ];
  const makine = (tur, ek, etiket) => ({
    etiket,
    ciz: (c, t, x, y) => makineCiz(c, m(tur, { x, y, ...ek }), t),
  });
  const durumlar = [
    [{}, 'bos'],
    [{ surucu: true, yuk: 0.5 }, 'surucu yuk .5'],
    [{ surucu: true, yuk: 1, calisiyor: true, hiz: 3 }, 'calisiyor hiz 3'],
    [{ yakit: 0, yuk: 0.7 }, 'yakit 0'],
  ];
  const makineler = [];
  for (const tur of ['traktor', 'balya']) {
    for (const [ek, et] of durumlar) {
      for (const yon of [0, 0.6]) {
        makineler.push(makine(tur, { ...ek, yon, yuk: ek.yuk ?? (tur === 'balya' ? 0.2 : 0) },
          yon === 0 ? `${tur}: ${et}` : ''));
      }
    }
  }
  const ufleDurum = [[{}, 'bos'], [{ calisiyor: true }, 'calisiyor'], [{ yakit: 0 }, 'yakit 0']];
  for (const [ek, et] of ufleDurum) {
    makineler.push(makine('ufleyici', ek, `ufleyici: ${et}`));
  }
  const ufle = (ek, etiket) => ({
    etiket,
    ciz: (c, t, x, y) => {
      const mk = m('ufleyici', { surucu: true, ...ek });
      karakterCiz(c, k(0, { x, y, makine: mk, hareketli: ek.hiz > 0, adimFaz: (t / 500) % 1 }), t);
    },
  });
  makineler.push(ufle({}, 'sirtta: bekle'), ufle({ calisiyor: true, hiz: 1 }, 'sirtta: calisiyor'));
  const balyalar = [];
  for (const [acik, ac] of [[false, 0], [true, 0.15], [true, 0.4], [true, 0.7], [true, 1]]) {
    balyalar.push({
      etiket: acik ? `acilma ${ac}` : 'kapali',
      ciz: (c, t, x, y) => balyaCiz(c, { x: x + 1, y, yon: 0, acik, acilma: ac }, t),
    });
  }
  balyalar.push({
    etiket: 'yon 1.0',
    ciz: (c, t, x, y) => balyaCiz(c, { x, y, yon: 1.0, acik: false, acilma: 0 }, t),
  });
  balyalar.push({
    etiket: 'yon 1.0 acik',
    ciz: (c, t, x, y) => balyaCiz(c, { x, y, yon: 1.0, acik: true, acilma: 0.6 }, t),
  });
  return [
    { baslik: `Karakter: 8 yon x yurume fazi (${YONLER.join(', ')})`, sutun: 8, en: 4, boy: 4,
      hucreler: karakterler },
    { baslik: 'Araclar: bekle + kullan (4 zaman)', sutun: 5, en: 7, boy: 5, hucreler: araclar },
    { baslik: 'Yukseklik (z)', sutun: 3, en: 4, boy: 4, hucreler: yuksek },
    { baslik: 'Makineler (yon 0 ve 0.6 rad)', sutun: 4, en: 11, boy: 8, hucreler: makineler },
    { baslik: 'Balyalar', sutun: 4, en: 8, boy: 5, hucreler: balyalar },
  ];
}

const BOLUMLER = bolumler();
const kap = document.getElementById('bolumler');
const tuvaller = BOLUMLER.map((b) => {
  const baslik = document.createElement('h2');
  baslik.textContent = b.baslik;
  const tuval = document.createElement('canvas');
  kap.append(baslik, tuval);
  return tuval;
});

function zemin(ctx, x, y, en, boy) {
  ctx.fillStyle = '#684e34';
  ctx.fillRect(x * OLCEK, y * OLCEK, en * OLCEK / 2, boy * OLCEK);
  ctx.fillStyle = '#d3b866';
  ctx.fillRect((x + en / 2) * OLCEK, y * OLCEK, en * OLCEK / 2, boy * OLCEK);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.strokeRect(x * OLCEK, y * OLCEK, en * OLCEK, boy * OLCEK);
}

function ciz(zaman) {
  BOLUMLER.forEach((b, i) => {
    const tuval = tuvaller[i];
    const satir = Math.ceil(b.hucreler.length / b.sutun);
    const gen = Math.ceil(b.sutun * b.en * OLCEK * z);
    const yuk = Math.ceil(satir * b.boy * OLCEK * z);
    if (tuval.width !== gen || tuval.height !== yuk) {
      tuval.width = gen;
      tuval.height = yuk;
    }
    const ctx = tuval.getContext('2d');
    ctx.setTransform(z, 0, 0, z, 0, 0);
    b.hucreler.forEach((h, n) => {
      const x = (n % b.sutun) * b.en;
      const y = Math.floor(n / b.sutun) * b.boy;
      zemin(ctx, x, y, b.en, b.boy);
      h.ciz(ctx, zaman, x + b.en / 2, y + b.boy / 2);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '11px system-ui, sans-serif';
    b.hucreler.forEach((h, n) => {
      if (h.etiket) {
        ctx.fillText(h.etiket, ((n % b.sutun) * b.en + 0.3) * OLCEK * z,
          (Math.floor(n / b.sutun) * b.boy + 0.9) * OLCEK * z);
      }
    });
  });
}

function dongu(zaman) {
  ciz(sabit ?? zaman);
  if (adres.get('animasyon') !== '0' && document.getElementById('anim').checked && sabit === null) {
    requestAnimationFrame(dongu);
  }
}

for (const d of document.querySelectorAll('button[data-z]')) {
  d.classList.toggle('secili', Number(d.dataset.z) === z);
  d.addEventListener('click', () => {
    z = Number(d.dataset.z);
    for (const o of document.querySelectorAll('button[data-z]')) {
      o.classList.toggle('secili', o === d);
    }
    ciz(sabit ?? performance.now());
  });
}
document.getElementById('anim').addEventListener('change', () => requestAnimationFrame(dongu));
requestAnimationFrame(dongu);
