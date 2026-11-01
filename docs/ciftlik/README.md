# Çiftlik modu: oyun tasarımı (sözleşme)

Bu klasör Çiftlik modunun **oyun tasarımı** sözleşmesidir; geliştirme ajanları buradan
uygular. Teknik iskelet (ızgara, tik, hat, port, enerji, sinyal, kayıt) ana ajanın
`S/rapor/ciftlik/mimari.md` raporundadır ve Faz 0'da `docs/CIFTLIK_MIMARI.md` olarak donar;
bu belgeler ona dayanır, ayrıldığı yerleri açıkça söyler (`yol-haritasi.md` §1).

| Dosya | İçerik |
|---|---|
| `README.md` | vizyon, çekirdek döngü, oturum, ilk 10 dakika, sözlük |
| `esyalar.md` | eşya türleri, fizik eksenleri, tarladan çıkış, gömülü nesneler |
| `parcalar.md` | ilk sürümün 30 parçası (ayrıntılı) |
| `parcalar-dalga2.md` | sonraki dalganın 19 parçası |
| `ekonomi.md` | kuruş, siparişler, damgalar ve kilitler, kalıcılık, çevrimdışı, sayılar |
| `sistemler.md` | enerji, mantık, hava/rüzgâr/nem, çivi ve tıkanma, iğneler, defter |
| `arayuz.md` | inşa kipleri, palet, hat çekme, panel, rozetler, ekran şemaları |
| `yol-haritasi.md` | Faz 1+ iş parçaları (ajan başına), bağımlılık, kabul ölçütü |

## Vizyon
Samanlıkta iğne aramanın ağır işini bir **köy harmanı makinesine** devrettiğin, rahat bir
"kur ve izle" modu. Tarlanın kenarındaki yığınlar yavaşça hunilere akar; saman bantlarda
tıkırdar, rüzgârda savrulur, mıknatısta çivisini bırakır, preste balya olur. Arada bir
mıknatısın tutucusunda gümüş bir parıltı belirir: bir iğne, belki bir çuvaldız, çok nadiren
de mıknatısın tutamadığı **altın iğne**. Parçalar fabrika oyunlarının "daha hızlısı"
değil, gerçek tarım aletlerinden gelen tek bir fizik fikridir (rüzgâr, ağırlık, mıknatıs,
delik, nem). Oyuncu her yeni parçayla **yeni bir soru** sorar: "hangisi hafif, hangisi
demir, rüzgâr nereden esiyor?" Kimse acele ettirmez; süre ve ceza yok.

## Çekirdek döngü
```
 tarla (yığın + çayır) ──toplama──► hat ──ayıklama──► işleme ──► Komşu kapısı (sipariş)
        ▲                                  │                  └─► depo / defter masası
        │                                  └─ iğne, buluntu ───► Buluntu defteri + kuruş
        └── harman arabası yeni yığın getirir; gübre çayırı büyütür
 kuruş ──► yeni parça kur ──► damga (kilometre taşı) ──► yeni parça ailesi açılır
```
Dakikadan dakikaya döngü: **bak → darboğazı bul → bir parça ekle ya da yer değiştir →
akışı izle**. Saatlik döngü: sipariş al → hattı o ürüne göre uyarla → teslim et → damga.
Oyuncu karakterle yürümeye, elle kazmaya ve elle iğne almaya devam edebilir (normal modun
el ve tırmığı aynen); otomasyon bunu hızlandırır, zorunlu kılmaz.

## Oturum yapısı (5-15 dakika)
- Açılışta **pano** üç kart gösterir: etkin damga siparişi, iki dönen sipariş. Biri hep
  mevcut hatla 5 dakikada bitebilecek boydadır (`ekonomi.md` §3).
