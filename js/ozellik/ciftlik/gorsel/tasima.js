/**
 * Çiftlik çizimleri: Taşıma ailesi (bant temel.js'te / altyapıda; yön 0 = doğuya akar).
 * - menfez (1×1, çift uç): bant oluğu taş kemerli yarım daire ağza girer (giriş) ya da
 *   ağızdan çıkar (çıkış; ayna); arkasında toprak tümsek. Hareketli: oluk çıtaları (an.faz).
 *   Uç `p.ozel.uc === 'cikis'` (ya da anahtar 'menfez-cikis') ise çıkış ağzıdır.
 * - catal (1×1): T biçimli oluk üstünde üç dişli demir yaba; hareketli: ortada sıradaki
 *   çıkışı (p.ozel.sira: 0 sol, 1 ön, 2 sağ) gösteren dönen sarı ok.
 * - birlestirme-olugu (1×1): arkadan, soldan ve sağdan gelen üç kanallı, öne daralan Y
 *   biçimli açık tahta oluk; hareketli: kanallarda öne akan çentikler (güç oranı/çalışma).
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, kutu, oluk, citalar, duz, donus, hizOrani, durumu, hatliCizgi, TUR,
} from './parca-ortak.js';

// --- Menfez ---
const TAS = ['#8f8a80', '#c2bcae'];

function menfezGovde(ctx, L, p, cikis) {
  const d = cikis ? -1 : 1;
  oluk(ctx, L, cikis ? 0.02 : -0.5, cikis ? 0.5 : -0.02);
  // Toprak tümsek (hat yer altına iner).
  ctx.beginPath();
  ctx.ellipse(d * 0.26, 0, 0.26, 0.47, 0, 0, TUR);
  duz(ctx, L, '#7a5a3a', 1);
  // Taş kemer: ağza bakan yarım halka, derz çizgileri.
  const a0 = cikis ? Math.PI / 2 : -Math.PI / 2;
  ctx.beginPath();
  ctx.arc(d * 0.1, 0, 0.44, a0, a0 + Math.PI);
  ctx.arc(d * 0.1, 0, 0.25, a0 + Math.PI, a0, true);
  ctx.closePath();
  duz(ctx, L, TAS[0]);
  ctx.beginPath();
  ctx.arc(d * 0.1 + L.isik[0] * 0.03, L.isik[1] * 0.03, 0.37, a0 + 0.15, a0 + Math.PI - 0.15);
  ctx.strokeStyle = TAS[1];
  ctx.lineWidth = 0.08;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42, 26, 13, 0.7)';
  ctx.lineWidth = Math.max(0.025, L.eb);
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const a = a0 + (i * Math.PI) / 5;
    ctx.moveTo(d * 0.1 + Math.cos(a) * 0.26, Math.sin(a) * 0.26);
    ctx.lineTo(d * 0.1 + Math.cos(a) * 0.43, Math.sin(a) * 0.43);
  }
  ctx.stroke();
  // Karanlık ağız: oluğun girdiği yarım daire.
  ctx.beginPath();
  ctx.arc(d * 0.1, 0, 0.24, a0, a0 + Math.PI);
  ctx.lineTo(-d * 0.06, 0.24 * d);
  ctx.lineTo(-d * 0.06, -0.24 * d);
  ctx.closePath();
  ctx.fillStyle = '#1c1008';
  ctx.fill();
}

function menfezHareketli(ctx, L, p, an, cikis) {
  if (durumu(p) === 'essiz' || !p.etkin) return;
  if (cikis) citalar(ctx, an.faz, 0.06, 0.5);
  else citalar(ctx, an.faz, -0.5, -0.08);
}

const menfezUcu = (p) => p.ozel?.uc === 'cikis' || p.ozel?.cikis === true;
parcaCizimiTanimla('menfez', yerelCizim(
  (ctx, L, p) => menfezGovde(ctx, L, p, menfezUcu(p)),
  (ctx, L, p, an) => menfezHareketli(ctx, L, p, an, menfezUcu(p)),
));
for (const [ad, cikis] of [['menfez-giris', false], ['menfez-cikis', true]]) {
  parcaCizimiTanimla(ad, yerelCizim(
    (ctx, L, p) => menfezGovde(ctx, L, p, cikis),
    (ctx, L, p, an) => menfezHareketli(ctx, L, p, an, cikis),
  ));
}

// --- Çatal ---
const CATAL_UC = [[0, -0.42], [0.42, 0], [0, 0.42]];

/** Tek yaba dişi (merkezden uca), ucu sivri. */
function dis(ctx, [x, y]) {
  ctx.moveTo(x * 0.25, y * 0.25);
  ctx.lineTo(x, y);
}

