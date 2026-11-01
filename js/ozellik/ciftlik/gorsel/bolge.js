/**
 * Bölge önbelleği ve bölge dizini. Parça gövdeleri (durağan) 16×16 karoluk bölgeler halinde
 * ara tuvallere EKRAN ölçeğinde bir kez çizilir; her kare yalnız görünür bölgelerin tuvali
 * tek drawImage ile basılır.
 * - Dizin: her bölgenin değen parçaları (gövde çizimi; 1 karo payla) ve sol üst karosu o
 *   bölgede olan parçalar (kare başı gezinti: hareketli, rozet, akış). Binlerce parçada bile
 *   bir bölge yalnız kendi parçalarını tarar. Dizin parça olaylarında (bolgeKirlet) ya da
 *   parça sayısı değişince yeniden kurulur (O(parça), yalnız değişiklikte).
 * - Yenileme: bölge sürümü artınca (parça kuruldu/söküldü/döndü) hemen; yalnız ölçek
 *   değiştiyse (%2'den çok) kare başına süre bütçesiyle: bütçe bitince eski tuval ölçeklenerek
 *   basılır (yakınlaştırma sürerken takılma olmaz), ölçek oturunca keskinleşir.
 * - Bellek: önbellek toplam piksel üst sınırlı; görünmeyen en eski bölgeler bırakılır.
 *   Kenarı PARCA_KENAR'ı (1024) aşan bölge n×n ara tuvale bölünür (başsız Chromium'da
 *   1024²'den büyük kaynak tuvalin drawImage'ı onlarca kat pahalı ölçüldü).
 * - Kip: önbellek mi doğrudan çizim mi, bolgeleriCiz kendini ölçerek seçer (aşağıda).
 */
import { KARO_EN, KARO_BOY } from '../../../kural/ciftlik/olcu.js';
import { ekran, ekranBirim } from '../../../cizim/tuval-olcek.js';
import { KARO_PX, parcaCizimi } from './kayit.js';

export const BOLGE = 16;
const BOLGE_PX = BOLGE * KARO_PX;
const BX = Math.ceil(KARO_EN / BOLGE);
const BY = Math.ceil(KARO_BOY / BOLGE);
const EN_COK_KENAR = 2048;
const PARCA_KENAR = 1024;
/** Parça kenarı en çok 8 karo: sol üstü 7 karo geride olan parça bu bölgeye taşabilir. */
const PARCA_EN_COK = 8;
/** Önbellek tuvallerinin toplam piksel üst sınırı (~96 MB). */
const EN_COK_PIKSEL = 24e6;
/** Yalnız ölçeği eskimiş bölgeler için kare başına yenileme bütçesi (ms). */
const BUTCE_MS = 1;
/** Ölçeği bu orandan çok farklı eski tuval kullanılmaz (bulanıklık), hemen yenilenir. */
const ESKI_ORAN = 1.4;

const surumler = new Uint32Array(BX * BY);
const onbellek = new Map();
const degen = Array.from({ length: BX * BY }, () => []);
const sahip = Array.from({ length: BX * BY }, () => []);
let dunya = null;
let dizinKirli = true;
let dizinBoyut = -1;
let kare = 0;

/**
 * Ölçüm: son karede yeniden çizilen / ertelenen bölge, dizin kuruluşu, önbellek pikseli,
 * doğrudan çizim kipinde mi.
 */
export const bolgeOlcum = { yenilenen: 0, ertelenen: 0, dizin: 0, piksel: 0, dogrudan: false };
/** Kendini ölçen kip seçimi: basma ns/piksel, gövde µs/parça (üstel ortalama). */
const uyum = { blitNs: null, govdeUs: null, dogrudan: false, sayac: -1, sina: 0, bekle: 300 };

/** Karo dikdörtgenine (1 karo payla) değen bölgelerin sürümünü artırır; dizin yenilenir. */
export function bolgeKirlet(kx, ky, en = 1, boy = 1) {
  const x0 = Math.max(0, Math.floor((kx - 1) / BOLGE));
  const y0 = Math.max(0, Math.floor((ky - 1) / BOLGE));
  const x1 = Math.min(BX - 1, Math.floor((kx + en) / BOLGE));
  const y1 = Math.min(BY - 1, Math.floor((ky + boy) / BOLGE));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) surumler[y * BX + x] += 1;
  dizinKirli = true;
}

function dizinKur(c) {
  for (let i = 0; i < degen.length; i++) {
    degen[i].length = 0;
    sahip[i].length = 0;
  }
  for (const p of c.parcalar.values()) {
    sahip[Math.floor(p.y / BOLGE) * BX + Math.floor(p.x / BOLGE)].push(p);
    const x0 = Math.max(0, Math.floor((p.x - 1) / BOLGE));
    const y0 = Math.max(0, Math.floor((p.y - 1) / BOLGE));
    const x1 = Math.min(BX - 1, Math.floor((p.x + p.en) / BOLGE));
    const y1 = Math.min(BY - 1, Math.floor((p.y + p.boy) / BOLGE));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) degen[y * BX + x].push(p);
  }
  dizinBoyut = c.parcalar.size;
  dizinKirli = false;
  bolgeOlcum.dizin += 1;
}

