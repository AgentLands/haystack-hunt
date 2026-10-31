/**
 * Erişilebilirlik: oyun olaylarını ekran okuyucuya duyurur (görünmez aria-live bölge).
 * Dedektör sonucu, iğnenin görünmesi, parıltı, bulma ve pes etme sesli okunur.
 */
import { dinle } from '../olaylar.js';
import { sureMetni, sayi } from '../arayuz.js';

const bolge = document.createElement('div');
bolge.id = 'duyuru';
bolge.className = 'gorunmez';
bolge.setAttribute('role', 'status');
bolge.setAttribute('aria-live', 'polite');
bolge.setAttribute('aria-atomic', 'true');
document.body.append(bolge);

let sayac = 0;

/** Aynı metin art arda gelse de okunsun diye görünmez bir ek ile yazar. */
function duyur(metin) {
  sayac += 1;
  bolge.textContent = sayac % 2 ? metin : `${metin} `;
}

dinle('oyun-basladi', ({ durum }) => duyur(`Yeni tarla: ${durum.etiket}. İğneyi ara.`));
dinle('dedektor', ({ seviye, kalan }) => duyur(
  `Dedektör: ${seviye.ad.replace(/!$/, '')}. ${kalan} hakkın kaldı.`,
));
dinle('dedektor-bos', () => duyur('Dedektör hakkın bitti.'));
dinle('igne-gorundu', () => duyur('İğne açığa çıktı. Üstüne elle bas.'));
dinle('parilti', () => duyur('Güneşte bir şey parladı.'));
dinle('bulundu', ({ sonuc }) => duyur(
  `İğneyi buldun. ${sonuc.rahat ? '' : `${sureMetni(sonuc.sureMs)} sürdü, `}`
  + `${sayi.format(sonuc.kaldirilan)} saman kaldırıldı.`,
));
dinle('pes-edildi', () => duyur('Pes ettin, iğne gösterildi.'));
