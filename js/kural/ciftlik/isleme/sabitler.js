/**
 * İşleme ailesinin ortak sabitleri ve sapları (parcalar/isleme.js ve isleme/kiyici-gubre.js):
 * denge sayıları (ISLEME; G denge.js'e taşıyabilir), eşya kodları, rozet yardımcıları.
 * SAP (D dünya): hava `havaKaynagiKur(islev(ctx) → { gok, siddet })` (varsayılan sabit güneş,
 * rüzgâr 2), gübre → çayır `gubreKaynagiKur(islev(ctx, p, menzil, sure) → karo sayısı)`
 * (varsayılan -1: çayır katmanı yok, yalnız sayılır).
 */
import { esyaKodu, esyaTanimi } from '../esya.js';
import { ozellik } from './esya-ozellik.js';

/** Denge sayıları (parcalar.md; tik ve bg). */
export const ISLEME = {
  savurucu: { kap: 9, puan: 1200, gunes: 5, gunesRuzgar: 6, bulut: 3, guc: 3 },
  kurutma: { yuva: 24, sure: 600, guc: 8 },
  pres: { kalip: 8, dolum: 7, basma: 40, gucDolum: 4, gucBasma: 30 },
  kiyici: { sure: 10, guc: 12, onarKurus: 50, onarTik: 200 },
  gubre: { kap: 120, aralik: 2400, esik: 20, menzil: 8, sure: 2400 },
};
export const YAS = esyaKodu('yas-ot');
export const KURU = esyaKodu('kuru-ot');
export const SAMAN = esyaKodu('saman');
export const KIYIM = esyaKodu('kiyim');
export const PRES_KABUL = new Set([SAMAN, KURU, esyaKodu('toz'), KIYIM]);
export const GUBRE_PUAN = new Map([['toz', 1], ['curuk-ot', 2], ['balya-karisik', 8]]
  .map(([ad, n]) => [esyaKodu(ad), n]));
export const sert = (kod) => ozellik(kod).sert;
export const ad = (kod) => esyaTanimi(kod)?.ad ?? `#${kod}`;
/** Girişte bekleyen kabul edilmemiş eşyanın rozeti: nemli ya da yabancı. */
export const redRozeti = (kod) => (ozellik(kod).nem ? 'nemli' : 'yabanci');

/** SAP (D hava): { gok: 'gunes' | 'bulut' | 'yagmur', siddet: 0..3 }; sabit güneş, rüzgâr 2. */
let havaKaynagi = () => ({ gok: 'gunes', siddet: 2 });
export function havaKaynagiKur(islev) {
  havaKaynagi = islev;
}
export const havaOku = (ctx) => havaKaynagi(ctx);
/** SAP (D arazi): gübrele(ctx, p, menzil, sure) → gübrelenen çayır karosu sayısı (-1: yok). */
let gubreKaynagi = () => -1;
export function gubreKaynagiKur(islev) {
  gubreKaynagi = islev;
}
export const gubrele = (ctx, p, menzil, sure) => gubreKaynagi(ctx, p, menzil, sure);
