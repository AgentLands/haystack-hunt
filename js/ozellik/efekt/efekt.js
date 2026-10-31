/**
 * Görsel efektler (giriş): oyun olaylarını dinleyip parçacık, dalga, ışıltı ve bulma
 * animasyonu üretir; tarlanın üstüne ışık/vinyet ('alt') ve efekt ('ust') katmanı ekler.
 * prefers-reduced-motion açıksa parçacıklar azalır, sarsıntı ve salınım kapanır.
 */
import { dinle } from '../../olaylar.js';
import { katmanEkle, OLCEK, igneYariBoyu } from '../../cizim.js';
import { durumAl } from '../../oyun.js';
import { SEVIYELER, EL_YARICAP, TIRMIK_YARICAP } from '../../kural/araclar.js';
import { igneDerinligi } from '../../kural/igne.js';
import { parcacikEkle, guncelle, parcaciklariCiz, hepsiniSil, ISIK } from './parcacik.js';
import { efektEkle, efektleriCiz, efektleriSil, piksel, rgb, yildizIsigi } from './isiltilar.js';
import { stilEkle, bulmaBaslat, bulmaSifirla, yamaAl, bulmaCiz } from './bulma.js';
import { ortamCiz } from './ortam.js';
import { sade, az, rasgele, copEkle, tozEkle } from './uretim.js';
import './hareket.js';

let sonZaman = null;

const simdi = () => performance.now();

function kivilcimEkle(x, y, hiz, renk = '255, 226, 140') {
  const aci = rasgele(0, Math.PI * 2);
  parcacikEkle({ tur: ISIK, x, y, z: rasgele(0, 6), vx: Math.cos(aci) * hiz,
    vy: Math.sin(aci) * hiz, vz: rasgele(30, 120), omur: rasgele(0.6, 1.2),
    boy: rasgele(2.5, 5), renk });
}

/** Tuval kabını kısaca sarsar (diğer dönüşümlerin üstüne eklenir). */
function sars(guc) {
  if (sade.matches) return;
  const kap = document.getElementById('tarla-kap');
  const k = [0, -1, 0.8, -0.5, 0.25, 0].map((c, i) => ({
    transform: `translate(${c * guc}px, ${(i % 2 ? 1 : -1) * c * guc * 0.6}px)`,
  }));
  kap.animate(k, { duration: 320, easing: 'ease-out', composite: 'add' });
}

dinle('kazildi', ({ x, y, miktar }) => {
  const px = piksel(x);
  const py = piksel(y);
  const n = az(Math.min(4, 1 + Math.floor(miktar / 10)));
  for (let k = 0; k < n; k++) {
    const aci = rasgele(0, Math.PI * 2);
    const r = rasgele(0, EL_YARICAP * OLCEK);
    copEkle(px + Math.cos(aci) * r, py + Math.sin(aci) * r, aci, rasgele(15, 70),
      rasgele(60, 150), rasgele(0.6, 1.1));
  }
  if (Math.random() < 0.25 && !sade.matches) tozEkle(px, py, rasgele(-10, 10), rasgele(-10, 10));
});

dinle('tirmiklandi', ({ x, y, dx, dy, disari }) => {
  const boy = Math.hypot(dx, dy) || 1;
  const ux = dx / boy;
  const uy = dy / boy;
  const yon = Math.atan2(uy, ux);
  const n = az(5);
  for (let k = 0; k < n; k++) {
    const yan = rasgele(-1, 1) * TIRMIK_YARICAP * OLCEK;
    copEkle(piksel(x) - uy * yan, piksel(y) + ux * yan, yon + rasgele(-0.5, 0.5),
      rasgele(80, 170), rasgele(20, 80), rasgele(0.5, 0.9));
  }
  for (let k = 0; k < az(disari > 0 ? 4 : 2); k++) {
    tozEkle(piksel(x) + rasgele(-8, 8), piksel(y) + rasgele(-8, 8), ux * rasgele(20, 50),
      uy * rasgele(20, 50), rasgele(8, 16));
  }
});

