/**
 * Yakın görünüm tarla çizimi (DOM): yakınlaştırma YAKIN_BAS'ı geçince tarla, hücre başına
 * ALT×ALT alt piksellik dünya-sabit bir atlas tuvalinden çizilir. Atlas karolar hâlinde,
 * tembelce boyanır: yalnız görünür (ve süre kalırsa kenar payındaki) kirli karolar, kare
 * başına süre bütçesi içinde (görünürde hiç boyanmamış karo varken bütçe biraz büyür).
 * Uzak çizim altta kalır (atlas görünür alanı tam kaplayınca atlanır); YAKIN_BAS..YAKIN_TAM
 * arası geçiş karışımla yapılır, böylece sıçrama olmaz.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';
import { KANAL } from './tarla-boya.js';
import { samanDokusu, toprakDokusu } from './doku.js';
import { bolgeBoya } from './alt-piksel.js';
import { KARO, karoKaydi, gorunurKarolar, gecisAlfa, halkaHalka } from './karolar.js';
import { ekran } from './tuval-olcek.js';

/** Hücre başına alt piksel (atlas çözünürlüğü). */
export const ALT = 12;
export const YAKIN_BAS = 1.15;
export const YAKIN_TAM = 1.6;
const DOKU_BOYU = 256;
/** Kare başına karo boyama bütçesi (ms); en az bir görünür karo yine de boyanır. */
const BUTCE_MS = 1.6;
/** Görünür alanda hiç boyanmamış (altta kaba çizimin göründüğü) karo varken bütçe. */
const DOLUM_MS = 3.5;
/** Yeni tarla ya da yeni atlas: görünür alan dolana dek kare başına bütçe (donma olmasın). */
const ILK_DOLUM_MS = 8;
/** Bu kadar karedir kirli bekleyen karo, merkeze yakınlardan önce boyanır. */
const YASLI = 4;

/** Hücre kanalları (tarla-boya.js boya() doldurur). */
export const kanal = new Float32Array(GENISLIK * YUKSEKLIK * KANAL);
export const karolar = karoKaydi(GENISLIK, YUKSEKLIK);
/** Atlasta en az bir kez boyanmış karolar (yakinSifirla temizler). */
const boyandi = new Uint8Array(karolar.kx * karolar.ky);

let atlas = null;
let actx = null;
let karoResim = null;
let dokular = null;
/**
 * Atlas yeni kuruldu ya da tarla değişti: görünür alan dolana dek büyük bütçeyle, merkezden
 * dışa boyanır (boyanmamış karoların altında kaba çizim görünür).
 */
let ilkDolum = true;

/** Dokuların ölçüsü (T×T, hücre başına S alt piksel) ve tohumları. */
export const DOKU = { T: DOKU_BOYU, S: ALT, saman: 1, toprak: 2 };

/** Dokuları burada, eşzamanlı üretir (pahalı: ilk yakın karede ~150 ms). */
export function yerelDokular() {
  return {
    T: DOKU_BOYU,
    ...samanDokusu(DOKU_BOYU, ALT, DOKU.saman),
    toprak: toprakDokusu(DOKU_BOYU, ALT, DOKU.toprak),
  };
}

let dokuKaynagi = yerelDokular;

/**
 * Doku kaynağını değiştirir: islev() → yerelDokular biçiminde dokular ya da null (henüz
 * hazır değil; o karede kaba çizim kalır). ozellik/on-hazirlik.js işçide üretir.
 */
export function dokuKaynagiKur(islev) {
  dokuKaynagi = islev;
}

/** Atlası kurar; dokular henüz hazır değilse false. */
function hazirla() {
  if (atlas) return true;
  dokular ??= dokuKaynagi();
  if (!dokular) return false;
  atlas = document.createElement('canvas');
  atlas.width = GENISLIK * ALT;
  atlas.height = YUKSEKLIK * ALT;
  actx = atlas.getContext('2d');
  karoResim = actx.createImageData(KARO * ALT, KARO * ALT);
  return true;
}

function karoBoya(tx, ty) {
  bolgeBoya(kanal, GENISLIK, YUKSEKLIK, dokular, tx * KARO, ty * KARO, KARO, KARO, ALT,
    karoResim.data);
  actx.putImageData(karoResim, tx * KARO * ALT, ty * KARO * ALT);
  karolar.kirli[ty * karolar.kx + tx] = 0;
  boyandi[ty * karolar.kx + tx] = 1;
}

