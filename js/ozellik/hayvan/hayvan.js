/**
 * Tarla hayvanları (süs): oyun başlayınca tohumdan hayvanları kurar, kazı / adım / makine
 * olaylarından ürkütür, her karede ilerletir ve iki katmanda çizer ('alt': yerdekiler ve
 * gölgeler, 'ust': uçan serçeler). Oynanışı ve puanı etkilemez. Ürkme anında
 * 'hayvan-kacti' { tur, x, y } olayı yayar (ileride buluntu defterine bağlanabilir).
 */
import { dinle, yay } from '../../olaylar.js';
import { katmanEkle } from '../../cizim.js';
import { hayvanKur } from '../../kural/hayvan.js';
import { rahatsizEt, uyandir, ilerlet } from '../../kural/hayvan-hareket.js';
import { zeminCiz, havaCiz } from './cizim.js';
import './ses.js';

/** Rahatsızlık yarıçap çarpanları: kazı 1, yürüyüş sessiz, makine geniş. */
const CARPAN = { kazi: 1, adim: 0.75, makine: 1.5, ufleme: 1.8 };
/** Bir karede işlenen en uzun süre (sn): sekme dönüşünde hayvanlar ışınlanmasın. */
const EN_UZUN_KARE = 0.05;

let hayvanlar = [];
let tarla = null;
let sonZaman = null;
const sade = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)');

/** Test ve araç kancası: canlı hayvan listesi. */
export const hayvanlariAl = () => hayvanlar;

function bildir(urken) {
  for (const h of urken) yay('hayvan-kacti', { tur: h.tur, x: h.ox, y: h.oy });
}

/** (x, y) DÜNYA birimindeki rahatsızlık. */
function rahatsiz(x, y, carpan) {
  if (tarla) bildir(rahatsizEt(hayvanlar, tarla, x, y, carpan));
}

dinle('oyun-basladi', ({ durum }) => {
  tarla = durum.tarla;
  hayvanlar = hayvanKur(durum.tarla, durum.garaj, durum.karakter);
  sonZaman = null;
});
// Araç olaylarında x, y hücre birimidir (hücre i'nin merkezi i): dünya = hücre + 0.5.
dinle('kazildi', ({ x, y }) => rahatsiz(x + 0.5, y + 0.5, CARPAN.kazi));
dinle('tirmiklandi', ({ x, y }) => rahatsiz(x + 0.5, y + 0.5, CARPAN.kazi));
dinle('ufleme', ({ x, y }) => rahatsiz(x + 0.5, y + 0.5, CARPAN.ufleme));
dinle('karakter-adim', ({ x, y }) => rahatsiz(x, y, CARPAN.adim));
dinle('makine-calisti', ({ makine }) => rahatsiz(makine.x, makine.y, CARPAN.makine));
// Marş: kedi uyanır (garajın yanındaki makinenin sesi).
dinle('makine-bin', ({ makine }) => {
  if (tarla) bildir(uyandir(hayvanlar, tarla, 'kedi', makine.x, makine.y));
});

dinle('kare', ({ zaman, durum }) => {
  const dt = sonZaman === null ? 0 : Math.min(EN_UZUN_KARE, Math.max(0, (zaman - sonZaman) / 1000));
  sonZaman = zaman;
  for (const m of durum.makineler) {
    if (m.surucu && (Math.abs(m.hiz) > 0.5 || m.calisiyor)) rahatsiz(m.x, m.y, CARPAN.makine);
  }
  ilerlet(hayvanlar, durum.tarla, dt, durum.karakter);
});

katmanEkle((ctx, durum, zaman) => zeminCiz(ctx, hayvanlar, zaman, !sade || !sade.matches), 'alt');
katmanEkle((ctx, durum, zaman) => havaCiz(ctx, hayvanlar, zaman), 'ust');
