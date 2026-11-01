/**
 * Oyun durumu ve kare döngüsü: yeni tarla (zorlukla, garaj ve karakterle), araç seçimi,
 * kare adımı (kontrol okunur; karakter ya da bindiği makine; yığın kayması, iğne
 * görünürlüğü, güneş parıltısı), fare yolu (bas/surukle/birak, karakterin erişimiyle
 * sınırlı), pes etme ve bitiş. Araç eylemleri oyun-arac.js, karakter oyun-karakter.js,
 * makineler oyun-makine.js'te. DOM'a dokunmaz; dış dünyaya olay yayar (olaylar.js).
 */
import { tarlaKur, cokert } from './kural/tarla.js';
import { igneDerinligi } from './kural/igne.js';
import { pariltiTuru } from './kural/parilti.js';
import { EL_YARICAP, TIRMIK_YARICAP, MIKNATIS_MENZIL } from './kural/araclar.js';
import { zorlukAdi, zorlukAl, zorlukTohumu, VARSAYILAN_ZORLUK } from './kural/zorluk.js';
import { kaymaKos } from './kural/kayma.js';
import { karakterKur } from './kural/karakter.js';
import './kural/makineler/hepsi.js';
import { garajKur } from './kural/makineler/garaj.js';
import { makineEngeli } from './kural/makineler/surus.js';
import { kontrol } from './kontrol.js';
import {
  igneParlat, balyaParlat, civileriParlat, sonucHesapla, PARILTI_SURE,
} from './oyun-arac.js';
import { karakterKaresi, fareBas, fareSurukle } from './oyun-karakter.js';
import { binIn, makineKaresi, makineImleci } from './oyun-makine.js';
import { buluntulariKur, buluntuKaresi } from './oyun-buluntu.js';
import { yay } from './olaylar.js';

export { PARILTI_SURE };
export const YARICAP = {
  el: EL_YARICAP, tirmik: TIRMIK_YARICAP, dedektor: 1.5, miknatis: MIKNATIS_MENZIL,
};
/** Bir karede işlenen en uzun süre (sn): sekme dönüşünde karakter ışınlanmasın. */
const EN_UZUN_KARE = 0.05;

let durum = null;
let varsayilanZorluk = VARSAYILAN_ZORLUK;
let varsayilanRahat = false;

/** İlk oyunun (ve zorluk verilmeyen yeniOyun'ların) zorluğu; ör. URL'deki ?zorluk= için. */
export function varsayilanZorlukAyarla(zorluk) {
  varsayilanZorluk = zorlukAdi(zorluk);
}

/**
 * Rahat mod: sonraki oyunlar rahat açılır (süre/puan gösterilmez, çivi cezası 0). Puan
 * kuralı değişmez; gösterimi gizlemek arayüzün işidir. Yarış oyunları rahat açılmaz.
 */
export function rahatAyarla(rahat) {
  varsayilanRahat = Boolean(rahat);
}

export function rahatMi() {
  return varsayilanRahat;
}

export function durumAl() {
  return durum;
}

/**
 * Yeni tarlanın durumu (olay yaymaz). zorluk verilmezse önceki oyunun (yoksa varsayılanın)
 * zorluğu sürer (önceki durum `tarlaZorlugu` taşıyorsa o: çiftlik girişteki zorluğu saklar). secenek.rahat verilirse (ör. yarışta false) genel rahat ayarının yerine
 * geçer. Başka modlar (çiftlik) kendi durumlarını bunun üstüne kurar (mod alanı değişir);
 * secenek.tarlaKur(tohum, zorluk) verilirse tarla onunla kurulur (çiftlik arazisi).
 */
