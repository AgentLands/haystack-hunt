/**
 * Yarış görünümü: diğer oyuncuların imleçleri (tuval 'ust' katmanı, renkli nokta + ad),
 * tuvalin sağ üstündeki canlı skor tablosu, 3-2-1 geri sayım bindirmesi ve oyuncu
 * sıralama/durum metinleri (pencere de kullanır).
 */
import { katmanEkle, OLCEK } from '../cizim.js';
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
    case 'buldu': return `${k.sira}. · ${sureMetni(k.sureMs)}`;
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

/** imlecleriAl(durum) → [{ x, y, ad, renk }] (hücre koordinatı). */
export function imlecKatmaniKur(imlecleriAl) {
  katmanEkle((ctx, durum) => {
    const liste = imlecleriAl(durum);
    if (!liste.length) return;
    const gorunen = ctx.canvas.clientWidth;
    const k = gorunen > 0 ? ctx.canvas.width / gorunen : 1;
    ctx.save();
    ctx.font = `bold ${Math.round(12 * k)}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const imlec of liste) imlecCiz(ctx, imlec, k);
    ctx.restore();
  }, 'ust');
}

function imlecCiz(ctx, { x, y, ad, renk: r }, k) {
  const px = (x + 0.5) * OLCEK;
  const py = (y + 0.5) * OLCEK;
  ctx.fillStyle = r;
  ctx.strokeStyle = 'rgba(20, 14, 8, 0.9)';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(px, py, 5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const en = ctx.measureText(ad).width + 10 * k;
  const boy = 18 * k;
  let lx = px + 9 * k;
  if (lx + en > ctx.canvas.width) lx = px - 9 * k - en;
  const ly = Math.max(boy / 2, py - 10 * k);
  ctx.fillStyle = 'rgba(20, 14, 8, 0.8)';
  ctx.fillRect(lx, ly - boy / 2, en, boy);
  ctx.fillStyle = r;
  ctx.fillText(ad, lx + 5 * k, ly);
}

let tablo = null;
let sayac = null;

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

/** Geri sayım bindirmesi: metin (3, 2, 1, Başla!) ya da null (gizle). */
export function sayacGoster(metin) {
  sayac ??= kapEkle('yaris-sayac');
  sayac.hidden = metin === null;
  if (metin !== null) {
    sayac.textContent = String(metin);
    sayac.classList.remove('vurus');
    void sayac.offsetWidth;
    sayac.classList.add('vurus');
  }
}
