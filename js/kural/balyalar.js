/**
 * Balyalar (saf kural): balya makinesinin tarlaya bıraktığı saman balyaları. Balya
 * bırakma (iğne ve çivileri içine paketler), çarpışma daireleri, karakterin açacağı balyayı
 * seçme ve açma (El + Boşluk, ~1.5 sn): saman balyanın çevresine yayılarak tarlaya döner,
 * içindeki iğne ve çiviler balyanın yerinde açıkta kalır, balya listeden çıkar.
 *
 * Balya: { id, x, y, yon, acik, acilma, saman, igne: bool, civiler: [çivi] }; x, y DÜNYA
 * biriminde (makineler gibi), yon yuvarlanma yönü. Liste tarla.balyalar (= durum.balyalar).
 * Balyadaki nesnenin balyada alanı balyanın kimliğidir (igne.js tarlada / igneKonumu).
 */
import { GENISLIK, YUKSEKLIK, icinde } from './boyut.js';

/** Çarpışma dairesi (hücre): karakter ve makineler balyanın içinden geçemez. */
export const BALYA_YARICAP = 0.8;
/** Karakterin balya kenarına en çok bu kadar yakın olması gerekir (hücre). */
export const ACMA_MESAFE = 1.5;
/** El ile açma süresi (sn): acilma 0 → 1. */
export const ACMA_SURE = 1.5;
/** Açılan balyanın samanı bu iki yarıçap arasındaki halkaya yayılır (hücre). */
export const YAYMA_IC = 1.5;
export const YAYMA_DIS = 4;
/** Karakterin yüzü balyaya dönük sayılması için en büyük açı farkının kosinüsü. */
const YUZ_KOSINUS = 0.5;

const kirp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Balyaların çarpışma daireleri ({x, y, r}, dünya birimi). */
export function balyaEngelleri(balyalar) {
  return balyalar.map((b) => ({ x: b.x, y: b.y, r: BALYA_YARICAP }));
}

/** (x, y) başka bir balyayla çakışmıyorsa true. */
function bosMu(balyalar, x, y) {
  return balyalar.every((b) => Math.hypot(b.x - x, b.y - y) >= 2 * BALYA_YARICAP + 0.2);
}

/**
 * (x, y)'ye (dünya birimi) yon yönünde bir balya bırakır; yer doluysa yana (yon'a dik)
 * kayar. icerik: { saman, igne: bool, civiler }. İğne ve çiviler balyaya paketlenir
 * (kepcede biter, balyada = kimlik; x, y balyanın hücresi). Dönüş: yeni balya.
 */
export function balyaBirak(tarla, x, y, yon, icerik) {
  const liste = tarla.balyalar;
  const r = BALYA_YARICAP + 0.2;
  const yanX = -Math.sin(yon);
  const yanY = Math.cos(yon);
  let yer = null;
  const adim = 2 * BALYA_YARICAP + 0.4;
  for (const k of [0, 1, -1, 2, -2, 3, -3]) {
    const aday = {
      x: kirp(x + yanX * k * adim, r, GENISLIK - r),
      y: kirp(y + yanY * k * adim, r, YUKSEKLIK - r),
    };
    if (bosMu(liste, aday.x, aday.y)) {
      yer = aday;
      break;
    }
  }
  yer = yer || { x: kirp(x, r, GENISLIK - r), y: kirp(y, r, YUKSEKLIK - r) };
  tarla.balyaSayac = (tarla.balyaSayac || 0) + 1;
  const balya = {
    id: `balya-${tarla.balyaSayac}`, x: yer.x, y: yer.y, yon, acik: false, acilma: 0,
    saman: icerik.saman, igne: icerik.igne, civiler: [...icerik.civiler],
  };
  const hx = Math.round(kirp(balya.x - 0.5, 0, GENISLIK - 1));
  const hy = Math.round(kirp(balya.y - 0.5, 0, YUKSEKLIK - 1));
  const nesneler = balya.igne ? [tarla.igne, ...balya.civiler] : balya.civiler;
  for (const n of nesneler) Object.assign(n, { kepcede: false, balyada: balya.id, x: hx, y: hy });
  liste.push(balya);
  return balya;
}

