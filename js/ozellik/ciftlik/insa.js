/**
 * Çiftlikte inşa: paylaşılan kip durumu (`insa`), kip kaydı ve işaretçi dağıtımı. Kipler
 * (docs/ciftlik/arayuz.md §1): 'gez' (varsayılan: parçaya dokun = incele), 'kur' (seçili
 * parça; hat parçasında sürükleme hat çeker), 'sil' ve kayıtlı ek kipler (I2: 'sec').
 * Kip işlevleri (kipTanimla) işaretçi olaylarını araçlardan önce alır (girdiOnleyiciEkle);
 * true dönen olay araca gitmez. İkinci parmak gelince süren hamle iptal edilir (iki parmak
 * kamera.js'te). Kısayollar kisayol.js'te. Eylemler benzetime yalnız komutla girer
 * (insaEylem → komutEkle) ve geri al yığınına (kural/ciftlik/insa/gecmis.js) tek adım olur.
 * Ekonomi (kuruş, fiyat, kilit) `kaynak` kancasından okunur: SAP, ekonomi işi (G)
 * insaKaynagiKur ile bağlar.
 */
import { girdiOnleyiciEkle } from '../../girdi.js';
import { gorunum } from '../../gorunum.js';
import { ekrandanDunyaya } from '../../kural/gorunum.js';
import { durumAl } from '../../oyun.js';
import { dinle } from '../../olaylar.js';
import { bildir } from '../../arayuz.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import {
  gecmisKur, gecmisEkle, gecmisGeriAl, gecmisYinele, gecmisReddet, geriKomutlari, yapKomutlari,
} from '../../kural/ciftlik/insa/gecmis.js';
import { NEDEN_METNI } from '../../kural/ciftlik/insa/yerlesim.js';
import { ayarlariAl } from '../../kural/ciftlik/insa/ayar.js';

export { yerlesimKonumu } from '../../kural/ciftlik/insa/yerlesim.js';

const tuval = document.getElementById('tarla');
/** Hızlı çubuk uzunluğu (1-9). */
export const HIZLI_EN_COK = 9;

/** Paylaşılan inşa durumu (palet, önizleme çizimi, panel okur). */
export const insa = {
  acik: false, kip: 'gez', secili: null, yon: 0, hayalet: null, yol: null, basili: null,
  onizleme: null, bekleyen: null, ayarlar: [], imlec: null, incelenen: null, hizli: [],
};

/**
 * Ekonomi kaynağı (SAP: kuruş sistemi yokken hiçbir şey "yetmez", hiçbir parça kilitli
 * değil). kurus(durum) → sayı | null, fiyat(tanim) → sayı | null, kilit(tanim, durum) →
 * null | "D4 İlk balyalar'da açılır".
 */
export const kaynak = {
  kurus: () => null,
  fiyat: (t) => (typeof t.maliyet === 'number' ? t.maliyet : t.maliyet?.kurus ?? null),
  kilit: () => null,
};

const dinleyiciler = [];
/** Kayıtlı kipler (ad → işlevler) ve Esc/✕ kapatıcıları (kisayol.js okur). */
export const kipler = new Map();
export const kapaticilar = [];
const parmaklar = new Set();
const gecmis = gecmisKur();

export const ciftlikte = () => durumAl()?.mod === 'ciftlik';

/** İnşa durumu değişince çağrılır (palet, düğmeler). */
export function insaDinle(islev) {
  dinleyiciler.push(islev);
}

export function degisti() {
  for (const islev of dinleyiciler) islev(insa);
}

/** Ekonomi işi bağlar (kuruş, fiyat, kilit); palet ve önizleme hemen yenilenir. */
export function insaKaynagiKur(yeni) {
  Object.assign(kaynak, yeni);
  degisti();
}

/** Parça için önizleme seçenekleri: { fiyat, butce, kilit }. */
export function kaynakSecenek(tanim, durum = durumAl()) {
  return { fiyat: kaynak.fiyat(tanim), butce: kaynak.kurus(durum), kilit: kaynak.kilit(tanim,
    durum) };
}

/**
 * Kip kaydı. islevler: { bas(e, karo), tasi(e, karo), bitir(e, karo) → bool (olay tüketildi),
 * iptal(), gir(), cik(), tus(e) → bool, dugme: { metin, baslik, tus: 'KeyV' } }.
 */
export function kipTanimla(ad, islevler) {
  kipler.set(ad, islevler);
  degisti();
}

/** Düğmesi olan kayıtlı kipler: [[ad, dugme]] (palet eylem şeridi). */
export function kipDugmeleri() {
  return [...kipler].filter(([, k]) => k.dugme).map(([ad, k]) => [ad, k.dugme]);
}

/** Süren hamleyi ve bekleyen onayı bırakır. */
export function hamleIptal() {
  kipler.get(insa.kip)?.iptal?.();
  Object.assign(insa, { basili: null, yol: null, bekleyen: null });
  degisti();
}

/**
 * İkinci parmak geldi: süren basılı hamle bırakılır; onay bekleyen hayalet (✓ baloncuğu)
 * yerinde kalır (yakınlaştırıp bakmak onu silmesin).
 */
function basiliIptal() {
  const bekleyen = insa.bekleyen;
  if (!bekleyen) {
    hamleIptal();
    return;
  }
  insa.basili = null;
  bekleyen.ciz?.();
  degisti();
}

