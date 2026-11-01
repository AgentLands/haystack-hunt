/**
 * İnşa paleti (docs/ciftlik/arayuz.md §2, §9): kâğıt tabla. Üstte eylem şeridi (seçili
 * parça, ⟳ döndür, ✂ sil, kayıtlı kiplerin düğmeleri (I2: ▢ seç), ✕), aile sekmeleri
 * (yalnız parçası olan aileler; sekme kart şeridini o ailenin başına kaydırır, kaydırınca
 * etkin sekme izlenir) ve başında hızlı çubuk (son kullanılan 9 parça, masaüstünde 1-9;
 * telefonda 4), altta yatay kaydırmalı 64 px kartlar: simge (parçanın kendi gövde çizimi),
 * ad, fiyat. Kuruş yetmezse kart soluk ve fiyat kırmızı; kilitli parça gri siluet + damga
 * ("D4'te açılır"), seçilemez. Karta uzun bas / fareyle bekle: ayrıntı kâğıdı (ne işe
 * yarar, kapılar, boyut, enerji, sorduğu soru: tanımın `aciklama`, `soru` alanları).
 * Kartlar parcaTurleri()'nden kendiliğinden üretilir. Palet kapalıyken çiftlikte "İnşa (B)"
 * düğmesi görünür. Masaüstünde tuvalin altına, telefonda alet rafının yerine (kumanda
 * tablasının üstü) oturur; açıkken gövdede `ciftlik-insa` sınıfı vardır.
 */
import { parcaTurleri, AILELER } from '../../kural/ciftlik/parca-kayit.js';
import { durumAl } from '../../oyun.js';
import { bildir } from '../../arayuz.js';
import { dinle } from '../../olaylar.js';
import {
  insa, insaDinle, paletAc, sec, dondur, kipAc, kipDugmeleri, kaynak, HIZLI_EN_COK,
} from './insa.js';
import { simgeCiz } from './parca-simge.js';
import { ayrintiKur } from './palet-ayrinti.js';

const AILE_ADI = { toplama: 'Topla', tasima: 'Taşı', ayiklama: 'Ayıkla', isleme: 'İşle',
  depo: 'Depo', enerji: 'Enerji', mantik: 'Mantık' };

function dugme(sinif, metin, baslik, tikla) {
  const d = document.createElement('button');
  d.type = 'button';
  d.className = sinif;
  d.textContent = metin;
  if (baslik) {
    d.title = baslik;
    d.setAttribute('aria-label', baslik);
  }
  d.addEventListener('click', tikla);
  d.addEventListener('pointerup', () => d.blur());
  return d;
}

function oge(etiket, sinif) {
  const o = document.createElement(etiket);
  o.className = sinif;
  return o;
}

const ac = dugme('ciftlik-insa-ac dugme-birincil', 'İnşa', 'İnşa paleti (B)', () => paletAc(true));
ac.hidden = true;
document.getElementById('tarla-kap').append(ac);

const palet = oge('div', 'ciftlik-palet kagit-pencere');
palet.setAttribute('role', 'toolbar');
palet.setAttribute('aria-label', 'İnşa paleti');
palet.hidden = true;
const ust = oge('div', 'ciftlik-palet-ust');
const seciliAd = oge('span', 'ciftlik-secili');
const donDugme = dugme('ciftlik-arac ciftlik-don', '⟳', 'Döndür (R)', () => dondur(1));
const sokDugme = dugme('ciftlik-arac ciftlik-sok', '✂ Sil', 'Sil (X, sağ tık)', () => sec('sok'));
sokDugme.dataset.parca = 'sok';
const kipKutu = oge('span', 'ciftlik-kipler');
const kapat = dugme('ciftlik-arac ciftlik-kapat', '✕', 'Paleti kapat (Esc)',
  () => paletAc(false));
