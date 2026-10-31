/**
 * Oyun durumu ve eylemleri: yeni tarla, araç seçimi, kazma/tırmık/dedektör, kare adımı,
 * güneş parıltısı, bitiş. DOM'a dokunmaz; dış dünyaya olay yayar (olaylar.js).
 */
import { tarlaKur, cokert } from './kural/tarla.js';
import { igneDerinligi } from './kural/igne.js';
import {
  elIleAl, tirmikla, dedektorOku, igneyiAlabilirMi,
  DEDEKTOR_HAKKI, EL_YARICAP, TIRMIK_YARICAP,
} from './kural/araclar.js';
import { metindenTohum } from './kural/rastgele.js';
import { yay } from './olaylar.js';

export const PARILTI_ARALIK = 12000;
export const PARILTI_SURE = 800;
export const PARILTI_DERINLIK = 8;
export const YARICAP = { el: EL_YARICAP, tirmik: TIRMIK_YARICAP, dedektor: 1.5 };

let durum = null;

export function durumAl() {
  return durum;
}

export function yeniOyun(etiket) {
  const arac = durum ? durum.arac : 'el';
  durum = {
    etiket,
    tarla: tarlaKur(metindenTohum(etiket)),
    arac, aracYaricap: YARICAP[arac],
    basili: false, imlec: null, son: null,
    halkalar: [], dedektor: DEDEKTOR_HAKKI, dedektorHakki: DEDEKTOR_HAKKI,
    baslangic: null, bitis: null, bitti: false, goster: false, gorundu: false,
    parilti: null, sonrakiParilti: Infinity, sonuc: null,
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
  durum.sonrakiParilti = zaman + PARILTI_ARALIK;
  yay('ilk-hamle', { zaman });
}

/** İşaretçi basıldı (p: hücre koordinatı). */
export function bas(p, zaman) {
  if (durum.bitti) return;
  Object.assign(durum, { basili: true, imlec: p, son: p });
  baslat(zaman);
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
      if (derinlik <= PARILTI_DERINLIK) {
        durum.parilti = { bitis: zaman + PARILTI_SURE, sure: PARILTI_SURE };
        yay('parilti', { x: tarla.igne.x, y: tarla.igne.y });
      }
      durum.sonrakiParilti = zaman + PARILTI_ARALIK;
    }
  }
  yay('kare', { zaman, durum });
}

export function sonucOlustur(zaman) {
  return {
    etiket: durum.etiket,
    sureMs: zaman - durum.baslangic,
    kaldirilan: durum.tarla.kaldirilan,
    dedektorKullanilan: durum.dedektorHakki - durum.dedektor,
    dedektorHakki: durum.dedektorHakki,
    okumalar: durum.halkalar.map((h) => h.seviye.ad),
  };
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
