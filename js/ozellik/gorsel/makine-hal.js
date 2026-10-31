/**
 * Makine görsel hali: kural verisinde olmayan, yalnız görünüm için kareden kareye taşınan
 * durum (WeakMap; makine nesnesi silinince kendiliğinden gider). Önceki yondan açısal hız →
 * ön tekerlek direksiyon açısı, hızlanma → egzoz pofu, kepçe kalkışı (yumuşatılmış) ve
 * balya bırakılınca arka kapağın açılma anı ('balya-birakildi' olayı).
 */
import { dinle } from '../../olaylar.js';

/** Direksiyon açısının sınırı (±25°) ve açısal hızdan açıya çarpan. */
export const DIREKSIYON_AZAMI = (25 * Math.PI) / 180;
const DIREKSIYON_CARPAN = 0.22;
/** Bu hızlanmayı (hücre/sn²) aşınca egzozdan koyu pof çıkar; poflar arası en az süre. */
const POF_IVME = 5;
const POF_ARA = 0.7;
/** Kapak: açılma, açık bekleme ve kapanma süreleri (sn). */
const KAPAK_AC = 0.25;
const KAPAK_BEKLE = 0.55;
const KAPAK_KAPA = 0.4;

const haller = new WeakMap();
const kapakBekleyen = new WeakSet();

dinle('balya-birakildi', ({ makine }) => {
  if (makine) kapakBekleyen.add(makine);
});

const kirp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Açı farkını (-π, π] aralığına sarar. */
function fark(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Kepçenin hedef yüksekliği (0 yerde .. 1 en yukarıda). */
function kalkisHedef(makine, t) {
  if (makine.tur !== 'traktor' || !(makine.yakit > 0) || !makine.surucu) return 0;
  if (makine.calisiyor) return 0.5 - 0.5 * Math.cos(t * 4);
  return (makine.yuk || 0) > 0.05 ? 0.6 : 0.2;
}

/**
 * Makinenin bu karedeki görsel hali: { direksiyon (rad), kalkis (0..1), pof (sn, son
 * pofun zamanı), kapak (sn, kapağın açılmaya başladığı an) }. Aynı zamanla iki kez
 * çağrılırsa durum değişmez.
 */
export function halAl(makine, zaman) {
  const t = zaman / 1000;
  let h = haller.get(makine);
  if (!h) {
    h = {
      t, yon: makine.yon || 0, hiz: makine.hiz || 0, direksiyon: 0,
      kalkis: kalkisHedef(makine, t), pof: -99, kapak: -99,
    };
    haller.set(makine, h);
  }
  const dt = Math.min(0.1, t - h.t);
  if (dt > 0) {
    const hiz = makine.hiz || 0;
    const omega = fark(makine.yon || 0, h.yon) / dt;
    const yonIsaret = hiz < -0.05 ? -1 : 1;
    const hedef = kirp(omega * DIREKSIYON_CARPAN * yonIsaret, -DIREKSIYON_AZAMI,
      DIREKSIYON_AZAMI);
    h.direksiyon += (hedef - h.direksiyon) * Math.min(1, dt * 10);
    const ivme = (Math.abs(hiz) - Math.abs(h.hiz)) / dt;
    if (ivme > POF_IVME && t - h.pof > POF_ARA && makine.yakit > 0) h.pof = t;
    h.kalkis += (kalkisHedef(makine, t) - h.kalkis) * Math.min(1, dt * 8);
  }
  if (dt !== 0) {
    h.t = t;
    h.yon = makine.yon || 0;
    h.hiz = makine.hiz || 0;
  }
  if (kapakBekleyen.has(makine)) {
    kapakBekleyen.delete(makine);
    h.kapak = t;
  }
  return h;
}

/** Arka kapağın açıklığı (0 kapalı .. 1 tam açık); t sn. */
export function kapakAcikligi(h, t) {
  const g = t - h.kapak;
  if (g < 0 || g > KAPAK_AC + KAPAK_BEKLE + KAPAK_KAPA) return 0;
  if (g < KAPAK_AC) return g / KAPAK_AC;
  if (g < KAPAK_AC + KAPAK_BEKLE) return 1;
  return 1 - (g - KAPAK_AC - KAPAK_BEKLE) / KAPAK_KAPA;
}

/** Son pofun yaşı 0..1 (1: pof yok ya da bitti); t sn. */
export function pofYasi(h, t) {
  return kirp((t - h.pof) / 0.6, 0, 1);
}
