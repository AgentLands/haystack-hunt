/**
 * Çiftlik arayüzünün kural bağları (birleştirme işi; DOM'a dokunmaz): inşa paleti/önizleme
 * ekonomisi (I1 insaKaynagiKur → G: kuruş, parça bedeli, kilit metni), şablon yuvaları
 * kalıcı ilerlemede (I2 sablonDeposuKur → depo.js ilerlemeAl().sablonlar; eski ayrı
 * anahtardaki yuvalar bir kez taşınır), hazır şablon öğretici bitince (sablonBaglam), H1
 * hayaletinin ek denetimi (onizlemeDenetimiEkle → G'nin kurulum engeli: kilit, kuruş), bant
 * çekerken dik kesişmede menfez önerisi (I1 menfezOnerisiKur → A: kesişmenin iki yanına
 * aynı yöne bakan menfez çifti; arada 1 karo, tasima/menfez.js eşleme kuralı).
 */
import { menfezOnerisiKur } from './hat-cek.js';
import { parcaTanimi } from '../../kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli } from '../../kural/ciftlik/izgara.js';
import { acikMi } from '../../kural/ciftlik/ekonomi/acilis.js';
import { onizlemeDenetimiEkle } from './gorsel/onizleme.js';
import { insaKaynagiKur } from './insa.js';
import { sablonDeposuKur, sablonBaglam } from './sablon.js';
import { ogreticiBitti } from './ogretici.js';
import { ilerlemeAl, ilerlemeYaz } from './depo.js';
import { PARCA_MALIYET } from '../../kural/ciftlik/ekonomi/denge.js';
import { kilitBilgisi } from '../../kural/ciftlik/ekonomi/acilis.js';
import {
  ekonomiAl, parcaMaliyeti, kurulumEngeli,
} from '../../kural/ciftlik/ekonomi/kurus.js';

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

menfezOnerisiKur(({ c, tarla, anahtar, yol, denetim }) => {
  const i = denetim.kesisme;
  const [once, sonra] = [yol[i - 1], yol[i + 1]];
  const menfez = parcaTanimi('menfez');
  if (anahtar !== 'bant' || !menfez || !once || !sonra || once.yon !== sonra.yon) return null;
  if (!acikMi('menfez', ilerlemeAl())) return null;
  if (yerlestirmeEngeli(c, tarla, menfez, sonra.kx, sonra.ky, sonra.yon)) return null;
  const kur = (k) => ({ tur: 'kur', parca: 'menfez', x: k.kx, y: k.ky, yon: k.yon });
  const sok = (k) => ({ tur: 'sok', x: k.kx, y: k.ky });
  return {
    metin: `Menfezle altından geç (${2 * parcaMaliyeti('menfez')} kuruş)`,
    ciftler: [
      { yap: [sok(once), kur(once)], geri: [sok(once), { ...kur(once), parca: 'bant' }] },
      { yap: [kur(sonra)], geri: [sok(sonra)] },
    ],
  };
});

onizlemeDenetimiEkle((c, tarla, tanim) => {
  const engel = kurulumEngeli(c, tanim.anahtar);
  if (engel === 'kurus') return `kuruş yetmiyor (${parcaMaliyeti(tanim.anahtar)})`;
  if (engel === 'kilitli') {
    const b = kilitBilgisi(tanim.anahtar, ilerlemeAl());
    return `kilitli: ${b.damga} ${b.damgaAd}`;
  }
  return null;
});
