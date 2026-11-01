/**
 * Çiftlik istatistik ekranı (kâğıt pencere, "çiftlik defteri"): son 60 saniyenin eşya başına
 * üretim ve depolama hızı (eşya/dk, varsa teslim ve boşa giden), son 10 dakikanın dakika dakika
 * çizgisi, kuruş kazancı, bulunan iğneler ve "en çok duran 3 parça" (darboğaz; satıra dokununca
 * kamera oraya gider). Veri saniyelik 'ciftlik-ozet' olaylarından birikir (istatistik-veri.js,
 * sorun-veri.js); eşya başına olay yoktur. I tuşu, üstteki Defter düğmesi (çiftlikte) ve
 * 'ciftlik-ekran-ac' { ad: 'istatistik' } açar.
 */
import { dinle } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { esyaKodu, esyaTanimi } from '../../kural/ciftlik/esya.js';
import { istatistikKur, ozetEkle, hizlar, dakikaSerisi, kurusOzeti, hizToplami }
  from './istatistik-veri.js';
import { darbogazGuncelle, enCokDuran, KISA } from './sorun-veri.js';
import { kurusMetni } from './hud-veri.js';
import { simge } from './simge.js';
import { yap, kameraGit } from './yap.js';
import { pencereHazirla, stilYukle } from '../pencere.js';

stilYukle('./ciftlik/pano.css');

const IGNE = esyaKodu('igne');
const SUTUNLAR = [['uretilen', 'Üretilen'], ['depolanan', 'Depolanan'], ['teslim', 'Teslim'],
  ['bosa', 'Boşa giden']];
const CIZGI_EN = 300;
const CIZGI_BOY = 84;

let ist = istatistikKur();
let puanlar = new Map();
let sonHud = null;
let pencere = null;
let govde = null;

const ad = (kod) => esyaTanimi(Number(kod))?.ad ?? `#${kod}`;

function tablo() {
  const hiz = Object.fromEntries(SUTUNLAR.map(([a]) => [a, hizlar(ist, a)]));
  const kodlar = [...new Set(SUTUNLAR.flatMap(([a]) => Object.keys(hiz[a])))];
  const sutun = SUTUNLAR.filter(([a]) => hizToplami(hiz[a]) > 0);
  const t = yap('table', 'cf-hiz-tablo');
  const bas = yap('tr');
  bas.append(yap('th', '', 'Eşya (dk)'), ...sutun.map(([, b]) => yap('th', '', b)));
  t.append(bas);
  for (const kod of kodlar) {
    const satir = yap('tr');
    const hucre = ([a]) => yap('td', 'sayi', String(hiz[a][kod] ?? 0));
    satir.append(yap('th', '', ad(kod)), ...sutun.map(hucre));
    t.append(satir);
  }
  if (!kodlar.length) {
    const bos = yap('tr');
    const h = yap('td', 'cf-bos', 'Henüz üretim yok. İlk huniyi kur, hız burada görünür.');
    h.colSpan = 3;
    bos.append(h);
    t.append(bos);
  }
  return t;
}

function cizgi() {
  const seri = [['uretilen', 'üretilen'], ['depolanan', 'depolanan']]
    .map(([a, e]) => ({ a, e, v: dakikaSerisi(ist, a) }));
  const tavan = Math.max(1, ...seri.flatMap((s) => s.v));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${CIZGI_EN} ${CIZGI_BOY}`);
  svg.setAttribute('class', 'cf-cizgi');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Son ${ist.dakikalar.length} dakika, en çok ${tavan} eşya/dk`);
  for (const [k, s] of seri.entries()) {
    const nokta = s.v.map((n, i) => {
      const x = s.v.length > 1 ? (i / (s.v.length - 1)) * (CIZGI_EN - 8) + 4 : CIZGI_EN / 2;
      return `${x.toFixed(1)},${(CIZGI_BOY - 6 - (n / tavan) * (CIZGI_BOY - 14)).toFixed(1)}`;
    });
    const yol = document.createElementNS(NS, 'polyline');
    yol.setAttribute('points', nokta.join(' '));
    yol.setAttribute('class', `cizgi-${k}`);
    svg.append(yol);
  }
  const kap = yap('figure', 'cf-cizgi-kap');
  const dk = Math.max(1, ist.dakikalar.length);
  const aciklama = yap('figcaption', '', `Son ${dk} dk · en çok ${tavan}/dk`);
  const lejant = yap('span', 'cf-lejant');
  lejant.append(yap('i', 'cizgi-0'), 'üretilen ', yap('i', 'cizgi-1'), 'depolanan');
  kap.append(svg, aciklama, lejant);
  return kap;
}