- Çevrimdışı fişi (açıksa): "Sen yokken: 312 saman tutamı, 14 balya ambara girdi."
- Her oturumda üç küçük hedeften en az biri görünür: bir sipariş teslimi, bir tıkanmayı
  çözmek (sorun listesi), bir parça kurmak/açmak. Harman arabası 5 dakikada bir gelebilir:
  oturuma doğal bir "yeni yığın, yeni iğne" anı katar.
- Kapanış: sayfa gizlenince kayıt; tekrar açınca hat aynen sürer. Çalışan hat hiç
  sökülmek zorunda değildir: yeni parça eskisini geçersiz kılmaz, yanına eklenir.

## Normal oyundan farkı
| | Normal tarla | Çiftlik |
|---|---|---|
| Amaç | tek iğneyi en hızlı bul | çiftlik kur, siparişleri karşıla, iğneleri topla |
| Süre / puan | var | yok (çiftlik bitmez) |
| İğne | 1 | başta 6-7, her harman arabasıyla +1 (`sistemler.md` §5) |
| Paslı çivi | elle alınca +25 sn | ceza yok; işleme makinesini tıkar |
| Araçlar | el, tırmık, dedektör, mıknatıs | el, tırmık sınırsız; dedektör ve mıknatıs başta 1, her harman arabasıyla +1 hak (en çok 3) |
| Makineler (garaj) | traktör, üfleyici, balya | aynı üçü; yakıt ikmali her 10 dk'da bir |
| Tarla | tohumdan, değişmez | tohumdan + çayır büyür + arabalar yığın döker |
| Kalıcılık | istatistik, defter | dünya kaydı + damgalar + defter (ortak) |
| İstatistik/yarış | evet | etkilemez (`mimari` §1 korumaları) |
Normal mod, günün tarlası ve yarış **hiç değişmez**; çiftlik kodu ayrı modüllerde ve ayrı
kayıt anahtarlarındadır (`tests/ciftlik-ayrim.test.js`).

## İlk 10 dakika (öğretici: tek kavram, tek adım)
Öğretici `rehber.js` deseninde kâğıt notlardır; her adım atlanabilir, ama palet ilk
damgaya kadar yalnız üç parça gösterir (seçim seli olmasın). Saatler yaklaşık.

| Süre | Kavram | Oyuncu ne yapar | Oyun ne gösterir |
|---|---|---|---|
| 0:00 | amaç | not: "Komşu Hatice teyze 30 tutam saman istiyor." | pano kartı, kapı vurgulu |
| 0:20 | yerleştirme | paletten **Emici huni**, yığının eteğindeki hayalete koy | yeşil hayalet, ağız oku |
| 0:40 | yığın akar | izler: yığın huninin ağzına kayar | huni üstünde "çıkış dolu" rozeti |
| 1:00 | bant | huniden kapıya **bant** çeker (sürükle) | eşyalar akar, sayaç 0/30 |
| 2:00 | teslim | bekler; 30 tutam gider | damga **D1 İlk teslim**, +150 kuruş |
| 2:30 | çivi | yeni sipariş "çivisiz 40 tutam"; bir çivi gelince sayaç sıfırlanır | not: "Çivi geldi!" |
| 3:30 | mıknatıs | hatta **Oluk mıknatısı** koyar | çiviler tutucuda birikir |
| 5:00 | doyma | tutucu 6'da dolar, çivi geçer | "doymuş" rozeti; panelde **Boşalt** |
| 6:00 | teslim | 40 temiz tutam | **D2 Çivisiz**, yaba kolu açılır |
| 6:30 | kol | kolla tutucuyu sandığa boşaltır | tutucu hep boş, hat kendi döner |
| 7-10 | iğne | "ilk iğne" huninin ağzına yakındır; mıknatısta parlar | **D3 İlk iğne**: kutlama, defter; pres, el krankı, yel değirmeni açılır |
Öğretici huni hayaleti Komşu kapısına en yakın yığının eteğine konur (ilk bant ≤ 30
karo, ≤ 60 kuruş). "İlk iğne"nin yeri tohumdan, hayaletin ağzına 2-4 karo uzaklıkta ve
sığ (≤ 12 kat) seçilir; böylece 4-8. dakikada çıkar (`esyalar.md` §4). Öğreticiyi atlayan
oyuncuya paletten "Önerilen ilk hat" şablonu sunulur (huni + 12 bant + sandık).
Sonraki ipuçları olayla bir kez gelir: ilk "güç yok" rozeti, ilk rüzgâr dönüşü, ilk sıkışma.

