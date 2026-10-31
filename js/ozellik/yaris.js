/**
 * Yarış modu (çevrimiçi): alt sıraya "Yarış" düğmesi ekler; sunucuya bağlanıp oda kurar ya
 * da katılır, geri sayımdan sonra herkes aynı etiketle yeniOyun açar. Yarışta çiftçinin
 * konumu/makinesi ve kaldırılan saman ~8 Hz (yalnız değişince) gönderilir, bulundu/pes
 * sunucuya bildirilir; diğerlerinin çiftçileri yaris-hayalet.js'de, canlı tablo
 * yaris-cizim.js'de. Yarış sürerken yerel yeni tarla açışı onay ister (koruma.js).
 * Sıralama çivi cezası dahil süreyle yapılır; ilk bulan hemen duyurulur.
 */
import { dinle } from '../olaylar.js';
import { yeniOyun, durumAl } from '../oyun.js';
import { dugmeEkle, bildir } from '../arayuz.js';
import { baglan } from './yaris-baglanti.js';
import { pencereKur, pencereAc, pencereKapat, pencereGoster } from './yaris-pencere.js';
import { tabloGuncelle, sayacGoster, renk } from './yaris-cizim.js';
import { konumIletisi, GONDERIM_ARALIGI } from './yaris-konum.js';
import {
  hayaletKatmaniKur, hayaletKonum, hayaletSil, hayaletTemizle, hayaletKonumlari,
} from './yaris-hayalet.js';
import { haritaKaynagiKur } from './kamera-arayuz.js';
import { ikon, metinDegistir } from './ikon.js';
import { korumaKaydet, yeniTarlaIzni } from './koruma.js';

const TABLO_ARALIGI = 250;

const y = {
  baglanti: null, baglaniyor: false, benim: null, oda: null, etiket: null, basladi: 0,
  sonGonderim: 0, sonImlec: '', tabloKirli: false, sonTablo: 0,
  sayacZamani: null,
};

const stil = document.createElement('link');
stil.rel = 'stylesheet';
stil.href = new URL('./yaris.css', import.meta.url).href;
document.head.append(stil);

const benimKaydim = () => (y.oda ? y.oda.oyuncular.find((k) => k.id === y.benim) : null);
const oynuyorum = () => benimKaydim()?.durum === 'oynuyor';
/** Yarış geri sayımda ya da bu oyuncu oynuyorken true (menü zorluğu kilitler). */
export const yarisSuruyor = () => Boolean(y.oda) && (y.oda.durum === 'geri-sayim' || oynuyorum());

const dugme = dugmeEkle('alt', {
  metin: 'Yarış', baslik: 'Çevrimiçi yarış: oda kur ya da katıl', ikon: ikon('bayrak'),
  tikla: yarisAc,
});

function guncelle() {
  pencereGoster(y.oda, y.benim);
  tabloGuncelle(y.oda, y.benim);
  metinDegistir(dugme, y.oda ? `Yarış · ${y.oda.kod}` : 'Yarış');
}

function sayac(metin, sure = 0) {
  clearTimeout(y.sayacZamani);
  sayacGoster(metin);
  if (sure) y.sayacZamani = setTimeout(() => sayacGoster(null), sure);
}

function sifirla() {
  Object.assign(y, { baglanti: null, oda: null, etiket: null });
  hayaletTemizle();
  sayac(null);
  guncelle();
}

function ayril() {
  if (y.baglanti) y.baglanti.kapat();
  sifirla();
}

function bitisGoster() {
  const bitis = document.getElementById('bitis');
  if (bitis && bitis.open) bitis.close();
  pencereAc();
}

const ISLEYICILER = {
  merhaba(m) {
    y.benim = m.id;
  },
  oda(m) {
    const onceki = y.oda ? y.oda.durum : null;
    y.oda = m;
    for (const { id } of hayaletKonumlari()) {
      if (!m.oyuncular.some((k) => k.id === id && k.durum === 'oynuyor')) hayaletSil(id);
    }
    guncelle();
    if (m.durum === 'bitti' && onceki === 'yaris') bitisGoster();
  },
  'geri-sayim'(m) {
    pencereKapat();
    sayac(m.n);
  },
  basla(m) {
    Object.assign(y, { etiket: m.etiket, basladi: performance.now(), sonImlec: '' });
    hayaletTemizle();
    yeniOyun(m.etiket, m.zorluk || 'normal', { rahat: false });
    sayac('Başla!', 700);
  },
  imlec(m) {
    const kayit = y.oda && y.oda.oyuncular.find((k) => k.id === m.id);
    if (!kayit) return;
    kayit.saman = m.saman;
    y.tabloKirli = true;
    hayaletKonum(m.id, m, performance.now());
  },
  kazanan(m) {
    // İlk bulan duyurulur; kesin sıra (çivi cezası dahil süre) yarış bitince tabloda.
    bildir(m.id === y.benim ? 'İğneyi ilk sen buldun!' : `${m.ad} iğneyi buldu!`, 3000);
  },
  hata(m) {
    bildir(typeof m.mesaj === 'string' ? m.mesaj : 'Yarış hatası', 3000);
  },
};