function catalGovde(ctx, L) {
  golge(ctx, L, -0.46, -0.46, 0.92, 0.92, 0.08, 0.6);
  kutu(ctx, L, 0, 0, 0.9, 0.9, 0.08, '#4a3a2b', '#5c4836');
  ctx.fillStyle = '#6e5a44';
  ctx.fillRect(-0.45, -0.14, 0.9, 0.28);
  ctx.fillRect(-0.14, -0.45, 0.28, 0.9);
  ctx.beginPath();
  ctx.moveTo(-0.46, 0);
  ctx.lineTo(-0.05, 0);
  hatliCizgi(ctx, L, 0.12, '#b07a40');
  ctx.beginPath();
  for (const uc of CATAL_UC) dis(ctx, uc);
  hatliCizgi(ctx, L, 0.08, '#9aa1a6');
}

function catalHareketli(ctx, L, p) {
  const sira = p.ozel?.sira;
  const uc = CATAL_UC[Number.isInteger(sira) ? ((sira % 3) + 3) % 3 : 1];
  ctx.beginPath();
  dis(ctx, uc);
  hatliCizgi(ctx, L, 0.1, hizOrani(p) > 0 ? '#f2c440' : '#c9b48a');
  const [x, y] = uc;
  ctx.beginPath();
  ctx.moveTo(x * 1.08, y * 1.08);
  ctx.lineTo(x * 0.7 - y * 0.4, y * 0.7 + x * 0.4);
  ctx.lineTo(x * 0.7 + y * 0.4, y * 0.7 - x * 0.4);
  ctx.closePath();
  duz(ctx, L, '#f2c440', 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, 0.11, 0, TUR);
  duz(ctx, L, '#5d6469', 0.9);
}

parcaCizimiTanimla('catal', yerelCizim(catalGovde, catalHareketli));

// --- Birleştirme oluğu ---
function olukGovde(ctx, L) {
  golge(ctx, L, -0.46, -0.46, 0.92, 0.92, 0.1, 0.6);
  ctx.beginPath();
  ctx.moveTo(-0.47, -0.47);
  ctx.lineTo(0.05, -0.47);
  ctx.lineTo(0.47, -0.2);
  ctx.lineTo(0.47, 0.2);
  ctx.lineTo(0.05, 0.47);
  ctx.lineTo(-0.47, 0.47);
  ctx.closePath();
  duz(ctx, L, '#8a5a2c');
  ctx.beginPath();
  ctx.moveTo(-0.38 + L.isik[0] * 0.03, -0.38);
  ctx.lineTo(0.02, -0.38);
  ctx.lineTo(0.38, -0.15);
  ctx.lineTo(0.38, 0.15);
  ctx.lineTo(0.02, 0.38);
  ctx.lineTo(-0.38, 0.38);
  ctx.closePath();
  ctx.fillStyle = '#c99252';
  ctx.fill();
  // Üç kanal: arka (düz), sol ve sağ (kıvrılıp öne döner); hepsi ön ağızda birleşir.
  ctx.beginPath();
  ctx.moveTo(-0.47, 0);
  ctx.lineTo(0.47, 0);
  ctx.moveTo(0, -0.47);
  ctx.quadraticCurveTo(0, 0, 0.47, 0);
  ctx.moveTo(0, 0.47);
  ctx.quadraticCurveTo(0, 0, 0.47, 0);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#4a2c14';
  ctx.lineWidth = 0.22;
  ctx.stroke();
}

function olukHareketli(ctx, L, p, an) {
  if (hizOrani(p) <= 0) return;
  const t = (donus(p, an, 2.2) / TUR) % 1;
  ctx.beginPath();
  for (let k = 0; k < 2; k++) {
    const u = (t + k * 0.5) % 1;
    const v = 1 - u;
    const x = -0.42 + u * 0.8;
    ctx.moveTo(x - 0.06, -0.08);
    ctx.lineTo(x + 0.04, 0);
    ctx.lineTo(x - 0.06, 0.08);
    for (const y of [-1, 1]) {
      const yy = 0.47 * y * v * v;
      ctx.moveTo(u * u * 0.47 - 0.05, yy - 0.05);
      ctx.lineTo(u * u * 0.47 + 0.05, yy);
      ctx.lineTo(u * u * 0.47 - 0.05, yy + 0.05);
    }
  }
  ctx.strokeStyle = '#f2c440';
  ctx.lineWidth = 0.06;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

parcaCizimiTanimla('birlestirme-olugu', yerelCizim(olukGovde, olukHareketli));
