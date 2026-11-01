/**
 * Çiftlik parça çizimlerinin ortak yardımcıları (aile dosyaları toplama.js ... mantik.js):
 * - `yerel(ctx, p, eb, ciz)`: parça merkezli, yön kadar döndürülmüş, birimi KARO olan yerel
 *   uzay (yön 0'da +x ileri/doğu, +y sağ/güney; parça [-en/2, en/2] × [-boy/2, boy/2]).
 *   ciz(ctx, L, p, an) alır; L = { eb (yerel 1 CSS pikseli), isik (yerel ışık yönü), golge
 *   (yerel gölge kayması), en, boy (yön 0 boyutu) }; L her çağrıda yeniden kullanılır.
 * - Boyalı oyuncak kalıpları: ekran-sabit koyu kahve dış hatlı cel kutu/daire, tahta kasa,
 *   oluk (bant kasası), zemin gölgesi, duman pofu, mantık lambası.
 * - Hareket: `hizOrani(p)` (çalışıyorsa güç oranı p.oran/1024, duruyorsa 0), `donus(p, an,
 *   devir)` güç oranıyla orantılı BİRİKİMLİ açı (oran değişince sıçramaz; parça başına
 *   WeakMap), `citalar` bant çıtası (an.faz). Sade harekette dönüşler yavaşlar.
 * - Hava (tınaz, rüzgâr gülü, ot savurucu): `havaGorsel` 'hava-degisti' olayıyla güncellenir;
 *   olay gelene dek SAP: doğuya esen şiddet 2 rüzgâr, güneşli gök.
 */
import { KARO_PX, MUREKKEP } from './kayit.js';
import { isikYerel, yuvarDik } from '../../gorsel/ortak.js';
import { hat, celKutu } from '../../gorsel/makine-ortak.js';
import { parcaDurumu } from '../../../kural/ciftlik/parca-kayit.js';
import { esyaTanimi } from '../../../kural/ciftlik/esya.js';
import { sadeHareket } from '../../sade-hareket.js';
import { dinle } from '../../../olaylar.js';

export { hat };
export const K = KARO_PX;
export const TUR = Math.PI * 2;
const CEYREK = Math.PI / 2;
const GOLGE_RENGI = 'rgba(40, 22, 8, 0.34)';

/** Dünya yönündeki (sol üst ışık, sağ alt gölge) vektörlerin yön başına yerel karşılığı. */
const ISIK = [0, 1, 2, 3].map((y) => isikYerel(y * CEYREK));
const GOLGE = [0, 1, 2, 3].map((y) => {
  const c = Math.cos(y * CEYREK);
  const s = Math.sin(y * CEYREK);
  return [0.8 * c + s, -0.8 * s + c];
});
const L = { eb: 0.02, isik: ISIK[0], golge: GOLGE[0], en: 1, boy: 1 };

/** Parçanın yerel uzayında ciz(ctx, L, p, an) çalıştırır (bkz. dosya başı). */
export function yerel(ctx, p, eb, ciz, an) {
  ctx.save();
  ctx.translate((p.x + p.en / 2) * K, (p.y + p.boy / 2) * K);
  if (p.yon) ctx.rotate(p.yon * CEYREK);
  ctx.scale(K, K);
  const dik = p.yon & 1;
  L.eb = eb / K;
  L.isik = ISIK[p.yon & 3];
  L.golge = GOLGE[p.yon & 3];
  L.en = dik ? p.boy : p.en;
  L.boy = dik ? p.en : p.boy;
  ciz(ctx, L, p, an);
  ctx.restore();
}

/** { govde(ctx, L, p), hareketli(ctx, L, p, an) } yerel çizimlerini kayda uygun yapar. */
export function yerelCizim(govde, hareketli = null) {
  return {
    govde: (ctx, p, eb) => yerel(ctx, p, eb, govde),
    hareketli: hareketli && ((ctx, p, an, eb) => yerel(ctx, p, eb, hareketli, an)),
  };
}

// --- Durum ve hareket ---
const CALISAN = new Set(['calisiyor', 'guc-az']);

/** Parça çalışıyorsa güç oranı (0..1), duruyorsa (girdi yok, dolu, güç yok...) 0. */
export function hizOrani(p) {
  if (!p.etkin || !CALISAN.has(parcaDurumu(p))) return 0;
  return Math.max(0, Math.min(1024, p.oran)) / 1024;
}

/** Parçanın durum kodu (rozet sözlüğü, sistemler.md §7). */
export const durumu = parcaDurumu;

const acilar = new WeakMap();
/**
 * Birikimli dönüş açısı (radyan): tam hızda saniyede `devir` tur, hız = hiz (varsayılan
 * hizOrani). Kare arası en çok 0,25 sn sayılır; parçalar id'ye göre farklı açıdan başlar.
 */
