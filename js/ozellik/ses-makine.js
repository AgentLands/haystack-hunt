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
import { hazirMi, hisirti, nota } from './ses-motor.js';

const ADIM_ARALIK_MS = 100;
const MOTOR_ARALIK_MS = 50;
const rasgele = (a, b) => a + Math.random() * (b - a);

/** Çalma isteğini yalnız ses hazırsa yürütür. */
const sesli = (islev) => (...a) => {
  if (hazirMi()) islev(...a);
};

const adimSesi = sesli((z) => {
  const d = adimDeseni(z);
  if (d.tur === 'toprak') {
    nota({ frekans: d.f0 * rasgele(0.9, 1.1), bitisFrekans: d.f1, sure: d.sure,
      duzey: d.duzey, atak: 0.002 });
    hisirti({ sure: 0.03, duzey: d.duzey * 0.5, f0: 2600, q: 1, atak: 0.002 });
    return;
  }
  hisirti({ sure: d.sure, duzey: d.duzey, f0: d.f0 * rasgele(0.85, 1.15), f1: d.f1, q: d.q,
    atak: 0.02 });
  if (d.dolgunluk > 0.2) {
    nota({ frekans: 120, bitisFrekans: 70, sure: 0.1, duzey: d.dolgunluk * 0.1, atak: 0.01 });
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
  nota({ frekans: 145, bitisFrekans: 68, sure: 0.24, duzey: 0.42, atak: 0.004 });
  hisirti({ sure: 0.16, duzey: 0.2, f0: 420, q: 0.8, atak: 0.005 });
});

const kepceBosaltildi = sesli((miktar) => {
  const guc = Math.min(1, 0.35 + (miktar || 0) / 4000);
  hisirti({ sure: 0.9, duzey: 0.3 * guc, f0: 3000, f1: 1200, q: 0.5, atak: 0.06 });
  hisirti({ sure: 0.7, duzey: 0.2 * guc, f0: 1800, f1: 900, q: 0.6, atak: 0.08, gecikme: 0.12 });
});

/** Çok kısa metalik tık: dikkatli kulak fark etsin, belirgin olmasın. */
const igneTiki = sesli(() => {
  nota({ frekans: 3200, sure: 0.05, duzey: 0.045, atak: 0.001 });
  nota({ frekans: 5100, sure: 0.03, duzey: 0.022, atak: 0.001, gecikme: 0.004 });
});

const balyaBirakildi = sesli(() => {
  nota({ frekans: 120, bitisFrekans: 52, sure: 0.2, duzey: 0.34, atak: 0.006 });
  hisirti({ sure: 0.14, duzey: 0.14, f0: 520, q: 0.7, atak: 0.004 });
});

const balyaAcildi = sesli(() => {
  hisirti({ sure: 0.24, duzey: 0.2, f0: 4500, f1: 2500, q: 2.2, atak: 0.01 }); // ip yırtılır
  hisirti({ sure: 0.55, duzey: 0.22, f0: 2800, f1: 1500, q: 0.5, atak: 0.05, gecikme: 0.1 });
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

const adimIzni = hizSinirlayici(ADIM_ARALIK_MS);
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
dinle('balya-birakildi', balyaBirakildi);
dinle('balya-acildi', balyaAcildi);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) motoruDurdur(true);
});
