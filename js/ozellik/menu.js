/**
 * Açılış ve oyun menüsü ("çuval etiketi" kartı, <dialog id="menu">): logo, "Tarla No."
 * damgası, Günün tarlası (#gunun) / Yeni tarla (#yeni), zorluk damgaları, bağlantı satırı
 * (#alt-dugmeler buraya taşınır: Yarış ve dugmeEkle('alt') ile gelenler; Defter, Nasıl
 * oynanır) ve onaylı "Pes et" (#pes onay düğmesidir). Düğmeler DOM'da taşınır; kimlikleri ve
 * arayuz.js / yaris.js'teki tıklama davranışları aynı kalır.
 * İlk açılışta (URL'de ?tohum= yoksa) kendiliğinden açılır; ≡ düğmesi (#menu-ac) ve Esc
 * yeniden açar. Açıkken klavye oyuna gitmez ve oyun saati durur (kapanınca geri itilir).
 * Yeni tarla açılınca ya da pes edilince kapanır; zorluk değişimi kartı açık bırakır.
 */
import { dinle } from '../olaylar.js';
import { durumAl, yeniOyun, zamaniKaydir } from '../oyun.js';
import { ZORLUKLAR } from '../kural/zorluk.js';
import { gununEtiketi } from '../kural/rastgele.js';
import { sayi, sureMetni } from '../arayuz.js';
import { ikon } from './ikon.js';
import { logo } from './menu-logo.js';
import { yardimAc } from './yardim.js';
import { yarisSuruyor } from './yaris.js';

const KAPANIS_MS = 200;
const $ = (id) => document.getElementById(id);
const tohumVar = new URLSearchParams(location.search).has('tohum');
const hareketAz = matchMedia('(prefers-reduced-motion: reduce)');

const stil = document.createElement('link');
stil.rel = 'stylesheet';
stil.href = new URL('./menu.css', import.meta.url).href;
document.head.append(stil);

function yap(ad, sinif, metin) {
  const o = document.createElement(ad);
  if (sinif) o.className = sinif;
  if (metin) o.textContent = metin;
  if (ad === 'button') o.type = 'button';
  return o;
}

const kart = yap('dialog', 'kagit-pencere menu-kart');
kart.id = 'menu';
kart.setAttribute('aria-labelledby', 'menu-baslik');
let acildi = null;
let zorlukDegisiyor = false;
let ilkOyun = true;

// --- Onay satırı: pes etme ve süren tarlada zorluk değişimi için ---
const onay = yap('div', 'menu-onay');
onay.hidden = true;
const onayMetni = yap('p', 'menu-onay-metin');
const zorlukEvet = yap('button', 'dugme-birincil', 'Evet, baştan aç');
const vazgec = yap('button', 'dugme-metin', 'Vazgeç');
let zorlukBekleyen = null;

function onayGoster(metin, evet) {
  onayMetni.textContent = metin;
  $('pes').hidden = evet !== $('pes');
  zorlukEvet.hidden = evet !== zorlukEvet;
  onay.hidden = false;
  evet.focus();
}

function onayGizle() {
  onay.hidden = true;
  zorlukBekleyen = null;
}

// --- Zorluk damgaları ---
const zorluk = yap('div', 'menu-zorluk');
zorluk.id = 'zorluk';
zorluk.setAttribute('role', 'radiogroup');
zorluk.setAttribute('aria-label', 'Zorluk');
const zorlukDugmeleri = Object.entries(ZORLUKLAR).map(([anahtar, ayar]) => {
  const d = yap('button', 'zorluk-damga', ayar.ad);
  d.dataset.zorluk = anahtar;
  d.setAttribute('role', 'radio');
  d.title = `${ayar.ad}: puan ×${ayar.carpan}`;
  d.addEventListener('click', () => zorlukSec(anahtar));
  return d;
});

function zorlukUygula(anahtar) {
  zorlukDegisiyor = true;
  try {
    yeniOyun(durumAl().etiket, anahtar);
  } finally {
    zorlukDegisiyor = false;
  }
}

function zorlukSec(anahtar) {
  const d = durumAl();
  if (anahtar === d.zorluk || yarisSuruyor()) return;
  if (d.baslangic !== null && !d.bitti) {
    zorlukBekleyen = anahtar;
    onayGoster(`Bu tarla ${ZORLUKLAR[anahtar].ad} zorlukta baştan açılacak.`, zorlukEvet);
  } else {
    onayGizle();
    zorlukUygula(anahtar);
  }
}

zorlukEvet.addEventListener('click', () => {
  const anahtar = zorlukBekleyen;
  onayGizle();
  if (anahtar) zorlukUygula(anahtar);
});
vazgec.addEventListener('click', onayGizle);

