/**
 * İlk açılış rehberi: oyunu ilk kez açana kısa, atlanabilir kâğıt not (yürüme, El / Tırmık /
 * Dedektör, kulak, traktör ve garaj ikmali, üfleyici, balya makinesi, güneş parıltısı,
 * buluntular, rahat mod ve meydan okuma); metin girdiye göre (klavye ya da dokunmatik).
 * Görüldüğü localStorage'ta tutulur.
 * Üst sıradaki "?" düğmesi rehberi yeniden açar. Bindirme tuvale tıklamayı engellemez:
 * tuvale ilk dokunuşta, hareket tuşlarında ya da 1-4 tuşlarında kendiliğinden kapanır.
 */
import { dugmeEkle } from '../arayuz.js';
import { YON_TUSLARI } from '../girdi.js';
import { ikon } from './ikon.js';

const ANAHTAR = 'haystack-hunt:rehber-goruldu';
// Her adım: başlık, hangi aracı vurgulayacağı, klavye ve dokunmatik için tek cümlelik metin.
const ADIMLAR = [
  { arac: null, baslik: 'Çiftçi',
    klavye: 'WASD ya da oklarla yürü.',
    dokunmatik: 'Kolu sürükle ya da gideceğin yere dokun.' },
  { arac: 'el', baslik: 'El',
    klavye: 'Boşluğu basılı tut, önündeki samanı alırsın.',
    dokunmatik: 'Kullan düğmesini basılı tut, önündeki samanı alırsın.' },
  { arac: 'tirmik', baslik: 'Tırmık',
    klavye: 'Boşluk basılıyken yürü, samanı önüne katıp tarlanın dışına itersin.',
    dokunmatik: 'Kullan basılıyken kolu it, samanı tarlanın dışına itersin.' },
  { arac: 'dedektor', baslik: 'Dedektör',
    klavye: 'Boşluğa bas, iğneye ne kadar yakın olduğun yazılır ve yerde bir halka kalır; '
      + 'hakkın sınırlı.',
    dokunmatik: 'Kullan\'a bas, iğneye ne kadar yakın olduğun yazılır ve yerde bir halka '
      + 'kalır; hakkın sınırlı.' },
  { arac: null, baslik: 'Kulak',
    klavye: 'Kazarken iğneye yaklaşırsan (ses açıksa) metal tınılar duyulur; sıklaştıkça '
      + 'ısınıyorsun.',
    dokunmatik: 'Kazarken iğneye yaklaşırsan (ses açıksa) metal tınılar duyulur; sıklaştıkça '
      + 'ısınıyorsun.' },
  { arac: null, baslik: 'Kepçeli traktör',
    klavye: 'Garajdaki traktöre yaklaş, E ile bin; W/S gaz, A/D dön, Boşluk kepçe. Yakıt '
      + 'azalınca park yerine dönüp dur: depo bir kez dolar.',
    dokunmatik: 'Traktöre yaklaş, Bin\'e bas; kolla sür, Kullan kepçeyi çalıştırır. Yakıt '
      + 'azalınca park yerine dönüp dur: depo bir kez dolar.' },
  { arac: null, baslik: 'Sırt üfleyicisi',
    klavye: 'E ile tak, Boşlukla samanı önüne savur; yakıtı sınırlı.',
    dokunmatik: 'Bin\'e basıp tak, Kullan ile samanı önüne savur; yakıtı sınırlı.' },
  { arac: null, baslik: 'Balya makinesi',
    klavye: 'Samanı balyalar ama iğneyi de yutabilir; balyayı El ile aç.',
    dokunmatik: 'Samanı balyalar ama iğneyi de yutabilir; balyayı El ile aç.' },
  { arac: null, baslik: 'Güneş parıltısı',
    klavye: 'İğne yüzeye yakınsa güneşte parlar; ekran dışındaysa kenarda bir ok gösterir. '
      + 'Açığa çıkınca yanına gidip al.',
    dokunmatik: 'İğne yüzeye yakınsa güneşte parlar; ekran dışındaysa kenarda bir ok '
      + 'gösterir. Açığa çıkınca yanına gidip al.' },
  { arac: null, baslik: 'Buluntular',
    klavye: 'Samanın altında küçük eşyalar da saklı; elinle al, Buluntular defterine yazılır.',
    dokunmatik: 'Samanın altında küçük eşyalar da saklı; elinle al, Buluntular defterine '
      + 'yazılır.' },
  { arac: null, baslik: 'Rahat oyna',
    klavye: 'Süre canını sıkarsa menüden Rahat mod\'u aç. Bitirince Meydan oku ile süreni '
      + 'arkadaşına gönder.',
    dokunmatik: 'Süre canını sıkarsa menüden Rahat mod\'u aç. Bitirince Meydan oku ile süreni '
      + 'arkadaşına gönder.' },
];

/** Ana işaretçi parmaksa (dokunmatik) metinler kol / Bin / Kullan diye yazılır. */
const dokunmatikMi = () => window.matchMedia('(pointer: coarse)').matches;

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
  if (e.key === 'Escape' || ['1', '2', '3', '4'].includes(e.key) || YON_TUSLARI[e.code]) kapat();
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
  const metin = Object.assign(document.createElement('p'), {
    textContent: dokunmatikMi() ? a.dokunmatik : a.klavye,
  });
  const dugmeler = document.createElement('div');
  dugmeler.className = 'rehber-dugmeler';
  const atla = Object.assign(document.createElement('button'), {
    type: 'button', textContent: 'Atla', className: 'dugme-metin',
  });
  atla.addEventListener('click', kapat);
  const ileri = Object.assign(document.createElement('button'), {
    type: 'button', textContent: son ? 'Başla' : 'İleri',
  });
  ileri.addEventListener('click', () => {
    if (son) kapat();
    else { adim += 1; ciz(); }
  });
  ileri.classList.add('rehber-ileri', 'dugme-birincil');
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

dugmeEkle('ust', {
  metin: 'Rehber', baslik: 'Nasıl oynanır? Rehberi aç', ikon: ikon('soru'), tikla: rehberiAc,
});
if (!goruldu()) rehberiAc();
