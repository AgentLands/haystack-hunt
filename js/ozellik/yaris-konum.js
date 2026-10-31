/**
 * Yarış konum iletisi (saf, DOM yok): yerel çiftçinin durumundan 'imlec' iletisini kurar ve
 * gelen konumlar için gecikmeli doğrusal ara değerleme yapar. Gönderen yalnız değişince ve
 * ~8 Hz yollar; alıcı iki anlık arasını GECIKME ms geriden okur, böylece hareket akıcı kalır.
 * İleti biçimi: sunucu/PROTOKOL.md.
 */
import { GENISLIK, YUKSEKLIK } from '../kural/boyut.js';

/** Konum gönderim aralığı (ms): ~8 Hz. */
export const GONDERIM_ARALIGI = 125;
/** Alıcı çizimin gerisinde kaldığı süre (ms); en az bir gönderim aralığı kadar olmalı. */
export const GECIKME = 120;
/** Bu kadar ms sessizlikten sonra gelen konuma "kayarak" gidilmez (durup sonra yürür). */
export const BOSLUK = 220;
const MAKS_ANLIK = 16;

const yuvarla = (n) => Math.round(n * 100) / 100;
const sinirla = (n, cok) => Math.max(0, Math.min(cok, Number.isFinite(n) ? n : 0));
/** Açıyı (-π, π] aralığına sarar. */
const sar = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Yerel durumdan sunucuya gidecek konum iletisi (durum.karakter yoksa null). */
export function konumIletisi(durum) {
  const k = durum.karakter;
  if (!k) return null;
  const m = k.makine;
  return {
    t: 'imlec',
    x: yuvarla(sinirla(k.x, GENISLIK)),
    y: yuvarla(sinirla(k.y, YUKSEKLIK)),
    yon: yuvarla(sar(k.yon || 0)),
    hareketli: Boolean(k.hareketli),
    kullan: Boolean(k.kullaniyor),
    arac: durum.arac,
    makine: m
      ? { tur: m.tur, yon: yuvarla(sar(m.yon || 0)), yuk: yuvarla(sinirla(m.yuk || 0, 1)) }
      : null,
    saman: Math.round(durum.tarla.kaldirilan),
  };
}

/** İki açı arasında en kısa yoldan ara değer. */
export function aciAra(a, b, u) {
  return a + sar(b - a) * u;
}

const ara = (a, b, u) => a + (b - a) * u;

/**
 * Gelen iletiyi `gecmis` dizisine (zamana göre artan) ekler. Uzun sessizlikten sonra gelen
 * konumdan hemen önce eski konumu bir "bekleme" anlığı olarak koyar; yoksa oyuncu o süre
 * boyunca yeni yere doğru yavaşça kayardı.
 */
export function anlikEkle(gecmis, ileti, t) {
  const son = gecmis.at(-1);
  if (son && t - son.t > BOSLUK) gecmis.push({ ...son, t: t - GONDERIM_ARALIGI, hareketli: false });
  gecmis.push({
    t, x: ileti.x, y: ileti.y, yon: ileti.yon ?? 0, hareketli: Boolean(ileti.hareketli),
    kullan: Boolean(ileti.kullan), arac: ileti.arac ?? 'el', makine: ileti.makine ?? null,
  });
  while (gecmis.length > MAKS_ANLIK) gecmis.shift();
}

/** `t` anındaki konum durumu (anlıklar arasında ara değer; uçlarda en yakın anlık). */
export function ornekle(gecmis, t) {
  if (!gecmis.length) return null;
  if (t <= gecmis[0].t) return gecmis[0];
  const son = gecmis.at(-1);
  if (t >= son.t) return son;
  let i = gecmis.length - 2;
  while (gecmis[i].t > t) i--;
  const a = gecmis[i];
  const b = gecmis[i + 1];
  const u = (t - a.t) / (b.t - a.t);
  const makine = b.makine
    ? {
      ...b.makine,
      yon: aciAra(a.makine?.yon ?? b.makine.yon, b.makine.yon, u),
      yuk: ara(a.makine?.yuk ?? b.makine.yuk ?? 0, b.makine.yuk ?? 0, u),
    }
    : null;
  return {
    ...b,
    x: ara(a.x, b.x, u),
    y: ara(a.y, b.y, u),
    yon: aciAra(a.yon, b.yon, u),
    hareketli: a.hareketli || b.hareketli,
    makine,
  };
}
