/**
 * Hayvan hareketi (saf, deterministik; rastgelelik yok): ürkme, kaçış hedefi, yürüme /
 * zıplama / uçuş ve samana dalma. Durumlar: gizli (samanda), uyku (kedi), sasirma, esneme,
 * kacis, ucus (serçe), dalis, otur (kedi) ve kayip (sahneden çıktı). Aynı olay ve aynı
 * kare süreleri aynı sonucu verir: hareket sabit adımlarla ilerler.
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';
import { TURLER, KENAR } from './hayvan.js';

/** Sabit benzetim adımı (sn): kare hızından bağımsız aynı yol. */
export const SABIT_ADIM = 1 / 60;
/** Samana dalış süresi (sn) ve dalıştan sonra yeniden ürkmeme süresi. */
export const DALIS_SURE = 0.45;
export const DALIS_BEKLE = 1.5;
/** Kurbağa zıplama döngüsü (sn); ilk yarısında havada. */
export const ZIPLAMA_DONGU = 0.62;
/** Hayvanın bulunduğu saman en az bu kadar (ya da yarısı) azalırsa saklanamaz. */
const ACIKLIK_AZALMA = 3;
const DONUS_HIZI = 14;

const IKI_PI = Math.PI * 2;
const hucre = (tarla, x, y) => tarla.h[Math.floor(y) * GENISLIK + Math.floor(x)];

/** Açıyı hedefe en çok `adim` kadar döndürür (en kısa yoldan). */
function donder(a, hedef, adim) {
  const fark = ((hedef - a + Math.PI * 3) % IKI_PI) - Math.PI;
  return Math.abs(fark) <= adim ? hedef : a + Math.sign(fark) * adim;
}

/** Kurbağa zıplamasında bu anda yerde mi (hareket) ve havada yükseklik 0..1. */
export function ziplama(t) {
  const p = (t % ZIPLAMA_DONGU) / ZIPLAMA_DONGU;
  return { havada: p < 0.5, yuk: p < 0.5 ? Math.sin(p * IKI_PI) : 0 };
}

/** Işının tarla sınırından (kenar payıyla) çıktığı uzaklık. */
function cikisUzakligi(x, y, aci, pay) {
  const c = Math.cos(aci);
  const s = Math.sin(aci);
  const tx = c > 0 ? (GENISLIK + pay - x) / c : c < 0 ? (-pay - x) / c : Infinity;
  const ty = s > 0 ? (YUKSEKLIK + pay - y) / s : s < 0 ? (-pay - y) / s : Infinity;
  return Math.min(tx, ty);
}

/** Serçe üyesinin t anındaki konumu (kalkışta hızlanır): { x, y, z (0..1), a }. */
export function uyeKonumu(h, u) {
  const s = Math.max(0, h.t - u.g);
  const yol = u.v * TURLER.serce.hiz * (s < 0.5 ? s * s : s - 0.25);
  const a = h.yon + u.a;
  return {
    x: h.x + u.dx + Math.cos(a) * yol, y: h.y + u.dy + Math.sin(a) * yol,
    z: Math.min(1, s * 2.2), a,
  };
}

/** Sürünün sahneden tamamen çıkacağı uçuş süresi (sn). */
function surudenCikis(h) {
  let uzun = 0;
  for (const u of h.uyeler) {
    const d = cikisUzakligi(h.x + u.dx, h.y + u.dy, h.yon + u.a, 8) / (u.v * TURLER.serce.hiz);
    uzun = Math.max(uzun, d + 0.25 + u.g);
  }
  return uzun;
}

/** Yerdeki hayvan için tehditten uzaklaşan yönde en yakın yüksek samanı (sığınak) seçer. */
function hedefSec(h, tarla) {
  const tur = TURLER[h.tur];
  const ax = Math.cos(h.yon);
  const ay = Math.sin(h.yon);
  let en = null;
  for (let y = Math.floor(h.y - tur.menzil); y <= h.y + tur.menzil; y += 2) {
    for (let x = Math.floor(h.x - tur.menzil); x <= h.x + tur.menzil; x += 2) {
      if (x < KENAR || y < KENAR || x >= GENISLIK - KENAR || y >= YUKSEKLIK - KENAR) continue;
      const dx = x + 0.5 - h.x;
      const dy = y + 0.5 - h.y;
      const d = Math.hypot(dx, dy);
      if (d < tur.enAz || d > tur.menzil || dx * ax + dy * ay < 0.2 * d) continue;
      if (tarla.h[y * GENISLIK + x] < tur.siginak) continue;
      if (!en || d < en.d) en = { x: x + 0.5, y: y + 0.5, d };
    }
  }
  if (en) {
    h.hx = en.x;
    h.hy = en.y;
    return;
  }
  const uzak = tur.enAz * 2.5;
  h.hx = Math.min(GENISLIK - KENAR, Math.max(KENAR, h.x + ax * uzak));
  h.hy = Math.min(YUKSEKLIK - KENAR, Math.max(KENAR, h.y + ay * uzak));
}

/**
 * Gizli (ya da uyuyan) hayvanı (tx, ty) noktasından ürkütür; ürktüyse true. Yön tehditten
 * uzağa bakar; serçe sürüsü uçuş yönünü, yerdeki hayvan sığınağını burada seçer.
 */
