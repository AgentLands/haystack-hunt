/**
 * Oyun eylemleri (araç kullanımı): el kazısı (çivi ve iğne alma dahil), tırmık itişi,
 * dedektör, mıknatıs, güneş parıltısı, süre başlatma ve bitiş özeti. Noktalar HÜCRE
 * biriminde; nereden kullanıldığına (karakter, fare) oyun-karakter.js karar verir.
 * DOM'a dokunmaz; olay yayar (olaylar.js).
 */
import {
  elIleAl, tirmikla, dedektorOku, igneyiAlabilirMi, miknatisCek,
} from './kural/araclar.js';
import { alinabilirCivi, civiAl, parlayanCiviler } from './kural/civi.js';
import { igneKonumu, tarlada } from './kural/igne.js';
import { puanHesapla } from './kural/zorluk.js';
import { buluntuyuAl } from './oyun-buluntu.js';
import { yay } from './olaylar.js';

export const PARILTI_SURE = 800;

/** İlk hamlede süreyi başlatır (yürümek, araç ya da makine). */
export function baslat(durum, zaman) {
  if (durum.baslangic !== null || durum.bitti) return;
  durum.baslangic = zaman;
  durum.sonrakiParilti = zaman + durum.pariltiAralik;
  yay('ilk-hamle', { zaman });
}

/**
 * El bir kare kazar (kat: bu karede alınacak kat sayısı, kare hızına göre; elAdimi): iğne
 * açıktaysa ve el yakınındaysa iğne alınır (true döner; çağıran oyunu bitirir). Değilse
 * açıktaki paslı çivi alınır ve saman kazılır.
 */
export function elKullan(durum, p, kat = 1) {
  const { tarla } = durum;
  if (igneyiAlabilirMi(tarla, p.x, p.y)) return true;
  civiyiAl(durum, p);
  buluntuyuAl(durum, p);
  if (kat <= 0) return false;
  const miktar = elIleAl(tarla, p.x, p.y, kat);
  if (miktar > 0) yay('kazildi', { x: p.x, y: p.y, miktar });
  return false;
}

/** Tırmık p'deki samanı (dx, dy) yönünde iter. */
export function tirmikKullan(durum, p, dx, dy) {
  const disari = tirmikla(durum.tarla, p.x, p.y, dx, dy);
  yay('tirmiklandi', { x: p.x, y: p.y, dx, dy, disari });
}

export function dedektorKullan(durum, p, zaman) {
  if (durum.dedektor <= 0) {
    yay('dedektor-bos', { x: p.x, y: p.y });
    return;
  }
  durum.dedektor -= 1;
  const seviye = dedektorOku(durum.tarla, p.x, p.y);
  durum.halkalar.push({ x: p.x, y: p.y, seviye, zaman });
  yay('dedektor', { x: p.x, y: p.y, seviye, kalan: durum.dedektor });
}

export function miknatisKullan(durum, p, zaman) {
  if (durum.miknatis <= 0) {
    yay('miknatis-bos', { x: p.x, y: p.y });
    return;
  }
  durum.miknatis -= 1;
  const cekti = miknatisCek(durum.tarla, p.x, p.y);
  yay('miknatis', { x: p.x, y: p.y, cekti, kalan: durum.miknatis });
  if (cekti && tarlada(durum.tarla.igne)) igneParlat(durum, zaman);
}

export function igneParlat(durum, zaman) {
  durum.parilti = { bitis: zaman + PARILTI_SURE, sure: PARILTI_SURE };
  durum.sonrakiParilti = zaman + durum.pariltiAralik;
  yay('parilti', igneKonumu(durum.tarla));
}

export function civileriParlat(durum, zaman) {
  durum.civiPariltilar = parlayanCiviler(durum.tarla, durum.pariltiDerinlik).map((c) => ({
    x: c.x, y: c.y, bitis: zaman + PARILTI_SURE, sure: PARILTI_SURE,
  }));
  for (const c of durum.civiPariltilar) yay('civi-parladi', { x: c.x, y: c.y });
}

/** Elin altında açıkta bir paslı çivi varsa alınır: süre cezası başlangıcı geri iter. */
function civiyiAl(durum, p) {
  const civi = alinabilirCivi(durum.tarla, p.x, p.y);
  if (!civi) return;
  const ceza = civiAl(civi, durum.rahat);
  durum.ceza += ceza;
  durum.baslangic -= ceza;
  yay('civi-alindi', { x: civi.x, y: civi.y, ceza });
}

/** Bitiş özeti. sureMs paslı çivi cezalarını içerir (ceza ayrıca cezaMs'te). */
export function sonucHesapla(durum, zaman) {
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
    rahat: durum.rahat,
  };
  const kullanilanHak = sonuc.dedektorKullanilan + sonuc.miknatisKullanilan;
  sonuc.puan = puanHesapla({ ...sonuc, kullanilanHak }, durum.zorluk);
  return sonuc;
}