/** Kipe geçer ('kur' ise secili parça anahtarı). Gez dışındaki kip paleti de açar. */
export function kipAc(ad, secili = null) {
  if (!ciftlikte() && ad !== 'gez') return;
  hamleIptal();
  if (ad !== insa.kip) kipler.get(insa.kip)?.cik?.();
  const onceki = insa.kip;
  insa.kip = ad;
  insa.secili = ad === 'kur' ? secili : ad === 'sil' ? 'sok' : null;
  if (ad !== 'kur') insa.ayarlar = [];
  if (ad !== 'gez') insa.acik = true;
  if (ad === 'kur') {
    insa.hizli = [secili, ...insa.hizli.filter((a) => a !== secili)].slice(0, HIZLI_EN_COK);
  }
  if (ad !== onceki || ad === 'kur') kipler.get(ad)?.gir?.();
  degisti();
}

/** Parça seçer (aynısına yeniden basmak bırakır); 'sok' sil kipidir (eski API). */
export function sec(anahtar, { ayarlar = [], yon = null } = {}) {
  if (anahtar === 'sok') return kipAc(insa.kip === 'sil' ? 'gez' : 'sil');
  if (insa.kip === 'kur' && insa.secili === anahtar && yon === null) return kipAc('gez');
  if (yon !== null) insa.yon = yon & 3;
  kipAc('kur', anahtar);
  insa.ayarlar = ayarlar;
  return undefined;
}

/** Pipet: parçanın türünü, yönünü ve ayarlarını kur kipine alır (kilitliyse almaz). */
export function pipetAl(p) {
  if (!p) return false;
  const kilit = kaynak.kilit(p.tanim, durumAl());
  if (kilit) {
    bildir(`${p.tanim.ad}: ${kilit}`);
    return false;
  }
  sec(p.tanim.anahtar, { yon: p.yon, ayarlar: ayarlariAl(p) });
  bildir(`Pipet: ${p.tanim.ad}`, 1400);
  return true;
}

export function paletAc(acik = !insa.acik) {
  insa.acik = acik && ciftlikte();
  if (!insa.acik && insa.kip !== 'gez') kipAc('gez');
  degisti();
}

export function dondur(adim = 1) {
  insa.yon = (insa.yon + adim + 4) & 3;
  kipler.get(insa.kip)?.dondu?.();
  degisti();
}

/** Esc / ✕ zincirine kapatıcı ekler (panel): islev() true dönerse bir şey kapandı. */
export function kapaticiEkle(islev) {
  kapaticilar.push(islev);
}

// --- Geri al / yinele ---
/** Bir oyuncu eylemi: komut çiftleri benzetime verilir ve tek geri alma adımı olur. */
export function insaEylem(ad, ciftler) {
  const d = durumAl();
  if (!ciftlikte() || !ciftler.length) return false;
  for (const cift of ciftler) for (const k of cift.yap) komutEkle(d.ciftlik, k);
  gecmisEkle(gecmis, { ad, ciftler });
  degisti();
  return true;
}

export function geriAlinabilir() {
  return { geri: gecmis.geri.length > 0, ileri: gecmis.ileri.length > 0 };
}

export function geriAl() {
  const adim = ciftlikte() && gecmisGeriAl(gecmis);
  if (!adim) return;
  for (const k of geriKomutlari(adim)) komutEkle(durumAl().ciftlik, k);
  bildir(`Geri alındı: ${adim.ad}`);
  degisti();
}

export function yinele() {
  const adim = ciftlikte() && gecmisYinele(gecmis);
  if (!adim) return;
  for (const k of yapKomutlari(adim)) komutEkle(durumAl().ciftlik, k);
  bildir(`Yinelendi: ${adim.ad}`);
  degisti();
}

dinle('komut-reddedildi', ({ komut, neden }) => {
  if (!ciftlikte()) return;
  gecmisReddet(gecmis, komut);
  if (neden !== 'bilinmeyen') bildir(`Yapılamadı: ${NEDEN_METNI[neden] ?? neden}`);
  degisti();
});
dinle('oyun-basladi', () => {
  gecmis.geri.length = 0;
  gecmis.ileri.length = 0;
  Object.assign(insa, { incelenen: null, hayalet: null, imlec: null });
  hamleIptal();
});

// --- İşaretçi ---
/** Olayın karosu: { kx, ky } + kesirli { fx, fy } (karo birimi; hücreye yuvarlanmaz). */
export function karoBul(e) {
  const r = tuval.getBoundingClientRect();
  const h = ekrandanDunyaya(gorunum, (e.clientX - r.left) / r.width,
    (e.clientY - r.top) / r.height);
  const fx = h.x / KARO;
  const fy = h.y / KARO;
  return { kx: Math.floor(fx), ky: Math.floor(fy), fx, fy };
}

function isle(tur, e) {
  const dokunus = e.pointerType === 'touch';
  if (tur === 'bas' && dokunus) parmaklar.add(e.pointerId);
  if (tur === 'bitir' && dokunus) parmaklar.delete(e.pointerId);
  if (!ciftlikte()) return false;
  if (parmaklar.size > 1) {
    if (insa.basili) basiliIptal();
    return false;
  }
  const karo = karoBul(e);
  if (tur === 'tasi' && !dokunus) insa.imlec = karo;
  return Boolean(kipler.get(insa.kip)?.[tur]?.(e, karo));
}
girdiOnleyiciEkle(isle);
tuval.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'touch' || insa.basili) return;
  insa.imlec = null;
  if (!insa.bekleyen) Object.assign(insa, { hayalet: null, etiket: null, onizleme: null });
});
tuval.addEventListener('contextmenu', (e) => {
  if (ciftlikte()) e.preventDefault();
});
