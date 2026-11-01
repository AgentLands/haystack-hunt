/**
 * "Nasıl oynanır" defterinin içeriği: sekmeler ve kısa maddeler. Her madde [ikon, metin];
 * metin girdiye göre seçilir (t: klavye, d: dokunmatik; tek dizgeyse ikisinde aynı).
 * Sayılar (haklar, ceza, puan) kural modüllerinden okunur ki belge kuraldan sapmasın.
 */
import { ZORLUKLAR, PUAN_TABAN, PUAN_TABAN_ALT, HAK_BEDELI } from '../kural/zorluk.js';
import { MIKNATIS_MENZIL, SEVIYELER } from '../kural/araclar.js';
import { CIVI_CEZA_MS } from '../kural/civi.js';
import { TELAFI_HAKKI } from '../kural/dedektor.js';
import { KULAK_MENZIL } from '../kural/sinyal.js';
import { IKMAL_HAKKI } from '../kural/makineler/garaj.js';
import { KATALOG } from '../kural/buluntu.js';
import { DONDURMA_ARALIK_GUN } from '../kural/istatistik.js';

const { kolay, normal, zor } = ZORLUKLAR;
const yuzde = (oran) => `%${Math.round(oran * 100)}`;
const [yanar, sicak, ilik] = SEVIYELER;

/** Puan tablosu satırları: [açıklama, değer]; ardından zorluk çarpanları [ad, çarpan]. */
export const PUAN_SATIRLARI = [
  ['Başlangıç', String(PUAN_TABAN)],
  ['Her saniye', '−2'],
  ['Her 100 saman', '−1'],
  ['Her dedektör ya da mıknatıs', `−${HAK_BEDELI}`],
  ['En az', String(PUAN_TABAN_ALT)],
];
export const CARPANLAR = [kolay, normal, zor].map((z) => [z.ad, `×${z.carpan}`]);

