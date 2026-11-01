# Eşyalar ve tarladan çıkış

Eşya hatta yalnız bir **tür kodudur** (Uint16; `mimari` §3): kimliği, nemi, yaşı yoktur.
Bir eşyanın bütün davranışı türünün özellik satırından gelir. Nem bu yüzden ayrı türdür
(`yas-ot` / `kuru-ot`). Tanım: `js/kural/ciftlik/esya.js` → `esyaTanimla(kod, {...})`.

## 1 Fizik eksenleri (ayıklayıcıların okuduğu alanlar)
| Alan | Değerler | Okuyan parça (ilk sürüm) | Dalga 2 |
|---|---|---|---|
| `hafiflik` | 0 ağır · 1 hafif · 2 çok hafif | tınaz (rüzgâr), şeytan yeli (fan) | hava borusu |
| `boyut` | `ince` · `iri` | kalbur | |
| `manyetik` | true / false | oluk mıknatısı, mıknatıslı tambur | metal dedektörü |
| `nem` | 0 kuru · 1 nemli | pres ve kıyıcı reddeder, kalbur sıvanır, ambar çürütür | |
| `sert` | true / false | pres sıkışır, kıyıcının çekici kırılır | |
| `uzunluk` | `kisa` · `uzun` | (yalnız yaba kolu filtresi) | çentikli silindir |
| `yogunluk` | 0 düşük · 1 orta · 2 yüksek | | yerçekimi masası |
Ek alanlar: `saman` (içerdiği kat; korunum testi için), `deger` (Komşu kapısında taban
satış kuruşu; 0 = satılmaz), `sinif` (`saman`, `urun`, `igne`, `metal`, `cop`, `buluntu`;
yaba kolu filtresi ve rozet metni için), `renk` ve `ad`.

Kural: **bir eşyayı öbüründen ayırmanın en az iki yolu olmalı** (biri hızlı-kaba, biri
yavaş-kesin: yaba kolu tür filtresi her zaman kesin yoldur). Tablo bunu sağlayacak biçimde
seçildi; değiştirirken §3'teki "ayırma haritası"nı yeniden kontrol et.

## 2 İlk sürüm türleri
| Kod | Kod adı | Ad | haf. | boyut | mık. | nem | sert | uzun. | yoğ. | saman | değer | sınıf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `saman` | Saman tutamı | 1 | iri | - | 0 | - | uzun | 0 | 12 | 1 | saman |
| 2 | `yas-ot` | Yaş ot | 0 | iri | - | 1 | - | uzun | 0 | 12 | 0 | saman |
| 3 | `kuru-ot` | Kuru ot | 1 | iri | - | 0 | - | uzun | 0 | 12 | 3 | saman |
| 4 | `toz` | Toz ve kırıntı | 2 | ince | - | 0 | - | kisa | 0 | 12 | 0 | cop |
| 5 | `kiyim` | Kıyım (yem) | 1 | ince | - | 0 | - | kisa | 0 | 12 | 2 | urun |
| 6 | `balya-saman` | Saman balyası | 0 | iri | - | 0 | - | uzun | 1 | 96 | 12 | urun |
| 7 | `balya-ot` | Ot balyası | 0 | iri | - | 0 | - | uzun | 1 | 96 | 30 | urun |
| 8 | `balya-karisik` | Karışık balya | 0 | iri | - | 0 | - | uzun | 1 | 96 | 3 | urun |
| 9 | `curuk-ot` | Çürük ot | 0 | iri | - | 1 | - | kisa | 0 | 12 | 0 | cop |
| 10 | `igne` | İğne | 0 | ince | ✓ | 0 | ✓ | uzun | 2 | 0 | 250* | igne |
| 11 | `cuvaldiz` | Çuvaldız | 0 | iri | ✓ | 0 | ✓ | uzun | 2 | 0 | 400* | igne |
| 12 | `altin-igne` | Altın iğne | 0 | ince | - | 0 | ✓ | uzun | 2 | 0 | 1500* | igne |
| 13 | `civi` | Paslı çivi | 0 | iri | ✓ | 0 | ✓ | kisa | 2 | 0 | 0 | metal |
| 14 | `tas` | Çakıl taşı | 0 | iri | - | 0 | ✓ | kisa | 1 | 0 | 0 | cop |
`*` İğne değeri yalnız **Defter masası**nda ödenir (Komşu kapısı iğne almaz, §5).
Balya içindeki 8 tutam `saman: 96` ile korunur; karışık balyanın içeriği önemsenmez.

