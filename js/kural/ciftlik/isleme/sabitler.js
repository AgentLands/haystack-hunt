/**
 * İşleme ailesinin ortak sabitleri ve sapları (parcalar/isleme.js ve isleme/kiyici-gubre.js):
 * denge sayıları (ISLEME; G denge.js'e taşıyabilir), eşya kodları, rozet yardımcıları.
 * Hava enerji ağının kaynağından okunur (ag/enerji.js havaAl; D bağlayınca gerçek hava).
 * SAP (D dünya): gübre → çayır `gubreKaynagiKur(islev(ctx, p, menzil, sure) → karo sayısı)`
 * (varsayılan -1: çayır katmanı yok, yalnız sayılır). D: dunya/arazi.js gubrele(c, kx, ky, r,
 * sure) ile tek satırda bağlanır.
 */
import { esyaKodu } from '../esya.js';
import { havaAl } from '../ag/enerji.js';
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
/** Girişte bekleyen kabul edilmemiş eşyanın rozeti: nemli ya da yabancı. */
export const redRozeti = (kod) => (ozellik(kod).nem ? 'nemli' : 'yabanci');

/** Bu tikteki hava: { gok: 'gunes' | 'bulut' | 'yagmur', siddet: 0..3 } (dunya/hava.js). */
export const havaOku = (ctx) => havaAl(ctx.c, ctx.tik);
/** SAP (D arazi): gübrele(ctx, p, menzil, sure) → gübrelenen çayır karosu sayısı (-1: yok). */
let gubreKaynagi = () => -1;
export function gubreKaynagiKur(islev) {
  gubreKaynagi = islev;
}
export const gubrele = (ctx, p, menzil, sure) => gubreKaynagi(ctx, p, menzil, sure);
