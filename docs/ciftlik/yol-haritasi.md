# Yol haritası: Faz 1+ iş parçaları

Faz 0 (başka ajan, şu an): `mimari.md`'ye göre çekirdek dikey dilim: `olcu`, `esya`,
`parca-kayit`, `izgara`, `benzetim`, `tasima/hat*`, `saman`, `sakla`, `oyun.js` mod
kancası, `oyun-ciftlik.js`, `?mod=ciftlik`, bant + emici huni + sandık, `docs/CIFTLIK_MIMARI.md`.
Bu belge Faz 1 (ilk sürüm, 30 parça) ve Faz 2'yi (dalga 2) **ajan başına bir iş** olarak
tanımlar. Her iş kendi worktree'sinde, kendi dosyalarında; `npm test`, `npm run denetim`
("DENETİM TEMİZ"), `npm run duman` geçmeden bitmiş sayılmaz. Uzun denge simülasyonu yok.

## 1 Faz 0 sözleşmesine eklenecekler (Faz 1 başlamadan, Faz 0 ajanı ya da ilk birleştirme)
Tasarımın mimariden ayrıldığı ya da onu genişlettiği yerler; şema donmadan girmeli:
1. `esyaTanimla` alanları: `hafiflik, boyut, manyetik, nem, sert, uzunluk, yogunluk, saman,
   deger, sinif` (`esyalar.md` §1-2). Tür kodları `esyalar.md`'deki gibi sabit.
2. `parcaTanimla` alanları: `gucsuzOran` (0..1024), `ayarlar` şeması (`iki`, `filtre`,
   `renk`, `secim`), `durum(p)` → rozet kodu (`sistemler.md` §7), `incele(p)` ilk satırı
   neden cümlesi, `etki` (ağız/halka/menzil, önizleme için).
3. Huni ağzı parça **dışında** (önündeki 2×1 karo); taban maskesi ağızı kapsamaz.
4. Sinyal = 6 **renk kanalı** (kablo parçası yok); `ctx.sinyalOku(renk)`, `sinyalYaz(renk)`.
5. Kuruş, pano ve sipariş ilerlemesi **dünya** kaydında; ilerleme kaydında damgalar,
   şablonlar, toplamlar, ayarlar (`ekonomi.md` §5).
6. Arazi katmanı: `zemin[karo]` (harman / çayır / ekin), `gubre[karo]` (kalan tik),
   saman korunumu kaynak sayaçları (`cayirKat`, `arabaKat`). `RUZGAR` tablosu yerine
   `hava(tohum, dilim)`.
7. Komut türleri: `kur, sok, dondur, ayar, temizle, bosalt, onar, krank, kapiSat,
   siparisCevir, siparisSifirla, arabaCagir, cayirGenislet` (tik numaralı, kuyrukta).
8. `parcalar/` altındaki aile dosyaları (`toplama, tasima, ayiklama, isleme, depo-kol,
   enerji, mantik`) Faz 0'da **boş saplar** olarak açılır ve `hepsi.js` hepsini içe aktarır:
   Faz 1 ajanları `hepsi.js`'e dokunmaz, çakışma olmaz.
9. **Normal moda dokunmadan** üç hazırlık: (a) `tarlaKur` iç gövdesi `tarlaKurAyar(tohum,
   ayar)` olur, `tarlaKur` ona devreder (900 kare izi AYNI; `esyalar.md` §4); (b) buluntu
   türlerinin eşya kodları `esya.js`'te sabit açık tablo (`KATALOG` sırasına bağlı değil; test
   `KATALOG` ⊆ tablo); (c) ortak defter şeması değişmez, çiftlik kendi sayacını tutar
   (`sistemler.md` §6). `civileriSakla` deseni çiftlik kopyasında yazılır, normal `civi.js` değişmez.
10. Kural klasörü 8 modül sınırı için alt klasörler: `kural/ciftlik/dunya/` (arazi, hava,
   gomulu, araba), `kural/ciftlik/ekonomi/` (kurus, siparis, damga, acilis, cevrimdisi,
   denge). `mimari`deki `ilerleme.js` buraya taşınır.

## 2 Faz 1 iş parçaları (13)
Ortak: olay adları `olaylar.js` kataloğunda her ajanın kendi alt bloğu; `sw.js SURUM`
birleştiren ajanda; sayılar yalnız `ekonomi/denge.js` sabitlerinden (tek kaynak).

