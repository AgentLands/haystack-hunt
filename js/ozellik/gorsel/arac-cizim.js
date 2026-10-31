/**
 * Çiftçinin elindeki araçlar (karakter yerel uzayında): tırmık, dedektör, mıknatıs.
 * araciKur() hem aracı çizen işlevi hem de ellerin tuttuğu noktaları verir; böylece kollar
 * aracın sallanmasını izler. Kullanılırken araç sallanır, boştayken omuzda taşınır.
 */
import { IKI_PI, doldur, elips, serit } from './ortak.js';

const SAP = '#7a5430';
const SAP_ACIK = '#a77b46';

/** Aracın yerel noktasını (u: sap boyunca, v: yanal) karakter uzayına çevirir. */
function nokta(ox, oy, aci, u, v) {
  const c = Math.cos(aci);
  const s = Math.sin(aci);
  return [ox + u * c - v * s, oy + u * s + v * c];
}

function tirmik(ctx, ox, oy, aci, kullan) {
  const [bx, by] = nokta(ox, oy, aci, 2.0, 0);
  serit(ctx, ...nokta(ox, oy, aci, -0.5, 0), bx, by, 0.12, SAP);
  serit(ctx, ...nokta(ox, oy, aci, -0.5, -0.03), ...nokta(ox, oy, aci, 1.9, -0.03),
    0.04, SAP_ACIK);
  const [x1, y1] = nokta(ox, oy, aci, 2.0, -0.62);
  const [x2, y2] = nokta(ox, oy, aci, 2.0, 0.62);
  serit(ctx, x1, y1, x2, y2, 0.14, '#6b6f73');
  const boy = kullan ? 0.42 : 0.3;
  for (let i = 0; i < 6; i++) {
    const v = -0.56 + i * 0.224;
    serit(ctx, ...nokta(ox, oy, aci, 2.0, v), ...nokta(ox, oy, aci, 2.0 + boy, v),
      0.06, '#9a9ea2');
  }
}

function dedektor(ctx, ox, oy, aci, kullan, t) {
  serit(ctx, ...nokta(ox, oy, aci, -0.3, 0), ...nokta(ox, oy, aci, 1.6, 0), 0.11, '#39424d');
  const [dx, dy] = nokta(ox, oy, aci, 1.85, 0);
  elips(ctx, dx, dy, 0.52, 0.52);
  doldur(ctx, '#2d343d');
  elips(ctx, dx, dy, 0.42, 0.42);
  doldur(ctx, '#6c7e91');
  elips(ctx, dx - 0.04, dy - 0.04, 0.26, 0.26);
  doldur(ctx, '#93a6b8');
  if (kullan) {
    ctx.strokeStyle = 'rgba(190, 235, 255, 0.55)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(dx, dy, 0.66 + 0.1 * Math.sin(t * 8), 0, IKI_PI);
    ctx.stroke();
  }
  const [lx, ly] = nokta(ox, oy, aci, 0.5, 0.09);
  elips(ctx, lx, ly, 0.06, 0.06);
  doldur(ctx, kullan && Math.sin(t * 12) > 0 ? '#ff5640' : '#7a2c24');
}

function miknatis(ctx, ox, oy, aci, kullan, t) {
  serit(ctx, ...nokta(ox, oy, aci, -0.3, 0), ...nokta(ox, oy, aci, 1.1, 0), 0.1, SAP);
  const sallan = kullan ? Math.sin(t * 9) * 0.18 : 0;
  const [cx, cy] = nokta(ox, oy, aci + sallan, 1.5, 0);
  const a = aci + sallan;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#c93434';
  ctx.lineWidth = 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy, 0.3, a + Math.PI / 2, a + Math.PI * 1.5);
  ctx.stroke();
  for (const v of [-1, 1]) {
    serit(ctx, ...nokta(cx, cy, a, 0, v * 0.3), ...nokta(cx, cy, a, 0.32, v * 0.3),
      0.22, '#dfe4e8');
  }
  if (kullan) {
    ctx.strokeStyle = 'rgba(255, 245, 200, 0.6)';
    ctx.lineWidth = 0.04;
    for (let i = 0; i < 3; i++) {
      const f = (t * 2 + i / 3) % 1;
      const [px, py] = nokta(cx, cy, a, 0.9 - f * 0.55, (i - 1) * 0.28);
      const [qx, qy] = nokta(cx, cy, a, 1.02 - f * 0.55, (i - 1) * 0.28);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
      ctx.stroke();
    }
  }
}

/**
 * Araç düzeni: { ciz(ctx), sag: [x, y], sol: [x, y] } ya da elle (el) için null.
 * kullan: araç çalışıyor; t: saniye.
 */
export function araciKur(ad, kullan, t) {
  const ox = 0.1;
  const oy = 0.3;
  if (ad === 'tirmik') {
    const aci = kullan ? Math.sin(t * 7) * 0.55 : -0.2;
    return {
      ciz: (ctx) => tirmik(ctx, ox, oy, aci, kullan),
      sag: nokta(ox, oy, aci, 0.15, 0),
      sol: nokta(ox, oy, aci, 0.85, 0),
    };
  }
  if (ad === 'dedektor' || ad === 'miknatis') {
    const aci = kullan ? Math.sin(t * (ad === 'dedektor' ? 3.5 : 5)) * 0.4 : -0.15;
    const ciz = ad === 'dedektor' ? dedektor : miknatis;
    return {
      ciz: (ctx) => ciz(ctx, ox, oy, aci, kullan, t),
      sag: nokta(ox, oy, aci, 0.35, 0),
      sol: nokta(ox, oy, aci, 0.9, 0),
    };
  }
  return null;
}
