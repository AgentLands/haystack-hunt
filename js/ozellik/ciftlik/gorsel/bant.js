/**
 * Bant dokusu: kasa ve yön oku (gövde, bölge önbelleğinde) ile kayan çıtalar (hareketli).
 * Dönemeçte (hattın bu karoya giriş yönü karonun yönünden 90° farklıysa) bant yüzeyi iç
 * köşe merkezli çeyrek halkadır ve çıtalar halkanın yarıçapları boyunca döner: düz karodaki
 * gibi karo başına 4 çıta, aynı faz (komşu düz karoyla aynı anda kenardan geçer). Giriş yönü
 * hattan okunur (c.karoHat / c.karoSira → h.girisYon); hayalette `p.onizlemeGiris` ya da düz.
 * Saf geometri (donemec, donemecNoktasi) eşya konumu (esya-cizim.js) ve testlerle ortaktır.
 */
import { DX, DY, KARO_EN, KARO_BOY } from '../../../kural/ciftlik/olcu.js';
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';

const K = KARO_PX;
const ACI = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
/** Çıta aralığı (dünya pikseli) ve karo başına çıta sayısı. */
const CITA = 2;
const CITA_SAYI = K / CITA;
const KASA = '#4a3a2b';
const YUZEY = '#6e5a44';
const CITA_RENK = '#8c7556';
/** Ekranda karo bu kadar CSS pikselinden küçükse çıtalar çizilmez (gürültü olur). */
const CITA_EN_AZ = 12;

function donemecHesapla(g, d) {
  if (g === d || ((g + 2) & 3) === d) return null;
  const a0 = ACI[(d + 2) & 3];
  let fark = ACI[g] - a0;
  if (fark > Math.PI) fark -= Math.PI * 2;
  if (fark < -Math.PI) fark += Math.PI * 2;
  return Object.freeze({ kx: (DX[d] - DX[g]) / 2, ky: (DY[d] - DY[g]) / 2, a0, fark });
}
const DONEMECLER = Array.from({ length: 16 }, (_, i) => donemecHesapla(i >> 2, i & 3));

/**
 * Giriş yönü g, çıkış yönü d olan karonun dönemeci (sabit tablodan, her karede ayırma yok):
 * null (düz ya da ters) ya da { kx, ky (iç köşe, karo merkezine göre karo birimi), a0 (giriş
 * açısı), fark (±π/2) }. Köşeden giriş kenarı ortası a0 açısında, çıkış kenarı ortası
 * a0 + fark açısında, K/2 uzaklıktadır.
 */
export const donemec = (g, d) => DONEMECLER[(g << 2) | d];

/** Dönemeçte t (0 giriş kenarı .. 1 çıkış kenarı) noktası; (cx, cy) karo merkezi. */
export function donemecNoktasi(dm, cx, cy, t, r = K / 2) {
  const a = dm.a0 + dm.fark * t;
  return { x: cx + dm.kx * K + Math.cos(a) * r, y: cy + dm.ky * K + Math.sin(a) * r };
}

const ilkGiris = new WeakMap();

/**
 * Hattın sira. karosuna giriş yönü. Hattın ilk karosunda h.girisYon karonun kendi yönüdür;
 * ama halka kesildiği, HAT_EN_UZUN'da bölündüğü ya da hız değiştiği yerde önünde gerçek bir
 * öncül vardır: çizim (dönemeç ve eşya yolu) onun yönünü kullanır (öncül kuralı hat.js ile
 * aynı: tam arkadaki aynı yönlü, yoksa en küçük karo indeksli). Hat başına önbellekli.
 */
export function karoGirisi(c, h, sira) {
  if (sira > 0) return h.girisYon[sira];
  let g = ilkGiris.get(h);
  if (g !== undefined) return g;
  const k = h.karolar[0];
  const x = k % KARO_EN;
  const y = (k / KARO_EN) | 0;
  const yon = h.yonler[0];
  g = yon;
  let enKucuk = Infinity;
  for (let d = 0; d < 4; d++) {
    const qx = x - DX[d];
    const qy = y - DY[d];
    if (qx < 0 || qy < 0 || qx >= KARO_EN || qy >= KARO_BOY) continue;
    const q = c.parcalar.get(c.izgara.dolu[qy * KARO_EN + qx] - 1);
    if (!q?.tanim.hat || q.yon !== d || ((yon + 2) & 3) === d) continue;
    if (d === yon) {
      g = d;
      break;
    }
    if (qy * KARO_EN + qx < enKucuk) {
      enKucuk = qy * KARO_EN + qx;
      g = d;
    }
  }
  ilkGiris.set(h, g);
  return g;
}

