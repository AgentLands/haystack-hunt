/**
 * Makine ve ayak sesi desenleri: oyun verisinden ses parametrelerine saf eşlemeler
 * (hız → motor perdesi ve düzeyi, saman yüksekliği → adım sesi). DOM ve WebAudio yok;
 * Node'da test edilir. Sentez ses-makine-motor.js ve ses-makine.js'te.
 */
const kirp = (v, a, b) => Math.min(b, Math.max(a, v));
const dogrusal = (a, b, t) => a + (b - a) * t;

/** Bu yüksekliğin altı çıplak toprak sayılır (kuru "tık"). */
export const TOPRAK_ESIGI = 1.5;
/** Adım sesinin en dolgun olduğu saman yüksekliği. */
export const DOLGUN_YUKSEKLIK = 60;

/** Saman yüksekliği z → adım sesi parametreleri (z arttıkça daha dolgun ve boğuk). */
export function adimDeseni(z) {
  const yuk = Number.isFinite(z) ? Math.max(0, z) : 0;
  if (yuk < TOPRAK_ESIGI) {
    return { tur: 'toprak', dolgunluk: 0, f0: 760, f1: 420, sure: 0.035, duzey: 0.13, q: 1.2 };
  }
  const d = kirp((yuk - TOPRAK_ESIGI) / (DOLGUN_YUKSEKLIK - TOPRAK_ESIGI), 0, 1);
  const f0 = dogrusal(3400, 1400, d);
  return {
    tur: 'saman', dolgunluk: d, f0, f1: f0 * 0.55, sure: dogrusal(0.07, 0.16, d),
    duzey: dogrusal(0.1, 0.24, d), q: dogrusal(0.8, 0.5, d),
  };
}

/** Motorun hız oranı: |hız| / azami hız, 0..1. */
export function hizOrani(hiz, azamiHiz) {
  if (!(azamiHiz > 0) || !Number.isFinite(hiz)) return 0;
  return kirp(Math.abs(hiz) / azamiHiz, 0, 1);
}

/**
 * Tür başına tını profili: her alan [rölanti, tam gaz] aralığıdır (d = gaz 0..1);
 * çalışırken (iş aygıtı açık) `calisma` kadar eklenir. Frekanslar Hz.
 *   dalga1/dalga2  osilatör dalgaları; altOran: ikinci osilatörün birinciye oranı
 *   kesim          alçak geçiren filtre; lfo: vuruş ritmi (Hz) ve derinliği (0..1)
 *   gurultu        { f: bant ortası, q, duzey } hava/mekanik gürültü
 */
export const MOTOR_PROFILLERI = {
  traktor: {
    dalga1: 'sawtooth', dalga2: 'square', altOran: 0.5,
    frekans: [34, 60], kesim: [260, 950], duzey: [0.15, 0.25],
    lfo: [7, 16], lfoDerinlik: [0.4, 0.3],
    gurultu: { f: [380, 900], q: 0.8, duzey: [0.03, 0.08] },
    calisma: { frekans: 8, duzey: 0.05, gurultu: 0.03, lfoDerinlik: 0.1 },
  },
  balya: {
    dalga1: 'sawtooth', dalga2: 'sawtooth', altOran: 1.012,
    frekans: [62, 104], kesim: [700, 2100], duzey: [0.12, 0.2],
    lfo: [10, 14], lfoDerinlik: [0.12, 0.12],
    gurultu: { f: [900, 1700], q: 0.9, duzey: [0.02, 0.05] },
    // Çalışırken tambur ritmi: yavaş ve derin vuruş (~5.5 Hz).
    calisma: { frekans: 10, duzey: 0.05, gurultu: 0.05, lfoDerinlik: 0.45, lfoHz: 5.5 },
  },
  ufleyici: {
    dalga1: 'sawtooth', dalga2: 'square', altOran: 2,
    frekans: [150, 410], kesim: [1800, 4300], duzey: [0.07, 0.13],
    lfo: [23, 27], lfoDerinlik: [0.3, 0.45],
    gurultu: { f: [2400, 3000], q: 0.7, duzey: [0.02, 0.06] },
    calisma: { frekans: 0, duzey: 0.04, gurultu: 0.16, lfoDerinlik: 0.05 },
  },
};

/** Gaz (hız ya da çalışma) 1'e yaklaşırken üfleyici gibi hep yüksek devirde döner. */
const GAZ_ALT_SINIRI = { ufleyici: 0.25 };

/**
 * Motor durumundan sentez parametreleri.
 *   tur: makine türü (bilinmeyen tür traktör gibi); girdi: { hizOrani, calisiyor, takili }.
 * Dönüş: { dalga1, dalga2, frekans, altFrekans, kesim, duzey, lfoHz, lfoDerinlik,
 *          gurultuF, gurultuQ, gurultuDuzey }.
 */
export function motorDeseni(tur, { hizOrani: h = 0, calisiyor = false, takili = false } = {}) {
  const p = MOTOR_PROFILLERI[tur] || MOTOR_PROFILLERI.traktor;
  const c = calisiyor ? 1 : 0;
  const alt = GAZ_ALT_SINIRI[tur] || 0;
  const d = kirp(Math.max(h, c * 0.8, alt), 0, 1);
  const zor = takili ? 1 : 0;
  const al = (aralik) => dogrusal(aralik[0], aralik[1], d);
  const frekans = (al(p.frekans) + c * p.calisma.frekans) * (zor ? 0.86 : 1);
  return {
    dalga1: p.dalga1,
    dalga2: p.dalga2,
    frekans,
    altFrekans: frekans * p.altOran,
    kesim: al(p.kesim) * (zor ? 0.8 : 1),
    duzey: (al(p.duzey) + c * p.calisma.duzey) * (zor ? 1.15 : 1),
    lfoHz: (c && p.calisma.lfoHz ? p.calisma.lfoHz : al(p.lfo)) * (zor ? 1.4 : 1),
    lfoDerinlik: kirp(al(p.lfoDerinlik) + c * p.calisma.lfoDerinlik + zor * 0.15, 0, 0.7),
    gurultuF: al(p.gurultu.f),
    gurultuQ: p.gurultu.q,
    gurultuDuzey: al(p.gurultu.duzey) + c * p.calisma.gurultu,
  };
}
