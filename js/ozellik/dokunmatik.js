/**
 * Dokunmatik denetim: tuval kabının sol altında sanal kol, sağ altında "Kullan" ve "Bin/İn"
 * düğmeleri. Yalnız kaba işaretçili cihazda (ya da ilk dokunuşta, ya da ?dokunmatik=1) kurulur;
 * masaüstünde DOM'a hiçbir şey eklenmez. Yalnız js/kontrol.js'e yazar. Kipte gövdeye
 * `dokunmatik` sınıfı eklenir; mini harita/kamera düğmesi/bildirim yerleşimi o sınıfla CSS'tedir.
 */
import { kontrol, yonAyarla, ekranYonAyarla, kullanAyarla } from '../kontrol.js';
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
    ekranYonAyarla(sonuc.yon.x, sonuc.yon.y);
  };
  const birak = () => {
    kol.classList.remove('basili');
    parmak.style.transform = '';
    yonAyarla(0, 0, 'kol');
    ekranYonAyarla(0, 0);
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
  const kap = document.getElementById('tarla-kap');
  document.head.append(stil);
  document.body.classList.add('dokunmatik');
  kolKur(kap);
  const eylemler = ogeYap('dokunmatik-eylemler');
  kap.append(eylemler);
  dugmeKur(eylemler, 'binin', 'Bin/İn', 'Bin ya da in', () => { kontrol.binIste = true; });
  dugmeKur(eylemler, 'kullan', 'Kullan', 'Kullan (basılı tut)',
    () => kullanAyarla(true, 'dokunmatik'), () => kullanAyarla(false, 'dokunmatik'));
}

/** Yatay telefonda tarla ilk görünümde ekrana gelsin (üstündeki paneller yer kaplar). */
function tarlayiGoster() {
  const kap = document.getElementById('tarla-kap');
  if (matchMedia('(orientation: landscape) and (max-height: 600px)').matches) {
    kap.scrollIntoView({ block: 'center' });
  }
}

const zorla = new URLSearchParams(location.search).get('dokunmatik') === '1';
if (zorla || matchMedia('(pointer: coarse)').matches) {
  kur();
  window.addEventListener('load', tarlayiGoster, { once: true });
} else {
  // Kaba işaretçi bildirmeyen ama dokunuşla oynanan cihazlar için ilk dokunuşta kur.
  window.addEventListener('touchstart', kur, { once: true, passive: true });
}
