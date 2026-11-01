/**
 * Çiftlik üst şeridi (#tarla-kap içinde, yalnız çiftlik modunda): kuruş (artınca "+N"),
 * hava (şimdi + sonraki 3 dilim: gök, rüzgâr oku ve şiddet noktaları), sıradaki damga (defteri
 * açar), sorun sayısı (listeyi açar) ve Pano düğmesi. Normal moddaki süre ve saman etiketi
 * çiftlikte gizlidir (hud.css). Bu modül çiftlik durumunu saniyede dört kez yoklar ve
 * 'ciftlik-hud' olayıyla yayar; pano, sorun listesi ve defter o olayı dinler (birbirini
 * içe aktarmaz). Düğmeler 'ciftlik-ekran-ac' yayar. Veri: sap.js (G ve D gelince gerçek).
 */
import { dinle, yay } from '../../olaylar.js';
import { ekonomiAl, havaAl } from './sap.js';
import { havaSatiri, havaAnahtari, kurusMetni, TAHMIN_DILIM } from './hud-veri.js';
import { sorunlariTopla } from './sorun-veri.js';
import { simge, GOK_SIMGE } from './simge.js';
import { yap, dugme, tuvalKap } from './yap.js';
import { stilYukle } from '../pencere.js';

stilYukle('./ciftlik/hud.css');

/** Yoklama aralığı (ms) ve kuruş farkının ekranda kalma süresi. */
const YOKLA_MS = 250;
const FARK_MS = 2200;
/** Söküm iadesinin sayılmayacağı süre (ms): sökümle aynı yoklamada gelen artış. */
const IADE_MS = 600;

const serit = yap('div', 'cf-serit');
serit.setAttribute('role', 'region');
serit.setAttribute('aria-label', 'Çiftlik durumu');

// --- Kuruş ---
const kurusKutu = yap('div', 'cf-hucre cf-kurus');
kurusKutu.title = 'Kuruş';
const kurusSayi = yap('strong', 'sayi', '0');
const kurusFark = yap('span', 'cf-fark');
kurusFark.setAttribute('aria-hidden', 'true');
kurusKutu.append(simge('kurus', 20), kurusSayi, kurusFark);

// --- Hava: şimdi + 3 dilim ---
const havaKutu = yap('div', 'cf-hucre cf-hava');
havaKutu.setAttribute('role', 'img');
const havaHucreleri = Array.from({ length: TAHMIN_DILIM + 1 }, (_, k) => {
  const h = yap('span', k ? 'cf-hv' : 'cf-hv simdi');
  h.dataset.etiket = k ? `+${k}` : 'şimdi';
  const ok = simge('ok', 15);
  const gok = yap('span', 'cf-hv-gok');
  const nokta = yap('span', 'cf-hv-nokta');
  for (let i = 0; i < 3; i++) nokta.append(yap('i'));
  h.append(ok, gok, nokta);
  havaKutu.append(h);
  return { h, ok, gok, nokta };
});

// --- Damga, sorun, pano ---
const damgaDugme = dugme('cf-hucre cf-damga-dugme', '', 'Damga defterini aç',
  () => yay('ciftlik-ekran-ac', { ad: 'damga' }));
const damgaKod = yap('b', 'cf-damga-kod');
const damgaAd = yap('span', 'cf-damga-ad');
damgaDugme.append(simge('damga', 20), damgaKod, damgaAd);

const sorunDugme = dugme('cf-dugme cf-sorun', '', 'Sorun listesi',
  () => yay('ciftlik-ekran-ac', { ad: 'sorun' }));
const sorunRozet = yap('b', 'cf-rozet', '0');
sorunDugme.append(simge('uyari', 22), sorunRozet);

const panoDugme = dugme('cf-dugme cf-pano-dugme', '', 'Pano: siparişler',
  () => yay('ciftlik-ekran-ac', { ad: 'pano' }));
panoDugme.setAttribute('data-ciftlik-pano-dugme', '');
panoDugme.append(simge('pano', 22), yap('span', 'cf-dugme-yazi', 'Pano'));

serit.append(kurusKutu, havaKutu, damgaDugme, sorunDugme, panoDugme);
tuvalKap().append(serit);

