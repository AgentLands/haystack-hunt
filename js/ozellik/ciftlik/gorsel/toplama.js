/**
 * Çiftlik çizimleri: Toplama ailesi (kuş bakışı, boyalı oyuncak; yön 0 = doğuya bakar).
 * - huni (emici huni, 2×2): ahşap kasnaklı huni, demir çember, önde ağız oluğu; hareketli:
 *   ağızda dönen dört kanatlı tahta çark ve huninin içine kayan saman (çekiyorken).
 * - tirmik-kolu (1×1): demir tabla; hareketli: dönen dört kollu yıldız tırmık (uçlarda
 *   tarak) ve halkada yay biçiminde tarak izleri.
 * - tas-toplayici (2×2): tahta platform üstünde perçinli dönen tabla; hareketli: uzun ahşap
 *   kol, ucunda taşlı sepet (tampon kadar taş).
 * Dönüş hızı güç oranıyla orantılıdır (parca-ortak.js donus/hizOrani). Okunan p.ozel
 * alanları: huni `son` (bu tik çekilen kat), taş toplayıcı `tampon` (sayı ya da dizi).
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, daire, kutu, tahta, percin, agizlar, donus, hizOrani, adet,
  kanatYolu, kolYolu, hatliCizgi, duz, TUR,
} from './parca-ortak.js';

// --- Emici huni ---
function huniGovde(ctx, L, p) {
  golge(ctx, L, -0.95, -0.95, 1.9, 1.9, 0.2, 1.4);
  for (const [x, y] of [[-0.78, -0.78], [-0.78, 0.78], [0.78, -0.78], [0.78, 0.78]]) {
    kutu(ctx, L, x, y, 0.32, 0.32, 0.05, '#5a3a1c', '#8a5a2c');
  }
  // Ağız oluğu: kasnaktan öne (ağız karolarına) açılan tahta dil.
  ctx.beginPath();
  ctx.moveTo(0.3, -0.55);
  ctx.lineTo(0.98, -0.7);
  ctx.lineTo(0.98, 0.7);
  ctx.lineTo(0.3, 0.55);
  ctx.closePath();
  duz(ctx, L, '#b8844a');
  ctx.fillStyle = '#d8a564';
  ctx.fillRect(0.5, -0.5, 0.42, 0.12);
  daire(ctx, L, 0, 0, 0.86, '#7a4a22', '#b07a40', 0.1);
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.6)';
  ctx.lineWidth = 0.035;
  kolYolu(ctx, 0, 0, 0.62, 0.84, 0.2, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.8, 0, TUR);
  ctx.strokeStyle = '#5d6469';
  ctx.lineWidth = 0.07;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.6, 0, TUR);
  duz(ctx, L, '#4a2c14');
  ctx.beginPath();
  ctx.arc(0.05, 0.05, 0.4, 0, TUR);
  ctx.fillStyle = '#33200f';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.08, 0.08, 0.18, 0, TUR);
  ctx.fillStyle = '#1c1008';
  ctx.fill();
  agizlar(ctx, L, p, false);
}

function huniHareketli(ctx, L, p, an) {
  const hiz = hizOrani(p);
  const a = donus(p, an, 1.2, hiz);
  if (hiz > 0 && (p.ozel?.son ?? 0) > 0) {
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const b = -a * 1.5 + (i * TUR) / 3;
      ctx.moveTo(Math.cos(b) * 0.52, Math.sin(b) * 0.52);
      ctx.arc(0, 0, 0.52, b, b + 0.9);
    }
    ctx.stroke();
  }
  kanatYolu(ctx, 0.92, 0, 0.5, 0.09, a);
  duz(ctx, L, '#c99252');
  daire(ctx, L, 0.92, 0, 0.12, '#5d6469', '#b4bbc2');
}

parcaCizimiTanimla('huni', yerelCizim(huniGovde, huniHareketli));

// --- Tırmık kolu ---
function tirmikGovde(ctx, L, p) {
  golge(ctx, L, -0.4, -0.4, 0.8, 0.8, 0.12);
  tahta(ctx, L, 0, 0, 0.78, 0.78, '#6a4424', '#946234', 0.26);
  // Yığma noktası işareti: öne bakan saman rengi üçgen.
  ctx.beginPath();
  ctx.moveTo(0.48, 0);
  ctx.lineTo(0.3, -0.18);
  ctx.lineTo(0.3, 0.18);
  ctx.closePath();
  duz(ctx, L, '#e3b341', 1);
  daire(ctx, L, 0, 0, 0.27, '#454b50', '#7d868d');
  agizlar(ctx, L, p, false);
}

function tirmikHareketli(ctx, L, p, an) {
  const a = donus(p, an, 0.45);
  ctx.strokeStyle = 'rgba(90, 58, 24, 0.35)';
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = a + (i * TUR) / 4;
    for (const r of [1.45, 1.85]) {
      ctx.moveTo(Math.cos(b - 0.15) * r, Math.sin(b - 0.15) * r);
      ctx.arc(0, 0, r, b - 0.15, b - 0.85, true);
    }
  }
  ctx.stroke();
  kolYolu(ctx, 0, 0, 0.1, 0.72, a, 4);
  hatliCizgi(ctx, L, 0.1, '#b07a40');
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = a + (i * TUR) / 4;
    const c = Math.cos(b);
    const s = Math.sin(b);
    ctx.moveTo(c * 0.74 - s * 0.24, s * 0.74 + c * 0.24);
    ctx.lineTo(c * 0.74 + s * 0.24, s * 0.74 - c * 0.24);
  }
  hatliCizgi(ctx, L, 0.08, '#7d868d');
  daire(ctx, L, 0, 0, 0.13, '#9a3217', '#d4481f');
}

parcaCizimiTanimla('tirmik-kolu', yerelCizim(tirmikGovde, tirmikHareketli));

// --- Taş toplayıcı ---
const TASLAR = [[0.1, -0.08, 0.1], [-0.1, 0.07, 0.09], [0.12, 0.1, 0.08], [-0.12, -0.1, 0.08]];

function tasGovde(ctx, L, p) {
  golge(ctx, L, -0.95, -0.95, 1.9, 1.9, 0.15);
  tahta(ctx, L, 0, 0, 1.86, 1.86, '#6a4424', '#9c6a3a', 0.31);
  daire(ctx, L, 0, 0, 0.66, '#4a4f53', '#8a9196', 0.12);
  const n = 10;
  const noktalar = [];
  for (let i = 0; i < n; i++) {
    noktalar.push([Math.cos((i * TUR) / n) * 0.55, Math.sin((i * TUR) / n) * 0.55]);
  }
  percin(ctx, noktalar, 0.045, '#d5d9dc');
  daire(ctx, L, 0, 0, 0.2, '#9a3217', '#d4481f');
  agizlar(ctx, L, p, false);
}

function tasHareketli(ctx, L, p, an) {
  const a = donus(p, an, 0.15);
  const c = Math.cos(a);
  const s = Math.sin(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(c * 1.05, s * 1.05);
  hatliCizgi(ctx, L, 0.16, '#a8743a');
  // Sepet: kola dik dikdörtgen (dönmüş köşeler elle), içinde tampon kadar taş.
  const bx = c * 1.2;
  const by = s * 1.2;
  ctx.beginPath();
  ctx.moveTo(bx - c * 0.2 - s * 0.28, by - s * 0.2 + c * 0.28);
  ctx.lineTo(bx + c * 0.2 - s * 0.28, by + s * 0.2 + c * 0.28);
  ctx.lineTo(bx + c * 0.2 + s * 0.28, by + s * 0.2 - c * 0.28);
  ctx.lineTo(bx - c * 0.2 + s * 0.28, by - s * 0.2 - c * 0.28);
  ctx.closePath();
  duz(ctx, L, '#b07e40');
  ctx.strokeStyle = 'rgba(90, 55, 20, 0.7)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (const k of [-0.1, 0.1]) {
    ctx.moveTo(bx - c * 0.17 - s * k, by - s * 0.17 + c * k);
    ctx.lineTo(bx + c * 0.17 - s * k, by + s * 0.17 + c * k);
  }
  ctx.stroke();
  const n = Math.min(4, adet(p.ozel?.tampon));
  if (n <= 0) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y, r] = TASLAR[i];
    const tx = bx + c * x - s * y;
    const ty = by + s * x + c * y;
    ctx.moveTo(tx + r, ty);
    ctx.arc(tx, ty, r, 0, TUR);
  }
  duz(ctx, L, '#a39d90', 0.8);
}

parcaCizimiTanimla('tas-toplayici', yerelCizim(tasGovde, tasHareketli));
