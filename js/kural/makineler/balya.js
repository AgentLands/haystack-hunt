/**
 * Balya makinesi (saf tanım): traktörden hızlı, Boşluk basılıyken önündeki toplayıcı
 * şeridinden (makinenin eni kadar) yüzeyden ince bir katman alır: hücre başına az ama
 * şerit geniş, alan çabuk temizlenir. Toplayıcı gövdenin altındaki samanın en çok
 * TOPLAYICI_ERISIM kat üstüne uzanır: yalnız alçak/orta samanda iyi çalışır, yüksek yığın
 * duvarına dişi geçmez. Alınan saman haznede birikir (yuk 0..1); BALYA_KAPASITE dolunca
 * arkaya bir balya bırakır (kural/balyalar.js). Balyadaki saman tarlada sayılır
 * (kaldirilan artmaz). Toplayıcı iğnenin (ya da paslı çivinin) katına inerse nesne
 * hazneye girer ve o sırada oluşan balyaya paketlenir.
 * Hazne: makine.icerik = { saman, igne: bool, civiler: [çivi] }.
 */
import { GENISLIK, YUKSEKLIK, icinde } from '../boyut.js';
import { igneHucreleri, tarlada } from '../igne.js';
import { balyaBirak } from '../balyalar.js';
import { makineTanimla } from './kayit.js';

export const BALYA_KAPASITE = 600;
/** Toplayıcı altındaki her hücreden saniyede alınan en çok kat (traktör kepçesi 360). */
export const TOPLAYICI_HIZI = 60;
/** Toplayıcı şeridinin merkezi gövde merkezinden bu kadar önde (hücre). */
export const TOPLAYICI_ILERI = 3.1;
/** Şeridin eni (yön'e dik) ve derinliği (yön boyunca), hücre. */
export const TOPLAYICI_EN = 4.2;
export const TOPLAYICI_DERIN = 2;
/** Toplayıcı gövdenin altındaki saman yüksekliğinin en çok bu kadar kat üstüne uzanır. */
export const TOPLAYICI_ERISIM = 20;
/** Balya gövde merkezinin bu kadar arkasına bırakılır (dünya birimi; gövdeye değmez). */
export const BALYA_ARKA = 3.9;

const kirp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Toplayıcı şeridinin merkezi, hücre biriminde. */
export function toplayiciNoktasi(m) {
  return {
    x: m.x - 0.5 + Math.cos(m.yon) * TOPLAYICI_ILERI,
    y: m.y - 0.5 + Math.sin(m.yon) * TOPLAYICI_ILERI,
  };
}

/** Şeridin (yöne göre döndürülmüş dikdörtgen) içindeki hücrelerin dizinleri. */
export function seritHucreleri(m) {
  const p = toplayiciNoktasi(m);
  const ux = Math.cos(m.yon);
  const uy = Math.sin(m.yon);
  const r = Math.hypot(TOPLAYICI_EN, TOPLAYICI_DERIN) / 2;
  const liste = [];
  for (let y = Math.floor(p.y - r); y <= Math.ceil(p.y + r); y++) {
    for (let x = Math.floor(p.x - r); x <= Math.ceil(p.x + r); x++) {
      const dx = x - p.x;
      const dy = y - p.y;
      const ileri = dx * ux + dy * uy;
      const yan = -dx * uy + dy * ux;
      const ici = Math.abs(ileri) <= TOPLAYICI_DERIN / 2 && Math.abs(yan) <= TOPLAYICI_EN / 2;
      if (ici && icinde(x, y)) liste.push(y * GENISLIK + x);
    }
  }
  return liste;
}

/** Nesne şerit hücrelerinde ve o hücrede saman onun katına inmiş mi? */
function hazneyeGirer(tarla, nesne, kume) {
  return igneHucreleri(nesne).some((i) => kume.has(i) && tarla.h[i] <= nesne.z);
}

/** İğne ve çivileri toplayıcıya takılırsa hazneye alır; olayları ekler. */
function nesneleriAl(tarla, m, hucreler, olaylar) {
  const kume = new Set(hucreler);
  const ic = m.icerik;
  const { igne } = tarla;
  if (tarlada(igne) && hazneyeGirer(tarla, igne, kume)) {
    igne.kepcede = true;
    ic.igne = true;
    olaylar.push(['igne-yutuldu', { x: igne.x, y: igne.y }]);
  }
  for (const civi of tarla.civiler) {
    if (civi.alindi || !tarlada(civi) || !hazneyeGirer(tarla, civi, kume)) continue;
    civi.kepcede = true;
    ic.civiler.push(civi);
    olaylar.push(['civi-yutuldu', { x: civi.x, y: civi.y }]);
  }
}

/** Hazne dolunca arkaya balya bırakır, hazneyi boşaltır. */
function balyala(tarla, m, olaylar) {
  const ic = m.icerik;
  const x = m.x - Math.cos(m.yon) * BALYA_ARKA;
  const y = m.y - Math.sin(m.yon) * BALYA_ARKA;
  const balya = balyaBirak(tarla, x, y, m.yon, ic);
  Object.assign(ic, { saman: 0, igne: false, civiler: [] });
  olaylar.push(['balya-birakildi', { balya, makine: m }]);
}

export const BALYA_MAKINESI = makineTanimla('balya', {
  ad: 'Balya makinesi',
  boy: 5.6,
  en: 3.2,
  yaricap: 2.3,
  azamiHiz: 20,
  donus: 2.1,
  tirmanma: 2,
  yakitTuketim: 1 / 160,
  isYaricap: TOPLAYICI_EN / 2,
  isNoktasi: toplayiciNoktasi,
  kur(m) {
    m.yuk = 0;
    m.birikim = 0;
    m.icerik = { saman: 0, igne: false, civiler: [] };
  },
  /** Yakıt bitince haznede ne varsa yarım bir balya olarak arkaya bırakılır. */
  yakitBitince(tarla, m) {
    const ic = m.icerik;
    if (!ic.saman && !ic.igne && !ic.civiler.length) return [];
    const olaylar = [];
    balyala(tarla, m, olaylar);
    Object.assign(m, { yuk: 0, birikim: 0 });
    return olaylar;
  },
  /** Haznedeki iğne ve çiviler makineyle taşınır (dedektör onları makinede bulur). */
  kare(tarla, m) {
    const ic = m.icerik;
    const x = Math.round(kirp(m.x - 0.5, 0, GENISLIK - 1));
    const y = Math.round(kirp(m.y - 0.5, 0, YUKSEKLIK - 1));
    for (const nesne of ic.igne ? [tarla.igne, ...ic.civiler] : ic.civiler) {
      nesne.x = x;
      nesne.y = y;
    }
  },
  calis(tarla, m, dt) {
    const ic = m.icerik;
    const olaylar = [];
    m.birikim += TOPLAYICI_HIZI * dt;
    const n = Math.floor(m.birikim);
    m.birikim -= n;
    const hucreler = seritHucreleri(m);
    const tavan = (m.z || 0) + TOPLAYICI_ERISIM;
    let miktar = 0;
    for (const i of hucreler) {
      if (tarla.h[i] > tavan) continue;
      const a = Math.min(tarla.h[i], n, BALYA_KAPASITE - ic.saman - miktar);
      tarla.h[i] -= a;
      miktar += a;
    }
    ic.saman += miktar;
    nesneleriAl(tarla, m, hucreler, olaylar);
    if (ic.saman >= BALYA_KAPASITE) balyala(tarla, m, olaylar);
    m.yuk = ic.saman / BALYA_KAPASITE;
    return { miktar, olaylar };
  },
});
