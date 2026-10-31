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

/** Paylaşılacak sonuç metni (özellikler genişletebilir). */
export function paylasimMetni(sonuc) {
  return `Haystack Hunt · ${sonuc.etiket}\n🪡 ${sureMetni(sonuc.sureMs)} · `
    + `${sayi.format(sonuc.kaldirilan)} saman · 📡 ${sonuc.dedektorKullanilan}/${sonuc.dedektorHakki}`;
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
    $('sonuc').textContent = `${sureMetni(sonuc.sureMs)} sürede, `
      + `${sayi.format(sonuc.kaldirilan)} saman kaldırarak ve `
      + `${sonuc.dedektorKullanilan}/${sonuc.dedektorHakki} dedektörle buldun.`;
    $('bitis').showModal();
  });
  dinle('kare', ({ zaman, durum }) => {
    const gecen = durum.baslangic === null ? 0 : (durum.bitis ?? zaman) - durum.baslangic;
    $('sure').textContent = sureMetni(gecen);
    $('kaldirilan').textContent = sayi.format(durum.tarla.kaldirilan);
    $('dedektor-hak').textContent = durum.dedektor;
  });
}
