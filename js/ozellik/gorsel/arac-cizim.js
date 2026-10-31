/**
 * Çiftçinin elindeki araçlar (karakter yerel uzayında, dış hatlı): tırmık, dedektör,
 * mıknatıs. araciKur() hem aracı çizen işlevi hem de ellerin tuttuğu noktaları verir; böylece
 * kollar aracın hareketini izler. Açı/ileri kayma karakter-poz.js aracPozu'ndan gelir:
 * tırmık sap yayı çizip saman çeker, dedektör tarama yayı bırakır, mıknatıs ileri uzanıp
 * nabız atar. Sap kalınlığı ekran-sabit alt sınırlıdır (uzakta kaybolmasın).
 */
import { IKI_PI } from './ortak.js';
import { DIS, SAMAN_RENK, hatli, hatliCizgi } from './ciftci-parca.js';

const SAP = '#8a5d32';
const METAL = '#5d6469';
const METAL_ACIK = '#b4bbc2';

/** Aracın yerel noktasını (u: sap boyunca, v: yanal) karakter uzayına çevirir. */
function nokta(ox, oy, aci, u, v) {
  const c = Math.cos(aci);
  const s = Math.sin(aci);
  return [ox + u * c - v * s, oy + u * s + v * c];
}

function daire(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, IKI_PI);
}

function tirmik(ctx, o, kullan, t, dh) {
  const n = (u, v) => nokta(o.x, o.y, o.aci, u, v);
  const sap = Math.max(0.1, dh * 1.7);
  hatliCizgi(ctx, ...n(-0.5, 0), ...n(2.0, 0), sap, SAP, dh);
  const boy = kullan ? 0.4 : 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const v = -0.54 + i * 0.216;
    ctx.moveTo(...n(2.0, v));
    ctx.lineTo(...n(2.0 + boy, v));
  }
  ctx.strokeStyle = DIS;
  ctx.lineWidth = Math.max(0.07, dh) + 2 * dh;
  ctx.stroke();
  ctx.strokeStyle = METAL_ACIK;
  ctx.lineWidth = Math.max(0.07, dh);
  ctx.stroke();
  hatliCizgi(ctx, ...n(2.0, -0.6), ...n(2.0, 0.6), Math.max(0.13, dh * 1.6), METAL, dh);
  if (!kullan) return;
  // Dişlerin önünde çekilen saman tutamı.
  ctx.lineWidth = Math.max(0.05, dh);
  for (let r = 0; r < 3; r++) {
    ctx.strokeStyle = SAMAN_RENK[r];
    ctx.beginPath();
    for (let i = r; i < 7; i += 3) {
      const v = -0.5 + i * 0.165;
      const u = 2.45 + 0.08 * Math.sin(t * 20 + i * 2.1);
      ctx.moveTo(...n(u, v));
      ctx.lineTo(...n(u + 0.22, v + 0.1 * Math.sin(i * 1.7)));
    }
    ctx.stroke();
  }
}

function dedektor(ctx, o, kullan, t, dh) {
  const n = (u, v) => nokta(o.x, o.y, o.aci, u, v);
  const [dx, dy] = n(1.85, 0);
  if (kullan && o.iz) {
    // Tarama yayı: başın az önce geçtiği yol (açık iz, baş tarafı daha parlak).
    const r = Math.hypot(dx - o.x, dy - o.y);
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.42;
    for (const [k, a] of [[1, 0.16], [0.5, 0.2]]) {
      const ucu = o.aci - o.iz * k;
      ctx.strokeStyle = `rgba(205, 240, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, Math.min(ucu, o.aci), Math.max(ucu, o.aci));
      ctx.stroke();
    }
  }
  hatliCizgi(ctx, ...n(-0.3, 0), ...n(1.6, 0), Math.max(0.1, dh * 1.6), '#39424d', dh);
  daire(ctx, dx, dy, 0.44);
  hatli(ctx, '#2d343d', dh);
  daire(ctx, dx, dy, 0.34);
  ctx.fillStyle = '#6c7e91';
  ctx.fill();
  daire(ctx, dx - 0.06, dy - 0.06, 0.19);
  ctx.fillStyle = '#9fb3c6';
  ctx.fill();
  if (kullan) {
    ctx.strokeStyle = 'rgba(190, 235, 255, 0.7)';
    ctx.lineWidth = Math.max(0.05, dh);
    daire(ctx, dx, dy, 0.55 + 0.12 * ((t * 3) % 1));
    ctx.stroke();
  }
  const [lx, ly] = n(0.5, 0.11);
  daire(ctx, lx, ly, 0.07);
  hatli(ctx, kullan && Math.sin(t * 12) > 0 ? '#ff5640' : '#7a2c24', dh * 0.7);
}

function miknatis(ctx, o, kullan, t, dh) {
  const n = (u, v) => nokta(o.x, o.y, o.aci, u, v);
  hatliCizgi(ctx, ...n(-0.3, 0), ...n(1.15, 0), Math.max(0.1, dh * 1.6), SAP, dh);
  const [cx, cy] = n(1.5, 0);
  const a = o.aci;
  const p = (u, v) => nokta(cx, cy, a, u, v);
  // At nalı: dış hat, kırmızı gövde, çelik uçlar.
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(cx, cy, 0.3, a + Math.PI / 2, a + Math.PI * 1.5);
  ctx.strokeStyle = DIS;
  ctx.lineWidth = 0.22 + 2 * dh;
  ctx.stroke();
  ctx.strokeStyle = '#c93434';
  ctx.lineWidth = 0.22;
  ctx.stroke();
  for (const v of [-1, 1]) {
    hatliCizgi(ctx, ...p(0, v * 0.3), ...p(0.3, v * 0.3), 0.2, '#dfe4e8', dh);
  }
  if (!kullan) return;
  // Nabız: önden mıknatısa doğru gelen yaylar.
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.06, dh * 1.2);
  for (let i = 0; i < 3; i++) {
    const f = (t * 1.6 + i / 3) % 1;
    const r = 1.05 - f * 0.6;
    ctx.strokeStyle = `rgba(255, 236, 170, ${(0.85 * Math.sin(Math.PI * f)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(...p(-0.2, 0), r, a - 0.55, a + 0.55);
    ctx.stroke();
  }
}

const CIZICI = { tirmik, dedektor, miknatis };
const TUTUS = { tirmik: [0.12, 0.7], dedektor: [0.2, 0.62], miknatis: [0.05, 0.5] };

/**
 * Araç düzeni: { ciz(ctx), sag: [x, y], sol: [x, y] } ya da elle (el) için null.
 * poz: aracPozu() sonucu (aci, uzat, iz); kullan: araç çalışıyor; t: saniye; dh: dış hat.
 */
export function araciKur(ad, poz, kullan, t, dh) {
  const ciz = CIZICI[ad];
  if (!ciz) return null;
  const o = { x: 0.1 + Math.cos(poz.aci) * poz.uzat, y: 0.3 + Math.sin(poz.aci) * poz.uzat,
    aci: poz.aci, iz: poz.iz || 0 };
  const [a, b] = TUTUS[ad];
  return {
    ciz: (ctx) => ciz(ctx, o, kullan, t, dh),
    sag: nokta(o.x, o.y, o.aci, a, 0),
    sol: nokta(o.x, o.y, o.aci, b, 0),
  };
}
