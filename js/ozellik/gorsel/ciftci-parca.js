/**
 * Çiftçinin parçaları: tepeden görünen hasır şapka ve makine koltuğunda oturan çiftçi.
 * Yerel uzayda çizer (+x ileri); karakter ve makine çizimleri ortak kullanır.
 */
import { IKI_PI, doldur, elips, serit } from './ortak.js';

export const GOMLEK = '#b9452e';
export const GOMLEK_KOYU = '#8f3322';
export const TULUM = '#3f6694';
export const DERI = '#e3b78c';

/** Hasır şapka: geniş kenar, dokuma halkalar, bantlı tepe; isik = yerel ışık yönü. */
export function sapka(ctx, cx, cy, r, isik) {
  elips(ctx, cx, cy, r, r);
  doldur(ctx, '#e2be63');
  ctx.strokeStyle = '#b48838';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(130, 90, 25, 0.28)';
  ctx.lineWidth = 0.035;
  for (const k of [0.8, 0.66]) {
    elips(ctx, cx, cy, r * k, r * k);
    ctx.stroke();
  }
  // Işık tarafı aydınlık yay, karşı kenar hafif gölge.
  const aci = Math.atan2(isik[1], isik[0]);
  ctx.strokeStyle = 'rgba(255, 244, 205, 0.55)';
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.93, aci - 0.7, aci + 0.7);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90, 55, 15, 0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.93, aci + Math.PI - 0.7, aci + Math.PI + 0.7);
  ctx.stroke();
  // Tepe ve şapka bandı.
  const t = r * 0.5;
  elips(ctx, cx, cy, t, t);
  doldur(ctx, '#efd17c');
  ctx.strokeStyle = '#8c3b29';
  ctx.lineWidth = r * 0.14;
  ctx.stroke();
  elips(ctx, cx + isik[0] * t * 0.28, cy + isik[1] * t * 0.28, t * 0.45, t * 0.45);
  doldur(ctx, 'rgba(255, 246, 215, 0.55)');
  // Bandın arkadaki düğümü ve kuyrukları: yönü belli eder.
  elips(ctx, cx - t, cy, r * 0.1, r * 0.1);
  doldur(ctx, '#7a2f20');
  serit(ctx, cx - t, cy, cx - t - r * 0.28, cy + r * 0.12, 0.07, '#8c3b29');
}

/** Koltukta oturan çiftçi (cx, cy koltuk merkezi): omuzlar, direksiyona uzanan kollar, şapka. */
export function oturanCiftci(ctx, cx, cy, isik) {
  elips(ctx, cx - 0.02, cy, 0.3, 0.52);
  doldur(ctx, GOMLEK);
  for (const y of [-1, 1]) {
    serit(ctx, cx + 0.05, cy + y * 0.46, cx + 0.62, cy + y * 0.3, 0.2, GOMLEK_KOYU);
    ctx.beginPath();
    ctx.arc(cx + 0.66, cy + y * 0.29, 0.1, 0, IKI_PI);
    doldur(ctx, DERI);
  }
  sapka(ctx, cx + 0.04, cy, 0.4, isik);
}
