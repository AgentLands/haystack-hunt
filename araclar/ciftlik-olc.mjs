/**
 * Çiftlik ölçümü. (1) Node benzetim maliyeti. Standart çiftlik: 4 huni hattı (huni + 8 bant +
 * sandık;
 * huniler yığın kenarında, tarlayı sürekli kirletir) + 36 halka bant (8×6, her birinde
 * 56 eşya): ~900 parça, ~2000 eşya. 10.000 tikin süresini yazar; hedef ≤ 1500 ms.
 *   node araclar/ciftlik-olc.mjs [--tik N]
 * tests/ciftlik-olcum.test.js aynı kurulumu gevşek tavanla (O(n²) gerilemesi) koşar.
 * (2) Telefon ölçütü: aynı sahne (tests/ciftlik-sahne.mjs) gerçek tarayıcıda, telefon
 * ekranı (390×844, dokunmatik, DPR 2) ve CPU 4× yavaşlatmayla kurulur; yakın (z 3,5) ve uzak
 * (z 1) görünümde kare süresi (rAF aralığı), çiftlik katmanı süresi (ciftlikOlcum.ms) ve
 * saniyedeki benzetim tiki ölçülür. Hedefler: katman ≤ 4 ms (H1 kabul), 20 tik/sn korunur.
 *   node araclar/ciftlik-olc.mjs --telefon [--yavas 4] [--port 8563] [--bilgi]
 * Çıkış kodu: hedef aşılırsa 1 (--bilgi ile her zaman 0). Başsız Chromium yazılım çizimi
 * kullanır: mutlak ms gerçek telefondan farklıdır, aynı makinedeki gerilemeyi yakalar.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tikAt } from '../js/kural/ciftlik/benzetim.js';
import { dunya, duzTarla } from '../tests/ciftlik-yardim.mjs';
import { sahneTarlasi, sahneKur } from '../tests/ciftlik-sahne.mjs';

export const HEDEF_MS = 1500;

/** Standart ölçüm çiftliği: { c, tarla, parca, esya } (kurulum tests/ciftlik-sahne.mjs). */
export function standartCiftlik() {
  const tarla = duzTarla();
  tarla.h.set(sahneTarlasi());
  const { c } = dunya(5, tarla);
  const { parca, esya } = sahneKur(c, tarla);
  return { c, tarla, parca, esya };
}

/** Sandıkları boşaltır (huniler hiç durmasın, tarla sürekli kirlensin). */
function bosalt(c) {
  for (const p of c.parcalar.values()) if (p.tanim.anahtar === 'sandik') p.tanim.kur(p);
}

/** n tik koşar; süreyi (ms), son durumu ve hunilerin çalıştığı tik oranını döndürür. */
export function olc(n = 10000) {
  const d = standartCiftlik();
  const huniler = [...d.c.parcalar.values()].filter((p) => p.tanim.anahtar === 'huni');
  let calisan = 0;
  const bas = performance.now();
  for (let i = 0; i < n; i++) {
    if (i % 500 === 0) bosalt(d.c);
    tikAt(d.c, d.tarla);
    if (huniler.every((p) => p.ozel.son > 0)) calisan += 1;
  }
  const ms = performance.now() - bas;
  const esya = d.c.hatlar.reduce((s, h) => s + h.n, 0);
  return {
    ms, tikUs: (ms / n) * 1000, parca: d.parca, esyaBas: d.esya, esyaSon: esya, d,
    huniOrani: calisan / n,
  };
}

/** Komut satırı bayrağı değeri (yoksa null). */
const bayrak = (ad) => {
  const i = process.argv.indexOf(`--${ad}`);
  return i > 0 ? process.argv[i + 1] : null;
};

