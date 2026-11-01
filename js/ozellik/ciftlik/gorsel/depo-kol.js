/**
 * Çiftlik çizimleri: Depo ve kol ailesi (kuş bakışı, yön 0 = doğuya bakar).
 * - sandik (1×1, yönsüz): demir köşebentli açık tahta sandık; hareketli: içerik yüksekliği
 *   (p.ozel.toplam / SANDIK_KAP), rengi en çok bulunan türün rengi (p.ozel.say).
 * - ambar (3×3, yönsüz): tahta beşik çatılı ambar, çatının ortasında açık kapak; hareketli:
 *   kapaktan görünen doluluk yığını (p.ozel.toplam / 600), çürükte (p.ozel.curuk) kara-yeşil
 *   lekeler.
 * - defter-masasi (2×1): açık defter, büyüteç ve damgalı tahta masa; hareketli: eşya gelince
 *   (an.tik - p.ozel.son < 20) damga iner, kırmızı damga izi ve parıltı.
 * - yaba-kolu (1×1): kütük direk; hareketli: arkadan (alır) öne (bırakır) salınan yaba
 *   (p.ozel.faz 0..15), ucunda taşıdığı eşya (p.ozel.tasinan: eşya kodu).
 * - komsu-kapisi (2×2, kurulu gelir): çizgili tenteli satış tezgâhı, ürün kasaları;
 *   hareketli: dalgalanan flama, satışta (an.tik - p.ozel.son < 15) kuruş parıltısı.
 */
import { parcaCizimiTanimla } from './kayit.js';
import {
  yerelCizim, golge, kutu, daire, tahta, duz, puf, hatliCizgi, esyaRengi, percin, kolYolu, TUR,
} from './parca-ortak.js';
import { SANDIK_KAP } from '../../../kural/ciftlik/parcalar/temel.js';

/** p.ozel.say ({ kod: adet }) içinde en çok bulunan eşyanın kodu (yoksa 0). */
function enCok(say) {
  let kod = 0;
  let n = 0;
  for (const k in say) {
    if (say[k] > n) {
      n = say[k];
      kod = Number(k);
    }
  }
  return kod;
}

// --- Sandık ---
function sandikGovde(ctx, L) {
  golge(ctx, L, -0.44, -0.44, 0.88, 0.88, 0.06, 0.8);
  tahta(ctx, L, 0, 0, 0.86, 0.86, '#7a4a22', '#b07a40', 0.22);
  ctx.beginPath();
  ctx.rect(-0.29, -0.29, 0.58, 0.58);
  duz(ctx, L, '#3a2410', 0.8);
  ctx.beginPath();
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.rect(x * 0.43 - (x > 0 ? 0.2 : 0), y * 0.43 - (y > 0 ? 0.07 : 0), 0.2, 0.07);
    ctx.rect(x * 0.43 - (x > 0 ? 0.07 : 0), y * 0.43 - (y > 0 ? 0.2 : 0), 0.07, 0.2);
  }
  ctx.fillStyle = '#4d5358';
  ctx.fill();
}

function sandikHareketli(ctx, L, p) {
  const o = p.ozel ?? {};
  const oran = Math.min(1, (o.toplam ?? 0) / SANDIK_KAP);
  if (oran <= 0) return;
  const h = 0.54 * Math.max(0.15, oran);
  ctx.fillStyle = esyaRengi(enCok(o.say));
  ctx.fillRect(-0.27, 0.27 - h, 0.54, h);
  ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
  ctx.fillRect(-0.24, 0.29 - h, 0.3, 0.05);
}

parcaCizimiTanimla('sandik', yerelCizim(sandikGovde, sandikHareketli));

// --- Ambar ---
function ambarGovde(ctx, L) {
  golge(ctx, L, -1.42, -1.42, 2.84, 2.84, 0.1, 2.2);
  const ust = L.isik[1] < 0;
  for (const [y0, acik] of [[-1.42, ust], [0, !ust]]) {
    ctx.beginPath();
    ctx.rect(-1.42, y0, 2.84, 1.42);
    duz(ctx, L, acik ? '#b07a40' : '#7a4a22');
    ctx.strokeStyle = 'rgba(60, 34, 14, 0.55)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let x = -1.1; x < 1.4; x += 0.32) {
      ctx.moveTo(x, y0 + 0.04);
      ctx.lineTo(x, y0 + 1.38);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-1.42, 0);
  ctx.lineTo(1.42, 0);
  hatliCizgi(ctx, L, 0.1, '#5a3a1c');
  // Açık çatı kapağı: ortada yığının göründüğü kare boşluk.
  ctx.beginPath();
  ctx.rect(-0.82, -0.82, 1.64, 1.64);
  duz(ctx, L, '#2e1e0e');
  ctx.strokeStyle = '#c99252';
  ctx.lineWidth = 0.07;
  ctx.strokeRect(-0.86, -0.86, 1.72, 1.72);
}

