/**
 * Ses özelliği: oyun olaylarını dinleyip sentezlenmiş seslere bağlar; sessiz/aç düğmesi
 * (ses-acik / ses-kapali ikonu), 'M' tuşu ve düğmenin altında açılan küçük kâğıt kaydırıcı
 * (ana ses düzeyi 0-100; düğmeye basınca ya da fareyle üstüne gelince görünür, bir süre sonra
 * kapanır; stil ses.css). AudioContext ilk işaretçi/klavye hareketinde açılır.
 */
import { dinle } from '../olaylar.js';
import { dugmeEkle } from '../arayuz.js';
import { ikon, ikonDegistir } from './ikon.js';
import { hizSinirlayici, kazimDuzeyi, sessizMi, sessizKaydet } from './ses-desen.js';
import { duzeyKaydet, duzeyOku } from './ses-seviye.js';
import { stilYukle } from './pencere.js';
import * as motor from './ses-motor.js';

const KAZIM_ARALIK_MS = 80;
const KAZIM_SAPMA = 0.25; // kazı tıkları arası ±%25: metronom gibi olmasın
const TIRMIK_ARALIK_MS = 120;

function depo() {
  try {
    return window.localStorage;
  } catch (hata) {
    console.error('localStorage kullanılamıyor:', hata);
    return null;
  }
}

const KAGIT_SURE_MS = 3500; // kaydırıcı etkileşimsiz bu kadar sonra kapanır
const ACILIS_DUZEYI = 60; // düzey 0 iken sesi açınca dönülen düzey

let sessiz = false;
let duzey = 100;
let dugme = null;
let kagit = null;
let kagitZamani = null;
const sesIkonu = ikon('ses-acik');

function dugmeyiGuncelle() {
  const kapali = sessiz || duzey === 0;
  ikonDegistir(sesIkonu, kapali ? 'ses-kapali' : 'ses-acik');
  const ad = sessiz ? 'Sesi aç' : 'Sesi kapat';
  dugme.title = `${ad} (M)`;
  dugme.setAttribute('aria-label', ad);
  dugme.setAttribute('aria-pressed', String(sessiz));
}

function sessizDegistir() {
  sessiz = !sessiz;
  if (!sessiz && duzey === 0) duzeyUygula(ACILIS_DUZEYI, true);
  motor.sessizAyarla(sessiz);
  const d = depo();
  if (d) sessizKaydet(d, sessiz);
  dugmeyiGuncelle();
}

/** Ana ses düzeyini (0-100) uygular; kaydet: tercih depoya da yazılır. */
function duzeyUygula(yuzde, kaydet) {
  duzey = yuzde;
  motor.duzeyAyarla(yuzde);
  if (kagit) {
    kagit.querySelector('input').value = String(yuzde);
    kagit.querySelector('output').textContent = String(yuzde);
  }
  const d = depo();
  if (kaydet && d) duzeyKaydet(d, yuzde);
  dugmeyiGuncelle();
}

function kagitiKapat() {
  clearTimeout(kagitZamani);
  if (kagit) kagit.hidden = true;
}

function kagitZamanlayici() {
  clearTimeout(kagitZamani);
  kagitZamani = setTimeout(kagitiKapat, KAGIT_SURE_MS);
}

/** Kâğıt kaydırıcıyı düğmenin altında (ekran içinde kalacak biçimde) gösterir. */
function kagitiAc() {
  kagit.hidden = false;
  const k = dugme.getBoundingClientRect();
  const en = kagit.offsetWidth;
  const sol = Math.min(window.innerWidth - en - 8, Math.max(8, k.left + k.width / 2 - en / 2));
  kagit.style.left = `${sol}px`;
  kagit.style.top = `${k.bottom + 8}px`;
  kagitZamanlayici();
}

function kagitKur() {
  stilYukle('./ses.css');
  kagit = document.createElement('div');
  kagit.className = 'ses-kagit kagit-pencere';
  kagit.setAttribute('role', 'group');
  kagit.setAttribute('aria-label', 'Ses düzeyi');
  kagit.hidden = true;
  kagit.innerHTML = '<label for="ses-duzey">Ses</label>'
    + '<input id="ses-duzey" type="range" min="0" max="100" step="5">'
    + '<output class="sayi" for="ses-duzey"></output>';
  const girdi = kagit.querySelector('input');
  girdi.addEventListener('input', () => {
    const yuzde = Number(girdi.value);
    if (sessiz && yuzde > 0) {
      sessiz = false;
      motor.sessizAyarla(false);
      const d = depo();
      if (d) sessizKaydet(d, false);
    }
    duzeyUygula(yuzde, false);
    kagitZamanlayici();
  });
  girdi.addEventListener('change', () => {
    duzeyUygula(Number(girdi.value), true);
    motor.tikSesi(); // yeni düzeyi duyur
  });
  kagit.addEventListener('pointerenter', () => clearTimeout(kagitZamani));
  kagit.addEventListener('pointerleave', kagitZamanlayici);
  dugme.after(kagit);
  dugme.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') kagitiAc();
  });
  dugme.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && !kagit.hidden) kagitZamanlayici();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!kagit.hidden && !kagit.contains(e.target) && !dugme.contains(e.target)) kagitiKapat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !kagit.hidden) kagitiKapat();
  });
}

function sesKur() {
  const d = depo();
  sessiz = d ? sessizMi(d) : false;
  duzey = d ? duzeyOku(d) : 100;
  motor.sessizAyarla(sessiz);
  motor.duzeyAyarla(duzey);
  dugme = dugmeEkle('ust', {
    metin: 'Ses', baslik: 'Sesi kapat', ikon: sesIkonu,
    tikla: () => {
      sessizDegistir();
      kagitiAc();
    },
  });
  kagitKur();
  duzeyUygula(duzey, false);

  // Otomatik çalma politikası: bağlam yalnız kullanıcı hareketinde kurulur/sürdürülür.
  for (const olay of ['pointerdown', 'keydown']) {
    document.addEventListener(olay, () => motor.uyandir(), { capture: true });
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') sessizDegistir();
  });

  const kazimIzni = hizSinirlayici(KAZIM_ARALIK_MS, KAZIM_SAPMA);
  const tirmikIzni = hizSinirlayici(TIRMIK_ARALIK_MS);
  dinle('kazildi', ({ miktar }) => {
    if (kazimIzni(performance.now())) motor.kazimSesi(kazimDuzeyi(miktar));
  });
  dinle('tirmiklandi', () => {
    if (tirmikIzni(performance.now())) motor.tirmikSesi();
  });
  dinle('dedektor', ({ seviye }) => motor.dedektorSesi(seviye));
  dinle('dedektor-bos', () => motor.dedektorBosSesi());
  dinle('parilti', () => motor.pariltiSesi());
  dinle('igne-gorundu', () => motor.igneSesi());
  dinle('bulundu', () => motor.bulunduSesi());
  dinle('pes-edildi', () => motor.pesSesi());
  dinle('arac-secildi', () => motor.tikSesi());
}

sesKur();
