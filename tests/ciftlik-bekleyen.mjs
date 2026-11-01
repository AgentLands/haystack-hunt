/**
 * Bekleyen çiftlik testleri (iş K · ciftlik-dogrulama). Faz 1 parçaları birleşmeden yazılabilen
 * testler `bekleyen(...)` ile kaydedilir: eksik parça/dosya varsa AÇIKÇA atlanır ("BEKLİYOR"
 * + hangi iş), parçalar gelmiş ama test henüz doğrulanmamışsa `CIFTLIK_BEKLEYEN=1` ile açılır.
 * Birleştirme sonrası ana ajan:  CIFTLIK_BEKLEYEN=1 npm test  → kırılanları düzeltir, sonra
 * aşağıdaki `BEKLEYEN_ACIK` varsayılanını true yapar (tek satır) ve bu sarmalayıcıyı kaldırır.
 *
 * Bekleyen testler ve beklediği işler (parça adları `docs/ciftlik/parcalar.md` kod adlarıdır;
 * harfler `yol-haritasi.md` §2 iş parçalarıdır):
 *   ciftlik-denge       Hat A/B/C 6000 tik ±%10 ........ A B D E F G (+ test kancası: havaSabit)
 *   ciftlik-denge       rüzgârlı beklenen değer (2 yel ≈ %76) ... D (hava) + B (yel tablosu)
 *   ciftlik-senaryo     D1-D5 ≤ 30 oyun dk sabit komut dizisi ... hepsi (G damga, J öğretici)
 *   ciftlik-yumusak     (a) söküm → kuruş = 300 + kazanç ... G
 *                       (b) ölü döngüden çıkış (krank, sandık→kol→lokomobil) ... B F
 *                       (c) iğne/buluntu her sink/makine/söküm yolunda ... E F G (sink'ler)
 *                       (d) öğretici çivileriyle D2'ye ≤ 10 dk ... D G J
 *   ciftlik-ayrim       (hazır) hepsi şimdiki çekirdekle çalışır; yeni satırlar J gelince açılır
 *   e2e ciftlik-ogretici  ilk 10 dakika tablosu adım adım ... J (pano/öğretici) D G
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

/** true: parçalar gelmiş bekleyen testler de koşar. Birleştirme sonrası ana ajan açar. */
export const BEKLEYEN_ACIK = process.env.CIFTLIK_BEKLEYEN === '1';

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
