/**
 * Ortak sürüş fiziği (saf): tank tipi sürüş (gaz −1..1, dönüş −1..1), samanda yavaşlama,
 * tırmanma eşiği (aşılırsa takılır; geri çıkmak gerekir), tarla sınırı, daire çarpışması
 * ve yakıt. Her makine türü bunu kullanır; türe özgü olan yalnız tanımdaki sayılar.
 * Koordinatlar dünya biriminde (karakter.js ile aynı).
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';
import { yukseklik } from '../tarla.js';
import { makineTanimi } from './kayit.js';

/** Hızlanma ve frenleme (hücre/sn²). */
export const IVME = 9;
export const FREN = 18;
/** Geri viteste azami hızın kesri. */
export const GERI_ORAN = 0.5;
/** Samanda yavaşlama: azami hız / (1 + z / MAKINE_SAMAN). */
export const MAKINE_SAMAN = 40;

const kirp = (v, a, b) => Math.min(b, Math.max(a, v));

function aciFarki(a, b) {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

/**
 * Takılma ters yöne gidince, belirgin dönünce ya da bir hücre ilerleyince biter (sınırda
 * sürünüp yeniden takılmak olay yağdırmasın).
 */
function takilmaBitti(m) {
  const t = m.takildigiYer;
  return Math.sign(m.hiz) !== t.isaret || aciFarki(m.yon, t.yon) > 0.35
    || Math.hypot(m.x - t.x, m.y - t.y) > 1;
}

export function samanCarpani(z) {
  return 1 / (1 + z / MAKINE_SAMAN);
}

/** İş aygıtı çalışıp hiçbir şey almadığı/itmediği karede iş yakıtının harcanan kesri. */
export const BOSTA_IS_ORANI = 0.1;

/**
 * Bir karede iş aygıtının harcadığı yakıt: tanımın isYakit'i × dt; aygıt bu karede saman
 * almadıysa (sonuc.miktar 0: dolu kepçe, boş zemin, hareketsiz bekleme) yalnız
 * BOSTA_IS_ORANI kadarı. Boşluğu basılı tutup beklemek depoyu boşa bitirmesin.
 */
export function isYakiti(t, sonuc, dt) {
  const oran = sonuc.miktar > 0 ? 1 : BOSTA_IS_ORANI;
  return t.isYakit * dt * oran;
}

/** Yakıt harcar; depo bu harcamayla boşaldıysa true. */
export function yakitHarca(m, miktar) {
  if (m.yakit <= 0 || !(miktar > 0)) return false;
  m.yakit = Math.max(0, m.yakit - miktar);
  return m.yakit === 0;
}

/** Makinenin çarpışma dairesi ({x, y, r}); karakterin ve diğer makinelerin engeli. */
export function makineEngeli(m) {
  return { x: m.x, y: m.y, r: makineTanimi(m.tur).yaricap };
}

function engeldeMi(m, nx, ny, r, engeller) {
  return engeller.some((e) => {
    const yeni = Math.hypot(nx - e.x, ny - e.y);
    return yeni < e.r + r && yeni < Math.hypot(m.x - e.x, m.y - e.y);
  });
}

/**
 * Bir sürüş adımı. girdi: { gaz, donus } (−1..1; W = +gaz, D = +donus = saat yönü).
 * engeller: [{x, y, r}] (sürülen makine hariç). Ön (geri giderken arka) uç yeni bir hücreye
 * girerken yükseklik farkı tanımdaki tirmanma'yı aşarsa makine durur ve takılır.
 * Dönüş: { takildi: bu karede takıldı mı, yakitBitti: bu karede depo boşaldı mı, mesafe }.
 */
export function surusAdim(tarla, m, girdi, dt, engeller = []) {
  const t = makineTanimi(m.tur);
  const sonuc = { takildi: false, yakitBitti: false, mesafe: 0 };
  const yakitVar = m.yakit > 0;
  const gaz = yakitVar ? kirp(girdi.gaz || 0, -1, 1) : 0;
  const donus = yakitVar ? kirp(girdi.donus || 0, -1, 1) : 0;
  m.yon += donus * t.donus * dt;
  if (m.yon > Math.PI) m.yon -= 2 * Math.PI;
  if (m.yon < -Math.PI) m.yon += 2 * Math.PI;
  const azami = t.azamiHiz * samanCarpani(m.z || 0);
  const hedef = gaz >= 0 ? gaz * azami : gaz * azami * GERI_ORAN;
  const hizlaniyor = Math.abs(hedef) > Math.abs(m.hiz) && hedef * m.hiz >= 0;
  const ivme = (hizlaniyor ? IVME : FREN) * dt;
  m.hiz += kirp(hedef - m.hiz, -ivme, ivme);
  if (Math.abs(m.hiz) < 1e-3) {
    m.hiz = 0;
    return sonuc;
  }
  const ux = Math.cos(m.yon);
  const uy = Math.sin(m.yon);
  const r = t.yaricap;
  const nx = kirp(m.x + ux * m.hiz * dt, r, GENISLIK - r);
  const ny = kirp(m.y + uy * m.hiz * dt, r, YUKSEKLIK - r);
  const uc = (t.boy / 2) * Math.sign(m.hiz);
  const eskiUc = yukseklik(tarla, m.x + ux * uc, m.y + uy * uc);
  if (yukseklik(tarla, nx + ux * uc, ny + uy * uc) - eskiUc > t.tirmanma) {
    sonuc.takildi = !m.takili;
    if (!m.takili) {
      m.takildigiYer = { x: m.x, y: m.y, yon: m.yon, isaret: Math.sign(m.hiz) };
    }
    Object.assign(m, { hiz: 0, takili: true });
    return sonuc;
  }
  if (engeldeMi(m, nx, ny, r, engeller)) {
    m.hiz = 0;
    return sonuc;
  }
  sonuc.mesafe = Math.hypot(nx - m.x, ny - m.y);
  if (sonuc.mesafe < 1e-6) m.hiz = 0; // tarla sınırına dayandı
  m.x = nx;
  m.y = ny;
  if (m.takili && takilmaBitti(m)) m.takili = false;
  m.z = yukseklik(tarla, m.x, m.y);
  sonuc.yakitBitti = yakitHarca(m, t.yakitTuketim * dt * (Math.abs(m.hiz) / t.azamiHiz));
  return sonuc;
}