export function donus(p, an, devir, hiz = hizOrani(p)) {
  let d = acilar.get(p);
  if (!d) {
    d = { t: an.zaman, a: ((p.id ?? 0) * 2.39) % TUR };
    acilar.set(p, d);
  }
  const dt = Math.min(0.25, Math.max(0, (an.zaman - d.t) / 1000));
  d.t = an.zaman;
  d.a = (d.a + dt * hiz * devir * TUR * (sadeHareket() ? 0.3 : 1)) % TUR;
  return d.a;
}

/** Sayı ya da dizi uzunluğu (p.ozel alanları için hoşgörülü sayaç). */
export function adet(v) {
  if (typeof v === 'number') return v;
  return Array.isArray(v) ? v.length : 0;
}

/** Eşya kodunun rengi (yoksa saman). */
export function esyaRengi(kod) {
  return esyaTanimi(kod)?.renk ?? '#d8b85a';
}

// --- Hava (görsel kopya; kural tarafı hava(tohum, dilim)) ---
export const havaGorsel = { yon: 0, siddet: 2, gok: 'gunes' };
dinle('hava-degisti', (v) => {
  if (v && Number.isInteger(v.yon)) havaGorsel.yon = v.yon & 3;
  if (v && Number.isInteger(v.siddet)) havaGorsel.siddet = v.siddet;
  if (v && typeof v.gok === 'string') havaGorsel.gok = v.gok;
});

// --- Boyalı oyuncak kalıpları (yerel uzay, birim karo) ---

/** Zemin gölgesi: kutunun sağ alta (dünyada) kaymış kopyası; yuk yükseklik çarpanı. */
export function golge(ctx, L, x, y, w, h, r, yuk = 1) {
  const k = 0.1 * yuk;
  yuvarDik(ctx, x + L.golge[0] * k, y + L.golge[1] * k, w, h, r);
  ctx.fillStyle = GOLGE_RENGI;
  ctx.fill();
}

/** Ortalanmış cel kutu (merkez x, y). */
export function kutu(ctx, L, x, y, w, h, r, koyu, acik) {
  celKutu(ctx, x - w / 2, y - h / 2, w, h, r, L.isik, koyu, acik, false, L.eb);
}

/** 2 tonlu cel daire: dış hatlı koyu taban, ışığa kaymış açık yüz. */
export function daire(ctx, L, x, y, r, koyu, acik, oran = 0.16) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TUR);
  hat(ctx, koyu, L.eb);
  if (!acik) return;
  const k = r * oran;
  ctx.beginPath();
  ctx.arc(x + L.isik[0] * k, y + L.isik[1] * k, r - k, 0, TUR);
  ctx.fillStyle = acik;
  ctx.fill();
}

/** Yalnız dış hatlı düz dolgu (geçerli yol). */
export function duz(ctx, L, dolgu, kalinlik = 1.2) {
  hat(ctx, dolgu, L.eb, kalinlik);
}

/** Tahta kasa: cel kutu + uzun eksen boyunca tahta aralıkları. */
export function tahta(ctx, L, x, y, w, h, koyu = '#7a5230', acik = '#a8743a', aralik = 0.3) {
  kutu(ctx, L, x, y, w, h, 0.06, koyu, acik);
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.55)';
  ctx.lineWidth = Math.max(0.03, L.eb);
  ctx.beginPath();
  if (w >= h) {
    for (let t = y - h / 2 + aralik; t < y + h / 2 - 0.08; t += aralik) {
      ctx.moveTo(x - w / 2 + 0.08, t);
      ctx.lineTo(x + w / 2 - 0.08, t);
    }
  } else {
    for (let t = x - w / 2 + aralik; t < x + w / 2 - 0.08; t += aralik) {
      ctx.moveTo(t, y - h / 2 + 0.08);
      ctx.lineTo(t, y + h / 2 - 0.08);
    }
  }
  ctx.stroke();
}

/** Metal perçinler (küçük açık noktalar): [[x, y], ...]. */
export function percin(ctx, noktalar, r = 0.05, dolgu = '#c9cdd0') {
  ctx.fillStyle = dolgu;
  ctx.beginPath();
  for (const [x, y] of noktalar) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TUR);
  }
  ctx.fill();
}

/** Oluk: bandın kasası gibi, x boyunca [x0, x1] koyu kasa + açık şerit (hat parçaları). */
export function oluk(ctx, L, x0 = -0.5, x1 = 0.5, yari = 0.42) {
  ctx.beginPath();
  ctx.rect(x0 + 0.04, -yari, x1 - x0 - 0.08, yari * 2);
  hat(ctx, '#4a3a2b', L.eb);
  ctx.fillStyle = '#6e5a44';
  ctx.fillRect(x0 + 0.04, -yari * 0.6, x1 - x0 - 0.08, yari * 1.2);
}