function duranlar(c) {
  const kutu = yap('ol', 'cf-duranlar');
  const liste = enCokDuran(puanlar, c, 3);
  if (!liste.length) kutu.append(yap('li', 'cf-bos', 'Duran parça yok: hat akıyor.'));
  for (const s of liste) {
    const li = yap('li');
    const d = yap('button', 'cf-sorun-satir agir');
    d.type = 'button';
    const ust = yap('span', 'cf-sorun-ust');
    ust.append(simge('uyari', 16), yap('strong', '', s.ad),
      yap('em', 'cf-durum-etiket', KISA[s.durum] ?? 'sık duruyor'));
    d.append(ust, yap('span', 'cf-sorun-neden', s.neden));
    d.addEventListener('click', () => {
      pencere.close();
      const p = c.parcalar.get(s.id);
      kameraGit(s.kx, s.ky, p?.en, p?.boy);
    });
    li.append(d);
    kutu.append(li);
  }
  return kutu;
}

function ozetSatirlari(c) {
  const { toplam, dakikada } = kurusOzeti(ist);
  const alinan = c.gomulu.filter((g) => g.esya === IGNE && g.alindi).length;
  const hepsi = c.gomulu.filter((g) => g.esya === IGNE).length;
  const dl = yap('dl', 'fis-satirlar cf-ozet-satirlar');
  const ekle = (a, d) => {
    const satir = yap('div');
    satir.append(yap('dt', '', a), yap('dd', '', d));
    dl.append(satir);
  };
  ekle('Kuruş kazancı (son 10 dk)', `+${kurusMetni(toplam)} (${kurusMetni(dakikada)}/dk)`);
  ekle('Toplam kuruş', kurusMetni(sonHud?.eko.kurus ?? 0));
  ekle('Bulunan iğne', `${alinan} / ${hepsi}`);
  return dl;
}

function kur() {
  pencere = yap('dialog', 'kagit-pencere pencere cf-istatistik');
  pencere.setAttribute('aria-labelledby', 'cf-ist-baslik');
  const baslik = yap('h2', '', 'Çiftlik defteri');
  baslik.id = 'cf-ist-baslik';
  govde = yap('div', 'cf-ist-govde');
  pencere.append(baslik, govde);
  document.body.append(pencere);
  pencereHazirla(pencere, { dis: true });
}

function ciz() {
  const c = durumAl().ciftlik;
  govde.replaceChildren(yap('h3', '', 'Üretim hızı'), tablo(), cizgi(),
    yap('h3', '', 'En çok duran parçalar'), duranlar(c), yap('h3', '', 'Özet'), ozetSatirlari(c));
}

/** Pencereyi açar ve içini güncel veriyle kurar. */
export function istatistikAc() {
  if (durumAl()?.mod !== 'ciftlik') return;
  if (!pencere) kur();
  ciz();
  if (!pencere.open) pencere.showModal();
}

dinle('ciftlik-hud', (v) => {
  sonHud = v;
});
dinle('ciftlik-ozet', (veri) => {
  const durum = durumAl();
  if (durum?.mod !== 'ciftlik') return;
  ozetEkle(ist, veri, sonHud?.eko.kurus ?? 0);
  darbogazGuncelle(puanlar, sonHud?.sorunlar ?? [], durum.ciftlik);
  if (pencere?.open) ciz();
});
dinle('ciftlik-acildi', () => {
  ist = istatistikKur();
  puanlar = new Map();
});
dinle('ciftlik-ekran-ac', ({ ad: a }) => {
  if (a === 'istatistik') istatistikAc();
});
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyI' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.target.closest?.('input, textarea, select, dialog')) return;
  if (durumAl()?.mod === 'ciftlik' && !document.querySelector('dialog[open]')) istatistikAc();
});
// Çiftlikte üstteki "Defter" düğmesi normal tarla istatistiği yerine çiftlik defterini açar.
document.querySelector('button[aria-label="İstatistik"]')?.addEventListener('click', (e) => {
  if (durumAl()?.mod !== 'ciftlik') return;
  e.stopImmediatePropagation();
  istatistikAc();
}, true);
