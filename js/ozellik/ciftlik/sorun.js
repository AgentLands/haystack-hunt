/**
 * Sorun listesi: üst şeritteki ⚠ düğmesiyle açılan küçük kâğıt panel. Her satır tıkanan bir
 * parçadır (ad, durum etiketi, neden cümlesi); satıra dokununca kamera parçaya gider ve parça
 * kısa süre halkayla işaretlenir ('ciftlik-sorun-secildi'). Altta "bekleyenler" (girdisi
 * olmayan parçalar) sönük gösterilir. Veri 'ciftlik-hud' olayından; Esc ya da dışarı
 * dokunuş kapatır. Hiçbir tıkanma sessiz kalmaz: bilinmeyen durum kodu da satır olur.
 */
import { dinle, yay } from '../../olaylar.js';
import { escOnleyiciEkle } from '../menu-kanca.js';
import { KISA } from './sorun-veri.js';
import { simge } from './simge.js';
import { yap, dugme, tuvalKap, kameraGit } from './yap.js';
import { stilYukle } from '../pencere.js';

stilYukle('./ciftlik/pano.css');

const kutu = yap('div', 'cf-sorun-liste kagit-pencere');
kutu.setAttribute('role', 'dialog');
kutu.setAttribute('aria-label', 'Sorun listesi');
kutu.hidden = true;
const baslik = yap('h2', '', 'Sorunlar');
const liste = yap('ul', 'cf-sorun-satirlar');
const bekle = yap('details', 'cf-bekleyenler');
kutu.append(baslik, liste, bekle);
tuvalKap().append(kutu);

let anahtar = '';
let sonVeri = { sorunlar: [], bekleyenler: [] };

function git(s) {
  kameraGit(s.kx, s.ky, s.en, s.boy);
  yay('ciftlik-sorun-secildi', { parca: s.id, kx: s.kx, ky: s.ky });
  sorunKapat();
}

function satir(s, sonuk = false) {
  const li = yap('li');
  const d = dugme(`cf-sorun-satir${sonuk ? ' sonuk' : ''}${s.agir ? ' agir' : ''}`, '',
    `${s.ad}: ${s.neden} Kameraya git.`, () => git(s));
  const ust = yap('span', 'cf-sorun-ust');
  ust.append(simge(sonuk ? 'hedef' : 'uyari', 16), yap('strong', '', s.ad),
    yap('em', 'cf-durum-etiket', KISA[s.durum] ?? s.durum));
  d.append(ust, yap('span', 'cf-sorun-neden', s.neden));
  li.append(d);
  return li;
}

function ciz() {
  const { sorunlar, bekleyenler } = sonVeri;
  const yeni = [...sorunlar, ...bekleyenler].map((s) => `${s.id}${s.durum}`).join();
  if (yeni === anahtar) return;
  anahtar = yeni;
  baslik.textContent = sorunlar.length ? `Sorunlar (${sorunlar.length})` : 'Sorun yok';
  const bos = yap('li', 'cf-sorun-bos', 'Bütün parçalar çalışıyor ya da sırasını bekliyor.');
  liste.replaceChildren(...(sorunlar.length ? sorunlar.map((s) => satir(s)) : [bos]));
  bekle.hidden = bekleyenler.length === 0;
  bekle.replaceChildren(yap('summary', '', `Bekleyenler (${bekleyenler.length})`),
    ...bekleyenler.map((s) => satir(s, true)));
}

/** Listeyi kapatır; odak ⚠ düğmesine döner. */
export function sorunKapat() {
  if (kutu.hidden) return;
  kutu.hidden = true;
  document.querySelector('.cf-sorun')?.setAttribute('aria-expanded', 'false');
}

function sorunAc() {
  ciz();
  kutu.hidden = false;
  document.querySelector('.cf-sorun')?.setAttribute('aria-expanded', 'true');
  kutu.querySelector('button')?.focus({ preventScroll: true });
}

dinle('ciftlik-hud', (v) => {
  sonVeri = v;
  if (!kutu.hidden) ciz();
});
dinle('ciftlik-ekran-ac', ({ ad }) => {
  if (ad !== 'sorun') return;
  if (kutu.hidden) sorunAc();
  else sorunKapat();
});
document.addEventListener('pointerdown', (e) => {
  if (!kutu.hidden && !e.target.closest('.cf-sorun-liste, .cf-sorun')) sorunKapat();
}, true);
escOnleyiciEkle(() => {
  if (kutu.hidden) return false;
  sorunKapat();
  return true;
});
dinle('oyun-basladi', sorunKapat);