ust.append(seciliAd, donDugme, sokDugme, kipKutu, kapat);
const sekmeSatiri = oge('div', 'ciftlik-palet-sekmeler');
const hizli = oge('div', 'ciftlik-hizli');
hizli.setAttribute('aria-label', 'Son kullanılanlar');
const sekmeler = oge('div', 'ciftlik-sekmeler');
sekmeler.setAttribute('role', 'tablist');
sekmeSatiri.append(hizli, sekmeler);
const serit = oge('div', 'ciftlik-palet-serit');
palet.append(ust, sekmeSatiri, serit);
document.querySelector('main').after(palet);
const ayrinti = ayrintiKur(palet);

const kartlar = new Map();
let kurulan = 0;

/** Kartları ve sekmeleri parça kaydından kurar (yeni parça tanımlanınca yeniler). */
function kartlariKur() {
  const turler = parcaTurleri().filter((t) => !t.paletDisi); // Komşu kapısını dünya kurar
  if (turler.length === kurulan) return;
  kurulan = turler.length;
  const sira = (a) => (AILELER.includes(a) ? AILELER.indexOf(a) : AILELER.length);
  turler.sort((a, b) => sira(a.aile) - sira(b.aile) || a.kod - b.kod);
  kartlar.clear();
  serit.replaceChildren();
  sekmeler.replaceChildren();
  for (const t of turler) {
    const kart = dugme('ciftlik-parca', '', t.ad, () => {
      const kilit = kaynak.kilit(t, durumAl());
      if (kilit) bildir(`${t.ad}: ${kilit}`);
      else sec(t.anahtar);
    });
    kart.dataset.parca = t.anahtar;
    kart.dataset.aile = t.aile;
    kart.append(oge('canvas', 'ciftlik-simge'), oge('span', 'ciftlik-kart-ad'),
      oge('span', 'ciftlik-kart-fiyat'), oge('span', 'ciftlik-kart-damga'));
    kart.querySelector('.ciftlik-kart-ad').textContent = t.ad;
    ayrinti.bagla(kart, t);
    kartlar.set(t.anahtar, kart);
    serit.append(kart);
    if (!sekmeler.querySelector(`[data-aile="${t.aile}"]`)) {
      const s = dugme('ciftlik-sekme', AILE_ADI[t.aile] ?? t.aile, '', () => sekmeyeGit(t.aile));
      s.setAttribute('role', 'tab');
      s.dataset.aile = t.aile;
      sekmeler.append(s);
    }
  }
  requestAnimationFrame(simgeleriCiz);
}

function simgeleriCiz() {
  for (const [anahtar, kart] of kartlar) {
    const kilitli = kart.classList.contains('kilitli');
    simgeCiz(kart.querySelector('canvas'), anahtar, 0, { kilitli });
  }
}

function sekmeyeGit(aile) {
  const ilk = serit.querySelector(`[data-aile="${aile}"]`);
  if (ilk) serit.scrollTo({ left: ilk.offsetLeft - serit.offsetLeft - 4, behavior: 'smooth' });
  sekmeIsaretle(aile);
}

function sekmeIsaretle(aile) {
  for (const s of sekmeler.children) {
    s.setAttribute('aria-selected', String(s.dataset.aile === aile));
  }
}

serit.addEventListener('scroll', () => {
  const sol = serit.scrollLeft + serit.offsetLeft + 8;
  const kart = [...kartlar.values()].find((k) => k.offsetLeft + k.offsetWidth > sol);
  if (kart) sekmeIsaretle(kart.dataset.aile);
}, { passive: true });

