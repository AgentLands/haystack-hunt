/**
 * Çevrimdışı ilerleme (ekonomi.md §7; saf). Benzetim son 5 dakikayı dakikalık kovalarda
 * ölçer (`c.ekonomi.pencere`): depolara giren eşya (c.sayaclar.depolanan, saniyede bir
 * toplanır; iğne/buluntu sayılmaz: çevrimdışı bulunmaz) ve kapının taban satış kuruşu.
 * Açılışta oyun geçen dakikayı verir: dk = min(480, geçen); kazanç = floor(hız × dk × %50),
 * depoların boş yeriyle kenetli, depolara boş yerleri oranında dağıtılır; kuruş da aynı
 * oranla. Değişmeyenler: tarla, gömülü, hatlar, siparişler (sipariş çevrimdışı dolmaz),
 * yakıt, damga, tik. Saman korunumu: eklenen eşyaların samanı `c.cevrimdisiKat`a yazılır
 * (ayrı kaynak; harman arabası tetiği `c.tuketilenKat` bundan etkilenmez).
 * Depo arayüzü: parça tanımında `depo: { bos(p) → n, ekle(p, kod, n) }`.
 */
import { esyaSamani } from '../esya.js';
import { CEVRIMDISI } from './denge.js';
import { ekonomiAl, bulunurSinif, kurusEkle } from './kurus.js';
import { ilerlemeAl } from './damga.js';

const { dkTik, pencereDk } = CEVRIMDISI;

/** Parçanın depo arayüzü (sandık, ambar: parcalar/temel.js sayacDeposu) ya da null. */
const depoArayuzu = (p) => p.tanim.depo ?? null;

/** Şimdiki dakikanın kovası; dakika değiştiyse aradaki kovalar boşaltılır. */
function kova(c) {
  const p = ekonomiAl(c).pencere;
  const dk = Math.floor(c.tik / dkTik);
  for (let m = Math.max(p.dk + 1, dk - pencereDk + 1); m <= dk; m++) {
    p.kova[m % pencereDk] = { d: {}, s: 0 };
  }
  p.dk = Math.max(p.dk, dk);
  return p.kova[dk % pencereDk];
}

/** Saniyede bir (ozet sıfırlamadan önce): bu saniyede depolananları kovaya ekler. */
export function pencereEkle(c) {
  const s = c.sayaclar.depolanan;
  const k = kova(c);
  if (!s) return;
  s.forEach((n, kod) => {
    if (n && !bulunurSinif(kod)) k.d[kod] = (k.d[kod] ?? 0) + n;
  });
}

/** Kapının taban satışı (kuruş) kovaya yazılır. */
export function satisKaydet(c, kurus) {
  kova(c).s += kurus;
}

/** Pencerenin kapsadığı tik (benzetim başında 5 dakikadan kısa). */
function kapsam(c) {
  const dk = Math.floor(c.tik / dkTik);
  return c.tik - Math.max(0, (dk - pencereDk + 1) * dkTik);
}

/**
 * Hesap (dünyayı değiştirmez): { dk, esya: [[kod, n]], kurus, doldu, istenen }. gecenDk
 * oyunun ölçtüğü gerçek süredir; ayar kapalıysa ya da ölçüm yoksa her şey 0.
 */
export function cevrimdisiHesapla(c, gecenDk) {
  const bos = { dk: 0, esya: [], kurus: 0, doldu: false, istenen: [] };
  if (!ilerlemeAl(c).ayarlar.cevrimdisi) return bos;
  const dk = Math.max(0, Math.min(CEVRIMDISI.tavanDk, Math.floor(gecenDk)));
  const k = kapsam(c);
  if (!dk || k <= 0) return { ...bos, dk };
  const p = ekonomiAl(c).pencere;
  const oran = (n) => Math.floor((n * dk * dkTik * CEVRIMDISI.yuzde) / (k * 100));
  const toplam = {};
  let satis = 0;
  for (const kv of p.kova) {
    satis += kv.s;
    for (const [kod, n] of Object.entries(kv.d)) toplam[kod] = (toplam[kod] ?? 0) + n;
  }
  const istenen = Object.keys(toplam).map(Number).sort((a, b) => a - b)
    .map((kod) => [kod, oran(toplam[kod])]).filter(([, n]) => n > 0);
  const yer = depolar(c).reduce((s, d) => s + d.bos, 0);
  const iste = istenen.reduce((s, [, n]) => s + n, 0);
  const esya = iste <= yer ? istenen
    : istenen.map(([kod, n]) => [kod, Math.floor((n * yer) / iste)]).filter(([, n]) => n > 0);
  return { dk, esya, kurus: oran(satis), doldu: iste > yer, istenen };
}

/** Depo parçaları (id sırası) ve boş yerleri. */
function depolar(c) {
  const liste = [];
  for (const p of c.parcalar.values()) {
    const a = depoArayuzu(p);
    if (a) liste.push({ p, a, bos: a.bos(p) });
  }
  return liste;
}

/** n eşyayı depolara boş yerleri oranında dağıtır (artan, sırayla yeri olana). */
function dagit(liste, kod, n) {
  const yer = liste.reduce((s, d) => s + d.bos, 0);
  if (!yer) return;
  const pay = liste.map((d) => Math.floor((n * d.bos) / yer));
  let kalan = n - pay.reduce((s, x) => s + x, 0);
  for (let i = 0; kalan > 0 && i < liste.length; i++) {
    if (liste[i].bos > pay[i]) {
      pay[i] += 1;
      kalan -= 1;
    }
  }
  liste.forEach((d, i) => {
    if (!pay[i]) return;
    d.a.ekle(d.p, kod, pay[i]);
    d.bos -= pay[i];
  });
}

/** Hesabı uygular: eşya depolara, kuruş kasaya, samanı c.cevrimdisiKat'a. Hesabı döndürür. */
export function cevrimdisiUygula(c, hesap) {
  const liste = depolar(c);
  let kat = 0;
  for (const [kod, n] of hesap.esya) {
    dagit(liste, kod, n);
    kat += esyaSamani(kod) * n;
  }
  if (hesap.kurus) kurusEkle(c, hesap.kurus);
  c.cevrimdisiKat = (c.cevrimdisiKat ?? 0) + kat;
  return hesap;
}

/** Hesapla + uygula (açılışta tek çağrı); fiş verisi döner. */
export function cevrimdisiIlerle(c, gecenDk) {
  return cevrimdisiUygula(c, cevrimdisiHesapla(c, gecenDk));
}