/** Dünya değiştiyse önbelleği boşaltır; dizin eskiyse kurar. */
export function dizinHazirla(c) {
  if (dunya !== c) {
    for (const k of onbellek.values()) birak(k);
    onbellek.clear();
    surumler.fill(0);
    dunya = c;
    dizinKirli = true;
  }
  if (dizinKirli || c.parcalar.size !== dizinBoyut) dizinKur(c);
}

/**
 * Karo dikdörtgeniyle (kx0..kx1, ky0..ky1) kesişen her parça için islev(p) (her parça bir
 * kez; id sırası bölge içinde korunur). Dönüş: çağrı sayısı.
 */
export function gorunurParcalar(c, alan, islev) {
  dizinHazirla(c);
  const x0 = Math.max(0, Math.floor((alan.kx0 - PARCA_EN_COK) / BOLGE));
  const y0 = Math.max(0, Math.floor((alan.ky0 - PARCA_EN_COK) / BOLGE));
  const x1 = Math.min(BX - 1, Math.floor(alan.kx1 / BOLGE));
  const y1 = Math.min(BY - 1, Math.floor(alan.ky1 / BOLGE));
  let n = 0;
  for (let by = y0; by <= y1; by++) {
    for (let bx = x0; bx <= x1; bx++) {
      for (const p of sahip[by * BX + bx]) {
        if (p.x + p.en < alan.kx0 || p.y + p.boy < alan.ky0 || p.x > alan.kx1
          || p.y > alan.ky1) continue;
        islev(p);
        n += 1;
      }
    }
  }
  return n;
}

/** Bölgeye değen parçaların gövdelerini çizer (ctx dünya dönüşümünde). */
function govdeleriCiz(ctx, c, i) {
  const eb = ekranBirim(ctx);
  for (const p of degen[i]) parcaCizimi(p.tanim.anahtar).govde(ctx, p, eb, c);
}

/** Bölgenin ara tuvallerini bırakır (bellek). */
function birak(k) {
  for (const t of k.tuvaller) t.width = 0;
  k.tuvaller.length = 0;
}

const kaplanan = (k) => k.tuvaller.reduce((t, v) => t + v.width * v.height, 0);

function yenile(c, k, i, s) {
  const bas = performance.now();
  const bx = i % BX;
  const by = (i / BX) | 0;
  const n = Math.ceil((BOLGE_PX * s) / PARCA_KENAR);
  const parca = BOLGE_PX / n;
  const kenar = Math.ceil(parca * s);
  while (k.tuvaller.length > n * n) k.tuvaller.pop().width = 0;
  while (k.tuvaller.length < n * n) k.tuvaller.push(document.createElement('canvas'));
  k.tuvaller.forEach((tuval, j) => {
    tuval.width = kenar;
    tuval.height = kenar;
    const ctx = tuval.getContext('2d');
    const x0 = bx * BOLGE_PX + (j % n) * parca;
    const y0 = by * BOLGE_PX + Math.floor(j / n) * parca;
    ctx.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
    govdeleriCiz(ctx, c, i);
  });
  const sayi = degen[i].length * n * n;
  if (sayi) uyum.govdeUs = ewma(uyum.govdeUs, ((performance.now() - bas) * 1000) / sayi);
  Object.assign(k, { surum: surumler[i], s, n, parca });
  bolgeOlcum.yenilenen += 1;
}

function hazirla(c, i, s, bas) {
  let k = onbellek.get(i);
  if (!k) {
    k = { tuvaller: [], surum: -1, s: 0, son: 0, n: 1, parca: BOLGE_PX };
    onbellek.set(i, k);
  }
  k.son = kare;
  if (k.surum !== surumler[i]) {
    yenile(c, k, i, s);
    return k;
  }
  if (Math.abs(k.s - s) <= k.s * 0.02) return k;
  const oran = k.s > s ? k.s / s : s / k.s;
  if (oran < ESKI_ORAN && performance.now() - bas > BUTCE_MS) {
    bolgeOlcum.ertelenen += 1;
    return k;
  }
  yenile(c, k, i, s);
  return k;
}

/** Toplam piksel sınırı aşılırsa bu karede görünmeyen en eski bölgeleri bırakır. */
function bellekSinirla() {
  let toplam = 0;
  for (const k of onbellek.values()) toplam += kaplanan(k);
  bolgeOlcum.piksel = toplam;
  if (toplam <= EN_COK_PIKSEL) return;
  const eskiler = [...onbellek].filter(([, k]) => k.son !== kare)
    .sort((a, b) => a[1].son - b[1].son);
  for (const [i, k] of eskiler) {
    if (toplam <= EN_COK_PIKSEL) break;
    toplam -= kaplanan(k);
    birak(k);
    onbellek.delete(i);
  }
  bolgeOlcum.piksel = toplam;
}

