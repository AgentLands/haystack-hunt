/**
 * Dokunmatik denetim: kumanda (sanal kol solda, "Kullan" ve "Bin/İn" düğmeleri sağda). Yalnız
 * kaba işaretçili cihazda (ya da ilk dokunuşta, ya da ?dokunmatik=1) kurulur; masaüstünde
 * DOM'a hiçbir şey eklenmez. Yalnız js/kontrol.js'e yazar. Kumanda gövde ızgarasında main'in
 * ardına eklenir: dikey ekranda tuvalin altındaki ahşap tablada, yatayda tuvalin alt
 * köşelerinde durur (dokunmatik.css). Kipte gövdeye `dokunmatik` sınıfı eklenir.
 */
import { kontrol, yonAyarla, kullanAyarla } from '../kontrol.js';
import { kolYonu } from '../kural/kol.js';

const stil = document.createElement('link');
stil.rel = 'stylesheet';
stil.href = new URL('./dokunmatik.css', import.meta.url).href;

/** Bir parmağı (pointerId) izleyen basılı-tut bağlayıcısı; bırakma yollarının hepsini kapsar. */
function parmakIzle(oge, basla, birak, hareket) {
  let izlenen = null;
  const bitir = (e) => {
    if (e.pointerId !== izlenen) return;
    izlenen = null;
    birak(e);
  };
  oge.addEventListener('pointerdown', (e) => {
    if (izlenen !== null) return;
    e.preventDefault();
    e.stopPropagation();
    izlenen = e.pointerId;
    oge.setPointerCapture(e.pointerId);
    basla(e);
  });
  if (hareket) {
    oge.addEventListener('pointermove', (e) => {
      if (e.pointerId === izlenen) hareket(e);
    });
  }
  for (const olay of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
    oge.addEventListener(olay, bitir);
  }
  window.addEventListener('blur', () => {
    if (izlenen === null) return;
    const id = izlenen;
    izlenen = null;
    birak({ pointerId: id });
  });
}

function ogeYap(sinif, metin) {
  const oge = document.createElement('div');
  oge.className = sinif;
  if (metin) oge.textContent = metin;
  oge.addEventListener('contextmenu', (e) => e.preventDefault());
  return oge;
}

function kolKur(kap) {
  const kol = ogeYap('dokunmatik-kol');
  kol.setAttribute('aria-label', 'Sanal kol');
  const parmak = ogeYap('dokunmatik-kol-parmak');
  kol.append(parmak);
  const surdur = (e) => {
    const k = kol.getBoundingClientRect();
    const yaricap = k.width / 2 - parmak.offsetWidth / 2;
    const sonuc = kolYonu(e.clientX - (k.left + k.width / 2),
      e.clientY - (k.top + k.height / 2), yaricap);
    parmak.style.transform = `translate(${sonuc.parmak.x}px, ${sonuc.parmak.y}px)`;
    yonAyarla(sonuc.yon.x, sonuc.yon.y, 'kol');
  };
  const birak = () => {
    kol.classList.remove('basili');
    parmak.style.transform = '';
    yonAyarla(0, 0, 'kol');
  };
  parmakIzle(kol, (e) => { kol.classList.add('basili'); surdur(e); }, birak, surdur);
  kap.append(kol);
}

function dugmeKur(kap, sinif, metin, baslik, basla, birak) {
  const d = ogeYap(`dokunmatik-dugme ${sinif}`, metin);
  d.setAttribute('role', 'button');
  d.setAttribute('aria-label', baslik);
  parmakIzle(d, (e) => { d.classList.add('basili'); basla(e); },
    () => { d.classList.remove('basili'); if (birak) birak(); });
  kap.append(d);
}

function kur() {
  if (document.body.classList.contains('dokunmatik')) return;
  const kap = ogeYap('kumanda');
  document.querySelector('main').after(kap);
  document.head.append(stil);
  document.body.classList.add('dokunmatik');
  kolKur(kap);
  const eylemler = ogeYap('dokunmatik-eylemler');
  kap.append(eylemler);
  dugmeKur(eylemler, 'binin', 'Bin/İn', 'Bin ya da in', () => { kontrol.binIste = true; });
  dugmeKur(eylemler, 'kullan', 'Kullan', 'Kullan (basılı tut)',
    () => kullanAyarla(true, 'dokunmatik'), () => kullanAyarla(false, 'dokunmatik'));
}

const zorla = new URLSearchParams(location.search).get('dokunmatik') === '1';
if (zorla || matchMedia('(pointer: coarse)').matches) {
  kur();
} else {
  // Kaba işaretçi bildirmeyen ama dokunuşla oynanan cihazlar için ilk dokunuşta kur.
  window.addEventListener('touchstart', kur, { once: true, passive: true });
}
