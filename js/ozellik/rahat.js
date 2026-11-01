/**
 * Temizlik göstergesi ve rahat mod. HUD'da "Tarla %37 temiz" (tarladan çıkan saman /
 * başlangıç saman; yalnız bilgi, puana girmez). Rahat mod (?rahat=1 ya da menü kartında
 * zorluğun altındaki anahtar; tarla baştan açılır, menu.js tarlaBastanAc):
 * süre ve puan gizlenir, paslı çivi cezası 0, fişte yalnız "buldum" ve temizlik yüzdesi.
 * Kural tarafı: oyun.js durum.rahat, kural/civi.js civiAl. Puan hesabına dokunulmaz.
 */
import { dinle } from '../olaylar.js';
import { menuAyarEkle, tarlaBastanAc } from './menu.js';
import { durumAl, yeniOyun, rahatAyarla, rahatMi } from '../oyun.js';
import { temizYuzde, yuzdeYaz } from '../kural/ilerleme.js';
import { meydanAyristir } from '../kural/meydan.js';
import { etiketEkle } from './etiket-yigini.js';

const ANAHTAR = 'haystack-hunt:rahat';
const $ = (id) => document.getElementById(id);

function kayitliMi() {
  try {
    return window.localStorage.getItem(ANAHTAR) === '1';
  } catch (hata) {
    console.error('Rahat mod ayarı okunamadı:', hata);
    return false;
  }
}

function kaydet(acik) {
  try {
    window.localStorage.setItem(ANAHTAR, acik ? '1' : '0');
  } catch (hata) {
    console.error('Rahat mod ayarı kaydedilemedi:', hata);
  }
}

// Karar, ilk oyun kurulmadan önce verilir. Meydan okuma bağlantısı süreyle ilgilidir:
// o oturumda rahat kapalı açılır (kayıtlı tercih silinmez).
const adres = new URLSearchParams(location.search);
const istenen = adres.get('rahat') === '1' || (!adres.has('rahat') && kayitliMi());
rahatAyarla(istenen && meydanAyristir(location.search) === null);

// HUD: temizlik yüzdesi.
const temiz = etiketEkle('temiz');
const yuzdeKutusu = document.createElement('strong');
temiz.append('Tarla ', yuzdeKutusu, ' temiz');
let sonYuzde = -1;

/** Süre kutusu: üst panelde #sure'nin kendi kutusu (panelin tamamı değil). */
function sureKutusu() {
  const sure = $('sure');
  const kap = sure.parentElement;
  return kap.children.length <= 3 ? kap : sure;
}
sureKutusu().setAttribute('data-rahat-gizle', '');

const dugme = document.createElement('button');
dugme.type = 'button';
dugme.className = 'zorluk-damga rahat-damga';
dugme.textContent = 'Rahat mod';
dugme.title = 'Süre ve puan gizli, çivi cezası yok (tarla baştan açılır)';
dugme.addEventListener('click', () => {
  const acik = !rahatMi();
  const metin = acik ? 'Bu tarla rahat modda (süresiz, puansız) baştan açılacak.'
    : 'Bu tarla süreli ve puanlı olarak baştan açılacak.';
  tarlaBastanAc(metin, () => {
    rahatAyarla(acik);
    kaydet(acik);
    yeniOyun(durumAl().etiket);
  });
});
const aciklama = document.createElement('span');
aciklama.className = 'menu-ayar-not';
aciklama.textContent = 'süre ve puan yok';
menuAyarEkle(dugme, aciklama);

function arayuzuGuncelle(rahat) {
  document.body.classList.toggle('rahat-mod', rahat);
  $('bitis').classList.toggle('rahat-fis', rahat);
  dugme.setAttribute('aria-pressed', String(rahat));
  const bag = new URL(location.href);
  if (rahat) bag.searchParams.set('rahat', '1');
  else bag.searchParams.delete('rahat');
  history.replaceState(null, '', bag);
}

dinle('oyun-basladi', ({ durum }) => {
  arayuzuGuncelle(durum.rahat);
  sonYuzde = -1;
});

dinle('kare', ({ durum }) => {
  const yuzde = temizYuzde(durum.tarla);
  if (yuzde === sonYuzde) return;
  sonYuzde = yuzde;
  yuzdeKutusu.textContent = yuzdeYaz(yuzde);
});

dinle('bulundu', ({ sonuc }) => {
  if (!sonuc.rahat) return;
  const yuzde = temizYuzde(durumAl().tarla);
  // arayuz.js #sonuc'u bu dinleyiciden sonra yazar (kayıt sırası); onun ardından düzeltilir.
  queueMicrotask(() => {
    $('sonuc').textContent = `Buldun! Tarlanın ${yuzdeYaz(yuzde)} kadarını temizledin.`;
  });
});
