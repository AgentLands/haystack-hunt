/**
 * Mekanik arayüzü: zorluk (?zorluk=kolay|normal|zor; seçici menu.js'te), mıknatıs hakkı,
 * paslı çivi ve mıknatıs bildirimleri, bitiş penceresinde puan. Çivi çizimi civi-cizim.js'te.
 */
import { dinle } from '../olaylar.js';
import { varsayilanZorlukAyarla } from '../oyun.js';
import { VARSAYILAN_ZORLUK, zorlukAl } from '../kural/zorluk.js';
import { bildir, sayi, paylasimEkiKaydet } from '../arayuz.js';
import './civi-cizim.js';

const $ = (id) => document.getElementById(id);

// İlk tarla (ana.js'teki yeniOyun) URL'deki zorlukla kurulsun.
varsayilanZorlukAyarla(new URLSearchParams(location.search).get('zorluk'));

dinle('oyun-basladi', ({ durum }) => {
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
dinle('civi-alindi', ({ ceza }) => bildir(`Paslı çivi! +${ceza / 1000} sn`));

dinle('bulundu', ({ sonuc }) => {
  const ayar = zorlukAl(sonuc.zorluk);
  const ceza = sonuc.cezaMs > 0 ? ` · çivi cezası +${sonuc.cezaMs / 1000} sn` : '';
  $('puan').textContent = `Puan: ${sayi.format(sonuc.puan)} (${ayar.ad} ×${ayar.carpan}`
    + ` · mıknatıs ${sonuc.miknatisKullanilan}/${sonuc.miknatisHakki}${ceza})`;
});

paylasimEkiKaydet((sonuc) => (typeof sonuc.puan === 'number'
  ? `🏅 ${sayi.format(sonuc.puan)} puan · ${zorlukAl(sonuc.zorluk).ad}` : ''));
