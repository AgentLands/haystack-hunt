/**
 * Akış göstergesi: kesintisiz kazı ritmi (kazildi, makine-calisti) ince bir çubuğu doldurur,
 * saman parçacıkları biraz canlanır, kazı sesinin perdesi hafifçe yükselir; ara verince
 * söner, paslı çivi alınca yarıya düşer. Yalnız his: puana ve süreye dokunmaz.
 * Sayaç kuralları js/kural/akis.js'te.
 */
import { dinle } from '../olaylar.js';
import { OLCEK } from '../cizim.js';
import {
  yeniAkis, akisSeviyesi, akisOlayi, akisAksadi, akisPerdesi,
} from '../kural/akis.js';
import { parcacikEkle, ISIK } from './efekt/parcacik.js';
import { copEkle, rasgele, sade } from './efekt/uretim.js';
import { kazimPerdesi } from './ses-motor.js';
import { etiketYigini } from './etiket-yigini.js';

let akis = yeniAkis();
let gosterilen = -1;

const cubuk = document.createElement('div');
cubuk.className = 'akis-cubuk';
cubuk.setAttribute('aria-hidden', 'true');
const dolgu = document.createElement('i');
cubuk.append(dolgu);
etiketYigini().append(cubuk);

const simdi = () => performance.now();
const piksel = (h) => (h + 0.5) * OLCEK;

/** Seviyeye göre canlı saman: bir iki ek çöp ve yüksekte seyrek sıcak kıvılcım. */
function canlandir(x, y, seviye) {
  if (sade.matches || seviye < 0.12 || Math.random() > seviye * 0.9) return;
  const aci = rasgele(0, Math.PI * 2);
  const r = rasgele(0, OLCEK * 2);
  copEkle(piksel(x) + Math.cos(aci) * r, piksel(y) + Math.sin(aci) * r, aci,
    rasgele(40, 80 + 70 * seviye), rasgele(90, 150 + 80 * seviye), rasgele(0.7, 1.2));
  if (seviye > 0.6 && Math.random() < 0.18) {
    parcacikEkle({ tur: ISIK, x: piksel(x), y: piksel(y), z: rasgele(0, 4),
      vx: rasgele(-20, 20), vy: rasgele(-20, 20), vz: rasgele(40, 90), omur: rasgele(0.5, 0.9),
      boy: rasgele(2, 3.5), renk: '255, 226, 140' });
  }
}

function kazi(x, y) {
  akis = akisOlayi(akis, simdi());
  if (x !== undefined) canlandir(x, y, akis.seviye);
}

dinle('kazildi', ({ x, y }) => kazi(x, y));
dinle('makine-calisti', ({ miktar }) => {
  if (miktar > 0) kazi();
});
dinle('civi-alindi', () => {
  akis = akisAksadi(akis, simdi());
});
dinle('oyun-basladi', () => {
  akis = yeniAkis();
  gosterilen = -1;
});

dinle('kare', () => {
  const seviye = akisSeviyesi(akis, simdi());
  const yuzde = Math.round(seviye * 50); // %2'lik adımlar: DOM ve ses yalnız değişince
  if (yuzde === gosterilen) return;
  gosterilen = yuzde;
  const s = yuzde / 50;
  dolgu.style.transform = `scaleX(${s})`;
  cubuk.classList.toggle('acik', s >= 0.04);
  cubuk.classList.toggle('parilti', s >= 0.85);
  kazimPerdesi(akisPerdesi(s));
});
