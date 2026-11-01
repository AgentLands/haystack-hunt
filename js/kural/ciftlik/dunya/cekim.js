/**
 * Emici huninin çekimi (birleştirme kararı, S/rapor: entegrasyon): yığınlar zaten doğal kayma
 * eğimine (tarla.js ESIK 3) yakın kurulduğundan, ağzı yalnız kendi karosundan alan huni ağzın
 * önündeki koniyi ≈ 150-250 tutamda tüketip aç kalıyordu (tek huni harman arabası eşiğine hiç
 * varamıyordu). Huni ağzının önündeki "çekim alanında" saman, ağza doğru daha yatık eğimle
 * (fark ≥ CEKIM.esik) kayar: ağzın önünde yatık bir huni çukuru oluşur, ötesi doğal kaymayla
 * gelir. Yalnız ağız boşalmışken (en yüksek ağız hücresi < CEKIM.bos) ve tikte en çok
 * CEKIM.enCok kat taşınır (huninin kendi hızını aşmaz); saman tarlada yer değiştirir (korunum
 * değişmez), parça tabanı duvardır. Deterministik: sabit tarama sırası.
 */
import { GENISLIK, YUKSEKLIK } from '../../boyut.js';
import { DX, DY, tersYon } from '../olcu.js';
import { kirliIsaretle } from '../saman.js';

/** derin: ağzın önünde hücre; yan: her adımda huni ağzının iki yanına açılma (en çok). */
export const CEKIM = Object.freeze({ derin: 16, yan: 6, esik: 2, enCok: 2, bos: 4 });

/**
 * Çekim adımı. agiz: ağız hücre indeksleri (karoHucreleri). p: huni (yön). Taşınan kat.
 */
export function cekimAdim(tarla, c, p, agiz) {
  const { h } = tarla;
  let tepe = 0;
  for (const i of agiz) tepe = Math.max(tepe, h[i]);
  if (tepe >= CEKIM.bos) return 0;
  const d = tersYon(p.yon);
  const [ax, ay] = [DX[d], DY[d]];
  const [lx, ly] = [ay, -ax];
  // ağzın en dış hücre çizgisi ve yanal genişliği
  let dis = -Infinity;
  let yanMin = Infinity;
  let yanMax = -Infinity;
  for (const i of agiz) {
    const x = i % GENISLIK;
    const y = (i / GENISLIK) | 0;
    dis = Math.max(dis, x * ax + y * ay);
    const l = x * lx + y * ly;
    yanMin = Math.min(yanMin, l);
    yanMax = Math.max(yanMax, l);
  }
  const { taban } = c.izgara;
  const hucre = (u, l) => {
    // u: ağız yönünde konum, l: yanal konum → (x, y)
    const x = u * ax + l * lx;
    const y = u * ay + l * ly;
    return x >= 0 && y >= 0 && x < GENISLIK && y < YUKSEKLIK ? y * GENISLIK + x : -1;
  };
  let tasinan = 0;
  for (let k = 1; k <= CEKIM.derin && tasinan < CEKIM.enCok; k++) {
    const genis = Math.min(k, CEKIM.yan);
    for (let l = yanMin - genis; l <= yanMax + genis && tasinan < CEKIM.enCok; l++) {
      const i = hucre(dis + k, l);
      const lHedef = Math.min(Math.max(l, yanMin - genis + 1), yanMax + genis - 1);
      const j = hucre(dis + k - 1, k === 1 ? Math.min(Math.max(l, yanMin), yanMax) : lHedef);
      if (i < 0 || j < 0 || taban[i] || taban[j] || h[i] - h[j] < CEKIM.esik) continue;
      h[i] -= 1;
      h[j] += 1;
      tasinan += 1;
      kirliIsaretle(c, i % GENISLIK, (i / GENISLIK) | 0);
      kirliIsaretle(c, j % GENISLIK, (j / GENISLIK) | 0);
    }
  }
  return tasinan;
}
