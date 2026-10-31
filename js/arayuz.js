/**
 * Arayüz: araç düğmeleri, üst ikon düğmeleri ve alt eylem sırası (dugmeEkle), bildirim,
 * bitiş penceresi ve paylaşım. Tuval kenarındaki HUD (süre, saman, haklar, makine kartı)
 * hud.js'te. Oyun olaylarını dinleyerek DOM'u günceller.
 */
import { dinle } from './olaylar.js';
import { durumAl, yeniOyun, aracSec, pesEt, rastgeleEtiket } from './oyun.js';
import { gununEtiketi } from './kural/rastgele.js';
import { hudKur, sayi, sureMetni } from './hud.js';

export { sayi, sureMetni };

const $ = (id) => document.getElementById(id);

const paylasimEkleri = [];

/** Paylaşım metnine ek satır veren işlev kaydeder: islev(sonuc) → metin ya da boş. */
export function paylasimEkiKaydet(islev) {
  paylasimEkleri.push(islev);
}

/** Paylaşılacak sonuç metni (özellikler paylasimEkiKaydet ile genişletir). */
export function paylasimMetni(sonuc) {
  const temel = `Haystack Hunt · ${sonuc.etiket}\n🪡 ${sureMetni(sonuc.sureMs)} · `
    + `${sayi.format(sonuc.kaldirilan)} saman · `
    + `📡 ${sonuc.dedektorKullanilan}/${sonuc.dedektorHakki}`;
  return [temel, ...paylasimEkleri.map((ek) => ek(sonuc))].filter(Boolean).join('\n');
}

let bildirimZamani = null;

/** Tuvalin üstünde kısa bir bildirim gösterir (özellikler de kullanır). */
export function bildir(metin, sure = 2200) {
  const kutu = $('bildirim');
  kutu.textContent = metin;
  kutu.classList.add('gorunur');
  clearTimeout(bildirimZamani);
  bildirimZamani = setTimeout(() => kutu.classList.remove('gorunur'), sure);
}

/**
 * Üst sıraya (ust-dugmeler: HUD'un sağındaki ikon düğmeleri) ya da alt eylem sırasına
 * (alt-dugmeler) düğme ekler. ikon bir DOM düğümüyse (ör. ikon.js'ten SVG) metnin yerine
 * konur; değilse metin gösterilir. Erişilebilir ad baslik'tir.
 */
export function dugmeEkle(yer, { metin, baslik, tikla, ikon }) {
  const dugme = document.createElement('button');
  dugme.type = 'button';
  dugme.className = yer === 'ust' ? 'dugme-ikon' : 'dugme-ikincil';
  if (ikon instanceof Node) dugme.append(ikon);
  else dugme.textContent = metin;
  if (baslik) {
    dugme.title = baslik;
    dugme.setAttribute('aria-label', baslik);
  }
  dugme.addEventListener('click', tikla);
  $(yer === 'ust' ? 'ust-dugmeler' : 'alt-dugmeler').append(dugme);
  return dugme;
}

export function arayuzKur() {
  for (const d of document.querySelectorAll('[data-arac]')) {
    d.addEventListener('click', () => aracSec(d.dataset.arac));
  }
  $('yeni').addEventListener('click', () => yeniOyun(rastgeleEtiket()));
  $('gunun').addEventListener('click', () => yeniOyun(gununEtiketi()));
  $('tekrar').addEventListener('click', () => yeniOyun(rastgeleEtiket()));
  $('pes').addEventListener('click', () => pesEt(performance.now()));
  $('paylas').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(paylasimMetni(durumAl().sonuc));
      $('paylas').textContent = 'Kopyalandı';
    } catch (hata) {
      console.error('Panoya yazılamadı:', hata);
      $('paylas').textContent = 'Kopyalanamadı';
    }
  });

  dinle('oyun-basladi', ({ durum }) => {
    const adres = new URL(location.href);
    adres.searchParams.set('tohum', durum.etiket);
    history.replaceState(null, '', adres);
    $('bitis').close();
    $('paylas').textContent = 'Sonucu kopyala';
  });
  dinle('arac-secildi', ({ arac }) => {
    for (const d of document.querySelectorAll('[data-arac]')) {
      d.setAttribute('aria-pressed', String(d.dataset.arac === arac));
    }
  });
  dinle('bulundu', ({ sonuc }) => {
    $('sonuc').textContent = `${sureMetni(sonuc.sureMs)} sürede, `
      + `${sayi.format(sonuc.kaldirilan)} saman kaldırarak ve `
      + `${sonuc.dedektorKullanilan}/${sonuc.dedektorHakki} dedektörle buldun.`;
    $('bitis').showModal();
  });
  hudKur();
}
