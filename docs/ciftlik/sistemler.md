# Sistemler: enerji, mantık, hava, çivi, iğne, defter

Hepsi `js/kural/ciftlik/` altında saf ve deterministiktir: tam sayı, `Math.random` yok,
`Math.sin/cos/pow` yok; aynı tohum + aynı tik numaralı komutlar = aynı sonuç (`mimari` §3).

## 1 Enerji: şaft şebekesi
- **Birim** bg (beygir), tam sayı. Üreticiler `+bg`, tüketiciler `guc` (talep). Şebeke =
  komşulukla birleşen şaft + enerji parçaları + makine aks noktaları (birleşim-bul; topoloji
  değişince yeniden). Kablo çizimi yok, uzaklık kaybı yok; şaft menfezle kesişir.
- **Talep**: makine yalnız bu tik ilerleyebiliyorsa (girdisi var, çıkışı boş, sıkışık değil,
  savak/kasnak kapalı değil) talep eder. Boş makine güç yemez → yakıt boşa gitmez. (Dalga 2
  istisnası: değirmen taşı, bilerek.)
- **Tik sırası** (`ag/enerji.js`, `mimari` tik adımı 2): `arz = Σ üretim`, `talep = Σ istek`.
  `fark = arz − talep`. Volanlar sırayla: `fark > 0` ise `şarj = min(fark, 12, boşYer)`;
  `fark < 0` ise `deşarj = min(−fark, 30, dolu)`; `arz` buna göre düzelir. Sonra
  `oran = talep ? min(1024, floor(arz × 1024 / talep)) : 1024`. Bileşendeki herkes aynı
  oranla çalışır: iş ilerlemesi `× oran / 1024`.
- **Yumuşak bozulma**: eksik güç yavaşlatır, **asla kesmez**, sigorta yok. Görünür: dişliler
  oranla yavaş döner, panelde "Güç %62", oran < %50 ise sarı rozet.
- `gucsuzOran` (parça tanımında, isteğe bağlı): şebekeye bağlı değilken çalışma oranı.
  Huni 512 (pasif 50/dk; şebekede tam oranda 100/dk), kurutma ambarı 256, ot savurucu 341.
  Şebekeye bağlıysa etkin oran `max(gucsuzOran, oran)` (zayıf şebeke pasiften yavaş
  yapmaz). Ötekiler 0 (güçsüz durur). Bu, `mimari`deki "dişlisiz makine güçsüzdür" kuralının
  genelleştirilmesidir.
- **Darbeli yük**: pres basarken 30 bg ister; volansız küçük şebekede bütün makineler o
  40 tik yavaşlar. Volan bunu emer: bir basma açığı ≈ (30 − arz) × 40 ≤ 2400. Volan **dakikalık
  rüzgâr sessizliğini kapatmaz** (20 bg talep 2400'ü 6 sn'de eritir).
