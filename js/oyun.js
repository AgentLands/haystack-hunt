/**
 * Oyun durumu ve eylemleri: yeni tarla (zorlukla), araç seçimi, kazma/tırmık/dedektör/
 * mıknatıs, paslı çivi cezası, kare adımı, güneş parıltısı, bitiş ve puan.
 * DOM'a dokunmaz; dış dünyaya olay yayar (olaylar.js).
 */
import { tarlaKur, cokert } from './kural/tarla.js';
import { igneDerinligi } from './kural/igne.js';
import {
  elIleAl, tirmikla, dedektorOku, igneyiAlabilirMi, miknatisCek,
  EL_YARICAP, TIRMIK_YARICAP, MIKNATIS_MENZIL,
} from './kural/araclar.js';
import { alinabilirCivi, civiAl, parlayanCiviler } from './kural/civi.js';
import {
  zorlukAdi, zorlukAl, zorlukTohumu, puanHesapla, VARSAYILAN_ZORLUK,
} from './kural/zorluk.js';
import { yay } from './olaylar.js';

/** Normal zorluğun parıltı değerleri; oyundaki geçerli değerler durum.parilti* alanlarında. */
export const PARILTI_ARALIK = 12000;
export const PARILTI_SURE = 800;
export const PARILTI_DERINLIK = 8;
export const YARICAP = {
  el: EL_YARICAP, tirmik: TIRMIK_YARICAP, dedektor: 1.5, miknatis: MIKNATIS_MENZIL,
};

let durum = null;
let varsayilanZorluk = VARSAYILAN_ZORLUK;

/** İlk oyunun (ve zorluk verilmeyen yeniOyun'ların) zorluğu; ör. URL'deki ?zorluk= için. */
export function varsayilanZorlukAyarla(zorluk) {
  varsayilanZorluk = zorlukAdi(zorluk);
}

export function durumAl() {
  return durum;
}

/** Yeni tarla. zorluk verilmezse önceki oyunun (yoksa varsayılanın) zorluğu sürer. */
export function yeniOyun(etiket, zorluk) {
  const arac = durum ? durum.arac : 'el';
  const ad = zorlukAdi(zorluk ?? (durum ? durum.zorluk : varsayilanZorluk));
  const ayar = zorlukAl(ad);
  durum = {
    etiket, zorluk: ad,
    tarla: tarlaKur(zorlukTohumu(etiket, ad), ad),
    arac, aracYaricap: YARICAP[arac],
    basili: false, imlec: null, son: null,
    halkalar: [], dedektor: ayar.dedektor, dedektorHakki: ayar.dedektor,
    miknatis: ayar.miknatis, miknatisHakki: ayar.miknatis,
    pariltiAralik: ayar.pariltiAralik, pariltiDerinlik: ayar.pariltiDerinlik,
    baslangic: null, bitis: null, bitti: false, goster: false, gorundu: false,
    parilti: null, civiPariltilar: [], sonrakiParilti: Infinity, ceza: 0, sonuc: null,
  };
  yay('oyun-basladi', { durum });
  yay('arac-secildi', { arac });
}

export function aracSec(arac) {
  if (!YARICAP[arac] || durum.bitti) return;
  durum.arac = arac;
  durum.aracYaricap = YARICAP[arac];
  yay('arac-secildi', { arac });
}

function baslat(zaman) {
  if (durum.baslangic !== null) return;
  durum.baslangic = zaman;
  durum.sonrakiParilti = zaman + durum.pariltiAralik;
  yay('ilk-hamle', { zaman });
}

/** İşaretçi basıldı (p: hücre koordinatı). */
export function bas(p, zaman) {
  if (durum.bitti) return;
  Object.assign(durum, { basili: true, imlec: p, son: p });
  baslat(zaman);
  if (durum.arac === 'miknatis') {
    miknatisKullan(p, zaman);
    return;
  }
  if (durum.arac !== 'dedektor') return;
  if (durum.dedektor <= 0) {
    yay('dedektor-bos', { x: p.x, y: p.y });
    return;
  }
  durum.dedektor -= 1;
  const seviye = dedektorOku(durum.tarla, p.x, p.y);
  durum.halkalar.push({ ...p, seviye, zaman });
  yay('dedektor', { x: p.x, y: p.y, seviye, kalan: durum.dedektor });
}

function miknatisKullan(p, zaman) {
  if (durum.miknatis <= 0) {
    yay('miknatis-bos', { x: p.x, y: p.y });
    return;
  }
  durum.miknatis -= 1;
  const cekti = miknatisCek(durum.tarla, p.x, p.y);
  yay('miknatis', { x: p.x, y: p.y, cekti, kalan: durum.miknatis });
  if (cekti) igneParlat(zaman);
}

