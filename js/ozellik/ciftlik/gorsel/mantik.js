/**
 * Çiftlik çizimleri: Mantık ailesi (renk kanalları; sistemler.md §2). Her parçanın sol arka
 * köşesinde kendi kanal renginde lamba vardır (p.ozel.renk 0..5: kırmızı, çivit, sarı, yeşil,
 * mor, beyaz); p.ozel.sinyal > 0 iken yanar (yazıcıda bu tik yazdı, okuyucuda okunan açık).
 * - ruzgar-gulu (1×1): taş kaide ve pusula haçı (parça ekseni çentikli); hareketli:
 *   rüzgârın gittiği yöne dönen horozlu demir gül (havaGorsel), şiddetle titrer.
 * - savak-kapagi (1×1 hat): oluğun iki yanında taş ayaklar; hareketli: sürgülü tahta kapak
 *   (p.ozel.kapali: oluğu keser, çıtalar durur; açıkken yan yuvaya çekilmiş).
 * - kantar (1×1, yönsüz): baklava desenli demir tabla, pirinç kefe, kadran; hareketli: kadranda
 *   doluluk ibresi (p.ozel.olcum 0..1024).
 * - kile-sayaci (1×1 hat): oluğun üstünde çemberli ahşap kile; hareketli: çıtalar ve kenarda
 *   beşli çentik sayacı (p.ozel.sayi / p.ozel.n, en çok 10 çentik).
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, kutu, daire, oluk, citalar, duz, hizOrani, lamba, havaGorsel,
  hatliCizgi, TUR,
} from './parca-ortak.js';

const LX = -0.33;
const LY = -0.33;
const yanik = (p) => (p.ozel?.sinyal ?? 0) > 0;
const kanal = (p) => p.ozel?.renk ?? 0;

// --- Rüzgâr gülü ---
function gulGovde(ctx, L) {
  golge(ctx, L, -0.3, -0.3, 0.6, 0.6, 0.3, 0.6);
  daire(ctx, L, 0, 0, 0.32, '#77736b', '#a39d90');
  ctx.strokeStyle = '#3a3430';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(-0.42, 0);
  ctx.lineTo(0.42, 0);
  ctx.moveTo(0, -0.42);
  ctx.lineTo(0, 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.48, 0);
  ctx.lineTo(0.38, -0.07);
  ctx.lineTo(0.38, 0.07);
  ctx.closePath();
  duz(ctx, L, '#3a3430', 0.6);
}

function gulHareketli(ctx, L, p, an) {
  const sid = havaGorsel.siddet;
  const titre = sid > 0 ? Math.sin(an.zaman / (140 - sid * 25)) * 0.05 * sid : 0;
  const a = ((havaGorsel.yon - p.yon) & 3) * (Math.PI / 2) + titre;
  ctx.save();
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(-0.34, 0);
  ctx.lineTo(0.3, 0);
  hatliCizgi(ctx, L, 0.06, '#3a3430');
  ctx.beginPath();
  ctx.moveTo(0.48, 0);
  ctx.lineTo(0.28, -0.12);
  ctx.lineTo(0.28, 0.12);
  ctx.closePath();
  // Horoz: kuyruk yelpazesi arka uçta, gövde ve gaga öne bakar.
  ctx.moveTo(-0.02, -0.02);
  ctx.lineTo(0.04, -0.2);
  ctx.lineTo(-0.1, -0.16);
  ctx.quadraticCurveTo(-0.22, -0.1, -0.3, -0.24);
  ctx.lineTo(-0.48, -0.3);
  ctx.lineTo(-0.4, -0.06);
  ctx.lineTo(-0.5, 0.14);
  ctx.quadraticCurveTo(-0.22, 0.16, -0.02, -0.02);
  duz(ctx, L, '#4a4540', 0.9);
  ctx.fillStyle = '#d4481f';
  ctx.fillRect(-0.06, -0.24, 0.08, 0.07);
  ctx.restore();
  ctx.fillStyle = '#b4bbc2';
  ctx.fillRect(-0.05, -0.05, 0.1, 0.1);
  lamba(ctx, L, LX, LY, kanal(p), yanik(p), 0.13);
}

parcaCizimiTanimla('ruzgar-gulu', yerelCizim(gulGovde, gulHareketli));

// --- Savak kapağı ---
function savakGovde(ctx, L) {
  oluk(ctx, L);
  for (const y of [-0.38, 0.38]) kutu(ctx, L, 0.05, y, 0.3, 0.2, 0.04, '#77736b', '#b3ada0');
}

function savakHareketli(ctx, L, p, an) {
  const kapali = !!p.ozel?.kapali;
  if (!kapali && hizOrani(p) > 0) citalar(ctx, an.faz);
  if (kapali) {
    kutu(ctx, L, 0.05, 0, 0.17, 0.62, 0.03, '#6a3a1c', '#9a5a2c');
    ctx.fillStyle = '#4d5358';
    ctx.fillRect(-0.03, -0.12, 0.16, 0.05);
    ctx.fillRect(-0.03, 0.08, 0.16, 0.05);
  } else {
    kutu(ctx, L, 0.05, -0.44, 0.17, 0.16, 0.03, '#6a3a1c', '#9a5a2c');
  }
  lamba(ctx, L, -0.36, -0.36, kanal(p), yanik(p), 0.12);
}

parcaCizimiTanimla('savak-kapagi', yerelCizim(savakGovde, savakHareketli));

// --- Kantar ---
function kantarGovde(ctx, L) {
  golge(ctx, L, -0.44, -0.44, 0.88, 0.88, 0.05, 0.6);
  kutu(ctx, L, 0, 0, 0.88, 0.88, 0.05, '#4a4f53', '#7d868d');
  ctx.strokeStyle = 'rgba(40, 44, 48, 0.55)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (let t = -0.36; t <= 0.37; t += 0.18) {
    ctx.moveTo(t, -0.36);
    ctx.lineTo(0.36, -t);
    ctx.moveTo(-0.36, t);
    ctx.lineTo(-t, 0.36);
  }
  ctx.stroke();
  daire(ctx, L, 0.17, 0.17, 0.22, '#8a6418', '#d8b450');
  daire(ctx, L, -0.12, 0.02, 0.2, '#b8ae98', '#f4ecd8');
  ctx.strokeStyle = '#2a1a0d';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const a = Math.PI * 0.75 + (i * Math.PI * 1.5) / 4;
    ctx.moveTo(-0.12 + Math.cos(a) * 0.13, 0.02 + Math.sin(a) * 0.13);
    ctx.lineTo(-0.12 + Math.cos(a) * 0.18, 0.02 + Math.sin(a) * 0.18);
  }
  ctx.stroke();
}

function kantarHareketli(ctx, L, p) {
  const o = Math.max(0, Math.min(1024, p.ozel?.olcum ?? 0)) / 1024;
  const a = Math.PI * 0.75 + o * Math.PI * 1.5;
  ctx.beginPath();
  ctx.moveTo(-0.12, 0.02);
  ctx.lineTo(-0.12 + Math.cos(a) * 0.16, 0.02 + Math.sin(a) * 0.16);
  ctx.strokeStyle = '#c8401f';
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  ctx.stroke();
  lamba(ctx, L, LX, LY, kanal(p), yanik(p), 0.12);
}

parcaCizimiTanimla('kantar', yerelCizim(kantarGovde, kantarHareketli));

// --- Kile sayacı ---
function kileGovde(ctx, L) {
  oluk(ctx, L);
  ctx.beginPath();
  ctx.arc(0.02, 0, 0.32, 0, TUR);
  ctx.arc(0.02, 0, 0.21, 0, TUR, true);
  duz(ctx, L, '#a8743a');
  ctx.beginPath();
  ctx.arc(0.02, 0, 0.28, 0, TUR);
  ctx.strokeStyle = '#5d6469';
  ctx.lineWidth = 0.04;
  ctx.stroke();
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(-0.44, 0.33, 0.88, 0.13);
}

function kileHareketli(ctx, L, p, an) {
  const o = p.ozel ?? {};
  if (hizOrani(p) > 0) citalar(ctx, an.faz, -0.18, 0.2, 0.2);
  const n = Math.max(1, o.n ?? 10);
  const cent = Math.min(10, Math.round((Math.min(o.sayi ?? 0, n) / n) * 10));
  ctx.strokeStyle = '#2a1a0d';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let i = 0; i < cent; i++) {
    const grup = Math.floor(i / 5);
    const x = -0.38 + grup * 0.42 + (i % 5) * 0.07;
    if (i % 5 === 4) {
      ctx.moveTo(x - 0.3, 0.44);
      ctx.lineTo(x + 0.02, 0.35);
    } else {
      ctx.moveTo(x, 0.35);
      ctx.lineTo(x, 0.44);
    }
  }
  ctx.stroke();
  lamba(ctx, L, LX, LY, kanal(p), yanik(p), 0.12);
}

parcaCizimiTanimla('kile-sayaci', yerelCizim(kileGovde, kileHareketli));
