/**
 * Çiftlik öğreticisi (kâğıt not, rehber.js deseni): README "ilk 10 dakika" tablosunun 11 adımı
 * tek tek, ilgili palet düğmesi ya da pano vurgulanarak. Adımlar dünyadan türetilen koşulla
 * kendiliğinden ilerler (ogretici-adim.js), sayfa yenilenince doğru adıma atlar; her adım
 * "Atla" ile bırakılabilir. Bittikten sonra olayla bir kez gelen ipuçları (güç yok, sıkışma,
 * rüzgâr) aynı notta görünür. Durum tarayıcıda saklanır. Dışarıya: ogreticiAktif() (palet
 * ilk damgaya dek az parça göstersin diye), 'ogretici-adim' ve 'ogretici-bitti' olayları.
 */
import { dinle, yay } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { esyaKodu } from '../../kural/ciftlik/esya.js';
import { ADIMLAR, baglamKur, adimMetni, ilerlet, ipucuBul } from './ogretici-adim.js';
import { yap, dugme, dokunmatikMi, tuvalKap, kameraGit } from './yap.js';
import { stilYukle } from '../pencere.js';

stilYukle('./ciftlik/hud.css');

const ANAHTAR = 'haystack-hunt:ciftlik-ogretici';
const SAMAN = esyaKodu('saman');
const IPUCU_MS = 14000;

let kayit = { bitti: false, sira: 0, ipucu: [] };
let sira = 0;
let adimTik0 = 0;
let uretilen = 0;
let elle = false;
let ipucuNot = null;
let ipucuZamani = 0;
let kutu = null;
let yazilanMetin = '';
let sonKimlik = null;

function oku() {
  try {
    const m = localStorage.getItem(ANAHTAR);
    if (m) kayit = { ...kayit, ...JSON.parse(m) };
  } catch (hata) {
    console.error('Öğretici durumu okunamadı:', hata);
  }
}

function yaz() {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify({ ...kayit, sira }));
  } catch (hata) {
    console.error('Öğretici durumu yazılamadı:', hata);
  }
}

/** Öğretici bitti ya da atlandı mı (hazır şablonlar bundan sonra açılır)? */
export function ogreticiBitti() {
  if (!kutu) oku();
  return Boolean(kayit.bitti);
}

/** Palet "ilk damgaya kadar az parça" göstermek isterse: öğretici sürüyor mu? */
export const ogreticiAktif = () => Boolean(kutu) && !kayit.bitti && sira < ADIMLAR.length;

function vurguKaldir() {
  for (const e of document.querySelectorAll('.cf-vurgulu')) {
    e.classList.remove('rehber-vurgu', 'cf-vurgulu');
  }
}

function vurgula(secici) {
  vurguKaldir();
  if (!secici) return;
  for (const e of document.querySelectorAll(secici)) {
    e.classList.add('rehber-vurgu', 'cf-vurgulu');
  }
}

function kutuKur() {
  kutu = yap('div', 'cf-ogretici');
  kutu.setAttribute('role', 'status');
  kutu.setAttribute('aria-live', 'polite');
  kutu.hidden = true;
  tuvalKap().append(kutu);
}

/** Notu yazar: sayaç (isteğe bağlı), başlık, metin, düğmeler. */
function notYaz({ sayac, baslik, metin, tamam, atla, git }) {
  const dugmeler = yap('div', 'cf-ogretici-dugmeler');
  yazilanMetin = metin;
  if (git) dugmeler.append(dugme('dugme-metin', 'Kapıyı göster', 'Kamerayı Komşu kapısına götür',
    git));
  if (atla) dugmeler.append(dugme('dugme-metin', 'Atla', 'Öğreticiyi bırak', atla));
  if (tamam) dugmeler.append(dugme('dugme-birincil', tamam.ad, tamam.ad, tamam.islev));
  const ust = yap('h2', '', baslik);
  if (sayac) ust.append(yap('span', 'cf-ogretici-sayac sayi', sayac));
  kutu.replaceChildren(ust, yap('p', '', metin), dugmeler);
  kutu.hidden = false;
}

function bitir(atlandi) {
  kayit.bitti = true;
  vurguKaldir();
  kutu.hidden = true;
  yaz();
  yay('ogretici-bitti', { atlandi });
}

