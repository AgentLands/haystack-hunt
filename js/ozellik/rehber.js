/**
 * İlk açılış rehberi: oyunu ilk kez açana 4 adımlık, atlanabilir bir bindirme
 * (El / Tırmık / Dedektör / güneş parıltısı). Görüldüğü localStorage'ta tutulur.
 * Üst sıradaki "?" düğmesi rehberi yeniden açar. Bindirme tuvale tıklamayı engellemez:
 * tuvale ilk dokunuşta ya da 1-2-3 tuşlarında kendiliğinden kapanır.
 */
import { dugmeEkle } from '../arayuz.js';

const ANAHTAR = 'haystack-hunt:rehber-goruldu';
const ADIMLAR = [
  { arac: 'el', baslik: 'El',
    metin: 'Basılı tut: altındaki samanı alırsın. Açılan çukura yamaçtan saman kayar.' },
  { arac: 'tirmik', baslik: 'Tırmık',
    metin: 'Sürükle: samanı o yöne itersin. Tarlanın dışına ittiğin saman gider.' },
  { arac: 'dedektor', baslik: 'Dedektör',
    metin: 'Üç hakkın var. Dokunduğun yer iğneye ne kadar yakınsa yazar.' },
  { arac: null, baslik: 'Güneş parıltısı',
    metin: 'İğne yüzeye yakınsa güneşte arada bir parlar. Gözünü tarladan ayırma!' },
];

function goruldu() {
  try {
    return localStorage.getItem(ANAHTAR) === '1';
  } catch (hata) {
    console.error('Rehber durumu okunamadı:', hata);
    return false;
  }
}

function gorulduYaz() {
  try {
    localStorage.setItem(ANAHTAR, '1');
  } catch (hata) {
    console.error('Rehber durumu yazılamadı:', hata);
  }
}

let kutu = null;
let adim = 0;

function vurguyuKaldir() {
  for (const d of document.querySelectorAll('.rehber-vurgu')) d.classList.remove('rehber-vurgu');
}

function kapat() {
  if (!kutu) return;
  kutu.remove();
  kutu = null;
  vurguyuKaldir();
  document.removeEventListener('pointerdown', oyunBasladi, true);
  document.removeEventListener('keydown', tusBasildi, true);
  gorulduYaz();
}

function oyunBasladi(e) {
  if (e.target.id === 'tarla') kapat();
}

function tusBasildi(e) {
  if (e.key === 'Escape' || ['1', '2', '3'].includes(e.key)) kapat();
}

function ciz() {
  const a = ADIMLAR[adim];
  const son = adim === ADIMLAR.length - 1;
  kutu.innerHTML = '';
  const sayac = Object.assign(document.createElement('p'), {
    className: 'rehber-sayac', textContent: `${adim + 1} / ${ADIMLAR.length}`,
  });
  const baslik = Object.assign(document.createElement('h2'), { textContent: a.baslik });
  baslik.id = 'rehber-baslik';
  const metin = Object.assign(document.createElement('p'), { textContent: a.metin });
  const dugmeler = document.createElement('div');
  dugmeler.className = 'rehber-dugmeler';
  const atla = Object.assign(document.createElement('button'), {
    type: 'button', textContent: 'Atla', className: 'ikincil',
  });
  atla.addEventListener('click', kapat);
  const ileri = Object.assign(document.createElement('button'), {
    type: 'button', textContent: son ? 'Başla' : 'İleri',
  });
  ileri.addEventListener('click', () => {
    if (son) kapat();
    else { adim += 1; ciz(); }
  });
  ileri.classList.add('rehber-ileri');
  dugmeler.append(atla, ileri);
  kutu.append(sayac, baslik, metin, dugmeler);
  vurguyuKaldir();
  if (a.arac) document.querySelector(`[data-arac="${a.arac}"]`)?.classList.add('rehber-vurgu');
  kutu.querySelector('.rehber-ileri').focus({ preventScroll: true });
}

export function rehberiAc() {
  const kap = document.getElementById('tarla-kap');
  if (kutu || !kap) return;
  adim = 0;
  kutu = document.createElement('div');
  kutu.className = 'rehber';
  kutu.setAttribute('role', 'dialog');
  kutu.setAttribute('aria-labelledby', 'rehber-baslik');
  kap.append(kutu);
  document.addEventListener('pointerdown', oyunBasladi, true);
  document.addEventListener('keydown', tusBasildi, true);
  ciz();
}

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = new URL('./rehber.css', import.meta.url).href;
document.head.append(link);

dugmeEkle('ust', { metin: '?', baslik: 'Nasıl oynanır? Rehberi aç', tikla: rehberiAc });
if (!goruldu()) rehberiAc();
