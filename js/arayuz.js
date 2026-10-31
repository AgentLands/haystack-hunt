/**
 * Arayüz: üst panel (süre, saman, dedektör), araç düğmeleri, alt düğmeler, bitiş
 * penceresi ve paylaşım. Oyun olaylarını dinleyerek DOM'u günceller.
 */
import { dinle } from './olaylar.js';
import { durumAl, yeniOyun, aracSec, pesEt, rastgeleEtiket } from './oyun.js';
import { gununEtiketi } from './kural/rastgele.js';

const $ = (id) => document.getElementById(id);
export const sayi = new Intl.NumberFormat('tr-TR');

export function sureMetni(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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

/** Üst sıraya (ust-dugmeler) ya da alt sıraya (alt-dugmeler) düğme ekler. */
export function dugmeEkle(yer, { metin, baslik, tikla }) {
  const dugme = document.createElement('button');
  dugme.type = 'button';
  dugme.textContent = metin;
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
    $('etiket').textContent = durum.etiket === gununEtiketi()
      ? `Günün tarlası (${durum.etiket})` : durum.etiket;
    $('bitis').close();
    $('paylas').textContent = 'Sonucu kopyala';
  });
  dinle('arac-secildi', ({ arac }) => {
    for (const d of document.querySelectorAll('[data-arac]')) {
      d.setAttribute('aria-pressed', String(d.dataset.arac === arac));
    }
  });
  dinle('bulundu', ({ sonuc }) => {
    $('sonuc').textContent = `${sureMetni(sonuc.sureMs)} sürede buldun. `
      + `${sayi.format(sonuc.kaldirilan)} saman kaldırdın, `
      + `dedektörü ${sonuc.dedektorKullanilan} kez kullandın.`;
    $('bitis').showModal();
  });
  dinle('kare', ({ zaman, durum }) => {
    const gecen = durum.baslangic === null ? 0 : (durum.bitis ?? zaman) - durum.baslangic;
    $('sure').textContent = sureMetni(gecen);
    $('kaldirilan').textContent = sayi.format(durum.tarla.kaldirilan);
    $('dedektor-hak').textContent = durum.dedektor;
  });
}
