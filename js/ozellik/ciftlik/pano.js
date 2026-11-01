/**
 * Sipariş panosu: tuvalin sağ üstünde (telefonda şeridin altında, tam genişlikte) kâğıt
 * panel; üç kart (sıradaki damga siparişi + iki dönen sipariş): başlık, ürün, ilerleme çubuğu
 * ve sayı, ödül, süreli kartta kum saati, dönen kartta "Geri çevir". Kartlar kimliğine göre
 * yerinde güncellenir (saniyede dört kez yeniden kurulmaz). Alt satır Komşu kapısı panelini
 * açar. Veri 'ciftlik-hud' olayından gelir; açık/kapalı tercih tarayıcıda hatırlanır
 * (masaüstünde varsayılan açık, telefonda kapalı). Geri çevirme komutu: siparisCevir.
 */
import { dinle, yay } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { kurusMetni, tikSuresi } from './hud-veri.js';
import { simge } from './simge.js';
import { yap, dugme, tuvalKap } from './yap.js';
import { stilYukle } from '../pencere.js';

stilYukle('./ciftlik/pano.css');

const ANAHTAR = 'haystack-hunt:ciftlik-pano';

function tercih() {
  try {
    const d = localStorage.getItem(ANAHTAR);
    if (d !== null) return d === '1';
  } catch (hata) {
    console.error('Pano tercihi okunamadı:', hata);
  }
  return matchMedia('(min-width: 900px)').matches;
}

function tercihYaz(acik) {
  try {
    localStorage.setItem(ANAHTAR, acik ? '1' : '0');
  } catch (hata) {
    console.error('Pano tercihi yazılamadı:', hata);
  }
}

const pano = yap('aside', 'cf-pano kagit-pencere');
pano.setAttribute('data-ciftlik-pano', '');
pano.setAttribute('aria-label', 'Sipariş panosu');
const baslik = yap('header', 'cf-pano-baslik');
const kapat = dugme('cf-pano-kapat', '×', 'Panoyu kapat', () => panoAc(false));
baslik.append(simge('pano', 18), yap('h2', '', 'Pano'), kapat);
const liste = yap('ol', 'cf-kartlar');
const kapiDugme = dugme('cf-kapi-ac dugme-ikincil', '', 'Komşu kapısı: sat, araba çağır, çayır',
  () => yay('ciftlik-ekran-ac', { ad: 'kapi' }));
kapiDugme.append(simge('kapi', 18), yap('span', '', 'Komşu kapısı'));
pano.append(baslik, liste, kapiDugme);
pano.hidden = true;
tuvalKap().append(pano);

/** Panoyu açar/kapatır (tercih saklanır). */
export function panoAc(acik = pano.hidden) {
  pano.hidden = !acik;
  document.body.classList.toggle('cf-pano-acik', acik);
  document.querySelector('[data-ciftlik-pano-dugme]')?.setAttribute('aria-pressed', String(acik));
  tercihYaz(acik);
}

/** Kart öğesi: değişen parçalar için tutamaklarla. */
function kartKur(k) {
  const li = yap('li', `cf-kart tur-${k.tur}`);
  const ust = yap('div', 'cf-kart-ust');
  const etiket = yap('span', 'cf-kart-etiket');
  if (k.damga) etiket.append(simge('damga', 15), yap('b', '', k.damga));
  else etiket.append(simge('kamyon', 15));
  const ad = yap('strong', 'cf-kart-baslik', k.baslik);
  const odul = yap('span', 'cf-odul');
  odul.append(simge('kurus', 15), yap('b', 'sayi'));
  ust.append(etiket, ad, odul);
  const metin = yap('p', 'cf-kart-metin', k.metin);
  const sure = yap('span', 'cf-sure');
  sure.append(simge('kumsaati', 15), yap('b', 'sayi'));
  const cevir = dugme('cf-cevir dugme-metin', 'Geri çevir', `${k.baslik} siparişini geri çevir`,
    () => komutEkle(durumAl().ciftlik, { tur: 'siparisCevir', yuva: k.yuva }));
  const orta = yap('div', 'cf-kart-orta');
  orta.append(metin, sure, cevir);
  const cubuk = yap('div', 'cf-ilerleme');
  cubuk.setAttribute('role', 'progressbar');
  const dolgu = yap('i');
  const sayi = yap('span', 'sayi');
  cubuk.append(dolgu, sayi);
  li.append(ust, orta, cubuk);
  return { li, metin, cubuk, dolgu, sayi, odul: odul.lastChild, sure, sureSayi: sure.lastChild,
    cevir, kimlik: k.kimlik };
}

function kartGuncelle(o, k) {
  o.metin.textContent = k.metin;
  const oran = k.hedef ? Math.min(1, k.ilerleme / k.hedef) : 0;
  o.dolgu.style.setProperty('--oran', `${Math.round(oran * 100)}%`);
  o.sayi.textContent = `${kurusMetni(k.ilerleme)}/${kurusMetni(k.hedef)}`;
  o.cubuk.setAttribute('aria-valuenow', String(Math.round(oran * 100)));
  o.cubuk.setAttribute('aria-label', `${k.baslik}: ${k.metin}`);
  o.li.classList.toggle('bitti', oran >= 1);
  o.odul.textContent = `+${kurusMetni(k.odul)}`;
  o.sure.hidden = k.kalanTik === null;
  if (k.kalanTik !== null) o.sureSayi.textContent = tikSuresi(k.kalanTik);
  o.cevir.hidden = !k.geriCevir;
}

let kartlar = [];

dinle('ciftlik-hud', ({ eko }) => {
  const anahtar = eko.kartlar.map((k) => k.kimlik).join();
  if (anahtar !== kartlar.map((o) => o.kimlik).join()) {
    kartlar = eko.kartlar.map(kartKur);
    liste.replaceChildren(...kartlar.map((o) => o.li));
  }
  eko.kartlar.forEach((k, i) => kartGuncelle(kartlar[i], k));
});
dinle('ciftlik-ekran-ac', ({ ad }) => {
  if (ad === 'pano') panoAc(pano.hidden);
});
dinle('ciftlik-acildi', () => panoAc(tercih()));
dinle('oyun-basladi', ({ durum }) => {
  if (durum.mod !== 'ciftlik') {
    pano.hidden = true;
    document.body.classList.remove('cf-pano-acik');
  }
});
