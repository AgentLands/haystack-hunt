/**
 * Çiftlik arazisi (docs/ciftlik/esyalar.md §4, sistemler.md §3): tohumdan harman alanı
 * (normal tarla formülü, çiftlik yığın ayarıyla: tarlaKurAyar), çayır köşesi, Komşu kapısının
 * yeri, harman arabası döküm adayları; zemin katmanı (`c.arazi.zemin[karo]`), gübre
 * (`gubrele`), çayır büyümesi aşaması ve `cayirGenislet` komutu.
 * Saman korunumu kaynak sayaçları c üstündedir: c.cayirKat (çayırın büyüttüğü),
 * c.arabaKat (arabaların döktüğü), c.cevrimdisiKat (G · ekonomi yazar), c.tuketilenKat
 * (harmandan toplanan; araba tetiği). Normal tarla bundan etkilenmez.
 */
import { GENISLIK } from '../../boyut.js';
import { tarlaKurAyar, toplamSaman } from '../../tarla.js';
import { zorlukAl } from '../../zorluk.js';
import { KARO, KARO_EN, KARO_BOY, KARO_SAYISI, karoIndeks } from '../olcu.js';
import { kirliIsaretle } from '../saman.js';
import { asamaTanimla } from '../benzetim.js';
import { komutTanimla } from '../komut.js';
import { kayitAlaniTanimla, ozelKodla, ozelCoz } from '../sakla.js';
import { havaAl, karma, GOK } from './hava.js';
import { ZEMIN, bosArazi, dunyaHazirla, harmanStogu, KAYNAK_SAYACLARI } from './zemin.js';
import { KUYU } from '../ekonomi/denge.js';
import { kuyuOde } from '../ekonomi/kurus.js';
import { kapiAlaniDuzle } from './kapi.js';

export {
  ZEMIN, zeminAl, hucreZemini, dunyaHazirla, harmanStogu, gubrele, gubreliMi,
} from './zemin.js';

/** Çiftlik yığın ayarı (biçim zorluk.js): yarıçap 14-32 hücre, tepe 50-105 kat. */
export const CIFTLIK_YIGIN = Object.freeze({ taban: 6, ek: 3, r: [14, 18], t: [50, 55] });
/**
 * Çayır: en × boy karo, ayakta ot kat (tavan); büyüme her `buyume` tikte +1 kat (yağmurda
 * `yagmurBuyume`; gübreli karoda yarısı); Çayır genişlet: +genislet karo sütunu, en çok 3.
 */
export const CAYIR = Object.freeze({
  en: 24, boy: 12, kat: 12, buyume: 240, yagmurBuyume: 120, genislet: KUYU.cayir.sutun,
  genisletEnCok: KUYU.cayir.bedeller.length,
});
/** Kapı ile en yakın yığın eteği arası en çok bu kadar karo olsun (ilk bant ≤ 30). */
export const KAPI_ETEK = 30;
const DOKUM_ADAY = 8;

/** Çiftliğin tarlası (normal tarla formülü + çiftlik yığın ayarı; çivi yok, iğne yok sayılır). */
export function ciftlikTarlasi(tohum) {
  return tarlaKurAyar(tohum, { yigin: CIFTLIK_YIGIN, igne: zorlukAl('normal').igne, civi: 0 });
}

const kesisir = (a, b) => a.x < b.x + b.en && b.x < a.x + a.en && a.y < b.y + b.boy
  && b.y < a.y + a.boy;

/** Garaj yasak dairesi (hücre) karo dikdörtgenine değiyor mu? */
function garajaDeger(yasak, r) {
  const dx = Math.max(r.x * KARO - yasak.x, 0, yasak.x - (r.x + r.en) * KARO);
  const dy = Math.max(r.y * KARO - yasak.y, 0, yasak.y - (r.y + r.boy) * KARO);
  return dx * dx + dy * dy <= yasak.r * yasak.r;
}

/** Kenar k (0 kuzey, 1 doğu, 2 güney, 3 batı; garaj.js) üstünde t oranında 2×2 kapı. */
function kapiYeri(k, t) {
  const yatay = k === 0 || k === 2;
  const boy = yatay ? KARO_EN : KARO_BOY;
  const u = Math.max(2, Math.min(boy - 4, Math.round(boy * t) - 1));
  if (k === 0) return { x: u, y: 1, yon: 1 };
  if (k === 2) return { x: u, y: KARO_BOY - 3, yon: 3 };
  if (k === 1) return { x: KARO_EN - 3, y: u, yon: 2 };
  return { x: 1, y: u, yon: 0 };
}