async function ana() {
  if (process.argv.includes('--telefon')) {
    const sonuc = await telefonOlc({
      yavas: Number(bayrak('yavas') || 4), port: Number(bayrak('port') || 0),
    });
    for (const ad of ['yakin', 'uzak']) {
      const r = sonuc[ad];
      console.log(`${ad}: kare p50 ${r.kareP50.toFixed(1)} / p95 ${r.kareP95.toFixed(1)} ms, `
        + `katman p50 ${r.katmanP50.toFixed(1)} / p95 ${r.katmanP95.toFixed(1)} ms, `
        + `${r.tikSn.toFixed(1)} tik/sn, çizilen eşya ${r.esya}, hareketli parça ${r.parca}`
        + (r.kuruldu ? `, kurulan ${r.kuruldu.parca} parça (atlanan ${r.kuruldu.atlanan})` : ''));
    }
    const sorun = telefonSorunlari(sonuc);
    console.log(sorun.length ? `TELEFON HEDEFİ AŞILDI: ${sorun.join('; ')}`
      : 'TELEFON HEDEFİ TAMAM');
    if (sorun.length && !process.argv.includes('--bilgi')) process.exitCode = 1;
    return;
  }
  const n = bayrak('tik') ? Number(bayrak('tik')) : 10000;
  const s = olc(n);
  const kirli = Array.from(s.d.c.kirli).filter(Boolean).length;
  console.log(`${n} tik: ${s.ms.toFixed(0)} ms (tik başına ${s.tikUs.toFixed(1)} µs), `
    + `${s.parca} parça, ${s.esyaBas} → ${s.esyaSon} eşya, 4 huni tiklerin `
    + `%${Math.round(s.huniOrani * 100)}'inde çalıştı, kirli bölge ${kirli}; `
    + `hedef ≤ ${HEDEF_MS} ms: ${s.ms <= HEDEF_MS ? 'TAMAM' : 'AŞILDI'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) ana();

/** Telefon ölçütü hedefleri (H1 kabul + 20 Hz benzetim). */
export const TELEFON_HEDEF = { katmanMs: 4, tikSn: 18 };

const yuzde = (dizi, q) => {
  const s = [...dizi].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))] ?? 0;
};

/** Sayfada: sahneyi kurar, kamerayı z'ye getirir, 240 kare ölçer. Tarayıcıda çalışır. */
async function sayfadaOlc({ z, kur }) {
  const { durumAl } = window.__e2e;
  const d = durumAl();
  const sahne = await import('./tests/ciftlik-sahne.mjs');
  const { ciftlikOlcum } = await import('./js/ozellik/ciftlik/gorsel/katman.js');
  let kuruldu = null;
  if (kur) {
    d.tarla.h.set(sahne.sahneTarlasi());
    d.tarla.kirli = true;
    kuruldu = sahne.sahneKur(d.ciftlik, d.tarla, { toleransli: true });
    (await import('./js/ozellik/ciftlik/gorsel/bolge.js')).bolgeKirlet(0, 0, 120, 80);
  }
  const { gorunum, gorunumAyarla } = await import('./js/gorunum.js');
  const { odakla } = await import('./js/kural/gorunum.js');
  (await import('./js/ozellik/kamera-takip.js')).takipBirak();
  gorunumAyarla(odakla({ ...gorunum, gx: 40, gy: 20 }, 0.5, 0.5, z));
  await new Promise((coz) => setTimeout(coz, 500));
  ciftlikOlcum.ornekler = [];
  const farklar = [];
  const tik0 = d.ciftlik.tik;
  const t0 = performance.now();
  await new Promise((coz) => {
    let son = performance.now();
    let k = 0;
    const f = (t) => {
      farklar.push(t - son);
      son = t;
      if (++k >= 240) coz();
      else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const sn = (performance.now() - t0) / 1000;
  const katman = ciftlikOlcum.ornekler;
  ciftlikOlcum.ornekler = null;
  return {
    kuruldu, farklar: farklar.slice(1), katman, tikSn: (d.ciftlik.tik - tik0) / sn,
    esya: ciftlikOlcum.esya, parca: ciftlikOlcum.parca,
  };
}

/** Telefon ölçütünü koşar; sonuç nesnesini yazıp döndürür. */
export async function telefonOlc({ yavas = 4, port = 0 } = {}) {
  const o = createRequire(import.meta.url)('../tests/e2e/ortak.cjs');
  const sunucu = await o.sunucuAc(port);
  const tarayici = await o.tarayiciAc();
  const sonuc = {};
  try {
    const { sayfa, hatalar } = await o.sayfaYarat(tarayici, {
      viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
    });
    await sayfa.addInitScript(() => localStorage.setItem('haystack-hunt:rehber-goruldu', '1'));
    await o.yavaslat(sayfa, yavas);
    await o.git(sayfa, `${sunucu.kok}?mod=ciftlik`);
    for (const [ad, z, kur] of [['yakin', 3.5, true], ['uzak', 1, false]]) {
      const r = await sayfa.evaluate(sayfadaOlc, { z, kur });
      sonuc[ad] = {
        kareP50: yuzde(r.farklar, 0.5), kareP95: yuzde(r.farklar, 0.95),
        katmanP50: yuzde(r.katman, 0.5), katmanP95: yuzde(r.katman, 0.95),
        tikSn: r.tikSn, esya: r.esya, parca: r.parca, kuruldu: r.kuruldu,
      };
    }
    sonuc.hatalar = hatalar;
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }
  return sonuc;
}

/** Telefon sonucunun hedefi aşan satırları (boşsa temiz). */
export function telefonSorunlari(sonuc) {
  const sorun = [];
  for (const ad of ['yakin', 'uzak']) {
    const r = sonuc[ad];
    if (r.katmanP50 > TELEFON_HEDEF.katmanMs) {
      sorun.push(`${ad}: katman p50 ${r.katmanP50.toFixed(1)} ms`);
    }
    if (r.tikSn < TELEFON_HEDEF.tikSn) sorun.push(`${ad}: ${r.tikSn.toFixed(1)} tik/sn`);
  }
  if (sonuc.hatalar.length) sorun.push(`sayfa hataları: ${JSON.stringify(sonuc.hatalar)}`);
  return sorun;
}
