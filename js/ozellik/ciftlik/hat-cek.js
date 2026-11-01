/**
 * Hat çekme (kur kipinde hat parçası seçiliyken; yerlestir.js çağırır). Basılı sürükleme
 * imleci 4 yönlü karo iziyle izler (kural/ciftlik/insa/hat-yolu.js: köşe histerezisi, geri
 * izlemede kuyruk silinir); var olan aynı tür bant yeniden yönlenir, ilk engelde yol durur
 * ve bırakınca geçerli önek kurulur (bir sürükleme = bir geri alma adımı). Uç bir parçanın
 * giriş kapısına varırsa bağlanır (rozet "→ bağlanır"). Dik kesişmede menfez önerisi
 * kancası (menfezOnerisiKur; taşıma işi bağlar) bir öneri dönerse onay baloncuğu çıkar.
 * Dokunmatik: ≥ 8 px ve ≥ 120 ms sürükleme sayılır; kısa dokunuş iki dokunuşlu yedektir
 * (WCAG 2.5.7): başlangıç karosu, bitiş karosu → L yolu önizlenir, ↻ köşe sırasını çevirir,
 * ✓ kurar. Parmak tuvalden çıkarak bırakılırsa (palete) iptal. Kenara yaklaşınca kamera kayar.
 */
import { durumAl } from '../../oyun.js';
import { parcaTanimi } from '../../kural/ciftlik/parca-kayit.js';
import {
  izKur, izIlerle, yonlariAta, lYolu, yolDenetle, yolCiftleri,
} from '../../kural/ciftlik/insa/hat-yolu.js';
import { NEDEN_METNI } from '../../kural/ciftlik/insa/yerlesim.js';
import { insa, degisti, insaEylem, kaynakSecenek, karoBul } from './insa.js';
import { kenarIzle, kenarBirak } from './insa-kamera.js';

/** Dokunmatik sürükleme eşikleri (docs/ciftlik/arayuz.md §4). */
export const SURUKLE_PX = 8;
export const SURUKLE_MS = 120;

const tuval = document.getElementById('tarla');
let menfezOnerisi = null;

/**
 * Kesişme önerisi kancası: islev({ c, tarla, anahtar, yol, denetim }) → { metin, ciftler }
 * ya da null (denetim.kesisme: kesişen karonun indeksi). Yoksa kesişme engeldir.
 */
export function menfezOnerisiKur(islev) {
  menfezOnerisi = islev;
}

/** Yolu denetler; önizleme (insa.yol) ve rozet (insa.etiket) güncellenir. */
function goster(yol) {
  const d = durumAl();
  const tanim = parcaTanimi(insa.secili);
  const secenek = kaynakSecenek(tanim, d);
  const denetim = yolDenetle(d.ciftlik, d.tarla, insa.secili, yol, secenek);
  insa.yol = denetim.karolar.filter((k) => k.durum !== 'atla');
  insa.yolDenetim = denetim;
  const son = insa.yol[insa.yol.length - 1] ?? yol[yol.length - 1];
  const engel = denetim.karolar.find((k) => k.neden);
  const fiyat = secenek.fiyat !== null && denetim.yeni ? ` · ${denetim.maliyet} kuruş` : '';
  let metin = `×${denetim.yeni}${fiyat}`;
  if (denetim.bag) metin += ' → bağlanır';
  else if (engel) {
    metin += ` · ${engel.neden === 'kilitli' ? secenek.kilit : NEDEN_METNI[engel.neden]}`;
  }
  insa.etiket = { metin, tur: engel && !denetim.bag ? 'uyari' : 'bilgi', kx: son.kx, ky: son.ky };
  degisti();
  return denetim;
}

/** Denetlenmiş yolu tek adım olarak kurar. */
function kur(denetim, ek = []) {
  const ciftler = [...yolCiftleri(durumAl().ciftlik, insa.secili, denetim), ...ek];
  const ad = parcaTanimi(insa.secili).ad;
  const ozet = denetim.yeni ? `${denetim.yeni} ${ad.toLocaleLowerCase('tr')}`
    : `${denetim.don} yön`;
  insaEylem(ozet, ciftler);
  const son = denetim.karolar.filter((k) => k.durum !== 'atla' && k.durum !== 'engel'
    && k.durum !== 'kesisme').at(-1);
  if (son && denetim.karolar.length > 1) insa.yon = son.yon;
}

function temizle() {
  Object.assign(insa, { yol: null, yolDenetim: null, etiket: null, basili: null,
    bekleyen: null });
  kenarBirak();
  degisti();
}

