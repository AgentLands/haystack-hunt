/**
 * Çiftlik sesleri (olay → ses; sentez ses-motor.js'te, tarla seslerine ek): parça kurma/sökme,
 * reddedilen komut, kuruş kazancı, damga damgası, sipariş teslimi, harman arabası (duyuru
 * kornası, yığın dökümü), iğne bulma, gömülü nesne çıkışı, yeni sorun uyarısı, öğretici
 * adımı ve çevrimdışı kazanç. Ses kapalıyken ya da bağlam hazır değilken hiçbir şey çalmaz.
 * Sık tekrarlayan sesler (kurma, sorun) hız sınırlıdır.
 */
import { dinle } from '../../olaylar.js';
import { esyaKodu } from '../../kural/ciftlik/esya.js';
import { hazirMi, nota, hisirti, bulunduSesi, igneSesi, tikSesi } from '../ses-motor.js';

const CIVI = esyaKodu('civi');
const IGNE = esyaKodu('igne');
const SORUN_ARALIK_MS = 6000;
const KUR_ARALIK_MS = 60;
let sonSorun = 0;
let sonKur = 0;
let oncekiSorun = 0;

/** Ses çalabiliyorsa fonksiyonu çalıştırır. */
const cal = (islev) => (veri) => {
  if (hazirMi()) islev(veri ?? {});
};

/** İki ya da üç notalık küçük zil: frekanslar sırayla, aralık saniye. */
function zil(frekanslar, { duzey = 0.18, aralik = 0.07, sure = 0.28, kat = 'ipucu' } = {}) {
  frekanslar.forEach((frekans, i) => {
    const gecikme = i * aralik;
    nota({ frekans, sure, duzey, dalga: 'triangle', gecikme, atak: 0.003, kat });
    nota({ frekans: frekans * 2.76, sure: sure / 2, duzey: duzey / 3, gecikme, kat });
  });
}

dinle('parca-kuruldu', cal(() => {
  const simdi = performance.now();
  if (simdi - sonKur < KUR_ARALIK_MS) return;
  sonKur = simdi;
  nota({ frekans: 170, bitisFrekans: 105, sure: 0.09, duzey: 0.16, dalga: 'triangle',
    kat: 'makine' });
  hisirti({ sure: 0.06, duzey: 0.05, f0: 1800, f1: 900, q: 1.2, kat: 'makine' });
}));
dinle('parca-sokuldu', cal(() => {
  nota({ frekans: 430, bitisFrekans: 230, sure: 0.08, duzey: 0.1, kat: 'makine' });
}));
dinle('parca-dondu', cal(() => tikSesi()));
dinle('komut-reddedildi', cal(() => {
  nota({ frekans: 150, bitisFrekans: 120, sure: 0.12, duzey: 0.07, dalga: 'square',
    kat: 'arayuz' });
}));
dinle('ciftlik-kurus', cal(({ fark }) => {
  zil(fark >= 100 ? [1568, 2093, 2637] : [1568, 2093], { duzey: 0.15, aralik: 0.06 });
}));
dinle('damga-basildi', cal(() => {
  nota({ frekans: 96, bitisFrekans: 52, sure: 0.22, duzey: 0.36, dalga: 'triangle',
    kat: 'makine' });
  hisirti({ sure: 0.1, duzey: 0.18, f0: 700, f1: 260, q: 0.9, kat: 'makine' });
  zil([880, 1175, 1568, 2093], { duzey: 0.2, aralik: 0.09, sure: 0.5 });
}));
dinle('siparis-teslim', cal(() => zil([1319, 1760], { duzey: 0.17, aralik: 0.1, sure: 0.4 })));
dinle('harman-arabasi', cal(({ asama }) => {
  if (asama === 'duyuru') {
    nota({ frekans: 196, sure: 0.35, duzey: 0.13, dalga: 'sawtooth', kat: 'ortam' });
    nota({ frekans: 247, sure: 0.5, duzey: 0.13, dalga: 'sawtooth', gecikme: 0.4, kat: 'ortam' });
  } else {
    hisirti({ sure: 0.8, duzey: 0.2, f0: 500, f1: 140, q: 0.7, kat: 'ortam' });
  }
}));
dinle('ciftlik-igne', cal(({ kaynak }) => (kaynak === 'parca' ? bulunduSesi() : igneSesi())));
dinle('gomulu-cikti', cal(({ tur }) => {
  if (tur === IGNE) return;
  if (tur === CIVI) {
    nota({ frekans: 520, bitisFrekans: 430, sure: 0.12, duzey: 0.1, dalga: 'square',
      kat: 'arayuz' });
  } else {
    nota({ frekans: 2600, bitisFrekans: 2000, sure: 0.07, duzey: 0.06, kat: 'ipucu' });
  }
}));
dinle('ogretici-adim', cal(() => tikSesi()));
dinle('ciftlik-cevrimdisi', cal(() => zil([988, 1319, 1760], { duzey: 0.16, aralik: 0.12 })));
dinle('ciftlik-hud', cal(({ sorunlar }) => {
  const agir = sorunlar.filter((s) => s.agir).length;
  const simdi = performance.now();
  if (agir > oncekiSorun && simdi - sonSorun > SORUN_ARALIK_MS) {
    sonSorun = simdi;
    nota({ frekans: 330, sure: 0.12, duzey: 0.09, dalga: 'triangle', kat: 'arayuz' });
    nota({ frekans: 262, sure: 0.18, duzey: 0.09, dalga: 'triangle', gecikme: 0.13,
      kat: 'arayuz' });
  }
  oncekiSorun = agir;
}));