## Tasarım ilkeleri (bu klasörün özeti)
1. Her parça başka bir soruyu cevaplar; "aynı şeyin hızlısı" sınırı 3, kullanılan 2 (ikisi de
   dalga 2: zincirli bant, uzun yaba); ilk sürümde hiç yok.
2. Ayıklama fizik eksenleriyle: hafiflik, boyut, manyetizma, nem (+ dalga 2: uzunluk,
   yoğunluk). Derinlik eşya çeşitliliğinden gelir.
3. Bant tek şerit, net geri basınç; tıkanmanın sebebi her zaman görünür (rozet + panel).
4. Bedava ama kararsız (rüzgâr, güneş) ile güvenilir ama pahalı (şaft, yakıt) ikilemi.
5. Enerji ve mantık yumuşak ve isteğe bağlı: eksik güç yavaşlatır, hiç kesmez.
6. **İğne ve buluntu asla kaybolmaz**: kabul etmeyen her yer onları oyuncuya geri verir.
7. Söküm %100 iade, geri al ve kopyala-yapıştır ilk dakikadan açık: denemek bedava.
8. Kilit kaynağı veri olarak ayrık: damga (varsayılan), araştırma (isteğe bağlı), hepsi açık.
9. Tek plan sömürüsü yok: tohum yığın yerlerini, çayırın köşesini, kapının kenarını ve havayı
   değiştirir; şablon yardımcıdır ama her çiftlikte yeniden oturtulur.

## Sözlük
| Terim | Anlamı |
|---|---|
| hücre | tarlanın 1×1 birimi (240×160); saman yüksekliği hücre başına "kat" |
| karo | inşa ızgarasının birimi = 2×2 hücre (120×80 karo) |
| tik | benzetim adımı, 50 ms (20 tik/sn, 1 dk = 1200 tik) |
| kat | saman yüksekliği birimi; 12 kat = 1 tutam |
| tutam | en küçük saman eşyası (`saman`, `kuru-ot`, `yas-ot`) |
| hat | uç uca bantlardan oluşan tek şeritli eşya yolu (karoda 3 eşya) |
| port | parçanın giriş/çıkış noktası (karo + yön) |
| ağız | toplayıcının tarladan saman aldığı hücreler (parçanın dışında) |
| tutucu | oluk mıknatısının çektiği eşyaları tuttuğu küçük cep (6) |
| bg | beygir: enerji birimi (tam sayı); oran 0..1024 (1024 = tam hız) |
| aks | parçanın şaft şebekesine bağlandığı nokta |
| renk kanalı | 6 sinyal kanalından biri; aynı renkteki yazıcı ve okuyucular bağlıdır |
| dilim | hava dilimi = 1200 tik (1 dk); rüzgâr ve gök her dilimde belirlidir |
| harman alanı | tarlanın yığınlı bölgesi (eski saman, gömülü nesneler) |
| çayır | tarlanın yenilenen bölgesi; yaş ot büyür |
| harman arabası | harman alanı azalınca 5 dk'da bir yeni yığın döken komşu arabası |
| doyma / sıva / sıkışma | mıknatıs doluluğu / kalburun yaş otla tıkanması / sert cisimle makine durması |
| Komşu kapısı | tarlanın yol kenarındaki sabit teslim noktası (siparişler) |
| damga | kilometre taşı; damga siparişi teslim edilince parça ailesi açılır |
| kuruş | tek para birimi; siparişten ve satıştan gelir |
