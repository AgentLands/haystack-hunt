/**
 * Öğretici nesneleri (docs/ciftlik/README.md "İlk 10 dakika", esyalar.md §4): normal gömülü
 * dağılımından ayrı SABİT ÇİZELGE. İlk kurulan emici huni (en küçük id) görülünce saat
 * başlar (`c.ogretici.kurTik`); 8 paslı çivi ilk ≈ 2:10 sonra, 30 sn arayla ağzın içine/
 * yakınına sığ gömülür (h ≥ 12, z = h − ortu ≥ h − 12; çayıra değil) ve huni onları birkaç
 * saniyede açığa çıkarır; "ilk iğne" ağzın 2-4 karo ötesine sığ gömülür ve yığın akarken
 * huninin çukuruna yuvarlanır (4-8. dakika). Huni yoksa ya da uygun hücre yoksa nesne
 * bekler (her 20 tikte yeniden denenir). Hepsi gerçek gömülü nesnedir (`ogretici: true`).
 */
import { GENISLIK, YUKSEKLIK } from '../../boyut.js';
import { KARO, tersYon } from '../olcu.js';
import { esyaKodu } from '../esya.js';
import { asamaTanimla } from '../benzetim.js';
import { kayitAlaniTanimla } from '../sakla.js';
import { ZEMIN, hucreZemini } from './zemin.js';
import { gomuluEkle } from './gomulu.js';

/**
 * Çizelge (tik, huni kurulumundan): ilkCivi + k × civiAralik (k < civi); igne. Uzaklıklar
 * ağız dikdörtgeninden hücre (Chebyshev); ortu: nesnenin üstündeki saman katı.
 */
export const OGRETICI = Object.freeze({
  civi: 8, ilkCivi: 2600, civiAralik: 600, civiUzak: [0, 3], civiOrtu: 4,
  igne: 1200, igneUzak: [4, 8], igneOrtu: 10, enAzH: 12, yeniden: 20,
});

/** Huni ağzı: çıkışın (p.yon) karşı kenarına bitişik karolar ([[kx, ky]...]; parça dışı). */
export function agizKarolari(p) {
  const d = tersYon(p.yon);
  const liste = [];
  if (d === 0 || d === 2) {
    const kx = d === 0 ? p.x + p.en : p.x - 1;
    for (let ky = p.y; ky < p.y + p.boy; ky++) liste.push([kx, ky]);
  } else {
    const ky = d === 1 ? p.y + p.boy : p.y - 1;
    for (let kx = p.x; kx < p.x + p.en; kx++) liste.push([kx, ky]);
  }
  return liste;
}

/** Ağız dikdörtgeni (hücre, [x0, x1) × [y0, y1)). */
function agizKutusu(p) {
  const k = agizKarolari(p);
  const xs = k.map(([x]) => x);
  const ys = k.map(([, y]) => y);
  return {
    x0: Math.min(...xs) * KARO, x1: (Math.max(...xs) + 1) * KARO,
    y0: Math.min(...ys) * KARO, y1: (Math.max(...ys) + 1) * KARO,
  };
}

/**
 * Ağız kutusundan [ic, dis] hücre uzaklıktaki (Chebyshev), taban olmayan, h ≥ enAzH,
 * (cayirOlmaz ise) harman hücrelerinden ağıza en yakını (eşitlikte küçük indeks); yoksa null.
 */
export function ogreticiYeri(c, tarla, p, [ic, dis], cayirOlmaz) {
  const a = agizKutusu(p);
  let en = null;
  for (let y = Math.max(0, a.y0 - dis); y < Math.min(YUKSEKLIK, a.y1 + dis); y++) {
    for (let x = Math.max(0, a.x0 - dis); x < Math.min(GENISLIK, a.x1 + dis); x++) {
      const d = Math.max(a.x0 - x, x - a.x1 + 1, a.y0 - y, y - a.y1 + 1, 0);
      const i = y * GENISLIK + x;
      if (d < ic || d > dis || c.izgara.taban[i] || tarla.h[i] < OGRETICI.enAzH) continue;
      if (cayirOlmaz && hucreZemini(c, x, y) !== ZEMIN.HARMAN) continue;
      if (!en || d < en.d) en = { x, y, d };
    }
  }
  return en;
}

const huniler = (c) => [...c.parcalar.values()].filter((p) => p.tanim.anahtar === 'huni');

/** Bir öğretici nesnesini ilk uygun huninin yanına gömer; olduysa true. */
function yerlestir(ctx, ad, uzak, ortu, cayirOlmaz) {
  const { c, tarla } = ctx;
  for (const p of huniler(c)) {
    const yer = ogreticiYeri(c, tarla, p, uzak, cayirOlmaz);
    if (!yer) continue;
    const h = tarla.h[yer.y * GENISLIK + yer.x];
    const g = { esya: esyaKodu(ad), x: yer.x, y: yer.y, z: h - ortu, aci: 0, alindi: false,
      ogretici: true };
    gomuluEkle(c, [g], ctx.olay);
    return true;
  }
  return false;
}

const yeniDurum = () => ({ kurTik: -1, civi: 0, igne: 0 });

/** Sıradaki nesne vakti geldiyse (ve yeniden deneme anıysa) yerleştirir. */
export function ogreticiAdim(ctx) {
  const o = ctx.c.ogretici;
  if (!o || o.kurTik < 0 || (o.civi >= OGRETICI.civi && o.igne)) return;
  const gecen = ctx.tik - o.kurTik;
  const vakit = (t) => gecen >= t && (gecen - t) % OGRETICI.yeniden === 0;
  if (!o.igne && vakit(OGRETICI.igne)
    && yerlestir(ctx, 'igne', OGRETICI.igneUzak, OGRETICI.igneOrtu, false)) o.igne = 1;
  const civiVakti = OGRETICI.ilkCivi + OGRETICI.civiAralik * o.civi;
  if (o.civi < OGRETICI.civi && vakit(civiVakti)
    && yerlestir(ctx, 'civi', OGRETICI.civiUzak, OGRETICI.civiOrtu, true)) o.civi += 1;
}

asamaTanimla('ogretici', 66, {
  adim: ogreticiAdim,
  yenidenKur(c) {
    c.ogretici ??= yeniDurum();
    if (c.ogretici.kurTik < 0 && huniler(c).length) c.ogretici.kurTik = c.tik;
  },
});

kayitAlaniTanimla('ogretici', {
  kodla: (c) => ({ ...(c.ogretici ?? yeniDurum()) }),
  coz(c, v) {
    c.ogretici = v ? { ...yeniDurum(), ...v } : yeniDurum();
  },
});