**A · ciftlik-tasima**: çatal, birleştirme oluğu, menfez (sanal hat), port protokolü
- Dosyalar: `kural/ciftlik/tasima/dugum.js`, `parcalar/tasima.js`, `tests/ciftlik-tasima.test.js`.
- Bağımlı: Faz 0. Kabul: çatal sırayla adil (1000 eşyada ±1), taşma önceliği; birleştirme
  adil; menfez 1-5 karo, eşsiz rozeti, ara karolara kurulum; hat sıkışmasında aralık ≥ ARALIK.

**B · ciftlik-enerji**: şebeke + krank, yel değirmeni, lokomobil, şaft, volan
- Dosyalar: `kural/ciftlik/ag/enerji.js`, `parcalar/enerji.js`, `tests/ciftlik-enerji.test.js`.
- Bağımlı: Faz 0; hava için sap (`hava = sabit rüzgâr 2`) D gelince değişir. Kabul: oran
  formülü, talep kuralı (boş makine talep etmez), `gucsuzOran` ve `max` kuralı, volan şarj
  12/deşarj 30/2400, lokomobil yük oranında yakar, yön dönüşünde 100 tik 0, şebeke sökmede
  bölünür; krank komutu yalnız çiftçi 1 karo içindeyken.

**C · ciftlik-mantik** (**en son birleşir, kesilebilir**: isteğe bağlı, hiçbir damga ona
bağlı değil; kesilirse ilk sürüm 26 parçadır): renk kanalları + rüzgâr gülü, savak, kantar,
kile sayacı
- Dosyalar: `kural/ciftlik/ag/sinyal.js`, `parcalar/mantik.js`, `tests/ciftlik-mantik.test.js`.
- Bağımlı: Faz 0 (hat `etkin`), B (kantar volanı okur; sap kabul). Kabul: bir tik gecikme,
  toplam > 0 = açık, ters ayarı, kile iki kipi ve sıfırlama, kantar 6 depo türü, savak geri
  basınç; `sistemler.md` §2'deki 3 örnek devre test olarak.

**D · ciftlik-dunya**: arazi, hava, gömülü, yuvarlanma, harman arabası, toplama parçaları
- Dosyalar: `kural/ciftlik/dunya/{arazi,hava,gomulu,araba}.js`, `kural/ciftlik/saman.js`
  (toplama türü ve toz kuralı eki), `parcalar/toplama.js` (huni ağzı/güç, tırmık kolu, taş
  toplayıcı), `tests/ciftlik-dunya.test.js`, `tests/ciftlik-hava.test.js`.
- Bağımlı: Faz 0. Kabul: hava durumsuz ve dağılımı 10 bin dilimde ±%2; yağmur payı ≈ %8;
  çayır büyümesi (240/120/60 tik, tavan 12); ilk iğne öğretici huniyle 4-8 dk'da çıkar
  (sabit tohumla 3 tohumda); öğretici çivileri ≈ 30 sn arayla; yoğunluk (çivi/taş/buluntu
  sayıları 3 tohumda yerleşir); yuvarlanma kuralı; araba tüketim eşiği (15.000 kat), döküm
  yeri, duyuru, stok %10 altı eşiği; `arabaCagir`, `cayirGenislet` komutları;
  saman korunumu (kaynaklarla) 5000 tikte birebir; normal mod `tarlaKur` izi AYNI.

**E · ciftlik-ayiklama**: oluk mıknatısı, mıknatıslı tambur, kalbur, tınaz, şeytan yeli
- Dosyalar: `parcalar/ayiklama.js`, `kural/ciftlik/esya.js` (buluntu özellik tablosu),
  `tests/ciftlik-ayiklama.test.js`.
- Bağımlı: A (port), D (hava; sap kabul). Kabul: `esyalar.md` §3 ayırma haritasının her
  satırı test; doyma 6, sıva 4 / −1/200 tik; tınaz yön × şiddet tablosu (16 durum); şeytan
  yeli 3 yol; oranlar §8 hızlarında ±1 tik.

**F · ciftlik-isleme-depo**: ot savurucu, kurutma ambarı, pres, kıyıcı, gübre çukuru;
ambar, defter masası, yaba kolu, Komşu kapısı (kabul tarafı)
- Dosyalar: `parcalar/isleme.js`, `parcalar/depo-kol.js`, `tests/ciftlik-isleme.test.js`,
  `tests/ciftlik-depo.test.js`.
