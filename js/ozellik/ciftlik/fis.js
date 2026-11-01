/**
 * Çevrimdışı dönüş fişi: çiftlik açılırken G'nin hesapladığı "sen yokken" kazancı
 * ('ciftlik-cevrimdisi' { dk, kazanc }) kantar fişi biçiminde gösterilir: geçen süre, depolara
 * giren eşyalar, kuruş ve dolan depolar ("Ambar doldu": kayıp değil, sınırdır; ekonomi.md §7).
 * kazanc: { esya: { eşyaKodu: adet }, kurus, dolu: ['Ambar'] }; düz { kod: adet } da kabul
 * edilir. Menü açıksa kapanınca gösterilir. Fiş kapanınca oyun kaldığı yerden sürer.
 */
import { dinle } from '../../olaylar.js';
import { dakikaMetni, kurusMetni, fisSatirlari } from './hud-veri.js';
import { yap, dugme } from './yap.js';
import { pencereHazirla, stilYukle } from '../pencere.js';

stilYukle('./ciftlik/pano.css');

let pencere = null;
let govde = null;

function kur() {
  pencere = yap('dialog', 'fis-pencere cf-fis');
  pencere.setAttribute('aria-labelledby', 'cf-fis-baslik');
  const kap = yap('div', 'fis kagit-pencere');
  kap.tabIndex = -1;
  const baslik = yap('h2', '', 'Sen yokken');
  baslik.id = 'cf-fis-baslik';
  govde = yap('div', 'cf-fis-govde');
  const dugmeler = yap('div', 'dugmeler');
  dugmeler.append(dugme('dugme-birincil', 'Devam', 'Fişi kapat', () => pencere.close()));
  kap.append(yap('p', 'fis-ust', 'Çiftlik kantarı'), baslik, yap('p', 'fis-no sayi', ''),
    yap('span', 'fis-damga', 'Çalıştı'), govde, dugmeler);
  pencere.append(kap);
  document.body.append(pencere);
  pencereHazirla(pencere, { kap });
}

function goster({ dk, kazanc }) {
  const menu = document.getElementById('menu');
  if (menu?.open) {
    menu.addEventListener('close', () => goster({ dk, kazanc }), { once: true });
    return;
  }
  if (!pencere) kur();
  pencere.querySelector('.fis-no').textContent = `${dakikaMetni(dk)} geçti`;
  const dl = yap('dl', 'fis-satirlar');
  const satirlar = fisSatirlari(kazanc);
  for (const [ad, n] of satirlar) {
    dl.append(yap('div'));
    dl.lastChild.append(yap('dt', '', `${ad} depoya girdi`), yap('dd', '', kurusMetni(n)));
  }
  if (kazanc.kurus > 0) {
    dl.append(yap('div'));
    const kurus = `+${kurusMetni(kazanc.kurus)}`;
    dl.lastChild.append(yap('dt', '', 'Kapıda satılan'), yap('dd', '', kurus));
  }
  const ozet = yap('p', 'fis-ozet', satirlar.length || kazanc.kurus > 0
    ? 'Hatlar sen yokken de çalıştı; kazanç depolara yazıldı.'
    : 'Sen yokken depolara bir şey girmedi.');
  const notlar = (kazanc.dolu ?? []).map((d) => yap('p', 'fis-not seri', `${d} doldu.`));
  govde.replaceChildren(ozet, dl, ...notlar);
  if (!pencere.open) pencere.showModal();
}

dinle('ciftlik-cevrimdisi', goster);
