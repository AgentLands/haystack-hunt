/**
 * Çiftlik çizimleri: Toplama ailesi ve dünya (D · dunya). HEPSİ GEÇİCİ yer tutucudur: asıl
 * parça çizimleri H2'nin (gorsel/toplama.js), hava görseli H1'in (gorsel/hava.js) işidir.
 * Burada: tırmık kolu ve taş toplayıcı gövdeleri, huni ağzı işareti, çayır yeşili, Komşu
 * kapısının yeri (kesik çerçeve), açıktaki taş/iğne ailesi parıltısı (normal çizim yalnız
 * aranan iğneyi, çivileri ve buluntuları çizer) ve basit hava (bulut gölgesi, yağmur çizgisi;
 * sade harekette durağan).
 */
import { katmanEkle } from '../../../cizim.js';
import { gorunum } from '../../../gorunum.js';
import { gorunurAlan } from '../../../kural/gorunum.js';
import { OLCEK, ekranBirim } from '../../../cizim/tuval-olcek.js';
import { GENISLIK, YUKSEKLIK } from '../../../kural/boyut.js';
import { DX, DY } from '../../../kural/ciftlik/olcu.js';
import { esyaTanimi, esyaKodu } from '../../../kural/ciftlik/esya.js';
import { tarladaMi } from '../../../kural/ciftlik/saman.js';
import { havaAl, karma, GOK } from '../../../kural/ciftlik/dunya/hava.js';
import { agizKarolari } from '../../../kural/ciftlik/dunya/ogretici.js';
import { sadeHareket } from '../../sade-hareket.js';
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';

const K = KARO_PX;
const CIVI = esyaKodu('civi');

function kutu(ctx, x, y, en, boy, renk, eb) {
  ctx.fillStyle = renk;
  ctx.fillRect(x, y, en, boy);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeRect(x, y, en, boy);
}

parcaCizimiTanimla('tirmik-kolu', {
  govde(ctx, p, eb) {
    kutu(ctx, p.x * K + 1, p.y * K + 1, K - 2, K - 2, '#7d5a32', eb);
  },
  hareketli(ctx, p, an) {
    const cx = p.x * K + K / 2;
    const cy = p.y * K + K / 2;
    const a = p.ozel.son > 0 && !sadeHareket() ? an.zaman / 300 : 0;
    ctx.strokeStyle = '#e6d3a3';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const b = a + (k * Math.PI) / 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(b) * K * 0.45, cy + Math.sin(b) * K * 0.45);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(42, 26, 13, 0.5)';
    ctx.fillRect((p.x + DX[p.yon]) * K + K / 2 - 1, (p.y + DY[p.yon]) * K + K / 2 - 1, 2, 2);
  },
});

