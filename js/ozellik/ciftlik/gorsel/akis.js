/**
 * Akış katmanı (arayuz.md §7; F tuşu, dokunmatikte HUD'un "Akış" düğmesi akisDegistir'i
 * çağırır): açıkken görünür parçalarda bant yön okları (dönemeçte yay boyunca), güç oranı
 * halkası (güç isteyen parça: p.oran / 1024), depolarda doluluk çubuğu, parçanın kendi akış
 * çizimi (parcaCizimiTanimla(..., { akis })) ve dış katmanlar (akisKatmaniEkle: şaft şebekesi
 * renkleri B, renk kanalları C) çizilir; rozetler uzak görünümde de gösterilir (rozet.js).
 * Kapalıyken maliyeti sıfırdır. Durum oturumluktur (kayda girmez).
 */
import { KARO_PX, MUREKKEP, parcaCizimi } from './kayit.js';
import { gorunurParcalar } from './bolge.js';
import { donemec, donemecNoktasi, bantGirisi } from './bant.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';
import { SANDIK_KAP } from '../../../kural/ciftlik/parcalar/temel.js';

const K = KARO_PX;
let acik = false;
const dinleyiciler = [];
const katmanlar = [];

/** Akış katmanı açık mı? */
export const akisAcik = () => acik;

/** Akış katmanını açar/kapatır (değer verilmezse çevirir); dinleyicilere bildirir. */
export function akisDegistir(deger = !acik) {
  acik = Boolean(deger);
  for (const islev of dinleyiciler) islev(acik);
  return acik;
}

/** Açılıp kapanınca islev(acik) (HUD düğmesi durumu). */
export function akisDinle(islev) {
  dinleyiciler.push(islev);
}

/** Bütün akış katmanına çizim ekler: islev(ctx, c, alan, eb) (ör. şaft şebekesi renkleri). */
export function akisKatmaniEkle(islev) {
  katmanlar.push(islev);
}

/** Parça kutusunun altında doluluk çubuğu (oran 0..1); depolar ve tamponlar için ortak. */
export function dolulukCubugu(ctx, p, oran, eb, renk = '#E3B341') {
  const pay = 1.5 * eb + 0.6;
  const boy = Math.max(3 * eb, 0.9);
  const x = p.x * K + pay;
  const y = (p.y + p.boy) * K - pay - boy;
  const en = p.en * K - pay * 2;
  ctx.fillStyle = MUREKKEP;
  ctx.fillRect(x - eb, y - eb, en + 2 * eb, boy + 2 * eb);
  ctx.fillStyle = '#EAD7B0';
  ctx.fillRect(x, y, en, boy);
  ctx.fillStyle = oran >= 1 ? '#9E3A26' : renk;
  ctx.fillRect(x, y, en * Math.max(0, Math.min(1, oran)), boy);
}

/** Parçanın kendi akış çizimi yoksa: bilinen depolar. */
const VARSAYILAN = {
  sandik: (ctx, p, eb) => dolulukCubugu(ctx, p, p.ozel.toplam / SANDIK_KAP, eb),
};

/** Hat parçasında yön oku (şerit üstünde): yol kâğıt rengi, alt mürekkep (u'su büyük). */
function okEkle(yol, alt, p, c, eb) {
  const g = bantGirisi(p, c);
  const d = p.yon;
  const cx = p.x * K + K / 2;
  const cy = p.y * K + K / 2;
  const dm = donemec(g, d);
  let x = cx;
  let y = cy;
  let ux = DX[d];
  let uy = DY[d];
  if (dm) {
    ({ x, y } = donemecNoktasi(dm, cx, cy, 0.5));
    ux = (DX[g] + DX[d]) * Math.SQRT1_2;
    uy = (DY[g] + DY[d]) * Math.SQRT1_2;
  }
  for (const [hedef, u] of [[alt, K * 0.22 + 1.6 * eb], [yol, K * 0.22]]) {
    hedef.moveTo(x + ux * u, y + uy * u);
    hedef.lineTo(x - ux * u - uy * u, y - uy * u + ux * u);
    hedef.lineTo(x - ux * u * 0.4, y - uy * u * 0.4);
    hedef.lineTo(x - ux * u + uy * u, y - uy * u - ux * u);
    hedef.lineTo(x + ux * u, y + uy * u); // closePath değil: büyük yolda pahalı
  }
}

/** Güç isteyen parçada sol alt köşede oran halkası. */
function gucHalkasi(ctx, p, eb) {
  const r = 4 * eb;
  const x = p.x * K + r + eb;
  const y = (p.y + p.boy) * K - r - eb;
  const oran = Math.max(0, Math.min(1, (p.oran ?? 1024) / 1024));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = MUREKKEP;
  ctx.fill();
  if (oran > 0) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r - eb, -Math.PI / 2, -Math.PI / 2 + oran * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = oran < 0.5 ? '#E3B341' : '#8fbf5a';
    ctx.fill();
  }
}

/** Akış katmanını çizer (kapalıysa hiçbir şey). Dönüş: işlenen parça sayısı. */
export function akisCiz(ctx, c, alan, eb) {
  if (!acik) return 0;
  const oklar = new Path2D();
  const alt = new Path2D();
  let okVar = false;
  const n = gorunurParcalar(c, alan, (p) => {
    if (p.tanim.hat) {
      okEkle(oklar, alt, p, c, eb);
      okVar = true;
    }
    if (p.tanim.guc > 0) gucHalkasi(ctx, p, eb);
    const ciz = parcaCizimi(p.tanim.anahtar).akis ?? VARSAYILAN[p.tanim.anahtar];
    if (ciz) ciz(ctx, p, eb, c);
  });
  if (okVar) { // dış hat stroke değil alt dolgu: yüzlerce kapalı yolun stroke'u pahalı
    ctx.fillStyle = MUREKKEP;
    ctx.fill(alt);
    ctx.fillStyle = '#F4E9D0';
    ctx.fill(oklar);
  }
  for (const islev of katmanlar) islev(ctx, c, alan, eb);
  return n;
}