// --- Kartın içi ---
function kartKur() {
  const kapat = yap('button', 'dugme-ikon menu-kapat');
  kapat.title = 'Kapat (Esc)';
  kapat.setAttribute('aria-label', 'Menüyü kapat');
  kapat.append(ikon('kapat'));
  kapat.addEventListener('click', () => menuKapat());

  const baslik = yap('h2', 'menu-logo');
  baslik.id = 'menu-baslik';
  baslik.append(logo());
  const altBaslik = yap('p', 'menu-alt-baslik', 'samanlıkta iğne');
  const damga = yap('p', 'menu-damga', `Tarla No. ${gununEtiketi()}`);
  damga.id = 'menu-damga';

  const yarim = yap('p', 'menu-yarim');
  yarim.id = 'menu-yarim';
  const ana = yap('div', 'menu-ana');
  const gunun = $('gunun');
  gunun.className = 'dugme-birincil';
  const yeni = $('yeni');
  yeni.className = 'dugme-ikincil';
  ana.append(gunun, yeni);

  const zorlukBaslik = yap('span', 'menu-zorluk-baslik', 'Zorluk');
  zorluk.append(zorlukBaslik, ...zorlukDugmeleri);

  const pes = $('pes');
  pes.className = 'dugme-birincil';
  pes.textContent = 'Evet, iğneyi göster';
  onay.append(onayMetni, yap('div', 'menu-onay-dugmeler'));
  onay.lastChild.append(vazgec, zorlukEvet, pes);

  const baglantilar = $('alt-dugmeler');
  baglantilar.classList.add('menu-baglantilar');
  baglantilar.setAttribute('aria-label', 'Diğer');
  const defter = yap('button', '', 'Defter');
  defter.addEventListener('click', () => {
    const ist = document.querySelector('button[aria-label="İstatistik"]');
    if (ist) ist.click();
    else console.error('İstatistik düğmesi bulunamadı');
  });
  const nasil = yap('button', '', 'Nasıl oynanır');
  nasil.addEventListener('click', yardimAc);
  baglantilar.append(defter, nasil);
  // Yarış (ve sonradan eklenen bağlantılar) bir pencere açar; menü yolu açsın.
  baglantilar.addEventListener('click', (e) => {
    const d = e.target.closest('button');
    if (d && d !== defter && d !== nasil) menuKapat();
  });

  const pesSatiri = yap('p', 'menu-pes');
  const pesAc = yap('button', 'dugme-metin tehlike', 'Pes et');
  pesAc.id = 'pes-ac';
  pesAc.addEventListener('click', () => onayGoster(
    'Emin misin? İğnenin yeri gösterilecek.', pes));
  pesSatiri.append(pesAc);

  kart.append(kapat, baslik, altBaslik, damga, yarim, ana, zorluk, onay, baglantilar,
    pesSatiri);
  document.body.append(kart);
}

/** Kartı açılmadan önce durumla eşitler. */
function guncelle() {
  const d = durumAl();
  const yaris = yarisSuruyor();
  for (const b of zorlukDugmeleri) {
    b.setAttribute('aria-checked', String(b.dataset.zorluk === d.zorluk));
    b.disabled = yaris;
  }
  zorluk.title = yaris ? 'Yarış sürerken zorluk değişmez' : '';
  const suruyor = d.baslangic !== null && !d.bitti;
  const yarim = $('menu-yarim');
  yarim.hidden = !suruyor;
  if (suruyor) {
    const gecen = sureMetni(performance.now() - d.baslangic);
    yarim.textContent = `Bu tarla sürüyor: ${gecen} · ${sayi.format(d.tarla.kaldirilan)} saman. `;
    const don = yap('button', 'dugme-metin', 'Tarlaya dön');
    don.addEventListener('click', () => menuKapat());
    yarim.append(don);
  }
  $('pes-ac').hidden = d.bitti || d.baslangic === null;
}

export function menuAc() {
  if (kart.open) return;
  onayGizle();
  guncelle();
  kart.classList.remove('kapaniyor');
  kart.showModal();
  acildi = performance.now();
  $('gunun').focus();
}

export function menuKapat() {
  if (!kart.open || kart.classList.contains('kapaniyor')) return;
  if (hareketAz.matches) {
    kart.close();
    return;
  }
  kart.classList.add('kapaniyor');
  setTimeout(() => kart.close(), KAPANIS_MS);
}

kart.addEventListener('close', () => {
  kart.classList.remove('kapaniyor');
  onayGizle();
  // Menüde geçen süre oyun süresine sayılmasın (başlamamış ya da bitmişse bir şey olmaz).
  if (acildi !== null) zamaniKaydir(performance.now() - acildi);
  acildi = null;
});
// Kartın dışına (arka plana) tıklamak da kapatır.
kart.addEventListener('click', (e) => {
  if (e.target !== kart) return;
  const k = kart.getBoundingClientRect();
  const icinde = e.clientX >= k.left && e.clientX <= k.right
    && e.clientY >= k.top && e.clientY <= k.bottom;
  if (!icinde) menuKapat();
});

// Menü açıkken pencere dışındaki odaktan gelen tuşlar oyuna gitmesin; kapalıyken Esc açar.
window.addEventListener('keydown', (e) => {
  const hedef = e.target.closest ? e.target : document.body;
  if (kart.open) {
    if (!hedef.closest('dialog')) e.stopImmediatePropagation();
    return;
  }
  if (e.key !== 'Escape' || e.repeat || hedef.closest('input, textarea, select')) return;
  if (document.querySelector('dialog[open], .rehber')) return;
  e.preventDefault();
  menuAc();
}, true);

function acmaDugmesiKur() {
  const d = yap('button', 'dugme-ikon menu-ac');
  d.id = 'menu-ac';
  d.title = 'Menü (Esc)';
  d.setAttribute('aria-label', 'Menü');
  d.append(ikon('menu'));
  d.addEventListener('click', menuAc);
  d.addEventListener('pointerup', () => d.blur());
  (document.querySelector('header') || $('tarla-kap')).prepend(d);
}

kartKur();
acmaDugmesiKur();

dinle('oyun-basladi', () => {
  if (ilkOyun) {
    ilkOyun = false;
    if (!tohumVar) menuAc();
  } else if (zorlukDegisiyor) {
    guncelle();
  } else {
    menuKapat();
  }
});
dinle('pes-edildi', () => menuKapat());
