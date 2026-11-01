/**
 * Çiftlik denge sayıları: TEK KAYNAK (docs/ciftlik/ekonomi.md, parcalar.md). Kuruş, parça
 * fiyatları, eşya taban değerleri, sipariş boyları ve çarpanları, damga koşulları ve ödülleri,
 * kuruş kuyuları, çevrimdışı oranları burada; kural modülleri sayıyı buradan okur, kendi
 * kopyasını tutmaz. Kesirli oranlar tam sayı (onda bir, yüzde) yazılır: kural tam sayıyla
 * çalışır. Parça anahtarları belgedeki kod adlarıdır; yalnız emici huni çekirdekte `huni`.
 * Sayı değiştiren iş, ilgili belgeyi (ekonomi.md §8 türetilmiş tabloları) de günceller.
 */

const dondur = (o) => Object.freeze(o);

/** Yeni dünyanın kuruşu; "yeni çiftlik"te her basılmış damga için ek. */
export const BASLANGIC_KURUS = 300;
export const YENI_CIFTLIK_DAMGA_KURUS = 100;
/**
 * Kuyu (araba/çayır) harcaması kuruş + kurulu parçaların iade değerini bu tabanın altına
 * indiremez: her şey sökülünce yine huni + 30 bant alınabilsin (soft-lock koruması).
 */
export const KUYU_TABAN = 100;

/** Parça kurulum fiyatı (kuruş); söküm %100 iade. Toplam ≈ 2400 (ekonomi.md §2). */
export const PARCA_MALIYET = dondur({
  // T0
  huni: 40, bant: 2, sandik: 15,
  // D1
  catal: 20, 'birlestirme-olugu': 20, 'oluk-miknatisi': 30,
  // D2 (menfez: çiftin toplamı; ağızlar ayrı parçaysa ağız başına yarısı)
  'yaba-kolu': 30, 'defter-masasi': 40, menfez: 30,
  // D3
  'el-kranki': 20, saft: 3, 'balya-presi': 150, 'yel-degirmeni': 120,
  // D4
  kalbur: 50, volan: 80,
  // D5
  'seytan-yeli': 160, 'miknatisli-tambur': 120, 'tas-toplayici': 110,
  // D6
  'tirmik-kolu': 120, 'ot-savurucu': 90, 'gubre-cukuru': 60, tinaz: 60,
  // D7
  lokomobil: 300, ambar: 180, 'cekicli-kiyici': 180, 'kurutma-ambari': 200,
  // D8 (mantık, isteğe bağlı)
  kantar: 40, 'kile-sayaci': 40, 'ruzgar-gulu': 40, 'savak-kapagi': 25,
  // kurulu gelir, sökülmez
  'komsu-kapisi': 0,
});

/**
 * Eşya taban değeri (kuruş; Komşu kapısında taban satış, siparişlerin ödül tabanı). İğne
 * ailesi yalnız Defter masasında (tam), sandık/ambarda (yarı) ödenir; kapı iğne satmaz.
 */
export const ESYA_DEGER = dondur({
  saman: 1, 'yas-ot': 0, 'kuru-ot': 3, toz: 0, kiyim: 2, 'balya-saman': 12, 'balya-ot': 30,
  'balya-karisik': 3, 'curuk-ot': 0, igne: 250, cuvaldiz: 400, 'altin-igne': 1500, civi: 0,
  tas: 0,
  // dalga 2 (esyalar.md §6)
  basak: 0, tane: 2, un: 14, kepek: 1, 'karma-yem': 20, 'sarili-balya': 24,
});
/** Buluntu değeri nadirliğe göre (buluntu.js NADIRLIK anahtarları); yalnız masa/sandık öder. */
export const BULUNTU_DEGER = dondur({ yaygin: 30, seyrek: 60, nadir: 120, cokNadir: 300 });
/** Sandık/ambar girişi "bulundu" sayar ama değerin yarısını öder (pay/payda). */
export const YARI_ODEME = dondur({ pay: 1, payda: 2 });

