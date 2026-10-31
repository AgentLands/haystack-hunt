/**
 * Makine önizlemesinin sahneleri: her hücre kalıcı nesneler (makine, balya, garaj) kurar ve
 * her karede adim(zaman, dt) ile onları oynatır (dönüş, hızlanma, balya bırakma olayı),
 * sonra çizer. Görsel hal (direksiyon, kepçe kalkışı, kapak) gerçek çizim kodunun kareden
 * kareye tuttuğu durumdan gelir; sabit zamanlı ekran görüntüsünde önce ısınma kareleri
 * oynatılır.
 */
import { yay } from '../js/olaylar.js';
import { makineCiz } from '../js/ozellik/gorsel/makine-cizim.js';
import { balyaCiz } from '../js/ozellik/gorsel/balya-cizim.js';
import { karakterCiz } from '../js/ozellik/gorsel/karakter-cizim.js';
import { garajZeminCiz, garajCatiCiz } from '../js/ozellik/gorsel/garaj-cizim.js';

const m = (tur, ek = {}) => ({
  id: 1, tur, x: 0, y: 0, yon: 0, hiz: 0, yakit: 1, surucu: false, calisiyor: false, yuk: 0,
  ...ek,
});

/** Tek makineli hücre; oyna(mk, t, dt) her karede makineyi değiştirir. */
function makineHucre(etiket, tur, ek, oyna) {
  return (x, y) => {
    const mk = m(tur, { x, y, ...ek });
    return {
      etiket,
      adim(t, dt) { if (oyna) oyna(mk, t, dt); },
      ciz(ctx, zaman) { makineCiz(ctx, mk, zaman); },
    };
  };
}

const don = (hiz) => (mk, t, dt) => { mk.yon += hiz * dt; };
const hizlan = (mk, t) => { mk.hiz = (t % 1.6) * 9; };

/** Balya makinesi: her 2.4 sn'de arkasına bir balya bırakır (kapak açılır, balya yuvarlanır). */
function balyaBirakan(etiket, faz) {
  return (x, y) => {
    const mk = m('balya', { x, y, surucu: true, yuk: 0.95 });
    let balya = null;
    let son = -1;
    return {
      etiket,
      adim(t) {
        const devir = Math.floor((t + faz) / 2.4);
        if (devir === son) {
          mk.yuk = Math.min(1, ((t + faz) % 2.4) / 2.4);
          return;
        }
        son = devir;
        mk.yuk = 0;
        balya = { x: x - 3.9, y, yon: 0, acik: false, acilma: 0 };
        yay('balya-birakildi', { balya, makine: mk });
      },
      ciz(ctx, zaman) {
        if (balya) balyaCiz(ctx, balya, zaman);
        makineCiz(ctx, mk, zaman);
      },
    };
  };
}

function balyaHucre(etiket, ek) {
  return (x, y) => {
    const b = { x, y, yon: 0, acik: false, acilma: 0, ...ek };
    return { etiket, adim() {}, ciz(ctx, zaman) { balyaCiz(ctx, b, zaman); } };
  };
}

/** Garaj hücresi: kenar yönünde park etmiş üç makine; ici: çiftçi çatının altında. */
function garajHucre(etiket, yon, ici) {
  return (x, y) => {
    const garaj = { x, y, kenar: 0, yon, en: 17 };
    const bx = -Math.sin(yon);
    const by = Math.cos(yon);
    const makineler = ['traktor', 'ufleyici', 'balya'].map((tur, i) => m(tur, {
      x: x + bx * (i - 1) * 5, y: y + by * (i - 1) * 5, yon, yakit: i === 1 ? 0.2 : 0.7,
    }));
    const ileri = ici ? -2.2 : 6.5;
    const karakter = {
      x: x + Math.cos(yon) * ileri + bx * 2.5, y: y + Math.sin(yon) * ileri + by * 2.5,
      yon: yon + Math.PI, hareketli: false, adimFaz: 0, z: 0, kullaniyor: false, makine: null,
    };
    const durum = { garaj, makineler, karakter, tarla: null };
    return {
      etiket,
      durum,
      adim() {},
      ciz(ctx, zaman) {
        garajZeminCiz(ctx, durum);
        for (const mk of makineler) makineCiz(ctx, mk, zaman);
        karakterCiz(ctx, karakter, zaman, 'el');
        garajCatiCiz(ctx, durum, zaman);
      },
    };
  };
}

