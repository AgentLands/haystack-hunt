/**
 * Ses motoru: WebAudio ile sentez (gürültü tamponu + filtre, osilatör, zarf).
 * Tek çıkış zinciri: kaynak → kategori kazancı (makine, motor, arac, ipucu, ortam, arayuz)
 * → ana kazanç (ses düzeyi ve sessiz) → yumuşak sıkıştırıcı → hızlı limiter → yumuşak kırpıcı.
 * Kategori seviyeleri ses-seviye.js'te. AudioContext ilk kullanıcı hareketinde `uyandir()` ile
 * kurulur; öncesinde çalma istekleri sessizce atlanır.
 */
import { bipDeseni, bipZamanlari, BULUNDU_MELODISI, PES_NOTALARI } from './ses-desen.js';
import {
  ANA_KAZANC, KATEGORI_DB, duzeyKazanci, kategoriKazanci, sapmali, yumusakKirpmaEgrisi,
} from './ses-seviye.js';

let ctx = null;
let ana = null;
let gurultu = null;
let sessiz = false;
let anaDuzey = 100;
let kazimPerde = 1;
const katlar = new Map();

const anaHedef = () => (sessiz ? 0 : ANA_KAZANC * duzeyKazanci(anaDuzey));

function sikistirici({ esik, diz, oran, atak, birakma }) {
  const k = ctx.createDynamicsCompressor();
  k.threshold.value = esik;
  k.knee.value = diz;
  k.ratio.value = oran;
  k.attack.value = atak;
  k.release.value = birakma;
  return k;
}

/** Çıkış zincirini kurar; dönen düğüm ana kazançtır. */
function zincirKur() {
  const sikistir = sikistirici({ esik: -18, diz: 24, oran: 3, atak: 0.008, birakma: 0.25 });
  const limiter = sikistirici({ esik: -4, diz: 0, oran: 20, atak: 0.002, birakma: 0.1 });
  const kirpici = ctx.createWaveShaper();
  kirpici.curve = yumusakKirpmaEgrisi();
  kirpici.oversample = '2x';
  const kazanc = ctx.createGain();
  kazanc.gain.value = anaHedef();
  kazanc.connect(sikistir).connect(limiter).connect(kirpici).connect(ctx.destination);
  for (const kat of Object.keys(KATEGORI_DB)) {
    const g = ctx.createGain();
    g.gain.value = kategoriKazanci(kat);
    g.connect(kazanc);
    katlar.set(kat, g);
  }
  return kazanc;
}

/** Kategorinin giriş düğümü; bilinmeyen kategori hata verir (yazım yanlışı sessiz kalmasın). */
function katDugumu(kat) {
  const g = katlar.get(kat);
  if (!g) throw new Error(`Bilinmeyen ses kategorisi: ${kat}`);
  return g;
}

/** AudioContext'i oluşturur/devam ettirir (kullanıcı hareketi içinde çağrılmalı). */
export function uyandir() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return false;
  if (!ctx) {
    ctx = new Ctor();
    ana = zincirKur();
    gurultu = gurultuTamponu(ctx);
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch((hata) => console.error('Ses sürdürülemedi:', hata));
  }
  return true;
}

function anaGuncelle() {
  if (ana) ana.gain.setTargetAtTime(anaHedef(), ctx.currentTime, 0.04);
}

export function sessizAyarla(deger) {
  sessiz = deger;
  anaGuncelle();
}

/** Ana ses düzeyi 0-100 (ses.js'teki kaydırıcı). */
export function duzeyAyarla(yuzde) {
  anaDuzey = yuzde;
  anaGuncelle();
}

export function hazirMi() {
  return Boolean(ctx) && ctx.state === 'running' && !sessiz;
}

/**
 * Sürekli sesler (makine motoru) için ses bağlamı; çalmaya hazır değilse null. `ana`: çıkış
 * düğümü, o sürekli sesin kategorisinin girişi (varsayılan 'motor').
 */
