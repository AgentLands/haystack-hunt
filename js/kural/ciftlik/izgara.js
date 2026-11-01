/**
 * İnşa ızgarası: 120×80 karo (karo = 2×2 tarla hücresi). Doluluk dizini (dolu: parça id + 1,
 * 0 boş), parça tabanı hücre maskesi (taban: cokertKaro duvarı) ve yasak karolar (garaj
 * park alanı, tarla kenarı). Yerleştirme kuralları: kutu ızgarada, yasak değil, boş ve
 * altındaki her hücrede saman ≤ KURMA_ESIK (çayır karosunda eşik yok: ayakta ot). Kurulunca
 * alttaki saman 1 hücrelik çevre halkasına dağıtılır (toplam korunur) ve alttaki gömülü
 * nesneler halkadaki en yakın hücreye (yere, z = 0) itilir. Çarpışma: karakter yürünmez
 * parçalara, makineler hepsine çarpar.
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';
import { KARO, KARO_EN, KARO_BOY, KARO_SAYISI, karoIndeks, donmusBoyut } from './olcu.js';
import { cevreyeDagit, alaniKirlet } from './saman.js';
import { ZEMIN, hucreZemini } from './dunya/zemin.js';

/** Bir karonun herhangi bir hücresinde bundan fazla kat saman varsa kurulmaz. */
export const KURMA_ESIK = 8;

export function izgaraKur() {
  const izgara = {
    dolu: new Int32Array(KARO_SAYISI),
    taban: new Uint8Array(GENISLIK * YUKSEKLIK),
    yasak: new Uint8Array(KARO_SAYISI),
  };
  for (let kx = 0; kx < KARO_EN; kx++) {
    izgara.yasak[karoIndeks(kx, 0)] = 1;
    izgara.yasak[karoIndeks(kx, KARO_BOY - 1)] = 1;
  }
  for (let ky = 0; ky < KARO_BOY; ky++) {
    izgara.yasak[karoIndeks(0, ky)] = 1;
    izgara.yasak[karoIndeks(KARO_EN - 1, ky)] = 1;
  }
  return izgara;
}

/** (x, y) hücre merkezli r hücrelik daireye değen karoları yasaklar (ör. garaj park alanı). */
export function yasakEkle(izgara, x, y, r) {
  for (let ky = 0; ky < KARO_BOY; ky++) {
    for (let kx = 0; kx < KARO_EN; kx++) {
      const dx = Math.max(kx * KARO - x, 0, x - (kx + 1) * KARO);
      const dy = Math.max(ky * KARO - y, 0, y - (ky + 1) * KARO);
      if (dx * dx + dy * dy <= r * r) izgara.yasak[karoIndeks(kx, ky)] = 1;
    }
  }
}

/** Karodaki parça (yoksa null). */
export function parcaAt(c, kx, ky) {
  if (kx < 0 || ky < 0 || kx >= KARO_EN || ky >= KARO_BOY) return null;
  const id = c.izgara.dolu[karoIndeks(kx, ky)];
  return id ? c.parcalar.get(id - 1) ?? null : null;
}

/**
 * Kurulabilir mi? null (evet) ya da neden: 'disarida' | 'yasak' | 'dolu' | 'saman'.
 * haric: bu id'li parçanın kapladığı karolar boş sayılır (döndürme denetimi).
 */
export function yerlestirmeEngeli(c, tarla, tanim, x, y, yon, haric = -1) {
  const [en, boy] = donmusBoyut(tanim.boyut, tanim.yonlu ? yon & 3 : 0);
  if (x < 0 || y < 0 || x + en > KARO_EN || y + boy > KARO_BOY) return 'disarida';
  const { dolu, yasak } = c.izgara;
  for (let ky = y; ky < y + boy; ky++) {
    for (let kx = x; kx < x + en; kx++) {
      const i = karoIndeks(kx, ky);
      if (yasak[i]) return 'yasak';
      if (dolu[i] && dolu[i] - 1 !== haric) return 'dolu';
    }
  }
  for (let hy = y * KARO; hy < (y + boy) * KARO; hy++) {
    for (let hx = x * KARO; hx < (x + en) * KARO; hx++) {
      if (haric >= 0 && dolu[karoIndeks((hx / KARO) | 0, (hy / KARO) | 0)] - 1 === haric) continue;
      if (hucreZemini(c, hx, hy) === ZEMIN.CAYIR) continue;
      if (tarla.h[hy * GENISLIK + hx] > KURMA_ESIK) return 'saman';
    }
  }
  return null;
}

