/**
 * İstatistik, seri ve paylaşım: olayları dinleyip oyuncu istatistiklerini localStorage'ta
 * tutar (erişim yoksa bellekte), "Defter" düğmesi ve penceresini ekler, bitiş fişine
 * "Yeni rekor!" / "Seri" notu koyar, paylaşım metnine okuma emojileri ve bağlantı ekler.
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
import './fis.js';
import { ikon } from './ikon.js';

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
dugmeEkle('ust', {
  metin: 'Defter', baslik: 'İstatistik', ikon: ikon('defter'), tikla: () => pencere.ac(),
});

const bilgi = document.getElementById('istatistik-bitis');

function not(metin, tur) {
  const p = document.createElement('p');
  p.className = `fis-not ${tur}`;
  p.textContent = metin;
  return p;
}

function bitisBilgisi(sonuc, rapor) {
  const satirlar = [];
  if (rapor.rekor) {
    satirlar.push(not(`Yeni rekor! Önceki en iyi ${sureMetni(rapor.oncekiEnIyiMs)}.`, 'rekor'));
  } else if (rapor.tohumRekoru) {
    satirlar.push(not('Bu tarlada yeni rekor.', 'rekor'));
  }
  if (rapor.gunluk) satirlar.push(not(`Günün tarlası çözüldü. Seri: ${rapor.seri} gün.`, 'seri'));
  else if (rapor.seri > 0) satirlar.push(not(`Seri: ${rapor.seri} gün.`, 'seri'));
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
