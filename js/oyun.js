/**
 * Oyun durumu ve kare döngüsü: yeni tarla (zorlukla, garaj ve karakterle), araç seçimi,
 * kare adımı (kontrol okunur; karakter ya da bindiği makine; yığın kayması, iğne
 * görünürlüğü, güneş parıltısı), fare yolu (bas/surukle/birak, karakterin erişimiyle
 * sınırlı), pes etme ve bitiş. Araç eylemleri oyun-arac.js, karakter oyun-karakter.js,
 * makineler oyun-makine.js'te. DOM'a dokunmaz; dış dünyaya olay yayar (olaylar.js).
 */
import { tarlaKur, cokert } from './kural/tarla.js';
import { igneDerinligi } from './kural/igne.js';
import { EL_YARICAP, TIRMIK_YARICAP, MIKNATIS_MENZIL } from './kural/araclar.js';
import { zorlukAdi, zorlukAl, zorlukTohumu, VARSAYILAN_ZORLUK } from './kural/zorluk.js';
import { karakterKur } from './kural/karakter.js';
import './kural/makineler/hepsi.js';
import { garajKur } from './kural/makineler/garaj.js';
import { makineEngeli } from './kural/makineler/surus.js';
import { kontrol } from './kontrol.js';
import {
  igneParlat, civileriParlat, sonucHesapla, PARILTI_SURE,
} from './oyun-arac.js';
import { karakterKaresi, fareBas, fareSurukle } from './oyun-karakter.js';
import { binIn, makineKaresi, makineImleci } from './oyun-makine.js';
import { yay } from './olaylar.js';

/** Normal zorluğun parıltı değerleri; oyundaki geçerli değerler durum.parilti* alanlarında. */
export const PARILTI_ARALIK = 12000;
export { PARILTI_SURE };
export const PARILTI_DERINLIK = 8;
export const YARICAP = {
  el: EL_YARICAP, tirmik: TIRMIK_YARICAP, dedektor: 1.5, miknatis: MIKNATIS_MENZIL,
};
/** Bir karede işlenen en uzun süre (sn): sekme dönüşünde karakter ışınlanmasın. */
const EN_UZUN_KARE = 0.05;

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
  const tarla = tarlaKur(zorlukTohumu(etiket, ad), ad);
  const { garaj, makineler } = garajKur(tarla, ad);
  const karakter = karakterKur(tarla, garaj, makineler.map(makineEngeli));
  durum = {
    etiket, zorluk: ad, tarla, garaj, makineler, karakter,
    arac, aracYaricap: YARICAP[arac],
    basili: false, fare: null, imlec: null, son: null,
    oncekiKullan: false, tirmikSayac: 0, sonZaman: null,
    halkalar: [], dedektor: ayar.dedektor, dedektorHakki: ayar.dedektor,
    miknatis: ayar.miknatis, miknatisHakki: ayar.miknatis,
    pariltiAralik: ayar.pariltiAralik, pariltiDerinlik: ayar.pariltiDerinlik,
    baslangic: null, bitis: null, bitti: false, goster: false, gorundu: false,
    parilti: null, civiPariltilar: [], sonrakiParilti: Infinity, ceza: 0, sonuc: null,
  };
  Object.assign(kontrol, { hedef: null, binIste: false });
  yay('oyun-basladi', { durum });
  yay('arac-secildi', { arac });
}

export function aracSec(arac) {
  if (!YARICAP[arac] || durum.bitti) return;
  durum.arac = arac;
  durum.aracYaricap = YARICAP[arac];
  yay('arac-secildi', { arac });
}

/**
 * İşaretçi basıldı (p: hücre). Karakterin erişimindeyse araç orada kullanılır ve true
 * döner; değilse false (girdi.js karakteri oraya yürütür: kontrol.hedef).
 */
export function bas(p, zaman) {
  return fareBas(durum, p, zaman);
}

/** İşaretçi hareket etti; basılıysa araç noktası (erişimde kalarak) izler, tırmık iter. */
export function surukle(p) {
  fareSurukle(durum, p);
}

export function birak() {
  durum.basili = false;
  durum.fare = null;
}

/** Geriye uyum: imleç artık karakterin araç noktasıdır; fare çıkınca bir şey olmaz. */
export function imlecCikti() {}

export function pesEt(zaman) {
  if (durum.bitti) return;
  Object.assign(durum, { goster: true, bitti: true, basili: false, fare: null });
  durum.bitis = durum.baslangic === null ? null : zaman;
  yay('pes-edildi', { durum });
}

/** Bir kare: kontrol, karakter ya da makine, yığın kayması, iğne görünürlüğü ve parıltı. */
export function adim(zaman) {
  const { tarla } = durum;
  const dt = durum.sonZaman === null ? 0
    : Math.min(EN_UZUN_KARE, Math.max(0, (zaman - durum.sonZaman) / 1000));
  durum.sonZaman = zaman;
  if (kontrol.binIste) {
    kontrol.binIste = false;
    binIn(durum, zaman);
  }
  makineKaresi(durum, dt, zaman);
  const imlec = makineImleci(durum);
  if (imlec) {
    durum.imlec = imlec.nokta;
    durum.aracYaricap = imlec.yaricap;
  } else {
    durum.aracYaricap = YARICAP[durum.arac];
    if (karakterKaresi(durum, dt, zaman) && !durum.bitti) kazan(zaman);
  }
  if (cokert(tarla)) cokert(tarla);
  if (!durum.bitti) {
    const derinlik = igneDerinligi(tarla);
    if (derinlik === 0 && !durum.gorundu) {
      durum.gorundu = true;
      yay('igne-gorundu', { x: tarla.igne.x, y: tarla.igne.y });
    }
    if (zaman >= durum.sonrakiParilti) {
      if (derinlik <= durum.pariltiDerinlik) igneParlat(durum, zaman);
      civileriParlat(durum, zaman);
      durum.sonrakiParilti = zaman + durum.pariltiAralik;
    }
  }
  yay('kare', { zaman, durum });
}

/**
 * Oyun saatini ms kadar geri iter (sekme gizliyken geçen süre sayılmasın diye).
 * Süre, parıltı zamanlaması ve dedektör halkaları aynı kadar kayar.
 */
export function zamaniKaydir(ms) {
  if (!durum || durum.baslangic === null || durum.bitti || !(ms > 0)) return;
  durum.baslangic += ms;
  durum.sonrakiParilti += ms;
  if (durum.parilti) durum.parilti.bitis += ms;
  for (const halka of durum.halkalar) halka.zaman += ms;
  for (const c of durum.civiPariltilar || []) c.bitis += ms;
}

/** Bitiş özeti. sureMs paslı çivi cezalarını içerir (ceza ayrıca cezaMs'te). */
export function sonucOlustur(zaman) {
  return sonucHesapla(durum, zaman);
}

function kazan(zaman) {
  Object.assign(durum, { bitti: true, basili: false, fare: null, bitis: zaman });
  durum.sonuc = sonucOlustur(zaman);
  yay('bulundu', { sonuc: durum.sonuc });
}

export function rastgeleEtiket() {
  const dizi = new Uint32Array(1);
  crypto.getRandomValues(dizi);
  return dizi[0].toString(36).slice(0, 6);
}