/** Karo (kx, ky)'den en yakın yığın eteği (h ≥ 12 hücresi) karo uzaklığının karesi. */
function etekUzakligi(tarla, kx, ky) {
  let en = Infinity;
  for (let y = 0; y < KARO_BOY; y++) {
    for (let x = 0; x < KARO_EN; x++) {
      if (tarla.h[(y * KARO) * GENISLIK + x * KARO] < 12) continue;
      const d = (x - kx) * (x - kx) + (y - ky) * (y - ky);
      if (d < en) en = d;
    }
  }
  return en;
}

/** Garajın karşı kenarında, yığın eteğine ≤ KAPI_ETEK karo olan ilk aday (yoksa en yakını). */
function kapiSec(tarla, garaj) {
  const k = (garaj.kenar + 2) & 3;
  let enIyi = null;
  for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
    const kapi = kapiYeri(k, t);
    const d = etekUzakligi(tarla, kapi.x + 1, kapi.y + 1);
    if (d <= KAPI_ETEK * KAPI_ETEK) return { ...kapi, en: 2, boy: 2 };
    if (!enIyi || d < enIyi.d) enIyi = { ...kapi, d };
  }
  const { d, ...kapi } = enIyi;
  return { ...kapi, en: 2, boy: 2 };
}

/** Garaja ve kapıya değmeyen köşe (tohumdan sırayla); çayır dikdörtgeni (karo). */
function cayirSec(tohum, yasak, kapi) {
  const ilk = karma(tohum, 10, 0) & 3;
  const kose = (i) => ({
    x: i === 0 || i === 3 ? 1 : KARO_EN - 1 - CAYIR.en,
    y: i < 2 ? 1 : KARO_BOY - 1 - CAYIR.boy, en: CAYIR.en, boy: CAYIR.boy, kose: i,
  });
  for (let k = 0; k < 4; k++) {
    const r = kose((ilk + k) & 3);
    if (!garajaDeger(yasak, r) && !kesisir(r, kapi)) return r;
  }
  return kose(ilk);
}

/** Döküm adayları: tohumdan 8 harman karosu (merkez), kenarlardan ve çayırdan uzak. */
function dokumAdaylari(tohum, cayir, kapi) {
  const liste = [];
  const pay = 8;
  for (let n = 0; liste.length < DOKUM_ADAY && n < 400; n++) {
    const x = pay + (karma(tohum, 11, n) % (KARO_EN - 2 * pay));
    const y = pay + (karma(tohum, 12, n) % (KARO_BOY - 2 * pay));
    const kutu = { x: x - 7, y: y - 7, en: 15, boy: 15 };
    if (kesisir(kutu, cayir) || kesisir(kutu, kapi)) continue;
    liste.push([x, y]);
  }
  return liste;
}

/**
 * Yeni çiftliğin arazisi: kapı (karoları düzlenir; parçayı kapi.js kapiKur kurar), çayır
 * (hücreleri CAYIR.kat'a ayarlanır: yığın sıfırlanır),
 * döküm adayları. tarla yerinde değişir (baslangicToplam yeniden). garaj: garajKur sonucu,
 * yasak: garaj park dairesi { x, y, r } (hücre).
 */
export function araziKur(tarla, garaj, yasak, tohum) {
  const a = bosArazi();
  a.kapi = kapiSec(tarla, garaj);
  kapiAlaniDuzle(tarla, a.kapi);
  a.cayir = cayirSec(tohum >>> 0, yasak, a.kapi);
  cayirIsaretle(a, a.cayir);
  for (let ky = a.cayir.y; ky < a.cayir.y + a.cayir.boy; ky++) {
    for (let kx = a.cayir.x; kx < a.cayir.x + a.cayir.en; kx++) {
      for (let y = ky * KARO; y < (ky + 1) * KARO; y++) {
        tarla.h.fill(CAYIR.kat, y * GENISLIK + kx * KARO, y * GENISLIK + (kx + 1) * KARO);
      }
    }
  }
  a.dokum = dokumAdaylari(tohum >>> 0, a.cayir, a.kapi);
  tarla.kirli = true;
  tarla.baslangicToplam = toplamSaman(tarla);
  a.baslangicStok = harmanStogu(a, tarla);
  return a;
}

