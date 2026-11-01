/**
 * Çiftlik arayüzünün kural bağları (birleştirme işi; DOM'a dokunmaz): inşa paleti/önizleme
 * ekonomisi (I1 insaKaynagiKur → G: kuruş, parça bedeli, kilit metni), şablon yuvaları
 * kalıcı ilerlemede (I2 sablonDeposuKur → depo.js ilerlemeAl().sablonlar; eski ayrı
 * anahtardaki yuvalar bir kez taşınır), hazır şablon öğretici bitince (sablonBaglam).
 */
import { insaKaynagiKur } from './insa.js';
import { sablonDeposuKur, sablonBaglam } from './sablon.js';
import { ogreticiBitti } from './ogretici.js';
import { ilerlemeAl, ilerlemeYaz } from './depo.js';
import { PARCA_MALIYET } from '../../kural/ciftlik/ekonomi/denge.js';
import { kilitBilgisi } from '../../kural/ciftlik/ekonomi/acilis.js';
import { ekonomiAl, parcaMaliyeti } from '../../kural/ciftlik/ekonomi/kurus.js';

const ekonomide = (t) => Object.hasOwn(PARCA_MALIYET, t.anahtar);

insaKaynagiKur({
  kurus: (durum) => (durum?.ciftlik ? ekonomiAl(durum.ciftlik).kurus : null),
  fiyat: (t) => (ekonomide(t) ? parcaMaliyeti(t.anahtar) : null),
  kilit(t, durum) {
    if (!durum?.ciftlik || !ekonomide(t)) return null;
    const b = kilitBilgisi(t.anahtar, ilerlemeAl());
    return b.acik ? null : `${b.damga} ${b.damgaAd} damgasıyla açılır`;
  },
});

const ESKI_SABLON = 'haystack-hunt:ciftlik-sablonlar';
/** Eski (I2 sapı) ayrı anahtardaki yuvaları ilerlemeye bir kez taşır. */
function eskiSablonlar() {
  try {
    const metin = localStorage.getItem(ESKI_SABLON);
    if (!metin) return null;
    localStorage.removeItem(ESKI_SABLON);
    const dizi = JSON.parse(metin);
    return Array.isArray(dizi) ? dizi.map((x) => (typeof x === 'string' ? x : null)) : null;
  } catch (hata) {
    console.error('Eski şablon yuvaları taşınamadı:', hata);
    return null;
  }
}

sablonDeposuKur({
  oku() {
    const il = ilerlemeAl();
    if (!il.sablonlar.some(Boolean)) {
      const eski = eskiSablonlar();
      if (eski) {
        il.sablonlar = eski;
        ilerlemeYaz(il);
      }
    }
    return il.sablonlar;
  },
  yaz(dizi) {
    ilerlemeAl().sablonlar = [...dizi];
    return ilerlemeYaz();
  },
});

sablonBaglam.hazirAcik = ogreticiBitti;
