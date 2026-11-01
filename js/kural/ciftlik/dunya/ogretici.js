/**
 * Öğretici nesneleri (docs/ciftlik/README.md "İlk 10 dakika", esyalar.md §4): normal gömülü
 * dağılımından ayrı SABİT ÇİZELGE. İlk kurulan emici huni (en küçük id) görülünce saat
 * başlar (`c.ogretici.kurTik`); 8 paslı çivi ilk 2:10 sonra 30 sn arayla, "ilk iğne" 4:30
 * sonra o huninin AĞZINA konur (en yüksek ağız hücresi, z = h − ortu: yüzeyde; çivi
 * çayıra değil) ve huni onu sonraki tik çıkarır (tamponu doluysa saman örtebilir).
 * Neden ağız: yığın ESIK 3 eğiminde durur; ağzın birkaç hücre ötesi, koni bittikten sonra
 * hiç kazılmaz (ölçüldü), çizelge kaçardı. Huni yoksa ya da ağzı tümüyle kapalıysa nesne
 * bekler (her 20 tikte yeniden).
 * Hepsi gerçek gömülü nesnedir (`ogretici: true`); hayalet yeri: ogreticiHuniYeri.
 */
import { GENISLIK } from '../../boyut.js';
import { KARO, KARO_EN, KARO_BOY, tersYon } from '../olcu.js';
import { parcaTanimi, parcaOrnegi } from '../parca-kayit.js';
import { yerlestirmeEngeli } from '../izgara.js';
import { karoHucreleri } from '../saman.js';
import { esyaKodu } from '../esya.js';
import { asamaTanimla } from '../benzetim.js';
import { kayitAlaniTanimla } from '../sakla.js';
import { ZEMIN, hucreZemini } from './zemin.js';
import { gomuluEkle } from './gomulu.js';

/** Çizelge (tik, huni kurulumundan): ilkCivi + k × civiAralik (k < civi); igne. */
export const OGRETICI = Object.freeze({
  civi: 8, ilkCivi: 2600, civiAralik: 600, igne: 5400, ortu: 0, enAzH: 12, yeniden: 20,
  kapiPay: 2, onDerin: 16, onYan: 6, enAzHacim: 8000,
});

/**
 * Ağzın önündeki yığın hacmi (kat): ağız yönünde onDerin hücre derinlik, ağız genişliği ±
 * onYan hücre. Öğretici huni yığının ince kuyruğuna değil gövdesine baksın (tek huni ilk
 * damgalar boyunca aç kalmasın).
 */
function onHacim(tarla, p) {
  const d = tersYon(p.yon);
  const [x0, y0, x1, y1] = [p.x * KARO, p.y * KARO, (p.x + p.en) * KARO, (p.y + p.boy) * KARO];
  const { onDerin: D, onYan: Y } = OGRETICI;
  const kutu = [[x1, y0 - Y, x1 + D, y1 + Y], [x0 - Y, y1, x1 + Y, y1 + D],
    [x0 - D, y0 - Y, x0, y1 + Y], [x0 - Y, y0 - D, x1 + Y, y0]][d];
  let n = 0;
  for (let y = Math.max(0, kutu[1]); y < Math.min(160, kutu[3]); y++) {
    for (let x = Math.max(0, kutu[0]); x < Math.min(GENISLIK, kutu[2]); x++) {
      n += tarla.h[y * GENISLIK + x];
    }
  }
  return n;
}

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

/** Ağzın en yüksek (eşitlikte ilk) uygun hücresi ya da null. */
export function agizYeri(c, tarla, p, cayirOlmaz) {
  let en = -1;
  for (const i of karoHucreleri(c, agizKarolari(p))) {
    if (cayirOlmaz && hucreZemini(c, i % GENISLIK, (i / GENISLIK) | 0) !== ZEMIN.HARMAN) continue;
    if (en < 0 || tarla.h[i] > tarla.h[en]) en = i;
  }
  return en < 0 ? null : { x: en % GENISLIK, y: (en / GENISLIK) | 0 };
}

