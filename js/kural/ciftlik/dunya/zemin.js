/**
 * Zemin katmanı (yaprak modül: yalnız olcu.js'e bağlı, izgara.js de okur): karo başına
 * zemin türü (harman / çayır / ekin; ekin dalga 2) ve dünyanın arazi alanlarını hazırlama.
 * c.arazi = { zemin: Uint8Array(karo), gubre: Uint32Array(karo; gübrenin bittiği tik),
 * cayir: { x, y, en, boy, kose } | null, kapi: { x, y, en, boy, yon } | null,
 * dokum: [[kx, ky]...], seviye (çayır genişletme), baslangicStok }. Gübre (F · gübre
 * çukuru yazar: gubrele) ve harman stoku da burada.
 */
import { GENISLIK } from '../../boyut.js';
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

/** Harman zeminindeki toplam saman (araba "stok %10" eşiği). */
export function harmanStogu(a, tarla) {
  let s = 0;
  for (let i = 0; i < tarla.h.length; i++) {
    const k = karoIndeks(((i % GENISLIK) / KARO) | 0, ((i / GENISLIK) / KARO) | 0);
    if (a.zemin[k] === ZEMIN.HARMAN) s += tarla.h[i];
  }
  return s;
}

/** (kx, ky) çevresinde r karo içindeki çayır karoları `sure` tik gübreli (F · gübre çukuru). */
export function gubrele(c, kx, ky, r, sure) {
  const a = dunyaHazirla(c);
  for (let y = Math.max(0, ky - r); y <= Math.min(KARO_BOY - 1, ky + r); y++) {
    for (let x = Math.max(0, kx - r); x <= Math.min(KARO_EN - 1, kx + r); x++) {
      const i = karoIndeks(x, y);
      if ((x - kx) ** 2 + (y - ky) ** 2 > r * r || a.zemin[i] !== ZEMIN.CAYIR) continue;
      a.gubre[i] = Math.max(a.gubre[i], c.tik + sure);
    }
  }
}

export const gubreliMi = (c, kx, ky) => (c.arazi?.gubre[karoIndeks(kx, ky)] ?? 0) > c.tik;
