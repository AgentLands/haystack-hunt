/**
 * "Nasıl oynanır" defterinin Çiftlik sekmesi (yardim-icerik.js buraya başvurur): menüden
 * çiftliği açmaktan siparişlere, hava tahminine, sorun listesine ve kayıtlara kısa maddeler.
 * Maddeler [ikon, metin]; metin girdiye göre { t: klavye, d: dokunmatik } ya da tek dizge.
 * Sayılar kural modüllerinden okunur (bant verimi: BANT_HIZ, ARALIK, TIK_MS).
 */
import { BANT_HIZ } from '../kural/ciftlik/parcalar/temel.js';
import { ARALIK, TIK_MS } from '../kural/ciftlik/olcu.js';

/** Bandın saniyede taşıdığı eşya (tek ondalık): 1000 / TIK_MS tik/sn × hız / aralık. */
const BANT_SANIYE = (Math.round(((1000 / TIK_MS) * BANT_HIZ * 10) / ARALIK) / 10)
  .toLocaleString('tr-TR');

export const CIFTLIK_SEKMESI = {
  ad: 'Çiftlik',
  maddeler: [
    ['kutu', 'Menüdeki Çiftlik düğmesi kendi çiftliğini açar: süre ve puan yok, ceza yok. '
      + 'Amaç saman yığınından kapıya bir hat kurup siparişleri karşılamak.'],
    ['kutu', {
      t: 'B ile inşa paletini aç, parçayı seç, tuvale tıkla. R döndürür; X ya da sağ tık söker. '
        + 'Sökülen parçanın bedeli geri gelir, denemek bedava.',
      d: 'İnşa düğmesiyle paleti aç, parçayı seç, tuvale dokun. Döndür ve Sök düğmeleri '
        + 'palette. Sökülen parçanın bedeli geri gelir, denemek bedava.',
    }],
    ['balya', {
      t: `Bant seçip fareyi basılı sürükle. Bant tek şeritlidir ve saniyede en çok ${BANT_SANIYE} `
        + 'eşya taşır; önü doluysa eşyalar bekler, hiçbiri ezilmez.',
      d: `Bant seçip parmağını sürükle. Bant tek şeritlidir ve saniyede en çok ${BANT_SANIYE} `
        + 'eşya taşır; önü doluysa eşyalar bekler, hiçbiri ezilmez.',
    }],
    ['igne', 'Emici huni samanı yığından çeker. İğne, paslı çivi ve buluntular da hatta gelir; '
      + 'bantta ya da depoda hiçbiri kaybolmaz.'],
    ['civi', 'Paslı çivi bazı makineleri tıkar. Mıknatıs çiviyi tutar; tutucu dolunca '
      + '"doymuş" rozeti çıkar, parçaya dokunup boşalt.'],
    ['kurdele', 'Pano (üst şeritte): üç sipariş kartı. Damga siparişi teslim edilince damga '
      + 'basılır, kuruş gelir ve yeni parçalar açılır. İlerlemeyi Damga defterinden izle.'],
    ['kutu', 'Komşu kapısı (Panodaki düğme): fazlasını sat, araba çağır, çayır genişlet. '
      + 'Kuruşun geç oyundaki harcama yerleridir.'],
    ['gunes', 'Hava tahmini (üst şeritte): şimdi ve sonraki 3 dakika. Ok rüzgârın gittiği yönü, '
      + 'noktalar şiddeti, simge gökyüzünü gösterir. Rüzgâr yel değirmenini, yağmur çayırı '
      + 'etkiler.'],
    ['damla', 'Sorun listesi (⚠): tıkanan parçalar ve nedenleri. Satıra dokununca kamera '
      + 'parçaya gider; hiçbir tıkanma sessiz kalmaz.'],
    ['defter', {
      t: 'İstatistik (I ya da Defter düğmesi): eşya başına üretim hızı, son 10 dakikanın '
        + 'çizgisi ve en çok duran 3 parça.',
      d: 'İstatistik (Defter düğmesi): eşya başına üretim hızı, son 10 dakikanın çizgisi ve '
        + 'en çok duran 3 parça.',
    }],
    ['menu', 'Çiftlik kendiliğinden kaydedilir. Menüden Yeni çiftlik kurabilir, Kayıt '
      + 'yuvalarından Son kayıt ve Yedeği yükleyebilir, çiftliği dosya olarak dışa ve içe '
      + 'aktarabilirsin.'],
    ['soru', 'İlk açılışta öğretici adım adım yol gösterir; Atla ile bırakabilirsin.'],
  ],
};
