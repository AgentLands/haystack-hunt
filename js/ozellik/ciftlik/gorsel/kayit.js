/**
 * Parça ve eşya çizim kaydı (kural kaydından AYRI: benzetim Node'da çizimsiz koşar).
 *   parcaCizimiTanimla(anahtar, { govde, hareketli, akis })
 *     govde(ctx, p, eb, c)       durağan gövde; bölge önbelleğine girer (bolge.js), parça
 *                                kurulunca/sökülünce/dönünce (ve komşusu değişince: 1 karo
 *                                pay) yenilenir. Dünya pikseli, karo = KARO_PX; (p.x, p.y) sol
 *                                üst karo, p.en × p.boy, p.yon. c: benzetim dünyası (hayalet
 *                                önizlemesinde null; komşuya bakan çizim buna dayanmalı).
 *     hareketli(ctx, p, an, eb)  her kare, yalnız görünür parçalar (dönen kanat, dolum
 *                                göstergesi); an: { zaman, tik, alfa (0..1, iki tik arası),
 *                                faz (bant çıtası, dünya pikseli; sade harekette 0), c,
 *                                dolgu(renk) → Path2D, cizgi(renk, kalin) → Path2D }. dolgu/
 *                                cizgi toplu yollardır: eklenen şekiller bütün parçalardan
 *                                sonra renk başına TEK fill/stroke ile çizilir (kalin dünya
 *                                pikseli); çok tekrarlanan küçük şekiller için (bant çıtası).
 *     akis(ctx, p, eb, c)        isteğe bağlı: akış katmanı (F) açıkken parçanın ek bilgisi
 *                                (doluluk çubuğu, şebeke rengi, renk halkası; akis.js).
 *   esyaCizimiTanimla(anahtar, ciz(ctx, r, eb))  eşya sprite'ı (0, 0 merkezli, r yarıçap);
 *                                atlasa ekran ölçeğinde bir kez çizilir (esya-atlas.js).
 *   esyaTopluTanimla(anahtar, { renk, govde(yol, x, y, r, d), ekler: [{ renk,
 *                                sekil(yol, x, y, r), dolgu?, kalin? (CSS px) }] })  bantta
 *                                çok bulunan yığın türleri (saman, ot, balya...): her kare TÜR
 *                                BAŞINA birkaç yol çağrısıyla toplu çizilir. Dış hat stroke
 *                                değil çift dolgudur: govde d kadar şişirilip mürekkeple, sonra
 *                                d = 0 ile renkle doldurulur (üst üste binen tutamlar tek siluet;
 *                                yüzlerce kapalı eğrinin stroke'u yazılımsal çizimde çok pahalı).
 *                                govde ucuz yol komutlarıyla (quadraticCurveTo, rect) yazılmalı;
 *                                ellipse/arc, roundRect ve (büyük yolda) closePath pahalıdır.
 *                                Sprite'ı da bundan türetilir. Seyrek ve ayrıntılı türler
 *                                (iğne, buluntu) sprite ile.
 * eb = 1 CSS pikselinin yerel uzunluğu (ekranBirim: DPR'de doğru); dış hat 1.2 * eb.
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
const toplular = new Map();
let esyaSurum = 0;

export function parcaCizimiTanimla(anahtar, { govde, hareketli = null, akis = null }) {
  if (typeof govde !== 'function') throw new Error(`parcaCizimiTanimla(${anahtar}): govde yok`);
  parcalar.set(anahtar, { govde, hareketli, akis });
}

export function esyaCizimiTanimla(anahtar, ciz) {
  esyalar.set(anahtar, ciz);
  esyaSurum += 1;
}

/** Toplu çizilen eşya türü: sprite da tarifinden türetilir. */
export function esyaTopluTanimla(anahtar, tarif) {
  if (typeof tarif.govde !== 'function') throw new Error(`esyaTopluTanimla(${anahtar}): govde yok`);
  const t = Object.freeze({ ekler: [], ...tarif });
  toplular.set(anahtar, t);
  esyaCizimiTanimla(anahtar, (ctx, r, eb) => topluTekCiz(ctx, t, r, eb));
}

/** Toplu tarifi tek eşya için çizer (atlas, panel simgesi). */
export function topluTekCiz(ctx, t, r, eb, x = 0, y = 0) {
  const dis = new Path2D();
  t.govde(dis, x, y, r, 1.1 * eb);
  ctx.fillStyle = MUREKKEP;
  ctx.fill(dis);
  const yol = new Path2D();
  t.govde(yol, x, y, r, 0);
  ctx.fillStyle = t.renk;
  ctx.fill(yol);
  ctx.lineCap = 'round';
  for (const ek of t.ekler) {
    const e = new Path2D();
    ek.sekil(e, x, y, r);
    if (ek.dolgu) {
      ctx.fillStyle = ek.renk;
      ctx.fill(e);
    } else {
      ctx.strokeStyle = ek.renk;
      ctx.lineWidth = (ek.kalin ?? 0.9) * eb;
      ctx.stroke(e);
    }
  }
}

/** Koddan toplu tarif (yoksa null: sprite ile çizilir). */
export function esyaToplu(kod) {
  const tanim = esyaTanimi(kod);
  return (tanim && toplular.get(tanim.anahtar)) ?? null;
}

/** Eşya çizimleri her tanımda artan sayı (atlas eskidiyse yeniden kurulur). */
export const esyaCizimSurumu = () => esyaSurum;

/** Anahtar için kayıtlı eşya çizimi var mı (test ve atlas için). */
export const esyaCizimiVar = (anahtar) => esyalar.has(anahtar);

/** Anahtardan eşya çizimi ciz(ctx, r, eb) ya da null (panel/defter simgesi için). */
export const esyaCizimiAdla = (anahtar) => esyalar.get(anahtar) ?? null;

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
const YEDEK = Object.freeze({ govde: yedekGovde, hareketli: null, akis: null });

export function parcaCizimi(anahtar) {
  return parcalar.get(anahtar) ?? YEDEK;
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
