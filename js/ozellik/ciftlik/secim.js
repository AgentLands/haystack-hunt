/**
 * Çiftlikte seç / kopyala / yapıştır kipinin durumu ve eylemleri (kendi bağımsız kipi; inşa
 * paletinden ayrıdır). Girdi (fare, dokunma, klavye) secim-girdi.js'te, çizim secim-cizim.js,
 * düğmeler secim-arayuz.js'tedir.
 *   V ya da ▢ Seç: kip 'sec'; dikdörtgen sürükle → Kopyala, Sök, Şablon kaydet. Ctrl+C
 *   kopyalar (kopya anındaki yönlerle), Ctrl+V ya da Yapıştır: kip 'yapistir'; küme imleçte
 *   ortalanır, R/Shift+R döndürür, T aynalar, ✓ ya da Enter onaylar (kip açık kalır: seri
 *   yapıştırma), Esc çıkar. Yapıştırma tek 'yapistir' komutudur
 *   (kural/ciftlik/izgara/yapistir.js): tek engelli karo ya da kuruş eksiği varsa hiçbiri
 *   kurulmaz; sayaç "N karo engelli · M kuruş". Sök alandaki her şeyi tek 'sokAlan' komutuyla
 *   söker (içinde eşya varsa ikinci basış ister). Pipet ayarı: pipetAl / pipetAyari.
 * İnşa kipine tek bağ: insaBirak (palet kapanır, seçili parça bırakılır).
 */
import { durumAl } from '../../oyun.js';
import { bildir } from '../../arayuz.js';
import { gorunum } from '../../gorunum.js';
import { gorunurAlan } from '../../kural/gorunum.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { parcaIcerigi } from '../../kural/ciftlik/parca-kayit.js';
import {
  alanParcalari, kumeDondur, kumeAynala, kumeKonumla, ayarAl,
} from '../../kural/ciftlik/izgara/kume.js';
import { yerlesimDenetle } from '../../kural/ciftlik/izgara/denetim.js';
import '../../kural/ciftlik/izgara/yapistir.js';
import { insa, paletAc } from './insa.js';

/** Paylaşılan durum (çizim ve düğmeler okur). */
export const secim = {
  kip: null, // null | 'sec' | 'yapistir'
  alan: null, // { xa, ya, xb, yb } karo
  secilen: null, // { kume, ox, oy } (alan bırakılınca)
  pano: null, // kopyalanan küme
  kume: null, // yapıştırılacak (döndürülmüş / aynalanmış) küme
  hayalet: null, // { kx, ky }
  sonKaro: null, // son bilinen imleç karosu
  denetim: null,
  uyari: '',
  sokOnay: false,
};
let pipet = null; // { ayar }
const dinleyiciler = [];

export function secimDinle(islev) {
  dinleyiciler.push(islev);
}

export function degisti() {
  for (const islev of dinleyiciler) islev(secim);
}

export const ciftlikte = () => durumAl()?.mod === 'ciftlik';

/** İnşa kipine tek bağ: palet kapanır, seçili parça bırakılır (I1'in 'sec' kipinden değil). */
function insaBirak() {
  if (insa.acik && insa.kip !== 'sec') paletAc(false);
}

/** Görünür alanın ortası (karo). */
function ekranOrtasi() {
  const a = gorunurAlan(gorunum);
  return { kx: Math.floor((a.x + a.en / 2) / KARO), ky: Math.floor((a.y + a.boy / 2) / KARO) };
}

export function kipKapat() {
  Object.assign(secim, {
    kip: null, alan: null, secilen: null, kume: null, hayalet: null, denetim: null,
    uyari: '', sokOnay: false,
  });
  degisti();
}

/** Seç kipini açar ya da kapatır. */
export function secimKipi(ac = secim.kip !== 'sec') {
  if (!ac) return kipKapat();
  if (!ciftlikte()) return undefined;
  insaBirak();
  kipKapat();
  secim.kip = 'sec';
  degisti();
  return undefined;
}

