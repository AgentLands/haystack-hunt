/**
 * Yarış görünümü: tuvalin sağ üstündeki canlı skor tablosu, 3-2-1 geri sayım bindirmesi ve
 * oyuncu renk/sıralama/durum metinleri (pencere de kullanır). Diğer oyuncuların çiftçileri
 * tuvalde yaris-hayalet.js ile çizilir.
 */
import { sayi, sureMetni } from '../arayuz.js';

export const RENKLER = [
  '#4fc3f7', '#ff6b6b', '#7ee081', '#c792ea', '#ffa94d', '#f06292', '#4dd0c8', '#ffffff',
];
export const renk = (i) => RENKLER[((i % RENKLER.length) + RENKLER.length) % RENKLER.length];

const SIRA = { buldu: 0, oynuyor: 1, pes: 2, ayrildi: 3, bekliyor: 4 };

/** Bulanlar sırasıyla önde, sonra arayanlar, pes edenler, ayrılanlar. */
export function sirala(oyuncular) {
  return [...oyuncular].sort((a, b) => (SIRA[a.durum] - SIRA[b.durum])
    || ((a.sira ?? 0) - (b.sira ?? 0)));
}

export function durumMetni(k) {
  switch (k.durum) {
    case 'buldu': return `${k.sira}. sıra · ${sureMetni(k.sureMs)}`;
    case 'oynuyor': return `${sayi.format(k.saman)} saman`;
    case 'pes': return 'pes etti';
    case 'ayrildi': return 'ayrıldı';
    default: return k.bagli ? 'hazır' : 'ayrıldı';
  }
}

/** Renk noktası + ad + durum satırı (DOM; ad textContent ile, güvenli). */
export function oyuncuSatiri(etiket, k, benimId) {
  const satir = document.createElement(etiket);
  satir.className = 'yaris-satir' + (k.id === benimId ? ' ben' : '');
  const nokta = document.createElement('span');
  nokta.className = 'yaris-nokta';
  nokta.style.background = renk(k.renk);
  const ad = document.createElement('span');
  ad.className = 'yaris-ad';
  ad.textContent = k.ad;
  const deger = document.createElement('span');
  deger.className = 'yaris-deger';
  deger.textContent = durumMetni(k);
  satir.append(nokta, ad, deger);
  return satir;
}

let tablo = null;
let sayac = null;
let damga = null;

function kapEkle(sinif) {
  const div = document.createElement('div');
  div.className = sinif;
  div.hidden = true;
  document.getElementById('tarla-kap').append(div);
  return div;
}

/** Sağ üstteki canlı tablo; oda yoksa ya da lobideyse gizli. */
export function tabloGuncelle(oda, benimId) {
  tablo ??= kapEkle('yaris-tablo');
  if (!oda || oda.durum === 'lobi') {
    tablo.hidden = true;
    return;
  }
  tablo.hidden = false;
  const baslik = document.createElement('div');
  baslik.className = 'yaris-tablo-baslik';
  baslik.textContent = `Yarış ${oda.kod}${oda.durum === 'bitti' ? ' · bitti' : ''}`;
  tablo.replaceChildren(baslik, ...sirala(oda.oyuncular).map((k) => oyuncuSatiri('div', k,
    benimId)));
}

/** Geri sayım bindirmesi: metin (3, 2, 1, Başla!) ya da null (gizle); damga gibi basılır. */
export function sayacGoster(metin) {
  if (!sayac) {
    sayac = kapEkle('yaris-sayac');
    damga = document.createElement('span');
    damga.className = 'yaris-damga sayi';
    sayac.append(damga);
  }
  sayac.hidden = metin === null;
  if (metin !== null) {
    damga.textContent = String(metin);
    damga.classList.remove('vurus');
    void damga.offsetWidth;
    damga.classList.add('vurus');
  }
}
