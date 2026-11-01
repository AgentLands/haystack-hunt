/**
 * Çiftlik testlerinin ortak yardımcıları: düz (sentetik) tarla, boş dünya, hızlı kurulum
 * ve tik koşturma. Benzetim yalnız tarla.h / kirli / kaldirilan okur; sentetik tarla
 * tarlaKur'dan çok hızlıdır. Perf betiği (araclar/ciftlik-olc.mjs) de kullanır.
 */
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { ciftlikKur, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { parcaKur } from '../js/kural/ciftlik/komut.js';
import { parcaTanimla, parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli } from '../js/kural/ciftlik/izgara.js';
import { DX, DY } from '../js/kural/ciftlik/olcu.js';
import { ENERJI, havaAl } from '../js/kural/ciftlik/ag/enerji.js';
import { havaSabitle as kuralHavasi } from '../js/kural/ciftlik/dunya/hava.js';
import '../js/kural/ciftlik/parcalar/hepsi.js';

/** Bütün hücreleri `taban` kat olan tarla; `yigin` verilirse (x, y, r, t) koni eklenir. */
export function duzTarla(taban = 0, yiginlar = []) {
  const h = new Uint16Array(GENISLIK * YUKSEKLIK).fill(taban);
  for (const { x, y, r, t } of yiginlar) {
    for (let j = Math.max(0, y - r); j < Math.min(YUKSEKLIK, y + r); j++) {
      for (let i = Math.max(0, x - r); i < Math.min(GENISLIK, x + r); i++) {
        const d2 = ((i - x) ** 2 + (j - y) ** 2) / (r * r);
        if (d2 < 1) h[j * GENISLIK + i] += Math.floor(t * (1 - d2));
      }
    }
  }
  return { h, kirli: true, kaldirilan: 0 };
}

/** Sentetik dünyaların varsayılan havası (eski sapların değeri): doğuya rüzgâr 2, güneş. */
export const TEST_HAVASI = Object.freeze({ yon: 0, siddet: 2, gok: 'gunes' });

/**
 * Testlerin havası (dunya/hava.js havaSabitle kancası; bütün dünyalar, kayıttan yüklenenler
 * de): { yon, siddet, gok } (eksik alan TEST_HAVASI'ndan), (dilim) → o nesne, 'gercek'
 * (tohum havası) ya da yok (TEST_HAVASI). Bu modülü içe aktaran testlerde varsayılan
 * TEST_HAVASI'dır; gerçek arazi testleri (ciftlik-dunya-yardim.mjs) 'gercek' kurar.
 */
export function havaSabitle(h) {
  if (typeof h === 'function') kuralHavasi((d) => ({ ...TEST_HAVASI, ...h(d) }));
  else kuralHavasi(h === 'gercek' ? null : { ...TEST_HAVASI, ...h });
}
havaSabitle();

/** Boş dünya + sentetik tarla (hava: havaSabitle). */
export function dunya(tohum = 7, tarla = duzTarla(), secenek = {}) {
  return { c: ciftlikKur(tohum, secenek), tarla };
}

/** Hemen kurar; kurulamazsa hata (test kurulumu sessiz geçmesin). */
export function kur(c, tarla, ad, x, y, yon = 0) {
  const s = parcaKur(c, tarla, ad, x, y, yon);
  if (!s.parca) throw new Error(`${ad} (${x}, ${y}) kurulamadı: ${s.neden}`);
  return s.parca;
}

/** (x, y)'den yon yönünde n bant. */
export function bantCek(c, tarla, x, y, yon, n) {
  const dx = [1, 0, -1, 0][yon];
  const dy = [0, 1, 0, -1][yon];
  for (let i = 0; i < n; i++) kur(c, tarla, 'bant', x + dx * i, y + dy * i, yon);
}

/** n tik koşar; bütün olayları döndürür. */
export function kos(c, tarla, n) {
  const olaylar = [];
  for (let i = 0; i < n; i++) olaylar.push(...tikAt(c, tarla));
  return olaylar;
}

/** Bir sandığın toplam içeriği. */
export const sandikToplam = (p) => p.ozel.toplam;

/** Boş yer varsa tanımı (x, y)'ye kurar, yoksa null (kurulamazsa hata atmaz). */
function bosKur(c, tarla, ad, x, y) {
  const tanim = parcaTanimi(ad);
  return yerlestirmeEngeli(c, tarla, tanim, x, y, 0) ? null : kur(c, tarla, ad, x, y);
}

/** Parçanın dört yandaki dış komşu hücreleri (kuzey-güney-doğu-batı, sıralı, tekrarsız). */
function disKomsular(p) {
  const hucreler = [];
  for (let y = p.y; y < p.y + p.boy; y++) {
    for (let x = p.x; x < p.x + p.en; x++) {
      for (let yon = 0; yon < 4; yon++) {
        const k = [x + DX[yon], y + DY[yon]];
        const icinde = k[0] >= p.x && k[0] < p.x + p.en && k[1] >= p.y && k[1] < p.y + p.boy;
        if (!icinde && !hucreler.some((h) => h[0] === k[0] && h[1] === k[1])) hucreler.push(k);
      }
    }
  }
  return hucreler;
}

/** Test yükü: yalnız `ozel.bg` bg talep eden makine (oran düzenlerinde yapay yük). */
function yukTanimi() {
  return parcaTanimi('test-yuk') ?? parcaTanimla('test-yuk', {
    kod: 65200, ad: 'Test yükü', aile: 'isleme', boyut: [1, 1], yonlu: false, guc: 1,
    kur(p) {
      p.ozel.bg = 0;
    },
    talep: (p) => p.ozel.bg,
  });
}

/**
 * Güç isteyen makineye gerçek enerji bağlar: makinenin boş bir dış komşusuna şaft, şafta
 * değen boş bir yere yel değirmeni (2×2) kurar; bağlantı komşulukla olur (ag/enerji.js).
 * Güç varsayılan (sabit rüzgâr, şiddet 2) hava kaynağından gelir (YEL_BG[siddet] bg).
 * `oran` < 1024 ise şebekeye yapay yük eklenir: oran = arz / (makine + yük) = verilen oran
 * (512 → talep arzın iki katı). Döndürür { saft, yel, yuk }.
 */
export function gucVer(c, tarla, p, { oran = 1024 } = {}) {
  for (const [sx, sy] of disKomsular(p)) {
    if (yerlestirmeEngeli(c, tarla, parcaTanimi('saft'), sx, sy, 0)) continue;
    for (let oy = sy - 2; oy <= sy + 1; oy++) {
      for (let ox = sx - 2; ox <= sx + 1; ox++) {
        const kaplar = sx >= ox && sx < ox + 2 && sy >= oy && sy < oy + 2;
        const degiyor = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([a, b]) => sx + a >= ox
          && sx + a < ox + 2 && sy + b >= oy && sy + b < oy + 2);
        if (kaplar || !degiyor) continue;
        if (yerlestirmeEngeli(c, tarla, parcaTanimi('yel-degirmeni'), ox, oy, 0)) continue;
        const saft = kur(c, tarla, 'saft', sx, sy);
        const yel = kur(c, tarla, 'yel-degirmeni', ox, oy);
        return { saft, yel, yuk: oran < 1024 ? yukEkle(c, tarla, saft, p, oran) : null };
      }
    }
  }
  throw new Error(`${p.tanim.anahtar} (${p.x}, ${p.y}) için güç kurulamadı: yer yok`);
}

/** Şafta değen boş hücreye, şebeke oranını `oran`a getirecek yapay yükü kurar. */
function yukEkle(c, tarla, saft, p, oran) {
  yukTanimi();
  const arz = ENERJI.YEL_BG[havaAl(c, c.tik).siddet];
  const ekstra = Math.ceil((arz * 1024) / oran) - p.tanim.guc;
  for (let yon = 0; yon < 4; yon++) {
    const yuk = bosKur(c, tarla, 'test-yuk', saft.x + DX[yon], saft.y + DY[yon]);
    if (yuk) {
      yuk.ozel.bg = ekstra;
      return yuk;
    }
  }
  throw new Error('test yükü için yer yok');
}
