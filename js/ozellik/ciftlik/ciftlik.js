/**
 * Çiftlik özelliğinin girişi: menüde "Çiftlik" düğmesi (menu-kanca menuAnaEkle), çiftliği
 * açma (son kayıt, olmazsa yedek, olmazsa yeni çiftlik + bildirim), gövdeye `ciftlik-mod`
 * sınıfı, otomatik kayıt (30 sn'de bir, sekme gizlenince, sayfa kapanırken, moddan çıkarken
 * ve inşa/sökümden 2 sn sonra; kayıt `ek.zaman` damgası taşır), kalıcı ilerleme (damgalar;
 * depo.js ILERLEME_ANAHTAR; damga basılınca ve her kayıtta yazılır), açılışta çevrimdışı
 * kazanç ve havanın ilk olayı. Kayıt biçimi kural/ciftlik/sakla.js, depolama depo.js.
 * Çiz katmanları gorsel/katman.js, inşa girdisi insa.js, palet palet.js.
 */
import { dinle, yay } from '../../olaylar.js';
import { durumAl, modAc, rastgeleEtiket } from '../../oyun.js';
import '../../oyun-ciftlik.js';
import { dunyaKodla } from '../../kural/ciftlik/sakla.js';
import { bildir } from '../../arayuz.js';
import { kayitlariOku, kayitYaz, ilerlemeAl, ilerlemeYaz } from './depo.js';
import './baglar.js';
import { cevrimdisiIlerle } from '../../kural/ciftlik/ekonomi/cevrimdisi.js';
import { havaAl } from '../../kural/ciftlik/dunya/hava.js';
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


/**
 * Kayıttan açılışta "sen yokken" kazancı (ekonomi/cevrimdisi.js): kayıttaki zaman damgasından
 * geçen dakika; kazanç olduysa 'ciftlik-cevrimdisi' { dk, kazanc } (fiş) yayılır.
 */
function cevrimdisiUygula(c, ek) {
  if (!Number.isFinite(ek?.zaman)) return;
  const dk = (Date.now() - ek.zaman) / 60000;
  if (dk < 1) return;
  const h = cevrimdisiIlerle(c, dk);
  if (!h.esya.length && !h.kurus) return;
  yay('ciftlik-cevrimdisi', {
    dk: h.dk, kazanc: { esya: Object.fromEntries(h.esya), kurus: h.kurus,
      dolu: h.doldu ? ['Depolar'] : [] },
  });
}

/** Çiftliği açar: kayıtlar sırayla denenir; hiçbiri olmazsa yeni çiftlik (bildirimle). */
export function ciftlikAc() {
  const kayitlar = kayitlariOku();
  for (const { kaynak, veri } of kayitlar) {
    try {
      modAc('ciftlik', { kayit: veri, ilerleme: ilerlemeAl() });
      cevrimdisiUygula(durumAl().ciftlik, veri.ek);
      if (kaynak !== kayitlar[0].kaynak || kayitlar.bozuk.length) {
        bildir('Son çiftlik kaydı okunamadı; yedek kayıt açıldı.', 4000);
      }
      return;
    } catch (hata) {
      console.error(`Çiftlik kaydı yüklenemedi (${kaynak}):`, hata);
    }
  }
  modAc('ciftlik', { ilerleme: ilerlemeAl() });
  if (kayitlar.length || kayitlar.bozuk.length) {
    bildir('Çiftlik kaydı okunamadı; yeni bir çiftlik kuruldu (eski kayıt kenarda).', 4000);
  }
}

/** Yeni bir çiftlik kurar (şimdiki kayıt Yedek yuvasına geçer); menü onayından sonra. */
export function yeniCiftlik() {
  modAc('ciftlik', { etiket: rastgeleEtiket(), ilerleme: ilerlemeAl() });
  ciftlikKaydet();
}

/** Kayıt nesnesinden çiftlik açar (yuva ya da dosya). Bozuksa false; süren çiftlik değişmez. */
export function ciftlikYukle(veri) {
  try {
    modAc('ciftlik', { kayit: veri, ilerleme: ilerlemeAl() });
  } catch (hata) {
    console.error('Çiftlik kaydı yüklenemedi:', hata);
    return false;
  }
  ciftlikKaydet();
  return true;
}

/** Süren çiftliği (ve kalıcı ilerlemeyi) hemen kaydeder; çiftlikte değilse bir şey yapmaz. */
export function ciftlikKaydet(durum = durumAl()) {
  if (!durum || durum.mod !== 'ciftlik') return 0;
  ilerlemeYaz(ilerlemeAl());
  const ek = { etiket: durum.etiket, zaman: Date.now() };
  const boyut = kayitYaz(dunyaKodla(durum.ciftlik, durum.tarla, ek));
  if (boyut) yay('ciftlik-kaydedildi', { boyut });
  return boyut;
}

// --- Mod geçişleri ---
dinle('oyun-basladi', ({ durum }) => {
  const ciftlikte = durum.mod === 'ciftlik';
  document.body.classList.toggle('ciftlik-mod', ciftlikte);
  if (!ciftlikte) paletAc(false);
  paletGoster(ciftlikte);
  if (!ciftlikte) return;
  yay('ciftlik-acildi', { durum });
  yay('hava-degisti', havaAl(durum.ciftlik)); // açılışta bir kez (sonra dilim başlarında)
});
// Damga ilerlemesi kalıcıdır: basılınca hemen yazılır
dinle('damga-basildi', () => ilerlemeYaz(ilerlemeAl()));
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
