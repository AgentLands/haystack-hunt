/**
 * Girdi: klavye (WASD/oklar → yön, Boşluk → kullan, E → bin/in, 1–4 → araç) ve tuval
 * işaretçisi (fare/dokunma). Tuvalde tıklanan hücre karakterin erişimindeyse araç orada
 * kullanılır (basılı tutma sürer), değilse karakter oraya yürür (kontrol.hedef).
 * Girdiler kontrol.js'e yazar; oyun.js her karede okur.
 */
import { ekrandanHucre } from './kural/gorunum.js';
import { gorunum } from './gorunum.js';
import { bas, surukle, birak, imlecCikti, aracSec } from './oyun.js';
import { kontrol, yonAyarla, kullanAyarla, kontrolSifirla } from './kontrol.js';

export const KISAYOLLAR = { 1: 'el', 2: 'tirmik', 3: 'dedektor', 4: 'miknatis' };
/** Hareket tuşları (e.code; klavye düzeninden bağımsız fiziksel konum) → [dx, dy]. */
export const YON_TUSLARI = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

/** Boşluk en az bu kadar (ms) basılı sayılır: kısa dokunuş da en az bir karede görülsün. */
const EN_KISA_BASIS = 50;

const onleyiciler = [];
const basiliYonler = new Set();
let bosluk = { basildi: 0, sayi: 0 };

/**
 * İşaretçi olaylarını oyun araçlarından önce görmek için (kamera kaydırma, sıkıştırma...).
 * islev(tur, e): tur 'bas' | 'tasi' | 'bitir'; true dönerse olay tüketilir, araç çalışmaz.
 */
export function girdiOnleyiciEkle(islev) {
  onleyiciler.push(islev);
}

function tuketildi(tur, e) {
  let sonuc = false;
  for (const islev of onleyiciler) if (islev(tur, e)) sonuc = true;
  return sonuc;
}

/** Ekran noktasını (geçerli yakınlaştırma/kaydırmayı gözeterek) tarla hücresine çevirir. */
export function hucreBul(tuval, e) {
  const k = tuval.getBoundingClientRect();
  return ekrandanHucre(gorunum, (e.clientX - k.left) / k.width, (e.clientY - k.top) / k.height);
}

function yonuGuncelle() {
  let x = 0;
  let y = 0;
  for (const kod of basiliYonler) {
    x += YON_TUSLARI[kod][0];
    y += YON_TUSLARI[kod][1];
  }
  yonAyarla(Math.sign(x), Math.sign(y), 'klavye');
}

/** Klavye oyuna mı ait: yazı alanında ya da açık bir pencerede (dialog, rehber) değilse. */
function oyunTusuMu(e) {
  const hedef = e.target;
  if (!hedef.closest) return true;
  if (hedef.closest('input, textarea, select, dialog')) return false;
  if (e.code === 'Space' && hedef.closest('.rehber')) return false; // rehber düğmesine bas
  return !(e.ctrlKey || e.metaKey || e.altKey);
}

function tusBasildi(e) {
  if (!oyunTusuMu(e)) return;
  if (YON_TUSLARI[e.code]) {
    e.preventDefault(); // oklar sayfayı kaydırmasın
    if (!basiliYonler.has(e.code)) {
      basiliYonler.add(e.code);
      yonuGuncelle();
    }
  } else if (e.code === 'Space') {
    e.preventDefault(); // sayfa kaymasın, odaktaki düğme tıklanmasın
    if (!e.repeat) bosluk = { basildi: performance.now(), sayi: bosluk.sayi + 1 };
    kullanAyarla(true, 'klavye');
  } else if (e.code === 'KeyE') {
    if (!e.repeat) kontrol.binIste = true;
  } else if (KISAYOLLAR[e.key]) {
    aracSec(KISAYOLLAR[e.key]);
  }
}

function tusBirakildi(e) {
  if (basiliYonler.delete(e.code)) yonuGuncelle();
  if (e.code === 'Space') {
    if (oyunTusuMu(e)) e.preventDefault();
    const { basildi, sayi } = bosluk;
    const kalan = EN_KISA_BASIS - (performance.now() - basildi);
    if (kalan <= 0) kullanAyarla(false, 'klavye');
    else setTimeout(() => { if (bosluk.sayi === sayi) kullanAyarla(false, 'klavye'); }, kalan);
  }
}

/**
 * Bütün girdileri bırakır (pencere odağı kaybolunca, menü açılınca): basılı tuşlar, kol,
 * Kullan ve tıkla-yürü hedefi; tuvaldeki basılı araç da bırakılır.
 */
export function hepsiniBirak() {
  basiliYonler.clear();
  bosluk = { basildi: 0, sayi: bosluk.sayi + 1 };
  kontrolSifirla();
  birak();
}

export function girdiKur(tuval) {
  tuval.addEventListener('pointerdown', (e) => {
    if (tuketildi('bas', e) || e.button > 0) return;
    tuval.setPointerCapture(e.pointerId);
    const p = hucreBul(tuval, e);
    if (!bas(p, performance.now())) kontrol.hedef = p;
  });
  tuval.addEventListener('pointermove', (e) => {
    if (!tuketildi('tasi', e)) surukle(hucreBul(tuval, e));
  });
  for (const olay of ['pointerup', 'pointercancel']) {
    tuval.addEventListener(olay, (e) => {
      if (!tuketildi('bitir', e)) birak();
    });
  }
  tuval.addEventListener('pointerleave', imlecCikti);
  document.addEventListener('keydown', tusBasildi);
  document.addEventListener('keyup', tusBirakildi);
  window.addEventListener('blur', hepsiniBirak);
}
