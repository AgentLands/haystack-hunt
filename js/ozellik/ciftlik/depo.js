/**
 * Çiftlik kaydının tarayıcı depolaması (localStorage; erişim hep try/catch). İki anahtar:
 * ANAHTAR (son kayıt) ve YEDEK (bir önceki kayıt). Yazarken eski kayıt yedeğe geçer; bozuk
 * son kayıtta yedek denenir. Kota hatası yutulmaz: console.error + oyuncuya bildirim.
 * Kalıcı ilerleme (Faz 1) ayrı anahtarda tutulacak: ILERLEME_ANAHTAR (dünya bozulsa da
 * ilerleme silinmez).
 */
import { bildir } from '../../arayuz.js';

export const ANAHTAR = 'haystack-hunt:ciftlik';
export const YEDEK = 'haystack-hunt:ciftlik-yedek';
export const ILERLEME_ANAHTAR = 'haystack-hunt:ciftlik-ilerleme';

function depo() {
  try {
    return window.localStorage;
  } catch (hata) {
    console.error('Çiftlik kaydı: depolama açılamadı:', hata);
    return null;
  }
}

/** Okunabilen kayıtlar, önce son kayıt sonra yedek: [{ kaynak, veri }] (JSON çözülmüş). */
export function kayitlariOku() {
  const d = depo();
  if (!d) return [];
  const liste = [];
  for (const kaynak of [ANAHTAR, YEDEK]) {
    let metin = null;
    try {
      metin = d.getItem(kaynak);
    } catch (hata) {
      console.error(`Çiftlik kaydı okunamadı (${kaynak}):`, hata);
    }
    if (!metin) continue;
    try {
      liste.push({ kaynak, veri: JSON.parse(metin) });
    } catch (hata) {
      console.error(`Çiftlik kaydı bozuk (${kaynak}):`, hata);
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
