# Ekonomi, siparişler ve ilerleme

## 1 Kaynak akışı
```
 HARMAN ALANI (yığın, sonlu)        ÇAYIR (yenilenir)            EKİN (dalga 2)
 saman + toz 1/8 + gömülü          yaş ot                        başak
      │ emici huni / taş toplayıcı      │ tırmık kolu → huni           │ orak makinesi
      ▼                                  ▼                              ▼
 AYIKLAMA  mıknatıs · kalbur · tınaz · şeytan yeli            KURUTMA  ot savurucu · ambar
      │ saman            │ toz, çürük          │ iğne, buluntu      │ kuru ot
      ▼                  ▼                     ▼                    ▼
 İŞLEME  pres → balya    gübre çukuru ──► çayır ×2   DEFTER MASASI  pres → ot balyası
         kıyıcı → kıyım                              (kuruş + defter) kıyıcı → kıyım
      │                                                              │
      └──────────────► KOMŞU KAPISI (sipariş / taban satış) ◄─────────┘
                       │ kuruş                 lokomobil ◄─ balya, kıyım (yakıt)
                       ▼
            yeni parça ── damga siparişi ──► yeni aile açılır
```
Zincir derinliği en çok 3 adım (topla → ayıkla/kurut → işle); dalga 2'de un ve karma yem
ile 4. Harman alanı sonludur ama **harman arabası** (`sistemler.md` §5) azaldıkça yeni yığın
döker; çayır kendiliğinden büyür. Tarla hiç "biten bir kaynak" olarak oyunu kilitlemez.

## 2 Para: kuruş
- Tek birim **kuruş** (eski bakır kuruş zaten bir buluntu). Başlangıç **300**.
- Parçalar kuruşla kurulur (`parcalar.md`), **söküm %100 iade**. Taşımak = sök + kur:
  bedava. Yeniden düzenlemek asla cezalandırılmaz (Shapez dersi; oyuncu görüşü §2).
- Gelir: (1) siparişler (asıl), (2) **Komşu kapısında taban satış**: kapının panelinde
  "Fazlasını sat" (varsayılan açık) iken siparişe uymayan ama `deger > 0` eşya taban
  fiyattan satılır; (3) iğne ve buluntu: Defter masası, elle alma, "Boşalt" ve "Temizle"
  tam değer öder (sandık/ambar girişi yarısını); kapı ve gübre çukurunun iadesi deftere
  yazar ama kuruş vermez.
- Gider: parça, kıyıcı onarımı (50), dalga 2'de değirmen onarımı (80) ve iki **bilinçli kuruş
  kuyusu** (kapı panelinde): **Araba çağır** 300 (6000 tikte en çok 1: hemen yığın + iğne
  ailesi + dedektör/mıknatıs hakkı; `c.arabaKat`), **Çayır genişlet** 400/800/1200 (çayıra +6
  karo sütunu, en çok 3; komut `cayirGenislet`). Başka gider yok (bakım ücreti, kira, vergi yok).
  **Kuyu tabanı**: kuyu harcaması kuruş + kurulu parçaların iade değerini `KUYU_TABAN` (100:
  huni + 30 bant) altına indiremez (red `'taban'`); kuruş bitse de her şey sökülünce yeni ham
  hat kurulur (soft-lock testi).
- **Kuruşun rolü (dürüst not)**: 30 parçanın tamamı ≈ 2400 kuruş, D1-D8 ödülleri ≈ 3950; yani
  oyuncu ≈ D6'dan (35. dk) sonra her şeyi alabilir. Kuruş **ilk saatte kapıdır** (kaç parça
  birden), sonra kuyular ve koleksiyon içindir; sonraki hedefler damga, defter ve rozettir.
  Söküm %100 iade olduğundan kuruş tükenip oyun kilitlenmez (en kötü: her şeyi sök, 300 + gelir).
- Taban fiyatlar `esyalar.md` §2 `deger`: tutam 1, kuru ot 3, kıyım 2, saman balyası 12,
  ot balyası 30, karışık balya 3. Tutam başına değer işlenince artar: saman 1 → balya 1,5
  → kıyım 2; ot 3 → ot balyası 3,75. **Temiz** işleme kârlıdır ama uçurum değildir; tozlu
  karışık balya (8 tutam → 3 kuruş) ham satıştan (≈ 7) **az** öder: bu, ayıklamanın teşviğidir.