const LEKE = [[-0.3, 0.25, 0.16], [0.35, -0.1, 0.13], [0.05, 0.5, 0.11], [-0.45, -0.35, 0.1]];
function ambarHareketli(ctx, L, p) {
  const o = p.ozel ?? {};
  const oran = Math.min(1, (o.toplam ?? 0) / 600);
  if (oran <= 0) return;
  const r = 0.22 + Math.sqrt(oran) * 0.56;
  daire(ctx, L, 0, 0, r, '#b8862e', '#e3b341', 0.14);
  ctx.strokeStyle = '#a87a26';
  ctx.lineWidth = 0.04;
  kolYolu(ctx, 0, 0, r * 0.25, r * 0.85, 0.3, 9);
  ctx.stroke();
  const curuk = Math.min(4, Math.ceil((o.curuk ?? 0) / 10));
  if (curuk <= 0) return;
  ctx.fillStyle = '#3e4a24';
  ctx.beginPath();
  for (let i = 0; i < curuk; i++) {
    const [x, y, rr] = LEKE[i];
    ctx.moveTo(x * r + rr * r, y * r);
    ctx.arc(x * r, y * r, rr * r, 0, TUR);
  }
  ctx.fill();
}

parcaCizimiTanimla('ambar', yerelCizim(ambarGovde, ambarHareketli));

// --- Defter masası ---
function defterGovde(ctx, L) {
  golge(ctx, L, -0.95, -0.45, 1.9, 0.9, 0.1, 1.2);
  kutu(ctx, L, 0, 0, 1.9, 0.88, 0.1, '#7a4a22', '#b07a40');
  ctx.save();
  ctx.translate(0.38, 0);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.rect(-0.42, -0.3, 0.84, 0.6);
  duz(ctx, L, '#f4ecd8');
  ctx.strokeStyle = '#a89878';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  for (let y = -0.18; y < 0.26; y += 0.11) {
    ctx.moveTo(-0.36, y);
    ctx.lineTo(-0.05, y);
    ctx.moveTo(0.05, y);
    ctx.lineTo(0.36, y);
  }
  ctx.moveTo(0, -0.3);
  ctx.lineTo(0, 0.3);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-0.62, 0.05);
  ctx.lineTo(-0.85, 0.3);
  hatliCizgi(ctx, L, 0.08, '#5a3a1c');
  ctx.beginPath();
  ctx.arc(-0.5, -0.08, 0.2, 0, TUR);
  ctx.fillStyle = 'rgba(190, 225, 235, 0.6)';
  ctx.fill();
  hatliCizgi(ctx, L, 0.06, '#c9a040');
  daire(ctx, L, -0.15, 0.28, 0.08, '#7a2a16', '#c8401f');
}

function defterHareketli(ctx, L, p, an) {
  const gecen = an.tik - (p.ozel?.son ?? -999) + an.alfa;
  if (gecen < 0 || gecen > 20) return;
  const iz = gecen > 4;
  if (iz) {
    ctx.beginPath();
    ctx.arc(0.55, 0.05, 0.13, 0, TUR);
    ctx.strokeStyle = 'rgba(158, 58, 38, 0.85)';
    ctx.lineWidth = 0.04;
    ctx.stroke();
    const s = 0.2 * (1 - gecen / 20) + 0.05;
    ctx.beginPath();
    ctx.moveTo(0.55, -0.28 - s);
    ctx.lineTo(0.58, -0.28);
    ctx.lineTo(0.55 + s, -0.25);
    ctx.lineTo(0.58, -0.22);
    ctx.lineTo(0.55, -0.22 + s);
    ctx.lineTo(0.52, -0.22);
    ctx.lineTo(0.55 - s, -0.25);
    ctx.lineTo(0.52, -0.28);
    ctx.closePath();
    ctx.fillStyle = '#fff0c0';
    ctx.fill();
  } else {
    daire(ctx, L, 0.55, 0.05, 0.11, '#7a2a16', '#c8401f');
  }
}

parcaCizimiTanimla('defter-masasi', yerelCizim(defterGovde, defterHareketli));

