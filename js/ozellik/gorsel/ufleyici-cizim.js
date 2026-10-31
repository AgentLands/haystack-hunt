/**
 * Sırt üfleyicisi çizimi: yerde duran makine (sırt çantası çerçevesi, omuz askıları, yakıt
 * deposu, motor, çekme ipi, sarılı hortum ve namlu), çiftçinin sırtındaki motor ve boru
 * (karakter-cizim kullanır) ve namludan çıkan hava akımı (yarı saydam koni + akış
 * çizgileri). Dış hatlar ekran-sabit (boyalı oyuncak).
 */
import { donuk, ekranBirim, elips, renk, serit, yuvarDik } from './ortak.js';
import { MAKINE_GOLGE, hat } from './makine-ortak.js';

const GOVDE = '#e0a526';
const GOVDE_KOYU = '#a8761a';
const KONI_TAN = 0.47; // tan(25°): kuraldaki koni yarım açısı
const HORTUM = [[0.2, 0.15], [0.75, 0.75], [1.3, 0.35], [0.95, -0.25], [0.45, 0.05],
  [0.9, 0.55], [1.55, 0.2], [2.05, 0.02]];

/** Dizinden [0, 1) sahte rastgele (çizim kararlı kalsın diye). */
function sahte(i) {
  const v = Math.sin(i * 127.1 + 17.3) * 43758.5453;
  return v - Math.floor(v);
}

/** Namludan (yerel x0, y0; yön +x) yayılan hava: üç katmanlı yarı saydam koni, akış çizgileri. */
export function havaDalgasi(ctx, t, x0, y0, uzunluk) {
  const nabiz = 0.85 + 0.15 * Math.sin(t * 23);
  for (const [oran, alfa] of [[1, 0.1], [0.72, 0.1], [0.45, 0.12]]) {
    const L = uzunluk * oran * nabiz;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 0.12);
    ctx.lineTo(x0 + L, y0 - 0.12 - L * KONI_TAN);
    ctx.quadraticCurveTo(x0 + L * 1.12, y0, x0 + L, y0 + 0.12 + L * KONI_TAN);
    ctx.lineTo(x0, y0 + 0.12);
    ctx.closePath();
    ctx.fillStyle = `rgba(236, 246, 255, ${alfa})`;
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.055;
  for (let i = 0; i < 7; i++) {
    const f = (t * 2.3 + i / 7) % 1;
    const yan = (sahte(i) - 0.5) * 1.6;
    const r0 = 0.15 + f * uzunluk;
    const r1 = r0 + 0.35 + 0.25 * sahte(i + 9);
    const a = Math.sin(f * Math.PI);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.75 * a).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x0 + r0, y0 + yan * r0 * KONI_TAN);
    ctx.lineTo(x0 + r1, y0 + yan * r1 * KONI_TAN);
    ctx.stroke();
  }
}

/** Motor gövdesi: dış hatlı sarı kutu, koyu başlık, kırmızı yakıt kapağı; (cx, cy) merkez. */
export function motorKutusu(ctx, cx, cy, en, boy, isik, sonuk) {
  const eb = ekranBirim(ctx);
  yuvarDik(ctx, cx - boy / 2, cy - en / 2, boy, en, 0.14);
  hat(ctx, renk(GOVDE_KOYU, sonuk), eb);
  yuvarDik(ctx, cx - boy / 2 + 0.05 + isik[0] * 0.04, cy - en / 2 + 0.05 + isik[1] * 0.04,
    boy - 0.12, en - 0.12, 0.1);
  ctx.fillStyle = renk(GOVDE, sonuk);
  ctx.fill();
  yuvarDik(ctx, cx - boy / 2 + 0.07, cy - en / 2 + 0.09, boy * 0.42, en - 0.18, 0.08);
  ctx.fillStyle = renk('#2f3236', sonuk);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const x = cx - boy / 2 + 0.14 + i * 0.1;
    serit(ctx, x, cy - en / 2 + 0.15, x, cy + en / 2 - 0.15, 0.03, renk('#5b5f64', sonuk));
  }
  elips(ctx, cx + boy * 0.22, cy - en * 0.18, 0.1, 0.1);
  hat(ctx, renk('#c93434', sonuk), eb, 0.7);
  serit(ctx, cx - boy * 0.1, cy - en / 2 + 0.07, cx + boy * 0.38, cy - en / 2 + 0.07, 0.04,
    'rgba(255, 244, 200, 0.55)');
}

