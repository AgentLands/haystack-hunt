/**
 * Çiftlik parça önizlemesinin sahte verisi: 30 parçanın anahtarı, boyutu, yönlülüğü, portları
 * (docs/ciftlik/parcalar.md P satırları, yön 0) ve dört durum için p.ozel / durum kodu / oran.
 * Kural tanımları gelince bu tablo yalnız önizleme içindir; oyun gerçek parçaları kullanır.
 * Durumlar: calisiyor (tam güç), duruyor (girdi yok), gucsuz (güç yok, oran 0), dolu.
 * `adim(o, tik, hal)` zamanla değişen alanları (pres, yaba, damga) önizlemede canlandırır.
 */

const G = (x, y, yon) => ({ x, y, yon });
const sayac = (h, dolu, orta) => (h === 'dolu' ? dolu : h === 'calisiyor' ? orta : 0);

/** [anahtar, [en, boy], yonlu, { girisler, cikislar, hat, ozel(h), durum?(h), adim? }] */
export const PARCALAR = [
  ['huni', [2, 2], true, {
    cikislar: [G(0, 0, 2)], ozel: (h) => ({ son: h === 'calisiyor' ? 2 : 0 }),
  }],
  ['tirmik-kolu', [1, 1], true, {}],
  ['tas-toplayici', [2, 2], true, {
    cikislar: [G(1, 0, 0)], ozel: (h) => ({ tampon: sayac(h, 4, 2) }),
  }],
  ['menfez', [1, 1], true, { hat: true, girisler: [G(0, 0, 2)], ozel: () => ({ uc: 'giris' }) }],
  ['menfez', [1, 1], true, { hat: true, cikislar: [G(0, 0, 0)], ozel: () => ({ uc: 'cikis' }) }],
  ['catal', [1, 1], true, {
    hat: true, girisler: [G(0, 0, 2)], cikislar: [G(0, 0, 3), G(0, 0, 0), G(0, 0, 1)],
    ozel: () => ({ sira: 0 }), adim: (o, tik) => { o.sira = Math.floor(tik / 6) % 3; },
  }],
  ['birlestirme-olugu', [1, 1], true, {
    hat: true, girisler: [G(0, 0, 2), G(0, 0, 3), G(0, 0, 1)], cikislar: [G(0, 0, 0)],
    ozel: () => ({ sira: 0 }), adim: (o, tik) => { o.sira = Math.floor(tik / 6) % 3; },
  }],
  ['oluk-miknatisi', [1, 1], true, { hat: true, ozel: (h) => ({ tutucu: sayac(h, 6, 3) }) }],
  ['miknatisli-tambur', [2, 1], true, {
    girisler: [G(0, 0, 2)], cikislar: [G(1, 0, 0), G(1, 0, 1)],
  }],
  ['kalbur', [2, 1], true, {
    girisler: [G(0, 0, 2)], cikislar: [G(1, 0, 0), G(1, 0, 1)],
    ozel: (h) => ({ siva: h === 'dolu' ? 5 : 0 }), durum: (h) => (h === 'dolu' ? 'sivali' : null),
  }],
  ['tinaz', [3, 3], true, {
    girisler: [G(0, 1, 2)], cikislar: [G(2, 1, 0), G(1, 0, 3), G(1, 2, 1)],
  }],
  ['seytan-yeli', [2, 2], true, {
    girisler: [G(0, 0, 2)], cikislar: [G(1, 0, 0), G(1, 0, 3), G(1, 1, 1)],
  }],
  ['ot-savurucu', [3, 1], true, { girisler: [G(0, 0, 2)], cikislar: [G(2, 0, 0)] }],
  ['kurutma-ambari', [3, 3], true, {
    girisler: [G(0, 1, 2)], cikislar: [G(2, 1, 0)], ozel: (h) => ({ yuva: sayac(h, 24, 10) }),
  }],
  ['balya-presi', [3, 2], true, {
    girisler: [G(0, 0, 2)], cikislar: [G(2, 0, 0)],
    ozel: (h) => ({ dolum: sayac(h, 8, 3), basma: 0 }),
    adim: (o, tik, h) => {
      if (h !== 'calisiyor') return;
      const t = tik % 96;
      o.dolum = t < 56 ? Math.floor(t / 7) : 8;
      o.basma = t < 56 ? 0 : 96 - t;
    },
  }],
  ['cekicli-kiyici', [2, 2], true, {
    girisler: [G(0, 0, 2)], cikislar: [G(1, 0, 0)], durum: (h) => (h === 'dolu' ? 'kirik' : null),
  }],
  ['gubre-cukuru', [2, 2], false, { ozel: (h) => ({ puan: sayac(h, 120, 55) }) }],
  ['sandik', [1, 1], false, {
    ozel: (h) => ({ say: { 1: sayac(h, 400, 180) }, toplam: sayac(h, 400, 180) }),
  }],
  ['ambar', [3, 3], false, {
    ozel: (h) => ({ toplam: sayac(h, 600, 260), curuk: h === 'dolu' ? 40 : 0 }),
  }],
  ['defter-masasi', [2, 1], true, {
    girisler: [G(0, 0, 2), G(0, 0, 3), G(0, 0, 1)], ozel: () => ({ son: -999 }),
    adim: (o, tik, h) => { if (h === 'calisiyor') o.son = tik - (tik % 40); },
  }],
  ['yaba-kolu', [1, 1], true, {
    ozel: () => ({ faz: 0, tasinan: 0 }),
    adim: (o, tik, h) => {
      if (h !== 'calisiyor') return;
      o.faz = tik % 16;
      o.tasinan = o.faz < 8 ? 2 : 0;
    },
  }],
  ['komsu-kapisi', [2, 2], false, {
    ozel: () => ({ son: -999 }),
    adim: (o, tik, h) => { if (h === 'calisiyor') o.son = tik - (tik % 30); },
  }],
  ['el-kranki', [1, 1], false, {}],
  ['yel-degirmeni', [2, 2], false, {}],
  ['lokomobil', [3, 2], true, {
    girisler: [G(0, 0, 2)], ozel: (h) => ({ yakit: h === 'gucsuz' ? 0 : 900 }),
    durum: (h) => (h === 'gucsuz' ? 'yakit-yok' : null),
  }],
  ['saft', [1, 1], false, { bag: 0b0101 }],
  ['volan', [2, 2], false, { ozel: (h) => ({ enerji: sayac(h, 2400, 1200) }) }],
  ['ruzgar-gulu', [1, 1], true, { ozel: (h) => ({ renk: 0, sinyal: h === 'calisiyor' ? 1 : 0 }) }],
  ['savak-kapagi', [1, 1], true, {
    hat: true, ozel: (h) => ({ renk: 2, sinyal: h === 'dolu' ? 1 : 0, kapali: h === 'dolu' }),
    durum: (h) => (h === 'dolu' ? 'kapali' : null),
  }],
  ['kantar', [1, 1], false, {
    ozel: (h) => ({ renk: 4, olcum: sayac(h, 1024, 600), sinyal: h === 'dolu' ? 1 : 0 }),
  }],
  ['kile-sayaci', [1, 1], true, {
    hat: true,
    ozel: (h) => ({ renk: 3, sayi: sayac(h, 20, 7), n: 20, sinyal: h === 'dolu' ? 1 : 0 }),
  }],
];

/** Önizleme durumları: [ad, durum kodu, oran]. */
export const HALLER = [
  ['calisiyor', 'calisiyor', 1024],
  ['duruyor', 'girdi-yok', 1024],
  ['gucsuz', 'guc-yok', 0],
  ['dolu', 'cikis-dolu', 1024],
];
