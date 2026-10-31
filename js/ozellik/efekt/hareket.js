/**
 * Hareket efektleri: yürürken ayak altından saman çöpü/toz ve yüksek samanda solan ayak
 * izi; makine sürerken arka tekerlek tozu ve solan tekerlek izi; çalışırken traktör
 * kepçesinden saman savrulması, balya makinesi tamburundan çöp, üfleyici konisinde ileri
 * uçuşan çöp bulutu (ufleme olayı). Egzoz dumanı makine çiziminde zaten var. İzler yalnız
 * çizim katmanında yaşar; parçacık sınırı parcacik.js'te (AZAMI), sade harekette azalır.
 */
import { dinle } from '../../olaylar.js';
import { katmanEkle, OLCEK } from '../../cizim.js';
import { durumAl } from '../../oyun.js';
import { makineTanimi } from '../../kural/makineler/kayit.js';
import { hizSinirlayici } from '../ses-desen.js';
import { sade, az, rasgele, copEkle, tozEkle } from './uretim.js';
import {
  adimEfekti, arkaTekerlekler, ayakKaymasi, dunyaNoktasi, koniNoktasi, tozHizi, uretimAdimi,
} from './hareket-desen.js';
import { izEkle, izleriCiz, izleriSil } from './iz.js';

const IZ_ARALIK = 1.1; // tekerlek izi: bu kadar hücre yolda bir
const birikim = new WeakMap(); // makine -> parçacık üretim birikimi
const sonIz = new WeakMap(); // makine -> son iz bırakılan konum
let zaman = 0;
let sonKare = null;
let adimSirasi = 0;

const savurmaIzni = hizSinirlayici(50);
const uflemeIzni = hizSinirlayici(40);

function ayakEfekti({ x, y, z }) {
  const d = adimEfekti(z);
  const yon = durumAl().karakter.yon;
  const px = x * OLCEK;
  const py = y * OLCEK;
  const geri = yon + Math.PI;
  for (let k = 0; k < az(d.adet); k++) {
    if (d.tur === 'saman') {
      copEkle(px + rasgele(-3, 3), py + rasgele(-3, 3), geri + rasgele(-0.9, 0.9),
        rasgele(15, 50), rasgele(25, 70), rasgele(0.4, 0.8));
    } else {
      tozEkle(px, py, Math.cos(geri) * rasgele(4, 14), Math.sin(geri) * rasgele(4, 14),
        rasgele(4, 7));
    }
  }
  if (!d.iz) return;
  const kayma = ayakKaymasi(yon, adimSirasi++);
  izEkle({
    x: px + kayma.x * OLCEK, y: py + kayma.y * OLCEK, aci: yon, uzun: OLCEK * 0.9,
    en: OLCEK * 0.55, bas: zaman, omur: sade.matches ? 600 : 1500, alfa: d.izAlfa,
    renk: '70, 46, 18',
  });
}

/** Arka tekerleklerden toz (yüksek samanda saman çöpü karışır). */
function tekerlekTozu(m, t, dt) {
  const hz = az(tozHizi(m.hiz, t.azamiHiz));
  const u = uretimAdimi(birikim.get(m) || 0, m.takili ? 0 : hz, dt);
  birikim.set(m, u.birikim);
  const tekerlekler = arkaTekerlekler(t.boy, t.en);
  const geri = m.yon + (m.hiz > 0 ? Math.PI : 0);
  for (let k = 0; k < u.n; k++) {
    const [ileri, yan] = tekerlekler[k % 2];
    const n = dunyaNoktasi(m, ileri, yan);
    const sp = Math.min(Math.abs(m.hiz), 20);
    if ((m.z || 0) > 4 && Math.random() < 0.4) {
      copEkle(n.x * OLCEK, n.y * OLCEK, geri + rasgele(-0.8, 0.8), rasgele(10, 12) + sp * 2,
        rasgele(20, 60), rasgele(0.4, 0.8));
    } else {
      tozEkle(n.x * OLCEK, n.y * OLCEK, Math.cos(geri) * sp * 1.5 + rasgele(-6, 6),
        Math.sin(geri) * sp * 1.5 + rasgele(-6, 6), rasgele(5, 9));
    }
  }
}

