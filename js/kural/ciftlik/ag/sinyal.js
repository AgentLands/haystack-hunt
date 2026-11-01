/**
 * Sinyal ağı: 6 renk kanalı (kırmızı, çivit, sarı, yeşil, mor, beyaz), kablo yok. Kanal
 * çiftliğin tamamında geçerlidir; değeri = o tik 1 yazan yazıcı sayısı, okuyucu `> 0` ise
 * "açık" sayar (docs/ciftlik/sistemler.md §2).
 *
 * ÇİFT TAMPON, BİR TİK GECİKME: tik t'de yazılan sinyal t+1'de okunur (parça sırasından
 * bağımsız; döngüde salınım belirlidir). Aşama sırası 30: her tik başında `okunan` önceki
 * tikin `yazilan`'ı olur, `yazilan` sıfırlanır; parçalar adim'larında okunan'ı okur,
 * yazilan'a yazar.
 *
 * KAYIT: ağ durumu kayda girmez, parçalardan türer. Yazıcı parça `p.ozel.yaz`'da bu tik
 * yazdığı rengi (renk + 1; 0 = yazmadı) saklar; yenidenKur (yükleme dahil) `yazilan`'ı bu
 * bayraklardan kurar. Böylece kaydet → yükle → sürdür kesintisiz koşuyla bit bit aynıdır.
 *
 * Parça sözleşmesi: yazıcı p.ozel.renk (0..5) taşır ve adim'ında `ctx.sinyalYaz(p, acik)`
 * çağırır (her tik, yazmasa da: bayrağı sıfırlar). Okuyucu `ctx.sinyalOku(renk)` ile okur.
 * Olay: 'sinyal-degisti' { renk, deger } (okunan değer değişince; saniyede çok olabilir
 * ama kanal başına yalnız değişimde).
 */
import { asamaTanimla, ctxGenislet } from '../benzetim.js';

export const RENK_SAYISI = 6;
export const RENKLER = ['kirmizi', 'civit', 'sari', 'yesil', 'mor', 'beyaz'];
export const RENK_ADLARI = ['Kırmızı', 'Çivit', 'Sarı', 'Yeşil', 'Mor', 'Beyaz'];
/** Aşama sırası (benzetim.js tik sırası: 30 = sinyal, parça adim'larından önce). */
export const SINYAL_SIRA = 30;

/** Dünyanın sinyal durumu (tembel kurulur; kayda girmez). */
function ag(c) {
  c.sinyal ??= { okunan: new Int32Array(RENK_SAYISI), yazilan: new Int32Array(RENK_SAYISI) };
  return c.sinyal;
}

/** Kanalın bu tik okunan değeri (0 = kapalı); geçersiz renk (-1: "yok") 0 verir. */
export function sinyalOku(c, renk) {
  return ag(c).okunan[renk] ?? 0;
}

/**
 * Yazıcı p bu tik `acik` ise p.ozel.renk kanalına 1 yazar (sonraki tikte okunur); bayrağı
 * p.ozel.yaz'a işler (kayıt için).
 */
export function sinyalYaz(c, p, acik) {
  const o = p.ozel;
  if (!acik) {
    o.yaz = 0;
    return;
  }
  o.yaz = o.renk + 1;
  ag(c).yazilan[o.renk] += 1;
}

/** Bütün kanalların okunan değerleri (arayüz lambaları için kopya). */
export function sinyalDegerleri(c) {
  return [...ag(c).okunan];
}

asamaTanimla('sinyal', SINYAL_SIRA, {
  adim(ctx) {
    const a = ag(ctx.c);
    for (let r = 0; r < RENK_SAYISI; r++) {
      const deger = a.yazilan[r];
      if (a.okunan[r] !== deger) ctx.olay('sinyal-degisti', { renk: r, deger });
    }
    a.okunan.set(a.yazilan);
    a.yazilan.fill(0);
  },
  yenidenKur(c) {
    const a = ag(c);
    a.yazilan.fill(0);
    for (const p of c.parcalar.values()) {
      if (p.etkin && p.ozel.yaz > 0) a.yazilan[p.ozel.yaz - 1] += 1;
    }
  },
});

ctxGenislet((ctx) => {
  ctx.sinyalOku = (renk) => sinyalOku(ctx.c, renk);
  ctx.sinyalYaz = (p, acik) => sinyalYaz(ctx.c, p, acik);
});