// --- Yaba kolu ---
function yabaGovde(ctx, L) {
  golge(ctx, L, -0.3, -0.3, 0.6, 0.6, 0.3, 0.8);
  kutu(ctx, L, 0, 0, 0.5, 0.5, 0.06, '#3a3430', '#55504a');
  daire(ctx, L, 0, 0, 0.2, '#7a4a22', '#c99252');
  ctx.beginPath();
  ctx.arc(0, 0, 0.1, 0, TUR);
  ctx.strokeStyle = 'rgba(90, 55, 20, 0.6)';
  ctx.lineWidth = 0.03;
  ctx.stroke();
}

function yabaHareketli(ctx, L, p, an) {
  const o = p.ozel ?? {};
  const faz = ((o.faz ?? 0) + (o.faz ? an.alfa : 0)) / 16;
  const u = faz < 0.5 ? faz * 2 : 2 - faz * 2;
  const a = -Math.PI * (1 - u);
  const c = Math.cos(a);
  const s = Math.sin(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(c * 0.62, s * 0.62);
  hatliCizgi(ctx, L, 0.1, '#b07a40');
  ctx.beginPath();
  ctx.moveTo(c * 0.62 - s * 0.2, s * 0.62 + c * 0.2);
  ctx.lineTo(c * 0.62 + s * 0.2, s * 0.62 - c * 0.2);
  for (const k of [-0.19, 0, 0.19]) {
    ctx.moveTo(c * 0.62 - s * k, s * 0.62 + c * k);
    ctx.lineTo(c * 0.92 - s * k, s * 0.92 + c * k);
  }
  hatliCizgi(ctx, L, 0.06, '#c9cdd0');
  if (o.tasinan) daire(ctx, L, c * 0.8, s * 0.8, 0.15, '#2a1a0d', esyaRengi(o.tasinan), 0.3);
  daire(ctx, L, 0, 0, 0.09, '#5d6469', '#b4bbc2');
}

parcaCizimiTanimla('yaba-kolu', yerelCizim(yabaGovde, yabaHareketli));

// --- Komşu kapısı ---
function kapiGovde(ctx, L) {
  golge(ctx, L, -0.95, -0.95, 1.9, 1.9, 0.1, 1.4);
  tahta(ctx, L, 0, 0.3, 1.86, 1.2, '#7a4a22', '#b07a40', 0.3);
  for (const [x, r] of [[-0.45, '#e3b341'], [0.4, '#c8401f']]) {
    kutu(ctx, L, x, 0.55, 0.62, 0.5, 0.05, '#5a3a1c', '#8a5a2c');
    ctx.fillStyle = r;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(x - 0.15 + (i % 2) * 0.24 + 0.09, 0.47 + (i >> 1) * 0.17);
      ctx.arc(x - 0.15 + (i % 2) * 0.24, 0.47 + (i >> 1) * 0.17, 0.09, 0, TUR);
    }
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(-0.96, -0.96, 1.92, 1.0);
  duz(ctx, L, '#f4ecd8');
  ctx.fillStyle = '#c8401f';
  for (let i = 0; i < 6; i += 2) ctx.fillRect(-0.96 + i * 0.32, -0.96, 0.32, 1.0);
  ctx.fillStyle = 'rgba(42, 26, 13, 0.25)';
  ctx.fillRect(-0.96, -0.02, 1.92, 0.06);
}

function kapiHareketli(ctx, L, p, an) {
  const t = an.zaman / 1000;
  const dal = Math.sin(t * 4 + (p.id ?? 0)) * 0.08;
  daire(ctx, L, 0.82, -0.82, 0.06, '#3a3430', '#7d868d');
  ctx.beginPath();
  ctx.moveTo(0.82, -0.82);
  ctx.lineTo(0.48, -0.75 + dal);
  ctx.lineTo(0.82, -0.66);
  ctx.closePath();
  duz(ctx, L, '#2f6f7a', 0.9);
  const gecen = an.tik - (p.ozel?.son ?? -999) + an.alfa;
  if (gecen >= 0 && gecen < 15) {
    const u = gecen / 15;
    daire(ctx, L, 0, 0.1 - u * 0.4, 0.13, '#9c6a16', '#f2c440');
    puf(ctx, -0.04, 0.06 - u * 0.4, 0.04, '#fff6d0');
  }
}

parcaCizimiTanimla('komsu-kapisi', yerelCizim(kapiGovde, kapiHareketli));
