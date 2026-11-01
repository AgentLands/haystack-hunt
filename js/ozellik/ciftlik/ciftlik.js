/**
 * Çiftlik özelliğinin girişi: menüde "Çiftlik" düğmesi (menu-kanca menuAnaEkle), çiftliği
 * açma (son kayıt, olmazsa yedek, olmazsa yeni çiftlik + bildirim), gövdeye `ciftlik-mod`
 * sınıfı, otomatik kayıt (30 sn'de bir, sekme gizlenince, sayfa kapanırken, moddan çıkarken
 * ve inşa/sökümden 2 sn sonra). Kayıt biçimi kural/ciftlik/sakla.js, depolama depo.js.
 * Çiz katmanları gorsel/katman.js, inşa girdisi insa.js, palet palet.js.
 */
import { dinle, yay } from '../../olaylar.js';
import { durumAl, modAc, rastgeleEtiket } from '../../oyun.js';
import '../../oyun-ciftlik.js';
import { dunyaKodla } from '../../kural/ciftlik/sakla.js';
import { bildir } from '../../arayuz.js';
import { kayitlariOku, kayitYaz } from './depo.js';
import { paletGoster } from './palet.js';
import { paletAc } from './insa.js';
import './gorsel/katman.js';
import './secim-arayuz.js';
import './hud.js';
import './pano.js';
import './kapi.js';
import './damga-defter.js';
import './sorun.js';
import './istatistik.js';
import './ogretici.js';
import './fis.js';
import './menu-bag.js';
import './ses-bag.js';
import './efekt-bag.js';

const OTO_KAYIT_MS = 30000;
const INSA_SONRASI_MS = 2000;

const stil = document.createElement('link');
stil.rel = 'stylesheet';
stil.href = new URL('./ciftlik.css', import.meta.url).href;
document.head.append(stil);

/** Çiftliği açar: kayıtlar sırayla denenir; hiçbiri olmazsa yeni çiftlik. */
export function ciftlikAc() {
  const kayitlar = kayitlariOku();
  for (const { kaynak, veri } of kayitlar) {
    try {
      modAc('ciftlik', { kayit: veri });
      return;
    } catch (hata) {
      console.error(`Çiftlik kaydı yüklenemedi (${kaynak}):`, hata);
    }
  }
  modAc('ciftlik', {});
  if (kayitlar.length) bildir('Çiftlik kaydı okunamadı; yeni bir çiftlik kuruldu.', 4000);
}

/** Yeni bir çiftlik kurar (şimdiki kayıt Yedek yuvasına geçer); menü onayından sonra. */
export function yeniCiftlik() {
  modAc('ciftlik', { etiket: rastgeleEtiket() });
  ciftlikKaydet();
}

/** Kayıt nesnesinden çiftlik açar (yuva ya da dosya). Bozuksa false; süren çiftlik değişmez. */
export function ciftlikYukle(veri) {
  try {
    modAc('ciftlik', { kayit: veri });
  } catch (hata) {
    console.error('Çiftlik kaydı yüklenemedi:', hata);
    return false;
  }
  ciftlikKaydet();
  return true;
}

/** Süren çiftliği hemen kaydeder (çiftlikte değilse bir şey yapmaz). */
export function ciftlikKaydet(durum = durumAl()) {
  if (!durum || durum.mod !== 'ciftlik') return 0;
  const boyut = kayitYaz(dunyaKodla(durum.ciftlik, durum.tarla, { etiket: durum.etiket }));
  if (boyut) yay('ciftlik-kaydedildi', { boyut });
  return boyut;
}

// --- Mod geçişleri ---
dinle('oyun-basladi', ({ durum }) => {
  const ciftlikte = durum.mod === 'ciftlik';
  document.body.classList.toggle('ciftlik-mod', ciftlikte);
  if (!ciftlikte) paletAc(false);
  paletGoster(ciftlikte);
  if (ciftlikte) yay('ciftlik-acildi', { durum });
});
dinle('mod-kapaniyor', ({ durum }) => ciftlikKaydet(durum));

// --- Otomatik kayıt ---
let insaZamanlayici = null;
const insaSonrasi = () => {
  clearTimeout(insaZamanlayici);
  insaZamanlayici = setTimeout(() => ciftlikKaydet(), INSA_SONRASI_MS);
};
for (const ad of ['parca-kuruldu', 'parca-sokuldu', 'parca-dondu']) dinle(ad, insaSonrasi);
setInterval(() => ciftlikKaydet(), OTO_KAYIT_MS);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') ciftlikKaydet();
});
window.addEventListener('pagehide', () => ciftlikKaydet());
