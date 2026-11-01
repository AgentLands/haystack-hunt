/**
 * Çiftlik çizimleri: Enerji ailesi (kuş bakışı; dönüş hızı güç/üretim oranıyla orantılı).
 * Üreticilerde p.oran "üretim / en çok üretim" sayılır (yel: şiddet, krank: süre, lokomobil:
 * yük); durum 'calisiyor' değilse (rüzgâr yok, yakıt yok) durur.
 * - el-kranki (1×1, yönsüz): perçinli dişli kutusu, dört yana aks uçları; hareketli: dönen
 *   dişli çark ve kırmızı saplı kol.
 * - yel-degirmeni (2×2, yönsüz): sekizgen ahşap kule, koyu başlık; hareketli: 4×4'e uzanan
 *   dört bezli kanat ve yerdeki gölgesi.
 * - lokomobil (3×2): kara kazan, kırmızı tekerlekler, arkada ocak, önde baca, yanda kasnak;
 *   hareketli: yükle koyulaşan baca dumanı, ocak ışığı (p.ozel.yakit > 0), dönen kasnak.
 * - saft (1×1, yönsüz): alçak kızak üstünde demir mil; bağlı yanlar p.bag (4 bit: doğu,
 *   güney, batı, kuzey; enerji ağı yazar, kayda girmez), yoksa doğu-batı. Hareketli: milde
 *   kayan burgu çizgileri.
 * - volan (2×2, yönsüz): demir ayaklar; hareketli: dökme demir çark, hızı doluluğa
 *   (p.ozel.enerji / 2400) bağlı, hızlıyken bulanık iz.
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, kutu, daire, duz, donus, hizOrani, puf, kolYolu, hatliCizgi,
  kanatYolu, percin, TUR,
} from './parca-ortak.js';

const DEMIR = ['#3a3430', '#5d5650'];

// --- El krankı ---
function krankGovde(ctx, L) {
  golge(ctx, L, -0.32, -0.32, 0.64, 0.64, 0.08, 1);
  ctx.beginPath();
  ctx.rect(-0.5, -0.07, 1, 0.14);
  ctx.rect(-0.07, -0.5, 0.14, 1);
  duz(ctx, L, '#7d868d', 0.9);
  kutu(ctx, L, 0, 0, 0.62, 0.62, 0.08, DEMIR[0], DEMIR[1]);
  percin(ctx, [[-0.22, -0.22], [0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]], 0.04);
}

function krankHareketli(ctx, L, p, an) {
  const a = donus(p, an, 0.8);
  kanatYolu(ctx, 0, 0, 0.36, 0.06, a, 8);
  duz(ctx, L, '#c9a040', 0.8);
  daire(ctx, L, 0, 0, 0.27, '#9c7a26', '#d8b450');
  const x = Math.cos(a) * 0.36;
  const y = Math.sin(a) * 0.36;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(x, y);
  hatliCizgi(ctx, L, 0.09, '#5d6469');
  daire(ctx, L, x, y, 0.12, '#7a2a16', '#d4481f');
}

parcaCizimiTanimla('el-kranki', yerelCizim(krankGovde, krankHareketli));

// --- Yel değirmeni ---
function yelGovde(ctx, L) {
  golge(ctx, L, -0.9, -0.9, 1.8, 1.8, 0.9, 2.4);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * TUR) / 8 + TUR / 16;
    ctx.lineTo(Math.cos(a) * 0.95, Math.sin(a) * 0.95);
  }
  ctx.closePath();
  duz(ctx, L, '#7a4a22');
  ctx.strokeStyle = 'rgba(60, 34, 14, 0.6)';
  ctx.lineWidth = 0.035;
  for (const r of [0.75, 0.55]) {
    ctx.beginPath();
    ctx.arc(L.isik[0] * 0.05, L.isik[1] * 0.05, r, 0, TUR);
    ctx.stroke();
  }
  daire(ctx, L, 0, 0, 0.42, '#5a3a1c', '#8a5a2c', 0.2);
}

const KANAT = 1.9;
function kanatlar(ctx, a, dx = 0, dy = 0) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const b = a + (i * TUR) / 4;
    const c = Math.cos(b);
    const s = Math.sin(b);
    ctx.moveTo(dx + c * 0.45 - s * 0.04, dy + s * 0.45 + c * 0.04);
    ctx.lineTo(dx + c * KANAT - s * 0.04, dy + s * KANAT + c * 0.04);
    ctx.lineTo(dx + c * KANAT - s * 0.36, dy + s * KANAT + c * 0.36);
    ctx.lineTo(dx + c * 0.55 - s * 0.3, dy + s * 0.55 + c * 0.3);
    ctx.closePath();
  }
}

function yelHareketli(ctx, L, p, an) {
  const a = donus(p, an, 0.35);
  kanatlar(ctx, a, L.golge[0] * 0.5, L.golge[1] * 0.5);
  ctx.fillStyle = 'rgba(40, 22, 8, 0.22)';
  ctx.fill();
  kanatlar(ctx, a);
  duz(ctx, L, '#efe3c4', 1);
  kolYolu(ctx, 0, 0, 0, KANAT, a, 4);
  hatliCizgi(ctx, L, 0.07, '#8a5a2c');
  daire(ctx, L, 0, 0, 0.14, '#3a3430', '#7d868d');
}

parcaCizimiTanimla('yel-degirmeni', yerelCizim(yelGovde, yelHareketli));

// --- Lokomobil ---
function lokoGovde(ctx, L, p) {
  golge(ctx, L, -1.45, -0.95, 2.9, 1.9, 0.2, 1.6);
  for (const [x, y, w, h] of [[-0.85, -0.82, 0.86, 0.24], [-0.85, 0.82, 0.86, 0.24],
    [0.95, -0.7, 0.6, 0.2], [0.95, 0.7, 0.6, 0.2]]) {
    kutu(ctx, L, x, y, w, h, 0.08, '#2a2521', '#3a332c');
    ctx.fillStyle = '#c8401f';
    ctx.fillRect(x - 0.08, y - h / 2 - 0.02, 0.16, h + 0.04);
  }
  kutu(ctx, L, 0.15, 0, 2.3, 0.96, 0.4, '#24201d', '#4d4740');
  ctx.strokeStyle = '#b8862e';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (const x of [-0.45, 0.2, 0.85]) {
    ctx.moveTo(x, -0.46);
    ctx.lineTo(x, 0.46);
  }
  ctx.stroke();
  kutu(ctx, L, -1.12, 0, 0.62, 1.16, 0.08, '#2e2b28', '#4a4540');
  ctx.beginPath();
  ctx.rect(-1.38, -0.22, 0.1, 0.44);
  duz(ctx, L, '#1a1410', 0.8);
  daire(ctx, L, 0.95, 0, 0.22, '#1e1a17', '#3d3833');
  puf(ctx, 0.96, 0.01, 0.12, '#0c0a08');
  daire(ctx, L, 0.1, -0.78, 0.28, '#7a2a16', '#c8401f');
}

function lokoHareketli(ctx, L, p, an) {
  const hiz = hizOrani(p);
  const a = donus(p, an, 1.2, hiz);
  if ((p.ozel?.yakit ?? 0) > 0 && hiz > 0) {
    const titre = 0.5 + 0.5 * Math.sin(an.zaman / 90);
    ctx.fillStyle = `rgba(255, ${140 + titre * 60}, 40, ${0.6 + titre * 0.3})`;
    ctx.fillRect(-1.37, -0.18, 0.08, 0.36);
    const koyu = Math.round(170 - hiz * 110);
    for (let k = 0; k < 4; k++) {
      const u = ((a / TUR) * 0.8 + k / 4) % 1;
      puf(ctx, 0.95 - u * 0.9, -u * 0.35, 0.14 + u * 0.24,
        `rgba(${koyu}, ${koyu - 6}, ${koyu - 12}, ${0.55 * (1 - u)})`);
    }
  }
  kolYolu(ctx, 0.1, -0.78, 0.04, 0.22, a, 4);
  ctx.strokeStyle = '#f0c8a0';
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

parcaCizimiTanimla('lokomobil', yerelCizim(lokoGovde, lokoHareketli));

// --- Şaft ---
const BX = [1, 0, -1, 0];
const BY = [0, 1, 0, -1];
const baglar = (p) => (Number.isInteger(p.bag) && p.bag > 0 ? p.bag : 0b0101);

function saftGovde(ctx, L, p) {
  const bag = baglar(p);
  ctx.fillStyle = '#5a3a1c';
  for (let y = 0; y < 4; y++) {
    if (!(bag & (1 << y))) continue;
    const yatay = BX[y] !== 0;
    const bas = Math.min(0, (BX[y] + BY[y]) * 0.5);
    for (const k of [-0.27, 0.17]) {
      if (yatay) ctx.fillRect(bas, k, 0.5, 0.1);
      else ctx.fillRect(k, bas, 0.1, 0.5);
    }
  }
  ctx.beginPath();
  for (let y = 0; y < 4; y++) {
    if (!(bag & (1 << y))) continue;
    ctx.moveTo(0, 0);
    ctx.lineTo(BX[y] * 0.5, BY[y] * 0.5);
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#2a1a0d';
  ctx.lineWidth = 0.16 + 2.4 * L.eb;
  ctx.stroke();
  ctx.strokeStyle = '#8d969c';
  ctx.lineWidth = 0.16;
  ctx.stroke();
  kutu(ctx, L, 0, 0, 0.26, 0.26, 0.04, DEMIR[0], DEMIR[1]);
}

function saftHareketli(ctx, L, p, an) {
  const bag = baglar(p);
  const u = ((donus(p, an, 1.5) / TUR) * 2) % 1;
  ctx.strokeStyle = '#3a3430';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let y = 0; y < 4; y++) {
    if (!(bag & (1 << y))) continue;
    for (const t of [0.2 + u * 0.14, 0.34 + u * 0.14]) {
      const x0 = BX[y] * t;
      const y0 = BY[y] * t;
      ctx.moveTo(x0 - BY[y] * 0.07 - BX[y] * 0.03, y0 - BX[y] * 0.07 - BY[y] * 0.03);
      ctx.lineTo(x0 + BY[y] * 0.07 + BX[y] * 0.03, y0 + BX[y] * 0.07 + BY[y] * 0.03);
    }
  }
  ctx.stroke();
}

parcaCizimiTanimla('saft', yerelCizim(saftGovde, saftHareketli));

// --- Volan ---
function volanGovde(ctx, L) {
  golge(ctx, L, -0.9, -0.9, 1.8, 1.8, 0.9, 1.2);
  for (const y of [-0.62, 0.62]) kutu(ctx, L, 0, y, 1.84, 0.26, 0.05, '#4a4f53', '#7d868d');
  percin(ctx, [[-0.8, -0.62], [0.8, -0.62], [-0.8, 0.62], [0.8, 0.62]], 0.05);
}

function volanHareketli(ctx, L, p, an) {
  const dolu = Math.max(0, Math.min(1, (p.ozel?.enerji ?? 0) / 2400));
  const a = donus(p, an, 1.6 * dolu, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 0.88, 0, TUR);
  ctx.arc(0, 0, 0.66, 0, TUR, true);
  duz(ctx, L, '#3a3836');
  ctx.beginPath();
  ctx.arc(0, 0, 0.8, Math.PI * 1.05, Math.PI * 1.55);
  ctx.strokeStyle = '#8a8682';
  ctx.lineWidth = 0.07;
  ctx.stroke();
  kolYolu(ctx, 0, 0, 0.15, 0.68, a, 6);
  hatliCizgi(ctx, L, 0.09, '#4f4c49');
  if (dolu > 0.5) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const b = a + i * 1.047 + 0.1;
      ctx.moveTo(Math.cos(b) * 0.45, Math.sin(b) * 0.45);
      ctx.arc(0, 0, 0.45, b, b + 0.45);
    }
    ctx.strokeStyle = `rgba(200, 196, 190, ${(dolu - 0.5) * 0.8})`;
    ctx.lineWidth = 0.18;
    ctx.stroke();
  }
  daire(ctx, L, 0, 0, 0.18, '#7a2a16', '#d4481f');
}

parcaCizimiTanimla('volan', yerelCizim(volanGovde, volanHareketli));
