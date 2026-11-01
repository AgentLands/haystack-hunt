/**
 * Mantık ailesi (docs/ciftlik/parcalar.md 27-30, sistemler.md §2): rüzgâr gülü (yazar),
 * savak kapağı (okur), kantar (yazar), kile sayacı (yazar + okur). Parçalar renk kanalına
 * ag/sinyal.js üzerinden bağlanır; tel yok, kanal çiftlik geneli, bir tik gecikme.
 *
 * Savak ve kile bir hat karosu gibi görünür ama PORTLU parçadır (arka giriş, ön çıkış, tek
 * eşyalık tampon): hat.etkin bütün hattı (32 karoya kadar) durdurur, kapı ise yalnız kendi
 * önündeki akışı kesmeli. Kapalıyken kabulEder false → arkadaki hat geri basınçla durur.
 *
 * Ayarlar: tanım `ayarlar` şemasıyla; `ag/ayar.js` `ayarUygula(p, ad, deger)` doğrular ve
 * p.ozel'e yazar ('ayar' komutu bunu çağırır). ozel yalnız JSON'lanabilir veri taşır.
 *
 * Hava dunya/hava.js'ten (dilimHavasi; testler havaSabitle). Kantar depo doluluğunu
 * `tanim.doluluk(p)` → { n, kap } ile okur (sandık, ambar, kurutma, gübre, volan, mıknatıs).
 * Sabitler: MANTIK (sayılar denge.js PARCA_SABIT).
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaTanimi } from '../esya.js';
import { DX, DY } from '../olcu.js';
import { parcaAt } from '../izgara.js';
import { renkAdi } from '../ag/ayar.js';
import { dilimHavasi, DILIM_TIK } from '../dunya/hava.js';
import { parcaSabiti } from '../ekonomi/denge.js';

/** Mantık sabitleri (sayılar ekonomi/denge.js PARCA_SABIT'ten; hava dilimi dunya/hava.js). */
export const MANTIK = Object.freeze({
  dilimTik: DILIM_TIK,
  darbeTik: parcaSabiti('kile-sayaci').darbeTik, // "darbe" kipinde yazma süresi
  kileN: parcaSabiti('kile-sayaci').n,
  kantarEsik: parcaSabiti('kantar').esik,
  ruzgarEsik: parcaSabiti('ruzgar-gulu').esik,
  dikSiddet: parcaSabiti('ruzgar-gulu').dikSiddet, // "dik esiyor" kipinin en az şiddeti
});

/** Deponun { n, kap } doluluğu (tanim.doluluk); depo değilse null. */
export function dolulukOku(p) {
  return p.tanim.doluluk ? p.tanim.doluluk(p) : null;
}

// --- Geçit (savak ve kile): arka giriş, ön çıkış, tek eşyalık tampon ---
const GECIT = {
  boyut: [1, 1], yurunur: true, girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 0, y: 0, yon: 0 }],
  kabulEder: (p) => !p.ozel.kapali && p.ozel.tampon.length < 1,
  icerik: (p) => ({ esya: p.ozel.tampon.map((kod) => [kod, 1]), saman: 0 }),
  durum: (p) => (p.ozel.kapali ? 'kapali' : 'calisiyor'),
};

/** Tampondaki eşyayı çıkışa verir (kapı kapansa da geçmiş eşya akar). */
function gecitIlet(ctx, p) {
  const t = p.ozel.tampon;
  if (t.length && ctx.ver(p, 0, t[0])) t.shift();
}

// --- 27 Rüzgâr gülü ---
const ruzgarKosulu = (o, yon, h) => (o.kip === 'dik'
  ? (h.yon & 1) !== (yon & 1) && h.siddet >= MANTIK.dikSiddet
  : h.siddet >= o.esik);

