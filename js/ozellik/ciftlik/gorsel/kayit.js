/**
 * Parça ve eşya çizim kaydı (kural kaydından AYRI: benzetim Node'da çizimsiz koşar).
 *   parcaCizimiTanimla(anahtar, { govde, hareketli })
 *     govde(ctx, p, eb)          durağan gövde; bölge önbelleğine girer (bolge.js), parça
 *                                kurulunca/sökülünce/dönünce yenilenir. Dünya pikseli, karo =
 *                                KARO_PX; (p.x, p.y) sol üst karo, p.en × p.boy, p.yon.
 *     hareketli(ctx, p, an, eb)  her kare (dönen kanat, dolum göstergesi); an: { zaman, tik,
 *                                alfa (0..1, iki tik arası), faz (bant çıtası, dünya pikseli) }
 *   esyaCizimiTanimla(anahtar, ciz(ctx, r, eb))  eşya sprite'ı (0, 0 merkezli, r yarıçap);
 *                                atlasa ekran ölçeğinde bir kez çizilir (esya-cizim.js).
 * Tanımsız parça/eşya için yedek çizim vardır (renkli kutu / renkli nokta): yeni parça
 * kural tarafında eklendiği an görünür, çizimi sonra gelebilir.
 */
import { OLCEK } from '../../../cizim/tuval-olcek.js';
import { KARO } from '../../../kural/ciftlik/olcu.js';
import { esyaTanimi } from '../../../kural/ciftlik/esya.js';

/** Bir karonun dünya pikseli boyu. */
export const KARO_PX = KARO * OLCEK;
export const MUREKKEP = '#2a1a0d';

const parcalar = new Map();
const esyalar = new Map();

export function parcaCizimiTanimla(anahtar, { govde, hareketli = null }) {
  if (typeof govde !== 'function') throw new Error(`parcaCizimiTanimla(${anahtar}): govde yok`);
  parcalar.set(anahtar, { govde, hareketli });
}

export function esyaCizimiTanimla(anahtar, ciz) {
  esyalar.set(anahtar, ciz);
}

/** Yedek gövde: aile rengine göre dış hatlı kutu. */
function yedekGovde(ctx, p, eb) {
  const x = p.x * KARO_PX;
  const y = p.y * KARO_PX;
  ctx.fillStyle = '#8a7a66';
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.fillRect(x + 0.5, y + 0.5, p.en * KARO_PX - 1, p.boy * KARO_PX - 1);
  ctx.strokeRect(x + 0.5, y + 0.5, p.en * KARO_PX - 1, p.boy * KARO_PX - 1);
}

export function parcaCizimi(anahtar) {
  return parcalar.get(anahtar) ?? { govde: yedekGovde, hareketli: null };
}

/** Eşya çizimi (koddan); yoksa tür renginde dış hatlı nokta. */
export function esyaCizimi(kod) {
  const tanim = esyaTanimi(kod);
  const ciz = tanim && esyalar.get(tanim.anahtar);
  if (ciz) return ciz;
  const renk = tanim?.renk ?? '#b9a27a';
  return (ctx, r, eb) => {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = renk;
    ctx.fill();
    ctx.strokeStyle = MUREKKEP;
    ctx.lineWidth = 1.2 * eb;
    ctx.stroke();
  };
}

/** Karonun merkezi (dünya pikseli). */
export const karoMerkez = (k) => k * KARO_PX + KARO_PX / 2;
