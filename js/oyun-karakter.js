/**
 * Karakter karesi: kontrol.yon (ya da tıkla-yürü hedefi) ile yürüme, Boşlukla araç kullanımı
 * (El ile yüzü dönük yakın balyaya basılı tutmak onu açar) ve fare/dokunmayla erişimdeki
 * hücrede araç kullanımı. Araç noktası: el ve tırmık
 * karakterin önünde, dedektör ve mıknatıs karakterin durduğu yerde. durum.imlec geriye
 * uyum için bu noktayı (fare basılıysa fare noktasını) gösterir. DOM'a dokunmaz.
 */
import { kontrol } from './kontrol.js';
import {
  karakterYuru, aracNoktasi, karakterNoktasi, erisimde, erisimeCek,
} from './kural/karakter.js';
import { makineEngeli } from './kural/makineler/surus.js';
import { balyaEngelleri, acilacakBalya, balyaAcIlerlet } from './kural/balyalar.js';
import {
  baslat, elKullan, tirmikKullan, dedektorKullan, miknatisKullan,
} from './oyun-arac.js';
import { yay } from './olaylar.js';

/** Boşluk basılı tutulurken tırmık itişleri arası (sn). */
export const TIRMIK_ARALIK = 0.2;
/** Tıkla-yürü hedefine bu kadar yaklaşınca varılmış sayılır (hücre). */
export const VARIS = 0.3;

/** Seçili aracın bu karedeki noktası (hücre birimi). */
export function aracYeri(durum) {
  const k = durum.karakter;
  return durum.arac === 'el' || durum.arac === 'tirmik' ? aracNoktasi(k) : karakterNoktasi(k);
}

/** Yürüme isteği: klavye/sanal kol önceliklidir; yoksa tıkla-yürü hedefine düz çizgi. */
function yuruyusIstegi(k) {
  const { x, y } = kontrol.yon;
  const h = kontrol.hedef;
  if (x || y || !h) return { x, y, hedefli: false };
  const dx = h.x + 0.5 - k.x;
  const dy = h.y + 0.5 - k.y;
  const d = Math.hypot(dx, dy);
  if (d < VARIS) {
    kontrol.hedef = null;
    return { x: 0, y: 0, hedefli: false };
  }
  const s = Math.min(1, d / 0.6) / d; // varırken yavaşla, hedefi aşıp salınmasın
  return { x: dx * s, y: dy * s, hedefli: true };
}

/** Bir kare: yürü, aracı kullan. İğne alındıysa true döner (çağıran oyunu bitirir). */
export function karakterKaresi(durum, dt, zaman) {
  const k = durum.karakter;
  const istek = yuruyusIstegi(k);
  if (istek.x || istek.y) baslat(durum, zaman);
  const engeller = [...durum.makineler.map(makineEngeli), ...balyaEngelleri(durum.balyalar)];
  const s = karakterYuru(durum.tarla, k, istek.x, istek.y, dt, engeller);
  if (istek.hedefli && s.engel) kontrol.hedef = null; // engelde durur
  if (s.adim) yay('karakter-adim', { x: k.x, y: k.y, z: k.z });
  return aracKaresi(durum, dt, zaman);
}

function aracKaresi(durum, dt, zaman) {
  const k = durum.karakter;
  const kullan = kontrol.kullan && !durum.bitti;
  const yeni = kullan && !durum.oncekiKullan;
  durum.oncekiKullan = kontrol.kullan;
  if (!kontrol.kullan) durum.elKilitli = false;
  const fare = durum.basili && !durum.bitti ? durum.fare : null;
  const nokta = aracYeri(durum);
  durum.imlec = fare || nokta;
  k.kullaniyor = kullan || fare !== null;
  if (!k.kullaniyor) return false;
  baslat(durum, zaman);
  if (durum.arac === 'el') {
    if (kullan && balyaAcKaresi(durum, dt)) return false;
    return (kullan && elKullan(durum, nokta)) || (fare !== null && elKullan(durum, fare));
  }
  if (durum.arac === 'tirmik') {
    if (!kullan) return false; // fareyle tırmık sürüklemede (fareSurukle)
    durum.tirmikSayac -= dt;
    if (yeni || durum.tirmikSayac <= 0) {
      tirmikKullan(durum, nokta, Math.cos(k.yon), Math.sin(k.yon));
      durum.tirmikSayac = TIRMIK_ARALIK;
    }
    return false;
  }
  // Dedektör ve mıknatıs: Boşluğa her basışta bir kez, karakterin durduğu yerde.
  if (yeni) (durum.arac === 'dedektor' ? dedektorKullan : miknatisKullan)(durum, nokta, zaman);
  return false;
}

/**
 * El + Boşluk: yüzü dönük yakın bir balya varsa açmayı ilerletir (true; o kare kazılmaz).
 * Açılınca 'balya-acildi' yayılır ve el, Boşluk bırakılana dek bekler (elKilitli): basılı
 * tutmaya devam etmek yayılan samanı kazıp açıktaki iğneyi kendiliğinden almasın.
 */
function balyaAcKaresi(durum, dt) {
  if (durum.elKilitli) return true;
  const balya = acilacakBalya(durum.balyalar, durum.karakter);
  if (!balya) return false;
  const acildi = balyaAcIlerlet(durum.tarla, balya, dt);
  if (acildi) {
    durum.elKilitli = true;
    yay('balya-acildi', acildi);
  }
  return true;
}

/**
 * Fare/dokunma basıldı (p: hücre). Erişimdeyse araç orada kullanılır (dedektör ve mıknatıs
 * karakterin yerinde) ve true döner; erişim dışıysa false (çağıran oraya yürütür).
 * Makinedeyken tıklama tüketilir.
 */
export function fareBas(durum, p, zaman) {
  const k = durum.karakter;
  if (k.makine) return true;
  if (durum.bitti || !erisimde(k, p)) return false;
  baslat(durum, zaman);
  Object.assign(durum, { basili: true, fare: p, son: p });
  const dx = p.x - (k.x - 0.5);
  const dy = p.y - (k.y - 0.5);
  if (Math.hypot(dx, dy) > 0.4) k.yon = Math.atan2(dy, dx);
  kontrol.hedef = null;
  if (durum.arac === 'dedektor') dedektorKullan(durum, karakterNoktasi(k), zaman);
  if (durum.arac === 'miknatis') miknatisKullan(durum, karakterNoktasi(k), zaman);
  return true;
}

/** Basılıyken fare hareketi: nokta erişime kenetlenir; tırmık sürüklenen yöne iter. */
export function fareSurukle(durum, p) {
  if (!durum.basili || durum.bitti) return;
  const q = erisimeCek(durum.karakter, p);
  durum.fare = q;
  if (durum.arac !== 'tirmik') return;
  const dx = q.x - durum.son.x;
  const dy = q.y - durum.son.y;
  if (Math.hypot(dx, dy) < 1.5) return;
  tirmikKullan(durum, q, dx, dy);
  durum.son = q;
}
