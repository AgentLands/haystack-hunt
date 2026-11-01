/**
 * Ses desenleri: olay verisinden ses parametrelerine saf eşlemeler ve hız sınırlayıcı.
 * DOM ve WebAudio yok; Node'da test edilir. Sentez ses-motor.js'te.
 */
import { sapmali } from './ses-seviye.js';

/** Dedektör seviyesi → bip dizisi: sıcaklık arttıkça daha çok, tiz ve hızlı bip. */
const BIP_DESENLERI = {
  'Soğuk': { adet: 1, frekans: 196, aralikMs: 0, sureMs: 260, dalga: 'triangle', duzey: 0.5 },
  'Ilık': { adet: 2, frekans: 392, aralikMs: 190, sureMs: 120, dalga: 'sine', duzey: 0.55 },
  'Sıcak': { adet: 4, frekans: 660, aralikMs: 120, sureMs: 90, dalga: 'square', duzey: 0.4 },
  'Yanıyor!': { adet: 8, frekans: 1040, aralikMs: 70, sureMs: 55, dalga: 'square', duzey: 0.4 },
};

/** Ada göre desen; bilinmeyen ad için mesafeye göre; o da yoksa en soğuk desen. */
export function bipDeseni(seviye) {
  if (seviye && BIP_DESENLERI[seviye.ad]) return BIP_DESENLERI[seviye.ad];
  const mesafe = seviye && Number.isFinite(seviye.mesafe) ? seviye.mesafe : Infinity;
  if (mesafe <= 6) return BIP_DESENLERI['Yanıyor!'];
  if (mesafe <= 16) return BIP_DESENLERI['Sıcak'];
  if (mesafe <= 35) return BIP_DESENLERI['Ilık'];
  return BIP_DESENLERI['Soğuk'];
}

/** Desenin bip zamanları (ms, ilk bip 0). */
export function bipZamanlari(desen) {
  return Array.from({ length: desen.adet }, (_, i) => i * desen.aralikMs);
}

/**
 * Her ihtimalde en çok `aralikMs`'de bir geçit açan sınırlayıcı: izin(zaman) → bool.
 * sapma > 0 ise her geçitten sonra bir sonraki aralık ±sapma oranında değişir; tekrar eden
 * sesler metronom gibi ("makineli tüfek") çıkmaz. rastgele: 0..1 üreteci (testte verilir).
 */
export function hizSinirlayici(aralikMs, sapma = 0, rastgele = Math.random) {
  let son = -Infinity;
  let aralik = aralikMs;
  return (zaman) => {
    if (zaman - son < aralik) return false;
    son = zaman;
    aralik = sapma > 0 ? sapmali(aralikMs, sapma, rastgele()) : aralikMs;
    return true;
  };
}

/** Kazılan saman miktarı → 0.15..1 arası ses düzeyi (az saman hafif, çok saman güçlü). */
export function kazimDuzeyi(miktar) {
  const m = Math.max(0, Number(miktar) || 0);
  return Math.min(1, 0.15 + 0.85 * (1 - Math.exp(-m / 8)));
}

/** Kısa neşeli bulundu melodisi: [frekans Hz, başlangıç ms, süre ms]. */
export const BULUNDU_MELODISI = [
  [523.25, 0, 120], [659.25, 110, 120], [783.99, 220, 120], [1046.5, 330, 380],
];

/** Pes edildi: alçalan iki nota. */
export const PES_NOTALARI = [[392, 0, 220], [261.63, 230, 420]];

const SESSIZ_ANAHTAR = 'haystack-hunt-sessiz';

/** Kayıtlı tercih metninden sessiz mi? ('1' sessiz). Depo yoksa ses açık. */
export function sessizMi(depo) {
  try {
    return depo.getItem(SESSIZ_ANAHTAR) === '1';
  } catch (hata) {
    console.error('Ses tercihi okunamadı:', hata);
    return false;
  }
}

export function sessizKaydet(depo, sessiz) {
  try {
    depo.setItem(SESSIZ_ANAHTAR, sessiz ? '1' : '0');
  } catch (hata) {
    console.error('Ses tercihi yazılamadı:', hata);
  }
}