export function baglam(kat = 'motor') {
  return hazirMi() ? { ctx, ana: katDugumu(kat), gurultu } : null;
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
export function hisirti(o) {
  const { sure, duzey, f0, f1 = f0, q = 1, atak = 0.01, gecikme = 0, kat = 'ipucu' } = o;
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
  kaynak.connect(filtre).connect(kazanc).connect(katDugumu(kat));
  kaynak.start(t, kaynak.loopStart);
  kaynak.stop(t + sure + 0.05);
}

/** Zarflı osilatör notası. */
export function nota(o) {
  const { frekans, sure, duzey, dalga = 'sine', gecikme = 0, atak = 0.008, bitisFrekans } = o;
  const kat = o.kat || 'ipucu';
  const t = ctx.currentTime + gecikme;
  const osc = ctx.createOscillator();
  osc.type = dalga;
  osc.frequency.setValueAtTime(frekans, t);
  if (bitisFrekans) osc.frequency.exponentialRampToValueAtTime(bitisFrekans, t + sure);
  const kazanc = ctx.createGain();
  kazanc.gain.setValueAtTime(0.0001, t);
  kazanc.gain.exponentialRampToValueAtTime(Math.max(duzey, 0.0002), t + atak);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  osc.connect(kazanc).connect(katDugumu(kat));
  osc.start(t);
  osc.stop(t + sure + 0.05);
}

/** Kazı hışırtısının perdesi (akış: 1 sakin, hafifçe üstü akıcı ritim). */
export function kazimPerdesi(oran) {
  kazimPerde = oran;
}

/** Kazı hışırtısı: her tıkta perde, süre ve düzey biraz sapar (makineli tüfek olmasın). */
export function kazimSesi(duzey) {
  if (!hazirMi()) return;
  const perde = kazimPerde * sapmali(1, 0.12);
  hisirti({
    sure: sapmali(0.11, 0.2), duzey: 0.5 * duzey * sapmali(1, 0.18), f0: 2200 * perde,
    f1: 1200 * perde * sapmali(1, 0.1), q: sapmali(0.8, 0.2), kat: 'arac',
  });
}

export function tirmikSesi() {
  if (!hazirMi()) return;
  hisirti({ sure: sapmali(0.3, 0.1), duzey: 0.6 * sapmali(1, 0.12), f0: sapmali(900, 0.1),
    f1: sapmali(2200, 0.1), q: 0.6, atak: 0.06, kat: 'arac' });
}

export function dedektorSesi(seviye) {
  if (!hazirMi()) return;
  const desen = bipDeseni(seviye);
  for (const ms of bipZamanlari(desen)) {
    nota({
      frekans: desen.frekans, sure: desen.sureMs / 1000, duzey: desen.duzey * 0.44,
      dalga: desen.dalga, gecikme: ms / 1000,
    });
  }
}

export function dedektorBosSesi() {
  if (!hazirMi()) return;
  nota({ frekans: 150, bitisFrekans: 95, sure: 0.28, duzey: 0.28, dalga: 'sawtooth' });
}

export function pariltiSesi() {
  if (!hazirMi()) return;
  for (const [f, g] of [[2093, 0], [3136, 0.07]]) {
    nota({ frekans: f, sure: 1.1, duzey: 0.09, gecikme: g, atak: 0.004 });
  }
  nota({ frekans: 4186, sure: 0.7, duzey: 0.03, gecikme: 0.03, atak: 0.004 });
}

export function igneSesi() {
  if (!hazirMi()) return;
  nota({ frekans: 1760, sure: 0.8, duzey: 0.16, atak: 0.002 });
  nota({ frekans: 1760 * 2.76, sure: 0.35, duzey: 0.065, atak: 0.002 });
  nota({ frekans: 1760 * 5.4, sure: 0.15, duzey: 0.03, atak: 0.002 });
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
  nota({ frekans: 900, bitisFrekans: 600, sure: 0.04, duzey: 0.1, atak: 0.002, kat: 'arayuz' });
}