function iletiIsle(m) {
  if (m && typeof m.t === 'string' && Object.hasOwn(ISLEYICILER, m.t)) ISLEYICILER[m.t](m);
  else console.error('Bilinmeyen yarış iletisi:', m);
}

function koptu() {
  bildir('Yarış bağlantısı koptu', 3000);
  sifirla();
}

async function yarisAc() {
  if (y.baglanti) {
    guncelle();
    pencereAc();
    return;
  }
  if (y.baglaniyor) return;
  y.baglaniyor = true;
  try {
    y.baglanti = await baglan({ ileti: iletiIsle, kapandi: koptu });
    guncelle();
    pencereAc();
  } catch (hata) {
    console.error('Yarış sunucusuna bağlanılamadı:', hata);
    bildir('Sunucu bulunamadı');
  } finally {
    y.baglaniyor = false;
  }
}

pencereKur({
  kur: (ad) => y.baglanti && y.baglanti.gonder({ t: 'kur', ad }),
  katil: (kod, ad) => y.baglanti && y.baglanti.gonder({ t: 'katil', oda: kod, ad }),
  baslat: () => y.baglanti && y.baglanti.gonder({ t: 'baslat', zorluk: durumAl().zorluk }),
  ayril: () => {
    ayril();
    pencereKapat();
  },
  kapandi: () => {
    if (y.baglanti && !y.oda) ayril();
  },
});

const hayaletBilgisi = (id, durum) => {
  const kayit = y.oda && durum.etiket === y.etiket
    ? y.oda.oyuncular.find((k) => k.id === id) : null;
  return kayit ? { ad: kayit.ad, renk: renk(kayit.renk) } : null;
};
hayaletKatmaniKur(hayaletBilgisi);
haritaKaynagiKur((durum) => {
  if (!y.oda || durum.etiket !== y.etiket) return [];
  return hayaletKonumlari().flatMap(({ id, x, y: yy }) => {
    const b = hayaletBilgisi(id, durum);
    return b ? [{ x, y: yy, renk: b.renk }] : [];
  });
});

dinle('kare', ({ zaman, durum }) => {
  if (y.tabloKirli && zaman - y.sonTablo >= TABLO_ARALIGI) {
    Object.assign(y, { tabloKirli: false, sonTablo: zaman });
    tabloGuncelle(y.oda, y.benim);
  }
  if (!oynuyorum() || durum.etiket !== y.etiket) return;
  if (zaman - y.sonGonderim < GONDERIM_ARALIGI) return;
  const ileti = konumIletisi(durum);
  if (!ileti) return;
  const anahtar = JSON.stringify(ileti);
  if (anahtar === y.sonImlec) return;
  Object.assign(y, { sonImlec: anahtar, sonGonderim: zaman });
  y.baglanti.gonder(ileti);
});

dinle('bulundu', ({ sonuc }) => {
  if (!oynuyorum() || sonuc.etiket !== y.etiket) return;
  // Yarış süresi = "Başla!"dan beri geçen süre + paslı çivi cezası (sıralama buna göre).
  const cezaMs = Math.max(0, Math.round(sonuc.cezaMs || 0));
  const sureMs = Math.round(performance.now() - y.basladi) + cezaMs;
  y.baglanti.gonder({ t: 'bulundu', sureMs, cezaMs, saman: sonuc.kaldirilan });
});

dinle('pes-edildi', ({ durum }) => {
  if (oynuyorum() && durum.etiket === y.etiket) y.baglanti.gonder({ t: 'pes' });
});

// Yarış sürerken yerel yeni tarla açan her giriş (düğmeler, zorluk seçici) koruma.js'ten geçer.
korumaKaydet({
  suruyor: yarisSuruyor,
  ayril: () => {
    ayril();
    bildir('Yarıştan ayrıldın');
  },
});

// Düğmeler: onay verilmezse tıklama diğer dinleyicilere (yeni tarla) ulaşmaz.
for (const id of ['yeni', 'gunun', 'tekrar']) {
  const yerel = document.getElementById(id);
  if (!yerel) continue;
  yerel.addEventListener('click', (e) => {
    if (!yeniTarlaIzni()) e.stopImmediatePropagation();
  }, { capture: true });
}