export function durumKur(etiket, zorluk, secenek = {}) {
  const arac = durum ? durum.arac : 'el';
  // Başka moddan (çiftlik) dönülürken o moda girmeden önceki tarla zorluğu sürer
  const onceki = durum ? durum.tarlaZorlugu ?? durum.zorluk : varsayilanZorluk;
  const ad = zorlukAdi(zorluk ?? onceki);
  const ayar = zorlukAl(ad);
  const tarla = (secenek.tarlaKur ?? tarlaKur)(zorlukTohumu(etiket, ad), ad);
  const { garaj, makineler } = garajKur(tarla, ad);
  const karakter = karakterKur(tarla, garaj, makineler.map(makineEngeli));
  return {
    mod: 'tarla', etiket, zorluk: ad, tarla, garaj, makineler, karakter,
    balyalar: tarla.balyalar, buluntular: buluntulariKur(tarla),
    arac, aracYaricap: YARICAP[arac], rahat: secenek.rahat ?? varsayilanRahat,
    basili: false, fare: null, imlec: null, son: null,
    oncekiKullan: false, elKilitli: false, tirmikSayac: 0, sonZaman: null,
    elBirikim: 0, elAktif: false, kaymaBirikim: 0,
    halkalar: [], dedektor: ayar.dedektor, dedektorHakki: ayar.dedektor,
    miknatis: ayar.miknatis, miknatisHakki: ayar.miknatis,
    pariltiAralik: ayar.pariltiAralik, pariltiDerinlik: ayar.pariltiDerinlik,
    baslangic: null, bitis: null, bitti: false, goster: false, gorundu: false,
    parilti: null, civiPariltilar: [], sonrakiParilti: Infinity, ceza: 0, sonuc: null,
  };
}

/** Yeni tarla (normal mod): durumKur + 'oyun-basladi'. Süren başka mod önce kapanır. */
export function yeniOyun(etiket, zorluk, secenek = {}) {
  baslat(durumKur(etiket, zorluk, secenek));
}

/**
 * Mod kaydı: ad → { kur(secenek) → durum (durum.mod === ad), adim(durum, dt, zaman,
 * igneAlindi) }. Normal mod ('tarla') kayıtlı değildir; bu dosyanın adim'ı onu sürer.
 */
const modlar = new Map();

export function modTanimla(ad, tanim) {
  if (ad === 'tarla' || modlar.has(ad)) throw new Error(`modTanimla: "${ad}" kullanılıyor`);
  modlar.set(ad, tanim);
}

/** Kayıtlı modu açar (ör. 'ciftlik'); oyun-basladi yayılır. */
export function modAc(ad, secenek = {}) {
  const tanim = modlar.get(ad);
  if (!tanim) throw new Error(`Bilinmeyen mod: ${ad}`);
  baslat(tanim.kur(secenek));
}

/** Durumu değiştirir: süren mod normal değilse önce 'mod-kapaniyor' (kayıt için). */
function baslat(yeni) {
  if (durum && durum.mod !== 'tarla') yay('mod-kapaniyor', { durum });
  durum = yeni;
  Object.assign(kontrol, { hedef: null, binIste: false });
  yay('oyun-basladi', { durum });
  yay('arac-secildi', { arac: durum.arac });
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

/**
 * Bir kare: kontrol, karakter ya da makine; normal modda yığın kayması, iğne görünürlüğü ve
 * parıltı. Başka modda karakter/makineden sonra modun adim'ı koşar (kayma ve bitiş onun).
 */
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
  let igneAlindi = false;
  if (imlec) {
    durum.imlec = imlec.nokta;
    durum.aracYaricap = imlec.yaricap;
  } else {
    durum.aracYaricap = YARICAP[durum.arac];
    igneAlindi = karakterKaresi(durum, dt, zaman);
  }
  if (durum.mod !== 'tarla') {
    modlar.get(durum.mod).adim(durum, dt, zaman, igneAlindi);
    yay('kare', { zaman, durum });
    return;
  }
  if (igneAlindi && !durum.bitti) kazan(zaman);
  durum.kaymaBirikim = kaymaKos(() => cokert(tarla), durum.kaymaBirikim, dt);
  if (!durum.bitti) {
    const derinlik = igneDerinligi(tarla);
    if (derinlik === 0 && !durum.gorundu) {
      durum.gorundu = true;
      yay('igne-gorundu', { x: tarla.igne.x, y: tarla.igne.y });
    }
    buluntuKaresi(durum, zaman);
    if (zaman >= durum.sonrakiParilti) {
      const tur = pariltiTuru(tarla, durum.pariltiDerinlik);
      if (tur === 'igne') igneParlat(durum, zaman);
      else if (tur === 'balya') balyaParlat(durum, zaman);
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
  if (durum.balyaParilti) durum.balyaParilti.bitis += ms;
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

let siradaki = null;

/** Sıradaki rastgele etiket; önceden bakılabilir (ön hazırlık tarlasını arkada kurar). */
export function siradakiEtiket() {
  if (siradaki === null) {
    const dizi = new Uint32Array(1);
    crypto.getRandomValues(dizi);
    siradaki = dizi[0].toString(36).slice(0, 6);
  }
  return siradaki;
}

export function rastgeleEtiket() {
  const etiket = siradakiEtiket();
  siradaki = null;
  return etiket;
}
