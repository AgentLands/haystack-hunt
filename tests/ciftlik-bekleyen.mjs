/**
 * Bekleyen çiftlik testleri (iş K · ciftlik-dogrulama). Faz 1 parçaları birleşmeden yazılabilen
 * testler `bekleyen(...)` ile kaydedilir: eksik parça/dosya varsa AÇIKÇA atlanır ("BEKLİYOR"
 * + hangi iş), parçalar gelmiş ama test henüz doğrulanmamışsa `CIFTLIK_BEKLEYEN=1` ile açılır.
 * Birleştirme sonrası ana ajan:  CIFTLIK_BEKLEYEN=1 npm test  → kırılanları düzeltir, sonra
 * aşağıdaki `BEKLEYEN_ACIK` varsayılanını true yapar (tek satır) ve bu sarmalayıcıyı kaldırır.
 *
 * Durum (Faz 1 birleştirmesi, c-entegre3; hepsi bayraksız koşar):
 *   ciftlik-denge     Hat A, B (iki savurucu, ekonomi.md §8), C, rüzgârlı verim ..... AÇIK
 *   ciftlik-senaryo   D1-D5 ≤ 30 dk (≈ 12 dk), determinizm ............................ AÇIK
 *   ciftlik-yumusak   (a) (b1) (b2) (c), (d) öğretici çivi D2 ≤ 10 dk .................. AÇIK
 *                     dik yığında söküm sonrası geri kurma ........ todo (bilinen sınır)
 *   ciftlik-sozlesme  v1 eşya kodu göçü, parça çizimi ............................... AÇIK
 *   e2e ciftlik-ogretici  ilk 10 dakika tablosu ...... BEKLİYOR (CIFTLIK_BEKLEYEN=1)
 *   e2e ciftlik-telefon   perf hedefi (katman ≤ 4 ms) ... BEKLİYOR H1 (CIFTLIK_BEKLEYEN=1)
 * Birim testlerinde varsayılan açık (CIFTLIK_BEKLEYEN=0 kapatır); eksik parça/dosya varsa test
 * yine "BEKLİYOR" diye atlanır.
 * Yazım hatası "bekliyor" gibi görünmesin diye `bekleyen` bilinmeyen parça adında hemen hata
 * verir; `PARCALAR` listesi `docs/ciftlik/parcalar.md` ile `ciftlik-sozlesme.test.js`'te
 * karşılaştırılır.
 */
import fs from 'node:fs';
import { test } from 'node:test';
import { parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { esyaTanimi } from '../js/kural/ciftlik/esya.js';
import '../js/kural/ciftlik/parcalar/hepsi.js';

const KOK = new URL('../', import.meta.url);

/** true: parçalar gelmiş bekleyen testler de koşar (birleştirmede açıldı; '0' kapatır). */
export const BEKLEYEN_ACIK = process.env.CIFTLIK_BEKLEYEN !== '0';

/** Çekirdekte `huni`, tasarım belgesinde `emici-huni`: hangisi kayıtlıysa o. */
export const HUNI_AD = parcaTanimi('emici-huni') ? 'emici-huni' : 'huni';

export const dosyaVar = (yol) => fs.existsSync(new URL(yol, KOK));
export const parcaVar = (ad) => parcaTanimi(ad) !== null;
export const esyaVar = (ad) => esyaTanimi(ad) !== null;

/** Eksik ön koşulların okunur listesi (boşsa hazır). */
export function eksikler({ parca = [], dosya = [], esya = [] }) {
  return [
    ...parca.filter((ad) => !parcaVar(ad)).map((ad) => `parça "${ad}"`),
    ...esya.filter((ad) => !esyaVar(ad)).map((ad) => `eşya "${ad}"`),
    ...dosya.filter((yol) => !dosyaVar(yol)).map((yol) => `dosya ${yol}`),
  ];
}

/** İlk sürümün 30 parçası + kurulu gelen kapı (`parcalar.md` kod adları, belge sırası). */
export const PARCALAR = [
  'emici-huni', 'tirmik-kolu', 'tas-toplayici', 'bant', 'menfez', 'catal', 'birlestirme-olugu',
  'oluk-miknatisi', 'miknatisli-tambur', 'kalbur', 'tinaz', 'seytan-yeli', 'ot-savurucu',
  'kurutma-ambari', 'balya-presi', 'cekicli-kiyici', 'gubre-cukuru', 'sandik', 'ambar',
  'defter-masasi', 'yaba-kolu', 'el-kranki', 'yel-degirmeni', 'lokomobil', 'saft', 'volan',
  'ruzgar-gulu', 'savak-kapagi', 'kantar', 'kile-sayaci', 'komsu-kapisi',
];

/**
 * Bekleyen test. `is`: bekleyen iş parçası harfleri ("G", "A B"), `parca`: kayıtlı olması
 * gereken parça adları, `esya`: kayıtlı eşya adları, `dosya`: var olması gereken dosyalar
 * (kök göreli).
 * `dogrulandi: true`: gövde gerçek parçalarla en az bir kez geçti; ön koşullar varsa bayraksız
 * koşar (eksikse yine "BEKLİYOR"). Gövde ön koşul eksikken hiç çalışmaz (modüller gövde
 * içinde `await import` ile yüklenir).
 */
export function bekleyen(ad, { is, parca = [], dosya = [], esya = [], dogrulandi = false }, govde) {
  for (const p of parca) {
    if (!PARCALAR.includes(p) && p !== HUNI_AD) {
      throw new Error(`bekleyen: bilinmeyen parça "${p}"`);
    }
  }
  const eksik = eksikler({ parca, dosya, esya });
  if (eksik.length) {
    return test(ad, { skip: `BEKLİYOR [${is}]: ${eksik.join(', ')} yok` }, govde);
  }
  if (!BEKLEYEN_ACIK && !dogrulandi) {
    return test(ad, { skip: `BEKLİYOR [${is}]: ön koşullar var, CIFTLIK_BEKLEYEN=1 ile aç` },
      govde);
  }
  return test(ad, govde);
}