export function sasirt(h, tarla, tx, ty) {
  if (h.durum !== 'gizli' && h.durum !== 'uyku') return false;
  if (h.bekle > 0) return false;
  const d = Math.hypot(h.x - tx, h.y - ty);
  Object.assign(h, { tx, ty, t: 0, gecen: 0, ox: h.x, oy: h.y });
  if (h.tur !== 'kedi') h.yon = d > 0.05 ? Math.atan2(h.y - ty, h.x - tx) : h.faz;
  h.kacis += 1;
  h.durum = h.tur === 'kedi' ? 'esneme' : 'sasirma';
  if (h.tur === 'serce') h.sure = surudenCikis(h);
  else if (h.tur !== 'kedi') hedefSec(h, tarla);
  return true;
}

/**
 * (x, y) noktasındaki rahatsızlık (kazı, adım, makine): tetik yarıçapı (çarpanla ölçekli)
 * içindeki gizli hayvanları ürkütür; ürkenlerin listesini döndürür.
 */
export function rahatsizEt(hayvanlar, tarla, x, y, carpan = 1) {
  const urken = [];
  for (const h of hayvanlar) {
    if (h.durum !== 'gizli' && h.durum !== 'uyku') continue;
    if (Math.hypot(h.x - x, h.y - y) > TURLER[h.tur].tetik * carpan) continue;
    if (sasirt(h, tarla, x, y)) urken.push(h);
  }
  return urken;
}

/** Belirli türdeki uyuyan/gizli hayvanları (ör. makine çalışınca kediyi) uyandırır. */
export function uyandir(hayvanlar, tarla, tur, x, y) {
  return hayvanlar.filter((h) => h.tur === tur && sasirt(h, tarla, x, y));
}

/** Hedefe doğru yürür; vardıysa true. Kurbağa yalnız zıplamanın havadaki yarısında ilerler. */
function yuru(h, dt) {
  const hiz = TURLER[h.tur].hiz;
  const dx = h.hx - h.x;
  const dy = h.hy - h.y;
  const d = Math.hypot(dx, dy);
  h.yon = donder(h.yon, Math.atan2(dy, dx), DONUS_HIZI * dt);
  let v = hiz;
  if (h.tur === 'fare') v *= 0.78 + 0.22 * Math.sin(h.t * 14 + h.faz);
  if (h.tur === 'kurbaga') v = ziplama(h.t).havada ? hiz : 0;
  const adim = v * dt;
  if (d <= adim + 0.3) return true;
  h.x += Math.cos(h.yon) * adim;
  h.y += Math.sin(h.yon) * adim;
  return false;
}

function acikMi(h, tarla) {
  const az = Math.max(ACIKLIK_AZALMA, h.h0 * 0.4);
  return h.h0 > 0 && h.h0 - hucre(tarla, h.x, h.y) >= az;
}

function adimAt(h, tarla, dt, tehdit) {
  const tur = TURLER[h.tur];
  h.t += dt;
  h.gecen += dt;
  if (h.bekle > 0) h.bekle = Math.max(0, h.bekle - dt);
  if (h.durum === 'gizli') {
    if (h.bekle === 0 && tehdit && acikMi(h, tarla)) sasirt(h, tarla, tehdit.x, tehdit.y);
  } else if (h.durum === 'sasirma' && h.t >= tur.tepki) {
    h.durum = h.tur === 'serce' ? 'ucus' : 'kacis';
    h.t = 0;
  } else if (h.durum === 'esneme' && h.t >= tur.tepki) {
    h.durum = 'kacis';
    h.t = 0;
  } else if (h.durum === 'kacis' && yuru(h, dt)) {
    h.durum = h.tur === 'kedi' ? 'otur' : 'dalis';
    h.t = 0;
  } else if (h.durum === 'ucus' && h.t >= h.sure) {
    h.durum = 'kayip';
  } else if (h.durum === 'dalis') {
    h.x += Math.cos(h.yon) * tur.hiz * 0.1 * dt;
    h.y += Math.sin(h.yon) * tur.hiz * 0.1 * dt;
    if (h.t >= DALIS_SURE) dalisBitti(h, tarla, tur);
  }
}

function dalisBitti(h, tarla, tur) {
  if (h.kacis >= tur.azamiKacis) {
    h.durum = 'kayip';
    return;
  }
  Object.assign(h, { durum: 'gizli', t: 0, bekle: DALIS_BEKLE, h0: hucre(tarla, h.x, h.y) });
}

/**
 * Hayvanları dt saniye ilerletir (sabit adımlarla). tehdit {x, y}: saklandığı saman
 * azalan hayvanın kaçacağı yönü belirleyen nokta (ör. karakter); yoksa açıklık denetlenmez.
 */
export function ilerlet(hayvanlar, tarla, dt, tehdit = null) {
  let kalan = dt;
  while (kalan > 1e-9) {
    const d = Math.min(SABIT_ADIM, kalan);
    for (const h of hayvanlar) if (h.durum !== 'kayip') adimAt(h, tarla, d, tehdit);
    kalan -= d;
  }
}
