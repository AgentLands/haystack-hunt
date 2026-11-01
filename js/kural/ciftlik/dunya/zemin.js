/**
 * Zemin katmanı (yaprak modül: yalnız olcu.js'e bağlı, izgara.js de okur): karo başına
 * zemin türü (harman / çayır / ekin; ekin dalga 2) ve dünyanın arazi alanlarını hazırlama.
 * c.arazi = { zemin: Uint8Array(karo), gubre: Uint32Array(karo; gübrenin bittiği tik),
 * cayir: { x, y, en, boy, kose } | null, kapi: { x, y, en, boy, yon } | null,
 * dokum: [[kx, ky]...], seviye (çayır genişletme), baslangicStok }.
 */
import { KARO, KARO_EN, KARO_BOY, KARO_SAYISI, karoIndeks } from '../olcu.js';

export const ZEMIN = Object.freeze({ HARMAN: 0, CAYIR: 1, EKIN: 2 });

/** Boş arazi (testlerin sentetik dünyası ve eski kayıtlar için: hepsi harman). */
export function bosArazi() {
  return {
    zemin: new Uint8Array(KARO_SAYISI), gubre: new Uint32Array(KARO_SAYISI),
    cayir: null, kapi: null, dokum: [], seviye: 0, baslangicStok: 0,
  };
}

/** c'de arazi ve saman kaynak sayaçları yoksa kurar (sentetik test dünyası; eski kayıt). */
export function dunyaHazirla(c) {
  c.arazi ??= bosArazi();
  for (const ad of ['cayirKat', 'arabaKat', 'cevrimdisiKat', 'tuketilenKat']) c[ad] ??= 0;
  return c.arazi;
}

/** Karonun zemini (ızgara dışı ya da arazisiz dünya: harman). */
export function zeminAl(c, kx, ky) {
  if (!c.arazi || kx < 0 || ky < 0 || kx >= KARO_EN || ky >= KARO_BOY) return ZEMIN.HARMAN;
  return c.arazi.zemin[karoIndeks(kx, ky)];
}

/** Hücrenin zemini. */
export const hucreZemini = (c, x, y) => zeminAl(c, (x / KARO) | 0, (y / KARO) | 0);