function sirtta(etiket, ek) {
  return (x, y) => {
    const mk = m('ufleyici', { x, y, surucu: true, ...ek });
    const k = {
      x, y, yon: 0, hareketli: false, adimFaz: 0, z: 0, kullaniyor: false, makine: mk,
    };
    return {
      etiket,
      adim() {},
      ciz(ctx, zaman) {
        karakterCiz(ctx, k, zaman);
        makineCiz(ctx, mk, zaman);
      },
    };
  };
}

/** Bölümler: { baslik, sutun, en, boy, zemin, hucreler: [(x, y) => hücre] }. */
export const BOLUMLER = [
  { baslik: 'Traktör', sutun: 4, en: 12, boy: 9, hucreler: [
    makineHucre('boş, yakıt 1 (gösterge yok)', 'traktor', {}),
    makineHucre('sürücülü, dolu kepçe taşır', 'traktor', { surucu: true, yuk: 1 }),
    makineHucre('çalışıyor (kepçe iner/kalkar)', 'traktor',
      { surucu: true, calisiyor: true, yuk: 0.7, hiz: 4 }),
    makineHucre('hızlanıyor (egzoz pofu)', 'traktor', { surucu: true, yuk: 0.3 }, hizlan),
    makineHucre('sola dönüyor', 'traktor', { surucu: true, hiz: 6 }, don(-2.4)),
    makineHucre('sağa dönüyor', 'traktor', { surucu: true, hiz: 6, yon: 0.6 }, don(2.4)),
    makineHucre('yakıt 0.2', 'traktor', { yakit: 0.2 }),
    makineHucre('yakıt 0.08 (yanıp söner)', 'traktor', { yakit: 0.08, surucu: true }),
    makineHucre('yakıt 0 (sönük, boş bidon)', 'traktor', { yakit: 0, yuk: 0.6 }),
  ] },
  { baslik: 'Balya makinesi', sutun: 4, en: 13, boy: 9, hucreler: [
    makineHucre('boş', 'balya', {}),
    makineHucre('sürücülü, yuk 0.5', 'balya', { surucu: true, yuk: 0.5 }),
    makineHucre('çalışıyor, dolu', 'balya', { surucu: true, calisiyor: true, yuk: 1, hiz: 5 }),
    makineHucre('dönüyor', 'balya', { surucu: true, hiz: 6, yuk: 0.3, yon: -0.4 }, don(2.1)),
    balyaBirakan('balya bırakıyor (kapak açılır)', 2.35),
    balyaBirakan('kapak açık, balya yuvarlanır', 0.25),
    makineHucre('yakıt 0.2', 'balya', { yakit: 0.2, yuk: 0.2 }),
    makineHucre('yakıt 0', 'balya', { yakit: 0, yuk: 0.4 }),
  ] },
  { baslik: 'Sırt üfleyicisi', sutun: 4, en: 8, boy: 6, hucreler: [
    makineHucre('yerde', 'ufleyici', {}),
    makineHucre('yerde, çalışıyor', 'ufleyici', { calisiyor: true }),
    makineHucre('yakıt 0.15', 'ufleyici', { yakit: 0.15 }),
    makineHucre('yakıt 0', 'ufleyici', { yakit: 0 }),
    sirtta('sırtta, bekliyor', {}),
    sirtta('sırtta, üflüyor', { calisiyor: true, yakit: 0.5 }),
  ] },
  { baslik: 'Balyalar', sutun: 5, en: 7, boy: 6, hucreler: [
    balyaHucre('kapalı', {}), balyaHucre('yon 1.0', { yon: 1.0 }),
    balyaHucre('yon 2.5', { yon: 2.5 }), balyaHucre('açılma 0.4', { acik: true, acilma: 0.4 }),
    balyaHucre('açılma 0.9', { acik: true, acilma: 0.9 }),
  ] },
  { baslik: 'Garaj (dört kenar; sonuncuda çiftçi çatının altında)', sutun: 2, en: 26, boy: 26,
    hucreler: [
      garajHucre('sol kenar (yon 0)', 0), garajHucre('üst kenar (yon π/2)', Math.PI / 2),
      garajHucre('sağ kenar (yon π)', Math.PI), garajHucre('alt kenar, çatı altı',
        -Math.PI / 2, true),
    ] },
];
