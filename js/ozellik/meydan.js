/**
 * Arkadaşa meydan okuma: bitiş fişinde "Meydan oku" (paylaşım ya da pano) bağlantısı üretir;
 * `?rakip=` ile açılan oyunda HUD'a "Geçilecek süre" etiketi koyar, bitişte farkı yazar.
 * Saf kurallar js/kural/meydan.js'te. Ad yalnız textContent ile gösterilir. Sunucu yok.
 */
import { dinle } from '../olaylar.js';
import { durumAl } from '../oyun.js';
import {
  meydanAyristir, meydanBaglantisi, hedefMetni, farkMetni, davetMetni, AD_AZAMI,
} from '../kural/meydan.js';
import { etiketEkle } from './etiket-yigini.js';

const AD_ANAHTAR = 'haystack-hunt:meydan-ad';
const $ = (id) => document.getElementById(id);

/** Sayfa açılırken bağlantıdan gelen meydan okuma (yoksa null); oyun boyunca sabit. */
const gelen = meydanAyristir(location.search);

function kayitliAd() {
  try {
    return window.localStorage.getItem(AD_ANAHTAR) || '';
  } catch (hata) {
    console.error('Meydan adı okunamadı:', hata);
    return '';
  }
}

function adiKaydet(ad) {
  try {
    window.localStorage.setItem(AD_ANAHTAR, ad);
  } catch (hata) {
    console.error('Meydan adı kaydedilemedi:', hata);
  }
}

function sat(etiket, sinif, metin) {
  const e = document.createElement(etiket);
  e.className = sinif;
  if (metin) e.textContent = metin;
  return e;
}

// HUD: geçilecek süre etiketi (kâğıt, iğneli).
const hedef = etiketEkle('hedef');
hedef.hidden = true;
if (gelen) hedef.textContent = hedefMetni(gelen);

// Fiş: fark cümlesi, ad girdisi ve düğme.
const fark = sat('p', 'fis-not meydan-fark');
fark.hidden = true;
$('istatistik-bitis').before(fark);

const adKutusu = sat('label', 'meydan-ad', 'Adın (isteğe bağlı)');
const adGirdi = sat('input', '');
adGirdi.type = 'text';
adGirdi.maxLength = AD_AZAMI;
adGirdi.autocomplete = 'nickname';
adGirdi.value = kayitliAd();
adGirdi.addEventListener('change', () => adiKaydet(adGirdi.value));
adKutusu.append(adGirdi);

const dugme = sat('button', 'dugme-ikincil meydan-dugme', 'Meydan oku');
dugme.type = 'button';
dugme.title = 'Süreni arkadaşına bağlantıyla gönder';
const dugmeler = $('bitis').querySelector('.dugmeler');
dugmeler.before(adKutusu);
dugmeler.insertBefore(dugme, $('tekrar'));

async function meydanOku() {
  const sonuc = durumAl().sonuc;
  if (!sonuc) return;
  const ad = adGirdi.value;
  adiKaydet(ad);
  const adres = meydanBaglantisi({
    taban: location.href, tohum: sonuc.etiket, zorluk: sonuc.zorluk, sureMs: sonuc.sureMs, ad,
  });
  const metin = davetMetni(sonuc.sureMs, ad);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Haystack Hunt', text: metin, url: adres });
      dugme.textContent = 'Paylaşıldı';
      return;
    } catch (hata) {
      if (hata.name === 'AbortError') return; // oyuncu paylaşım penceresini kapattı
      console.error('Paylaşılamadı, panoya düşülüyor:', hata);
    }
  }
  try {
    await navigator.clipboard.writeText(`${metin}\n${adres}`);
    dugme.textContent = 'Kopyalandı';
  } catch (hata) {
    console.error('Panoya yazılamadı:', hata);
    dugme.textContent = 'Kopyalanamadı';
  }
}
dugme.addEventListener('click', meydanOku);

/** Bu oyun bağlantıdaki tarla mı (aynı tohum ve zorluk, rahat değil)? */
const aktifMi = (durum) => Boolean(gelen) && durum.etiket === gelen.tohum
  && durum.zorluk === gelen.zorluk && !durum.rahat;

dinle('oyun-basladi', ({ durum }) => {
  const aktif = aktifMi(durum);
  hedef.hidden = !aktif;
  fark.hidden = true;
  dugme.textContent = 'Meydan oku';
  // Bağlantıdaki rakip yalnız o tarlaya aittir: başka tarlada adresten de düşer.
  const adres = new URL(location.href);
  if (aktif) {
    adres.searchParams.set('rakip', String(gelen.rakipMs));
    if (gelen.ad) adres.searchParams.set('ad', gelen.ad);
  } else {
    adres.searchParams.delete('rakip');
    adres.searchParams.delete('ad');
  }
  history.replaceState(null, '', adres);
});

dinle('bulundu', ({ sonuc }) => {
  const durum = durumAl();
  if (!aktifMi(durum)) return;
  const { metin, gecti } = farkMetni(sonuc.sureMs, gelen.rakipMs);
  fark.textContent = metin;
  fark.className = `fis-not meydan-fark ${gecti === false ? 'geride' : 'gecti'}`;
  fark.hidden = false;
});
