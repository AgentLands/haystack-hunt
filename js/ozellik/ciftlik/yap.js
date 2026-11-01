/**
 * Çiftlik arayüzünün ortak DOM ve kamera yardımcıları: öğe üretme (yap), düğme (dugme),
 * kamerayı bir karoya götürme (kameraGit) ve dokunmatik mi? sorusu. Özelliklerin hepsi
 * buradan alır; böylece her dosya aynı üç satırı yinelemez.
 */
import { gorunum, gorunumAyarla } from '../../gorunum.js';
import { takipEt } from '../../kural/gorunum.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { takipBirak } from '../kamera-takip.js';

/** Öğe üretir: yap('div', 'sinif', 'metin'). */
export function yap(ad, sinif = '', metin = undefined) {
  const o = document.createElement(ad);
  if (sinif) o.className = sinif;
  if (metin !== undefined) o.textContent = metin;
  if (ad === 'button') o.type = 'button';
  return o;
}

/** Düğme: metin, ipucu/ad (title ve aria-label), tıklama; dokununca odağı bırakır. */
export function dugme(sinif, metin, baslik, tikla) {
  const d = yap('button', sinif, metin);
  if (baslik) {
    d.title = baslik;
    d.setAttribute('aria-label', baslik);
  }
  if (tikla) d.addEventListener('click', tikla);
  d.addEventListener('pointerup', () => d.blur());
  return d;
}

export const dokunmatikMi = () => document.body.classList.contains('dokunmatik')
  || matchMedia('(pointer: coarse)').matches;

/** Yakınlık (z): uzaktaysa kamera en az bu kadar yaklaşır (sorun listesi, istatistik). */
const GIT_Z = 3;

/** Kamerayı karonun (kx, ky) merkezine götürür (takip bırakılır; oyuncu yürüyünce döner). */
export function kameraGit(kx, ky, en = 1, boy = 1) {
  takipBirak();
  const x = (kx + en / 2) * KARO;
  const y = (ky + boy / 2) * KARO;
  gorunumAyarla(takipEt(gorunum, x, y, Math.max(gorunum.z, GIT_Z), 1));
}

/** Tuval kabı (#tarla-kap): bindirmelerin kök öğesi. */
export const tuvalKap = () => document.getElementById('tarla-kap');
