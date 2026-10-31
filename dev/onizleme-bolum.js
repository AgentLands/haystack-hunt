/**
 * Önizleme bölümleri: sahte verilerle çiftçi (oyun ölçeği şeridi, 8 yön × yürüme fazı,
 * araç pozları, yükseklik), iğne ve çivi, makineler ve balyalar. Her bölüm
 * { baslik, sutun, en, boy, hucreler: [{ etiket, ciz(ctx, zaman, cx, cy) }], z?, zemin? }.
 * z verilirse bölüm o yakınlaştırmada sabit çizilir (oyun ölçeği); zemin 'saman' dokulu.
 */
import { OLCEK, igneModeli } from '../js/cizim.js';
import { karakterCiz } from '../js/ozellik/gorsel/karakter-cizim.js';
import { makineCiz } from '../js/ozellik/gorsel/makine-cizim.js';
import { balyaCiz } from '../js/ozellik/gorsel/balya-cizim.js';
import { civiCiz } from '../js/ozellik/civi-cizim.js';

const YONLER = [
  'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı', 'Kuzey', 'Kuzeydoğu',
];
const ARACLAR = ['el', 'tirmik', 'dedektor', 'miknatis'];
/** Takip yakınlığı ve 390 px telefonda tuvalin CSS küçülmesi (358 / 960). */
export const OYUN_Z = 3.5;
export const MOBIL_Z = 3.5 * 0.373;

export const k = (yon, ek = {}) => ({
  x: 0, y: 0, yon, hareketli: false, adimFaz: 0, z: 0, kullaniyor: false, makine: null, ...ek,
});
const m = (tur, ek = {}) => ({
  id: 1, tur, x: 0, y: 0, yon: 0, hiz: 0, yakit: 1, surucu: false, calisiyor: false, yuk: 0,
  ...ek,
});
const igne = (aci) => (c, t, x, y) => igneModeli(c, x * OLCEK, y * OLCEK, aci);
const civi = (aci) => (c, t, x, y) => civiCiz(c, { x: x - 0.5, y: y - 0.5, aci });

/** Oyun ölçeği şeridi: yönler, yürüme, her araç kullanılırken, iğne ve çivi. */
function oyunSeridi() {
  const h = [];
  for (let i = 0; i < 8; i++) {
    h.push({ etiket: i ? '' : 'bekle', ciz: (c, t, x, y) => karakterCiz(c, k(i * Math.PI / 4,
      { x, y }), t) });
  }
  for (const faz of [0, 0.25, 0.5, 0.75]) {
    h.push({ etiket: faz ? '' : 'yuru', ciz: (c, t, x, y) => karakterCiz(c, k(0.4,
      { x, y, hareketli: true, adimFaz: faz }), t) });
  }
  for (const ad of ARACLAR) {
    h.push({ etiket: ad.slice(0, 4), ciz: (c, t, x, y) => karakterCiz(c, k(0.4,
      { x: x - 1, y: y - 0.4, kullaniyor: true }), t + 150, ad) });
  }
  h.push({ etiket: 'igne', ciz: igne(-0.4) }, { etiket: 'igne', ciz: igne(1.2) });
  h.push({ etiket: 'civi', ciz: civi(0.5) }, { etiket: 'civi', ciz: civi(2.3) });
  h.push({ etiket: 'el 2', ciz: (c, t, x, y) => karakterCiz(c, k(2.2,
    { x, y, kullaniyor: true }), t + 330, 'el') });
  for (const ad of ['tirmik', 'dedektor', 'miknatis']) {
    h.push({ etiket: '', ciz: (c, t, x, y) => karakterCiz(c, k(2.2, { x: x + 1, y }), t, ad) });
  }
  return h;
}

function karakterBolumu() {
  const h = [];
  for (const faz of [0, 0.25, 0.5, 0.75]) {
    for (let i = 0; i < 8; i++) {
      h.push({ etiket: i === 0 ? `faz ${faz}` : '', ciz: (c, t, x, y) => karakterCiz(c,
        k((i * Math.PI) / 4, { x, y, hareketli: true, adimFaz: faz }), t) });
    }
  }
  return h;
}

function aracBolumu() {
  const h = [];
  for (const ad of ARACLAR) {
    h.push({ etiket: ad, ciz: (c, t, x, y) => karakterCiz(c, k(0.3, { x, y }), t, ad) });
    for (const dt of [0, 130, 260, 390]) {
      h.push({ etiket: dt === 0 ? 'kullan' : '', ciz: (c, t, x, y) => karakterCiz(c,
        k(0.3, { x, y, kullaniyor: true, hareketli: dt === 260, adimFaz: 0.25 }),
        t + dt * 3, ad) });
    }
  }
  return h;
}