parcaCizimiTanimla('tas-toplayici', {
  govde(ctx, p, eb) {
    kutu(ctx, p.x * K + 1, p.y * K + 1, p.en * K - 2, p.boy * K - 2, '#6b7a5a', eb);
    ctx.fillStyle = '#8a8780';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(p.x * K + 5 + k * 3, p.y * K + p.boy * K / 2, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
});

/** Çayır yeşili ve kapı yeri (dünya pikseli; görünür alanla sınırlı değil, tek dikdörtgen). */
function araziCiz(ctx, c, eb) {
  const a = c.arazi;
  if (!a) return;
  if (a.cayir) {
    ctx.fillStyle = 'rgba(92, 150, 60, 0.28)';
    ctx.fillRect(a.cayir.x * K, a.cayir.y * K, a.cayir.en * K, a.cayir.boy * K);
  }
  if (a.kapi) {
    ctx.setLineDash([2 * eb, 2 * eb]);
    ctx.strokeStyle = MUREKKEP;
    ctx.lineWidth = 1.2 * eb;
    ctx.strokeRect(a.kapi.x * K, a.kapi.y * K, a.kapi.en * K, a.kapi.boy * K);
    ctx.setLineDash([]);
  }
}

/** Huni ağızları: kesik çerçeveli koyu bant (ağzın hangi yanda olduğu görünsün). */
function agizCiz(ctx, c, eb) {
  ctx.fillStyle = 'rgba(43, 26, 16, 0.3)';
  ctx.strokeStyle = 'rgba(255, 240, 192, 0.8)';
  ctx.lineWidth = eb;
  ctx.setLineDash([1.5 * eb, 1.5 * eb]);
  for (const p of c.parcalar.values()) {
    if (p.tanim.anahtar !== 'huni') continue;
    for (const [kx, ky] of agizKarolari(p)) {
      ctx.fillRect(kx * K + 0.5, ky * K + 0.5, K - 1, K - 1);
      ctx.strokeRect(kx * K + 0.5, ky * K + 0.5, K - 1, K - 1);
    }
  }
  ctx.setLineDash([]);
}

/** Açıktaki (h ≤ z) taş ve iğne ailesi nesneleri: küçük nokta (taş gri, metal gümüş). */
function acikNesneler(ctx, durum, alan, eb) {
  const { tarla } = durum;
  for (const g of durum.ciftlik.gomulu) {
    if (!tarladaMi(g) || g === tarla.igne || g.tur || g.esya === CIVI) continue;
    if (g.x < alan.x || g.y < alan.y || g.x > alan.x + alan.en || g.y > alan.y + alan.boy) {
      continue;
    }
    if (tarla.h[(g.y | 0) * GENISLIK + (g.x | 0)] > g.z) continue;
    ctx.beginPath();
    ctx.arc((g.x + 0.5) * OLCEK, (g.y + 0.5) * OLCEK, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = esyaTanimi(g.esya)?.renk ?? '#ccc';
    ctx.fill();
    ctx.strokeStyle = MUREKKEP;
    ctx.lineWidth = eb;
    ctx.stroke();
  }
}

/** Bulut gölgeleri (bulut/yağmur) ve yağmur çizgileri; rüzgâr yönünde sürüklenir. */
function havaCiz(ctx, c, alan, zaman) {
  const h = havaAl(c);
  if (h.gok === GOK.GUNES) return;
  const W = GENISLIK * OLCEK;
  const H = YUKSEKLIK * OLCEK;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  const kay = sadeHareket() ? 0 : (zaman / 1000) * (2 + h.siddet * 3);
  ctx.fillStyle = h.gok === GOK.YAGMUR ? 'rgba(30, 40, 60, 0.16)' : 'rgba(30, 40, 60, 0.09)';
  for (let k = 0; k < 5; k++) {
    const r = 60 + (karma(c.tohum, 30 + k, h.dilim) % 60);
    const x = ((karma(c.tohum, 40 + k, h.dilim) % W) + DX[h.yon] * kay) % (W + 2 * r);
    const y = ((karma(c.tohum, 50 + k, h.dilim) % H) + DY[h.yon] * kay) % (H + 2 * r);
    ctx.beginPath();
    ctx.ellipse(((x + W + 2 * r) % (W + 2 * r)) - r, ((y + H + 2 * r) % (H + 2 * r)) - r,
      r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (h.gok === GOK.YAGMUR) yagmurCiz(ctx, h, alan, zaman);
  ctx.restore();
}

function yagmurCiz(ctx, h, alan, zaman) {
  ctx.strokeStyle = 'rgba(200, 215, 235, 0.45)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  const x0 = alan.x * OLCEK;
  const y0 = alan.y * OLCEK;
  const en = alan.en * OLCEK;
  const boy = alan.boy * OLCEK;
  const dus = sadeHareket() ? 0 : (zaman / 4) % 40;
  for (let k = 0; k < 90; k++) {
    const x = x0 + ((k * 97.3) % en);
    const y = y0 + ((k * 53.7 + dus * 7) % boy);
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2 + DX[h.yon] * h.siddet, y + 6 + DY[h.yon] * h.siddet);
  }
  ctx.stroke();
}

katmanEkle((ctx, durum) => {
  if (durum.mod !== 'ciftlik') return;
  const eb = ekranBirim(ctx);
  araziCiz(ctx, durum.ciftlik, eb);
  agizCiz(ctx, durum.ciftlik, eb);
  acikNesneler(ctx, durum, gorunurAlan(gorunum), eb);
}, 'alt');

katmanEkle((ctx, durum, zaman) => {
  if (durum.mod === 'ciftlik') havaCiz(ctx, durum.ciftlik, gorunurAlan(gorunum), zaman);
}, 'ust');
