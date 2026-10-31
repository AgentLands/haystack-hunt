/**
 * Kamera arayüzü: tuval kabının sağ altında +, −, ⤢ düğmeleri; sol altta (yakınken görünen)
 * mini harita: tarlanın küçük hâli, görünür alan dikdörtgeni; tıklayınca/sürükleyince oraya gider
 * (karakter takibi, oyuncu yeniden hareket edene dek bırakılır).
 */
import { gorunum, gorunumAyarla } from '../gorunum.js';
import { gorunurAlan, merkezle, YAKIN_EN_AZ, YAKIN_EN_COK } from '../kural/gorunum.js';
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';
import { katmanEkle, tarlaResmi } from '../cizim.js';

const EN = 120;
const BOY = 80;

function dugmeYap(metin, baslik, tikla) {
  const d = document.createElement('button');
  d.type = 'button';
  d.textContent = metin;
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
  harita.width = EN;
  harita.height = BOY;
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
  return function ciz() {
    harita.hidden = gorunum.z <= YAKIN_EN_AZ + 1e-6;
    if (harita.hidden || !tarlaResmi) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tarlaResmi, 0, 0, EN, BOY);
    const a = gorunurAlan(gorunum);
    const x = (a.x / GENISLIK) * EN;
    const y = (a.y / YUKSEKLIK) * BOY;
    const w = (a.en / GENISLIK) * EN;
    const h = (a.boy / YUKSEKLIK) * BOY;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, EN, y);
    ctx.fillRect(0, y + h, EN, BOY - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, EN - x - w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  };
}

export function kameraArayuzuKur({ yakinlastir, uzaklastir, sigdir, elleKaydirildi }) {
  const kap = document.getElementById('tarla-kap');
  const sira = document.createElement('div');
  sira.className = 'kamera-dugmeleri';
  const arti = dugmeYap('+', 'Yakınlaştır (+)', yakinlastir);
  const eksi = dugmeYap('−', 'Uzaklaştır (−)', uzaklastir);
  const sigdirDugme = dugmeYap('⤢', 'Sığdır (0)', sigdir);
  sira.append(arti, eksi, sigdirDugme);
  kap.append(sira);
  const haritaCiz = miniHaritaKur(kap, elleKaydirildi);
  // Her kare, çizimden sonra (ust katman) düğme durumları ve mini harita tazelenir.
  katmanEkle(() => {
    arti.disabled = gorunum.z >= YAKIN_EN_COK - 1e-6;
    const sigmis = gorunum.z <= YAKIN_EN_AZ + 1e-6;
    eksi.disabled = sigmis;
    sigdirDugme.disabled = sigmis;
    haritaCiz();
  }, 'ust');
}
