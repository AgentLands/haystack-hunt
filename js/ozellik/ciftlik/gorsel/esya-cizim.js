/**
 * Bant üzerindeki eşyaların toplu çizimi. Her eşya türü bir kez, ekran ölçeğinde küçük bir
 * tuvale (atlas hücresi) çizilir; ölçek %2'den çok değişince yenilenir. Her eşya tek
 * drawImage. Ekranda eşya 4 pikselden küçükse (uzak görünüm) tür rengine göre tek yol ve
 * renk başına tek fill. Görünür alanın dışındaki hatlar (sınır kutusu) atlanır.
 * Konum: pos + hiz × alfa (öndekine ARALIK'tan çok yaklaşmaz), karo girişinden merkeze,
 * merkezden çıkış yönüne (dönemeç kendiliğinden kıvrılır).
 */
import { ARALIK, DX, DY, KARO_EN } from '../../../kural/ciftlik/olcu.js';
import { esyaTanimi } from '../../../kural/ciftlik/esya.js';
import { hatKonumu } from '../../../kural/ciftlik/tasima/hat.js';
import { ekranBirim } from '../../../cizim/tuval-olcek.js';
import { KARO_PX, esyaCizimi } from './kayit.js';

/** Eşyanın yarıçapı (dünya pikseli). */
export const ESYA_R = 2.6;
const atlas = new Map();
const kutular = new WeakMap();

function sprite(kod, s) {
  let a = atlas.get(kod);
  if (a && Math.abs(a.s - s) <= a.s * 0.02) return a;
  const kenar = Math.max(2, Math.ceil(ESYA_R * 2.4 * s));
  const tuval = a?.tuval ?? document.createElement('canvas');
  tuval.width = kenar;
  tuval.height = kenar;
  const ctx = tuval.getContext('2d');
  ctx.setTransform(s, 0, 0, s, kenar / 2, kenar / 2);
  esyaCizimi(kod)(ctx, ESYA_R, ekranBirim(ctx));
  a = { tuval, s, boy: kenar / s };
  atlas.set(kod, a);
  return a;
}

/** Hattın karo sınır kutusu (önbellekli; hat nesnesi topolojiyle değişir). */
function hatKutusu(h) {
  let k = kutular.get(h);
  if (k) return k;
  k = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const karo of h.karolar) {
    const x = karo % KARO_EN;
    const y = (karo / KARO_EN) | 0;
    k = { x0: Math.min(k.x0, x), y0: Math.min(k.y0, y), x1: Math.max(k.x1, x),
      y1: Math.max(k.y1, y) };
  }
  kutular.set(h, k);
  return k;
}

/** Hattaki pos'un dünya pikseli konumu. */
export function esyaKonumu(h, pos) {
  const { sira, ic } = hatKonumu(h, pos);
  const karo = h.karolar[sira];
  const uzun = h.ofset[sira + 1] - h.ofset[sira];
  const t = Math.min(1, ic / uzun);
  const cx = (karo % KARO_EN) * KARO_PX + KARO_PX / 2;
  const cy = ((karo / KARO_EN) | 0) * KARO_PX + KARO_PX / 2;
  const d = t < 0.5 ? h.girisYon[sira] : h.yonler[sira];
  const m = (t - 0.5) * KARO_PX; // sanal (uzun) karoda da tek karo boyunda gösterilir
  return { x: cx + DX[d] * m, y: cy + DY[d] * m };
}

/**
 * Görünür hatlardaki eşyaları çizer. alan: karo dikdörtgeni, s: arka bellek ölçeği,
 * alfa: iki tik arası kesir. Dönüş: çizilen eşya sayısı.
 */
export function esyalariCiz(ctx, c, alan, s, alfa) {
  const kucuk = ESYA_R * 2 * s < 4;
  const renkler = kucuk ? new Map() : null;
  let sayi = 0;
  for (const h of c.hatlar) {
    if (!h.n) continue;
    const k = hatKutusu(h);
    if (k.x1 < alan.kx0 || k.y1 < alan.ky0 || k.x0 > alan.kx1 || k.y0 > alan.ky1) continue;
    let sinir = h.uzun;
    const ilerle = h.etkin ? h.hiz * alfa : 0;
    for (let i = 0; i < h.n; i++) {
      const pos = Math.min(h.pos[i] + ilerle, sinir);
      sinir = pos - ARALIK;
      const { x, y } = esyaKonumu(h, pos);
      sayi += 1;
      if (kucuk) {
        const renk = esyaTanimi(h.tur[i])?.renk ?? '#b9a27a';
        if (!renkler.has(renk)) renkler.set(renk, new Path2D());
        renkler.get(renk).rect(x - ESYA_R, y - ESYA_R, ESYA_R * 2, ESYA_R * 2);
        continue;
      }
      const a = sprite(h.tur[i], s);
      ctx.drawImage(a.tuval, x - a.boy / 2, y - a.boy / 2, a.boy, a.boy);
    }
  }
  if (renkler) {
    for (const [renk, yol] of renkler) {
      ctx.fillStyle = renk;
      ctx.fill(yol);
    }
  }
  return sayi;
}