/** Aralıkta hiç boyanmamış karo var mı? */
function boslukVar(a) {
  for (let ty = a.ty0; ty <= a.ty1; ty++) {
    for (let tx = a.tx0; tx <= a.tx1; tx++) if (!boyandi[ty * karolar.kx + tx]) return true;
  }
  return false;
}

/**
 * Aralıktaki kirli karoları süre bitene dek boyar (bitis null: sınırsız); boyadığı sayıyı
 * döndürür. Önce YASLI kareden uzun bekleyenler, sonra kalanlar; ikisi de (mx, my)
 * karosundan dışa doğru. Böylece sürekli kazı merkezi kirletse de kenardakiler aç kalmaz.
 * enAzBir: süre dolsa da bir karo boya.
 */
function araligiBoya(a, mx, my, bitis, enAzBir) {
  const { kx, kirli, sayac } = karolar;
  let n = 0;
  for (const yasliMi of [true, false]) {
    let sure = true;
    halkaHalka(a, mx, my, (tx, ty) => {
      const k = kirli[ty * kx + tx];
      if (!k || (yasliMi && sayac - k < YASLI)) return true;
      if (bitis !== null && !(enAzBir && n === 0) && performance.now() > bitis) {
        sure = false;
        return false;
      }
      karoBoya(tx, ty);
      n++;
      return true;
    });
    if (!sure) break;
  }
  return n;
}

/** Yeni tarla: eski tarlanın atlası görünmesin; ilk yakın karede görünür alan tümden boyanır. */
export function yakinSifirla() {
  ilkDolum = true;
  boyandi.fill(0);
  if (actx) actx.clearRect(0, 0, atlas.width, atlas.height);
}

/**
 * Yakın görünümü çizer (dünya dönüşümü kurulu ctx'e). gorunum {z, gx, gy}; olcek hücre
 * başına dünya pikseli. tabanCiz() kaba (uzak) tarlayı çizer: uzakken, geçiş karışımında
 * ya da görünürde hiç boyanmamış karo varken atlasın altına çağrılır; atlas görünür alanı
 * tam kaplıyorsa atlanır (çift doldurma yok). Bu karede boyanan karo sayısını döndürür.
 */
export function yakinCiz(ctx, gorunum, olcek, tabanCiz) {
  const { z } = gorunum;
  if (z <= YAKIN_BAS || !hazirla()) {
    tabanCiz();
    return 0;
  }
  const alan = { x: gorunum.gx, y: gorunum.gy, en: GENISLIK / z, boy: YUKSEKLIK / z };
  const mx = Math.floor((alan.x + alan.en / 2) / KARO);
  const my = Math.floor((alan.y + alan.boy / 2) / KARO);
  const gorunur = gorunurKarolar(alan, 1, GENISLIK, YUKSEKLIK);
  const bosluk = boslukVar(gorunur);
  if (!bosluk) ilkDolum = false;
  const sure = bosluk ? (ilkDolum ? ILK_DOLUM_MS : DOLUM_MS) : BUTCE_MS;
  const bitis = performance.now() + sure;
  let n = araligiBoya(gorunur, mx, my, bitis, true);
  // Süre kalırsa iki karoluk kenar payını önceden boya (kamera kayınca hazır olsun).
  const pay = gorunurKarolar(alan, 2 * KARO, GENISLIK, YUKSEKLIK);
  n += araligiBoya(pay, mx, my, bitis, false);
  const alfa = gecisAlfa(z, YAKIN_BAS, YAKIN_TAM);
  if (alfa < 1 || boslukVar(gorunur)) tabanCiz();
  const { x0, y0, x1, y1 } = gorunur;
  ctx.save();
  ctx.globalAlpha = alfa;
  // Büyütürken en yakın komşu (piksel sanatı, ucuz); küçültürken yumuşatma (titreşmesin).
  ctx.imageSmoothingEnabled = (olcek * z * ekran.tabanX) / ALT < 1;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(atlas, x0 * ALT, y0 * ALT, (x1 - x0) * ALT, (y1 - y0) * ALT,
    x0 * olcek, y0 * olcek, (x1 - x0) * olcek, (y1 - y0) * olcek);
  ctx.restore();
  return n;
}
