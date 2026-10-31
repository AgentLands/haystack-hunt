/**
 * Bot: tırmık şeridi. Olası hücrelerin üstünden tarla kenarına süpürmek, şerit boyunca
 * yığını alçaltır (yan yanda saman birikir) ve kenara yakın samanı tarla dışına atar;
 * elle kazıdan çok daha ucuza geniş alan açar.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';
import { TIRMIK_YARICAP } from '../kural/araclar.js';

export const SERIT_YARI = 2;
export const MIN_SERIT_ADAY = 8;
const YONLER = ['sag', 'sol', 'alt', 'ust'];

/**
 * En verimli şerit: { a, b, say, puan, yatay, m, bas, son } ya da null.
 * `temiz[c]` = hücre daha önce bir şeritle süpürüldü. Hız: hücre/kare.
 */
export function enIyiSerit(liste, temiz, konum, hiz) {
  let eniyi = null;
  for (const yon of YONLER) {
    const yatay = yon === 'sag' || yon === 'sol';
    const ileri = yon === 'sag' || yon === 'alt';
    const P = yatay ? YUKSEKLIK : GENISLIK;
    const A = yatay ? GENISLIK : YUKSEKLIK;
    const say = new Int32Array(P);
    const en = new Int32Array(P).fill(A);
    const ek = new Int32Array(P).fill(-1);
    for (const c of liste) {
      if (temiz[c]) continue;
      const x = c % GENISLIK;
      const y = (c - x) / GENISLIK;
      const perp = yatay ? y : x;
      const boyunca = yatay ? x : y;
      say[perp]++;
      if (boyunca < en[perp]) en[perp] = boyunca;
      if (boyunca > ek[perp]) ek[perp] = boyunca;
    }
    for (let m = 0; m < P; m++) {
      let toplam = 0;
      let mn = A;
      let mx = -1;
      for (let p = Math.max(0, m - SERIT_YARI); p <= Math.min(P - 1, m + SERIT_YARI); p++) {
        toplam += say[p];
        mn = Math.min(mn, en[p]);
        mx = Math.max(mx, ek[p]);
      }
      if (toplam < MIN_SERIT_ADAY) continue;
      const bas = ileri ? Math.max(0, mn - TIRMIK_YARICAP) : Math.min(A - 1, mx + TIRMIK_YARICAP);
      const son = ileri ? A - 1 : 0;
      const a = yatay ? { x: bas, y: m } : { x: m, y: bas };
      const b = yatay ? { x: son, y: m } : { x: m, y: son };
      const maliyet = (Math.hypot(a.x - konum.x, a.y - konum.y) + Math.abs(son - bas)) / hiz + 15;
      const puan = toplam / maliyet;
      if (!eniyi || puan > eniyi.puan) eniyi = { a, b, say: toplam, puan, yatay, m, bas, son };
    }
  }
  return eniyi;
}

/** Şeridin süpürdüğü olası hücreleri `temiz` olarak işaretler. */
export function seridiIsaretle(liste, temiz, serit) {
  const alt = Math.min(serit.bas, serit.son) - TIRMIK_YARICAP;
  const ust = Math.max(serit.bas, serit.son) + TIRMIK_YARICAP;
  for (const c of liste) {
    const x = c % GENISLIK;
    const y = (c - x) / GENISLIK;
    const perp = serit.yatay ? y : x;
    const boyunca = serit.yatay ? x : y;
    if (Math.abs(perp - serit.m) <= SERIT_YARI && boyunca >= alt && boyunca <= ust) temiz[c] = 1;
  }
}
