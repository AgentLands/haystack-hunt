/**
 * Ses motoru: WebAudio ile sentez (gürültü tamponu + filtre, osilatör, zarf).
 * Ana kazanç + hafif kompresör üzerinden çıkar. AudioContext ilk kullanıcı hareketinde
 * `uyandir()` ile kurulur; öncesinde çalma istekleri sessizce atlanır.
 */
import { bipDeseni, bipZamanlari, BULUNDU_MELODISI, PES_NOTALARI } from './ses-desen.js';

const ANA_DUZEY = 0.55;
let ctx = null;
let ana = null;
let gurultu = null;
let sessiz = false;

/** AudioContext'i oluşturur/devam ettirir (kullanıcı hareketi içinde çağrılmalı). */
export function uyandir() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return false;
  if (!ctx) {
    ctx = new Ctor();
    const kompresor = ctx.createDynamicsCompressor();
    kompresor.threshold.value = -20;
    kompresor.knee.value = 24;
    kompresor.ratio.value = 4;
    kompresor.attack.value = 0.005;
    kompresor.release.value = 0.2;
    ana = ctx.createGain();
    ana.gain.value = sessiz ? 0 : ANA_DUZEY;
    ana.connect(kompresor).connect(ctx.destination);
    gurultu = gurultuTamponu(ctx);
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch((hata) => console.error('Ses sürdürülemedi:', hata));
  }
  return true;
}

export function sessizAyarla(deger) {
  sessiz = deger;
  if (ana) ana.gain.setTargetAtTime(deger ? 0 : ANA_DUZEY, ctx.currentTime, 0.04);
}

function hazirMi() {
  return ctx && ctx.state === 'running' && !sessiz;
}

function gurultuTamponu(c) {
  const tampon = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
  const veri = tampon.getChannelData(0);
  let onceki = 0;
  for (let i = 0; i < veri.length; i++) {
    onceki = 0.7 * onceki + 0.3 * (Math.random() * 2 - 1); // hafif kahverengimsi gürültü
    veri[i] = onceki * 2;
  }
  return tampon;
}

/** Zarflı gürültü darbesi: bant geçiren filtre, frekans taraması isteğe bağlı. */
function hisirti({ sure, duzey, f0, f1 = f0, q = 1, atak = 0.01, gecikme = 0 }) {
  const t = ctx.currentTime + gecikme;
  const kaynak = ctx.createBufferSource();
  kaynak.buffer = gurultu;
  kaynak.loopStart = Math.random() * 0.5;
  kaynak.loop = true;
  const filtre = ctx.createBiquadFilter();
  filtre.type = 'bandpass';
  filtre.Q.value = q;
  filtre.frequency.setValueAtTime(f0, t);
  filtre.frequency.exponentialRampToValueAtTime(f1, t + sure);
  const kazanc = ctx.createGain();
  kazanc.gain.setValueAtTime(0.0001, t);
  kazanc.gain.exponentialRampToValueAtTime(Math.max(duzey, 0.0002), t + atak);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  kaynak.connect(filtre).connect(kazanc).connect(ana);
  kaynak.start(t, kaynak.loopStart);
  kaynak.stop(t + sure + 0.05);
}

/** Zarflı osilatör notası. */
function nota({ frekans, sure, duzey, dalga = 'sine', gecikme = 0, atak = 0.008, bitisFrekans }) {
  const t = ctx.currentTime + gecikme;
  const osc = ctx.createOscillator();
  osc.type = dalga;
  osc.frequency.setValueAtTime(frekans, t);
  if (bitisFrekans) osc.frequency.exponentialRampToValueAtTime(bitisFrekans, t + sure);
  const kazanc = ctx.createGain();
  kazanc.gain.setValueAtTime(0.0001, t);
  kazanc.gain.exponentialRampToValueAtTime(Math.max(duzey, 0.0002), t + atak);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  osc.connect(kazanc).connect(ana);
  osc.start(t);
  osc.stop(t + sure + 0.05);
}

export function kazimSesi(duzey) {
  if (!hazirMi()) return;
  hisirti({ sure: 0.11, duzey: 0.5 * duzey, f0: 2400 + Math.random() * 900, f1: 1400, q: 0.8 });
}

export function tirmikSesi() {
  if (!hazirMi()) return;
  hisirti({ sure: 0.3, duzey: 0.45, f0: 900, f1: 2200, q: 0.6, atak: 0.06 });
}

export function dedektorSesi(seviye) {
  if (!hazirMi()) return;
  const desen = bipDeseni(seviye);
  for (const ms of bipZamanlari(desen)) {
    nota({
      frekans: desen.frekans, sure: desen.sureMs / 1000, duzey: desen.duzey * 0.35,
      dalga: desen.dalga, gecikme: ms / 1000,
    });
  }
}

export function dedektorBosSesi() {
  if (!hazirMi()) return;
  nota({ frekans: 150, bitisFrekans: 95, sure: 0.28, duzey: 0.4, dalga: 'sawtooth' });
}

export function pariltiSesi() {
  if (!hazirMi()) return;
  for (const [f, g] of [[2093, 0], [3136, 0.07]]) {
    nota({ frekans: f, sure: 1.1, duzey: 0.14, gecikme: g, atak: 0.004 });
  }
  nota({ frekans: 4186, sure: 0.7, duzey: 0.05, gecikme: 0.03, atak: 0.004 });
}

export function igneSesi() {
  if (!hazirMi()) return;
  nota({ frekans: 1760, sure: 0.8, duzey: 0.25, atak: 0.002 });
  nota({ frekans: 1760 * 2.76, sure: 0.35, duzey: 0.1, atak: 0.002 });
  nota({ frekans: 1760 * 5.4, sure: 0.15, duzey: 0.05, atak: 0.002 });
}

export function bulunduSesi() {
  if (!hazirMi()) return;
  for (const [f, bas, sure] of BULUNDU_MELODISI) {
    nota({ frekans: f, sure: sure / 1000, duzey: 0.28, dalga: 'triangle', gecikme: bas / 1000 });
    nota({ frekans: f * 2, sure: sure / 1000, duzey: 0.08, gecikme: bas / 1000 });
  }
}

export function pesSesi() {
  if (!hazirMi()) return;
  for (const [f, bas, sure] of PES_NOTALARI) {
    nota({ frekans: f, sure: sure / 1000, duzey: 0.3, dalga: 'triangle', gecikme: bas / 1000 });
  }
}

export function tikSesi() {
  if (!hazirMi()) return;
  nota({ frekans: 900, bitisFrekans: 600, sure: 0.04, duzey: 0.1, atak: 0.002 });
}
