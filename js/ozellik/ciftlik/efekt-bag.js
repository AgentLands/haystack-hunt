/**
 * Çiftlik efektleri (olay → görsel; parçacık ve ışıltı efekt/ altındaki ortak altyapıyla):
 * parça kurulunca/sökülünce toz pofu, gömülü nesne çıkınca kıvılcım, iğne bulununca ışıltı ve
 * kıvılcım sağanağı, sorun listesinden seçilen parçada halka, harman arabası dökümünde toz
 * bulutu, ve damga basılınca tuvalin ortasına inen büyük "DAMGA" mührü (DOM). Sade harekette
 * (prefers-reduced-motion) parçacıklar azalır, mühür animasyonsuz kısa görünür.
 */
import { dinle } from '../../olaylar.js';
import { OLCEK } from '../../cizim.js';
import { KARO, TIK_MS } from '../../kural/ciftlik/olcu.js';
import { esyaKodu } from '../../kural/ciftlik/esya.js';
import { bildir } from '../../arayuz.js';
import { efektEkle, piksel, rgb } from '../efekt/isiltilar.js';
import { parcacikEkle, ISIK } from '../efekt/parcacik.js';
import { pofEkle, tozEkle, copEkle, az, rasgele } from '../efekt/uretim.js';
import { yap, tuvalKap } from './yap.js';

const CIVI = esyaKodu('civi');
const IGNE = esyaKodu('igne');
const DUYURU_TIK = 600;
const MUHUR_MS = 2600;

const simdi = () => performance.now();
/** Karo koordinatının (kx, ky; ortası) tuval pikseli. */
const karoPiksel = (k) => (k + 0.5) * KARO * OLCEK;

function kivilcim(x, y, hiz, renk = '255, 226, 140') {
  const aci = rasgele(0, Math.PI * 2);
  parcacikEkle({ tur: ISIK, x, y, z: rasgele(0, 6), vx: Math.cos(aci) * hiz,
    vy: Math.sin(aci) * hiz, vz: rasgele(30, 120), omur: rasgele(0.6, 1.2),
    boy: rasgele(2.5, 5), renk });
}

function parcaPofu(p, saman) {
  const x = (p.x + p.en / 2) * KARO * OLCEK;
  const y = (p.y + p.boy / 2) * KARO * OLCEK;
  for (let k = 0; k < az(3); k++) {
    pofEkle(x + rasgele(-p.en, p.en) * 4, y + rasgele(-p.boy, p.boy) * 4);
  }
  for (let k = 0; k < az(saman); k++) {
    copEkle(x, y, rasgele(0, Math.PI * 2), rasgele(30, 90), rasgele(50, 110), rasgele(0.5, 0.9));
  }
}

dinle('parca-kuruldu', ({ parca }) => parcaPofu(parca, 5));
dinle('parca-sokuldu', ({ parca }) => parcaPofu(parca, 2));

dinle('gomulu-cikti', ({ x, y, tur }) => {
  if (tur === IGNE) return;
  const renk = tur === CIVI ? '240, 140, 70' : '255, 226, 140';
  for (let k = 0; k < az(8); k++) kivilcim(piksel(x), piksel(y), rasgele(20, 60), renk);
});

dinle('ciftlik-igne', ({ x, y }) => {
  efektEkle({ tur: 'parlama', x: piksel(x), y: piksel(y), bas: simdi(), sure: 1600, boy: 30,
    halkali: true });
  for (let k = 0; k < az(40); k++) kivilcim(piksel(x), piksel(y), rasgele(30, 140));
  bildir('İğne bulundu!', 2600);
});

dinle('ciftlik-sorun-secildi', ({ kx, ky }) => {
  efektEkle({ tur: 'dalga', x: karoPiksel(kx), y: karoPiksel(ky), bas: simdi(), sure: 1400,
    renk: rgb('#e3b341'), sicak: false, halkaSayisi: 3, menzil: 40 });
});

dinle('harman-arabasi', ({ asama, x, y }) => {
  if (asama === 'duyuru') {
    const sn = Math.round((DUYURU_TIK * TIK_MS) / 1000);
    bildir(`Harman arabası ${sn} sn sonra geliyor.`, 3500);
    return;
  }
  for (let k = 0; k < az(18); k++) {
    tozEkle(karoPiksel(x) + rasgele(-30, 30), karoPiksel(y) + rasgele(-20, 20),
      rasgele(-30, 30), rasgele(-30, 30), rasgele(10, 20));
  }
  for (let k = 0; k < az(24); k++) {
    copEkle(karoPiksel(x), karoPiksel(y), rasgele(0, Math.PI * 2), rasgele(30, 120),
      rasgele(60, 140), rasgele(0.7, 1.3));
  }
});

// --- Damga mührü (DOM): büyükten oturur, birkaç saniye kalır, sönerek gider ---
dinle('damga-basildi', ({ damga, ad }) => {
  for (const eski of tuvalKap().querySelectorAll('.cf-damga-vuru')) eski.remove();
  const muhur = yap('div', 'cf-damga-vuru');
  muhur.setAttribute('aria-hidden', 'true');
  muhur.append(yap('b', '', damga), yap('span', '', ad ?? 'Damga'));
  tuvalKap().append(muhur);
  setTimeout(() => muhur.remove(), MUHUR_MS);
});
