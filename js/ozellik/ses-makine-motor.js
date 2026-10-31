/**
 * Sürekli makine motoru sesi: iki osilatör + alçak geçiren filtre + vuruş (LFO) ve filtreli
 * gürültüden oluşan bir düğüm grafiği. Düğümler bir kez kurulur; her güncellemede yalnız
 * parametreler yumuşakça (setTargetAtTime) değiştirilir. durdur() perdeyi düşürüp söner.
 */
import { baglam } from './ses-motor.js';

const GECIS = 0.08; // parametre yumuşatma zaman sabiti (sn)
const SONME_SURESI = 0.55;

/** Bir parametreyi hedefe yumuşakça götürür. */
const git = (param, deger, t, tau = GECIS) => param.setTargetAtTime(deger, t, tau);

/**
 * Motor sesi kurar; ses bağlamı hazır değilse null. Dönen nesne:
 * { guncelle(desen), durdur() } (desen: ses-makine-desen.js motorDeseni çıktısı).
 */
export function motorKur(desen) {
  const b = baglam();
  if (!b) return null;
  const { ctx, ana, gurultu } = b;
  const t0 = ctx.currentTime;
  const cikis = ctx.createGain();
  cikis.gain.value = 0;
  cikis.connect(ana);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = desen.dalga1;
  osc2.type = desen.dalga2;
  // Marş sonrası ateşleme: perde alçaktan başlayıp hedefe çıkar.
  osc1.frequency.setValueAtTime(desen.frekans * 0.45, t0);
  osc2.frequency.setValueAtTime(desen.altFrekans * 0.45, t0);
  osc1.frequency.setTargetAtTime(desen.frekans, t0, 0.18);
  osc2.frequency.setTargetAtTime(desen.altFrekans, t0, 0.18);
  const karisim1 = ctx.createGain();
  const karisim2 = ctx.createGain();
  karisim1.gain.value = 0.55;
  karisim2.gain.value = 0.4;
  const suzgec = ctx.createBiquadFilter();
  suzgec.type = 'lowpass';
  suzgec.Q.value = 1.1;
  suzgec.frequency.value = desen.kesim;
  const vurus = ctx.createGain(); // genlik = 1 + lfo·derinlik
  vurus.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = desen.lfoHz;
  const lfoDerinlik = ctx.createGain();
  lfoDerinlik.gain.value = desen.lfoDerinlik;
  lfo.connect(lfoDerinlik).connect(vurus.gain);
  osc1.connect(karisim1).connect(suzgec);
  osc2.connect(karisim2).connect(suzgec);
  suzgec.connect(vurus).connect(cikis);

  const kaynak = ctx.createBufferSource();
  kaynak.buffer = gurultu;
  kaynak.loop = true;
  const bant = ctx.createBiquadFilter();
  bant.type = 'bandpass';
  bant.frequency.value = desen.gurultuF;
  bant.Q.value = desen.gurultuQ;
  const gurultuKazanc = ctx.createGain();
  gurultuKazanc.gain.value = desen.gurultuDuzey;
  kaynak.connect(bant).connect(gurultuKazanc).connect(cikis);

  git(cikis.gain, desen.duzey, t0, 0.22); // yavaşça açılır
  for (const k of [osc1, osc2, lfo, kaynak]) k.start(t0);

  let canli = true;
  return {
    guncelle(d) {
      if (!canli) return;
      const t = ctx.currentTime;
      const tau = t - t0 < 0.6 ? 0.2 : GECIS; // açılışta ateşleme yavaş oturur
      git(osc1.frequency, d.frekans, t, tau);
      git(osc2.frequency, d.altFrekans, t, tau);
      git(suzgec.frequency, d.kesim, t);
      git(cikis.gain, d.duzey, t, tau);
      git(lfo.frequency, d.lfoHz, t);
      git(lfoDerinlik.gain, d.lfoDerinlik, t);
      git(bant.frequency, d.gurultuF, t);
      git(gurultuKazanc.gain, d.gurultuDuzey, t);
    },
    /** Perde düşerek ve düzey sönerek durur; düğümler sonra çözülür. */
    durdur(hizli = false) {
      if (!canli) return;
      canli = false;
      const t = ctx.currentTime;
      const sure = hizli ? 0.05 : SONME_SURESI;
      for (const o of [osc1, osc2]) {
        o.frequency.cancelScheduledValues(t);
        o.frequency.setValueAtTime(o.frequency.value, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(12, o.frequency.value * 0.3), t + sure);
      }
      cikis.gain.cancelScheduledValues(t);
      cikis.gain.setValueAtTime(cikis.gain.value, t);
      cikis.gain.linearRampToValueAtTime(0, t + sure);
      for (const k of [osc1, osc2, lfo, kaynak]) k.stop(t + sure + 0.05);
      osc1.onended = () => cikis.disconnect();
    },
  };
}