**Buluntular** (kod 100 + `KATALOG` sırası; `buluntu:<tur>`, sınıf `buluntu`). Değer
nadirliğe göre, yalnız Defter masasında: yaygın 30, seyrek 60, nadir 120, çok nadir 300.
| tur | haf. | boyut | mık. | sert | uzun. | yoğ. | not |
|---|---|---|---|---|---|---|---|
| dugme, bilye, kupe | 0 | ince | - | ✓ | kisa | 1 | ince kalbura düşer |
| yuksek | 0 | ince | ✓ | ✓ | kisa | 2 | iğneyle aynı kaba yolda |
| toka | 0 | ince | ✓ | ✓ | uzun | 2 | **taklitçi**: iğneden yalnız tür filtresi ayırır |
| anahtar, caki | 0 | iri | ✓ | ✓ | uzun | 2 | çuvaldızla aynı kaba yolda |
| nal, can | 0 | iri | ✓ | ✓ | kisa | 2 | çiviyle aynı kaba yolda |
| kurus, yuzuk | 0 | ince | - | ✓ | kisa | 2 | mıknatıs görmez, ince |
| kasik, saat, pusula | 0 | iri | - | ✓ | uzun/kisa | 2 | mıknatıs görmez, iri metal |
| oyuncak, cingirak, tarak | 0 | iri | - | ✓ | kisa/uzun | 1 | taşla aynı kaba yolda |
| tuy, mektup, yonca | 2 | iri/ince | - | - | uzun/kisa | 0 | **tozla savrulur** |
Kesin sütunlar `esya.js`'te tek tabloda; burada aynı satırı paylaşanlar gruplandı (kasik
uzun, saat ve pusula kısa; tarak uzun, ötekiler kısa; tuy ve mektup iri, yonca ince).

## 3 Ayırma haritası (hangi kaba yol neyi neyle bırakır)
| Akış | Hafiflik (tınaz/şeytan yeli) | Mıknatıs | Kalbur |
|---|---|---|---|
| saman/kuru ot | hafif tarafı | geçer | iri |
| toz | çok hafif | geçer | ince |
| yaş ot | **ağır** tarafı (ıslak uçmaz) | geçer | iri, kalburu sıvar |
| iğne | ağır | tutulur | ince |
| çuvaldız | ağır | tutulur | iri |
| altın iğne | ağır | **geçer** | ince |
| çivi | ağır | tutulur | iri |
| taş | ağır | geçer | iri |
Klasik bulmacalar: **iğne ↔ çivi** = mıknatıstan sonra kalbur (ince/iri). **Altın iğne**
= mıknatıstan geçen ağır akışta kalbur (ince) ya da kol filtresi. **Toka** = kol filtresi.
**Tüy/mektup/yonca** = toz tarafından kol filtresiyle çekilir, yoksa çöp çukuru onları
oyuncuya iade eder (§5). Dalga 2'de uzunluk (iğne/kuruş) ve yoğunluk (taş/metal) eklenir.

