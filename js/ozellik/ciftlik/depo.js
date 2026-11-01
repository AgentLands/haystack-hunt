/**
 * Çiftlik kaydının tarayıcı depolaması (localStorage; erişim hep try/catch). Üç anahtar:
 * ANAHTAR (son kayıt), YEDEK (bir önceki kayıt) ve ILERLEME_ANAHTAR (kalıcı ilerleme:
 * damgalar, toplamlar, çiftlik defteri; ekonomi/damga.js biçimi; dünya bozulsa da silinmez,
 * "yeni çiftlik"te de kalır). Yazarken eski kayıt yedeğe geçer; bozuk son kayıtta yedek
 * denenir. Ayrıştırılamayan (bozuk JSON) kayıt `<anahtar>-bozuk`a bir kez kopyalanır ki
 * sonraki kayıt onu ezmeden önce veri kurtarılabilsin; okuyan oyuncuya bildirir
 * (kayitlariOku().bozuk). Kota hatası yutulmaz: console.error + oyuncuya bildirim.
 */
import { bildir } from '../../arayuz.js';
import { ilerlemeKodla, ilerlemeCoz, ilerlemeKur } from '../../kural/ciftlik/ekonomi/damga.js';

export const ANAHTAR = 'haystack-hunt:ciftlik';
export const YEDEK = 'haystack-hunt:ciftlik-yedek';
export const ILERLEME_ANAHTAR = 'haystack-hunt:ciftlik-ilerleme';
export const BOZUK_EK = '-bozuk';

function depo() {
  try {
    return window.localStorage;
  } catch (hata) {
    console.error('Çiftlik kaydı: depolama açılamadı:', hata);
    return null;
  }
}

function oku(d, anahtar) {
  try {
    return d.getItem(anahtar);
  } catch (hata) {
    console.error(`Çiftlik kaydı okunamadı (${anahtar}):`, hata);
    return null;
  }
}

/** Bozuk metni bir kez kenara kopyalar (üzerine yazılmadan önce kurtarılabilsin). */
function bozuguSakla(d, anahtar, metin) {
  try {
    if (d.getItem(anahtar + BOZUK_EK) !== metin) d.setItem(anahtar + BOZUK_EK, metin);
  } catch (hata) {
    console.error(`Bozuk çiftlik kaydı kenara alınamadı (${anahtar}):`, hata);
  }
}

/**
 * Okunabilen kayıtlar, önce son kayıt sonra yedek: [{ kaynak, veri }] (JSON çözülmüş).
 * Dizinin `bozuk` alanı: ayrıştırılamayan anahtarlar (oyuncuya bildirmek için).
 */
export function kayitlariOku() {
  const liste = [];
  liste.bozuk = [];
  const d = depo();
  if (!d) return liste;
  for (const kaynak of [ANAHTAR, YEDEK]) {
    const metin = oku(d, kaynak);
    if (!metin) continue;
    try {
      liste.push({ kaynak, veri: JSON.parse(metin) });
    } catch (hata) {
      console.error(`Çiftlik kaydı bozuk (${kaynak}):`, hata);
      liste.bozuk.push(kaynak);
      bozuguSakla(d, kaynak, metin);
    }
  }
  return liste;
}

/** Kaydı yazar (eskisi yedeğe). Başarıda yazılan bayt sayısı, değilse 0. */
export function kayitYaz(veri) {
  const d = depo();
  if (!d) return 0;
  const metin = JSON.stringify(veri);
  try {
    const eski = d.getItem(ANAHTAR);
    if (eski) d.setItem(YEDEK, eski);
    d.setItem(ANAHTAR, metin);
    return metin.length;
  } catch (hata) {
    console.error('Çiftlik kaydedilemedi:', hata);
    if (hata && hata.name === 'QuotaExceededError') {
      bildir('Çiftlik kaydedilemedi: tarayıcı deposu dolu.', 4000);
    }
    return 0;
  }
}

/** Son kaydı siler (yedek kalır). */
export function kayitSil() {
  const d = depo();
  try {
    d?.removeItem(ANAHTAR);
  } catch (hata) {
    console.error('Çiftlik kaydı silinemedi:', hata);
  }
}

/**
 * Kalıcı ilerleme ya da null (yok). Bozuksa kenara kopyalanır, oyuncuya bildirilir ve null
 * döner (çağıran yenisini kurar).
 */
export function ilerlemeOku() {
  const d = depo();
  const metin = d && oku(d, ILERLEME_ANAHTAR);
  if (!metin) return null;
  try {
    return ilerlemeCoz(JSON.parse(metin));
  } catch (hata) {
    console.error('Çiftlik ilerlemesi okunamadı:', hata);
    bozuguSakla(d, ILERLEME_ANAHTAR, metin);
    bildir('Çiftlik ilerlemesi (damgalar) okunamadı; yeniden başlıyor.', 4000);
    return null;
  }
}

let oturumIlerlemesi = null;
/**
 * Oturumun kalıcı ilerlemesi (ilk istekte depodan, yoksa yeni). Bütün çiftlikler ve şablon
 * yuvaları aynı nesneyi paylaşır.
 */
export function ilerlemeAl() {
  oturumIlerlemesi ??= ilerlemeOku() ?? ilerlemeKur();
  return oturumIlerlemesi;
}

/** Kalıcı ilerlemeyi yazar; başarıyı döndürür. */
export function ilerlemeYaz(ilerleme = ilerlemeAl()) {
  const d = depo();
  if (!d) return false;
  try {
    d.setItem(ILERLEME_ANAHTAR, JSON.stringify(ilerlemeKodla(ilerleme)));
    return true;
  } catch (hata) {
    console.error('Çiftlik ilerlemesi kaydedilemedi:', hata);
    return false;
  }
}
