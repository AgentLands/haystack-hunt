/**
 * Mekanik arayüzü: zorluk seçici (?zorluk=kolay|normal|zor), mıknatıs hakkı, paslı çivi
 * ve mıknatıs bildirimleri, bitiş penceresinde puan. Çivi çizimi civi-cizim.js'te.
 */
import { dinle } from '../olaylar.js';
import { durumAl, yeniOyun, varsayilanZorlukAyarla } from '../oyun.js';
import { ZORLUKLAR, VARSAYILAN_ZORLUK, zorlukAl } from '../kural/zorluk.js';
import { bildir, sayi, paylasimEkiKaydet } from '../arayuz.js';
import './civi-cizim.js';

const $ = (id) => document.getElementById(id);

// İlk tarla (ana.js'teki yeniOyun) URL'deki zorlukla kurulsun.
varsayilanZorlukAyarla(new URLSearchParams(location.search).get('zorluk'));

function seciciKur() {
  const secici = document.createElement('select');
  secici.id = 'zorluk';
  secici.className = 'zorluk-secici';
  secici.title = 'Zorluk (değişince yeni tarla)';
  secici.setAttribute('aria-label', 'Zorluk');
  for (const [anahtar, ayar] of Object.entries(ZORLUKLAR)) {
    secici.append(new Option(ayar.ad, anahtar));
  }
  secici.addEventListener('change', () => {
    yeniOyun(durumAl().etiket, secici.value);
    secici.blur();
  });
  document.querySelector('.araclar').append(secici);
  return secici;
}

const secici = seciciKur();

dinle('oyun-basladi', ({ durum }) => {
  secici.value = durum.zorluk;
  const adres = new URL(location.href);
  if (durum.zorluk === VARSAYILAN_ZORLUK) adres.searchParams.delete('zorluk');
  else adres.searchParams.set('zorluk', durum.zorluk);
  history.replaceState(null, '', adres);
  $('miknatis-hak').textContent = durum.miknatis;
  $('puan').textContent = '';
});

dinle('miknatis', ({ cekti, kalan }) => {
  $('miknatis-hak').textContent = kalan;
  bildir(cekti ? 'Mıknatıs bir şey çekti!' : 'Mıknatıs boşa gitti.');
});
dinle('miknatis-bos', () => bildir('Mıknatıs hakkın kalmadı.'));
dinle('civi-alindi', ({ ceza }) => bildir(
  ceza > 0 ? `Paslı çivi! +${ceza / 1000} sn` : 'Paslı çivi! Rahat modda ceza yok.',
));

// Bitiş fişi (puan dahil) js/ozellik/fis.js'te doldurulur.

paylasimEkiKaydet((sonuc) => (typeof sonuc.puan === 'number'
  ? `🏅 ${sayi.format(sonuc.puan)} puan · ${zorlukAl(sonuc.zorluk).ad}` : ''));