## 4 Tarladan çıkış
**Arazi** (`js/kural/ciftlik/arazi.js`, tohumdan; normal `tarlaKur`'a dokunmaz):
- *Harman alanı*: tarlanın çayır dışı kısmı. Yığınlar `tarlaKur` formülüyle, çiftlik ayarı
  `yigin: { taban: 6, ek: 3, r: [14, 18], t: [50, 55] }` → toplam ≈ 450-550 bin kat
  (≈ 40 bin tutam). Çayır karolarında yığın hücresi sıfırlanır.
- *Çayır*: 24×12 karo (48×24 hücre), garajın ve kapının bulunmadığı köşelerden biri
  (tohumdan). `zemin[karo] = CAYIR`; başlangıçta her hücre 12 kat (düz, kaymaz).
- *Komşu kapısı*: garajın karşı kenarının ortasında 2×2 karo, kurulu gelir, sökülmez.
- Yasak: garaj park alanı (`mimari` §2) ve tarla kenarının 1 karosu.
- Kurma eşiği (`h ≤ 8`) **çayır karolarında uygulanmaz**: ayakta ot 12 kat olduğu halde
  her şey kurulur; altındaki ot `mimari` §2 kuralıyla çevre halkasına dağıtılır. Parça
  altındaki çayır hücresi büyümez.

**Toplama kuralı** (huni ağzı ve tırmık yığma noktası için, `ciftlik/saman.js`):
1. Ağızdan alınan kat `c.samanBirikim`de birikir; 12'ye varınca bir tutam eşyası doğar.
2. Türü **ağız karosunun zemininden**: çayır → `yas-ot`; harman alanı → `saman`, ama
   `c.zar` ile her tutamın 1/8'i (`zar < 128/1024`) `toz` olur. Çayırdan toz çıkmaz.
3. Aynı tik `gomuluCikar`: ağız hücrelerinde `h ≤ z` olan gömülü nesne kendi türüyle eşya
   olur (olay `gomulu-cikti`). Bir tikte en çok bir eşya çıkar; fazlası sonraki tike kalır.
4. Çıkış tamponu doluysa toplayıcı tarladan almayı keser (saman yerinde kalır).

**Gömülü nesneler** (`ciftlik.gomulu`; `{x, y, z, tur, alindi}`):
| | Başlangıç | Her harman arabası |
|---|---|---|
| iğne | 5 (biri "ilk iğne") | 1 (türü: %80 iğne, %15 çuvaldız, %5 altın iğne) |
| çuvaldız | 1 | (yukarıda) |
| altın iğne | tohum zarı < 0,3 ise 1 | (yukarıda) |
| paslı çivi | 16 | 2 |
| çakıl taşı | 30 | 4 |
| buluntu | 8 (`KATALOG` ağırlıklarıyla) | 1 |
Yer seçimi `civileriSakla` deseniyle: `h ≥ 25` hücreler, `z = h × (0,1 + 0,5·zar)`,
birbirinden ≥ 6 hücre. **İlk iğne**: öğretici huni hayaletinin ağzından 2-4 karo içeride,
`z ≥ h − 12` (sığ). Her tür kendi karıştırma sabitiyle tohumlanır (`civi.js` deseni).

**Açıkta kalma ve yuvarlanma** (yalnız çiftlik): hücresinde `h ≤ z` olan nesne açıktadır,
`z := h` olur (üstte yatar) ve parlar. Her 20 tikte bir, açıktaki her nesne 4 komşudan en
alçağına bakar; o komşu `h ≤ hBurası − 2` ise oraya yuvarlanır (`z := hKomşu`). Parça
tabanı duvardır. Böylece yığının eteğindeki huniye doğru yuvarlanırlar: huni çukuru
yalnız samanı değil iğneyi de toplar. Üstüne saman kayan nesne (`h > z`) yeniden gömülür.
Açıktaki nesneyi oyuncu elle de alabilir (normal mod kuralı: iğne/buluntu deftere ve
cebe, çivi/taş atılır, ceza yok).

**Saman korunumu** (`mimari` §3 testine ek): `Σh + Σeşya.saman + depolar + satılan +
kaldırılan = başlangıç + çayır büyümesi + arabaların döktüğü`. Kaynaklar sayaçla tutulur.

## 5 Eşyanın sonu (nerede biter)
| Yer | Ne alır | İğne / buluntu gelirse |
|---|---|---|
| Komşu kapısı | etkin siparişin türleri; "fazlasını sat" açıksa `deger > 0` olanlar; geri kalan **atılır** (istatistikte "boşa giden") | oyuncuya iade: deftere yazılır, **kuruş yok** |
| Gübre çukuru | toz, karışık balya, çürük ot | oyuncuya iade, kuruş yok |
| Defter masası | `igne` ve `buluntu` sınıfı | kayıt + kuruş (değer sütunu) |
| Sandık, ambar | her şey (kapasiteye dek) | saklar |
| İşleme makineleri | tarifindekiler | **sert** ise sıkışır, değilse girişte bekler (reddeder) |
Kural: **iğne ve buluntu hiçbir yolla yok olmaz.** Sıkışan makine "Temizle" ile açılınca
sıkıştıran eşya oyuncuya döner (iğneyse defter + kuruş tam ödenir: elle bulmuş sayılır).
Sandık/ambar sökülürken içindeki iğne ve buluntular oyuncuya döner, gerisi atılır (onaylı).

## 6 Dalga 2 türleri (yer ayrıldı, kodlar sabit)
| Kod | Kod adı | Ad | Kaynak | Özellik özeti |
|---|---|---|---|---|
| 15 | `basak` | Başak demeti | orak makinesi (ekin şeridi) | hafif 1, iri, uzun |
| 16 | `tane` | Buğday tanesi | düven | ağır, ince, kısa, yoğ. 1, değer 2 |
| 17 | `un` | Un çuvalı | değirmen taşı (4 tane) | ağır, iri, değer 14 |
| 18 | `kepek` | Kepek | değirmen taşı | çok hafif, ince, değer 1 |
| 19 | `karma-yem` | Karma yem | yem karıştırıcı | ağır, iri, değer 20 |
| 20 | `sarili-balya` | Silaj balyası | balya sarıcı (8 yaş ot) | ağır, iri, çürümez, değer 24 |
Kodlar hiç yeniden kullanılmaz (`mimari` §5); 21-99 ileride ürünler, 100+ buluntular.
