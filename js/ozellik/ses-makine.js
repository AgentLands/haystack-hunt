/**
 * Ayak ve makine sesleri: karakter-adim (saman hışırtısı / toprak tıkı), binilen makinenin
 * sürekli motoru (hıza ve çalışmaya göre perde/düzey) ve makine olay sesleri (marş, takılma,
 * yakıt bitişi, kepçe, iğne tıkı, balya). Düğüm sentezi ses-motor.js ve ses-makine-motor.js;
 * saf eşlemeler ses-makine-desen.js. Sessiz düğmesine uyar; sekme gizliyken motor susar.
 */
import { dinle } from '../olaylar.js';
import { makineTanimi } from '../kural/makineler/kayit.js';
import { hizSinirlayici } from './ses-desen.js';
import { adimDeseni, hizOrani, motorDeseni } from './ses-makine-desen.js';
import { motorKur } from './ses-makine-motor.js';
import { hazirMi, hisirti as hisirtiCal, nota as notaCal } from './ses-motor.js';
import { sapmali } from './ses-seviye.js';

const ADIM_ARALIK_MS = 100;
const ADIM_SAPMA = 0.2; // adımlar arası ±%20: yürüyüş metronom gibi olmasın
const MOTOR_ARALIK_MS = 50;

/** Bu dosyadaki sesler (iğne tıkı hariç) 'makine' kategorisindedir; adım 'arac'. */
const hisirti = (o) => hisirtiCal({ kat: 'makine', ...o });
const nota = (o) => notaCal({ kat: 'makine', ...o });
let ayak = 0; // sağ/sol adım: hafif perde farkı

/** Çalma isteğini yalnız ses hazırsa yürütür. */
const sesli = (islev) => (...a) => {
  if (hazirMi()) islev(...a);
};

const adimSesi = sesli((z) => {
  const d = adimDeseni(z);
  const arac = { kat: 'arac' };
  const perde = (ayak++ % 2 ? 1.07 : 0.94) * sapmali(1, 0.08); // sol/sağ ayak + sapma
  const guc = sapmali(1, 0.2);
  if (d.tur === 'toprak') {
    notaCal({ frekans: d.f0 * perde, bitisFrekans: d.f1, sure: sapmali(d.sure, 0.2),
      duzey: d.duzey * guc, atak: 0.002, ...arac });
    hisirtiCal({ sure: 0.03, duzey: d.duzey * 0.5 * guc, f0: sapmali(2600, 0.15), q: 1,
      atak: 0.002, ...arac });
    return;
  }
  hisirtiCal({ sure: sapmali(d.sure, 0.15), duzey: d.duzey * guc, f0: d.f0 * perde,
    f1: d.f1, q: d.q, atak: 0.02, ...arac });
  if (d.dolgunluk > 0.2) {
    notaCal({ frekans: sapmali(120, 0.1), bitisFrekans: 70, sure: 0.1,
      duzey: d.dolgunluk * 0.1 * guc, atak: 0.01, ...arac });
  }
});

const marsSesi = sesli((tur) => {
  if (tur === 'ufleyici') { // ip çekme: yükselen vızıltı
    hisirti({ sure: 0.35, duzey: 0.18, f0: 900, f1: 2800, q: 1.2, atak: 0.05 });
    nota({ frekans: 120, bitisFrekans: 380, sure: 0.4, duzey: 0.1, dalga: 'sawtooth' });
    return;
  }
  const taban = tur === 'balya' ? 85 : 62;
  for (let i = 0; i < 5; i++) { // marş dişlisi: hızlanan vuruşlar
    nota({ frekans: taban * (1 + i * 0.05), sure: 0.06, duzey: 0.16, dalga: 'sawtooth',
      gecikme: i * 0.085, atak: 0.004 });
  }
  nota({ frekans: taban * 0.7, bitisFrekans: taban * 1.4, sure: 0.35, duzey: 0.16,
    dalga: 'sawtooth', gecikme: 0.42 });
});

const takilmaSesi = sesli(() => {
  nota({ frekans: 92, bitisFrekans: 58, sure: 0.4, duzey: 0.2, dalga: 'sawtooth' });
  hisirti({ sure: 0.55, duzey: 0.22, f0: 1900, f1: 900, q: 1.4, atak: 0.03 }); // patinaj
});

