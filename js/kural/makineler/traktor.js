/**
 * Kepçeli traktör (saf tanım): Boşluk basılıyken önündeki kepçe alanından yüzey samanını
 * alır (kapasite dolana kadar; yuk = doluluk 0..1). Kepçe tarla kenarına (kenardan
 * ≤ BOSALTMA_KENAR hücre) gelince Boşluk onu boşaltır: saman tarladan çıkar (kaldirilan
 * artar). Kepçe iğnenin (ya da paslı çivinin) katına inerse nesne kepçeye takılır ve
 * boşaltınca boşaltma noktasında açıkta yere düşer; oyuncu elle almalıdır.
 * Kepçenin içi: makine.icerik = { saman, igne: bool, civiler: [çivi] }.
 */
import { GENISLIK, YUKSEKLIK, icinde } from '../boyut.js';
import { igneHucreleri } from '../igne.js';
import { makineTanimla } from './kayit.js';

export const KEPCE_KAPASITE = 6000;
/** Kepçe altındaki her hücreden saniyede alınan en çok kat. */
export const KEPCE_HIZI = 360;
export const KEPCE_YARICAP = 2.2;
/** Kepçe merkezinin gövde merkezine uzaklığı (hücre). */
export const KEPCE_ILERI = 3;
export const BOSALTMA_KENAR = 3;

const kirp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Kepçenin merkezi, hücre biriminde. */
export function kepceNoktasi(m) {
  return {
    x: m.x - 0.5 + Math.cos(m.yon) * KEPCE_ILERI,
    y: m.y - 0.5 + Math.sin(m.yon) * KEPCE_ILERI,
  };
}

/** Hücre birimindeki nokta tarla kenarına BOSALTMA_KENAR hücreden yakın (ya da dışında) mı? */
export function kenardaMi(p) {
  const k = BOSALTMA_KENAR;
  return p.x < k || p.y < k || p.x > GENISLIK - 1 - k || p.y > YUKSEKLIK - 1 - k;
}

function kepceHucreleri(p) {
  const liste = [];
  const r2 = KEPCE_YARICAP * KEPCE_YARICAP;
  for (let y = Math.floor(p.y - KEPCE_YARICAP); y <= Math.ceil(p.y + KEPCE_YARICAP); y++) {
    for (let x = Math.floor(p.x - KEPCE_YARICAP); x <= Math.ceil(p.x + KEPCE_YARICAP); x++) {
      if ((x - p.x) ** 2 + (y - p.y) ** 2 <= r2 && icinde(x, y)) liste.push(y * GENISLIK + x);
    }
  }
  return liste;
}

/** Nesne ({x, y, z, aci}) kepçe hücrelerinde ve o hücrede saman onun katına inmiş mi? */
function kepceyeGirer(tarla, nesne, hucreler) {
  return igneHucreleri(nesne).some((i) => hucreler.has(i) && tarla.h[i] <= nesne.z);
}

function kepcele(tarla, m, p, dt) {
  const ic = m.icerik;
  const sonuc = { miktar: 0, olaylar: [] };
  if (ic.saman >= KEPCE_KAPASITE) return sonuc;
  m.birikim += KEPCE_HIZI * dt;
  const n = Math.floor(m.birikim);
  m.birikim -= n;
  const hucreler = kepceHucreleri(p);
  for (const i of hucreler) {
    const a = Math.min(tarla.h[i], n, KEPCE_KAPASITE - ic.saman - sonuc.miktar);
    tarla.h[i] -= a;
    sonuc.miktar += a;
  }
  ic.saman += sonuc.miktar;
  m.yuk = ic.saman / KEPCE_KAPASITE;
  const kume = new Set(hucreler);
  const { igne } = tarla;
  if (!igne.kepcede && kepceyeGirer(tarla, igne, kume)) {
    igne.kepcede = true;
    ic.igne = true;
    sonuc.olaylar.push(['igne-kepcede', { makine: m, x: igne.x, y: igne.y }]);
  }
  for (const civi of tarla.civiler) {
    if (civi.alindi || civi.kepcede || !kepceyeGirer(tarla, civi, kume)) continue;
    civi.kepcede = true;
    ic.civiler.push(civi);
    sonuc.olaylar.push(['civi-kepcede', { makine: m, x: civi.x, y: civi.y }]);
  }
  if (ic.saman >= KEPCE_KAPASITE) sonuc.olaylar.push(['kepce-doldu', { makine: m }]);
  return sonuc;
}

/** Nesneyi (x, y)'ye açıkta bırakır: z, kapladığı hücrelerin en alçağına iner. */
function yereBirak(tarla, nesne, x, y) {
  nesne.x = Math.round(kirp(x, 2, GENISLIK - 3));
  nesne.y = Math.round(kirp(y, 2, YUKSEKLIK - 3));
  nesne.kepcede = false;
  nesne.z = Math.min(...igneHucreleri(nesne).map((i) => tarla.h[i]));
}

function bosalt(tarla, m, p) {
  const ic = m.icerik;
  const miktar = ic.saman;
  tarla.kaldirilan += miktar;
  const igne = ic.igne;
  const civi = ic.civiler.length;
  if (igne) yereBirak(tarla, tarla.igne, p.x, p.y);
  // Çiviler iğnenin yanına, kenar boyunca 3'er hücre arayla düşer.
  ic.civiler.forEach((c, k) => {
    const d = 3 * (k + 1) * (k % 2 ? -1 : 1);
    yereBirak(tarla, c, p.x - Math.sin(m.yon) * d, p.y + Math.cos(m.yon) * d);
  });
  Object.assign(ic, { saman: 0, igne: false, civiler: [] });
  Object.assign(m, { yuk: 0, birikim: 0, kilitli: true });
  const x = Math.round(kirp(p.x, 2, GENISLIK - 3));
  const y = Math.round(kirp(p.y, 2, YUKSEKLIK - 3));
  return { miktar: 0, olaylar: [['kepce-bosaltildi', { makine: m, miktar, igne, civi, x, y }]] };
}

export const TRAKTOR = makineTanimla('traktor', {
  ad: 'Kepçeli traktör',
  boy: 4,
  en: 2.6,
  yaricap: 1.7,
  azamiHiz: 15,
  donus: 2.4,
  tirmanma: 2,
  yakitTuketim: 1 / 150,
  isYaricap: KEPCE_YARICAP,
  isNoktasi: kepceNoktasi,
  kur(m) {
    m.yuk = 0;
    m.birikim = 0;
    m.icerik = { saman: 0, igne: false, civiler: [] };
  },
  /** Kepçedeki iğne ve çiviler kepçeyle taşınır (dedektör iğneyi kepçede bulur). */
  kare(tarla, m) {
    const p = kepceNoktasi(m);
    const x = Math.round(kirp(p.x, 0, GENISLIK - 1));
    const y = Math.round(kirp(p.y, 0, YUKSEKLIK - 1));
    for (const nesne of m.icerik.igne ? [tarla.igne, ...m.icerik.civiler] : m.icerik.civiler) {
      nesne.x = x;
      nesne.y = y;
    }
  },
  calis(tarla, m, dt) {
    const p = kepceNoktasi(m);
    const ic = m.icerik;
    const doluMu = ic.saman > 0 || ic.igne || ic.civiler.length > 0;
    if (doluMu && kenardaMi(p)) return bosalt(tarla, m, p);
    return kepcele(tarla, m, p, dt);
  },
});
