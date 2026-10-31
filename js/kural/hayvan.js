/**
 * Tarla hayvanları (süs; puana ve oynanışa etkisi yok): tür tablosu ve tohumdan yerleşim.
 * Hayvanlar samanın içinde saklıdır; hareket mantığı hayvan-hareket.js'tedir. Yerleşim
 * kendi üretecini (tarla.tohum ^ HAYVAN_TOHUM_KARISTIR) kullanır; böylece tarla, iğne ve
 * çivi üretimi değişmez. Koordinatlar DÜNYA birimidir (hücre i, [i, i+1) aralığıdır).
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';
import { uretec } from './rastgele.js';

export const HAYVAN_TOHUM_KARISTIR = 0x7f4a7c15;
/** Hayvanların tarla kenarından en az uzaklığı (hücre). */
export const KENAR = 2;
const IKI_PI = Math.PI * 2;

/**
 * tetik: rahatsızlık yarıçapı (hücre); hiz: kaçış hızı (hücre/sn); tepki: ürkme süresi (sn);
 * azamiKacis: samana dalıp yeniden saklanabileceği toplam kaçış; siginak: sığınılacak
 * samanın en az yüksekliği; menzil/enAz: sığınak aranan uzaklık aralığı (hücre).
 */
export const TURLER = {
  fare: { tetik: 3.4, hiz: 15, tepki: 0.14, azamiKacis: 2, siginak: 18, menzil: 30, enAz: 6 },
  serce: { tetik: 4.4, hiz: 22, tepki: 0.12, azamiKacis: 1 },
  kurbaga: { tetik: 2.8, hiz: 11, tepki: 0.25, azamiKacis: 1, siginak: 6, menzil: 16, enAz: 6 },
  kirpi: { tetik: 2.2, hiz: 3.4, tepki: 1.3, azamiKacis: 1, siginak: 6, menzil: 12, enAz: 5 },
  kedi: { tetik: 2.4, hiz: 4.6, tepki: 1.7, azamiKacis: 1 },
};

/** Garaj sırasının ucundan kedinin uyku yeri ve oturacağı yere uzaklıklar (hücre). */
const KEDI_UYKU = { yan: 2.6, iceri: -1.6 };
const KEDI_OTUR_YAN = 8;

function yerSec(zar, tarla, hmin, hmax, engeller) {
  for (let deneme = 0; deneme < 400; deneme++) {
    const x = KENAR + zar() * (GENISLIK - 2 * KENAR);
    const y = KENAR + zar() * (YUKSEKLIK - 2 * KENAR);
    const h = tarla.h[Math.floor(y) * GENISLIK + Math.floor(x)];
    if (h < hmin || h > hmax) continue;
    if (engeller.some((e) => Math.hypot(x - e.x, y - e.y) < e.r)) continue;
    return { x, y, h };
  }
  if (hmin > 0 || engeller.length) return yerSec(zar, tarla, 0, Infinity, engeller.slice(0, 2));
  return { x: GENISLIK / 2, y: YUKSEKLIK / 2, h: 0 };
}

function yeni(id, tur, yer, zar) {
  return {
    id, tur, x: yer.x, y: yer.y, yon: zar() * IKI_PI - Math.PI, durum: 'gizli', t: 0,
    gecen: 0, bekle: 0, faz: zar() * IKI_PI, h0: yer.h, kacis: 0, ox: yer.x, oy: yer.y,
    tx: 0, ty: 0, hx: yer.x, hy: yer.y, uyeler: null, sure: 0,
  };
}

/** Serçe sürüsü üyeleri: küçük dağılım, uçuş sapması, hız ve kalkış gecikmesi. */
function surudeUyeler(zar) {
  const n = 3 + Math.floor(zar() * 2);
  return Array.from({ length: n }, () => ({
    a: (zar() - 0.5) * 1.5, v: 0.88 + zar() * 0.24, g: zar() * 0.16, fz: zar() * IKI_PI,
    dx: (zar() - 0.5) * 3.4, dy: (zar() - 0.5) * 3.4,
  }));
}

/** Garaj sırasının bir ucunda, kenara yakın uyuyan kedi (oturacağı yer hx, hy). */
function kediKur(id, garaj, zar) {
  const taraf = zar() < 0.5 ? -1 : 1;
  const bx = -Math.sin(garaj.yon);
  const by = Math.cos(garaj.yon);
  const ix = Math.cos(garaj.yon);
  const iy = Math.sin(garaj.yon);
  const yan = taraf * (garaj.en / 2 + KEDI_UYKU.yan);
  const iceri = KEDI_UYKU.iceri; // garaj merkezinden kenara doğru (arka gölge)
  const sinir = (x, y) => ({
    x: Math.min(GENISLIK - KENAR, Math.max(KENAR, x)),
    y: Math.min(YUKSEKLIK - KENAR, Math.max(KENAR, y)),
  });
  const uyku = sinir(garaj.x + bx * yan + ix * iceri, garaj.y + by * yan + iy * iceri);
  const otur = sinir(garaj.x + bx * (yan + taraf * KEDI_OTUR_YAN) + ix * (iceri + 2),
    garaj.y + by * (yan + taraf * KEDI_OTUR_YAN) + iy * (iceri + 2));
  const k = yeni(id, 'kedi', { ...uyku, h: 0 }, zar);
  Object.assign(k, { durum: 'uyku', hx: otur.x, hy: otur.y, yon: garaj.yon + taraf * 1.2 });
  return k;
}

/**
 * Tarla başına 4-8 hayvan kurar: 2-3 fare, 1-2 serçe sürüsü, 1-2 yavaş hayvan (kurbağa ya
 * da kirpi), %35 olasılıkla garajın yanında uyuyan bir kedi. Yalnız tarlayı okur.
 */
export function hayvanKur(tarla, garaj, karakter) {
  const zar = uretec((tarla.tohum ^ HAYVAN_TOHUM_KARISTIR) >>> 0);
  const planlar = [];
  const fare = 2 + Math.floor(zar() * 2);
  const serce = 1 + Math.floor(zar() * 2);
  const yavas = 1 + Math.floor(zar() * 2);
  for (let i = 0; i < fare; i++) planlar.push(['fare', 6, 90]);
  for (let i = 0; i < serce; i++) planlar.push(['serce', 3, 90]);
  for (let i = 0; i < yavas; i++) planlar.push([zar() < 0.5 ? 'kurbaga' : 'kirpi', 2, 24]);
  const kediVar = zar() < 0.35;
  const engeller = [{ x: karakter.x, y: karakter.y, r: 12 }, { x: garaj.x, y: garaj.y, r: 16 }];
  const hayvanlar = [];
  for (const [tur, hmin, hmax] of planlar) {
    const yer = yerSec(zar, tarla, hmin, hmax, engeller);
    engeller.push({ x: yer.x, y: yer.y, r: 9 });
    const h = yeni(`${tur}-${hayvanlar.length + 1}`, tur, yer, zar);
    if (tur === 'serce') h.uyeler = surudeUyeler(zar);
    hayvanlar.push(h);
  }
  if (kediVar) hayvanlar.push(kediKur(`kedi-${hayvanlar.length + 1}`, garaj, zar));
  return hayvanlar;
}
