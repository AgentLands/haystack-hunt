/**
 * "Nasıl oynanır" defteri: menüden açılan sekmeli kâğıt pencere (Yürüme, Aletler, Makineler,
 * İpuçları, Puan). Maddeler ikon + tek cümle; dokunmatikte tuş adları yerine kol, Kullan,
 * Bin/İn yazılır (açılırken girdi türüne bakılır). İçerik yardim-icerik.js'te.
 * Sekmeler ok tuşlarıyla gezilir (WAI-ARIA sekme deseni); Esc ve × kapatır.
 */
import { ikon } from './ikon.js';
import { SEKMELER, PUAN_SATIRLARI, CARPANLAR } from './yardim-icerik.js';

let pencere = null;
let secili = 0;

const dokunmatikMi = () => document.body.classList.contains('dokunmatik')
  || matchMedia('(pointer: coarse)').matches;

function yeni(ad, sinif, metin) {
  const o = document.createElement(ad);
  if (sinif) o.className = sinif;
  if (metin) o.textContent = metin;
  return o;
}

function puanTablosu() {
  const tablo = yeni('table', 'yardim-puan');
  const govde = document.createElement('tbody');
  for (const [ad, deger] of PUAN_SATIRLARI) {
    const satir = document.createElement('tr');
    satir.append(yeni('th', '', ad), yeni('td', 'sayi', deger));
    govde.append(satir);
  }
  tablo.append(govde);
  const carpan = yeni('p', 'yardim-carpan');
  carpan.append(yeni('span', 'yardim-carpan-baslik', 'Sonra zorlukla çarpılır:'));
  for (const [ad, deger] of CARPANLAR) {
    carpan.append(yeni('span', 'yardim-damga', `${ad} ${deger}`));
  }
  const not = yeni('p', 'yardim-not', 'Paslı çivi cezası süreye eklenir, yani puanı da düşürür.');
  return [tablo, carpan, not];
}

function panelDoldur(panel, sekme) {
  const tur = dokunmatikMi() ? 'd' : 't';
  if (sekme.tablo) {
    panel.replaceChildren(...puanTablosu());
    return;
  }
  const liste = yeni('ul', 'yardim-liste');
  for (const [ad, metin] of sekme.maddeler) {
    const madde = document.createElement('li');
    madde.append(ikon(ad, { boy: 24 }), yeni('span', '', typeof metin === 'string'
      ? metin : metin[tur]));
    liste.append(madde);
  }
  panel.replaceChildren(liste);
}

function sekmeSec(sira, odakla) {
  secili = (sira + SEKMELER.length) % SEKMELER.length;
  const dugmeler = pencere.querySelectorAll('[role="tab"]');
  dugmeler.forEach((d, i) => {
    const bu = i === secili;
    d.setAttribute('aria-selected', String(bu));
    d.tabIndex = bu ? 0 : -1;
  });
  const panel = pencere.querySelector('#yardim-panel');
  panelDoldur(panel, SEKMELER[secili]);
  panel.setAttribute('aria-labelledby', `yardim-sekme-${secili}`);
  if (odakla) dugmeler[secili].focus();
}

function kur() {
  pencere = yeni('dialog', 'kagit-pencere yardim');
  pencere.id = 'yardim';
  pencere.setAttribute('aria-labelledby', 'yardim-baslik');
  const baslik = yeni('h2', '', 'Nasıl oynanır');
  baslik.id = 'yardim-baslik';
  const kapat = yeni('button', 'dugme-ikon yardim-kapat');
  kapat.type = 'button';
  kapat.title = 'Kapat';
  kapat.setAttribute('aria-label', 'Kapat');
  kapat.append(ikon('kapat'));
  kapat.addEventListener('click', () => pencere.close());
  const sekmeler = yeni('div', 'yardim-sekmeler');
  sekmeler.setAttribute('role', 'tablist');
  sekmeler.setAttribute('aria-label', 'Konular');
  SEKMELER.forEach((s, i) => {
    const d = yeni('button', 'yardim-sekme', s.ad);
    d.type = 'button';
    d.id = `yardim-sekme-${i}`;
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-controls', 'yardim-panel');
    d.addEventListener('click', () => sekmeSec(i, false));
    sekmeler.append(d);
  });
  sekmeler.addEventListener('keydown', (e) => {
    const yon = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (yon) {
      e.preventDefault();
      sekmeSec(secili + yon, true);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      sekmeSec(e.key === 'Home' ? 0 : SEKMELER.length - 1, true);
    }
  });
  const panel = yeni('div', 'yardim-panel');
  panel.id = 'yardim-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;
  pencere.append(kapat, baslik, sekmeler, panel);
  document.body.append(pencere);
}

/** Defteri açar (menünün üstünde; kapanınca menüye dönülür). */
export function yardimAc() {
  if (!pencere) kur();
  sekmeSec(secili, false);
  if (!pencere.open) pencere.showModal();
  pencere.querySelector('[aria-selected="true"]').focus();
}
