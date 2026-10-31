/**
 * Garaj: tarla kenarında, tohumdan seçilen (en az samanlı aday) bir park yeri; kayıtlı her
 * makine türünden birer tane, kayıt sırasıyla kenar boyunca yan yana, yüzü tarlaya dönük
 * park eder. Başlangıç yakıtı zorluğa bağlıdır (zorluk.js: yakit). Kendi üretecini kullanır
 * ki tarla, iğne ve çivi üretimi değişmesin.
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';
import { uretec } from '../rastgele.js';
import { zorlukAl } from '../zorluk.js';
import { yukseklik } from '../tarla.js';
import { makineTanimi, makineTurleri } from './kayit.js';

const GARAJ_TOHUM_KARISTIR = 0x5bd1e995;
/** Makine merkezlerinin kenardan uzaklığı ve yan yana aralığı (hücre). */
export const GARAJ_ICERI = 4;
export const PARK_ARALIK = 5;
/** Kenarlar: 0 üst, 1 sağ, 2 alt, 3 sol; tarlaya doğru (içeri) bakan yön. */
const ICERI = [Math.PI / 2, Math.PI, -Math.PI / 2, 0];

/** Kenar k üzerinde, kenar boyunca t (0..1) oranındaki park merkezi (dünya birimi). */
function kenarNoktasi(k, t) {
  if (k === 0) return { x: GENISLIK * t, y: GARAJ_ICERI };
  if (k === 1) return { x: GENISLIK - GARAJ_ICERI, y: YUKSEKLIK * t };
  if (k === 2) return { x: GENISLIK * t, y: YUKSEKLIK - GARAJ_ICERI };
  return { x: GARAJ_ICERI, y: YUKSEKLIK * t };
}

function bolgeSamani(tarla, cx, cy, r) {
  let s = 0;
  for (let y = Math.floor(cy - r); y <= Math.floor(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++) {
      if (x >= 0 && y >= 0 && x < GENISLIK && y < YUKSEKLIK) s += tarla.h[y * GENISLIK + x];
    }
  }
  return s;
}

/** Yeni makine nesnesi (sözleşme: docs/KARAKTER_TASARIM.md §Makine verisi). */
export function yeniMakine(tur, id, x, y, yon, yakit) {
  const m = {
    id, tur, x, y, yon, hiz: 0, yakit, surucu: false, calisiyor: false, yuk: 0,
    z: 0, takili: false, kilitli: false,
  };
  makineTanimi(tur).kur(m);
  return m;
}

/**
 * Garajı ve makineleri kurar. Dönüş: { garaj: { x, y, kenar, yon, en }, makineler }.
 * garaj.x/y park sırasının ortası (dünya birimi), yon tarlaya bakan açı, en sıranın boyu.
 */
export function garajKur(tarla, zorluk) {
  const zar = uretec((tarla.tohum ^ GARAJ_TOHUM_KARISTIR) >>> 0);
  const turler = makineTurleri();
  const en = Math.max(1, turler.length) * PARK_ARALIK + 2;
  let enIyi = null;
  for (let deneme = 0; deneme < 8; deneme++) {
    const kenar = Math.floor(zar() * 4);
    const nokta = kenarNoktasi(kenar, 0.25 + 0.5 * zar());
    const icx = nokta.x + Math.cos(ICERI[kenar]) * 6;
    const icy = nokta.y + Math.sin(ICERI[kenar]) * 6;
    const saman = bolgeSamani(tarla, icx, icy, Math.ceil(en / 2) + 2);
    if (!enIyi || saman < enIyi.saman) enIyi = { ...nokta, kenar, saman };
  }
  const { x, y, kenar } = enIyi;
  const yon = ICERI[kenar];
  const garaj = { x, y, kenar, yon, en };
  const yakit = zorlukAl(zorluk).yakit;
  const bx = -Math.sin(yon); // kenar boyunca birim yön
  const by = Math.cos(yon);
  const makineler = turler.map((tur, i) => {
    const k = (i - (turler.length - 1) / 2) * PARK_ARALIK;
    const m = yeniMakine(tur, `${tur}-${i + 1}`, x + bx * k, y + by * k, yon, yakit);
    m.z = yukseklik(tarla, m.x, m.y);
    return m;
  });
  return { garaj, makineler };
}
