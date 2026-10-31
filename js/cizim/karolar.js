/**
 * Yakın görünüm karo kaydı (saf, DOM yok): tarla KARO×KARO hücrelik karolara bölünür;
 * yüksekliği ya da yığın gölgesi değişen hücrelerin etkilediği karolar kirli işaretlenir
 * (yalnız onlar yeniden boyanır). Görünür bölgenin karo aralığını da hesaplar.
 */
import { KANAL, K_GOL } from './tarla-boya.js';

export const KARO = 4;
/**
 * Gölge bu kadar (/255) değişmedikçe karo kirlenmez: yığın alçaldıkça uzak gölgelerdeki
 * küçük kaymalar her karede geniş alanı yeniden boyatmasın. Değer son işaretlenenle
 * karşılaştırılır, böylece yavaş birikim de sonunda yakalanır.
 */
const GOLGE_ESIK = 6;

/**
 * en×boy hücrelik tarla için karo kaydı. Bir hücrenin yüksekliği değişince ±2 hücre
 * (eğim ve ara değer komşuları), gölgesi değişince ±1 hücre içindeki karolar kirlenir.
 * kirli[i] karonun kirlendiği kare sayacıdır (0 temiz): uzun bekleyen karolar öne alınır.
 */
export function karoKaydi(en, boy) {
  const kx = Math.ceil(en / KARO);
  const ky = Math.ceil(boy / KARO);
  // Karo başına kirlendiği karenin sayacı (0: temiz); en eski kirlenme korunur.
  const kirli = new Uint32Array(kx * ky).fill(1);
  let sayac = 1;
  const sonH = new Uint16Array(en * boy);
  const sonGol = new Uint8Array(en * boy);
  const sMin = new Int16Array(boy);
  const sMax = new Int16Array(boy);
  let sonTarla = null;

  function isaretle(x, y, pay) {
    const ax = Math.max(0, Math.floor((x - pay) / KARO));
    const bx = Math.min(kx - 1, Math.floor((x + pay) / KARO));
    const ay = Math.max(0, Math.floor((y - pay) / KARO));
    const by = Math.min(ky - 1, Math.floor((y + pay) / KARO));
    for (let ty = ay; ty <= by; ty++) {
      for (let tx = ax; tx <= bx; tx++) {
        if (!kirli[ty * kx + tx]) kirli[ty * kx + tx] = sayac;
      }
    }
  }

  return {
    kx, ky, kirli,
    /** Kare sayacı (hDegisti her çağrıda bir artar); kirli[i] ile farkı karonun yaşı. */
    get sayac() {
      return sayac;
    },
    /**
     * Tarla yeni mi ya da yüksekliği değişti mi? Değişen hücrelerin karolarını işaretler ve
     * boya() için değişiklik tanımını { y0, y1, sMin, sMax } (yeni tarlada { yeni: true })
     * döndürür; değişiklik yoksa null.
     */
    hDegisti(tarla) {
      const { h } = tarla;
      sayac++;
      if (tarla !== sonTarla) {
        sonTarla = tarla;
        sonH.set(h);
        kirli.fill(1);
        return { yeni: true };
      }
      sMin.fill(en);
      sMax.fill(-1);
      let y0 = boy;
      let y1 = -1;
      for (let i = 0; i < h.length; i++) {
        if (h[i] !== sonH[i]) {
          sonH[i] = h[i];
          const x = i % en;
          const y = (i / en) | 0;
          isaretle(x, y, 2);
          if (x < sMin[y]) sMin[y] = x;
          if (x > sMax[y]) sMax[y] = x;
          if (y < y0) y0 = y;
          y1 = y;
        }
      }
      return y1 >= 0 ? { y0, y1, sMin, sMax } : null;
    },
    /** boya() bir hücreyi yeniden yazınca: gölgesi belirgin değiştiyse karolarını kirlet. */
    golgeHucre(kanal, i) {
      const g = Math.round(kanal[i * KANAL + K_GOL] * 255);
      if (Math.abs(g - sonGol[i]) > GOLGE_ESIK) {
        sonGol[i] = g;
        isaretle(i % en, (i / en) | 0, 1);
      }
    },
    /** Hepsini kirli say (ör. dokular yeniden üretildi). */
    hepsiKirli() {
      kirli.fill(1);
    },
  };
}

/**
 * Görünür alanın (hücre birimi {x, y, en, boy}) pay hücre genişletilmiş hali ve kapsadığı
 * karo aralığı (uçlar dahil). Hücre aralığı tarla sınırına kenetlenir.
 */
export function gorunurKarolar(alan, pay, en, boy) {
  const x0 = Math.max(0, Math.floor(alan.x) - pay);
  const y0 = Math.max(0, Math.floor(alan.y) - pay);
  const x1 = Math.min(en, Math.ceil(alan.x + alan.en) + pay);
  const y1 = Math.min(boy, Math.ceil(alan.y + alan.boy) + pay);
  return {
    x0, y0, x1, y1,
    tx0: Math.floor(x0 / KARO), ty0: Math.floor(y0 / KARO),
    tx1: Math.floor((x1 - 1) / KARO), ty1: Math.floor((y1 - 1) / KARO),
  };
}

/**
 * Aralıktaki (gorunurKarolar sonucu) karoları (mx, my) karosundan dışa doğru halka halka
 * gezer: önce merkez, sonra Chebyshev uzaklığı 1, 2... her(tx, ty) false dönerse durur.
 * Böylece süre bütçesi bitince boyanmadan kalanlar hep kenardakiler olur.
 */
export function halkaHalka(a, mx, my, her) {
  const cx = Math.min(a.tx1, Math.max(a.tx0, mx));
  const cy = Math.min(a.ty1, Math.max(a.ty0, my));
  const enUzak = Math.max(cx - a.tx0, a.tx1 - cx, cy - a.ty0, a.ty1 - cy);
  for (let r = 0; r <= enUzak; r++) {
    for (let ty = Math.max(a.ty0, cy - r); ty <= Math.min(a.ty1, cy + r); ty++) {
      const kenar = ty === cy - r || ty === cy + r;
      const adim = kenar ? 1 : 2 * r;
      for (let tx = cx - r; tx <= cx + r; tx += adim || 1) {
        if (tx < a.tx0 || tx > a.tx1) continue;
        if (her(tx, ty) === false) return;
      }
    }
  }
}

/** Geçiş karışımı: yakınlaştırma bas..tam arasında 0→1 (yumuşak basamak). */
export function gecisAlfa(z, bas, tam) {
  const t = Math.min(1, Math.max(0, (z - bas) / (tam - bas)));
  return t * t * (3 - 2 * t);
}