/** Parçanın kapladığı karoları doldurur ya da (id = -1) boşaltır; taban maskesini yazar. */
function isaretle(c, p, id) {
  const { dolu, taban } = c.izgara;
  for (let ky = p.y; ky < p.y + p.boy; ky++) {
    for (let kx = p.x; kx < p.x + p.en; kx++) {
      dolu[karoIndeks(kx, ky)] = id + 1;
      for (let hy = ky * KARO; hy < (ky + 1) * KARO; hy++) {
        for (let hx = kx * KARO; hx < (kx + 1) * KARO; hx++) {
          taban[hy * GENISLIK + hx] = id >= 0 ? 1 : 0;
        }
      }
    }
  }
}

/**
 * Parçayı ızgaraya koyar (yerlestirmeEngeli önceden denetlenmiş olmalı): alttaki saman
 * çevreye, alttaki gömülü nesneler halkaya; taban maskesi ve doluluk yazılır.
 */
export function izgarayaKoy(c, tarla, p) {
  const x0 = p.x * KARO;
  const y0 = p.y * KARO;
  const x1 = x0 + p.en * KARO;
  const y1 = y0 + p.boy * KARO;
  let toplam = 0;
  for (let hy = y0; hy < y1; hy++) {
    for (let hx = x0; hx < x1; hx++) {
      const i = hy * GENISLIK + hx;
      toplam += tarla.h[i];
      tarla.h[i] = 0;
    }
  }
  isaretle(c, p, p.id);
  cevreyeDagit(tarla, c, x0, y0, x1, y1, toplam);
  for (const g of c.gomulu) {
    const gx = g.x | 0;
    const gy = g.y | 0;
    if (g.alindi || gx < x0 || gy < y0 || gx >= x1 || gy >= y1) continue;
    const yer = enYakinHalka(c, x0, y0, x1, y1, gx, gy);
    Object.assign(g, { x: yer.x, y: yer.y, z: 0 });
  }
}

function enYakinHalka(c, x0, y0, x1, y1, gx, gy) {
  let en = null;
  for (let y = y0 - 1; y <= y1; y++) {
    for (let x = x0 - 1; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= GENISLIK || y >= YUKSEKLIK) continue;
      if (c.izgara.taban[y * GENISLIK + x]) continue;
      const d = (x - gx) * (x - gx) + (y - gy) * (y - gy);
      if (!en || d < en.d) en = { x, y, d };
    }
  }
  return en ?? { x: gx, y: gy };
}

/** Parçayı ızgaradan kaldırır (doluluk ve taban temizlenir; saman yeniden akabilir). */
export function izgaradanAl(c, p) {
  isaretle(c, p, -1);
  alaniKirlet(c, p.x * KARO, p.y * KARO, (p.x + p.en) * KARO, (p.y + p.boy) * KARO);
}

/** Yüklemede: saman ve gömülüye dokunmadan doluluk ve taban maskesini yazar. */
export function izgaraIsaretle(c, p) {
  isaretle(c, p, p.id);
}

/**
 * (x, y) hücre çevresinde r hücre içindeki dolu karoların çarpışma daireleri ({x, y, r: 1},
 * karo merkezi). makine: true ise yürünür parçalar da engeldir. Dizin sorgusu (tüm parçalar
 * taranmaz).
 */
export function engelleriTopla(c, x, y, r, makine = false) {
  const liste = [];
  const k0x = Math.max(0, Math.floor((x - r) / KARO));
  const k0y = Math.max(0, Math.floor((y - r) / KARO));
  const k1x = Math.min(KARO_EN - 1, Math.floor((x + r) / KARO));
  const k1y = Math.min(KARO_BOY - 1, Math.floor((y + r) / KARO));
  for (let ky = k0y; ky <= k1y; ky++) {
    for (let kx = k0x; kx <= k1x; kx++) {
      const p = parcaAt(c, kx, ky);
      if (!p || (!makine && p.tanim.yurunur)) continue;
      liste.push({ x: kx * KARO + 1, y: ky * KARO + 1, r: 1 });
    }
  }
  return liste;
}