dinle('dedektor', ({ x, y, seviye }) => {
  const sira = Math.max(0, SEVIYELER.indexOf(seviye));
  const renk = rgb(seviye.renk);
  efektEkle({ tur: 'dalga', x: piksel(x), y: piksel(y), bas: simdi(), sure: 1500, renk,
    sicak: sira < 3, halkaSayisi: 4 - Math.min(2, sira), menzil: 34 + (3 - sira) * 10 });
  for (let k = 0; k < az(4 + (3 - sira) * 4); k++) kivilcimEkle(piksel(x), piksel(y), 50, renk);
  if (sira === 0) sars(3);
});

dinle('dedektor-bos', ({ x, y }) => {
  for (let k = 0; k < az(4); k++) {
    tozEkle(piksel(x), piksel(y), rasgele(-25, 25), rasgele(-25, 25), 8);
  }
});

dinle('igne-gorundu', ({ x, y }) => {
  efektEkle({ tur: 'parlama', x: piksel(x), y: piksel(y), bas: simdi(), sure: 1300, boy: 26,
    halkali: true });
  for (let k = 0; k < az(14); k++) kivilcimEkle(piksel(x), piksel(y), rasgele(20, 70));
});

dinle('parilti', ({ x, y }) => {
  efektEkle({ tur: 'parlama', x: piksel(x), y: piksel(y), bas: simdi(), sure: 900, boy: 18 });
  for (let k = 0; k < az(5); k++) kivilcimEkle(piksel(x), piksel(y), rasgele(10, 35));
});

dinle('pes-edildi', ({ durum }) => {
  const { igne } = durum.tarla;
  efektEkle({ tur: 'isaret', x: piksel(igne.x), y: piksel(igne.y), bas: simdi(), sure: 4000 });
});

dinle('bulundu', () => {
  const { igne } = durumAl().tarla;
  const px = piksel(igne.x);
  const py = piksel(igne.y);
  bulmaBaslat(igne, simdi());
  for (let k = 0; k < az(70); k++) {
    copEkle(px, py, rasgele(0, Math.PI * 2), rasgele(40, 170), rasgele(110, 230),
      rasgele(0.9, 1.6));
  }
  for (let k = 0; k < az(40); k++) kivilcimEkle(px, py, rasgele(30, 140));
  sars(4);
});

dinle('oyun-basladi', () => {
  hepsiniSil();
  efektleriSil();
  bulmaSifirla();
});

/** Açıkta duran iğnenin üstünde arada bir gezinen küçük ışıltı. */
function igneParlat(ctx, durum, zaman) {
  if (!durum.gorundu || durum.bitti || igneDerinligi(durum.tarla) !== 0) return;
  const evre = (zaman % 2200) / 700;
  if (evre >= 1) return;
  const { igne } = durum.tarla;
  const m = ctx.getTransform();
  const eb = 1 / Math.hypot(m.a, m.b);
  // Sade harekette ışıltı iğne boyunca kaymaz ve dönmez, daha sönük yanar.
  const k = sade.matches ? 0 : (evre * 2 - 1) * igneYariBoyu(eb) * 0.85;
  const a = Math.sin(Math.PI * evre) * (sade.matches ? 0.35 : 0.9);
  yildizIsigi(ctx, piksel(igne.x) + Math.cos(igne.aci) * k, piksel(igne.y)
    + Math.sin(igne.aci) * k, 13 * eb, a, sade.matches ? 0 : zaman / 500);
}

katmanEkle((ctx) => {
  ortamCiz(ctx);
  yamaAl(ctx);
}, 'alt');

katmanEkle((ctx, durum, zaman) => {
  const dt = sonZaman === null ? 0 : Math.min(0.05, Math.max(0, zaman - sonZaman) / 1000);
  sonZaman = zaman;
  guncelle(dt);
  efektleriCiz(ctx, zaman);
  igneParlat(ctx, durum, zaman);
  bulmaCiz(ctx, zaman, !sade.matches);
  parcaciklariCiz(ctx);
}, 'ust');

stilEkle();