const yakitBittiSesi = sesli(() => {
  [[0, 72, 0.1, 0.24], [0.17, 62, 0.12, 0.2], [0.42, 50, 0.24, 0.16]].forEach(([g, f, s, d]) => {
    nota({ frekans: f, bitisFrekans: f * 0.7, sure: s, duzey: d, dalga: 'sawtooth', gecikme: g });
    hisirti({ sure: s, duzey: d * 0.4, f0: 500, q: 0.8, gecikme: g });
  });
});

const kepceDoldu = sesli(() => {
  nota({ frekans: 145, bitisFrekans: 68, sure: 0.24, duzey: 0.24, atak: 0.004 });
  hisirti({ sure: 0.16, duzey: 0.12, f0: 420, q: 0.8, atak: 0.005 });
});

const kepceBosaltildi = sesli((miktar) => {
  const guc = Math.min(1, 0.35 + (miktar || 0) / 4000);
  hisirti({ sure: 0.9, duzey: 0.17 * guc, f0: 2400, f1: 1000, q: 0.5, atak: 0.06 });
  hisirti({ sure: 0.7, duzey: 0.12 * guc, f0: 1500, f1: 800, q: 0.6, atak: 0.08, gecikme: 0.12 });
});

/** Çok kısa metalik tık: dikkatli kulak fark etsin, belirgin olmasın. */
const igneTiki = sesli(() => {
  notaCal({ frekans: 3200, sure: 0.05, duzey: 0.045, atak: 0.001 });
  notaCal({ frekans: 5100, sure: 0.03, duzey: 0.022, atak: 0.001, gecikme: 0.004 });
});

const balyaBirakildi = sesli(() => {
  nota({ frekans: 120, bitisFrekans: 52, sure: 0.2, duzey: 0.22, atak: 0.006 });
  hisirti({ sure: 0.14, duzey: 0.09, f0: 520, q: 0.7, atak: 0.004 });
});

const balyaAcildi = sesli(() => {
  hisirti({ sure: 0.24, duzey: 0.14, f0: 3600, f1: 2000, q: 1.6, atak: 0.01 }); // ip yırtılır
  hisirti({ sure: 0.55, duzey: 0.16, f0: 2400, f1: 1300, q: 0.5, atak: 0.05, gecikme: 0.1 });
});

let aktif = null; // { makine, motor }
let motorBaslamaMs = 0; // marş bitmeden motor devreye girmez

/** Motoru söndürür (kısa perde düşüşüyle). */
function motoruDurdur(hizli = false) {
  if (!aktif) return;
  aktif.motor.durdur(hizli);
  aktif = null;
}

function motorYonet(durum) {
  const m = durum.karakter.makine;
  if (!m || !(m.yakit > 0) || document.hidden || !hazirMi()) {
    motoruDurdur(document.hidden);
    return;
  }
  const t = makineTanimi(m.tur);
  const desen = motorDeseni(m.tur, {
    hizOrani: hizOrani(m.hiz, t.azamiHiz), calisiyor: m.calisiyor, takili: m.takili,
  });
  if (!aktif || aktif.makine !== m) {
    if (performance.now() < motorBaslamaMs) return;
    motoruDurdur(true);
    const motor = motorKur(desen);
    if (motor) aktif = { makine: m, motor };
    return;
  }
  if (motorIzni(performance.now())) aktif.motor.guncelle(desen);
}

const adimIzni = hizSinirlayici(ADIM_ARALIK_MS, ADIM_SAPMA);
const motorIzni = hizSinirlayici(MOTOR_ARALIK_MS);
const takilmaIzni = hizSinirlayici(600);

dinle('karakter-adim', ({ z }) => {
  if (adimIzni(performance.now())) adimSesi(z);
});
dinle('kare', ({ durum }) => motorYonet(durum));
dinle('makine-bin', ({ makine }) => {
  motorBaslamaMs = performance.now() + (makine.tur === 'ufleyici' ? 250 : 450);
  marsSesi(makine.tur);
});
dinle('makine-in', () => motoruDurdur());
dinle('oyun-basladi', () => motoruDurdur(true));
dinle('makine-takildi', () => {
  if (takilmaIzni(performance.now())) takilmaSesi();
});
dinle('yakit-bitti', yakitBittiSesi);
dinle('kepce-doldu', kepceDoldu);
dinle('kepce-bosaltildi', ({ miktar }) => kepceBosaltildi(miktar));
dinle('igne-kepcede', igneTiki);
dinle('igne-yutuldu', igneTiki);
dinle('civi-yutuldu', igneTiki);
dinle('balya-birakildi', balyaBirakildi);
dinle('balya-acildi', balyaAcildi);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) motoruDurdur(true);
});