/** Boru: noktalar dizisi boyunca dış hatlı, halka halka esnek hortum; ucunda namlu. */
export function boruCiz(ctx, noktalar, sonuk) {
  const eb = ekranBirim(ctx);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(noktalar[0][0], noktalar[0][1]);
  for (let i = 1; i < noktalar.length - 1; i++) {
    const [a, b] = noktalar[i];
    const [c, d] = noktalar[i + 1];
    ctx.quadraticCurveTo(a, b, (a + c) / 2, (b + d) / 2);
  }
  const son = noktalar[noktalar.length - 1];
  ctx.lineTo(son[0], son[1]);
  ctx.strokeStyle = '#2a1a0d';
  ctx.lineWidth = 0.26 + 2.4 * eb;
  ctx.stroke();
  ctx.strokeStyle = renk('#3a3e43', sonuk);
  ctx.lineWidth = 0.26;
  ctx.stroke();
  ctx.strokeStyle = renk('#62686e', sonuk);
  ctx.lineWidth = 0.18;
  ctx.setLineDash([0.05, 0.09]);
  ctx.stroke();
  ctx.setLineDash([]);
  const [px, py] = noktalar[noktalar.length - 2];
  const a = Math.atan2(son[1] - py, son[0] - px);
  ctx.save();
  ctx.translate(son[0], son[1]);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.14);
  ctx.lineTo(0.32, -0.2);
  ctx.lineTo(0.32, 0.2);
  ctx.lineTo(-0.2, 0.14);
  ctx.closePath();
  hat(ctx, renk('#e0a526', sonuk), eb, 0.9);
  serit(ctx, 0.22, -0.17, 0.22, 0.17, 0.08, renk('#1f2226', sonuk));
  ctx.restore();
}

/** Sırt çantası çerçevesi: boru çerçeve, sırt yastığı ve yere kıvrılmış iki omuz askısı. */
function cerceve(ctx, eb, sonuk) {
  ctx.strokeStyle = renk('#34557f', sonuk);
  ctx.lineWidth = 0.13;
  ctx.lineCap = 'round';
  for (const v of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-0.95, v * 0.45);
    ctx.bezierCurveTo(-0.6, v * 1.05, 0.0, v * 0.95, -0.05, v * 0.5);
    ctx.stroke();
  }
  yuvarDik(ctx, -1.05, -0.62, 1.2, 1.24, 0.12);
  ctx.lineWidth = 0.09 + 2.4 * eb;
  ctx.strokeStyle = '#2a1a0d';
  ctx.stroke();
  ctx.lineWidth = 0.09;
  ctx.strokeStyle = renk('#6c7378', sonuk);
  ctx.stroke();
  yuvarDik(ctx, -1.0, -0.42, 0.28, 0.84, 0.1);
  hat(ctx, renk('#2f3236', sonuk), eb, 0.8);
}

/** Yakıt deposu: yarı saydam beyaz kap; içindeki yakıt seviyesi görünür. */
function depo(ctx, yakit, eb, sonuk) {
  yuvarDik(ctx, -0.62, 0.12, 0.62, 0.42, 0.1);
  hat(ctx, renk('#efe9dc', sonuk), eb, 0.9);
  const w = 0.54 * Math.max(0, Math.min(1, yakit || 0));
  if (w > 0.01) {
    ctx.fillStyle = renk('#d9922b', sonuk);
    ctx.fillRect(-0.58, 0.18, w, 0.3);
  }
  elips(ctx, -0.08, 0.33, 0.07, 0.07);
  hat(ctx, renk('#c93434', sonuk), eb, 0.6);
}

/** Yerde duran üfleyici (çiftçi binmemişken); calisiyor iken titrer ve hava üfler. */
export function ufleyiciCiz(ctx, makine, zaman) {
  const t = zaman / 1000;
  const sonuk = !(makine.yakit > 0);
  const calis = !!makine.calisiyor && !sonuk;
  const titre = calis ? Math.sin(t * 70) * 0.025 : 0;
  const isik = [-0.6, -0.8];
  donuk(ctx, makine.x + 0.18, makine.y + 0.22, makine.yon, 1, (c) => {
    c.fillStyle = MAKINE_GOLGE;
    yuvarDik(c, -1.05, -0.62, 1.2, 1.24, 0.2);
    c.fill();
  });
  donuk(ctx, makine.x, makine.y + titre, makine.yon, 1, (c) => {
    const eb = ekranBirim(c);
    cerceve(c, eb, sonuk);
    boruCiz(c, HORTUM, sonuk);
    motorKutusu(c, -0.42, -0.2, 0.62, 0.78, isik, sonuk);
    depo(c, makine.yakit, eb, sonuk);
    // Çekme ipi: motorun yanından sarkan ip ve T kulp.
    serit(c, -0.05, -0.42, 0.28, -0.62, 0.03, renk('#e8dcc0', sonuk));
    serit(c, 0.24, -0.72, 0.34, -0.52, 0.08, renk('#1f2226', sonuk));
    if (calis) havaDalgasi(c, t, 2.4, 0.02, 2.2);
  });
}

/** Çiftçinin sırtındaki motor (karakter yerel uzayı); çizim sırasında şapkanın altında kalır. */
export function sirtMotoru(ctx, t, calis, isik) {
  const titre = calis ? Math.sin(t * 70) * 0.02 : 0;
  ctx.save();
  ctx.translate(0, titre);
  motorKutusu(ctx, -0.72, 0, 0.82, 0.7, isik, false);
  for (const v of [-1, 1]) serit(ctx, -0.45, v * 0.46, -0.1, v * 0.56, 0.1, '#2b2e32');
  ctx.restore();
}