/** Görünür bölgelerin önbellek tuvallerini basar; basma süresini (yenileme hariç) döndürür. */
function bolgeleriBas(ctx, c, b, s) {
  const bas = performance.now();
  let yenileme = 0;
  const onceki = ctx.imageSmoothingEnabled;
  for (let by = b.y0; by <= b.y1; by++) {
    for (let bx = b.x0; bx <= b.x1; bx++) {
      const i = by * BX + bx;
      if (!degen[i].length) continue;
      const t0 = performance.now();
      const k = hazirla(c, i, s, bas);
      yenileme += performance.now() - t0;
      const boy = k.tuvaller[0].width / k.s;
      // Tam ölçekte süzgeç gerekmez (yazılımsal çizimde süzgeçli kopya pahalı).
      ctx.imageSmoothingEnabled = Math.abs(k.s - s) > k.s * 0.02;
      ctx.imageSmoothingQuality = 'low';
      k.tuvaller.forEach((tuval, j) => {
        ctx.drawImage(tuval, bx * BOLGE_PX + (j % k.n) * k.parca,
          by * BOLGE_PX + Math.floor(j / k.n) * k.parca, boy, boy);
      });
    }
  }
  ctx.imageSmoothingEnabled = onceki;
  bellekSinirla();
  return performance.now() - bas - yenileme;
}

const ewma = (eski, yeni) => (eski === null ? yeni : eski * 0.8 + yeni * 0.2);

/**
 * Görünür karo dikdörtgenindeki bölgeleri çizer. s: dünya pikselinden arka bellek pikseline
 * ölçek (z × ekran.tabanX). Dünya değişince (yeni çiftlik) önbellek boşalır.
 * Kendini ölçen seçim: önbellek basmanın piksel başı süresi ile gövdeyi doğrudan çizmenin
 * parça başı süresi izlenir (üstel ortalama); hangisi bu görünümde ucuzsa o (%50 histerezis).
 * GPU'lu tuvalde basma neredeyse bedava (önbellek); yazılımsal büyük tuvalde (ör. DPR 2'de
 * başsız Chromium) saydam bölgeleri karıştırmak pahalıdır, doğrudan çizim kazanır. Tuval
 * boyutu değişince (sayac) ölçüm sıfırlanır; doğrudan kipte önbellek ara sıra (300 karede bir,
 * her seferinde iki katı bekleyerek) yeniden denenir. Çok yakında (EN_COK_KENAR) hep doğrudan.
 */
export function bolgeleriCiz(ctx, c, alan, s) {
  dizinHazirla(c);
  kare += 1;
  bolgeOlcum.yenilenen = 0;
  bolgeOlcum.ertelenen = 0;
  if (uyum.sayac !== ekran.sayac) {
    Object.assign(uyum, { sayac: ekran.sayac, blitNs: null, bekle: 300 });
  }
  const b = {
    x0: Math.max(0, Math.floor(alan.kx0 / BOLGE)), y0: Math.max(0, Math.floor(alan.ky0 / BOLGE)),
    x1: Math.min(BX - 1, Math.floor(alan.kx1 / BOLGE)),
    y1: Math.min(BY - 1, Math.floor(alan.ky1 / BOLGE)),
  };
  let alanPx = 0;
  let parca = 0;
  for (let by = b.y0; by <= b.y1; by++) {
    for (let bx = b.x0; bx <= b.x1; bx++) {
      const n = degen[by * BX + bx].length;
      parca += n;
      if (n) alanPx += (BOLGE_PX * s) ** 2;
    }
  }
  const basmaMs = uyum.blitNs === null ? 0 : (uyum.blitNs * alanPx) / 1e6;
  const dogrudanMs = uyum.govdeUs === null ? Infinity : (uyum.govdeUs * parca) / 1000;
  if (!uyum.dogrudan && basmaMs > 1 && basmaMs > dogrudanMs * 1.5) {
    uyum.dogrudan = true;
    uyum.sina = kare + uyum.bekle; // ara sıra yeniden dene (geçici sıçrama yanıltmasın)
    uyum.bekle = Math.min(uyum.bekle * 2, 9600);
  } else if (uyum.dogrudan && (uyum.blitNs === null || dogrudanMs > basmaMs * 1.5
    || kare >= uyum.sina)) {
    uyum.dogrudan = false;
  }
  bolgeOlcum.dogrudan = uyum.dogrudan || BOLGE_PX * s > EN_COK_KENAR;
  if (bolgeOlcum.dogrudan) {
    const bas = performance.now();
    const eb = ekranBirim(ctx);
    const n = gorunurParcalar(c, alan, (p) => parcaCizimi(p.tanim.anahtar).govde(ctx, p, eb, c));
    if (n) uyum.govdeUs = ewma(uyum.govdeUs, ((performance.now() - bas) * 1000) / n);
    return;
  }
  const sure = bolgeleriBas(ctx, c, b, s);
  if (alanPx) uyum.blitNs = ewma(uyum.blitNs, (sure * 1e6) / alanPx);
}
