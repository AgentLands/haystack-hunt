/**
 * Kamera: yakınlaştırma ve kaydırma. Fare tekerleği (imlece odaklı), iki parmakla sıkıştırma,
 * orta tuş ya da Boşluk + sürükleme, ok tuşları, + / − / 0. Dönüşüm durumu gorunum.js'te,
 * matematik kural/gorunum.js'te; çizim ve hücre bulma onu kullanır. Tek parmak oyun aracına
 * kalır; ikinci parmak gelince o anki araç hamlesi bırakılır (birak).
 */
import { gorunum, gorunumAyarla } from '../gorunum.js';
import { odakla, kaydir, varsayilan } from '../kural/gorunum.js';
import { girdiOnleyiciEkle, hucreBul } from '../girdi.js';
import { durumAl, birak, imlecCikti, surukle } from '../oyun.js';
import { dinle } from '../olaylar.js';
import { kameraArayuzuKur } from './kamera-arayuz.js';

const ADIM = 1.4; // + / − tuşu ve düğmesinin çarpanı
const OK_ADIMI = 0.1; // ok tuşuyla görünür alanın oranı
const tuval = document.getElementById('tarla');
const dokunuslar = new Map(); // pointerId -> {x, y} (ekran px)
let sikistirma = null; // son iki parmak ölçümü {fx, fy, uzak}
let sikistiriyor = false; // tüm parmaklar kalkana dek tek parmak araç çalıştırmaz
let kaydirma = null; // {id, x, y}: orta tuş / Boşluk sürüklemesi
let bosluk = false;
let sonKonum = null; // fare ekran konumu (imleç hücresini yenilemek için)

function oran(x, y) {
  const k = tuval.getBoundingClientRect();
  return { fx: (x - k.left) / k.width, fy: (y - k.top) / k.height };
}

/** Görünüm değişince imleç hücresini fare altındakine eşitler (fare kıpırdamadan da). */
function imleciYenile() {
  const d = durumAl();
  if (!sonKonum || sikistiriyor || kaydirma || !d || (d.basili && d.arac === 'tirmik')) return;
  const k = tuval.getBoundingClientRect();
  const { x, y } = sonKonum;
  if (x < k.left || x > k.right || y < k.top || y > k.bottom) return;
  surukle(hucreBul(tuval, { clientX: x, clientY: y }));
}

/** Görünür alanın (ya da verilen ekran oranının) etrafında çarpan kadar yakınlaştırır. */
export function yakinlastir(carpan, fx = 0.5, fy = 0.5) {
  gorunumAyarla(odakla(gorunum, fx, fy, gorunum.z * carpan));
  imleciYenile();
}

/** Bütün tarlayı sığdırır (1×). */
export function sigdir() {
  gorunumAyarla(varsayilan());
  imleciYenile();
}

function kaydirmaBaslat(e) {
  kaydirma = { id: e.pointerId, x: e.clientX, y: e.clientY };
  tuval.setPointerCapture(e.pointerId);
  tuval.classList.add('kaydiriyor');
  imlecCikti();
}

function sikistirmaOlc() {
  const [a, b] = [...dokunuslar.values()];
  const { fx, fy } = oran((a.x + b.x) / 2, (a.y + b.y) / 2);
  return { fx, fy, uzak: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}

function basla(e) {
  if (e.button === 1 || (e.button === 0 && bosluk && e.pointerType !== 'touch')) {
    kaydirmaBaslat(e);
    return true;
  }
  if (e.pointerType !== 'touch') return false;
  dokunuslar.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (dokunuslar.size >= 2) {
    if (!sikistiriyor) {
      birak(); // iki parmak başladı: bu hamleyi iptal et
      imlecCikti();
      sikistiriyor = true;
    }
    sikistirma = sikistirmaOlc();
  }
  return sikistiriyor;
}

function tasi(e) {
  if (kaydirma && kaydirma.id === e.pointerId) {
    const k = tuval.getBoundingClientRect();
    gorunumAyarla(kaydir(gorunum, (e.clientX - kaydirma.x) / k.width,
      (e.clientY - kaydirma.y) / k.height));
    kaydirma.x = e.clientX;
    kaydirma.y = e.clientY;
    return true;
  }
  if (e.pointerType !== 'touch' || !dokunuslar.has(e.pointerId)) {
    sonKonum = { x: e.clientX, y: e.clientY };
    return false;
  }
  dokunuslar.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (dokunuslar.size >= 2 && sikistirma) {
    const yeni = sikistirmaOlc();
    let g = odakla(gorunum, sikistirma.fx, sikistirma.fy,
      gorunum.z * (yeni.uzak / sikistirma.uzak));
    g = kaydir(g, yeni.fx - sikistirma.fx, yeni.fy - sikistirma.fy);
    gorunumAyarla(g);
    sikistirma = yeni;
  }
  return sikistiriyor;
}

function bitir(e) {
  if (kaydirma && kaydirma.id === e.pointerId) {
    kaydirma = null;
    tuval.classList.remove('kaydiriyor');
    sonKonum = { x: e.clientX, y: e.clientY };
    imleciYenile();
    return true;
  }
  if (!dokunuslar.delete(e.pointerId)) return false;
  sikistirma = dokunuslar.size >= 2 ? sikistirmaOlc() : null;
  const tuketti = sikistiriyor;
  if (dokunuslar.size === 0) sikistiriyor = false;
  return tuketti;
}

function tusKur() {
  const girdiMi = (e) => e.target.closest && e.target.closest('input, textarea, select');
  const oklar = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  document.addEventListener('keydown', (e) => {
    if (girdiMi(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') {
      bosluk = true;
      tuval.classList.add('kaydirilabilir');
      if (!e.target.closest('button')) e.preventDefault();
    } else if (oklar[e.key] && gorunum.z > 1) {
      const [dx, dy] = oklar[e.key];
      gorunumAyarla(kaydir(gorunum, dx * OK_ADIMI, dy * OK_ADIMI));
      imleciYenile();
      e.preventDefault();
    } else if (e.key === '+' || e.key === '=') yakinlastir(ADIM);
    else if (e.key === '-' || e.key === '_') yakinlastir(1 / ADIM);
    else if (e.key === '0') sigdir();
  });
  const bosluguBirak = () => {
    bosluk = false;
    tuval.classList.remove('kaydirilabilir');
  };
  document.addEventListener('keyup', (e) => { if (e.code === 'Space') bosluguBirak(); });
  window.addEventListener('blur', bosluguBirak);
}

function tekerKur() {
  tuval.addEventListener('wheel', (e) => {
    e.preventDefault();
    const piksel = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const { fx, fy } = oran(e.clientX, e.clientY);
    sonKonum = { x: e.clientX, y: e.clientY };
    yakinlastir(Math.exp(-piksel * (e.ctrlKey ? 0.01 : 0.002)), fx, fy);
  }, { passive: false });
  // Orta tuşun tarayıcı otomatik kaydırması açılmasın.
  tuval.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
}

girdiOnleyiciEkle((tur, e) => (tur === 'bas' ? basla(e) : tur === 'tasi' ? tasi(e) : bitir(e)));
tusKur();
tekerKur();
kameraArayuzuKur({ yakinlastir: () => yakinlastir(ADIM), uzaklastir: () => yakinlastir(1 / ADIM),
  sigdir });
dinle('oyun-basladi', sigdir);
