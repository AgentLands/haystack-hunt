/**
 * Çiftlik parça önizlemesinin hat sahnesi (C bölümü): parçaların oyundaki gibi bantlarla
 * komşu durduğu küçük bir düzen. [anahtar, kx, ky, yon]; boyut ciftlik-onizleme-veri.js'ten.
 */
const bantlar = (x0, x1, y, yon = 0) => {
  const l = [];
  for (let x = x0; x <= x1; x++) l.push(['bant', x, y, yon]);
  return l;
};

export const SAHNE = {
  en: 18,
  boy: 16,
  parcalar: [
    ['huni', 0, 1, 0], ...bantlar(2, 3, 1), ['oluk-miknatisi', 4, 1, 0], ...bantlar(5, 5, 1),
    ['miknatisli-tambur', 6, 1, 0], ['sandik', 7, 2, 0], ...bantlar(8, 8, 1),
    ['kalbur', 9, 1, 0], ...bantlar(11, 11, 1), ['catal', 12, 1, 0], ...bantlar(13, 13, 1),
    ['kile-sayaci', 14, 1, 0], ['savak-kapagi', 15, 1, 0], ...bantlar(16, 17, 1),
    ['balya-presi', 0, 4, 0], ...bantlar(3, 4, 4), ['defter-masasi', 5, 4, 0],
    ['yaba-kolu', 7, 4, 0], ['komsu-kapisi', 8, 4, 0], ['birlestirme-olugu', 11, 4, 0],
    ...bantlar(12, 12, 4), ['ot-savurucu', 13, 4, 0], ...bantlar(16, 17, 4),
    ['tinaz', 0, 7, 0], ['seytan-yeli', 4, 7, 0], ['kurutma-ambari', 7, 7, 0],
    ['cekicli-kiyici', 11, 7, 0], ['ambar', 14, 7, 0],
    ['gubre-cukuru', 0, 11, 0], ...bantlar(3, 3, 11), ['menfez', 4, 11, 0],
    ['menfez', 6, 11, 0, { uc: 'cikis' }], ...bantlar(7, 7, 11), ['tirmik-kolu', 10, 11, 0],
    ['tas-toplayici', 13, 10, 0], ['ruzgar-gulu', 16, 11, 0], ['kantar', 17, 11, 0],
    ['el-kranki', 0, 14, 0], ['saft', 1, 14, 0], ['saft', 2, 14, 0], ['volan', 3, 13, 0],
    ['saft', 5, 14, 0], ['lokomobil', 6, 13, 0], ['yel-degirmeni', 13, 13, 0],
  ],
};
