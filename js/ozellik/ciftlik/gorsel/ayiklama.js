/**
 * Çiftlik çizimleri: Ayıklama ailesi (kuş bakışı, yön 0 = akış doğuya; sağ = güney).
 * - oluk-miknatisi (1×1 hat): bant oluğu üstünde kırmızı at nalı mıknatıs, kenarda 6 çentikli
 *   tutucu; dolan çentikte pas renkli çivi (p.ozel.tutucu: sayı ya da dizi, en çok 6).
 * - miknatisli-tambur (2×1): demir kasnaklar arasında yatık çelik tambur, sağ yarısında
 *   kırmızı mıknatıs alanı; hareketli: dönen tambur çizgileri ve üstünde taşınan çiviler.
 * - kalbur (2×1): sehpa üstünde delikli kalbur; hareketli: sallanan tahta çember, alttan
 *   sağ ağza düşen kırıntı; sıvalıyken (p.ozel.siva ≥ 4) delikleri kapatan çamur lekeleri.
 * - tinaz (3×3): taş halkalı harman dairesi, ortada yabası saplı tınaz yığını; hareketli:
 *   rüzgâr oku ve rüzgârın gittiği yana savrulan zerreler (eksen boyunca/durgunsa dibe).
 * - seytan-yeli (2×2): kırmızı boyalı ahşap kasa, arkada huni, önde eğik elek; hareketli:
 *   yanda kollu fan çarkı, sol ağızdan toz bulutu.
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, kutu, daire, oluk, citalar, duz, donus, hizOrani, adet, agizlar, puf,
  kolYolu, hatliCizgi, havaGorsel, tahta, percin, TUR,
} from './parca-ortak.js';

const PAS = '#a0522d';

// --- Oluk mıknatısı ---
function olukMGovde(ctx, L) {
  oluk(ctx, L);
  kutu(ctx, L, 0, -0.38, 0.92, 0.2, 0.04, '#3a3430', '#5d5650');
  ctx.fillStyle = '#211c18';
  for (let i = 0; i < 6; i++) ctx.fillRect(-0.4 + i * 0.145, -0.43, 0.075, 0.1);
}

function olukMHareketli(ctx, L, p, an) {
  if (hizOrani(p) > 0) citalar(ctx, an.faz, -0.5, 0.5, 0.3);
  const n = Math.min(6, adet(p.ozel?.tutucu));
  ctx.fillStyle = PAS;
  for (let i = 0; i < n; i++) ctx.fillRect(-0.41 + i * 0.145, -0.45, 0.095, 0.14);
  ctx.beginPath();
  ctx.arc(0.02, 0.02, 0.27, -Math.PI / 2, Math.PI / 2);
  hatliCizgi(ctx, L, 0.13, '#c8401f');
  ctx.beginPath();
  ctx.rect(-0.2, -0.33, 0.22, 0.13);
  ctx.rect(-0.2, 0.16, 0.22, 0.13);
  duz(ctx, L, n >= 6 ? '#e8d27a' : '#b4bbc2', 1);
}

parcaCizimiTanimla('oluk-miknatisi', yerelCizim(olukMGovde, olukMHareketli));

// --- Mıknatıslı tambur ---
function tamburGovde(ctx, L, p) {
  golge(ctx, L, -1, -0.47, 2, 0.94, 0.1, 1.2);
  agizlar(ctx, L, p);
  kutu(ctx, L, 0, 0, 1.6, 0.76, 0.3, '#3d5560', '#7d99a4');
  ctx.beginPath();
  ctx.rect(-0.78, 0.08, 1.56, 0.26);
  ctx.fillStyle = 'rgba(200, 64, 31, 0.55)';
  ctx.fill();
  for (const x of [-0.88, 0.88]) kutu(ctx, L, x, 0, 0.18, 0.94, 0.04, '#2e2b28', '#55504a');
  percin(ctx, [[-0.88, -0.32], [-0.88, 0.32], [0.88, -0.32], [0.88, 0.32]], 0.045);
}

function tamburHareketli(ctx, L, p, an) {
  const a = donus(p, an, 0.7);
  ctx.strokeStyle = 'rgba(30, 40, 46, 0.75)';
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  const civi = [];
  for (let k = 0; k < 8; k++) {
    const t = a + (k * TUR) / 8;
    if (Math.cos(t) <= 0.1) continue;
    const y = Math.sin(t) * 0.36;
    ctx.moveTo(-0.76, y);
    ctx.lineTo(0.76, y);
    if (k % 3 === 0 && y > 0) civi.push(y);
  }
  ctx.stroke();
  ctx.strokeStyle = PAS;
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const y of civi) {
    ctx.moveTo(-0.2, y - 0.03);
    ctx.lineTo(0.05, y + 0.03);
  }
  ctx.stroke();
}

parcaCizimiTanimla('miknatisli-tambur', yerelCizim(tamburGovde, tamburHareketli));

// --- Kalbur ---
function kalburGovde(ctx, L, p) {
  golge(ctx, L, -0.95, -0.45, 1.9, 0.9, 0.3, 0.8);
  agizlar(ctx, L, p);
  for (const x of [-0.72, 0.72]) kutu(ctx, L, x, 0, 0.14, 0.96, 0.03, '#5a3a1c', '#7a5230');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.84, 0.38, 0, 0, TUR);
  ctx.fillStyle = '#a07a4a';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#4a3420';
  for (let y = -0.33; y < 0.36; y += 0.12) {
    for (let x = -0.8 + ((y * 50) & 1) * 0.06; x < 0.82; x += 0.12) ctx.fillRect(x, y, 0.06, 0.06);
  }
  ctx.restore();
}

function kalburHareketli(ctx, L, p, an) {
  const hiz = hizOrani(p);
  const a = donus(p, an, 5, hiz);
  const dx = Math.sin(a) * 0.035 * (hiz > 0 ? 1 : 0);
  if ((p.ozel?.siva ?? 0) >= 4) {
    for (const [x, y, r] of [[-0.4, -0.1, 0.17], [0.15, 0.1, 0.2], [0.5, -0.12, 0.13]]) {
      puf(ctx, x + dx, y, r, '#5b4128');
    }
  }
  ctx.beginPath();
  ctx.ellipse(dx, 0, 0.86, 0.4, 0, 0, TUR);
  hatliCizgi(ctx, L, 0.08, '#c99252');
  if (hiz <= 0) return;
  ctx.fillStyle = '#e3b341';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const u = ((a / TUR) * 0.4 + k / 3) % 1;
    ctx.rect(0.2 + k * 0.18, 0.12 + u * 0.36, 0.06, 0.06);
  }
  ctx.fill();
}

parcaCizimiTanimla('kalbur', yerelCizim(kalburGovde, kalburHareketli));

// --- Tınaz ---
function tinazGovde(ctx, L, p) {
  golge(ctx, L, -1.45, -1.45, 2.9, 2.9, 1.45, 0.5);
  agizlar(ctx, L, p);
  daire(ctx, L, 0, 0, 1.42, '#86643f', '#a8845a', 0.06);
  const n = 22;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t = (i * TUR) / n;
    ctx.moveTo(Math.cos(t) * 1.36 + 0.09, Math.sin(t) * 1.36);
    ctx.arc(Math.cos(t) * 1.36, Math.sin(t) * 1.36, 0.09, 0, TUR);
  }
  duz(ctx, L, '#a39d90', 0.8);
  daire(ctx, L, 0, 0, 0.62, '#b8862e', '#e3b341', 0.18);
  ctx.strokeStyle = '#9a6e22';
  ctx.lineWidth = 0.04;
  kolYolu(ctx, 0, 0, 0.18, 0.55, 0.4, 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.95, 0.75);
  ctx.lineTo(-0.15, 0.1);
  hatliCizgi(ctx, L, 0.08, '#b07a40');
  ctx.beginPath();
  ctx.moveTo(-0.2, 0.03);
  ctx.lineTo(0.05, -0.12);
  ctx.moveTo(-0.13, 0.13);
  ctx.lineTo(0.12, -0.02);
  hatliCizgi(ctx, L, 0.045, '#b4bbc2');
}

const RX = [1, 0, -1, 0];
const RY = [0, 1, 0, -1];
function tinazHareketli(ctx, L, p, an) {
  const r = (havaGorsel.yon - p.yon) & 3;
  const dik = (r & 1) === 1 && havaGorsel.siddet > 0;
  const [wx, wy] = [RX[r], RY[r]];
  ctx.beginPath();
  ctx.moveTo(wx * 1.08 - wy * 0.0, wy * 1.08);
  ctx.lineTo(wx * 0.82 - wy * 0.16, wy * 0.82 + wx * 0.16);
  ctx.lineTo(wx * 0.82 + wy * 0.16, wy * 0.82 - wx * 0.16);
  ctx.closePath();
  duz(ctx, L, havaGorsel.siddet > 0 ? '#f4ecd8' : '#8a857c', 1);
  const hiz = hizOrani(p);
  if (hiz <= 0) return;
  const t = donus(p, an, dik ? 0.4 + havaGorsel.siddet * 0.2 : 0.3, hiz) / TUR;
  const [dx, dy] = dik ? [wx, wy] : [1, 0];
  const boy = dik ? 0.95 : 0.75;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const u = (t * 2 + k / 8) % 1;
    const yan = ((k * 37) % 9) / 9 - 0.5;
    const x = dx * (0.55 + u * boy) - dy * yan * (0.4 + u * 0.5);
    const y = dy * (0.55 + u * boy) + dx * yan * (0.4 + u * 0.5);
    const e = (k & 1 ? 0.09 : -0.09);
    ctx.moveTo(x - dx * 0.08 - dy * e, y - dy * 0.08 + dx * e);
    ctx.lineTo(x + dx * 0.08 + dy * e, y + dy * 0.08 - dx * e);
  }
  hatliCizgi(ctx, L, 0.06, dik ? '#fff0c0' : '#e3b341');
}

parcaCizimiTanimla('tinaz', yerelCizim(tinazGovde, tinazHareketli));

// --- Şeytan yeli ---
function seytanGovde(ctx, L, p) {
  golge(ctx, L, -0.9, -0.85, 1.8, 1.7, 0.1, 1.4);
  agizlar(ctx, L, p);
  kutu(ctx, L, -0.05, 0, 1.6, 1.5, 0.08, '#7a2c14', '#b5552c');
  tahta(ctx, L, -0.5, 0, 0.6, 1.1, '#8a5a2c', '#c99252', 0.22);
  ctx.beginPath();
  ctx.rect(0.22, -0.56, 0.5, 1.12);
  duz(ctx, L, '#6a4a2a', 1);
  ctx.strokeStyle = '#d8b878';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(0.26, -0.5 + i * 0.2);
    ctx.lineTo(0.68, -0.4 + i * 0.2);
  }
  ctx.stroke();
  kutu(ctx, L, -0.05, 0.78, 0.5, 0.16, 0.04, '#2e2b28', '#55504a');
}

function seytanHareketli(ctx, L, p, an) {
  const hiz = hizOrani(p);
  const a = donus(p, an, 1.1, hiz);
  if (hiz > 0) {
    for (let k = 0; k < 3; k++) {
      const u = ((a / TUR) * 1.5 + k / 3) % 1;
      puf(ctx, 0.5 + k * 0.12, -0.8 - u * 0.5, 0.12 + u * 0.16,
        `rgba(214, 196, 160, ${0.55 * (1 - u)})`);
    }
  }
  daire(ctx, L, -0.05, 0.86, 0.3, '#3a3430', null);
  kolYolu(ctx, -0.05, 0.86, 0.04, 0.27, a, 5);
  ctx.strokeStyle = '#b4bbc2';
  ctx.lineWidth = 0.05;
  ctx.stroke();
  const hx = -0.05 + Math.cos(a) * 0.24;
  const hy = 0.86 + Math.sin(a) * 0.24;
  daire(ctx, L, hx, hy, 0.07, '#7a4a22', '#c99252');
}

parcaCizimiTanimla('seytan-yeli', yerelCizim(seytanGovde, seytanHareketli));