/** Bandın bu karoya giriş yönü (hattan; hat yoksa ya da hayalette kendi yönü). */
export function bantGirisi(p, c) {
  if (p.onizlemeGiris !== undefined) return p.onizlemeGiris;
  if (!c?.karoHat) return p.yon;
  const k = p.y * KARO_EN + p.x;
  const h = c.hatlar[c.karoHat[k] - 1];
  return h ? karoGirisi(c, h, c.karoSira[k]) : p.yon;
}

/** Çeyrek halka yolu (iç köşe merkezli, r1..r2). */
function halkaYolu(ctx, ox, oy, dm, r1, r2) {
  ctx.beginPath();
  ctx.arc(ox, oy, r2, dm.a0, dm.a0 + dm.fark, dm.fark < 0);
  ctx.arc(ox, oy, r1, dm.a0 + dm.fark, dm.a0, dm.fark > 0);
  ctx.closePath();
}

/** Yön oku (çıkış kenarına yakın, yarı saydam mürekkep). */
function ok(ctx, x, y, d) {
  ctx.fillStyle = MUREKKEP;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + DX[d] * 1.1, y + DY[d] * 1.1);
  ctx.lineTo(x - DY[d] * 1.1 - DX[d], y + DX[d] * 1.1 - DY[d]);
  ctx.lineTo(x + DY[d] * 1.1 - DX[d], y - DX[d] * 1.1 - DY[d]);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Bant gövdesi (başka hat parçaları da kullanabilir: renkler değiştirilebilir). */
export function bantGovde(ctx, p, eb, c, renk = { kasa: KASA, yuzey: YUZEY }) {
  const x = p.x * K;
  const y = p.y * K;
  ctx.fillStyle = renk.kasa;
  ctx.fillRect(x + 0.3, y + 0.3, K - 0.6, K - 0.6);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeRect(x + 0.3, y + 0.3, K - 0.6, K - 0.6);
  ctx.fillStyle = renk.yuzey;
  const dm = donemec(bantGirisi(p, c), p.yon);
  const cx = x + K / 2;
  const cy = y + K / 2;
  if (dm) {
    halkaYolu(ctx, cx + dm.kx * K, cy + dm.ky * K, dm, 1.4, K - 1.4);
    ctx.fill();
    const u = donemecNoktasi(dm, cx, cy, 0.78);
    ok(ctx, u.x, u.y, p.yon);
    return;
  }
  if ((p.yon & 1) === 0) ctx.fillRect(x + 0.3, y + 1.4, K - 0.6, K - 2.8);
  else ctx.fillRect(x + 1.4, y + 0.3, K - 2.8, K - 0.6);
  ok(ctx, cx + DX[p.yon] * 2.4, cy + DY[p.yon] * 2.4, p.yon);
}

/**
 * Kayan çıtalar; an.faz dünya pikseli kayma (sade harekette 0: duran çıtalar). Çıtalar
 * an.dolgu / an.cizgi toplu yollarına eklenir (bütün bantlar için kare sonunda tek fill).
 */
export function bantCitalari(ctx, p, an, eb, renk = CITA_RENK) {
  if (K / eb < CITA_EN_AZ) return;
  const x = p.x * K;
  const y = p.y * K;
  const kay = ((an.faz % CITA) + CITA) % CITA;
  const dm = donemec(bantGirisi(p, an.c), p.yon);
  if (dm) {
    const ox = x + K / 2 + dm.kx * K;
    const oy = y + K / 2 + dm.ky * K;
    const yol = an.cizgi(renk, 0.8);
    for (let n = 0; n < CITA_SAYI; n++) {
      const t = (kay / CITA + n) / CITA_SAYI;
      if (t < 0.06 || t > 0.94) continue;
      const a = dm.a0 + dm.fark * t;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      yol.moveTo(ox + ca * 1.6, oy + sa * 1.6);
      yol.lineTo(ox + ca * (K - 1.6), oy + sa * (K - 1.6));
    }
    return;
  }
  const ileri = DX[p.yon] + DY[p.yon];
  const yatay = (p.yon & 1) === 0;
  const k = ileri > 0 ? kay : (CITA - kay) % CITA;
  const yol = an.dolgu(renk);
  for (let t = k; t < K; t += CITA) {
    if (t < 0.4 || t > K - 1.2) continue;
    if (yatay) yol.rect(x + t, y + 1.6, 0.8, K - 3.2);
    else yol.rect(x + 1.6, y + t, K - 3.2, 0.8);
  }
}

parcaCizimiTanimla('bant', {
  govde: (ctx, p, eb, c) => bantGovde(ctx, p, eb, c),
  hareketli: (ctx, p, an, eb) => bantCitalari(ctx, p, an, eb),
});