/**
 * Öğretici huni hayaletinin yeri (J · öğretici gösterir): kurulabilir, harmanda, ağzında
 * saman (en yüksek ağız hücresi ≥ enAzH), ağzının önünde yığın gövdesi (onHacim ≥ enAzHacim;
 * böyle yer yoksa bu koşulsuz), çıkışının önüne bant kurulabilen ve Komşu kapısına (kapiPay
 * karo dışında) en yakın { x, y, yon }; kapı yoksa ızgara ortasına en yakın. Yoksa null.
 */
export function ogreticiHuniYeri(c, tarla) {
  return huniYeriAra(c, tarla, OGRETICI.enAzHacim) ?? huniYeriAra(c, tarla, 0);
}

function huniYeriAra(c, tarla, enAzHacim) {
  const tanim = parcaTanimi('huni');
  const bant = parcaTanimi('bant');
  const kapi = c.arazi?.kapi ?? { x: KARO_EN / 2 - 1, y: KARO_BOY / 2 - 1, en: 0, boy: 0 };
  const pay = OGRETICI.kapiPay;
  let en = null;
  for (let y = 1; y < KARO_BOY - 2; y++) {
    for (let x = 1; x < KARO_EN - 2; x++) {
      const d = (x - kapi.x) ** 2 + (y - kapi.y) ** 2;
      if ((en && d >= en.d) || hucreZemini(c, x * KARO, y * KARO) !== ZEMIN.HARMAN) continue;
      if (x + 2 + pay > kapi.x && x < kapi.x + kapi.en + pay && y + 2 + pay > kapi.y
        && y < kapi.y + kapi.boy + pay) continue;
      for (let yon = 0; yon < 4; yon++) {
        const p = parcaOrnegi(tanim, 0, x, y, yon);
        let tepe = 0;
        for (const i of karoHucreleri(c, agizKarolari(p))) tepe = Math.max(tepe, tarla.h[i]);
        if (tepe < OGRETICI.enAzH || yerlestirmeEngeli(c, tarla, tanim, x, y, yon)) continue;
        if (enAzHacim && onHacim(tarla, p) < enAzHacim) continue;
        const { hx, hy } = p.cikis[0];
        if (yerlestirmeEngeli(c, tarla, bant, hx, hy, yon)) continue;
        en = { x, y, yon, d };
        break;
      }
    }
  }
  return en && { x: en.x, y: en.y, yon: en.yon };
}

const huniler = (c) => [...c.parcalar.values()].filter((p) => p.tanim.anahtar === 'huni');

/** Bir öğretici nesnesini ilk uygun huninin ağzına gömer; olduysa true. */
function yerlestir(ctx, ad, cayirOlmaz) {
  const { c, tarla } = ctx;
  for (const p of huniler(c)) {
    const yer = agizYeri(c, tarla, p, cayirOlmaz);
    if (!yer) continue;
    const h = tarla.h[yer.y * GENISLIK + yer.x];
    const g = { esya: esyaKodu(ad), x: yer.x, y: yer.y, z: Math.max(0, h - OGRETICI.ortu),
      aci: 0, alindi: false, ogretici: true };
    gomuluEkle(c, [g], ctx.olay);
    return true;
  }
  return false;
}

const yeniDurum = () => ({ kurTik: -1, civi: 0, igne: 0 });

/** Sıradaki nesnenin vakti geldiyse (ve yeniden deneme anıysa) yerleştirir. */
export function ogreticiAdim(ctx) {
  const o = ctx.c.ogretici;
  if (!o || o.kurTik < 0 || (o.civi >= OGRETICI.civi && o.igne)) return;
  const gecen = ctx.tik - o.kurTik;
  const vakit = (t) => gecen >= t && (gecen - t) % OGRETICI.yeniden === 0;
  if (!o.igne && vakit(OGRETICI.igne) && yerlestir(ctx, 'igne', false)) o.igne = 1;
  const civiVakti = OGRETICI.ilkCivi + OGRETICI.civiAralik * o.civi;
  if (o.civi < OGRETICI.civi && vakit(civiVakti) && yerlestir(ctx, 'civi', true)) o.civi += 1;
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