function igneParlat(zaman) {
  durum.parilti = { bitis: zaman + PARILTI_SURE, sure: PARILTI_SURE };
  durum.sonrakiParilti = zaman + durum.pariltiAralik;
  yay('parilti', { x: durum.tarla.igne.x, y: durum.tarla.igne.y });
}

/** İşaretçi hareket etti; tırmık basılıysa iter. */
export function surukle(p) {
  durum.imlec = p;
  if (!durum.basili || durum.bitti || durum.arac !== 'tirmik') return;
  const dx = p.x - durum.son.x;
  const dy = p.y - durum.son.y;
  if (Math.hypot(dx, dy) < 1.5) return;
  const disari = tirmikla(durum.tarla, p.x, p.y, dx, dy);
  durum.son = p;
  yay('tirmiklandi', { x: p.x, y: p.y, dx, dy, disari });
}

export function birak() {
  durum.basili = false;
}

export function imlecCikti() {
  if (!durum.basili) durum.imlec = null;
}

export function pesEt(zaman) {
  if (durum.bitti) return;
  Object.assign(durum, { goster: true, bitti: true, basili: false });
  durum.bitis = durum.baslangic === null ? null : zaman;
  yay('pes-edildi', { durum });
}

/** Bir kare: el kazısı, yığın kayması, iğne görünürlüğü ve parıltı. */
export function adim(zaman) {
  const { tarla } = durum;
  if (durum.basili && !durum.bitti && durum.arac === 'el' && durum.imlec) {
    const { x, y } = durum.imlec;
    if (igneyiAlabilirMi(tarla, x, y)) {
      kazan(zaman);
    } else {
      civiyiAl(tarla, x, y);
      const miktar = elIleAl(tarla, x, y);
      if (miktar > 0) yay('kazildi', { x, y, miktar });
    }
  }
  if (cokert(tarla)) cokert(tarla);
  if (!durum.bitti) {
    const derinlik = igneDerinligi(tarla);
    if (derinlik === 0 && !durum.gorundu) {
      durum.gorundu = true;
      yay('igne-gorundu', { x: tarla.igne.x, y: tarla.igne.y });
    }
    if (zaman >= durum.sonrakiParilti) {
      if (derinlik <= durum.pariltiDerinlik) igneParlat(zaman);
      civileriParlat(zaman);
      durum.sonrakiParilti = zaman + durum.pariltiAralik;
    }
  }
  yay('kare', { zaman, durum });
}

/** Elin altında açıkta bir paslı çivi varsa alınır: süre cezası başlangıcı geri iter. */
function civiyiAl(tarla, x, y) {
  const civi = alinabilirCivi(tarla, x, y);
  if (!civi) return;
  const ceza = civiAl(civi);
  durum.ceza += ceza;
  durum.baslangic -= ceza;
  yay('civi-alindi', { x: civi.x, y: civi.y, ceza });
}

function civileriParlat(zaman) {
  durum.civiPariltilar = parlayanCiviler(durum.tarla, durum.pariltiDerinlik).map((c) => ({
    x: c.x, y: c.y, bitis: zaman + PARILTI_SURE, sure: PARILTI_SURE,
  }));
  for (const c of durum.civiPariltilar) yay('civi-parladi', { x: c.x, y: c.y });
}

/** Bitiş özeti. sureMs paslı çivi cezalarını içerir (ceza ayrıca cezaMs'te). */
export function sonucOlustur(zaman) {
  const sonuc = {
    etiket: durum.etiket,
    zorluk: durum.zorluk,
    sureMs: zaman - durum.baslangic,
    cezaMs: durum.ceza,
    kaldirilan: durum.tarla.kaldirilan,
    dedektorKullanilan: durum.dedektorHakki - durum.dedektor,
    dedektorHakki: durum.dedektorHakki,
    miknatisKullanilan: durum.miknatisHakki - durum.miknatis,
    miknatisHakki: durum.miknatisHakki,
    okumalar: durum.halkalar.map((h) => h.seviye.ad),
  };
  const kullanilanHak = sonuc.dedektorKullanilan + sonuc.miknatisKullanilan;
  sonuc.puan = puanHesapla({ ...sonuc, kullanilanHak }, durum.zorluk);
  return sonuc;
}

function kazan(zaman) {
  Object.assign(durum, { bitti: true, basili: false, bitis: zaman });
  durum.sonuc = sonucOlustur(zaman);
  yay('bulundu', { sonuc: durum.sonuc });
}

export function rastgeleEtiket() {
  const dizi = new Uint32Array(1);
  crypto.getRandomValues(dizi);
  return dizi[0].toString(36).slice(0, 6);
}