- Atığın da yeri var: karışık balya lokomobilde yakıt (saman balyasıyla aynı 1200 tik) ve
  gübre çukurunda 8 puan; toz gübre ve çöp siparişi; çivi ve taş çöp siparişi.

**Komşu kapısı** (`komsu-kapisi`, kurulu, 2×2, G iki iç kenar): sınırsız alır, asla
tıkanmaz. Gelen eşya sırayla: etkin siparişlerden birine uyuyorsa sayılır (önce damga,
sonra soldan sağa); uymuyorsa "fazlasını sat" açıksa satılır; değilse atılır ("boşa
giden" sayacı). İğne/buluntu uymuyorsa oyuncuya iade (`esyalar.md` §5).

## 3 Siparişler
**Pano**: üç kart. Kart 1 = sıradaki damga siparişi (hepsi bittiyse dönen sipariş);
kart 2-3 = dönen siparişler. Biten kartın yerine 200 tik sonra yenisi gelir. Dönen kart
"Geri çevir" ile değiştirilir (kart başına 1200 tik bekleme). Sipariş **başarısız olmaz**,
süresi dolmaz (süreli türde yalnız ikramiye kaçar).

**Türler** (her biri bir aileyi çalıştırır):
| Tür | Örnek kart | Zorladığı | Çarpan |
|---|---|---|---|
| hacim | "Muhtar: 12 saman balyası" | toplama, işleme hızı | ×2 |
| temiz | "Ahırcı: tozsuz 40 kuru ot" (kapıda hiçbir karta uymayan her eşya −%10, en az %50) | ayıklama | ×3 |
| karışım | "Kışlık: 6 ot balyası + 30 kıyım" | iki hat, çatal/kile | ×2,5 |
| süreli | "Pazar arabası 5 dk'da kalkıyor: 10 balya" | hat hızı, tampon | ×3 zamanında, ×1,5 geç |
| çöp | "Kümes altlığı: 30 toz", "Demirci: 4 paslı çivi", "Duvarcı: 6 taş" | atığı ayırıp toplamak | sabit: toz 2/eşya, çivi ve taş 12/eşya |
| nadir | "Komşunun kızı bir düğme arıyor" (açıkta görülmüş türlerden) | kol filtresi | masa değeri ×1,5 |
Ödül = Σ miktar × `deger` × çarpan (çöp türünde `deger` yerine tablodaki sabit). Kart ödülü önceden yazar.
Nadir siparişe giden buluntu da deftere yazılır (bulunmuş sayılır), eşyanın kendisi komşuya gider.

**Üretim** (`ekonomi/siparis.js`, saf): `siparisUret(tohum, sira, { acik, gorulen, onceki, d })`; zar
`uretec(tohum ^ (sira × 0x9e3779b1))`. Yalnız **üretilebilir** ürünler seçilir (açık
parçalarla zinciri kurulabilen). Tür ağırlıkları: hacim 40, temiz 20, karışım 15, süreli
10, çöp 10, nadir 5. Aynı tür arka arkaya iki kez gelmez (bir önceki kartla kıyas).
**Boy**: `miktar = yuvarla5(taban × (1 + 0,25 × d))`, `d` = o sırada etkin damganın numarası
(D2 iken 2; hepsi bittiyse ya da D9-D10 etkinken 8). Taban (≈ tek tipik hattın 3 dakikası): tutam 120, kuru ot 80,
kıyım 150, saman balyası 20, ot balyası 15, toz 30. **Çivi ve taş siparişleri damgayla
büyümez**, sabit: çivi 4, taş 6 (çivi ≈ 3-7 dk'da bir geldiğinden; tutucuda ya da sandıkta
biriken stok yaba koluyla kapıya verilir); nadir kartlar zaten 1 eşyadır.
Örnek: D2'de tutam 180 (huni 44/dk → 4 dk); D5'te saman balyası 45 (Hat A 11/dk → 4 dk); D8'de ot balyası 45 (Hat B 10,5/dk → 4,3 dk). Damgalar hattı da
büyüttüğü için kart 3-8 dakikada kalır. Süreli kartlar damgadan bağımsız taban boyda,
6000 tik (5 dk) sürelidir.

## 4 Damgalar (kilometre taşları) ve kilit açma
Damga siparişi panoda kart 1'dir; teslim edilince damga basılır, ödül ve parçalar açılır.
| Damga | Koşul | Ödül | Açar | Tahmini dk |
|---|---|---|---|---|
| D1 İlk teslim | 30 saman tutamı | 150 | çatal, birleştirme oluğu, oluk mıknatısı | 2 |
| D2 Çivisiz | 40 tutam; açıkken kapıya çivi gelirse sayaç sıfırlanır | 200 | yaba kolu, defter masası, menfez | 6 |
| D3 İlk iğne | herhangi yolla 1 iğne türü | 300 | el krankı, şaft, balya presi, yel değirmeni | 8-10 |
| D4 İlk balyalar | 10 balya (her tür; tozlu karışık da sayılır) | 400 | kalbur, volan | 15 |
| D5 Temiz harman | 20 saman balyası (karışık sayılmaz: toz ayıklanmalı) | 500 | şeytan yeli, mıknatıslı tambur, taş toplayıcı | 25 |
| D6 Kümes altlığı | 30 toz | 600 | tırmık kolu, ot savurucu, gübre çukuru, tınaz | 35 |
| D7 Kuru ot | 60 kuru ot | 800 | lokomobil, ambar, çekiçli kıyıcı, kurutma ambarı | 50 |
| D8 Kışlık | 10 ot balyası + 60 kıyım | 1000 | kantar, kile sayacı, rüzgâr gülü, savak (mantık, isteğe bağlı) | 65 |
| D9 Usta harmancı | 30 ot balyası; toplam 10 iğne bulunmuş | 1200 | dalga 2 (bkz. `parcalar-dalga2.md`) | |
| D10 Defter yarısı | çiftlikte 8 farklı buluntu türü defterde | 1200 | 〃 | |
| D11 Ahır dolusu | 20 ot balyası + 100 kıyım | 1500 | 〃 + ekin şeridi | |
| D12 Değirmen | 40 tane | 1500 | 〃 | |
| D13 Fırın | 15 un | 1800 | 〃 | |
| D14 Kış hazırlığı | 10 silaj balyası + 20 karma yem | 2000 | 〃 | |
**Açılış hızı**: parça başına ≈ 2,4 dk (3-4 parça/damga; D4 yalnız 2). Yeni fizik fikirleri
damgalara yayılır (öğrenme duvarı): D3 enerji + pres, D4 tek ayıklayıcı (kalbur), D5 güçle
çalışan ayıklayıcılar, hava (tınaz) D6, mantık en sona (D8) ve hiçbir damgayı gerektirmez.
D9 ve D10'un koşulları ilk sürümün parçalarıyla da yapılabilir: ilk sürümde basılır,
yalnız kuruş ve rozet verir, açtıkları dalga 2 parçaları dalga 2 gelene dek palette görünmez.
Her damga koşulu yalnız **önceki** damgaların açtığı parçalarla yapılabilir (denetim
testi: `acilis.js` için "her damga erişilebilir" testi, §6). D1-D8 ilk sürüm için
≈ 1-1,5 saatlik yönlendirilmiş içerik; sonrası dönen siparişler, optimizasyon ve iğneler.
**Usta rozetleri** (isteğe bağlı, yalnız defterde damga; parça açmaz): "Sessiz hat"
(10 dk tıkanmasız ≥ 15 parça), "Rüzgâr ustası" (tınazla 500 eşya), "Sıfır çöp" (1 saat
boşa giden 0), "Altın iğne". Ölçüt çeşitliliği (hız, kayıp, enerji) bunlardan gelir.

## 5 Kalıcı ilerleme
| Anahtar | İçerik | Neden orada |
|---|---|---|
| `haystack-hunt:ciftlik` (dünya) | tarla, gömülü, parçalar, hatlar, depolar, **kuruş**, pano ve sipariş ilerlemesi, tik, zar, son 10 dk istatistik | dünyaya bağlı her şey |
| `haystack-hunt:ciftlik-yedek` | bir önceki dünya | bozulmaya karşı |
| `haystack-hunt:ciftlik-ilerleme` | damgalar (→ açık parçalar), usta rozetleri, şablonlar, toplamlar (iğne, balya…), ayarlar (kilit kaynağı, çevrimdışı, inşa duraklatır) | dünyadan bağımsız kalıcılık |
| `haystack-hunt:buluntu-defter` | ortak defter, **şeması değişmez** (`buluntuEkle`); çiftliğe özel sayaç ilerleme kaydında (`defterCiftlik`) | proje sahibinin isteği |
**Mimariden ayrılış**: `mimari` §5 kuruşu/siparişleri ilerleme anahtarına koyuyordu; burada
**dünyada**. Gerekçe: yedekten dönme ya da dışa/içe aktarma ile aynı parçaların iadesi
iki kez alınamasın; dünya bozulursa damgalar yine kaybolmaz.
**Yeni çiftlik** (menü, onaylı): yeni tohum, dünya sıfır, kuruş = 300 + 100 × damga sayısı;
damgalar ve açık parçalar kalır, tamamlanan damga siparişleri panoya gelmez.

## 6 Kilit kaynağı katmanı (araştırma isteğe bağlı)
Kilit verisi tek tabloda, kural kodundan ayrı: `js/kural/ciftlik/ekonomi/acilis.js`.
```js
export const ACILIS = {
  'balya-presi': { damga: 'D3', arastirma: { kurus: 300, numune: { saman: 40 } } },
  // ... her parça için bir satır; T0 parçaları { damga: null }
};
export function acikMi(tur, ilerleme) { /* kaynak: 'damga' | 'arastirma' | 'acik' */ }
```
- `damga` (**varsayılan**): parça, damgası basılınca açılır.
- `arastirma`: damga siparişleri yine gelir ama yalnız kuruş verir; parçalar "Usta defteri"
  penceresinde **araştırılır**: bedel = parça maliyeti × 2 kuruş + o damga koşulunun ürününden
  numune (depolardaki stoktan düşülür; ör. kalbur: 5 saman balyası). Sıra serbesttir ama bir
  parçanın numunesi yalnız açık parçalarla üretilebilir olmalıdır (aynı erişilebilirlik testi).
- `acik`: her şey açık (kum havuzu); kuruş geçerli.
Seçim yalnız yeni çiftlik kurulurken (menü satırı "Kilit: Damga · Araştırma · Hepsi açık").
Araştırma penceresi ayrı modüldür (`ozellik/ciftlik/arastirma.js`); hiç yazılmazsa oyun
damga ile eksiksiz çalışır. Proje sahibi "güzel olursa" dediği için ilk sürümde **yalnız
veri sütunu ve `acikMi` dalı** yazılır; pencere dalga 2'de karar sonrası.

## 7 Çevrimdışı ilerleme (isteğe bağlı, varsayılan açık)
`ciftlik/ekonomi/cevrimdisi.js` (saf): `verim[tur]` = son 5 dk'da **depolara** (sandık, ambar, silo)
giren eşya/dk ve `satis` = son 5 dk'da Komşu kapısının **taban satışından** gelen kuruş/dk.
Açılışta `dk = min(480, geçen dk)`; `kazanc = floor(verim × dk × 0,5)` depoların boş yeriyle
kenetli ve depolara orantılı; `kurus += floor(satis × dk × 0,5)`. **Değişmeyenler**: tarla,
gömülü nesneler, hatlar, siparişler (sipariş çevrimdışı dolmaz), yakıt, damga. İğne
çevrimdışı bulunmaz. Kapıya satan oyuncu da depolayan oyuncu da boş dönmez.
Açılışta kâğıt fiş: "Sen yokken (3 sa 12 dk): 312 saman tutamı, 14 saman balyası ambara
girdi. Ambar doldu." Ayar: "Ben yokken çiftlik çalışsın" (ilerleme kaydında). Gerekçe:
otomasyon kuran oyuncu kapalıyken de sürmesini bekler (oyuncu görüşü §5), %50 ve depo
tavanı aktif oyunu yemez; dönüşte dolu ambarı teslim etmek oturumun ilk hedefi olur.
Tavan **depo kapasitesidir** (ambar 600 eşya: balya için ≈ 55 dk Hat A; 8 saatin ürününü
tutmak için ≈ 9 ambar gerekir; fiş "Ambar doldu" der, kayıp değil sınır olarak okunur).
**Saman korunumu**: çevrimdışı kazanç tarlayı eksiltmez (bilinçli: tarla "değişmez"); bu
yüzden `c.cevrimdisiKat` ayrı kaynak sayacıdır (`esyalar.md` §4); tohum/harman arabası tetiği
(`c.tuketilenKat`) çevrimdışı sayılmaz.

## 8 Denge: başlangıç sayıları ve referans hatlar
Hızlar (tam güç, eşya/dk): bant 270 · huni 50 (güçlü 100) · tırmık kolu çayırda ≈ 42 ·
taş toplayıcı ≤ 20 · tambur 240 · kalbur 200 · tınaz 300 · şeytan yeli 200 · pres 100
tutam (12,5 balya) · kıyıcı 120 · kurutma ambarı 48 · ot savurucu 54/45/27/0 · yaba kolu 75.
Güç (bg): huni 4 (isteğe bağlı) · tırmık 8 · taş toplayıcı 6 · tambur 4 · şeytan yeli 6 ·
ot savurucu 3 · kurutma 8 · pres 4/30 (ort. ≈ 15) · kıyıcı 12. Üretim: krank 6 · yel
0/8/16/24 · lokomobil 40 · volan ±12/30.

**Hat A, saman balyası (D6 sonrası; D5'te toz kapıya atılır)**:
2 huni (≈ 2 × 44 saman + 2 × 6 toz) → birleştirme oluğu (100/dk) → oluk mıknatısı (çivi,
iğne, çuvaldız tutucuya; yaba kolu → Defter masası) → şeytan yeli (200/dk ≥ 100) → ön: saman
88/dk → pres (≤ 100) → **11 balya/dk**; sol: toz 12/dk → gübre çukuru (yutar 10/dk; 120
kapasite +2/dk ile ≈ 60 dk'da dolar → ikinci çukur ya da toz siparişi); sağ: ağır (taş,
manyetik olmayan metal) → kalbur → ince (altın iğne, kuruş, yüzük) defter masası, iri (taş,
nal) sandık. Güç: 6 + ≈ 15 = 21 bg ort., tepe 36. **Rüzgârla**: 2 yel ≈ 8,4 balya/dk (%76),
3 yel ≈ 9,1, 4 yel ≈ 9,4 (%85; durgun dilimde hat durur, volan kapatmaz); tam 11 için 1
lokomobil (yük %50 → 0,5 balya/dk yakar = çıktının %5'i) + yel. Gelir: 11 × 12 = 132
kuruş/dk taban (yel ile ≈ 100), hacim siparişiyle 2×.
**Hat B, ot balyası (D7 sonrası)**: 2 tırmık kolu + 2 huni (çayırda ≈ 84 yaş ot/dk) →
2 ot savurucu (güneşte 108 ≥ 84; bulutluda 54) → çatal "taşma" → fazlası kurutma ambarı
(48/dk) → pres → **10,5 ot balyası/dk** = 315 kuruş/dk taban. Güç ≈ 16 + 6 + 8 + 14 = 44 bg
→ lokomobil + yel. Çayır sürdürülebilirliği: halka ≈ 100 hücre × 5 kat/dk = 500 kat/dk ≈ 42
tutam/dk/tırmık; gübreli ×2 (huni 50 tavanına dayanır, güçlü huni 100).
**Hat C, kıyım**: 3 huni → mıknatıs + şeytan yeli (taş ve çivi şart; tınaz ≈ %42 çalıştığından
güvenilmez) → kıyıcı
(120/dk) → 240 kuruş/dk taban. Tutam başına en iyi saman getirisi; bedeli temizlik.
Harman alanı stoku ≈ 40 bin tutam: Hat A ile ≈ 7 saat; arabalar (15 bin kat tüketimde bir,
10 bin kat döker) net 5 bin ekleyerek tüketimi geri çeker, stok bitmez. Sayı değişikliği
yalnız `ciftlik/ekonomi/denge.js` sabit tablosundan (tek kaynak); bu bölüm ondan türetilir.
Denge doğrulaması: **turnuva/uzun simülasyon yok**; yalnız `tests/ciftlik-denge.test.js`
referans hatları 6000 tik koşar ve oranların ±%10 içinde olduğunu doğrular (rüzgâr **sabit
şiddet 3**, yön sabit; rüzgârlı verim ayrı bir "beklenen değer" testidir: 2 yel ≈ %76).