/**
 * Karakterin ({x, y, yon}, dünya birimi) açabileceği balya: kenarına ≤ ACMA_MESAFE yakın
 * ve yüzü ona dönük olanların en yakını; yoksa null.
 */
export function acilacakBalya(balyalar, k) {
  let enIyi = null;
  let enAz = Infinity;
  for (const b of balyalar) {
    const dx = b.x - k.x;
    const dy = b.y - k.y;
    const d = Math.hypot(dx, dy);
    if (d - BALYA_YARICAP > ACMA_MESAFE || d >= enAz) continue;
    const yuz = d < 1e-6 ? 1 : (dx * Math.cos(k.yon) + dy * Math.sin(k.yon)) / d;
    if (yuz < YUZ_KOSINUS) continue;
    enAz = d;
    enIyi = b;
  }
  return enIyi;
}

/** Hücre birimindeki (cx, cy) çevresinde r yarıçaplı dairedeki en yüksek saman. */
function enYuksek(tarla, cx, cy, r) {
  let enCok = 0;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (icinde(x, y)) enCok = Math.max(enCok, tarla.h[y * GENISLIK + x]);
    }
  }
  return enCok;
}

/** Balyanın samanını (cx, cy) çevresindeki halkaya eşit dağıtır; halka boşsa merkeze. */
function samaniYay(tarla, cx, cy, saman) {
  const hucreler = [];
  for (let y = Math.floor(cy - YAYMA_DIS); y <= Math.ceil(cy + YAYMA_DIS); y++) {
    for (let x = Math.floor(cx - YAYMA_DIS); x <= Math.ceil(cx + YAYMA_DIS); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= YAYMA_IC && d <= YAYMA_DIS && icinde(x, y)) hucreler.push(y * GENISLIK + x);
    }
  }
  if (!hucreler.length) hucreler.push(Math.round(cy) * GENISLIK + Math.round(cx));
  const pay = Math.floor(saman / hucreler.length);
  const artan = saman - pay * hucreler.length;
  hucreler.forEach((i, k) => {
    tarla.h[i] = Math.min(65535, tarla.h[i] + pay + (k < artan ? 1 : 0));
  });
}

/**
 * Balyayı açar: saman çevreye döner (kaldirilan değişmez; yığın kayması dağıtır), iğne ve
 * çiviler balyanın yerinde açıkta kalır (z, yayılan samanın üstünde: gömülmez), balya
 * listeden çıkar. Dönüş: { balya, igne, civiSayisi }.
 */
export function balyaAc(tarla, balya) {
  const cx = Math.round(kirp(balya.x - 0.5, 2, GENISLIK - 3));
  const cy = Math.round(kirp(balya.y - 0.5, 2, YUKSEKLIK - 3));
  samaniYay(tarla, cx, cy, balya.saman);
  const ust = enYuksek(tarla, cx, cy, YAYMA_DIS + 1);
  if (balya.igne) Object.assign(tarla.igne, { x: cx, y: cy, z: ust, balyada: null });
  // Çiviler iğnenin yanına, balyaya dik doğrultuda 2'şer hücre arayla.
  balya.civiler.forEach((c, k) => {
    const d = 2 * (k + 1) * (k % 2 ? -1 : 1);
    const x = Math.round(kirp(cx - Math.sin(balya.yon) * d, 2, GENISLIK - 3));
    const y = Math.round(kirp(cy + Math.cos(balya.yon) * d, 2, YUKSEKLIK - 3));
    Object.assign(c, { x, y, z: Math.max(ust, enYuksek(tarla, x, y, 2)), balyada: null });
  });
  Object.assign(balya, { acik: true, acilma: 1 });
  const i = tarla.balyalar.indexOf(balya);
  if (i >= 0) tarla.balyalar.splice(i, 1);
  return { balya, igne: balya.igne, civiSayisi: balya.civiler.length };
}

/**
 * Açmayı dt kadar ilerletir (acik = true, acilma artar); 1'e varınca açar.
 * Dönüş: açıldıysa balyaAc'ın sonucu, değilse null.
 */
export function balyaAcIlerlet(tarla, balya, dt) {
  balya.acik = true;
  balya.acilma = Math.min(1, balya.acilma + dt / ACMA_SURE);
  return balya.acilma >= 1 ? balyaAc(tarla, balya) : null;
}
