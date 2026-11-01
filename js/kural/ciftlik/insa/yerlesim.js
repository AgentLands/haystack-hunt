/**
 * Tek parça yerleşim önizlemesi (saf): imleç karosundan parçanın sol üst karosu (çok karolu
 * parça imleçte ortalanır) ve hayaletin durumu. Durum renk + şekille gösterilir:
 *   'gecerli'  kurulur ve en az bir kapısı bir komşuya bağlanır (ya da kapısı yok)
 *   'uyari'    kurulur ama hiçbir kapısı bağlanmıyor ("bağlantısız": kapı boşa bakıyor)
 *   'gecersiz' kurulmaz; neden: 'kilitli' | 'disarida' | 'yasak' | 'dolu' | 'saman' | 'kurus'
 * baglar: hayaletin bağlandığı komşu karolar (önizlemede bir an parlar).
 * Bağlantı kuralı çekirdeğin port protokolüyle aynıdır (MIMARI §5): çıkış kapısı, porta geri
 * bakmayan bir hat karosuna ya da komşunun o kenara bakan giriş kapısına; giriş kapısı, ona
 * akan bir hat karosuna ya da o kenara bakan bir çıkış kapısına bağlanır.
 */
import { donmusBoyut, tersYon, DX, DY } from '../olcu.js';
import { parcaTanimi, parcaOrnegi } from '../parca-kayit.js';
import { parcaAt, yerlestirmeEngeli } from '../izgara.js';

/** İmleç karosuna göre parçanın sol üst karosu. */
export function yerlesimKonumu(anahtar, kx, ky, yon) {
  const tanim = parcaTanimi(anahtar);
  const [en, boy] = donmusBoyut(tanim.boyut, tanim.yonlu ? yon & 3 : 0);
  return { x: kx - ((en - 1) >> 1), y: ky - ((boy - 1) >> 1) };
}

function cikisBagli(c, port) {
  const q = parcaAt(c, port.hx, port.hy);
  if (!q) return false;
  if (q.tanim.hat) return q.yon !== tersYon(port.yon);
  return q.giris.some((g) => g.kx === port.hx && g.ky === port.hy
    && g.hx === port.kx && g.hy === port.ky);
}

function girisBagli(c, port) {
  const q = parcaAt(c, port.hx, port.hy);
  if (!q) return false;
  if (q.tanim.hat) return q.x + DX[q.yon] === port.kx && q.y + DY[q.yon] === port.ky;
  return q.cikis.some((k) => k.kx === port.hx && k.ky === port.hy
    && k.hx === port.kx && k.hy === port.ky);
}

/** p (dünyadaki ya da hayalet örnek) kapılarının bağlandığı komşu karolar. */
export function portBaglari(c, p) {
  const baglar = [];
  for (const port of p.cikis) if (cikisBagli(c, port)) baglar.push({ kx: port.hx, ky: port.hy });
  for (const port of p.giris) if (girisBagli(c, port)) baglar.push({ kx: port.hx, ky: port.hy });
  return baglar;
}

/**
 * Hayalet durumu: { durum, neden, baglar }. secenek: { kilit (metin ya da null), fiyat,
 * butce (null: kuruş sistemi yok) }.
 */
export function yerlesimDurumu(c, tarla, anahtar, x, y, yon, secenek = {}) {
  const tanim = parcaTanimi(anahtar);
  const { kilit = null, fiyat = null, butce = null } = secenek;
  let neden = kilit ? 'kilitli' : yerlestirmeEngeli(c, tarla, tanim, x, y, yon);
  if (!neden && fiyat !== null && butce !== null && fiyat > butce) neden = 'kurus';
  if (neden) return { durum: 'gecersiz', neden, baglar: [] };
  const p = parcaOrnegi(tanim, -1, x, y, yon);
  const baglar = portBaglari(c, p);
  const kapili = p.giris.length + p.cikis.length > 0;
  return { durum: kapili && !baglar.length ? 'uyari' : 'gecerli', neden: null, baglar };
}

/** Oyuncuya görünen kısa neden metni. */
export const NEDEN_METNI = {
  kilitli: 'kilitli', disarida: 'tarla dışında', yasak: 'garaj ya da kenar', dolu: 'dolu',
  saman: 'saman çok yüksek: önce temizle', kurus: 'kuruş yetmez',
  kesisme: 'başka bir hattı kesiyor: menfez gerekir', bagsiz: 'bağlantısız: kapı boşa bakıyor',
};