function cayirIsaretle(a, r) {
  for (let ky = r.y; ky < r.y + r.boy; ky++) {
    for (let kx = r.x; kx < r.x + r.en; kx++) a.zemin[karoIndeks(kx, ky)] = ZEMIN.CAYIR;
  }
}

/** Arazi dünyaya bağlanır (yeni çiftlik). */
export function araziBagla(c, arazi) {
  c.arazi = arazi;
  dunyaHazirla(c);
}

/**
 * Çayır büyümesi (tik aşaması 55): her `adim` tikte (yağmurda 120, değilse 240) çayır
 * hücreleri +1 kat (CAYIR.kat tavanı); gübreli karoda adımın yarısında. Parça tabanı
 * büyümez. Eklenen kat c.cayirKat'a yazılır.
 */
export function cayirBuyut(c, tarla) {
  const a = c.arazi;
  if (!a?.cayir) return 0;
  const adim = havaAl(c).gok === GOK.YAGMUR ? CAYIR.yagmurBuyume : CAYIR.buyume;
  if (c.tik % (adim / 2) !== 0) return 0;
  const tam = c.tik % adim === 0;
  const { taban } = c.izgara;
  let eklenen = 0;
  for (let k = 0; k < KARO_SAYISI; k++) {
    if (a.zemin[k] !== ZEMIN.CAYIR || (!tam && a.gubre[k] <= c.tik)) continue;
    const x0 = (k % KARO_EN) * KARO;
    const y0 = ((k / KARO_EN) | 0) * KARO;
    for (let y = y0; y < y0 + KARO; y++) {
      for (let x = x0; x < x0 + KARO; x++) {
        const i = y * GENISLIK + x;
        if (taban[i] || tarla.h[i] >= CAYIR.kat) continue;
        tarla.h[i] += 1;
        eklenen += 1;
        kirliIsaretle(c, x, y);
      }
    }
  }
  c.cayirKat += eklenen;
  return eklenen;
}

asamaTanimla('cayir', 55, {
  adim(ctx) {
    cayirBuyut(ctx.c, ctx.tarla);
  },
  yenidenKur(c) {
    dunyaHazirla(c);
  },
});

/**
 * Çayır genişlet: çayıra köşeden uzağa +CAYIR.genislet karo sütunu (en çok genisletEnCok).
 * Bedel G'nin kuyusu (kurus.js kuyuOde: 400/800/1200, KUYU_TABAN); red 'cayir-yok',
 * 'en-cok', 'kurus', 'taban'.
 * Yeni karoların samanı yerinde kalır (korunum); yalnız zemin çayır olur ve büyür.
 */
komutTanimla('cayirGenislet', (c, tarla, k, olaylar) => {
  const a = dunyaHazirla(c);
  const red = (neden) => olaylar.push({ ad: 'komut-reddedildi', veri: { komut: k, neden } });
  if (!a.cayir) return red('cayir-yok');
  if (a.seviye >= CAYIR.genisletEnCok) return red('en-cok');
  const neden = kuyuOde(c, 'cayir', a.seviye, (ad, veri) => olaylar.push({ ad, veri }));
  if (neden) return red(neden);
  const solda = a.cayir.kose === 0 || a.cayir.kose === 3;
  const n = CAYIR.genislet;
  const yeni = { ...a.cayir, x: solda ? a.cayir.x + a.cayir.en : a.cayir.x - n, en: n };
  cayirIsaretle(a, yeni);
  a.cayir = { ...a.cayir, x: solda ? a.cayir.x : yeni.x, en: a.cayir.en + n };
  a.seviye += 1;
  olaylar.push({ ad: 'cayir-genisledi', veri: { seviye: a.seviye, cayir: { ...a.cayir } } });
  return undefined;
});

const SAYACLAR = KAYNAK_SAYACLARI; // eski kayıtta cikanKat yok: dunyaHazirla 0 kurar
kayitAlaniTanimla('arazi', {
  kodla(c) {
    dunyaHazirla(c);
    return { arazi: ozelKodla(c.arazi), sayac: SAYACLAR.map((ad) => c[ad]) };
  },
  coz(c, v) {
    if (v) {
      c.arazi = ozelCoz(v.arazi);
      SAYACLAR.forEach((ad, k) => { c[ad] = v.sayac[k] ?? 0; });
    }
    dunyaHazirla(c);
  },
});