/** Kümenin sol üst karosu: imleç kümenin ortasında. */
export function yerlesimKonumu() {
  const { kx, ky } = secim.hayalet;
  return { ox: kx - (secim.kume.en >> 1), oy: ky - (secim.kume.boy >> 1) };
}

/** Yapıştırma kipinde konum ve dönüşümden denetimi yeniler. */
export function denetimYenile() {
  const d = durumAl();
  if (secim.kip !== 'yapistir' || !secim.hayalet || !d || d.mod !== 'ciftlik') return;
  const { ox, oy } = yerlesimKonumu();
  secim.denetim = yerlesimDenetle(d.ciftlik, d.tarla, kumeKonumla(secim.kume, ox, oy));
  degisti();
}

/** Kümeyi yapıştırmaya başlar (pano ya da şablon). */
export function yapistirBaslat(kume) {
  if (!ciftlikte() || !kume) return;
  insaBirak();
  kipKapat();
  Object.assign(secim, { kip: 'yapistir', kume, hayalet: secim.sonKaro ?? ekranOrtasi() });
  denetimYenile();
}

export function kopyala() {
  if (!secim.secilen) return;
  secim.pano = secim.secilen.kume;
  const n = secim.pano.parcalar.length;
  kipKapat();
  bildir(`${n} parça kopyalandı: Ctrl+V ya da Yapıştır`);
}

/** Seçili alandaki her şeyi tek komutla söker (içinde eşya varsa ikinci basış ister). */
export function alaniSok() {
  const d = durumAl();
  const a = secim.alan;
  if (!d || !a || !secim.secilen) return;
  const parcalar = alanParcalari(d.ciftlik, a.xa, a.ya, a.xb, a.yb);
  const esyaVar = parcalar.some((p) => parcaIcerigi(p).esya.length > 0);
  if (esyaVar && !secim.sokOnay) {
    secim.sokOnay = true;
    secim.uyari = 'İçinde eşya olan depo var (eşyalar envantere döner): '
      + 'onay için Sök\'e tekrar bas';
    degisti();
    return;
  }
  komutEkle(d.ciftlik, { tur: 'sokAlan', xa: a.xa, ya: a.ya, xb: a.xb, yb: a.yb });
  bildir(`${parcalar.length} parça söküldü`);
  kipKapat();
}

export function yapistirDondur(adim = 1) {
  if (secim.kip !== 'yapistir') return;
  let k = secim.kume;
  for (let i = 0; i < ((adim % 4) + 4) % 4; i++) k = kumeDondur(k) ?? k;
  secim.kume = k;
  secim.uyari = '';
  denetimYenile();
}

export function yapistirAynala() {
  if (secim.kip !== 'yapistir') return;
  const a = kumeAynala(secim.kume);
  if (!a) {
    secim.uyari = 'Bu küme aynalanamaz';
    degisti();
    return;
  }
  secim.kume = a;
  secim.uyari = a.yaklasik.length
    ? `Dikkat: ${a.yaklasik.join(', ')} portları aynada kayar, bağlantıyı denetle` : '';
  denetimYenile();
}

/** ✓: hepsi ya hiç; geçerliyse komutu yollar (kip açık kalır). */
export function yapistirOnayla() {
  const d = durumAl();
  denetimYenile();
  if (secim.kip !== 'yapistir' || !secim.denetim || !d) return false;
  if (!secim.denetim.gecerli) {
    bildir('Yapıştırılamaz: kırmızı karoları ve kuruşu denetle');
    return false;
  }
  const { ox, oy } = yerlesimKonumu();
  komutEkle(d.ciftlik, { tur: 'yapistir', parcalar: kumeKonumla(secim.kume, ox, oy) });
  return true;
}

/** Pipet: parçanın ayarını hatırlar (null: unut). Türü inşa kipinin pipeti seçer. */
export function pipetAl(p) {
  pipet = p ? { ayar: ayarAl(p) } : null;
}

export const pipetAyari = () => pipet?.ayar ?? null;
