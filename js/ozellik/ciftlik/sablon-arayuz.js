/**
 * Şablon penceresi (DOM): hazır "Önerilen ilk hat" + 10 yuva. Normal kipte yuvadan
 * Yapıştır / Kodu kopyala / Sil; "Şablon kaydet" ile açılınca ad alanı ve "Buraya kaydet"
 * düğmeleri çıkar. Altta metin kodu ile içe aktarma. Her satırda küçük resim (aile renkli
 * kutular). Kilitli parça içeren şablon yapıştırılırken kırmızı karolar secim-cizim.js'te.
 * Düğmeler ≥ 44 px (dokunmatik); 390 px'te pencere kendi içinde kayar.
 */
import { parcaTanimi } from '../../kural/ciftlik/parca-kayit.js';
import { kumeKaroSayisi } from '../../kural/ciftlik/izgara/kume.js';
import {
  SABLON_YUVA, sablonlariOku, hazirlariOku, sablonKaydet, sablonSil, sablonKodu,
  sablonIceAktar,
} from './sablon.js';
import { yapistirBaslat } from './secim.js';

const kap = document.getElementById('tarla-kap');
const AILE_RENK = {
  toplama: '#8cb04a', tasima: '#b08a4c', ayiklama: '#6a8fb8', isleme: '#b86a6a',
  depo: '#c9a24a', enerji: '#d68a40', mantik: '#8a6ab8',
};
const RESIM_EN = 56;
const RESIM_BOY = 40;

const panel = document.createElement('div');
panel.className = 'ciftlik-sablon-panel kagit-pencere';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'Şablonlar');
panel.hidden = true;
kap.append(panel);

let kaydedilecek = null; // { kume } (Şablon kaydet kipi)
let mesaj = '';
let kodMetni = '';
let ad = '';

function el(etiket, sinif, metin) {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

function dugme(metin, baslik, tikla) {
  const d = el('button', 'ciftlik-sablon-dugme', metin);
  d.type = 'button';
  d.title = baslik;
  d.addEventListener('click', tikla);
  return d;
}

/** Kümenin küçük resmi: parça kutuları aile renginde, ok yönü işaretli. */
function resim(kume) {
  const tuval = el('canvas', 'ciftlik-sablon-resim');
  tuval.width = RESIM_EN;
  tuval.height = RESIM_BOY;
  const ctx = tuval.getContext('2d');
  const olcek = Math.max(1, Math.floor(Math.min(RESIM_EN / kume.en, RESIM_BOY / kume.boy)));
  const ox = Math.floor((RESIM_EN - kume.en * olcek) / 2);
  const oy = Math.floor((RESIM_BOY - kume.boy * olcek) / 2);
  for (const q of kume.parcalar) {
    const t = parcaTanimi(q.kod);
    const [en, boy] = q.yon & 1 ? [t.boyut[1], t.boyut[0]] : t.boyut;
    ctx.fillStyle = AILE_RENK[t.aile] ?? '#8a7a66';
    ctx.fillRect(ox + q.x * olcek, oy + q.y * olcek, (t.yonlu ? en : t.boyut[0]) * olcek,
      (t.yonlu ? boy : t.boyut[1]) * olcek);
    ctx.fillStyle = '#2a1a0d';
    const mx = ox + (q.x + 0.5) * olcek + [0.3, 0, -0.3, 0][q.yon] * olcek;
    const my = oy + (q.y + 0.5) * olcek + [0, 0.3, 0, -0.3][q.yon] * olcek;
    ctx.fillRect(Math.floor(mx), Math.floor(my), Math.max(1, olcek / 4), Math.max(1, olcek / 4));
  }
  return tuval;
}

function satir(baslik, alt, kume, dugmeler) {
  const s = el('div', 'ciftlik-sablon-satir');
  s.append(kume ? resim(kume) : el('div', 'ciftlik-sablon-resim bos'));
  const yazi = el('div', 'ciftlik-sablon-yazi');
  yazi.append(el('b', '', baslik), el('span', '', alt));
  const dg = el('div', 'ciftlik-sablon-dugmeler');
  dg.append(...dugmeler);
  s.append(yazi, dg);
  return s;
}

function yapistirDugmesi(kume) {
  return dugme('Yapıştır', 'Haritaya yapıştır', () => {
    kapat();
    yapistirBaslat(kume);
  });
}

function yuvaSatiri(sablon, i) {
  const bas = `${i + 1}. ${sablon ? sablon.ad : 'Boş yuva'}`;
  const alt = sablon ? `${sablon.kume.parcalar.length} parça · ${kumeKaroSayisi(sablon.kume)} karo`
    : 'Henüz şablon yok';
  const dg = [];
  if (kaydedilecek) {
    dg.push(dugme(sablon ? 'Üstüne kaydet' : 'Buraya kaydet', 'Seçimi bu yuvaya kaydet', () => {
      const tamam = sablonKaydet(i, ad, kaydedilecek.kume);
      mesaj = tamam ? `Yuva ${i + 1} kaydedildi` : 'Kaydedilemedi (depolama dolu ya da kapalı)';
      if (tamam) kaydedilecek = null;
      ciz();
    }));
  } else if (sablon) {
    dg.push(yapistirDugmesi(sablon.kume));
    dg.push(dugme('Kod', 'Metin kodunu göster ve kopyala', () => kodGoster(i)));
    dg.push(dugme('Sil', 'Yuvayı boşalt', () => {
      sablonSil(i);
      mesaj = `Yuva ${i + 1} boşaltıldı`;
      ciz();
    }));
  }
  return satir(bas, alt, sablon?.kume ?? null, dg);
}

function kodGoster(i) {
  kodMetni = sablonKodu(i) ?? '';
  mesaj = 'Kod aşağıda; kopyalandı ya da seçip kopyala';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(kodMetni).catch((hata) => {
      console.error('Panoya yazılamadı:', hata);
      mesaj = 'Panoya yazılamadı: kodu seçip kopyala';
      ciz();
    });
  }
  ciz();
}