parcaTanimla('ruzgar-gulu', {
  kod: 27, ad: 'Rüzgâr gülü', aile: 'mantik', boyut: [1, 1], maliyet: { kurus: 40 },
  kilit: 'D8',
  ayarlar: {
    renk: { tur: 'renk' },
    kip: { tur: 'iki', secenekler: ['dik', 'siddet'], degisti: (p) => { p.ozel.dilim = -1; } },
    esik: { tur: 'secim', secenekler: MANTIK.ruzgarEsik, degisti: (p) => { p.ozel.dilim = -1; } },
  },
  kur(p) {
    Object.assign(p.ozel, { renk: 0, kip: 'dik', esik: 2, yaz: 0, dilim: -1, tahmin: [] });
  },
  adim(ctx, p) {
    const o = p.ozel;
    const dilim = Math.floor(ctx.tik / MANTIK.dilimTik);
    const simdi = dilimHavasi(ctx.c, dilim);
    if (o.dilim !== dilim) { // tahmin panelde: şimdiki + sonraki 3 dilim
      o.dilim = dilim;
      o.tahmin = [0, 1, 2, 3].map((k) => {
        const h = k ? dilimHavasi(ctx.c, dilim + k) : simdi;
        return [h.yon, h.siddet, ruzgarKosulu(o, p.yon, h) ? 1 : 0];
      });
    }
    ctx.sinyalYaz(p, ruzgarKosulu(o, p.yon, simdi));
  },
  durum: () => 'calisiyor',
  incele(p) {
    const o = p.ozel;
    const satirlar = [['Kanal', renkAdi(o.renk)],
      ['Ayar', o.kip === 'dik' ? 'dik esiyor (şiddet ≥ 2)' : `şiddet ≥ ${o.esik}`],
      ['Sinyal', o.yaz ? 'yazıyor' : 'yazmıyor']];
    o.tahmin.slice(1).forEach(([yon, siddet, k], i) => {
      satirlar.push([`+${i + 1} dilim`, `yön ${yon}, şiddet ${siddet}${k ? ', yazar' : ''}`]);
    });
    return satirlar;
  },
});

// --- 28 Savak kapağı ---
parcaTanimla('savak-kapagi', {
  ...GECIT, kod: 28, ad: 'Savak kapağı', aile: 'mantik', maliyet: { kurus: 25 }, kilit: 'D8',
  ayarlar: { renk: { tur: 'renk' }, kip: { tur: 'iki', secenekler: ['kapan', 'acil'] } },
  kur(p) {
    Object.assign(p.ozel, { renk: 0, kip: 'kapan', kapali: 0, tampon: [] });
  },
  al(p, port, kod) {
    p.ozel.tampon.push(kod);
  },
  adim(ctx, p) {
    const o = p.ozel;
    const sinyal = ctx.sinyalOku(o.renk) > 0;
    o.kapali = (o.kip === 'kapan') === sinyal ? 1 : 0;
    gecitIlet(ctx, p);
  },
  incele(p) {
    const o = p.ozel;
    return [['Kapı', o.kapali ? 'kapalı' : 'açık'], ['Kanal', renkAdi(o.renk)],
      ['Ayar', o.kip === 'kapan' ? 'sinyalde kapan' : 'sinyalde açıl']];
  },
});

// --- 29 Kantar ---
/** Komşu ilk depo (doğu, güney, batı, kuzey sırasıyla); { n, kap, ad } ya da null. */
function komsuDepo(c, p) {
  for (let yon = 0; yon < 4; yon++) {
    const q = parcaAt(c, p.x + DX[yon], p.y + DY[yon]);
    const d = q && dolulukOku(q);
    if (d) return { ...d, ad: q.tanim.ad };
  }
  return null;
}

/** Doluluk eşiğe göre koşulu sağlıyor mu (tam sayı karşılaştırma; kap 0 → %0). */
function kantarKosulu(o, d) {
  const pay = d.kap > 0 ? d.n : 0;
  const payda = d.kap > 0 ? d.kap : 1;
  return o.kip === 'ge' ? pay * 100 >= o.esik * payda : pay * 100 < o.esik * payda;
}

