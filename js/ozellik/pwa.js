/**
 * PWA: service worker kaydı (yalnız https ya da localhost'ta). Kayıttan sonra sayfanın
 * gerçekten yüklediği dosyaları (kaynak zamanlaması) işçiye bildirir; böylece
 * ilk ziyarette bile çevrimdışı açılış için hepsi önbelleğe girer, liste elle tutulmaz.
 * Yeni sürüm (sw.js SURUM) kurulup sayfayı devralınca oyuncuya "yenile" bildirimi
 * gösterilir; sekme yeniden görünür olunca güncelleme denetlenir.
 */
import { bildir } from '../arayuz.js';

const YENI_SURUM_SURE = 10000;
const YEREL = ['localhost', '127.0.0.1', '[::1]'];

function guvenliMi() {
  return location.protocol === 'https:' || YEREL.includes(location.hostname);
}

function yuklenenAdresler() {
  const adresler = new Set([location.origin + location.pathname]);
  for (const k of performance.getEntriesByType('resource')) {
    if (k.name.startsWith(location.origin) && !k.name.includes('/sw.js')) adresler.add(k.name);
  }
  return [...adresler];
}

/** Sayfa zaten bir işçinin denetimindeyken yenisi devralırsa: yeni sürüm hazır. */
function guncellemeyiDinle(kayit) {
  const ilkDenetci = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ilkDenetci) bildir('Yeni sürüm hazır — sayfayı yenile', YENI_SURUM_SURE);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    kayit.update().catch((hata) => console.error('Güncelleme denetlenemedi:', hata));
  });
}

async function kaydet() {
  const kayit = await navigator.serviceWorker.register('./sw.js');
  guncellemeyiDinle(kayit);
  const hazir = await navigator.serviceWorker.ready;
  const isci = hazir.active || kayit.active;
  if (isci) isci.postMessage({ tur: 'onbellekle', adresler: yuklenenAdresler() });
}

if (guvenliMi() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    kaydet().catch((hata) => console.error('Service worker kaydedilemedi:', hata));
  });
}