function makineBolumu() {
  const makine = (tur, ek, etiket) => ({
    etiket, ciz: (c, t, x, y) => makineCiz(c, m(tur, { x, y, ...ek }), t),
  });
  const durumlar = [
    [{}, 'bos'], [{ surucu: true, yuk: 0.5 }, 'surucu yuk .5'],
    [{ surucu: true, yuk: 1, calisiyor: true, hiz: 3 }, 'calisiyor hiz 3'],
    [{ yakit: 0, yuk: 0.7 }, 'yakit 0'],
  ];
  const h = [];
  for (const tur of ['traktor', 'balya']) {
    for (const [ek, et] of durumlar) {
      for (const yon of [0, 0.6]) {
        h.push(makine(tur, { ...ek, yon, yuk: ek.yuk ?? (tur === 'balya' ? 0.2 : 0) },
          yon === 0 ? `${tur}: ${et}` : ''));
      }
    }
  }
  const ufleDurum = [[{}, 'bos'], [{ calisiyor: true }, 'calisiyor'], [{ yakit: 0 }, 'yakit 0']];
  for (const [ek, et] of ufleDurum) {
    h.push(makine('ufleyici', ek, `ufleyici: ${et}`));
  }
  const ufle = (ek, etiket) => ({
    etiket,
    ciz: (c, t, x, y) => karakterCiz(c, k(0, { x, y, makine: m('ufleyici', { surucu: true, ...ek }),
      hareketli: ek.hiz > 0, adimFaz: (t / 500) % 1 }), t),
  });
  h.push(ufle({}, 'sirtta: bekle'), ufle({ calisiyor: true, hiz: 1 }, 'sirtta: calisiyor'));
  return h;
}

function balyaBolumu() {
  const h = [];
  for (const [acik, ac] of [[false, 0], [true, 0.15], [true, 0.4], [true, 0.7], [true, 1]]) {
    h.push({ etiket: acik ? `acilma ${ac}` : 'kapali',
      ciz: (c, t, x, y) => balyaCiz(c, { x: x + 1, y, yon: 0, acik, acilma: ac }, t) });
  }
  h.push({ etiket: 'yon 1.0',
    ciz: (c, t, x, y) => balyaCiz(c, { x, y, yon: 1.0, acik: false, acilma: 0 }, t) });
  return h;
}

export function bolumler() {
  const yuksek = [0, 60, 120].map((z) => ({
    etiket: `z=${z}`, ciz: (c, t, x, y) => karakterCiz(c, k(0, { x, y, z }), t),
  }));
  const igneCivi = [];
  for (const aci of [0, 0.6, 1.6, -0.8]) {
    igneCivi.push({ etiket: `igne ${aci}`, ciz: igne(aci) });
  }
  for (const aci of [0, 0.6, 1.6, -0.8]) igneCivi.push({ etiket: `civi ${aci}`, ciz: civi(aci) });
  const yakin = [
    ['bekle', {}, 'el'], ['yuru 0', { hareketli: true }, 'el'],
    ['yuru .5', { hareketli: true, adimFaz: 0.5 }, 'el'], ['el', { kullaniyor: true }, 'el'],
  ].map(([etiket, ek, ad]) => ({ etiket, ciz: (c, t, x, y) => karakterCiz(c,
    k(-0.5, { x, y, ...ek }), t, ad) }));
  return [
    { baslik: 'Yakın (z=22): bekle, yürüme fazı 0 ve 0.5, el ile kazma', sutun: 4, en: 3,
      boy: 3, z: 22, zemin: 'saman', hucreler: yakin },
    { baslik: `Oyun ölçeği z=${OYUN_Z} (masaüstü), saman zemin`, sutun: 8, en: 4, boy: 4,
      z: OYUN_Z, zemin: 'saman', hucreler: oyunSeridi() },
    { baslik: `Oyun ölçeği telefon (390 px, CSS z≈${MOBIL_Z.toFixed(2)})`, sutun: 8, en: 4,
      boy: 4, z: MOBIL_Z, zemin: 'saman', hucreler: oyunSeridi() },
    { baslik: `Karakter: 8 yon x yurume fazi (${YONLER.join(', ')})`, sutun: 8, en: 4, boy: 4,
      hucreler: karakterBolumu() },
    { baslik: 'Araclar: bekle + kullan (4 zaman)', sutun: 5, en: 7, boy: 5,
      hucreler: aracBolumu() },
    { baslik: 'İğne ve çivi', sutun: 4, en: 5, boy: 3, zemin: 'saman', hucreler: igneCivi },
    { baslik: 'Yukseklik (z)', sutun: 3, en: 4, boy: 4, hucreler: yuksek },
    { baslik: 'Makineler (yon 0 ve 0.6 rad)', sutun: 4, en: 11, boy: 8,
      hucreler: makineBolumu() },
    { baslik: 'Balyalar', sutun: 3, en: 8, boy: 5, hucreler: balyaBolumu() },
  ];
}
