/**
 * Bitiş "kantar fişi" (index.html #bitis): iğne bulununca satırları (süre, saman, haklar,
 * çivi cezası, zorluk) ve puanı doldurur; fişe × kapatma düğmesini ekler.
 */
import { dinle } from '../olaylar.js';
import { sayi, sureMetni } from '../arayuz.js';
import { zorlukAl } from '../kural/zorluk.js';
import { gununEtiketi } from '../kural/rastgele.js';
import { durumAl } from '../oyun.js';
import { buluntuSayisi } from '../oyun-buluntu.js';
import { pencereHazirla } from './pencere.js';

const $ = (id) => document.getElementById(id);

pencereHazirla($('bitis'), { kap: $('bitis').firstElementChild });

dinle('bulundu', ({ sonuc }) => {
  const ayar = zorlukAl(sonuc.zorluk);
  const ad = sonuc.etiket === gununEtiketi() ? 'Günün tarlası' : 'Tarla No.';
  $('fis-no').textContent = `${ad} ${sonuc.etiket.toLocaleUpperCase('tr')}`;
  $('fis-sure').textContent = sureMetni(sonuc.sureMs);
  $('fis-saman').textContent = sayi.format(sonuc.kaldirilan);
  $('fis-dedektor').textContent = `${sonuc.dedektorKullanilan} / ${sonuc.dedektorHakki}`;
  $('fis-miknatis').textContent = `${sonuc.miknatisKullanilan} / ${sonuc.miknatisHakki}`;
  $('fis-civi-satir').hidden = !(sonuc.cezaMs > 0);
  $('fis-civi').textContent = `+${sonuc.cezaMs / 1000} sn`;
  const { alinan, toplam } = buluntuSayisi(durumAl());
  $('fis-buluntu').textContent = `${alinan} / ${toplam}`;
  $('fis-zorluk').textContent = `${ayar.ad} ×${ayar.carpan}`;
  $('puan').textContent = sayi.format(sonuc.puan);
});
