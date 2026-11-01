/**
 * Komşu kapısı paneli (kâğıt pencere): "Fazlasını sat" anahtarı, "Araba çağır" ve "Çayır
 * genişlet" düğmeleri (kuruşun geç oyundaki kuyuları, ekonomi.md §2). Bedeller ve haklar
 * kapiBilgisi'nden gelir (sap.js → G ve D); işlemler komutla yapılır (kapiSat, arabaCagir,
 * cayirGenislet), sonuç sonraki tikte olay olarak döner. Komut reddedilirse ('komut-
 * reddedildi') nedeni tuvalde bildirilir. 'ciftlik-ekran-ac' { ad: 'kapi' } açar; inceleme
 * paneli de Komşu kapısına dokununca aynı olayı yayabilir.
 */
import { dinle } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { bildir } from '../../arayuz.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { kapiBilgisi } from './sap.js';
import { kurusMetni } from './hud-veri.js';
import { simge } from './simge.js';
import { yap, dugme } from './yap.js';
import { pencereHazirla, stilYukle } from '../pencere.js';

stilYukle('./ciftlik/pano.css');

const KOMUTLAR = new Set(['kapiSat', 'arabaCagir', 'cayirGenislet', 'siparisCevir']);
const NEDENLER = {
  bilinmeyen: 'Bu işlem henüz hazır değil.',
  kurus: 'Kuruş yetmiyor.',
  bekleme: 'Biraz bekle, yeni işlem için süre dolmadı.',
  limit: 'Bu işlemin hakkı bitti.',
};

let pencere = null;
let ogeler = null;

function satir(ad, simgeAdi, baslik, not, tikla) {
  const s = yap('div', `cf-kapi-satir ${ad}`);
  const govde = yap('div', 'cf-kapi-metin');
  govde.append(yap('strong', '', baslik), yap('small', '', not));
  const d = dugme('dugme-birincil cf-kapi-dugme', '', baslik, tikla);
  s.append(simge(simgeAdi, 26), govde, d);
  return { s, d };
}

function kur() {
  pencere = yap('dialog', 'kagit-pencere pencere cf-kapi');
  pencere.setAttribute('aria-labelledby', 'cf-kapi-baslik');
  const baslik = yap('h2', '', 'Komşu kapısı');
  baslik.id = 'cf-kapi-baslik';
  const not = yap('p', 'cf-kapi-not', 'Kapıya gelen eşya önce siparişlere sayılır; kalanı '
    + 'fiyatından satılır ya da atılır.');
  const sat = dugme('cf-anahtar', '', 'Fazlasını sat', () => komutEkle(durumAl().ciftlik,
    { tur: 'kapiSat', acik: sat.getAttribute('aria-pressed') !== 'true' }));
  sat.setAttribute('role', 'switch');
  sat.append(yap('span', 'cf-anahtar-yuva'), yap('span', '', 'Fazlasını sat'));
  const araba = satir('araba', 'kamyon', 'Araba çağır',
    'Harman arabası hemen yeni bir yığın ve yeni bir iğne getirir.',
    () => komutEkle(durumAl().ciftlik, { tur: 'arabaCagir' }));
  const cayir = satir('cayir', 'cayir', 'Çayır genişlet',
    'Çayıra yeni bir karo sütunu eklenir; ot daha çok büyür.',
    () => komutEkle(durumAl().ciftlik, { tur: 'cayirGenislet' }));
  pencere.append(baslik, not, sat, araba.s, cayir.s);
  document.body.append(pencere);
  pencereHazirla(pencere, { dis: true });
  ogeler = { sat, araba, cayir };
}

/** Düğme etiketi: bedel + kuruş simgesi; uygun değilse soluk. */
function bedelYaz(d, bilgi, ek = '') {
  d.replaceChildren(simge('kurus', 16), yap('span', 'sayi', `${kurusMetni(bilgi.bedel)}${ek}`));
  d.disabled = !bilgi.uygun;
  d.title = bilgi.neden ?? '';
}

function guncelle() {
  const b = kapiBilgisi(durumAl());
  ogeler.sat.setAttribute('aria-pressed', String(b.fazlasiniSat));
  bedelYaz(ogeler.araba.d, b.araba);
  bedelYaz(ogeler.cayir.d, b.cayir, ` · ${b.cayir.adim}/${b.cayir.toplam}`);
}

/** Paneli açar (çiftlik durumuyla tazeler). */
export function kapiAc() {
  if (!pencere) kur();
  guncelle();
  if (!pencere.open) pencere.showModal();
}

dinle('ciftlik-ekran-ac', ({ ad }) => {
  if (ad === 'kapi') kapiAc();
});
dinle('ciftlik-hud', () => {
  if (pencere?.open) guncelle();
});
dinle('komut-reddedildi', ({ komut, neden }) => {
  if (KOMUTLAR.has(komut.tur)) bildir(NEDENLER[neden] ?? `İşlem olmadı (${neden}).`, 2600);
});