// --- Güncelleme ---
const yazici = (yaz) => {
  let onceki;
  return (d) => {
    if (d !== onceki) {
      onceki = d;
      yaz(d);
    }
  };
};
const kurusYaz = yazici((m) => { kurusSayi.textContent = m; });
function havaCiz(satir) {
  satir.forEach((h, k) => {
    const o = havaHucreleri[k];
    o.ok.style.setProperty('--yon', `${h.yon * 90}deg`);
    o.ok.classList.toggle('durgun', h.siddet === 0);
    o.gok.replaceChildren(simge(GOK_SIMGE[h.gok], 15));
    [...o.nokta.children].forEach((n, i) => n.classList.toggle('dolu', i < h.siddet));
    o.h.title = h.metin;
  });
  havaKutu.setAttribute('aria-label', `Hava: ${satir.map((h) => h.metin).join('; ')}`);
}
const damgaYaz = yazici((anahtar) => {
  const [kod, ad] = anahtar.split('|');
  damgaKod.textContent = kod || 'Usta';
  damgaAd.textContent = ad;
  damgaDugme.title = kod ? `Sıradaki damga: ${kod} ${ad}` : 'Damga defteri';
});
const sorunYaz = yazici((n) => {
  sorunRozet.textContent = String(n);
  sorunDugme.classList.toggle('bos', n === 0);
  sorunDugme.setAttribute('aria-label', n ? `${n} sorun var` : 'Sorun yok');
});

let sonKurus = null;
let sonHava = '';
let farkZamani = 0;
let farkBirikim = 0;
let sokZamani = -Infinity;

/** Farkı kuruş kutusunda gösterir: artış yeşil "+N", harcama kırmızı "−N". */
function farkGoster(fark) {
  const yeniMi = performance.now() - farkZamani > FARK_MS
    || Math.sign(fark) !== Math.sign(farkBirikim);
  farkBirikim = yeniMi ? fark : farkBirikim + fark;
  farkZamani = performance.now();
  kurusFark.textContent = `${farkBirikim > 0 ? '+' : '−'}${kurusMetni(Math.abs(farkBirikim))}`;
  kurusFark.classList.toggle('harca', farkBirikim < 0);
  kurusFark.classList.remove('gor');
  void kurusFark.offsetWidth;
  kurusFark.classList.add('gor');
}

/**
 * Kuruş değişince fark gösterilir; artış 'ciftlik-kurus' yayar (ses dinler). Söküm iadesi
 * (parça sökülür sökülmez gelen artış) kazanç sayılmaz: gösterilmez, ses çalmaz.
 */
function kurusFarki(kurus) {
  if (sonKurus !== null && kurus !== sonKurus) {
    const iade = kurus > sonKurus && performance.now() - sokZamani < IADE_MS;
    if (!iade) farkGoster(kurus - sonKurus);
    if (kurus > sonKurus && !iade) yay('ciftlik-kurus', { fark: kurus - sonKurus, kurus });
  }
  sonKurus = kurus;
}

/** Çiftliği bir kez okur, şeridi günceller ve 'ciftlik-hud' olayını yayar. */
export function hudYokla(durum) {
  const eko = ekonomiAl(durum);
  const sira = eko.damgalar.find((d) => d.kod === eko.siradaki);
  kurusYaz(kurusMetni(eko.kurus));
  kurusFarki(eko.kurus);
  damgaYaz(sira ? `${sira.kod}|${sira.ad}` : '|');
  const satir = havaSatiri(durum.ciftlik, havaAl);
  const anahtar = havaAnahtari(satir) + satir[0].dilim;
  if (anahtar !== sonHava) {
    sonHava = anahtar;
    havaCiz(satir);
  }
  const { sorunlar, bekleyenler } = sorunlariTopla(durum.ciftlik);
  sorunYaz(sorunlar.length);
  yay('ciftlik-hud', { eko, hava: satir, sorunlar, bekleyenler });
}

let sonYokla = -Infinity;
dinle('kare', ({ zaman, durum }) => {
  if (durum.mod !== 'ciftlik' || zaman - sonYokla < YOKLA_MS) return;
  sonYokla = zaman;
  hudYokla(durum);
});
dinle('parca-sokuldu', () => {
  sokZamani = performance.now();
});
dinle('ciftlik-acildi', ({ durum }) => {
  sonKurus = null;
  sonYokla = -Infinity;
  hudYokla(durum);
});
