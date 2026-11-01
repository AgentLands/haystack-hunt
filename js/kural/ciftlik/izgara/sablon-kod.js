/**
 * Şablon metin kodu (dışa/içe aktarma): saf, deterministik. Biçim:
 *   CS1-<taban64url>-<sağlama>      CS1 = sürüm 1; sağlama = yük metninin FNV-1a özeti (8 hane)
 * Yük (JSON, UTF-8): [ad, en, boy, [[kod, x, y, yon, ayar?]...]]. Parça türü KOD ile
 * yazılır (kararlı). İçe aktarma her şeyi doğrular (sürüm, sağlama, bilinen kod, konum,
 * çakışma, ayar anahtarları, boyut); hata `{ hata }` metnidir, kayıt/dünya asla bozulmaz.
 */
import { OZET_BASI, ozetKat } from '../olcu.js';
import { parcaTanimi } from '../parca-kayit.js';
import { kumeDogrula, ayarAnahtarlari } from './kume.js';

export const SABLON_AD_EN_COK = 24;
const ONEK = 'CS1';

function ozet(metin) {
  const kodlar = [...metin].map((ch) => ch.codePointAt(0));
  return ozetKat(OZET_BASI, kodlar).toString(16).padStart(8, '0');
}

function tabanaCevir(metin) {
  const bayt = new TextEncoder().encode(metin);
  let ikili = '';
  for (const b of bayt) ikili += String.fromCharCode(b);
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tabandanCoz(taban) {
  const ikili = atob(taban.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder('utf-8', { fatal: true })
    .decode(Uint8Array.from(ikili, (ch) => ch.charCodeAt(0)));
}

/** Şablon { ad, kume } → paylaşılabilir metin kodu. */
export function sablonKodla({ ad, kume }) {
  const parcalar = kume.parcalar.map((q) => {
    const satir = [q.kod, q.x, q.y, q.yon];
    if (q.ayar && Object.keys(q.ayar).length) satir.push(q.ayar);
    return satir;
  });
  const yuk = JSON.stringify([String(ad).slice(0, SABLON_AD_EN_COK), kume.en, kume.boy, parcalar]);
  return `${ONEK}-${tabanaCevir(yuk)}-${ozet(yuk)}`;
}

function ayarlariDenetle(parcalar) {
  for (const q of parcalar) {
    const izinli = new Set(ayarAnahtarlari(parcaTanimi(q.kod)));
    for (const [k, v] of Object.entries(q.ayar)) {
      const duz = ['number', 'string', 'boolean'].includes(typeof v) || Array.isArray(v);
      if (!izinli.has(k) || !duz) return `ayar bozuk (${k})`;
    }
  }
  return null;
}

/** Metin kodu → { sablon: { ad, kume } } ya da { hata }. */
export function sablonCoz(metin) {
  const parca = String(metin ?? '').trim().split('-');
  if (parca.length !== 3 || parca[0] !== ONEK) return { hata: 'Şablon kodu tanınmadı' };
  let yuk;
  let veri;
  try {
    yuk = tabandanCoz(parca[1]);
    veri = JSON.parse(yuk);
  } catch (hata) {
    return { hata: 'Şablon kodu bozuk' };
  }
  if (ozet(yuk) !== parca[2]) return { hata: 'Şablon kodu eksik ya da değişmiş (sağlama tutmadı)' };
  if (!Array.isArray(veri) || veri.length !== 4 || typeof veri[0] !== 'string'
    || !Array.isArray(veri[3])) return { hata: 'Şablon kodu bozuk' };
  const [ad, en, boy, satirlar] = veri;
  const parcalar = satirlar.map(([kod, x, y, yon, ayar]) => ({
    kod, x, y, yon, ayar: ayar && typeof ayar === 'object' ? ayar : {},
  }));
  const kume = { en, boy, parcalar };
  const neden = kumeDogrula(kume) ?? ayarlariDenetle(parcalar);
  if (neden) return { hata: `Şablon geçersiz: ${neden}` };
  return { sablon: { ad: ad.slice(0, SABLON_AD_EN_COK) || 'Adsız', kume } };
}