- **Rüzgâr durgunken** (dilimlerin %15'i) yel 0 bg verir; pres ve şeytan yelinin `gucsuzOran`ı
  0 olduğundan hat durur: "bedava ama kararsız"ın bedeli budur. Hat A'da 2 yel ≈ %76, 4 yel
  bile ≈ %85 verimdir (`ekonomi.md` §8); tam hız için lokomobil ya da krank şart. **Ölü
  döngü korunması**: lokomobil yakıtını presten alır; yakıt bitip yel de yoksa hat durur, ama
  krank (bedava, her zaman açık) bir balya bastırır, sandıktaki balya da yaba koluyla (güç
  istemez) lokomobile verilebilir; yakıt bitince ipucu notu bunu söyler (hiçbir yol kilitlenmez).
- **Üreticiler**: krank 6 (komutla: Kullan'a **bir kez dokunmak 600 tik** döndürür, basılı tutmak
  gerekmez; çiftçi 3 karoyu aşarsa durur; telefonda başparmak joystick'te kalır), yel değirmeni şiddete göre 0/8/16/24 (yön dönüşünde
  100 tik 0), lokomobil ≤ 40 (yakıtı `talep payı` oranında harcar: balya 1200 tik, kıyım
  150 tik tam yükte), dalga 2: manej 12 (ot yer), kayış kasnağı 30 bg aktarım tavanı.

## 2 Mantık: renk kanalları
- **Tel yok.** Her mantık parçasının bir renk ayarı vardır; 6 kanal: kırmızı, çivit, sarı,
  yeşil, mor, beyaz (`belirtec.css` tonlarından). Kanal **çiftliğin tamamında** geçerlidir.
  Gerekçe: dokunmatikte tel çizmek zor (araştırma §4); 6 kanal ilk sürüm hedefleri için
  yeter. `mimari`deki kablo parçaları yerine renk = ağ (aynı birleşim mantığı, daha basit).
- **Değer**: kanal değeri = o tik 1 yazan yazıcı sayısı (tam sayı); okuyucu `> 0` ise
  "açık" sayar. **Çift tampon**: tik t'de yazılan t+1'de okunur (sıra bağımsız, döngüde
  salınım belirli).
- **Yazıcılar**: rüzgâr gülü, kantar, kile sayacı (+ dalga 2: metal dedektörü, kum saati).
  **Okuyucular**: savak kapağı, kile sayacı (sıfırlama) (+ dalga 2: boşta kasnak, fener).
  Okuyucuların hepsinde "ters" ayarı vardır (sinyalde kapan/açıl): ayrı DEĞİL kapısı yok.
- Her mantık parçası kendi üstünde küçük bir lamba taşır (kendi durumunu gösterir).
- **İsteğe bağlı**: hiçbir sipariş ya da damga mantık kurmayı gerektirmez; mantık verimi,
  önceliği ve düzeni artıran bir kattır. Yazılabilir program, sayısal sinyal, zamanlayıcı
  dili yoktur.
- **Örnek devreler** (öğretici olmayan ipucu kartları, "Nasıl oynanır" defterinde):
  1. *Rüzgâra göre yol*: rüzgâr gülü (dik esiyor, kırmızı) → tınaz kolunda savak "sinyalde
     açıl", şeytan yeli kolunda savak "sinyalde kapan"; önlerinde çatal "taşma".
  2. *Tam 40 balya*: kile sayacı (kile, N=40, yazma sarı) komşuya giden hatta; dolunca
     kapanır, çatal "taşma" fazlasını ambara yollar; sipariş bitince oyuncu panelden sıfırlar.
  3. *Taşma koruması*: kantar (gübre çukuru ≥ %100, mor) → toz hattında savak açılır,
     toz sandığa döner.
  4. *Enerji önceliği* (dalga 2): kantar (volan < %25, beyaz) → boşta kasnak kıyıcıyı ayırır.

## 3 Hava: rüzgâr, gök, nem
- **Dilim** = 1200 tik. `hava(tohum, dilim) → { yon, siddet, gok }` saf ve **durumsuz**:
  yalnız tohum ve dilim numarasından hesaplanır (kayıt ve çevrimdışı için ek durum yok).
  - *Yön* (0 doğu, 1 güney, 2 batı, 3 kuzey; rüzgârın **gittiği** yön): 3 dilimlik
    "cephe" boyunca sabit, cephe başına `zar(tohum, cephe)` ile eşit olasılık.
  - *Şiddet*: her dilim; 0 durgun %15, 1 esinti %35, 2 rüzgâr %35, 3 sert %15.
  - *Gök*: 10 dilimlik "hava günü"nde %40 olasılıkla 2 dilimlik bir yağmur penceresi
    (başlangıcı zarla); yağmur dışındaki dilimler %30 bulutlu, kalanı güneşli. Yağmurda
    şiddet en az 1. Ortalama yağmur payı ≈ %8.
- **Tahmin**: HUD'da şimdiki dilim + sonraki 3 dilim (ok, şiddet çizgisi, gök simgesi).
  Rüzgâr gülü panelinde aynı tahmin. Sürpriz yok: oyuncu planlar.
- **Etkiler**:
| Parça / sistem | Güneşli | Bulutlu | Yağmur | Rüzgâr |
|---|---|---|---|---|
| Tınaz | | | | eksene dik + şiddet (§ `parcalar` 11) |
| Yel değirmeni | | | | 0/8/16/24 bg; yön değişince 100 tik 0 |
| Ot savurucu (kuruma/tik) | +5 (+1 şiddet ≥ 1) | +3 | 0 | |
| Yan tırmık sırası (d2) | 400 tikte kurur | 800 tikte | ıslanır, sıfırlanır | |
| Çayır büyümesi (en çok 12 kat) | 240 tikte +1 kat | aynı | **120 tikte** +1 | |
Gübreli karoda süre yarıya iner (yağmurla birlikte 60 tik). Yağmur kurutmayı durdurur ama
çayırı hızlandırır: ikilem, ceza değil. Büyüme bütün çayır hücrelerine aynı tikte uygulanır.
- **Tınaz çalışma payı**: eksene dik rüzgâr 4 yönün 2'si; durgun %15. Yani tınaz ≈ %42
  zaman ayırır (toz-saman ayrımı ancak şiddet 1 dik, ≈ %17). Bu bilinçli bir "fırsat
  ayırıcı"dır (hep çalışan ayırıcı kalbur/tambur/şeytan yelidir); paneli şimdiki hâlini yazar
  ("şimdi: dik esinti, toz ayrılıyor" / "paralel: hepsi dipten").
- **Nem** yalnız eşya türüdür (`yas-ot`). Nereye giderse: pres ve kıyıcı reddeder (girişte
  bekler, rozet "nemli"), kalbur sıvanır, tınaz ve şeytan yelinde ağır tarafa düşer, ambarda
  çürür (her 1200 tikte ⌈n/4⌉ → `curuk-ot`), kurutma ambarı ve ot savurucu kurutur, dalga 2
  balya sarıcı silaj yapar. Üç yol (hava / güç / silaj) = üç ödünleşim.
- **Görsel** (`ozellik/ciftlik/gorsel/hava.js`): sürüklenen bulut gölgeleri, yağmur çizgileri,
  rüzgâr yönünde savrulan saman zerreleri; `sade-hareket` tercihinde yalnız HUD simgesi.

## 4 Paslı çivi, taş ve tıkanma
- Kaynak: harman alanındaki gömülü çivi (120 + 8 öğretici; araba başına 3) ve taş (90; araba
  başına 2); huniler ve taş toplayıcı onları akışa sokar. Sıklık: pasif huni ≈ 7 dk'da bir
  çivi, ≈ 9 dk'da bir taş (`esyalar.md` §4). Çayırda çivi yoktur (temiz ama nemli kaynak).
- **Ne yapar** (normal moddaki süre cezası çiftlikte yok; bedel hattın durmasıdır):
| Nereye girerse | Sonuç | Çözüm |
|---|---|---|
| Bant, çatal, oluk, menfez | sorun yok, akar | |
| Balya presi | **sıkışma**: durur, kırmızı ünlem | "Temizle" (bedava, eşya oyuncuya) |
| Çekiçli kıyıcı | **çekiç kırılır**: eşya çıkıştan atılır, durur | "Onar" 50 kuruş + 200 tik |
| Kurutma ambarı, defter masası | reddeder, giriş bekler | ayıklayıcı ya da kol |
| Komşu kapısı | siparişte yoksa atılır; "çivisiz" damga siparişinde sayaç sıfırlanır | mıknatıs |
| Sandık, ambar | saklanır | yaba kolu ile çıkar |
- **Önleme** her zaman en az iki yolla: mıknatıs (oluk/tambur), hafiflik (tınaz/şeytan yeli
  ağır tarafı), kalbur (iri), yaba kolu filtresi. Taş manyetik değildir: kıyıcı önünde
  mıknatıs yetmez; hafiflik ya da kol gerekir (ikinci ders).
- **Görünürlük**: tıkanan parçada rozet; **sorun listesi** (HUD'da "3 sorun" düğmesi):
  dokununca kamera parçaya gider; ilk sıkışmada bir kez açıklama notu. Hiçbir tıkanma
  sessiz değildir (doymuş mıknatıs ve sıvalı kalbur da rozet gösterir).

## 5 İğneler ve harman arabası
- **Türler**: iğne (ince, manyetik), çuvaldız (iri, manyetik), altın iğne (ince, manyetik
  değil). Başta 5 iğne + 1 çuvaldız + (%30) 1 altın; "ilk iğne" sığ ve ilk huninin
  yanında (`esyalar.md` §4).
- **Bulma yolları**: elle (açıkta, normal mod kuralı), oluk mıknatısı "Boşalt", sıkışmış
  presi "Temizle", Defter masası → hepsi **tam ödül** (sandık/ambar girişi: **yarı** kuruş,
  defter ve kutlama tam): iğne 250, çuvaldız 400, altın 1500
  kuruş + defter + kutlama (olay `ciftlik-igne { kaynak: 'el'|'parca', tur, x, y }`, damga
  sesi, parıltı, "İğne no. 7" kâğıdı). Kapı ya da gübre çukuru iadesi: defter + kutlama,
  kuruş yok ("Komşu iğneni geri getirdi").
- **Aranan iğne**: `tarla.igne` alınmamış ilk iğne türünü gösterir (parıltı, dedektör,
  kulak, kenar işareti aynen çalışır; `mimari` §1). Dedektör ve mıknatıs hakkı: başta 1'er,
  her harman arabası +1, en çok 3.
- **Harman arabası** (`ciftlik/araba.js`): her 6000 tikte bir yoklanır; son arabadan beri
  harman alanından **15.000 kat** tüketildiyse (`c.tuketilenKat`) araba gelir (Hat A ≈ 12
  dk, tek huni ≈ 25 dk; "toplam stok %85" gibi bir eşik ilk arabayı ≥ 1 saate iter ve iğne
  akışını keser). Stok net 5 bin kat/araba azalır: ≈ 100 araba (Hat A ile ≈ 20 saat). Stok %10'un
  altına inerse eşik 8.000'e düşer (tarla hiç bitmez). 600 tik önce duyuru (kenar
  işareti, araba sesi, HUD notu "Harman arabası 30 sn sonra kuzey köşeye"). Döküm yeri
  tohumdan 8 adaylık listeden sırayla ilk uygun olan (merkezinin 6 karo çevresinde parça
  tabanı yok); hiçbiri uygun değilse araba bekler ("döküm yeri yok" notu). Yığın: r 12
  hücre, tepe 45 kat (≈ 10 bin kat ≈ 850 tutam) + 1 iğne türü, 3 çivi, 2 taş, 1 buluntu.
  Arabalar başka saman korunumu kaynağıdır (sayaç `c.arabaKat`).
- Böylece iğne hep vardır ama **kazanılır**: yığını hızlı işleyen çiftlik daha sık iğne
  görür; yavaş çiftlik eski yığınlarındaki iğneleri arar.

## 6 Buluntu defteriyle bağ
- Çiftlik **aynı** defteri doldurur (`haystack-hunt:buluntu-defter`, `buluntuEkle` aynen);
  defter şeması (`surum: 1`, tür → adet) **değişmez**: kayıtta `kaynak` alanı yoktur ve
  `defterTemizle` bilinmeyen alanı atardı. "Çiftlikte bulunanlar" süzgeci çiftliğin kendi
  sayacından (`ilerleme.defterCiftlik: {tur: adet}`) gelir. Ayar "Ortak deftere de yaz" (varsayılan
  açık): otomasyonun normal modun koleksiyonunu doldurması sahibin isteğidir; kapatılırsa
  çiftlik yalnız kendi sayacını doldurur. Defter penceresine iğne sayacı satırı eklenir.
- Gömülü buluntular `KATALOG` nadirlik ağırlıklarıyla seçilir (başta 8, araba başına 1).
  Otomasyonla toplama eğlenceli bir koleksiyon motoru olur; nadir sipariş kartları
  (`ekonomi.md` §3) yalnız defterde en az bir kez görülmüş türlerden üretilir. (Çiftlikte
  gömülü buluntular 40 + araba başına 1; D10'un 8 farklı türü ≈ 1-1,5 saatlik hat işidir.)
- Ayıklama bulmacaları: **toka** iğneyle aynı kaba yolu izler (yalnız tür filtresi ayırır),
  **tüy/mektup/yonca** tozla savrulur, **kuruş/yüzük/saat** mıknatısa yakalanmaz. Kaçan
  buluntu kaybolmaz (iade); yalnız kuruşu kaçar.

## 7 Durum rozetleri ve olaylar (ortak sözlük)
Rozet kodları (kural `p.durum` olarak üretir; çizim `arayuz.md` §7'de):
`guc-yok`, `guc-az` (< %50), `ac` (girdi yok), `cikis-dolu`, `sikisti` (sert cisim),
`kirik` (kıyıcı), `doymus` (mıknatıs), `sivali` (kalbur), `nemli` (yaş ot reddi),
`yabanci` (kabul edilmeyen tür), `hava` (yağmur/rüzgâr bekliyor), `yakit-yok`, `kapali`
(savak/kile), `essiz` (menfez/kağnı), `ayar` (filtre seçilmemiş), `dolu` (depo).
Olay kataloğuna eklenecekler (`olaylar.js`, "Çiftlik" bloğu; `mimari` §7'dekilere ek):
`hava-degisti {dilim, yon, siddet, gok}`, `harman-arabasi {asama: 'duyuru'|'dokum', x, y}`,
`damga-basildi {damga, acilanlar}`, `parca-durum {parca, durum}` (yalnız değişince),
`ciftlik-cevrimdisi {dk, kazanc}`. Eşya başına olay yok.