/** Komşu kapısı ekranın dışında olabilir (kapı yığından çok uzakta durabilir). */
function kapiyaGit() {
  const k = durumAl()?.ciftlik?.arazi?.kapi;
  if (k) kameraGit(k.x, k.y, k.en, k.boy);
}

/**
 * Masaüstünde pano sağda durur ve kapı hep sağ kenardadır: huni ve bant adımlarında pano
 * kapanır (kapı görünsün), teslim beklerken açılır (sayaç görünsün). Telefonda dokunulmaz.
 */
function panoyuAyarla(kimlik) {
  const acilsin = kimlik === 'teslim';
  if (!matchMedia('(min-width: 900px)').matches) return;
  if (!['huni', 'bant', 'teslim'].includes(kimlik)) return;
  if (document.body.classList.contains('cf-pano-acik') !== acilsin) {
    yay('ciftlik-ekran-ac', { ad: 'pano' });
  }
}

function adimGoster(b) {
  const a = ADIMLAR[sira];
  if (a.kimlik !== sonKimlik) panoyuAyarla(a.kimlik);
  sonKimlik = a.kimlik;
  notYaz({ sayac: `${sira + 1}/${ADIMLAR.length}`, baslik: a.baslik,
    metin: adimMetni(a, b, dokunmatikMi()), atla: () => bitir(true), git: a.git && kapiyaGit,
    tamam: a.elle ? { ad: 'Tamam', islev: () => { elle = true; } } : null });
  vurgula(a.vurgu);
  yay('ogretici-adim', { kimlik: a.kimlik, sira });
}

function ipucuGoster(i) {
  ipucuNot = i.kimlik;
  ipucuZamani = performance.now();
  kayit.ipucu.push(i.kimlik);
  yaz();
  notYaz({ baslik: i.baslik, metin: i.metin,
    tamam: { ad: 'Tamam', islev: () => { kutu.hidden = true; ipucuNot = null; } } });
}

function yokla({ durum, eko, sorunlar, bekleyenler }) {
  const c = durum.ciftlik;
  const durumlar = [...sorunlar, ...bekleyenler].map((s) => s.durum);
  const damga = new Set(eko.damgalar.filter((d) => d.basildi).map((d) => d.kod));
  const b = baglamKur(c, { durumlar, kart: eko.kartlar.find((k) => k.damga) ?? null, elle, uretilen,
    adimTik: c.tik - adimTik0, damga });
  if (!kayit.bitti) {
    const yeni = ilerlet(sira, b);
    if (yeni !== sira) {
      sira = yeni;
      adimTik0 = c.tik;
      uretilen = 0;
      elle = false;
      yaz();
      if (sira >= ADIMLAR.length) {
        bitir(false);
        return;
      }
      adimGoster(b);
    } else if ((kutu.hidden && !ipucuNot)
      || (!ipucuNot && adimMetni(ADIMLAR[sira], b, dokunmatikMi()) !== yazilanMetin)) {
      adimGoster(b); // sipariş kartı geç gelince ya da değişince not güncellenir
    }
    return;
  }
  if (ipucuNot && performance.now() - ipucuZamani > IPUCU_MS) {
    kutu.hidden = true;
    ipucuNot = null;
  }
  const i = !ipucuNot && ipucuBul(new Set(kayit.ipucu), b);
  if (i) ipucuGoster(i);
}

dinle('ciftlik-hud', (v) => {
  if (kutu && durumAl()?.mod === 'ciftlik') yokla({ ...v, durum: durumAl() });
});
dinle('ciftlik-ozet', ({ uretilen: u }) => {
  uretilen += u?.[SAMAN] ?? 0;
});
dinle('ciftlik-acildi', ({ durum }) => {
  if (!kutu) kutuKur();
  oku();
  sira = kayit.bitti ? ADIMLAR.length : Math.min(kayit.sira ?? 0, ADIMLAR.length - 1);
  adimTik0 = durum.ciftlik.tik;
  uretilen = 0;
  elle = false;
  ipucuNot = null;
  kutu.hidden = true;
  vurguKaldir();
});
dinle('oyun-basladi', ({ durum }) => {
  if (durum.mod !== 'ciftlik' && kutu) {
    kutu.hidden = true;
    vurguKaldir();
  }
});
