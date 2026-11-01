/**
 * Çiftlik çizimleri: İşleme ailesi (kuş bakışı, yön 0 = akış doğuya; sağ = güney).
 * - ot-savurucu (3×1): sarı boyalı kiriş, üç göbek; hareketli: zıt yönde dönen üç yıldız
 *   tırmık diski ve havada serpilen ot; yağmurda (gök 'yagmur' ya da durum 'hava') ıslak ton.
 * - kurutma-ambari (3×3): kırmızı beşik çatılı ambar, sırtta havalandırma kulesi; hareketli:
 *   kulede dönen pervane, ön kapıdan buhar.
 * - balya-presi (3×2): uzun yeşil gövde, arkada besleme hunisi, üstte ip kutuları; hareketli:
 *   kalıpta dolan saman (p.ozel.dolum/8), ileri geri piston (p.ozel.basma kalan tik, 40'ta
 *   bir vuruş), önde iple bağlı balya, yan volan. Tıkalıyken piston yarı yolda kalır.
 * - cekicli-kiyici (2×2): perçinli galvaniz kazan, arkada kırmızı besleme hunisi; hareketli:
 *   dönen çekiç diski ve içinde savrulan kıyım; kırıkken (durum 'kirik') eğri çekiç ve duman.
 * - gubre-cukuru (2×2, yönsüz): çitli çukur; hareketli: doluluk (p.ozel.puan/120), iki sinek,
 *   buğu.
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, kutu, daire, duz, donus, hizOrani, durumu, agizlar, puf, kolYolu,
  hatliCizgi, havaGorsel, percin, kanatYolu, TUR,
} from './parca-ortak.js';

// --- Ot savurucu ---
function savurucuGovde(ctx, L, p) {
  golge(ctx, L, -1.45, -0.3, 2.9, 0.6, 0.1);
  agizlar(ctx, L, p);
  for (const x of [-1.38, 1.38]) kutu(ctx, L, x, 0, 0.22, 0.7, 0.08, '#2a2521', '#4d443a');
  kutu(ctx, L, 0, 0, 2.8, 0.2, 0.06, '#b8761a', '#f0c050');
  for (const x of [-1, 0, 1]) daire(ctx, L, x, 0, 0.13, '#5d6469', '#b4bbc2');
}

function savurucuHareketli(ctx, L, p, an) {
  const hiz = hizOrani(p);
  const a = donus(p, an, 1.3, hiz);
  ctx.beginPath();
  for (const [x, yon] of [[-1, 1], [0, -1], [1, 1]]) {
    for (let i = 0; i < 6; i++) {
      const b = yon * a + (i * TUR) / 6 + x;
      const c = Math.cos(b);
      const s = Math.sin(b);
      ctx.moveTo(x + c * 0.12, s * 0.12);
      ctx.lineTo(x + c * 0.4, s * 0.4);
      ctx.lineTo(x + c * 0.44 - s * 0.08 * yon, s * 0.44 + c * 0.08 * yon);
    }
  }
  hatliCizgi(ctx, L, 0.05, '#c9cdd0');
  if (hiz > 0) {
    ctx.fillStyle = '#e3b341';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const u = ((a / TUR) * 2 + k / 6) % 1;
      ctx.rect(-1.2 + k * 0.45 + u * 0.2, -0.3 - u * 0.25 + (k & 1) * 0.6, 0.07, 0.04);
    }
    ctx.fill();
  }
  if (havaGorsel.gok === 'yagmur' || durumu(p) === 'hava') {
    ctx.fillStyle = 'rgba(40, 60, 80, 0.35)';
    ctx.fillRect(-1.5, -0.5, 3, 1);
  }
}

parcaCizimiTanimla('ot-savurucu', yerelCizim(savurucuGovde, savurucuHareketli));

// --- Kurutma ambarı ---
function kurutmaGovde(ctx, L, p) {
  golge(ctx, L, -1.42, -1.38, 2.84, 2.76, 0.06, 2.6);
  agizlar(ctx, L, p);
  const ust = L.isik[1] < 0;
  for (const [y0, acik] of [[-1.38, ust], [0, !ust]]) {
    ctx.beginPath();
    ctx.rect(-1.42, y0, 2.84, 1.38);
    duz(ctx, L, acik ? '#d4502a' : '#9a3217');
    ctx.strokeStyle = acik ? 'rgba(120, 30, 10, 0.45)' : 'rgba(60, 14, 4, 0.45)';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (let t = 0.3; t < 1.36; t += 0.27) {
      ctx.moveTo(-1.38, y0 + (y0 < 0 ? t : 1.38 - t));
      ctx.lineTo(1.38, y0 + (y0 < 0 ? t : 1.38 - t));
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(1.32, -1.38, 0.1, 2.76);
  ctx.fillRect(-1.42, -1.38, 0.1, 2.76);
  ctx.beginPath();
  ctx.moveTo(-1.42, 0);
  ctx.lineTo(1.42, 0);
  hatliCizgi(ctx, L, 0.09, '#5a1e0e');
  kutu(ctx, L, 0, 0, 0.62, 0.62, 0.05, '#c9b89a', '#f4ecd8');
  daire(ctx, L, 0, 0, 0.26, '#3a3430', '#55504a');
}

function kurutmaHareketli(ctx, L, p, an) {
  const hiz = hizOrani(p);
  const a = donus(p, an, 1.5, hiz);
  if (hiz > 0) {
    for (let k = 0; k < 3; k++) {
      const u = ((a / TUR) * 0.7 + k / 3) % 1;
      puf(ctx, 1.5 + u * 0.45, (k - 1) * 0.35 - u * 0.25, 0.12 + u * 0.18,
        `rgba(250, 246, 236, ${0.6 * (1 - u)})`);
    }
  }
  kanatYolu(ctx, 0, 0, 0.25, 0.06, a);
  duz(ctx, L, '#b4bbc2', 0.9);
}

parcaCizimiTanimla('kurutma-ambari', yerelCizim(kurutmaGovde, kurutmaHareketli));

// --- Balya presi ---
function presGovde(ctx, L, p) {
  golge(ctx, L, -1.45, -0.85, 2.9, 1.7, 0.12, 1.6);
  agizlar(ctx, L, p);
  kutu(ctx, L, -1.12, 0, 0.62, 1.66, 0.1, '#2f5220', '#4f7f2e');
  ctx.fillStyle = '#2a1a0d';
  ctx.fillRect(-1.3, -0.55, 0.28, 1.1);
  kutu(ctx, L, 0.25, 0, 2.4, 0.98, 0.12, '#3f6b2a', '#6a9f3a');
  ctx.beginPath();
  ctx.rect(-0.78, -0.22, 2.24, 0.44);
  duz(ctx, L, '#2a2116', 1);
  for (const x of [-0.25, 0.25]) kutu(ctx, L, x, -0.7, 0.36, 0.3, 0.05, '#c9b48a', '#f0e2c0');
  kutu(ctx, L, 0.9, 0.72, 0.5, 0.26, 0.05, '#2e2b28', '#55504a');
}

function presHareketli(ctx, L, p, an) {
  const o = p.ozel ?? {};
  const hiz = hizOrani(p);
  const dolum = Math.max(0, Math.min(8, o.dolum ?? 0));
  if (dolum > 0) {
    ctx.fillStyle = '#e3b341';
    ctx.fillRect(-0.72, -0.18, (1.2 * dolum) / 8, 0.36);
  }
  const basma = Math.max(0, Math.min(40, (o.basma ?? 0) - an.alfa));
  let ilerle = basma > 0 ? Math.sin((1 - basma / 40) * Math.PI) : 0;
  if (p.tikali) ilerle = 0.45;
  kutu(ctx, L, 0.3, 0, 0.62 - ilerle * 0.06, 0.4, 0.04, '#b8862e', '#e3b341');
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  for (const y of [-0.1, 0.1]) {
    ctx.moveTo(0.02, y);
    ctx.lineTo(0.6, y);
  }
  ctx.stroke();
  const px = -0.76 + ilerle * 0.95;
  ctx.beginPath();
  ctx.rect(px - 0.07, -0.21, 0.14, 0.42);
  duz(ctx, L, '#8d969c', 1);
  ctx.beginPath();
  ctx.moveTo(-1.0, 0);
  ctx.lineTo(px - 0.06, 0);
  hatliCizgi(ctx, L, 0.06, '#7d868d');
  const a = donus(p, an, 1.6, hiz);
  daire(ctx, L, -1.12, 0.66, 0.28, '#3a3430', null);
  kolYolu(ctx, -1.12, 0.66, 0.03, 0.25, a, 5);
  ctx.strokeStyle = '#b4bbc2';
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

parcaCizimiTanimla('balya-presi', yerelCizim(presGovde, presHareketli));

// --- Çekiçli kıyıcı ---
function kiyiciGovde(ctx, L, p) {
  golge(ctx, L, -0.9, -0.9, 1.8, 1.8, 0.9, 1.4);
  agizlar(ctx, L, p);
  ctx.beginPath();
  ctx.moveTo(-0.98, -0.5);
  ctx.lineTo(-0.5, -0.32);
  ctx.lineTo(-0.5, 0.32);
  ctx.lineTo(-0.98, 0.5);
  ctx.closePath();
  duz(ctx, L, '#b5552c');
  daire(ctx, L, 0.06, 0, 0.84, '#6d767c', '#b4bbc2', 0.1);
  ctx.beginPath();
  ctx.arc(0.08, 0.02, 0.62, 0, TUR);
  duz(ctx, L, '#2a2420', 0.8);
  const n = 12;
  const noktalar = [];
  for (let i = 0; i < n; i++) {
    noktalar.push([0.06 + Math.cos((i * TUR) / n) * 0.73, Math.sin((i * TUR) / n) * 0.73]);
  }
  percin(ctx, noktalar, 0.04, '#5d6469');
}

function kiyiciHareketli(ctx, L, p, an) {
  const kirik = durumu(p) === 'kirik';
  const hiz = kirik ? 0 : hizOrani(p);
  const a = donus(p, an, 3, hiz);
  if (hiz > 0) {
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const b = -a * 0.7 + i * 2.1;
      ctx.moveTo(0.08 + Math.cos(b) * 0.52, Math.sin(b) * 0.52);
      ctx.arc(0.08, 0, 0.52, b, b + 0.7);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = a + (i * TUR) / 4 + (kirik && i === 1 ? 0.9 : 0);
    const c = Math.cos(b);
    const s = Math.sin(b);
    ctx.moveTo(0.08 + c * 0.32 - s * 0.07, s * 0.32 + c * 0.07);
    ctx.lineTo(0.08 + c * 0.5 - s * 0.07, s * 0.5 + c * 0.07);
    ctx.lineTo(0.08 + c * 0.5 + s * 0.07, s * 0.5 - c * 0.07);
    ctx.lineTo(0.08 + c * 0.32 + s * 0.07, s * 0.32 - c * 0.07);
    ctx.closePath();
  }
  duz(ctx, L, '#c9cdd0', 0.9);
  kolYolu(ctx, 0.08, 0, 0.1, 0.33, a, 4);
  ctx.strokeStyle = '#5d6469';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  daire(ctx, L, 0.08, 0, 0.14, '#7a2a16', '#d4481f');
  if (kirik) {
    const t = an.zaman / 1000;
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.5 + k / 3) % 1;
      puf(ctx, 0.2 + u * 0.4, -0.2 - u * 0.6, 0.15 + u * 0.2,
        `rgba(70, 64, 58, ${0.6 * (1 - u)})`);
    }
  }
}

parcaCizimiTanimla('cekicli-kiyici', yerelCizim(kiyiciGovde, kiyiciHareketli));

// --- Gübre çukuru ---
const DIREK = [[-0.85, -0.85], [0, -0.88], [0.85, -0.85], [0.88, 0], [0.85, 0.85], [0, 0.88],
  [-0.85, 0.85], [-0.88, 0]];
const TOPAK = [[-0.15, 0.1, 0.42, '#6b4a26'], [0.22, -0.12, 0.34, '#7a5630'],
  [0.12, 0.28, 0.26, '#5e4020'], [-0.3, -0.25, 0.22, '#83603a']];

function gubreGovde(ctx, L) {
  golge(ctx, L, -0.85, -0.85, 1.7, 1.7, 0.3, 0.4);
  kutu(ctx, L, 0, 0, 1.62, 1.62, 0.32, '#3a2410', '#4e3418');
  ctx.beginPath();
  ctx.moveTo(-0.85, -0.85);
  for (const [x, y] of DIREK) ctx.lineTo(x, y);
  ctx.closePath();
  hatliCizgi(ctx, L, 0.06, '#b07a40');
  ctx.beginPath();
  for (const [x, y] of DIREK) ctx.rect(x - 0.08, y - 0.08, 0.16, 0.16);
  duz(ctx, L, '#7a5230', 0.9);
}

function gubreHareketli(ctx, L, p, an) {
  const doluluk = Math.max(0, Math.min(1, (p.ozel?.puan ?? 0) / 120));
  const t = an.zaman / 1000;
  if (doluluk > 0) {
    const k = 0.35 + doluluk * 0.65;
    for (const [x, y, r, renk] of TOPAK) puf(ctx, x * k, y * k, r * k, renk);
    ctx.strokeStyle = 'rgba(230, 220, 200, 0.35)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    const u = (t * 0.4) % 1;
    ctx.arc(-0.1, -0.05 - u * 0.3, 0.16, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.fillStyle = '#14100c';
  ctx.beginPath();
  for (const [h, r, x0, y0] of [[2.3, 0.3, 0.3, -0.35], [-3.1, 0.22, -0.4, 0.3]]) {
    const b = t * h + (p.id ?? 0);
    const x = x0 + Math.cos(b) * r;
    const y = y0 + Math.sin(b * 1.7) * r * 0.6;
    ctx.moveTo(x + 0.05, y);
    ctx.arc(x, y, 0.05, 0, TUR);
  }
  ctx.fill();
}

parcaCizimiTanimla('gubre-cukuru', yerelCizim(gubreGovde, gubreHareketli));
