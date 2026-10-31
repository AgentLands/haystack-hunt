/**
 * Bot beyni (saf mantık, DOM yok): ne yapacağına karar verir. Hile yok: iğnenin konumunu
 * bilmez; yalnız görünen yükseklikler, kendi dedektör okumaları, 'parilti' ve
 * 'igne-gorundu' olaylarıyla çalışır.
 *
 * `niyet(g)` her karede mevcut niyeti (ya da yenisini) döndürür; niyet tipleri:
 *   { tip: 'oku', hedef }      dedektörü hedefte bir kez bas
 *   { tip: 'tirmik', a, b }    tırmıkla a'dan b'ye süpür
 *   { tip: 'kaz', hedef }      hedefte eli basılı tut (kazı)
 *   null                       yapacak iş yok
 * Sürücü (bot-surucu.js) işini bitirince `niyet.tamam = true` yazar.
 */
import { GENISLIK } from '../kural/boyut.js';
import { SEVIYELER } from '../kural/araclar.js';
import { adaylariBul, okumaOlustur, okumaYeriSec } from './bot-aday.js';
import {
  enIyiKazi, asamaIlerlet, ASAMALAR, BITIS_YARICAP,
} from './bot-plan.js';
import { enIyiSerit, seridiIsaretle } from './bot-serit.js';

export const BOT_HIZI = 1.5;
const OKUMA_YETER = 12;
/** Dedektörden sonra, elle kazıdan önce açılan en çok tırmık şeridi (denemeyle seçildi). */
const SERIT_SAYISI = 3;
const KAZI_ZAMAN_ASIMI = 700;
const PARILTI_SURESI = 420;

export function beyinKur({ h0, seviyeler = SEVIYELER }) {
  const b = {
    h0, seviyeler, okumalar: [], liste: null, kare: 0, mevcut: null, ozel: null,
    asama: new Uint8Array(h0.length), maske: new Uint8Array(h0.length), okuBitti: false,
    seritTemiz: new Uint8Array(h0.length), seritSayisi: 0,
  };
  adaylariYenile(b);

  return {
    get adaySayisi() { return b.liste.length; },
    get okumaSayisi() { return b.okumalar.length; },

    okuma(x, y, seviye) {
      b.okumalar.push(okumaOlustur(x, y, seviye, seviyeler));
      adaylariYenile(b);
      b.mevcut = null;
    },
    parilti(x, y) {
      if (b.ozel && b.ozel.son === Infinity) return;
      b.ozel = { tip: 'kaz', hedef: { x, y }, ozel: true, son: b.kare + PARILTI_SURESI };
      b.mevcut = null;
    },
    igneGorundu(x, y) {
      b.ozel = { tip: 'kaz', hedef: { x, y }, ozel: true, son: Infinity };
      b.mevcut = null;
    },

    /** g: { h, dedektor (kalan hak), imlec: {x, y}, bitti }. */
    niyet(g) {
      b.kare++;
      if (g.bitti) return null;
      if (b.ozel && b.kare >= b.ozel.son) b.ozel = null;
      if (b.ozel) {
        b.mevcut = b.ozel;
        return b.ozel;
      }
      const m = b.mevcut;
      if (m && !m.tamam && !(m.tip === 'kaz' && kaziBitti(b, g.h, m))) return m;
      if (m && m.tip === 'oku' && m.okumaSayisi === b.okumalar.length) b.okuBitti = true;
      b.mevcut = planla(b, g);
      return b.mevcut;
    },
  };
}

function adaylariYenile(b) {
  b.liste = adaylariBul(b.h0, b.okumalar);
  b.maske.fill(0);
  for (const c of b.liste) b.maske[c] = 1;
}

function planla(b, g) {
  const konum = g.imlec || { x: GENISLIK / 2, y: 80 };
  if (g.dedektor > 0 && !b.okuBitti && b.liste.length > OKUMA_YETER) {
    const hedef = okumaYeriSec(b.liste, b.seviyeler, konum);
    return { tip: 'oku', hedef, okumaSayisi: b.okumalar.length };
  }
  if (b.seritSayisi < SERIT_SAYISI) {
    const serit = enIyiSerit(b.liste, b.seritTemiz, konum, BOT_HIZI);
    if (serit) {
      b.seritSayisi++;
      seridiIsaretle(b.liste, b.seritTemiz, serit);
      return { tip: 'tirmik', a: serit.a, b: serit.b };
    }
  }
  for (const c of b.liste) asamaIlerlet(g.h, b.h0, b.asama, c);
  const yer = enIyiKazi(b.liste, g.h, b.h0, b.asama, konum, BOT_HIZI);
  if (!yer) return null;
  const hedefler = new Map();
  for (const i of yakin(yer)) {
    if (b.maske[i] && b.asama[i] < ASAMALAR.length) hedefler.set(i, b.asama[i]);
  }
  return { tip: 'kaz', hedef: yer, basla: b.kare, hedefler };
}

/** Noktanın BITIS_YARICAP çevresindeki olası hücre indeksleri. */
function yakin({ x: cx, y: cy }) {
  const R = BITIS_YARICAP;
  const sonuc = [];
  for (let y = Math.ceil(cy - R); y <= Math.floor(cy + R); y++) {
    for (let x = Math.ceil(cx - R); x <= Math.floor(cx + R); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R && x >= 0 && y >= 0 && x < GENISLIK) {
        sonuc.push(y * GENISLIK + x);
      }
    }
  }
  return sonuc;
}

/** Çevredeki hücreler (bu niyet başladığındaki) aşama hedeflerine indiyse ya da süre dolduysa. */
function kaziBitti(b, h, m) {
  if (m.ozel) return false;
  const zamanAsimi = b.kare - m.basla > KAZI_ZAMAN_ASIMI;
  let hepsi = true;
  for (const [i, asama0] of m.hedefler) {
    asamaIlerlet(h, b.h0, b.asama, i);
    if (b.asama[i] <= asama0) {
      if (zamanAsimi) b.asama[i] = asama0 + 1;
      else hepsi = false;
    }
  }
  return hepsi || zamanAsimi;
}
