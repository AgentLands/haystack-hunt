/**
 * Oyun tarafı buluntular: yeni oyunda kurulum, her karede açığa çıkma denetimi ve elle alma
 * (iğne ve çivi gibi: el aracı açıktaki buluntunun üstündeyken). Toplama cezasızdır, süreyi
 * durdurmaz. DOM'a dokunmaz; 'buluntu-gorundu' ve 'buluntu-alindi' olaylarını yayar.
 */
import {
  buluntulariSakla, buluntuDerinligi, alinabilirBuluntu,
} from './kural/buluntu.js';
import { yay } from './olaylar.js';

let yeniMi = () => false;

/**
 * Deftere göre "bu tür ilk kez mi bulunuyor" sorgusu bağlar (defter özelliği kayıt eder;
 * çekirdek kalıcılığı bilmez). Sorgu alma anında, defter güncellenmeden önce çağrılır.
 */
export function defterBagla(sorgu) {
  yeniMi = sorgu;
}

/** Yeni tarla için buluntu listesi. */
export function buluntulariKur(tarla) {
  return buluntulariSakla(tarla);
}

/** Bir kare: üstü açılan buluntuları işaretler (ilk kez açılınca olay), örtülenleri sıfırlar. */
export function buluntuKaresi(durum, zaman) {
  for (const b of durum.buluntular) {
    if (b.alindi) continue;
    if (buluntuDerinligi(durum.tarla, b) > 0) {
      b.acikSure = null;
      continue;
    }
    if (b.acikSure === null) b.acikSure = zaman;
    if (!b.goruldu) {
      b.goruldu = true;
      yay('buluntu-gorundu', { x: b.x, y: b.y, tur: b.tur });
    }
  }
}

/** Elin altında alınabilir bir buluntu varsa alınır (bir daha alınmaz). */
export function buluntuyuAl(durum, p) {
  const b = alinabilirBuluntu(durum.tarla, durum.buluntular, p.x, p.y, durum.sonZaman);
  if (!b) return;
  b.alindi = true;
  yay('buluntu-alindi', { x: b.x, y: b.y, tur: b.tur, yeni: yeniMi(b.tur) });
}

/** Alınan / toplam buluntu sayısı (bitiş fişi için). */
export function buluntuSayisi(durum) {
  const toplam = durum.buluntular.length;
  return { alinan: durum.buluntular.filter((b) => b.alindi).length, toplam };
}