function kodAlani() {
  const kutu = el('div', 'ciftlik-sablon-kod');
  const alan = el('textarea');
  alan.rows = 2;
  alan.value = kodMetni;
  alan.placeholder = 'Şablon kodu (CS1-...)';
  alan.setAttribute('aria-label', 'Şablon kodu');
  alan.addEventListener('input', () => { kodMetni = alan.value; });
  const al = dugme('İçe aktar', 'Kodu ilk boş yuvaya al', () => {
    const s = sablonIceAktar(alan.value);
    mesaj = s.hata ?? `İçe aktarıldı: yuva ${s.yuva + 1}`;
    if (!s.hata) kodMetni = '';
    ciz();
  });
  kutu.append(alan, al);
  return kutu;
}

function ciz() {
  panel.replaceChildren();
  const ust = el('div', 'ciftlik-sablon-ust');
  ust.append(el('b', '', kaydedilecek ? 'Şablon kaydet' : 'Şablonlar'),
    dugme('✕', 'Kapat', kapat));
  panel.append(ust);
  if (kaydedilecek) {
    const girdi = el('input');
    girdi.type = 'text';
    girdi.maxLength = 24;
    girdi.value = ad;
    girdi.placeholder = 'Şablon adı';
    girdi.setAttribute('aria-label', 'Şablon adı');
    girdi.addEventListener('input', () => { ad = girdi.value; });
    panel.append(girdi);
  } else {
    for (const h of hazirlariOku()) {
      panel.append(satir(h.ad, 'Hazır · yuva tutmaz', h.kume, [yapistirDugmesi(h.kume)]));
    }
  }
  sablonlariOku().forEach((s, i) => panel.append(yuvaSatiri(s, i)));
  if (!kaydedilecek) panel.append(kodAlani());
  const durum = el('div', 'ciftlik-sablon-mesaj', mesaj);
  durum.setAttribute('aria-live', 'polite');
  panel.append(durum);
}

export function kapat() {
  panel.hidden = true;
  kaydedilecek = null;
}

/** Pencereyi açar; { kume } verilirse "Şablon kaydet" kipinde. */
export function sablonPaneliAc(kayit = null) {
  kaydedilecek = kayit;
  ad = '';
  mesaj = '';
  if (!kayit) kodMetni = '';
  ciz();
  panel.hidden = false;
}