parcaTanimla('kantar', {
  kod: 29, ad: 'Kantar', aile: 'mantik', boyut: [1, 1], yonlu: false,
  maliyet: { kurus: 40 }, kilit: 'D8',
  ayarlar: {
    renk: { tur: 'renk' },
    esik: { tur: 'secim', secenekler: MANTIK.kantarEsik },
    kip: { tur: 'iki', secenekler: ['ge', 'lt'] },
  },
  kur(p) {
    Object.assign(p.ozel, { renk: 0, esik: 50, kip: 'ge', yaz: 0, depo: '', yuzde: 0 });
  },
  adim(ctx, p) {
    const o = p.ozel;
    const d = komsuDepo(ctx.c, p);
    o.depo = d ? d.ad : '';
    o.yuzde = d && d.kap > 0 ? Math.floor((d.n * 100) / d.kap) : 0;
    ctx.sinyalYaz(p, Boolean(d) && kantarKosulu(o, d));
  },
  durum: (p) => (p.ozel.depo ? 'calisiyor' : 'girdi-yok'),
  incele(p) {
    const o = p.ozel;
    return [['Komşu depo', o.depo || 'yok (yanına depo koy)'], ['Doluluk', `%${o.yuzde}`],
      ['Koşul', `${o.kip === 'ge' ? '≥' : '<'} %${o.esik}`], ['Kanal', renkAdi(o.renk)],
      ['Sinyal', o.yaz ? 'yazıyor' : 'yazmıyor']];
  },
});

// --- 30 Kile sayacı ---
function filtreUyar(f, kod) {
  if (f.tur === 'esya') return f.kod === kod;
  if (f.tur === 'sinif') return esyaTanimi(kod)?.sinif === f.sinif;
  return true;
}

function sifirla(p) {
  Object.assign(p.ozel, { say: 0, kapali: 0, darbe: 0 });
}

/**
 * Sayaç N'e göre: kile kipinde kapı (say ≥ n) kapanır, değilse açılır; darbe kipinde sayaç
 * sıfırlanıp darbe başlar.
 */
function kileTamam(p, ctx) {
  const o = p.ozel;
  if (o.kip === 'kile') {
    const dolu = o.say >= o.n ? 1 : 0;
    if (dolu && !o.kapali) ctx?.olay('kile-doldu', { parca: p });
    o.kapali = dolu;
  } else if (o.say >= o.n) {
    o.say = 0;
    o.darbe = MANTIK.darbeTik;
  }
}

parcaTanimla('kile-sayaci', {
  ...GECIT, kod: 30, ad: 'Kile sayacı', aile: 'mantik', maliyet: { kurus: 40 }, kilit: 'D8',
  ayarlar: {
    renk: { tur: 'renk' },
    sifirRenk: { tur: 'renk', yok: true },
    kip: { tur: 'iki', secenekler: ['kile', 'darbe'], degisti: sifirla },
    n: { tur: 'secim', secenekler: MANTIK.kileN, degisti: (p) => kileTamam(p) },
    filtre: { tur: 'filtre' },
    sifirla: { tur: 'eylem', uygula: sifirla },
  },
  kur(p) {
    Object.assign(p.ozel, {
      renk: 0, sifirRenk: -1, kip: 'kile', n: 10, filtre: { tur: 'hepsi' }, say: 0, kapali: 0,
      darbe: 0, yaz: 0, tampon: [],
    });
  },
  al(p, port, kod, ctx) {
    const o = p.ozel;
    o.tampon.push(kod);
    if (filtreUyar(o.filtre, kod)) {
      o.say += 1;
      kileTamam(p, ctx);
    }
  },
  adim(ctx, p) {
    const o = p.ozel;
    if (o.kip === 'kile' && o.sifirRenk >= 0 && ctx.sinyalOku(o.sifirRenk) > 0) sifirla(p);
    gecitIlet(ctx, p);
    let yaz = o.kip === 'kile' && o.kapali === 1;
    if (o.kip === 'darbe' && o.darbe > 0) {
      yaz = true;
      o.darbe -= 1;
    }
    ctx.sinyalYaz(p, yaz);
  },
  incele(p) {
    const o = p.ozel;
    const f = o.filtre;
    const sayilan = { hepsi: 'hepsi', sinif: f.sinif, esya: esyaTanimi(f.kod)?.ad }[f.tur];
    const kip = o.kip === 'kile' ? 'kile (dolunca kapanır)' : 'darbe';
    return [['Sayaç', `${o.say}/${o.n}`], ['Kip', kip], ['Sayılan', sayilan],
      ['Yazma rengi', renkAdi(o.renk)],
      ['Sıfırlama rengi', renkAdi(o.sifirRenk)], ['Kapı', o.kapali ? 'kapalı' : 'açık']];
  },
});
