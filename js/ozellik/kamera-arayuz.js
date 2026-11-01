/**
 * Kamera arayüzü: tuval kabının sağ altında büyüteç+, büyüteç−, çerçeve (sığdır) ikonlu
 * düğmeleri; sol altta (yakınken görünen) mini harita: tarlanın küçük hâli, görünür alan
 * dikdörtgeni; tıklayınca/sürükleyince oraya gider (karakter takibi, oyuncu yeniden hareket
 * edene dek bırakılır). Haritada yerel çiftçi parlak bir nokta; yarıştaki diğer oyuncular
 * haritaKaynagiKur ile verilen renkli küçük noktalardır.
 */
import { gorunum, gorunumAyarla } from '../gorunum.js';
import { gorunurAlan, merkezle, YAKIN_EN_AZ, zTavan } from '../kural/gorunum.js';
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';
import { katmanEkle, tarlaResmi } from '../cizim.js';
import { ikon } from './ikon.js';

const EN = 120;
const BOY = 80;

let haritaKaynagi = () => [];

/** Mini haritaya diğer oyuncuları ekler: islev(durum) → [{ x, y, renk }] (dünya birimi). */
export function haritaKaynagiKur(islev) {
  haritaKaynagi = islev;
}

function noktaCiz(ctx, x, y, renk, yaricap) {
  ctx.beginPath();
  ctx.arc((x / GENISLIK) * EN, (y / YUKSEKLIK) * BOY, yaricap, 0, Math.PI * 2);
  ctx.fillStyle = renk;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 14, 8, 0.9)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function dugmeYap(ikonAdi, baslik, tikla) {
  const d = document.createElement('button');
  d.type = 'button';
  d.append(ikon(ikonAdi, { boy: 22 }));
  d.title = baslik;
  d.setAttribute('aria-label', baslik);
  d.addEventListener('click', tikla);
  // Düğmeye basınca odak kalmasın: Boşluk/ok tuşları karakterde kalsın.
  d.addEventListener('pointerup', () => d.blur());
  return d;
}

function miniHaritaKur(kap, elleKaydirildi) {
  const harita = document.createElement('canvas');
  harita.className = 'minik-harita';
  // Arka bellek CSS boyutu × devicePixelRatio (keskin); çizim EN×BOY birimiyle yapılır.
  const olcekle = () => {
    const oran = Math.min(3, window.devicePixelRatio || 1);
    const en = Math.round((harita.clientWidth || EN) * oran);
    const boy = Math.round((harita.clientHeight || BOY) * oran);
    if (harita.width !== en || harita.height !== boy) {
      Object.assign(harita, { width: en, height: boy });
    }
  };
  harita.hidden = true;
  harita.setAttribute('aria-label', 'Mini harita');
  const ctx = harita.getContext('2d');
  const git = (e) => {
    elleKaydirildi();
    const k = harita.getBoundingClientRect();
    gorunumAyarla(merkezle(gorunum, ((e.clientX - k.left) / k.width) * GENISLIK,
      ((e.clientY - k.top) / k.height) * YUKSEKLIK));
  };
  harita.addEventListener('pointerdown', (e) => {
    harita.setPointerCapture(e.pointerId);
    git(e);
  });
  harita.addEventListener('pointermove', (e) => {
    if (harita.hasPointerCapture(e.pointerId)) git(e);
  });
  kap.append(harita);
  return function ciz(durum) {
    harita.hidden = gorunum.z <= YAKIN_EN_AZ + 1e-6;
    if (harita.hidden || !tarlaResmi) return;
    olcekle();
    ctx.setTransform(harita.width / EN, 0, 0, harita.height / BOY, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tarlaResmi, 0, 0, EN, BOY);
    // Görünür alan (dikey kutuda tarladan taşabilir) tarlaya kırpılır.
    const a = gorunurAlan(gorunum);
    const x = (Math.max(0, a.x) / GENISLIK) * EN;
    const y = (Math.max(0, a.y) / YUKSEKLIK) * BOY;
    const w = (Math.min(GENISLIK, a.x + a.en) / GENISLIK) * EN - x;
    const h = (Math.min(YUKSEKLIK, a.y + a.boy) / YUKSEKLIK) * BOY - y;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, EN, y);
    ctx.fillRect(0, y + h, EN, BOY - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, EN - x - w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    for (const o of haritaKaynagi(durum)) noktaCiz(ctx, o.x, o.y, o.renk, 2.5);
    const k = durum.karakter;
    if (k) noktaCiz(ctx, k.x, k.y, '#fff7a8', 3.5);
  };
}

export function kameraArayuzuKur({ yakinlastir, uzaklastir, sigdir, elleKaydirildi }) {
  const kap = document.getElementById('tarla-kap');
  const sira = document.createElement('div');
  sira.className = 'kamera-dugmeleri';
  const arti = dugmeYap('buyutec-arti', 'Yakınlaştır (+)', yakinlastir);
  const eksi = dugmeYap('buyutec-eksi', 'Uzaklaştır (−)', uzaklastir);
  const sigdirDugme = dugmeYap('cerceve', 'Sığdır (0)', sigdir);
  sira.append(arti, eksi, sigdirDugme);
  kap.append(sira);
  const haritaCiz = miniHaritaKur(kap, elleKaydirildi);
  // Her kare, çizimden sonra (ust katman) düğme durumları ve mini harita tazelenir.
  katmanEkle((ctx, durum) => {
    arti.disabled = gorunum.z >= zTavan(gorunum) - 1e-6;
    const sigmis = gorunum.z <= YAKIN_EN_AZ + 1e-6;
    eksi.disabled = sigmis;
    sigdirDugme.disabled = sigmis;
    haritaCiz(durum);
  }, 'ust');
}