- Bağımlı: A, B (güç; sap), D (gübre → çayır), G (kapının sipariş eşlemesi; sap: hepsini
  sat). Kabul: pres saflık → 3 balya türü, sıkışma/Temizle, nem reddi, darbeli talep;
  kıyıcı kırılma/Onar 50; kurutma 600 tik/24 yuva, güçsüz ¼; ambar çürümesi ⌈n/4⌉;
  yaba kolu filtreleri ve hat üstünden alma; **iğne ve buluntu hiçbir yolda yok olmaz**
  (her sink/makine için test; sandık/ambar yarı kuruşla "bulundu" sayar; her parçanın
  sökümü içindeki iğne/buluntuyu oyuncuya verir); tınaz, rüzgâr durgunken hepsini dipten çıkarır.

**G · ciftlik-ekonomi**: kuruş, siparişler, damgalar, kilit kaynağı, çevrimdışı, kayıt göçü
- Dosyalar: `kural/ciftlik/ekonomi/{kurus,siparis,damga,acilis,cevrimdisi,denge}.js`,
  `kural/ciftlik/sakla.js` (göç: kuruş dünyaya), `tests/ciftlik-ekonomi.test.js`,
  `tests/ciftlik-siparis.test.js`.
- Bağımlı: Faz 0. Kabul: sipariş üretimi deterministik, yalnız üretilebilir ürün, aynı
  tür arka arkaya yok, boy formülü; ödül formülü; D2 sıfırlama; **erişilebilirlik testi**
  (her damga yalnız önceki damgaların parçalarıyla mümkün; `damga` ve `arastirma` kipinde);
  söküm %100 iade; çevrimdışı 480 dk tavanı, %50, depo kenetlemesi + taban satış kuruşu,
  değişmeyenler (sipariş dolmaz).

**H1 · ciftlik-gorsel-altyapi**: bölge önbelleği, bant dokusu, eşya atlası (14 tür + 20
buluntu), hava görseli, rozet çizimi, akış katmanı, hayalet çizimi
- Dosyalar: `ozellik/ciftlik/gorsel/{kayit,zemin-onbellek,bant,esya-atlas,hava,rozet,
  akis,onizleme}.js`. Bağımlı: Faz 0. Kabul: 300 parça + 2000 eşya, z = 3,5, CPU 4× ile
  çiftlik katmanları ≤ 4 ms/kare; rozetler renk dışı şekille ayırt edilir; sade hareket.

**H2 · ciftlik-gorsel-parcalar**: 30 parçanın `govde` + `hareketli` çizimi (`parcalar.md` G
satırları), aile başına bir dosya
- Dosyalar: `ozellik/ciftlik/gorsel/{toplama,tasima,ayiklama,isleme,depo-kol,enerji,
  mantik}.js`, ekran görüntüsü betiği. Bağımlı: H1 kayıt sözleşmesi. Kabul: her parça
  19 px ve 56 px karoda tanınır (1280×800 ve 390×844 görüntü), boyalı oyuncak dili, dönen
  parça hızı güç oranıyla orantılı.

**I1 · ciftlik-insa-arayuz**: kipler, palet, yerleştirme, hat çekme, sil, geri al, pipet,
inceleme paneli (en büyük iş olduğundan seç/kopyala/şablon ayrı ajan: I2)
- Dosyalar: `ozellik/ciftlik/{yerlestir,hat-cek,palet,panel}.js`, `ciftlik.css`, `ana.js`
  (1 satır), `tests/ciftlik-hat-cek.test.js` (saf yol hesabı).
- Bağımlı: Faz 0 komutları; H1 önizleme. Kabul: `arayuz.md` §10 tablosunun I1 satırları
  masaüstü ve dokunmatikte; histerezis ve geri izleme testi; 100 adım geri al; krank tek
  dokunuş 30 sn; 390 px taşma yok; kısayollar normal modu etkilemez.

**I2 · ciftlik-secim-sablon**: seç, kopyala, döndür/aynala, yapıştır (hepsi-ya-hiç), şablon
(10 yuva, "Önerilen ilk hat"), pipetle ortak ayar taşıma
- Dosyalar: `ozellik/ciftlik/{secim,sablon}.js` (+ saf `kural/ciftlik/izgara/kume.js`),
  `tests/ciftlik-kume.test.js`. Bağımlı: Faz 0; I1 kipleri (sap: Ctrl+C/V). Kabul: ayna
  sol/sağ portları değiştirir; kilitli parçalı şablon kırmızı; sayaç "N karo engelli · M kuruş".

**J · ciftlik-hud-ekranlar**: üst şerit, pano, damga defteri, istatistik, öğretici,
çevrimdışı fişi, menü satırları, ses ve efekt bağları, "Nasıl oynanır" çiftlik sekmesi
- Dosyalar: `ozellik/ciftlik/{hud,pano,istatistik,ogretici,fis,menu-bag,ses-bag}.js`,
  `menu.js` (`menuModEkle`, küçük), `yardim-icerik.js` (çiftlik sekmesi).
