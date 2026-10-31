/**
 * İstatistik, seri ve paylaşım: olayları dinleyip oyuncu istatistiklerini localStorage'ta
 * tutar (erişim yoksa bellekte), 📊 düğmesi ve penceresini ekler, bitiş penceresine
 * "Yeni rekor!" / "Seri" bilgisi koyar, paylaşım metnine okuma emojileri ve bağlantı ekler.
 * Saf kısımlar js/kural/istatistik.js içindedir.
 */
import { dinle } from '../olaylar.js';
import { dugmeEkle, paylasimEkiKaydet, sureMetni } from '../arayuz.js';
import {
  ANAHTAR, bellekDeposu, yukle, kaydet, oynandiKaydet, pesKaydet, bulunduKaydet,
  ozet, paylasimEki,
} from '../kural/istatistik.js';
import { gununEtiketi } from '../kural/rastgele.js';
import { pencereKur } from './istatistik-pencere.js';

function depoAc() {
  try {
    const depo = window.localStorage;
    depo.getItem(ANAHTAR); // erişim engelliyse burada fırlatır
    return depo;
  } catch (hata) {
    console.error('localStorage kullanılamıyor, istatistik yalnız bellekte tutulacak:', hata);
    return bellekDeposu();
  }
}

const depo = depoAc();
let ist = yukle(depo);
let oynandi = false;

const guncelle = (yeni) => {
  ist = yeni;
  kaydet(depo, ist);
};

const pencere = pencereKur(() => ozet(ist));
dugmeEkle('ust', { metin: '📊', baslik: 'İstatistik', tikla: () => pencere.ac() });

const bilgi = document.createElement('div');
bilgi.id = 'istatistik-bitis';
bilgi.style.cssText = 'margin: 8px 0 16px; display: grid; gap: 4px; font-size: 0.95rem;';
document.getElementById('sonuc').after(bilgi);

function satir(metin, vurgulu) {
  const p = document.createElement('div');
  p.textContent = metin;
  if (vurgulu) p.style.cssText = 'color: var(--vurgu); font-weight: 600;';
  return p;
}

function bitisBilgisi(sonuc, rapor) {
  const satirlar = [];
  if (rapor.rekor) {
    satirlar.push(satir(`🏆 Yeni rekor! (önceki en iyi ${sureMetni(rapor.oncekiEnIyiMs)})`, true));
  } else if (rapor.tohumRekoru) {
    satirlar.push(satir('🏆 Bu tarlada yeni rekor!', true));
  }
  if (rapor.gunluk) satirlar.push(satir(`🔥 Günün tarlası çözüldü · Seri: ${rapor.seri} gün`));
  else if (rapor.seri > 0) satirlar.push(satir(`🔥 Seri: ${rapor.seri} gün`));
  bilgi.replaceChildren(...satirlar);
}

dinle('oyun-basladi', () => {
  oynandi = false;
  bilgi.replaceChildren();
});
dinle('ilk-hamle', () => {
  oynandi = true;
  guncelle(oynandiKaydet(ist));
});
dinle('pes-edildi', () => {
  if (oynandi) guncelle(pesKaydet(ist));
});
dinle('bulundu', ({ sonuc }) => {
  const { ist: yeni, rapor } = bulunduKaydet(ist, sonuc, gununEtiketi());
  guncelle(yeni);
  bitisBilgisi(sonuc, rapor);
});

paylasimEkiKaydet((sonuc) => paylasimEki(sonuc, location.href.split(/[?#]/)[0]));
