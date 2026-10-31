/**
 * Meydan okuma bağlantısı: saf URL kuralları. Bağlantı `?tohum=&zorluk=&rakip=<süre ms>&ad=`
 * taşır; iğnenin yeri bağlantıda yoktur (tohumdan türer). Süre istemci tarafıdır: kanıt
 * değil gösteriş. Hiçbir şey sunucuya gitmez. DOM yok; Node'da test edilir.
 */
import { zorlukAdi } from './zorluk.js';

export const AD_AZAMI = 16;
export const TOHUM_AZAMI = 64;
/** Rakip süresi bu aralıkta olmalı (ms): bir saniyeden kısa ya da üç saatten uzun anlamsız. */
export const RAKIP_EN_AZ = 1000;
export const RAKIP_EN_COK = 3 * 3600 * 1000;

/** Süre metni m:ss (saatten uzunsa s:dd:ss). */
export function sureYaz(ms) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const dakika = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  if (dakika < 60) return `${dakika}:${ss}`;
  return `${Math.floor(dakika / 60)}:${String(dakika % 60).padStart(2, '0')}:${ss}`;
}

/**
 * Ad güvenli kısa metne indirilir: denetim ve biçim karakterleri atılır, boşluklar
 * sıkıştırılır, en çok AD_AZAMI karakter (kod noktası) kalır. Boşsa ''. HTML kaçışı yapmaz:
 * gösterimde yalnız textContent kullanılmalı.
 */
export function adTemizle(ad) {
  if (typeof ad !== 'string') return '';
  const duz = ad.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim();
  return [...duz].slice(0, AD_AZAMI).join('').trim();
}

const rakipSuresi = (metin) => {
  if (typeof metin !== 'string' || !/^\d{1,9}$/.test(metin)) return null;
  const ms = Number(metin);
  return ms >= RAKIP_EN_AZ && ms <= RAKIP_EN_COK ? ms : null;
};

/**
 * Adres aramasını (`?tohum=...`) ayrıştırır. Geçerli bir meydan okuma yoksa (tohum ya da
 * geçerli rakip süresi eksik) null; varsa { tohum, zorluk, rakipMs, ad }.
 */
export function meydanAyristir(arama) {
  const p = new URLSearchParams(arama);
  const tohum = p.get('tohum');
  const rakipMs = rakipSuresi(p.get('rakip'));
  if (!tohum || tohum.length > TOHUM_AZAMI || rakipMs === null) return null;
  return { tohum, zorluk: zorlukAdi(p.get('zorluk')), rakipMs, ad: adTemizle(p.get('ad')) };
}

/** Paylaşılacak bağlantı: taban (köken + yol, aramasız), tarla etiketi, zorluk, süre, ad. */
export function meydanBaglantisi({ taban, tohum, zorluk, sureMs, ad = '' }) {
  const adres = new URL(taban);
  adres.search = '';
  adres.hash = '';
  adres.searchParams.set('tohum', tohum);
  adres.searchParams.set('zorluk', zorlukAdi(zorluk));
  adres.searchParams.set('rakip', String(Math.round(sureMs)));
  const temiz = adTemizle(ad);
  if (temiz) adres.searchParams.set('ad', temiz);
  return adres.href;
}

/** HUD etiketi: "Geçilecek süre: 1:23 (Ayşe)". */
export function hedefMetni({ rakipMs, ad }) {
  return `Geçilecek süre: ${sureYaz(rakipMs)}${ad ? ` (${ad})` : ''}`;
}

/** Fark metni: bir saniyeden küçük farklar "0,4 sn", diğerleri m:ss yazılır. */
function farkYaz(ms) {
  return ms < 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} sn` : sureYaz(ms);
}

/** Bitiş fişi cümlesi ve sonuç: { metin, gecti } (eşitlikte gecti null). */
export function farkMetni(sureMs, rakipMs) {
  const fark = Math.abs(Math.round(sureMs) - rakipMs);
  if (fark === 0) return { metin: 'Rakiple aynı sürede buldun.', gecti: null };
  if (sureMs < rakipMs) return { metin: `Rakibi ${farkYaz(fark)} farkla geçtin.`, gecti: true };
  return { metin: `${farkYaz(fark)} geride kaldın.`, gecti: false };
}

/** Paylaşım iletisi: kısa cümle (bağlantı ayrıca eklenir). */
export function davetMetni(sureMs, ad = '') {
  const temiz = adTemizle(ad);
  return `${temiz ? `${temiz}: ` : ''}Haystack Hunt'ta iğneyi ${sureYaz(sureMs)} sürede `
    + 'buldum. Geçebilir misin?';
}
