/**
 * Yarış penceresi: giriş görünümü (ad, oda kur, kodla katıl) ve oda görünümü (kod, oyuncu
 * listesi/sıralama, Başlat/Rövanş, Ayrıl). Yalnız DOM; eylemler pencereKur'a verilir.
 */
import { oyuncuSatiri, sirala } from './yaris-cizim.js';

const AD_ANAHTARI = 'haystack-hunt.yaris.ad';
const SABLON = `
  <h2>Yarış</h2>
  <form class="yaris-giris" data-gorunum="giris">
    <label>Adın <input name="ad" maxlength="16" autocomplete="nickname"></label>
    <div class="dugmeler"><button type="submit" value="kur">Oda kur</button></div>
    <p class="yaris-ayrac">ya da koduyla bir odaya katıl</p>
    <div class="yaris-katil">
      <input name="kod" maxlength="4" placeholder="KOD" autocomplete="off"
        autocapitalize="characters" spellcheck="false" aria-label="Oda kodu">
      <button type="submit" value="katil">Katıl</button>
    </div>
  </form>
  <section data-gorunum="oda">
    <p class="yaris-kod">Oda kodu <strong data-ref="kod"></strong></p>
    <p class="yaris-bilgi" data-ref="bilgi"></p>
    <ol class="yaris-liste" data-ref="liste"></ol>
    <p class="yaris-not">Diğer oyuncuların çiftçileri ve makineleri yalnız görüntüdür: herkes
      kendi tarlasında kazar.</p>
    <div class="dugmeler">
      <button type="button" data-ref="baslat">Başlat</button>
      <button type="button" data-ref="ayril" class="ikincil">Odadan ayrıl</button>
    </div>
  </section>
  <form method="dialog" class="yaris-kapat"><button>Kapat</button></form>`;

let pencere = null;
const ref = (ad) => pencere.querySelector(`[data-ref="${ad}"]`);

function kayitliAd() {
  try {
    return localStorage.getItem(AD_ANAHTARI) || '';
  } catch (hata) {
    console.error('localStorage okunamadı:', hata);
    return '';
  }
}

function adKaydet(ad) {
  try {
    localStorage.setItem(AD_ANAHTARI, ad);
  } catch (hata) {
    console.error('localStorage yazılamadı:', hata);
  }
}

/** eylemler: { kur(ad), katil(kod, ad), baslat(), ayril(), kapandi() } */
export function pencereKur(eylemler) {
  pencere = document.createElement('dialog');
  pencere.id = 'yaris-pencere';
  pencere.className = 'yaris-pencere';
  pencere.innerHTML = SABLON;
  document.body.append(pencere);
  const giris = pencere.querySelector('.yaris-giris');
  giris.elements.ad.value = kayitliAd();
  giris.addEventListener('submit', (e) => {
    e.preventDefault();
    const ad = giris.elements.ad.value.trim();
    const kod = giris.elements.kod.value.trim().toUpperCase();
    if (!ad) {
      giris.elements.ad.focus();
      return;
    }
    adKaydet(ad);
    if (e.submitter && e.submitter.value === 'katil') {
      if (!/^[A-Za-z]{4}$/.test(kod)) {
        giris.elements.kod.focus();
        return;
      }
      eylemler.katil(kod, ad);
    } else {
      eylemler.kur(ad);
    }
  });
  ref('baslat').addEventListener('click', eylemler.baslat);
  ref('ayril').addEventListener('click', eylemler.ayril);
  pencere.addEventListener('close', eylemler.kapandi);
}

export function pencereAc() {
  if (!pencere.open) pencere.showModal();
}

export function pencereKapat() {
  if (pencere.open) pencere.close();
}

function bilgiMetni(oda, kurucuMu) {
  if (oda.durum === 'lobi') {
    return kurucuMu ? 'Arkadaşların bu kodla katılır. Herkes gelince Başlat.'
      : 'Kurucunun başlatması bekleniyor…';
  }
  if (oda.durum === 'geri-sayim') return 'Başlıyor…';
  if (oda.durum === 'yaris') return 'Yarış sürüyor.';
  const kazanan = oda.oyuncular.find((k) => k.sira === 1);
  const sonra = kurucuMu ? ' Rövanş için Başlat.' : '';
  return (kazanan ? `Kazanan: ${kazanan.ad}.` : 'Kimse iğneyi bulamadı.') + sonra;
}

/** Odadaysa oda görünümünü, değilse giriş görünümünü çizer. */
export function pencereGoster(oda, benimId) {
  pencere.querySelector('[data-gorunum="giris"]').hidden = Boolean(oda);
  pencere.querySelector('[data-gorunum="oda"]').hidden = !oda;
  if (!oda) return;
  const kurucuMu = oda.kurucu === benimId;
  ref('kod').textContent = oda.kod;
  ref('bilgi').textContent = bilgiMetni(oda, kurucuMu);
  const liste = oda.durum === 'lobi' ? oda.oyuncular : sirala(oda.oyuncular);
  ref('liste').replaceChildren(...liste.map((k) => {
    const satir = oyuncuSatiri('li', k, benimId);
    if (k.id === oda.kurucu) satir.querySelector('.yaris-ad').title = 'Kurucu';
    return satir;
  }));
  const baslat = ref('baslat');
  baslat.hidden = !kurucuMu || (oda.durum !== 'lobi' && oda.durum !== 'bitti');
  baslat.textContent = oda.durum === 'bitti' ? 'Rövanş' : 'Başlat';
}