/** Pano: kart sayısı, biten kartın yerine yenisinin geliş süresi, "Geri çevir" beklemesi. */
export const PANO = dondur({ kart: 3, yenileTik: 200, geriCevirTik: 1200 });

/** Sipariş türleri: ağırlık (üretim olasılığı) ve ödül çarpanı (onda bir: 20 = ×2). */
export const SIPARIS = dondur({
  agirlik: dondur({ hacim: 40, temiz: 20, karisim: 15, sureli: 10, cop: 10, nadir: 5 }),
  carpan: dondur({ hacim: 20, temiz: 30, karisim: 25, sureli: 30, nadir: 15 }),
  /** Süreli kart: süresi (tik) ve geç teslimde ödülün yüzdesi (×1,5 / ×3 = %50). */
  sureliTik: 6000, gecYuzde: 50,
  /** Temiz kart: siparişe uymayan her eşya ödülden −%10, en az %50. */
  temizCeza: 10, temizTaban: 50,
  /** Boy = yuvarla5(taban × (1 + adim/100 × d)); d = etkin damga numarası (en çok dTavan). */
  boyAdim: 25, dTavan: 8,
  /** Taban miktarlar (≈ tek tipik hattın 3 dakikası). */
  taban: dondur({
    saman: 120, 'kuru-ot': 80, kiyim: 150, 'balya-saman': 20, 'balya-ot': 15, toz: 30,
  }),
  /** Çöp siparişi: eşya başına sabit ödül; çivi ve taş damgayla büyümez (sabit miktar). */
  copOdul: dondur({ toz: 2, civi: 12, tas: 12 }),
  copMiktar: dondur({ civi: 4, tas: 6 }),
});

const BALYALAR = dondur(['balya-saman', 'balya-ot', 'balya-karisik']);
const kalem = (kabul, miktar) => dondur({ kabul: dondur(kabul), miktar });
const durum = (ad, miktar) => dondur({ durum: ad, miktar });

/**
 * Damgalar (ekonomi.md §4), sırayla. Kalem: teslim ({ kabul: eşya anahtarları, miktar }) ya
 * da durum ({ durum: 'igne' toplam bulunan iğne | 'buluntuTuru' çiftlik defterindeki tür
 * sayısı, miktar }). civisiz: kart etkinken kapıya çivi gelirse teslim sayacı sıfırlanır.
 * dalga: 2 olanlar ilk sürümde pano sırasına girmez. Açtığı parçalar acilis.js'te.
 */
export const DAMGALAR = dondur([
  dondur({ id: 'D1', ad: 'İlk teslim', odul: 150, kalemler: dondur([kalem(['saman'], 30)]) }),
  dondur({ id: 'D2', ad: 'Çivisiz', odul: 200, civisiz: true,
    kalemler: dondur([kalem(['saman'], 40)]) }),
  dondur({ id: 'D3', ad: 'İlk iğne', odul: 300, kalemler: dondur([durum('igne', 1)]) }),
  dondur({ id: 'D4', ad: 'İlk balyalar', odul: 400, kalemler: dondur([kalem(BALYALAR, 10)]) }),
  dondur({ id: 'D5', ad: 'Temiz harman', odul: 500,
    kalemler: dondur([kalem(['balya-saman'], 20)]) }),
  dondur({ id: 'D6', ad: 'Kümes altlığı', odul: 600, kalemler: dondur([kalem(['toz'], 30)]) }),
  dondur({ id: 'D7', ad: 'Kuru ot', odul: 800, kalemler: dondur([kalem(['kuru-ot'], 60)]) }),
  dondur({ id: 'D8', ad: 'Kışlık', odul: 1000,
    kalemler: dondur([kalem(['balya-ot'], 10), kalem(['kiyim'], 60)]) }),
  dondur({ id: 'D9', ad: 'Usta harmancı', odul: 1200,
    kalemler: dondur([kalem(['balya-ot'], 30), durum('igne', 10)]) }),
  dondur({ id: 'D10', ad: 'Defter yarısı', odul: 1200,
    kalemler: dondur([durum('buluntuTuru', 8)]) }),
  dondur({ id: 'D11', ad: 'Ahır dolusu', odul: 1500, dalga: 2,
    kalemler: dondur([kalem(['balya-ot'], 20), kalem(['kiyim'], 100)]) }),
  dondur({ id: 'D12', ad: 'Değirmen', odul: 1500, dalga: 2,
    kalemler: dondur([kalem(['tane'], 40)]) }),
  dondur({ id: 'D13', ad: 'Fırın', odul: 1800, dalga: 2, kalemler: dondur([kalem(['un'], 15)]) }),
  dondur({ id: 'D14', ad: 'Kış hazırlığı', odul: 2000, dalga: 2,
    kalemler: dondur([kalem(['sarili-balya'], 10), kalem(['karma-yem'], 20)]) }),
]);