- Bağımlı: G (pano verisi; sap), D (hava tahmini). Kabul: `README.md` ilk 10 dakika
  tablosu adım adım e2e'de (öğretici çivileri ve ilk iğne dahil; sandık yolundan D3);
  kapı paneli (sat / araba çağır / çayır genişlet); tahmin 3 dilim; sorun listesi kamerayı götürür; metinlerdeki
  sayılar kural modüllerinden okunur.

**K · ciftlik-dogrulama**: e2e, performans, mod ayrımı, denge ve senaryo testi
- Dosyalar: `tests/e2e/ciftlik*.cjs`, `araclar/ciftlik-olc.mjs`, `tests/ciftlik-ayrim.test.js`,
  `tests/ciftlik-denge.test.js`, `tests/ciftlik-senaryo.test.js`; koruma satırları
  (istatistik, yaris, meydan, fis, on-hazirlik, arayuz).
- Bağımlı: hepsi (iskeleti hemen yazar, birleştirmede tamamlar). Kabul: normal mod 900
  karelik iz AYNI; referans hatlar A/B/C 6000 tikte `ekonomi.md` §8 oranlarının ±%10'unda;
  senaryo: sabit komut dizisiyle Node'da D1-D5'e ≤ 30 oyun dakikasında varılır (kısa duman,
  turnuva değil); kaydet/yükle determinizmi; telefon perf ölçütü.

## 3 Sıra ve bağımlılık
```
Faz 0 ──► A ─┬─► E ─┐
         B ──┼─► F ─┼─► K (son geçiş)
         C ──┘      │
         D ─────────┤
         G ─────────┼─► J
         H1 ─► H2 ──┤
         I1, I2 ────┘
```
Hepsi Faz 0 biter bitmez **paralel** başlar; ok yönündeki bağımlılıklar saplarla
karşılanır (port protokolü, `oran = 1024`, sabit hava, "hepsini sat" kapısı). Birleştirme
sırası: A, B, D, G → E, F → H1, H2, I1, I2, J → C (en son) → K. Çakışma riski olan ortak dosyalar
yalnız: `olaylar.js` (blok başına), `ana.js` (I), `menu.js` (J), koruma satırları (K).

## 4 Faz 2 (dalga 2) iş parçaları (kararla başlar)
1. **ciftlik-ekin-zinciri**: ekin şeridi arazisi, orak makinesi, düven, değirmen taşı (boş
   dönme aşınması), yem karıştırıcı, silo; ürünler 15-19.
2. **ciftlik-ayiklama-2**: çentikli silindir, yerçekimi masası, metal dedektörü; uzunluk ve
   yoğunluk eksenlerinin ayırma haritası testi.
3. **ciftlik-tasima-2**: kağnı durağı (kenar yolu), hava borusu, zincirli bant, uzun yaba,
   kayış kasnağı.
4. **ciftlik-nem-2**: yan tırmık (tarlada kurutma, karo kuruluğu), balya sarıcı (silaj),
   manej; fener, kum saati, boşta kasnak.
5. **ciftlik-arayuz-2**: 3 kayıt yuvası, şablon paylaşım kodu (sürümlü, sağlamalı),
   araştırma penceresi (proje sahibi "güzel olursa" derse; veri Faz 1'de hazır).
Her biri Faz 1'in sözleşmesine yalnız parça/eşya ekler; mevcut kodları ve kayıt biçimini
bozmaz (yeni alanlar göçle). Dalga 2 kilitleri D9-D14 (`parcalar-dalga2.md`).

## 5 Bitti tanımı (Faz 1)
- 30 parça panelden kurulabilir (C kesildiyse 26), D1-D8 bir oyuncu tarafından oynanabilir.
- Soft-lock testleri: (a) her şey sökülünce kuruş = 300 + kazanılan; (b) yakıt ve yel yokken
  krank + sandık→kol→lokomobil ile hat yeniden başlar; (c) iğne/buluntu her sink, makine ve
  söküm yolunda korunur; (d) çiviler öğretici çizelgesiyle D2'ye 10 dk içinde varılır.
- Her parçanın en az bir hata modu rozetle görünür; sessiz tıkanma yok.
- Normal mod, günün tarlası, yarış izleri değişmedi; `npm test`, `npm run duman`,
  `npm run e2e`, `npm run denetim` temiz; 390 px'te yatay taşma yok.
