/**
 * Yarış modu (çevrimiçi): alt sıraya "Yarış" düğmesi ekler; sunucuya bağlanıp oda kurar ya
 * da katılır, geri sayımdan sonra herkes aynı etiketle yeniOyun açar. Yarışta imleç ve
 * kaldırılan saman ~5 Hz gönderilir, bulundu/pes sunucuya bildirilir; diğerlerinin imleçleri
 * ve canlı tablo yaris-cizim.js'de. Yarış sürerken yerel yeni tarla düğmeleri onay ister.
 */
import { dinle } from '../olaylar.js';
import { yeniOyun, durumAl } from '../oyun.js';
import { dugmeEkle, bildir } from '../arayuz.js';
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';
import { baglan } from './yaris-baglanti.js';
import { pencereKur, pencereAc, pencereKapat, pencereGoster } from './yaris-pencere.js';
import { imlecKatmaniKur, tabloGuncelle, sayacGoster, renk } from './yaris-cizim.js';

const GONDERIM_ARALIGI = 200;
const TABLO_ARALIGI = 250;

const y = {
  baglanti: null, baglaniyor: false, benim: null, oda: null, etiket: null, basladi: 0,
  imlecler: new Map(), sonGonderim: 0, sonImlec: '', tabloKirli: false, sonTablo: 0,
  sayacZamani: null,
};

const stil = document.createElement('link');
stil.rel = 'stylesheet';
stil.href = new URL('./yaris.css', import.meta.url).href;
document.head.append(stil);

const benimKaydim = () => (y.oda ? y.oda.oyuncular.find((k) => k.id === y.benim) : null);
const oynuyorum = () => benimKaydim()?.durum === 'oynuyor';
const yarisSuruyor = () => Boolean(y.oda) && (y.oda.durum === 'geri-sayim' || oynuyorum());
const sinirla = (n, cok) => Math.max(0, Math.min(cok - 1, n));

const dugme = dugmeEkle('alt', {
  metin: 'Yarış', baslik: 'Çevrimiçi yarış: oda kur ya da katıl', tikla: yarisAc,
});

function guncelle() {
  pencereGoster(y.oda, y.benim);
  tabloGuncelle(y.oda, y.benim);
  dugme.textContent = y.oda ? `Yarış · ${y.oda.kod}` : 'Yarış';
}

function sayac(metin, sure = 0) {
  clearTimeout(y.sayacZamani);
  sayacGoster(metin);
  if (sure) y.sayacZamani = setTimeout(() => sayacGoster(null), sure);
}

function sifirla() {
  Object.assign(y, { baglanti: null, oda: null, etiket: null });
  y.imlecler.clear();
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
    for (const id of y.imlecler.keys()) {
      if (!m.oyuncular.some((k) => k.id === id && k.durum === 'oynuyor')) y.imlecler.delete(id);
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
    y.imlecler.clear();
    yeniOyun(m.etiket, m.zorluk || 'normal');
    sayac('Başla!', 700);
  },
  imlec(m) {
    const kayit = y.oda && y.oda.oyuncular.find((k) => k.id === m.id);
    if (!kayit) return;
    kayit.saman = m.saman;
    y.tabloKirli = true;
    if (m.x === null) {
      y.imlecler.delete(m.id);
      return;
    }
    const eski = y.imlecler.get(m.id);
    y.imlecler.set(m.id, { hx: m.x, hy: m.y, x: eski ? eski.x : m.x, y: eski ? eski.y : m.y });
  },
  kazanan(m) {
    bildir(m.id === y.benim ? 'Kazandın! İğneyi ilk sen buldun.' : `${m.ad} iğneyi buldu!`,
      3000);
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

imlecKatmaniKur((durum) => {
  if (!y.oda || durum.etiket !== y.etiket) return [];
  const liste = [];
  for (const [id, im] of y.imlecler) {
    const kayit = y.oda.oyuncular.find((k) => k.id === id);
    if (!kayit) continue;
    im.x += (im.hx - im.x) * 0.3;
    im.y += (im.hy - im.y) * 0.3;
    liste.push({ x: im.x, y: im.y, ad: kayit.ad, renk: renk(kayit.renk) });
  }
  return liste;
});

dinle('kare', ({ zaman, durum }) => {
  if (y.tabloKirli && zaman - y.sonTablo >= TABLO_ARALIGI) {
    Object.assign(y, { tabloKirli: false, sonTablo: zaman });
    tabloGuncelle(y.oda, y.benim);
  }
  if (!oynuyorum() || durum.etiket !== y.etiket) return;
  if (zaman - y.sonGonderim < GONDERIM_ARALIGI) return;
  const im = durum.imlec;
  const x = im ? sinirla(im.x, GENISLIK) : null;
  const yy = im ? sinirla(im.y, YUKSEKLIK) : null;
  const anahtar = `${x},${yy},${durum.tarla.kaldirilan}`;
  if (anahtar === y.sonImlec) return;
  Object.assign(y, { sonImlec: anahtar, sonGonderim: zaman });
  y.baglanti.gonder({ t: 'imlec', x, y: yy, saman: durum.tarla.kaldirilan });
});

dinle('bulundu', ({ sonuc }) => {
  if (!oynuyorum() || sonuc.etiket !== y.etiket) return;
  const sureMs = Math.round(performance.now() - y.basladi);
  y.baglanti.gonder({ t: 'bulundu', sureMs, saman: sonuc.kaldirilan });
});

dinle('pes-edildi', ({ durum }) => {
  if (oynuyorum() && durum.etiket === y.etiket) y.baglanti.gonder({ t: 'pes' });
});

// Yarış sürerken yerel "Yeni tarla / Günün tarlası": önce onay, onaylanırsa yarıştan çık.
for (const id of ['yeni', 'gunun', 'tekrar']) {
  const yerel = document.getElementById(id);
  if (!yerel) continue;
  yerel.addEventListener('click', (e) => {
    if (!yarisSuruyor()) return;
    if (!window.confirm('Yarış sürüyor. Yarıştan çıkıp yeni tarla açılsın mı?')) {
      e.stopImmediatePropagation();
      return;
    }
    ayril();
    bildir('Yarıştan ayrıldın');
  }, { capture: true });
}
