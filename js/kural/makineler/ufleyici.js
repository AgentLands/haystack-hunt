/**
 * Sırt üfleyicisi (saf tanım): giyilen makine. E ile takılınca çiftçi yürümeye devam eder
 * (biraz yavaş: ağırlık), makine karakteri izler. Boşluk basılıyken baktığı yönde bir
 * koni (MENZIL hücre, ±KONI_ACI) içindeki hücrelerin YÜZEY samanını ileri savurur: her
 * hücreden kare başına en çok 1 kat alınır, koninin ötesine (UCUS_ASGARI..UCUS_ASGARI + 3
 * hücre) bırakılır; tarla dışına düşen saman gider (kaldirilan artar). Yakın hücreler
 * daha güçlü etkilenir; yüksekliği DERIN_ESIK'i aşan hücrelerde etki yükseklikle ters
 * orantılı azalır (derin yığını tek başına bitiremez, yalnız yüzeyi inceltir).
 * İğne ve çivilere dokunulmaz (ağırdır, uçmaz): üstündeki saman uçarsa açıkta kalırlar,
 * üzerlerine saman yağarsa gömülürler. Kural saf ve deterministik: hücrelerin "kat al"
 * kararı çalışma süresi ile hücreye özgü sabit bir fazdan türer (rastgelelik yok).
 */
import { GENISLIK, icinde } from '../boyut.js';
import { makineTanimla } from './kayit.js';

/** Konik üfleme: menzil (hücre) ve yarım açı (radyan, 25°). */
export const MENZIL = 9;
export const KONI_ACI = (25 * Math.PI) / 180;
/** Namlunun karakterin önündeki uzaklığı (hücre); koni buradan başlar. */
export const NAMLU_ILERI = 1.8;
/** Yakın hücrenin saniyede alabileceği kat; menzil sonunda bunun dörtte biri. */
export const YAKIN_HIZ = 48;
/** Yüksekliği bunu aşan hücrede hız DERIN_ESIK / yükseklik ile çarpılır. */
export const DERIN_ESIK = 24;
/** Savrulan samanın düştüğü uzaklık: UCUS_ASGARI (en uzak hücre) .. +UCUS_EK (en yakın). */
export const UCUS_ASGARI = MENZIL + 1;
export const UCUS_EK = 3;
/** 'ufleme' olayı aralığı (sn, ~10 Hz). */
export const OLAY_ARALIK = 0.1;

const ALTIN = 0.6180339887;
const KOS_ESIK = Math.cos(KONI_ACI);

/** Namlunun noktası (hücre birimi): konin başı, efekt ve ses de burayı kullanır. */
export function namluNoktasi(m) {
  return {
    x: m.x - 0.5 + Math.cos(m.yon) * NAMLU_ILERI,
    y: m.y - 0.5 + Math.sin(m.yon) * NAMLU_ILERI,
  };
}

/** Konideki hücrelerin saniyelik hızı: yakında YAKIN_HIZ, menzil sonunda dörtte biri. */
function hucreHizi(d, h) {
  const hiz = YAKIN_HIZ * (1 - 0.75 * (d / MENZIL));
  return h > DERIN_ESIK ? hiz * (DERIN_ESIK / h) : hiz;
}

/** Bu karede (sure - dt, sure] aralığında hücrenin faz sayacı bir tam sayı geçti mi? */
function katAlinir(i, hiz, sure, dt) {
  const faz = (i * ALTIN) % 1;
  return Math.floor(sure * hiz + faz) > Math.floor((sure - dt) * hiz + faz);
}

/** Hücreden (dx, dy) yönünde, namludan `uzak` hücre ötedeki hedef hücre. */
function ucusYeri(o, dx, dy, d, uzak) {
  return [Math.round(o.x + (dx / d) * uzak), Math.round(o.y + (dy / d) * uzak)];
}

/** Konideki hücreleri tek tek gezer: islev(hücre indeksi, dx, dy, d). */
function koniyiGez(o, yon, islev) {
  const ux = Math.cos(yon);
  const uy = Math.sin(yon);
  for (let y = Math.floor(o.y - MENZIL); y <= Math.ceil(o.y + MENZIL); y++) {
    for (let x = Math.floor(o.x - MENZIL); x <= Math.ceil(o.x + MENZIL); x++) {
      const dx = x - o.x;
      const dy = y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.7 || d > MENZIL || !icinde(x, y)) continue;
      if ((dx * ux + dy * uy) / d >= KOS_ESIK) islev(y * GENISLIK + x, dx, dy, d);
    }
  }
}

function savur(tarla, m, dt) {
  const o = namluNoktasi(m);
  m.ufleSure += dt;
  const alinan = [];
  koniyiGez(o, m.yon, (i, dx, dy, d) => {
    if (tarla.h[i] <= 0 || !katAlinir(i, hucreHizi(d, tarla.h[i]), m.ufleSure, dt)) return;
    tarla.h[i] -= 1;
    alinan.push(ucusYeri(o, dx, dy, d, UCUS_ASGARI + UCUS_EK * (1 - d / MENZIL)));
  });
  let disari = 0;
  for (const [x, y] of alinan) {
    if (icinde(x, y)) tarla.h[y * GENISLIK + x] += 1;
    else disari += 1;
  }
  tarla.kaldirilan += disari;
  return alinan.length;
}

export const UFLEYICI = makineTanimla('ufleyici', {
  ad: 'Sırt üfleyicisi',
  boy: 2,
  en: 1.2,
  yaricap: 0.8,
  azamiHiz: 10,
  donus: 0,
  giyilir: true,
  yuruHizi: 0.8,
  yakitTuketim: 1 / 120,
  isYakit: 1 / 120,
  isYaricap: 2,
  isNoktasi: namluNoktasi,
  kur(m) {
    m.ufleSure = 0;
    m.ufleSayac = 0;
  },
  /** Çalışmıyorken olay sayacı sıfırlanır: bir sonraki üfleme hemen bir olay yayar. */
  kare(tarla, m) {
    if (!m.calisiyor) m.ufleSayac = 0;
  },
  calis(tarla, m, dt) {
    const olaylar = [];
    if (!(dt > 0)) return { miktar: 0, olaylar };
    const miktar = savur(tarla, m, dt);
    m.ufleSayac -= dt;
    if (m.ufleSayac <= 0) {
      m.ufleSayac = OLAY_ARALIK;
      const o = namluNoktasi(m);
      olaylar.push(['ufleme', { x: o.x, y: o.y, yon: m.yon, menzil: MENZIL }]);
    }
    return { miktar, olaylar };
  },
});

