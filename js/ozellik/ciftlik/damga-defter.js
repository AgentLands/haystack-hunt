/**
 * Damga defteri (kâğıt pencere): D1-D14 kilometre taşları. Basılmış damga kırmızı çift halkalı
 * lastik damga olarak durur, sıradaki kesik çizgili ve vurgulu, ötekiler soluk (kilit simgeli);
 * her satırda koşul, ödül ve açtığı parçalar. Altta usta rozetleri. Veri 'ciftlik-hud'
 * olayındaki ekonomiAl çıktısından (damgalar, rozetler); açıkken yerinde tazelenir.
 * 'ciftlik-ekran-ac' { ad: 'damga' } açar.
 */
import { dinle } from '../../olaylar.js';
import { kurusMetni } from './hud-veri.js';
import { simge } from './simge.js';
import { yap } from './yap.js';
import { pencereHazirla, stilYukle } from '../pencere.js';

stilYukle('./ciftlik/pano.css');

const DURUM_AD = { basildi: 'Basıldı', sirada: 'Sırada', kilitli: 'Kilitli' };
let pencere = null;
let ozet = null;
let liste = null;
let rozetKutu = null;
let son = null;

function kur() {
  pencere = yap('dialog', 'kagit-pencere pencere cf-defter');
  pencere.setAttribute('aria-labelledby', 'cf-defter-baslik');
  const baslik = yap('h2', '', 'Damga defteri');
  baslik.id = 'cf-defter-baslik';
  ozet = yap('p', 'cf-defter-ozet');
  liste = yap('ol', 'cf-damgalar');
  rozetKutu = yap('div', 'cf-rozetler');
  pencere.append(baslik, ozet, liste, rozetKutu);
  document.body.append(pencere);
  pencereHazirla(pencere, { dis: true });
}

function damgaSatiri(d, sira) {
  const durum = d.basildi ? 'basildi' : d.kod === sira ? 'sirada' : 'kilitli';
  const li = yap('li', `cf-damga-satir ${durum}`);
  const muhur = yap('span', 'cf-muhur');
  muhur.setAttribute('role', 'img');
  muhur.setAttribute('aria-label', DURUM_AD[durum]);
  muhur.append(yap('b', '', d.kod));
  if (durum === 'kilitli') muhur.append(simge('kilit', 13));
  const govde = yap('div', 'cf-damga-govde');
  govde.append(yap('strong', '', d.ad), yap('span', 'cf-damga-kosul', d.kosul),
    yap('small', 'cf-damga-acar', `Açar: ${d.acar.join(', ')}`));
  const odul = yap('span', 'cf-odul');
  odul.append(simge('kurus', 15), yap('b', 'sayi', `+${kurusMetni(d.odul)}`));
  li.append(muhur, govde, odul);
  return li;
}

function ciz(eko) {
  const anahtar = JSON.stringify([eko.damgalar.map((d) => d.basildi), eko.siradaki]);
  if (anahtar === son) return;
  son = anahtar;
  const basilan = eko.damgalar.filter((d) => d.basildi).length;
  ozet.textContent = `${basilan} / ${eko.damgalar.length} damga basıldı.`;
  liste.replaceChildren(...eko.damgalar.map((d) => damgaSatiri(d, eko.siradaki)));
  rozetKutu.replaceChildren(yap('h3', '', 'Usta rozetleri'), ...eko.rozetler.map((r) => {
    const e = yap('span', `cf-rozet-kart${r.kazanildi ? ' kazanildi' : ''}`);
    e.title = r.kosul;
    e.append(simge(r.kazanildi ? 'damga' : 'kilit', 15), yap('span', '', r.ad));
    return e;
  }));
}

let sonEko = null;
dinle('ciftlik-hud', ({ eko }) => {
  sonEko = eko;
  if (pencere?.open) ciz(eko);
});
dinle('ciftlik-ekran-ac', ({ ad }) => {
  if (ad !== 'damga' || !sonEko) return;
  if (!pencere) kur();
  son = null;
  ciz(sonEko);
  if (!pencere.open) pencere.showModal();
});