/** Oluk çıtaları: an.faz (dünya pikseli) ile x yönünde kayar; [x0, x1] aralığında. */
export function citalar(ctx, faz, x0 = -0.5, x1 = 0.5, yari = 0.42) {
  const adim = 0.25;
  const kay = (((faz / K) % adim) + adim) % adim;
  ctx.fillStyle = '#8c7556';
  for (let t = x0 + kay; t < x1 - 0.1; t += adim) {
    if (t < x0 + 0.05) continue;
    ctx.fillRect(t, -yari * 0.55, 0.1, yari * 1.1);
  }
}

/** Duman/buhar pofu: yarı saydam daire. */
export function puf(ctx, x, y, r, dolgu) {
  ctx.fillStyle = dolgu;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TUR);
  ctx.fill();
}

/** Mantık kanalları (sistemler.md §2): kırmızı, çivit, sarı, yeşil, mor, beyaz. */
export const KANAL = [
  ['#e0502a', '#7a2a16'], ['#4a7fc0', '#22385a'], ['#f2c440', '#7a6020'],
  ['#6fa83a', '#34501c'], ['#a35ac0', '#4e2a5c'], ['#f6efdc', '#7c766a'],
];

/** Mantık lambası: kanal renginde halka; yanıkken parlak göz + hale. */
export function lamba(ctx, L, x, y, kanal, yanik, r = 0.16) {
  const [acik, koyu] = KANAL[((kanal ?? 0) % 6 + 6) % 6];
  if (yanik) puf(ctx, x, y, r * 1.9, 'rgba(255, 236, 170, 0.35)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TUR);
  hat(ctx, yanik ? acik : koyu, L.eb, 1);
  if (yanik) puf(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, 'rgba(255, 255, 240, 0.85)');
}

/** Dört kanatlı çark (yolu kurar): merkez, yarıçap, kanat eni, açı. */
export function kanatYolu(ctx, x, y, r, en, aci, sayi = 4) {
  ctx.beginPath();
  for (let i = 0; i < sayi; i++) {
    const a = aci + (i * TUR) / sayi;
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(x - s * en, y + c * en);
    ctx.lineTo(x + c * r - s * en, y + s * r + c * en);
    ctx.lineTo(x + c * r + s * en, y + s * r - c * en);
    ctx.lineTo(x + s * en, y - c * en);
    ctx.closePath();
  }
}

/** Kollar (merkezden çıkan çizgiler) yolu: tırmık yıldızı, tekerlek telleri. */
export function kolYolu(ctx, x, y, r0, r1, aci, sayi) {
  ctx.beginPath();
  for (let i = 0; i < sayi; i++) {
    const a = aci + (i * TUR) / sayi;
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  }
}

/** Geçerli yolu önce dış hat, sonra renkle çizgi olarak çizer (kalın kollar). */
export function hatliCizgi(ctx, L, kalinlik, dolgu) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = kalinlik + 2.4 * L.eb;
  ctx.stroke();
  ctx.strokeStyle = dolgu;
  ctx.lineWidth = kalinlik;
  ctx.stroke();
}

/** Port ağızları: çıkışta kenara uzanan metal oluk dili, girişte koyu yarık (yön 0 portları). */
export function agizlar(ctx, L, p, giris = true) {
  const t = p.tanim;
  for (const port of t.cikislar ?? []) agiz(ctx, L, port, true);
  if (giris) for (const port of t.girisler ?? []) agiz(ctx, L, port, false);
}

const PDX = [1, 0, -1, 0];
const PDY = [0, 1, 0, -1];
function agiz(ctx, L, port, cikis) {
  const dx = PDX[port.yon];
  const dy = PDY[port.yon];
  const x = port.x + 0.5 - L.en / 2 + dx * 0.4;
  const y = port.y + 0.5 - L.boy / 2 + dy * 0.4;
  const w = dx ? 0.22 : 0.42;
  const h = dx ? 0.42 : 0.22;
  ctx.beginPath();
  ctx.rect(x - w / 2 + dx * 0.04, y - h / 2 + dy * 0.04, w, h);
  hat(ctx, cikis ? '#8d969c' : '#2b1a10', L.eb, 1);
  if (!cikis) return;
  ctx.fillStyle = '#c9cdd0';
  ctx.fillRect(x - w / 2 + 0.04 + dx * 0.04, y - h / 2 + 0.04 + dy * 0.04, dx ? 0.06 : w - 0.08,
    dx ? h - 0.08 : 0.06);
}
