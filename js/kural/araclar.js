/**
 * Oyuncu araçları: el (samanı tarladan alır), tırmık (samanı sürüklendiği yöne iter;
 * tarla dışına itilen saman gider), dedektör (sınırlı hak, sıcak/soğuk ipucu) ve
 * mıknatıs (sınırlı hak; yakındaki iğneyi yüzeye doğru çeker). İkisi de yalnız iğneyi görür.
 */
import { GENISLIK, icinde } from './boyut.js';
import { igneAcikMi, igneDerinligi, igneKonumu } from './igne.js';

export const EL_YARICAP = 2.5;
/** El kazısı: fırça altındaki her hücreden saniyede alınan kat (60 Hz'de karede 1 kat). */
export const EL_HIZI = 60;
/** Bir karede en çok bu kadar kat birikir (uzun karede ışınlanır gibi kazmasın). */
const EL_BIRIKIM_TAVAN = 4;
export const TIRMIK_YARICAP = 4;
export const TIRMIK_ADIM = 5;
export const MIKNATIS_MENZIL = 10;
export const MIKNATIS_CEKIS = 15;

export const SEVIYELER = [
  { mesafe: 6, ad: 'Yanıyor!', renk: '#ff4d4f' },
  { mesafe: 16, ad: 'Sıcak', renk: '#ff8a1f' },
  { mesafe: 35, ad: 'Ilık', renk: '#ffd23f' },
  { mesafe: Infinity, ad: 'Soğuk', renk: '#4aa8ff' },
];

function hucrelerde(cx, cy, r, islev) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2 && icinde(x, y)) islev(y * GENISLIK + x, x, y);
    }
  }
}

/**
 * El kazısının kare hızından bağımsız adımı: birikim + EL_HIZI * dt içindeki tam kat sayısı n
 * alınır, kesir sonraki kareye kalır. Dönüş: { n, birikim }.
 */
export function elAdimi(birikim, dt) {
  const toplam = Math.min(EL_BIRIKIM_TAVAN, birikim + EL_HIZI * Math.max(0, dt));
  const n = Math.floor(toplam + 1e-6); // 60 * (1/60) kayan nokta kaybı bir kat yutmasın
  return { n, birikim: Math.max(0, toplam - n) };
}

/** Fırça altındaki her hücreden en çok `miktar` kat alır; alınan toplamı döndürür. */
export function elIleAl(tarla, cx, cy, miktar = 1) {
  let alinan = 0;
  hucrelerde(cx, cy, EL_YARICAP, (i) => {
    const m = Math.min(tarla.h[i], miktar);
    tarla.h[i] -= m;
    alinan += m;
  });
  tarla.kaldirilan += alinan;
  return alinan;
}

/** Fırça altındaki samanın üçte birini (yx, yy) yönünde ileri iter; dışarı atılanı döndürür. */
export function tirmikla(tarla, cx, cy, yx, yy) {
  const boy = Math.hypot(yx, yy);
  if (boy < 0.5) return 0;
  const ox = Math.round((yx / boy) * TIRMIK_ADIM);
  const oy = Math.round((yy / boy) * TIRMIK_ADIM);
  const tasinan = [];
  hucrelerde(cx, cy, TIRMIK_YARICAP, (i, x, y) => {
    const m = Math.floor(tarla.h[i] / 3);
    if (m > 0) {
      tarla.h[i] -= m;
      tasinan.push(x + ox, y + oy, m);
    }
  });
  let disari = 0;
  for (let k = 0; k < tasinan.length; k += 3) {
    const [x, y, m] = [tasinan[k], tasinan[k + 1], tasinan[k + 2]];
    if (icinde(x, y)) tarla.h[y * GENISLIK + x] += m;
    else disari += m;
  }
  tarla.kaldirilan += disari;
  return disari;
}

/** Noktanın iğneye (etkin konumuna: balyadaysa balyaya) uzaklığına göre sıcaklık seviyesi. */
export function dedektorOku(tarla, cx, cy) {
  const p = igneKonumu(tarla);
  const mesafe = Math.hypot(cx - p.x, cy - p.y);
  return SEVIYELER.find((s) => mesafe <= s.mesafe);
}

/** El iğnenin üstündeyse ve iğne açıktaysa alınabilir. */
export function igneyiAlabilirMi(tarla, cx, cy) {
  const yakin = Math.hypot(cx - tarla.igne.x, cy - tarla.igne.y) <= EL_YARICAP + 1.5;
  return yakin && igneAcikMi(tarla);
}

/**
 * Mıknatıs: iğne (cx, cy)'ye MIKNATIS_MENZIL hücreden yakınsa onu MIKNATIS_CEKIS kat yukarı
 * çeker (en çok yüzeye kadar). Menzildeyse true (açıktaki iğne yerinde kalır), değilse false.
 * Balyadaki iğneyi çekemez (false); kepçedeki menzilde sayılır ama çekilmez.
 */
export function miknatisCek(tarla, cx, cy) {
  const { igne } = tarla;
  const p = igneKonumu(tarla);
  if (igne.balyada || Math.hypot(cx - p.x, cy - p.y) > MIKNATIS_MENZIL) return false;
  if (igne.kepcede) return true; // kepçedeki iğne zaten tarlada değil
  igne.z += Math.min(MIKNATIS_CEKIS, igneDerinligi(tarla));
  return true;
}