/** Her IZ_ARALIK hücrede arka tekerlek izi bırakır. */
function tekerlekIzi(m, t) {
  const son = sonIz.get(m);
  if (!son || Math.hypot(m.x - son.x, m.y - son.y) > 6) {
    sonIz.set(m, { x: m.x, y: m.y });
    return;
  }
  if (Math.hypot(m.x - son.x, m.y - son.y) < IZ_ARALIK) return;
  sonIz.set(m, { x: m.x, y: m.y });
  const derin = (m.z || 0) > 25;
  for (const [ileri, yan] of arkaTekerlekler(t.boy, t.en)) {
    const n = dunyaNoktasi(m, ileri, yan);
    izEkle({
      x: n.x * OLCEK, y: n.y * OLCEK, aci: m.yon, uzun: OLCEK * (IZ_ARALIK + 0.4),
      en: OLCEK * 0.5, bas: zaman, omur: sade.matches ? 1500 : 3500,
      alfa: derin ? 0.16 : 0.3, renk: '48, 30, 12',
    });
  }
}

/** Balya makinesi çalışırken tamburdan çöp fırlar. */
function tamburCopu(m, t, dt) {
  const p = t.isNoktasi(m);
  const u = uretimAdimi(birikim.get(m) || 0, az(22), dt);
  birikim.set(m, u.birikim);
  for (let k = 0; k < u.n; k++) {
    const yan = m.yon + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    copEkle((p.x + 0.5) * OLCEK + rasgele(-4, 4), (p.y + 0.5) * OLCEK + rasgele(-4, 4),
      yan + rasgele(-0.6, 0.6), rasgele(40, 100), rasgele(60, 140), rasgele(0.5, 0.9));
  }
}

function makineKaresi(m, dt) {
  const t = makineTanimi(m.tur);
  if (m.tur !== 'ufleyici' && Math.abs(m.hiz) > 1) {
    tekerlekTozu(m, t, dt);
    tekerlekIzi(m, t);
  } else {
    birikim.delete(m);
  }
  if (m.tur === 'balya' && m.calisiyor && m.yakit > 0) tamburCopu(m, t, dt);
}

/** Traktör kepçesinden saman savrulur (iş aygıtı bu karede saman aldıysa). */
function kepceSavur({ makine, miktar }) {
  if (makine.tur !== 'traktor' || !savurmaIzni(performance.now())) return;
  const p = makineTanimi(makine.tur).isNoktasi(makine);
  const n = az(Math.min(4, 1 + Math.floor(miktar / 40)));
  for (let k = 0; k < n; k++) {
    copEkle((p.x + 0.5) * OLCEK + rasgele(-6, 6), (p.y + 0.5) * OLCEK + rasgele(-6, 6),
      makine.yon + rasgele(-0.9, 0.9), rasgele(40, 110), rasgele(90, 200), rasgele(0.6, 1.0));
  }
}

/** Üfleyici konisi: çıkış noktasından yönde ileri uçuşan çöp ve toz bulutu. */
function uflemeBulutu({ x, y, yon, menzil }) {
  if (!uflemeIzni(performance.now())) return;
  const m = durumAl().karakter.makine;
  const kok = m && m.tur === 'ufleyici'
    ? makineTanimi('ufleyici').isNoktasi(m) : { x, y }; // hücre birimi
  const ox = (kok.x + 0.5) * OLCEK;
  const oy = (kok.y + 0.5) * OLCEK;
  const uzun = Math.min(40, Math.max(2, menzil || 8)) * OLCEK;
  for (let k = 0; k < az(5); k++) {
    const q = koniNoktasi(yon, uzun, Math.random(), Math.random());
    const hiz = q.uzaklik * 2.2; // sürtünmeyle ~uzaklık kadar yol alır
    const aci = Math.atan2(q.dy, q.dx);
    copEkle(ox, oy, aci, hiz, rasgele(15, 60), rasgele(0.45, 0.9));
    if (k % 2 === 0) {
      tozEkle(ox, oy, Math.cos(aci) * hiz * 0.7, Math.sin(aci) * hiz * 0.7, rasgele(7, 13));
    }
  }
}

dinle('karakter-adim', ayakEfekti);
dinle('makine-calisti', kepceSavur);
dinle('ufleme', uflemeBulutu);
dinle('kepce-bosaltildi', ({ x, y, miktar }) => {
  const n = az(Math.min(26, 8 + Math.floor(miktar / 300)));
  for (let k = 0; k < n; k++) {
    copEkle((x + 0.5) * OLCEK + rasgele(-5, 5), (y + 0.5) * OLCEK + rasgele(-5, 5),
      rasgele(0, Math.PI * 2), rasgele(15, 70), rasgele(60, 160), rasgele(0.7, 1.3));
  }
});
dinle('kare', ({ zaman: t, durum }) => {
  const dt = sonKare === null ? 0 : Math.min(0.05, Math.max(0, t - sonKare) / 1000);
  sonKare = t;
  zaman = t;
  for (const m of durum.makineler) makineKaresi(m, dt);
});
dinle('oyun-basladi', izleriSil);

katmanEkle((ctx, durum, t) => izleriCiz(ctx, t), 'alt');
