/**
 * Dünya testlerinin yardımcıları: gerçek çiftlik arazisi (oyun-ciftlik.js'in kurduğu gibi:
 * çiftlik tarlası, garaj, arazi, gömülü nesneler), öğretici huni hattı ve iğne/buluntu sayımı.
 */
import { metindenTohum } from '../js/kural/rastgele.js';
import { garajKur, IKMAL_YARICAP } from '../js/kural/makineler/garaj.js';
import '../js/kural/makineler/hepsi.js';
import { ciftlikKur } from '../js/kural/ciftlik/benzetim.js';
import { parcaIcerigi, parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli } from '../js/kural/ciftlik/izgara.js';
import { esyaTanimi } from '../js/kural/ciftlik/esya.js';
import { ciftlikTarlasi, araziKur, araziBagla } from '../js/kural/ciftlik/dunya/arazi.js';
import { gomuluYerlestir } from '../js/kural/ciftlik/dunya/gomulu.js';
import { ogreticiHuniYeri } from '../js/kural/ciftlik/dunya/ogretici.js';
import { kur } from './ciftlik-yardim.mjs';

export const ETIKETLER = ['ciftlik', 'dunya-2', 'harman-3'];

/** Gerçek arazili dünya: { c, tarla, garaj, yasak }. */
export function gercekDunya(etiket = 'ciftlik') {
  const tarla = ciftlikTarlasi(metindenTohum(etiket));
  const { garaj } = garajKur(tarla, 'normal');
  const yasak = { x: garaj.x, y: garaj.y, r: IKMAL_YARICAP + garaj.en / 2 + 2 };
  const tohum = metindenTohum(`ciftlik:${etiket}`);
  const arazi = araziKur(tarla, garaj, yasak, tohum);
  const gomulu = gomuluYerlestir(tarla, arazi, tohum);
  const c = ciftlikKur(tohum, { gomulu, yasak: [yasak] });
  araziBagla(c, arazi);
  return { c, tarla, garaj, yasak };
}

/**
 * Öğretici hayaletine huni ve çıkışına sandık (oraya kurulamazsa 1-3 bant + sandık).
 * Dönüş { huni, sandik }.
 */
export function ogreticiHatti(c, tarla) {
  const yer = ogreticiHuniYeri(c, tarla);
  if (!yer) throw new Error('öğretici huni yeri yok');
  const huni = kur(c, tarla, 'huni', yer.x, yer.y, yer.yon);
  const { hx, hy, yon } = huni.cikis[0];
  const dx = [1, 0, -1, 0][yon];
  const dy = [0, 1, 0, -1][yon];
  const bos = (ad, x, y) => !yerlestirmeEngeli(c, tarla, parcaTanimi(ad), x, y, yon);
  let n = 0;
  while (n < 3 && !bos('sandik', hx + dx * n, hy + dy * n)) n += 1;
  for (let i = 0; i < n; i++) kur(c, tarla, 'bant', hx + dx * i, hy + dy * i, yon);
  return { huni, sandik: kur(c, tarla, 'sandik', hx + dx * n, hy + dy * n) };
}

const sayilir = (kod) => {
  const t = esyaTanimi(kod);
  return Boolean(t && (t.buluntu || ['igne', 'cuvaldiz', 'altin-igne'].includes(t.anahtar)));
};

/**
 * Dünyadaki iğne ailesi + buluntu sayısı: tarladaki (alınmamış) gömülüler + parça içerikleri
 * + hat eşyaları + envanter. Hiçbir yolla değişmemeli (yalnız araba/öğretici ekler).
 */
export function degerliSay(c) {
  let n = c.gomulu.filter((g) => !g.alindi && sayilir(g.esya)).length;
  for (const p of c.parcalar.values()) {
    for (const [kod, adet] of parcaIcerigi(p).esya) if (sayilir(kod)) n += adet;
  }
  for (const h of c.hatlar) for (let k = 0; k < h.n; k++) if (sayilir(h.tur[k])) n += 1;
  c.envanter.forEach((adet, kod) => { if (sayilir(kod)) n += adet; });
  return n;
}

/**
 * Parça adim'ını benzetimsiz sürmek için el yapımı ctx (enerji şebekesi kurmadan tam güç):
 * oran sabit, ver her zaman reddeder (çıkış tamponu dolar), olaylar `olaylar` dizisine.
 */
export function elleCtx(c, tarla, oran = 1024) {
  const olaylar = [];
  return {
    c, tarla, zar: c.zar, olaylar, oran: () => oran, ver: () => false,
    olay: (ad, veri) => olaylar.push({ ad, veri }), sayac() {},
    get tik() {
      return c.tik;
    },
  };
}

/** Parçayı n tik elle sürer (c.tik ilerler, saman kayması yok). */
export function elleSur(ctx, p, n) {
  for (let i = 0; i < n; i++) {
    p.tanim.adim(ctx, p);
    ctx.c.tik += 1;
  }
}