/**
 * Araştırma kipi (isteğe bağlı, ekonomi.md §6): parça bedeli = maliyet × kurusKat + damga
 * koşulunun ürününden numune (depolardan düşülür). Pencere dalga 2'de; veri burada.
 */
export const ARASTIRMA = dondur({
  kurusKat: 2,
  numune: dondur({
    D1: dondur([kalem(['saman'], 10)]), D2: dondur([kalem(['saman'], 20)]),
    D3: dondur([kalem(['saman'], 40)]), D4: dondur([kalem(BALYALAR, 5)]),
    D5: dondur([kalem(['balya-saman'], 5)]), D6: dondur([kalem(['toz'], 10)]),
    D7: dondur([kalem(['kuru-ot'], 20)]), D8: dondur([kalem(['balya-ot'], 5)]),
  }),
});

/** Kuruş kuyuları (kapı paneli): Araba çağır ve Çayır genişlet (en çok 3 kez, artan bedel). */
export const KUYU = dondur({
  araba: dondur({ bedel: 300, bekleme: 6000 }),
  cayir: dondur({ bedeller: dondur([400, 800, 1200]), sutun: 6 }),
});
/** Kıyıcı onarımı (F), dalga 2 değirmen onarımı. */
export const ONARIM = dondur({ kiyici: 50, degirmen: 80 });

/**
 * Çevrimdışı ilerleme (ekonomi.md §7): tavan dakika, kazanç oranı (yüzde), ölçüm penceresi
 * (dakika × 1200 tik; son pencereDk dakikanın depolanan/satış hızı).
 */
export const CEVRIMDISI = dondur({ tavanDk: 480, yuzde: 50, pencereDk: 5, dkTik: 1200 });

/**
 * Parça sabitleri: aile → parça anahtarı → { ad: değer } (hız, tampon, güç, kapasite...).
 * Faz 1 aile ajanları sabitlerini kendi dosyalarında dışa aktarılan nesnelerde tanımladı
 * (ör. temel.js HUNI, BANT_HIZ, SANDIK_KAP); birleştirmede buraya taşınır ve aile dosyası
 * `parcaSabiti('huni')` ile okur (tek kaynak). Boş aile = henüz taşınmadı.
 */
export const PARCA_SABIT = dondur({
  toplama: dondur({}), tasima: dondur({}), ayiklama: dondur({}), isleme: dondur({}),
  depo: dondur({}), enerji: dondur({}), mantik: dondur({}),
});

/** Bir parçanın sabitleri (hangi ailede olursa); yoksa hata (yazım hatası sessiz geçmesin). */
export function parcaSabiti(anahtar) {
  for (const aile of Object.values(PARCA_SABIT)) if (aile[anahtar]) return aile[anahtar];
  throw new Error(`denge: "${anahtar}" parça sabiti yok`);
}
