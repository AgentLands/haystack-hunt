/**
 * Bölge önbelleği: parça gövdeleri (durağan) 16×16 karoluk bölgeler halinde ara tuvallere
 * EKRAN ölçeğinde bir kez çizilir; her kare yalnız görünür bölgelerin tuvali tek drawImage
 * ile basılır. Bölge yenilenir: sürümü artınca (parça kuruldu/söküldü/döndü → bolgeKirlet)
 * ya da ölçek %2'den çok değişince. Kenarı 2048 pikseli aşacak bölge önbelleklenmez,
 * doğrudan çizilir. Görünür alan dışındaki bölgeler hazırlanmaz.
 */
import { KARO_EN, KARO_BOY } from '../../../kural/ciftlik/olcu.js';
import { ekranBirim } from '../../../cizim/tuval-olcek.js';
import { KARO_PX, parcaCizimi } from './kayit.js';

export const BOLGE = 16;
const BOLGE_PX = BOLGE * KARO_PX;
const BX = Math.ceil(KARO_EN / BOLGE);
const BY = Math.ceil(KARO_BOY / BOLGE);
const EN_COK_KENAR = 2048;
const surumler = new Uint32Array(BX * BY);
const onbellek = new Map();
let dunya = null;

/** Ölçüm (ciftlikOlcum): son karede yeniden çizilen bölge sayısı. */
export const bolgeOlcum = { yenilenen: 0 };

/** Karo dikdörtgenine (1 karo payla) değen bölgelerin sürümünü artırır. */
export function bolgeKirlet(kx, ky, en = 1, boy = 1) {
  const x0 = Math.max(0, Math.floor((kx - 1) / BOLGE));
  const y0 = Math.max(0, Math.floor((ky - 1) / BOLGE));
  const x1 = Math.min(BX - 1, Math.floor((kx + en) / BOLGE));
  const y1 = Math.min(BY - 1, Math.floor((ky + boy) / BOLGE));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) surumler[y * BX + x] += 1;
}

/** Bölgeye değen parçaların gövdelerini çizer (ctx dünya dönüşümünde). */
function govdeleriCiz(ctx, c, bx, by) {
  const k0x = bx * BOLGE;
  const k0y = by * BOLGE;
  const eb = ekranBirim(ctx);
  for (const p of c.parcalar.values()) {
    if (p.x + p.en < k0x || p.y + p.boy < k0y || p.x > k0x + BOLGE || p.y > k0y + BOLGE) {
      continue;
    }
    parcaCizimi(p.tanim.anahtar).govde(ctx, p, eb);
  }
}

function hazirla(c, i, s) {
  const bx = i % BX;
  const by = (i / BX) | 0;
  const kenar = Math.ceil(BOLGE_PX * s);
  let k = onbellek.get(i);
  if (!k) {
    k = { tuval: document.createElement('canvas'), surum: -1, s: 0 };
    onbellek.set(i, k);
  }
  if (k.surum === surumler[i] && Math.abs(k.s - s) <= k.s * 0.02) return k;
  k.tuval.width = kenar;
  k.tuval.height = kenar;
  const ctx = k.tuval.getContext('2d');
  ctx.setTransform(s, 0, 0, s, -bx * BOLGE_PX * s, -by * BOLGE_PX * s);
  govdeleriCiz(ctx, c, bx, by);
  Object.assign(k, { surum: surumler[i], s });
  bolgeOlcum.yenilenen += 1;
  return k;
}

/**
 * Görünür karo dikdörtgenindeki bölgeleri çizer. s: dünya pikselinden arka bellek pikseline
 * ölçek (z × ekran.tabanX). Dünya değişince (yeni çiftlik) önbellek boşalır.
 */
export function bolgeleriCiz(ctx, c, alan, s) {
  if (dunya !== c) {
    onbellek.clear();
    surumler.fill(0);
    dunya = c;
  }
  bolgeOlcum.yenilenen = 0;
  const x0 = Math.max(0, Math.floor(alan.kx0 / BOLGE));
  const y0 = Math.max(0, Math.floor(alan.ky0 / BOLGE));
  const x1 = Math.min(BX - 1, Math.floor(alan.kx1 / BOLGE));
  const y1 = Math.min(BY - 1, Math.floor(alan.ky1 / BOLGE));
  for (let by = y0; by <= y1; by++) {
    for (let bx = x0; bx <= x1; bx++) {
      if (BOLGE_PX * s > EN_COK_KENAR) {
        govdeleriCiz(ctx, c, bx, by);
        continue;
      }
      const k = hazirla(c, by * BX + bx, s);
      const boy = k.tuval.width / k.s;
      ctx.drawImage(k.tuval, bx * BOLGE_PX, by * BOLGE_PX, boy, boy);
    }
  }
}
