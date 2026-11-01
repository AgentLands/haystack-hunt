/**
 * Çiftlik çizim katmanları (yalnız durum.mod === 'ciftlik' iken). 'alt' (tarladan sonra,
 * karakter ve makinelerden önce): bölge önbelleğinden parça gövdeleri, görünür parçaların
 * hareketli kısımları (bölge dizininden; bant çıtaları, huni, sandık doluluğu), bant
 * eşyaları. 'ust': hava (bulut gölgesi, yağmur, zerre), akış katmanı (F), durum rozetleri,
 * inşa önizlemesi. Görünür alan dışı ayıklanır.
 * Ölçüm (ciftlikOlcum): ms = son karenin bütün çiftlik çizimi (alt + ust), alt, ust, esya
 * (çizilen eşya), parca (hareketli çizilen parça), rozet; ornekler dizisi verilirse her
 * karenin ms'si eklenir (ölçüm betiği).
 * Kısayol: F akış katmanını açar/kapatır (yalnız çiftlikte; yazı alanında değil).
 */
import { katmanEkle } from '../../../cizim.js';
import { gorunum } from '../../../gorunum.js';
import { gorunurAlan } from '../../../kural/gorunum.js';
import { KARO, TIK_MS, BIRIM } from '../../../kural/ciftlik/olcu.js';
import { sadeHareket } from '../../sade-hareket.js';
import { bildir } from '../../../arayuz.js';
import { durumAl } from '../../../oyun.js';
import { KARO_PX, parcaCizimi } from './kayit.js';
import { bolgeleriCiz, bolgeKirlet, gorunurParcalar } from './bolge.js';
import { esyalariCiz } from './esya-cizim.js';
import { onizlemeCiz } from './onizleme.js';
import { havaCiz } from './hava.js';
import { rozetleriCiz } from './rozet.js';
import { akisCiz, akisAcik, akisDegistir } from './akis.js';
import { ekranBirim } from '../../../cizim/tuval-olcek.js';
import { dinle } from '../../../olaylar.js';
import './bant.js';
import './esya-atlas.js';
import './temel.js';
import './toplama.js';
import './tasima.js';
import './ayiklama.js';
import './isleme.js';
import './depo-kol.js';
import './enerji.js';
import './mantik.js';

export const ciftlikOlcum = {
  ms: 0, alt: 0, ust: 0, esya: 0, parca: 0, rozet: 0, ornekler: null,
};

/** Görünür alan (karo, 1 karo payla). */
function karoAlani(a) {
  return {
    kx0: Math.floor(a.x / KARO) - 1, ky0: Math.floor(a.y / KARO) - 1,
    kx1: Math.ceil((a.x + a.en) / KARO) + 1, ky1: Math.ceil((a.y + a.boy) / KARO) + 1,
  };
}

/** Kare içi toplu yollar (an.dolgu / an.cizgi): anahtar → { renk, kalin, yol }. */
const topluYollar = new Map();
function topluYol(renk, kalin) {
  const anahtar = `${renk}|${kalin}`;
  let t = topluYollar.get(anahtar);
  if (!t) {
    t = { renk, kalin, yol: new Path2D() };
    topluYollar.set(anahtar, t);
  }
  return t.yol;
}
const dolgu = (renk) => topluYol(renk, 0);
const cizgi = (renk, kalin) => topluYol(renk, kalin);

function hareketlileriCiz(ctx, c, alan, an) {
  const eb = ekranBirim(ctx);
  const sade = sadeHareket();
  let n = 0;
  gorunurParcalar(c, alan, (p) => {
    const ciz = parcaCizimi(p.tanim.anahtar).hareketli;
    if (!ciz) return;
    an.faz = p.tanim.hat && !sade ? (((an.tik + an.alfa) * p.tanim.hat.hiz) / BIRIM) * KARO_PX : 0;
    ciz(ctx, p, an, eb);
    n += 1;
  });
  for (const t of topluYollar.values()) {
    if (t.kalin) {
      ctx.strokeStyle = t.renk;
      ctx.lineWidth = t.kalin;
      ctx.stroke(t.yol);
    } else {
      ctx.fillStyle = t.renk;
      ctx.fill(t.yol);
    }
  }
  topluYollar.clear();
  return n;
}

katmanEkle((ctx, durum, zaman) => {
  if (durum.mod !== 'ciftlik') return;
  const bas = performance.now();
  const c = durum.ciftlik;
  const t = ctx.getTransform();
  const s = Math.hypot(t.a, t.b);
  const alan = karoAlani(gorunurAlan(gorunum));
  const alfa = Math.max(0, Math.min(1, durum.tikBirikim / TIK_MS));
  bolgeleriCiz(ctx, c, alan, s);
  const an = { zaman, tik: c.tik, alfa, faz: 0, c, dolgu, cizgi };
  ciftlikOlcum.parca = hareketlileriCiz(ctx, c, alan, an);
  ciftlikOlcum.esya = esyalariCiz(ctx, c, alan, s, alfa);
  ciftlikOlcum.alt = performance.now() - bas;
}, 'alt');

katmanEkle((ctx, durum, zaman) => {
  if (durum.mod !== 'ciftlik') return;
  const bas = performance.now();
  const c = durum.ciftlik;
  const eb = ekranBirim(ctx);
  const a = gorunurAlan(gorunum);
  const alan = karoAlani(a);
  havaCiz(ctx, c, a, eb, zaman);
  akisCiz(ctx, c, alan, eb);
  ciftlikOlcum.rozet = rozetleriCiz(ctx, c, alan, eb, akisAcik());
  onizlemeCiz(ctx, durum, zaman);
  ciftlikOlcum.ust = performance.now() - bas;
  ciftlikOlcum.ms = ciftlikOlcum.alt + ciftlikOlcum.ust;
  ciftlikOlcum.ornekler?.push(ciftlikOlcum.ms);
}, 'ust');

for (const ad of ['parca-kuruldu', 'parca-sokuldu', 'parca-dondu']) {
  dinle(ad, ({ parca: p }) => bolgeKirlet(p.x, p.y, Math.max(p.en, p.boy), Math.max(p.en, p.boy)));
}

document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.('input, textarea, select, dialog')) return;
  if (durumAl()?.mod !== 'ciftlik') return;
  bildir(akisDegistir() ? 'Akış katmanı açık (F)' : 'Akış katmanı kapalı (F)', 1400);
});
