/**
 * Dedektör hakkı telafisi (saf): şanssız tohum koruması. Oyuncu bütün haklarını harcadığı
 * halde hiçbir okuma yön göstermediyse (iğne hiçbir okumanın zorluğa göre "yön gösteren"
 * bandında değil) tur başına bir kez bir hak daha verilir. Yön gösteren bant zorluğun
 * telafiSiniri'dir (kural/zorluk.js): Kolay/Normal'de Ilık (hepsi Soğuk ise telafi), Zor'da
 * Sıcak (hepsi Soğuk ya da Ilık ise telafi; Zor'un üç hakkı geniş bantlarda kalınca yönsüz
 * kalmasın). Şanslı oyuncuya ek hak gitmez.
 */
import { SEVIYELER } from './araclar.js';

/** Telafi edilecek en çok hak (tur başına). */
export const TELAFI_HAKKI = 1;

/** Varsayılan sınır: Ilık bandı (Soğuk dışındaki her okuma yön gösterir). */
export const ILIK_SINIRI = SEVIYELER[SEVIYELER.length - 2].mesafe;

/**
 * Bir okumadan sonra verilecek telafi hakkı (0 ya da 1). halkalar: şimdiye kadarki okumalar
 * ({ seviye }), kalan: okumadan sonra kalan hak, verilen: bu turda verilmiş telafi sayısı,
 * sinir: bu uzaklığa (hücre) kadar olan bantlar yön gösterir sayılır.
 */
export function telafiHakki(halkalar, kalan, verilen = 0, sinir = ILIK_SINIRI) {
  if (kalan > 0 || verilen >= TELAFI_HAKKI || !halkalar.length) return 0;
  return halkalar.every((h) => !(h.seviye.mesafe <= sinir)) ? 1 : 0;
}

/** Telafi bildiriminin nedeni: "Hepsi Soğuk çıktı" ya da "Hiçbiri Sıcak çıkmadı". */
export function telafiNedeni(sinir = ILIK_SINIRI) {
  if (sinir >= ILIK_SINIRI) return 'Hepsi Soğuk çıktı';
  const bant = SEVIYELER.find((s) => s.mesafe >= sinir) || SEVIYELER[0];
  return `Hiçbiri ${bant.ad} çıkmadı`;
}
