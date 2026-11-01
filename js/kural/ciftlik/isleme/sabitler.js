/**
 * İşleme ailesinin ortak sabitleri ve sapları (parcalar/isleme.js ve isleme/kiyici-gubre.js):
 * denge sayıları (ISLEME: denge.js PARCA_SABIT'ten), eşya kodları, rozet yardımcıları.
 * Hava dunya/hava.js havaAl'dan okunur (testler havaSabitle ile sabitler).
 * Gübre → çayır: dunya/zemin.js gubrele (parça merkezinin karosundan menzil karo).
 */
import { esyaKodu } from '../esya.js';
import { havaAl } from '../dunya/hava.js';
import { gubrele as zeminGubrele } from '../dunya/zemin.js';
import { ONARIM, parcaSabiti } from '../ekonomi/denge.js';
import { ozellik } from './esya-ozellik.js';

/** Denge sayıları (tek kaynak ekonomi/denge.js PARCA_SABIT; kısa adlarla). */
export const ISLEME = Object.freeze({
  savurucu: parcaSabiti('ot-savurucu'),
  kurutma: parcaSabiti('kurutma-ambari'),
  pres: parcaSabiti('balya-presi'),
  kiyici: Object.freeze({ ...parcaSabiti('cekicli-kiyici'), onarKurus: ONARIM.kiyici }),
  gubre: parcaSabiti('gubre-cukuru'),
});
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
/** Parçanın çevresindeki çayırı gübreler; gübrelenen çayır karosu sayısı. */
export const gubrele = (ctx, p, menzil, sure) => zeminGubrele(ctx.c, p.x + (p.en >> 1),
  p.y + (p.boy >> 1), menzil, sure);