export const SEKMELER = [
  {
    ad: 'Yürüme',
    maddeler: [
      ['el', {
        t: 'WASD ya da ok tuşlarıyla yürü.',
        d: 'Sol alttaki kolu it ya da gideceğin yere dokun.',
      }],
      ['balya', 'Samanın üstünde yavaşlarsın; çok dik yamaca tırmanamazsın.'],
      ['igne', {
        t: 'Yakınındaki bir yere fareyle basılı tutarsan alet orada çalışır.',
        d: 'Yakınındaki bir yere basılı tutarsan alet orada çalışır.',
      }],
      ['cerceve', {
        t: 'Tekerlek ya da + − ile yakınlaş; 0 bütün tarlayı gösterir. Yürüyünce kamera '
          + 'yine seni izler.',
        d: 'İki parmakla yakınlaş; çerçeve düğmesi bütün tarlayı gösterir.',
      }],
    ],
  },
  {
    ad: 'Aletler',
    maddeler: [
      ['el', {
        t: 'El (1): Boşluğu basılı tut, önündeki samanı alırsın. Çukura yamaçtan saman kayar.',
        d: 'El: Kullan\'ı basılı tut, önündeki samanı alırsın. Çukura yamaçtan saman kayar.',
      }],
      ['tirmik', {
        t: 'Tırmık (2): Boşluk basılıyken yürü, samanı o yöne itersin. Tarla dışına giden '
          + 'saman gider.',
        d: 'Tırmık: Kullan basılıyken yürü, samanı o yöne itersin. Tarla dışına giden '
          + 'saman gider.',
      }],
      ['dedektor', {
        t: `Dedektör (3): iğneye ne kadar yakın olduğunu söyler. Hak: Kolay ${kolay.dedektor}, `
          + `Normal ${normal.dedektor}, Zor ${zor.dedektor}.`,
        d: `Dedektör: iğneye ne kadar yakın olduğunu söyler. Hak: Kolay ${kolay.dedektor}, `
          + `Normal ${normal.dedektor}, Zor ${zor.dedektor}.`,
      }],
      ['dedektor', `Okuduğun yerde bir halka kalır. Yanıyor!: iğne ${yanar.mesafe} adım içinde, `
        + `Sıcak: ${sicak.mesafe}, Ilık: ${ilik.mesafe}. İğne bir halkanın içinde, bir küçüğünün `
        + 'dışındadır; birkaç yerden oku, halkaların kesiştiği yeri kaz.'],
      ['dedektor', `Hepsi Soğuk çıkıp hakların biterse tur başına ${TELAFI_HAKKI} hak daha `
        + 'verilir; şanssız tarlada elin boş kalmaz.'],
      ['miknatis', {
        t: `Mıknatıs (4): iğne ${MIKNATIS_MENZIL} adım içindeyse yüzeye çeker ve parlatır; `
          + `değilse boşa gider. Kolay'da ${kolay.miknatis} hak, yoksa ${normal.miknatis}.`,
        d: `Mıknatıs: iğne ${MIKNATIS_MENZIL} adım içindeyse yüzeye çeker ve parlatır; `
          + `değilse boşa gider. Kolay'da ${kolay.miknatis} hak, yoksa ${normal.miknatis}.`,
      }],
    ],
  },
  {
    ad: 'Makineler',
    maddeler: [
      ['traktor', {
        t: 'Makineler garajda bekler. Yanına git, E ile bin; yine E ile in.',
        d: 'Makineler garajda bekler. Yanına git, Bin/İn ile bin ya da in.',
      }],
      ['traktor', {
        t: 'Kepçeli traktör: W/S gaz, A/D dön, Boşluk kepçe. Dolu kepçeyi tarla kenarında '
          + 'boşalt. İğne kepçeye girerse boşaltınca yere düşer; inip elle al.',
        d: 'Kepçeli traktör: kolla sür, Kullan kepçeyi çalıştırır. Dolu kepçeyi tarla '
          + 'kenarında boşalt. İğne kepçeye girerse boşaltınca yere düşer; inip elle al.',
      }],
      ['ufleyici', {
        t: 'Sırt üfleyicisi: takınca yürümeye devam edersin. Boşlukla önündeki yüzey '
          + 'samanını ileri savurursun; derin yığını inceltir ama bitiremez.',
        d: 'Sırt üfleyicisi: takınca yürümeye devam edersin. Kullan ile önündeki yüzey '
          + 'samanını ileri savurursun; derin yığını inceltir ama bitiremez.',
      }],
      ['balya-makinesi', 'Balya makinesi: alçak samanı geniş bir şeritte toplar, hazne '
        + 'dolunca arkaya balya bırakır. İğne de balyaya sarılabilir.'],
      ['balya', {
        t: 'Balyayı açmak için makineden in, el seçiliyken balyaya dön, Boşluğu basılı tut.',
        d: 'Balyayı açmak için makineden in, el seçiliyken balyaya dön, Kullan\'ı basılı tut.',
      }],
      ['damla', `Yakıt sınırlı: Kolay ${yuzde(kolay.yakit)}, Normal ${yuzde(normal.yakit)}, `
        + `Zor ${yuzde(zor.yakit)} depoyla başlar. Bitince in ve yürü.`],
      ['damla', IKMAL_HAKKI === 1
        ? 'Garaj ikmali: yakıt azalınca makineyi garajdaki park yerine geri getirip durdur; '
          + 'depo dolar. Her makine için tur başına bir kez.'
        : `Garaj ikmali: makineyi park yerine geri getirip durdur; depo dolar (tur başına `
          + `${IKMAL_HAKKI} kez).`],
      ['damla', {
        t: 'Boşluğu boşuna basılı tutmak yakıtı çok yemez; asıl harcama saman alırken olur.',
        d: 'Kullan\'ı boşuna basılı tutmak yakıtı çok yemez; asıl harcama saman alırken olur.',
      }],
    ],
  },
  {
    ad: 'İpuçları',
    maddeler: [
      ['gunes', 'İğne yüzeye yakınsa güneşte arada bir parlar; gözünü tarladan ayırma. '
        + 'Parıltı ekran dışındaysa kenarda yönü gösteren bir ışık oku belirir.'],
      ['igne', 'İğne açığa çıkınca yanına git ve elle al.'],
      ['civi', `Paslı çiviler turuncu-kızıl parlar. Elle çivi alırsan süreye `
        + `${CIVI_CEZA_MS / 1000} sn eklenir; dedektör ve mıknatıs çiviyi görmez.`],
      ['dedektor', 'Dedektörü yığının farklı yanlarında dene: Soğuk, Ilık, Sıcak, '
        + 'Yanıyor! Isındıkça iğneye yaklaşıyorsun.'],
      ['ses-acik', `Kulak: ses açıksa kazarken iğneye ${KULAK_MENZIL} adımdan yaklaşınca metal `
        + 'tınılar duyulur; yaklaştıkça sıklaşır ve incelir. Yön vermez, "buralarda" der.'],
      ['menu', 'Süre ilk hamlende başlar; menü açıkken ve sekme arkadayken işlemez.'],
    ],
  },
  {
    ad: 'Diğer',
    maddeler: [
      ['anahtar', `Samanın altında düğme, nal, yüzük gibi küçük eşyalar da saklı `
        + `(${KATALOG.length} tür). Elle alırsan cezasızdır; Buluntular defterine yazılır, `
        + 'nadir olanlar ayrı damgalı.'],
      ['balya', 'Fare, serçe, kurbağa, kirpi, hatta bir kedi tarlada yaşar; yaklaşınca kaçarlar. '
        + 'Yalnız süs, oyunu etkilemezler.'],
      ['kurdele', 'Kesintisiz kazarsan tuvalin sol üstündeki ince akış çubuğu dolar. Yalnız keyif; '
        + 'puanı ve süreyi etkilemez, paslı çivi alırsan yarıya düşer.'],
      ['bayrak', 'Bitişte "Meydan oku" ile süreni bağlantıyla gönder; bağlantıyı açan aynı '
        + 'tarlada, aynı zorlukta süreni geçmeye çalışır. İğnenin yeri bağlantıda yoktur.'],
      ['tik', 'Rahat mod (menüdeki bağlantılar arasında): süre ve puan gizlenir, çivi '
        + 'cezası yoktur. Yarışta kapalıdır.'],
      ['gunes', `Günün tarlası serisi: tek bir günü kaçırırsan seri bozulmaz (seri dondurma, `
        + `${DONDURMA_ARALIK_GUN} günde bir).`],
    ],
  },
  { ad: 'Puan', maddeler: [], tablo: true },
];
