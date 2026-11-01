/**
 * Yerleşim denetimi: bir kümenin (kumeKonumla çıktısı) tek işlemde kurulup kurulamayacağı.
 * Karo karo engel (dışarıda, yasak, dolu, saman), kilitli parça ve kuruş eksiği; hepsi ya
 * hiç. Kuruş, bedel ve kilit G'nin ekonomisinden (`kumeBaglam`; testler değiştirebilir).
 */
import { parcaTanimi } from '../parca-kayit.js';
import { yerlestirmeEngeli } from '../izgara.js';
import { kutu } from './kume.js';
import { ekonomiAl, parcaMaliyeti } from '../ekonomi/kurus.js';
import { acikMi } from '../ekonomi/acilis.js';
import { ilerlemeAl } from '../ekonomi/damga.js';
import { PARCA_MALIYET } from '../ekonomi/denge.js';

/** Karo denetimi için 1×1 yönsüz sahte tanım (yerlestirmeEngeli yalnız boyut/yonlu okur). */
const KARO_TANIMI = Object.freeze({ boyut: [1, 1], yonlu: false });

/**
 * Ekonomi bağlamı (G): kuruş, parça bedeli, kilit. Fiyat tablosunda olmayan (test) parça
 * ekonomi dışıdır (kurus.js kurulumEngeli ile aynı kural).
 */
export const kumeBaglam = {
  kurus: (c) => ekonomiAl(c).kurus,
  maliyet: (tanim) => parcaMaliyeti(tanim.anahtar),
  kilitli: (tanim, c) => Object.hasOwn(PARCA_MALIYET, tanim.anahtar)
    && !acikMi(tanim.anahtar, ilerlemeAl(c)),
};

/** Bağlamı (kısmen) değiştirir. */
export function kumeBaglamKur(parca) {
  Object.assign(kumeBaglam, parca);
}

/**
 * Yerleşimi (kumeKonumla çıktısı) tek işlemde kurulabilir mi diye denetler:
 *   { gecerli, parcalar: [{ kod, neden }], engelli: [{ kx, ky, neden }], engelliKaro,
 *     kurus (toplam bedel), eksik (yetmeyen kuruş) }
 * neden: 'disarida' | 'yasak' | 'dolu' | 'saman' | 'kilitli'. Hepsi ya hiç: gecerli yalnız
 * hiç engelli karo, kilitli parça ve kuruş eksiği yoksa true.
 */
export function yerlesimDenetle(c, tarla, yerlesim, baglam = kumeBaglam) {
  const engelli = [];
  const parcalar = [];
  let kurus = 0;
  for (const q of yerlesim) {
    const tanim = parcaTanimi(q.kod);
    const [en, boy] = kutu(tanim, q.yon);
    const kilitli = baglam.kilitli(tanim, c);
    let neden = kilitli ? 'kilitli' : null;
    for (let ky = q.y; ky < q.y + boy; ky++) {
      for (let kx = q.x; kx < q.x + en; kx++) {
        const engel = yerlestirmeEngeli(c, tarla, KARO_TANIMI, kx, ky, 0);
        const n = engel ?? (kilitli ? 'kilitli' : null);
        if (n) engelli.push({ kx, ky, neden: n });
        neden ??= engel;
      }
    }
    kurus += baglam.maliyet(tanim);
    parcalar.push({ kod: q.kod, neden });
  }
  const eksik = Math.max(0, kurus - baglam.kurus(c));
  return {
    gecerli: !engelli.length && eksik === 0,
    parcalar, engelli, engelliKaro: engelli.length, kurus, eksik,
  };
}

/** Sayaç metni: "3 karo engelli · 40 kuruş eksik" (engel yoksa yalnız bedel). */
export function sayacMetni(d) {
  const parca = [];
  if (d.engelliKaro) parca.push(`${d.engelliKaro} karo engelli`);
  parca.push(d.eksik ? `${d.eksik} kuruş eksik` : `${d.kurus} kuruş`);
  return parca.join(' · ');
}