/** Kart durumları: seçili, kilitli, kuruş yetmez. */
function kartlariTazele() {
  const d = durumAl();
  const kurus = d?.mod === 'ciftlik' ? kaynak.kurus(d) : null;
  let simgeDegisti = false;
  for (const [anahtar, kart] of kartlar) {
    const t = parcaTurleri().find((x) => x.anahtar === anahtar);
    const kilit = d ? kaynak.kilit(t, d) : null;
    const fiyat = kaynak.fiyat(t);
    if (kart.classList.contains('kilitli') !== Boolean(kilit)) simgeDegisti = true;
    kart.classList.toggle('kilitli', Boolean(kilit));
    kart.classList.toggle('pahali', fiyat !== null && kurus !== null && fiyat > kurus);
    kart.querySelector('.ciftlik-kart-fiyat').textContent = fiyat === null ? '' : `${fiyat}`;
    kart.querySelector('.ciftlik-kart-damga').textContent = kilit ? 'kilitli' : '';
    kart.title = kilit ? `${t.ad}: ${kilit}` : t.ad;
    kart.setAttribute('aria-pressed', String(insa.kip === 'kur' && insa.secili === anahtar));
    kart.setAttribute('aria-disabled', String(Boolean(kilit)));
  }
  if (simgeDegisti) simgeleriCiz();
}

function hizliTazele() {
  const imza = insa.hizli.join(',');
  if (hizli.dataset.imza !== imza) {
    hizli.dataset.imza = imza;
    hizli.replaceChildren(...insa.hizli.slice(0, HIZLI_EN_COK).map((a, i) => {
      const t = parcaTurleri().find((x) => x.anahtar === a);
      const b = dugme('ciftlik-hizli-parca', '', `${t?.ad ?? a} (${i + 1})`, () => sec(a));
      b.dataset.hizli = a;
      const no = oge('kbd', '');
      no.textContent = String(i + 1);
      b.append(oge('canvas', 'ciftlik-simge'), no);
      requestAnimationFrame(() => simgeCiz(b.querySelector('canvas'), a));
      return b;
    }));
  }
  for (const b of hizli.children) {
    b.setAttribute('aria-pressed', String(insa.kip === 'kur' && insa.secili === b.dataset.hizli));
  }
}

function kipleriTazele() {
  const liste = kipDugmeleri();
  const imza = liste.map(([ad]) => ad).join(',');
  if (kipKutu.dataset.imza !== imza) {
    kipKutu.dataset.imza = imza;
    kipKutu.replaceChildren(...liste.map(([ad, d]) => {
      const b = dugme('ciftlik-arac', d.metin, d.baslik, () => kipAc(insa.kip === ad ? 'gez' : ad));
      b.dataset.kip = ad;
      return b;
    }));
  }
  for (const b of kipKutu.children) {
    b.setAttribute('aria-pressed', String(insa.kip === b.dataset.kip));
  }
}

/** Çiftliğe girilince/çıkılınca görünürlük (ciftlik.js çağırır). */
export function paletGoster(ciftlikte) {
  kartlariKur();
  ac.hidden = !ciftlikte || insa.acik;
  palet.hidden = !ciftlikte || !insa.acik;
  document.body.classList.toggle('ciftlik-insa', ciftlikte && insa.acik);
}

insaDinle((d) => {
  const ciftlikte = document.body.classList.contains('ciftlik-mod');
  kartlariKur();
  paletGoster(ciftlikte);
  if (!d.acik) ayrinti.gizle();
  const t = parcaTurleri().find((x) => x.anahtar === d.secili);
  seciliAd.textContent = d.kip === 'kur' && t ? `${t.ad} ▸` : d.kip === 'sil' ? 'Sil ▸'
    : 'Parça seç';
  donDugme.disabled = d.kip !== 'kur';
  donDugme.title = `Döndür (R): ${['doğu', 'güney', 'batı', 'kuzey'][d.yon]}`;
  donDugme.style.setProperty('--yon', `${d.yon * 90}deg`);
  sokDugme.setAttribute('aria-pressed', String(d.kip === 'sil'));
  kartlariTazele();
  hizliTazele();
  kipleriTazele();
});
dinle('ciftlik-ozet', () => {
  if (!palet.hidden) kartlariTazele();
});
kartlariKur();