/** Bırakınca: kesişme önerisi varsa onaya, yoksa önek kurulur. */
function birakKur(denetim, yol) {
  const d = durumAl();
  const oneri = denetim.kesisme >= 0 && menfezOnerisi
    ? menfezOnerisi({ c: d.ciftlik, tarla: d.tarla, anahtar: insa.secili, yol, denetim }) : null;
  if (!oneri) {
    kur(denetim);
    temizle();
    return;
  }
  const k = denetim.karolar[denetim.kesisme];
  insa.basili = null;
  kenarBirak();
  insa.bekleyen = { kx: k.kx, ky: k.ky, metin: oneri.metin, onay: () => {
    kur(denetim, oneri.ciftler);
    temizle();
  } };
  degisti();
}

function izYolu(b) {
  return yonlariAta(b.iz.karolar, insa.yon);
}

export function hatBas(e, karo) {
  const dokunus = e.pointerType === 'touch';
  insa.basili = { id: e.pointerId, dokunus, x: e.clientX, y: e.clientY,
    zaman: performance.now(), iz: izKur(karo.kx, karo.ky), surukledi: false };
  insa.hayalet = { kx: karo.kx, ky: karo.ky };
  if (!dokunus) goster(izYolu(insa.basili));
  tuval.setPointerCapture?.(e.pointerId);
  return true;
}

function ilerle(e) {
  const b = insa.basili;
  const karo = karoBul(e);
  b.cx = e.clientX;
  b.cy = e.clientY;
  izIlerle(b.iz, karo.fx, karo.fy);
  insa.hayalet = { kx: karo.kx, ky: karo.ky };
  goster(izYolu(b));
}

export function hatTasi(e) {
  const b = insa.basili;
  if (!b || b.id !== e.pointerId) return false;
  if (!b.surukledi) {
    const uzak = Math.hypot(e.clientX - b.x, e.clientY - b.y) >= (b.dokunus ? SURUKLE_PX : 4);
    if (!uzak || (b.dokunus && performance.now() - b.zaman < SURUKLE_MS)) return true;
    b.surukledi = true;
    insa.bekleyen = null;
  }
  ilerle(e);
  kenarIzle(e, (sanal) => insa.basili === b && ilerle(sanal));
  return true;
}

/** İki dokunuşlu yedek: önce başlangıç, sonra bitiş karosu; ✓ kurar, ↻ köşeyi çevirir. */
function ikiDokunus(karo) {
  const onceki = insa.bekleyen;
  if (onceki?.tur === 'hat' && onceki.bitis === null) {
    const b = onceki;
    b.bitis = { kx: karo.kx, ky: karo.ky };
    b.yol = () => lYolu(b.bas, b.bitis, b.eksen, insa.yon);
    b.ciz = () => {
      b.denetim = goster(b.yol());
      Object.assign(b, { kx: b.bitis.kx, ky: b.bitis.ky, metin: insa.etiket.metin,
        gecersiz: !b.denetim.yeni && !b.denetim.don });
      insa.etiket = null;
    };
    b.dondur = () => {
      b.eksen = b.eksen === 'x' ? 'y' : 'x';
      b.ciz();
    };
    b.onay = () => birakKur(b.denetim, b.yol());
    b.ciz();
    return;
  }
  const b = { tur: 'hat', kx: karo.kx, ky: karo.ky, bas: { kx: karo.kx, ky: karo.ky },
    bitis: null, eksen: 'x', metin: 'Bitişe dokun', dondur: null };
  b.yol = () => yonlariAta([b.bas], insa.yon);
  b.ciz = () => {
    b.denetim = goster(b.yol());
    insa.etiket = null;
  };
  b.onay = () => birakKur(b.denetim, b.yol());
  insa.hayalet = b.bas;
  insa.bekleyen = b;
  b.ciz();
}

export function hatBitir(e, karo) {
  const b = insa.basili;
  if (!b || b.id !== e.pointerId) return false;
  const r = tuval.getBoundingClientRect();
  const disarida = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top
    || e.clientY > r.bottom;
  if (e.type === 'pointercancel' || (b.surukledi && disarida)) {
    temizle();
    return true;
  }
  if (b.surukledi || !b.dokunus) {
    if (!b.surukledi) ilerle(e);
    birakKur(insa.yolDenetim, izYolu(b));
    return true;
  }
  insa.basili = null;
  ikiDokunus(karo);
  degisti();
  return true;
}

/** Yön değişince (R, ⟳) süren önizleme yenilenir. */
export function hatDondu() {
  const b = insa.basili;
  if (b) goster(izYolu(b));
  else if (insa.bekleyen?.tur === 'hat') insa.bekleyen.ciz();
}

export function hatIptal() {
  insa.yolDenetim = null;
  insa.etiket = null;
  kenarBirak();
}
