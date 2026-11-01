# Haystack Hunt

Kuş bakışı, tarayıcıda oynanan bir arama oyunu: tepeli bir saman tarlasının içinde tek
bir iğne var. Tarlada yürüyen bir çiftçisin: samanı elle al, tırmıkla it, garajdaki makinelerle
(kepçeli traktör, balya makinesi, sırt üfleyicisi) azalt, dedektör ve mıknatıs haklarını
akıllıca kullan, güneşte parlayan iğneyi paslı çivilerin parıltısından ayırt et. Dikkat:
balya makinesi iğneyi de yutabilir; o zaman doğru balyayı bulup açman gerekir.

**Özellikler:**
- Oynanış: WASD ile yürüyen çiftçi · yakıtlı makineler ve garajda tur başına bir kez yakıt
  ikmali · telefonda sanal kol · Kolay / Normal / Zor seviyeleri ve puan · paslı çivi yemleri ·
  dedektör halkaları ve "kulak" (kazarken iğneye yaklaşınca metal tınılar) · güneş parıltısı ve
  ekran dışı parıltı için kenar işareti.
- Keşif: samanda saklı buluntular ve Buluntu defteri (20 tür, 4 nadirlik) · tarlada kaçışan
  hayvanlar (fare, serçe, kurbağa, kirpi, kedi; süs) · yığın kayması, gölgeler ve parçacık
  efektleri · kesintisiz kazı ritmini gösteren akış çubuğu (yalnız his, puana etkisi yok).
- Arayüz: açılışta çuval etiketi menüsü · bitişte kantar fişi · rahat mod (süre ve puan gizli,
  çivi cezası yok) · sentezlenmiş sesler (M ile kapat) · yakınlaştırma, kaydırma ve mini harita ·
  hareketi azalt tercihine saygı (sade hareket) · ilk açılış rehberi ve "Nasıl oynanır" defteri.
- Paylaşım: istatistikler, günün tarlası serisi (haftada bir seri dondurma) ve emojili paylaşım ·
  arkadaşa meydan okuma bağlantısı · çevrimiçi yarış (8 kişiye kadar).
- Teknik: ekran piksel oranına göre keskin tuval · Web Worker ile ön hazırlık (yakın görünüm
  dokuları, sıradaki tarla) · çevrimdışı çalışan, ana ekrana eklenebilen uygulama (PWA; statik
  dosyalar önbellek önce).

## Oynamak

Derleme adımı yok; düz HTML + JavaScript (ES modülleri) + Canvas.

```
python3 -m http.server 8000      # sonra http://localhost:8000
```

(ES modülleri `file://` ile açılmaz; küçük bir yerel sunucu gerekir.)

- `?tohum=abc` adresi aynı tarlayı herkese açar; tohum yoksa **günün tarlası** gelir.
  `?zorluk=kolay|normal|zor` zorluğu seçer. `?rahat=1` rahat modu açar (tercih tarayıcıda
  saklanır). `?dokunmatik=1` dokunmatik kumandayı masaüstünde de gösterir.
- **Meydan okuma:** bitiş fişindeki "Meydan oku" `?tohum=…&zorluk=…&rakip=<süre ms>&ad=…`
  bağlantısı üretir (iğnenin yeri bağlantıda yok, tohumdan türer). Bağlantıyı açan aynı tarlada
  "Geçilecek süre" etiketini görür, bitişte farkı okur. Süre istemci tarafıdır (gösteriş, kanıt
  değil); sunucuya bir şey gitmez. Bağlantıyla açılan oturumda rahat mod kapalı başlar.
- Klavye: `WASD` / oklar yürü (makinede W/S gaz, A/D dön), `Boşluk` kullan (basılı tut),
  `E` makineye bin/in, `1` el, `2` tırmık, `3` dedektör, `4` mıknatıs, `M` ses,
  `+`/`−` yakınlaştırma, `0` tüm tarla. Açılışta menü kartı gelir (`?tohum=` varsa gelmez);
  `Esc` menüyü açar. Kamera çiftçiyi izler; fare tekerleği / iki parmak
  yakınlaştırır, orta tuşla sürükleyip kaydırırsın. Tuvalde uzak bir yere tıklayınca çiftçi
  oraya yürür; yakına (3 hücre) tıklayıp basılı tutunca araç orada çalışır.
- Karakter ve makine sözleşmesi: `docs/KARAKTER_TASARIM.md`.

## Yarış modu

Arkadaşlarınla aynı tarlada, aynı anda yarış: ilk bulan kazanır. Bağımlılıksız bir Node 22
sunucusu hem oyunu sunar hem de odaları yürütür (`npm install` gerekmez):

```
node sunucu/sunucu.js --port 8080          # sonra http://localhost:8080 (LAN'da IP ile)
```

- **Yarış** düğmesi → adını yaz, **Oda kur** (4 harfli kod çıkar) ya da kodla **Katıl**;
  odada en çok 8 kişi. Kurucu **Başlat** deyince 3-2-1 geri sayımla herkese aynı tarla açılır.
- Yarışta diğer oyuncuların çiftçileri (bindikleri makineyle birlikte) oyuncu renginde halka
  ve ad etiketiyle, mini haritada renkli noktalarla görünür; sağ üstte canlı tablo vardır.
  Bunlar yalnız görsel "hayalet"tir: herkes kendi tarlasında kazar, başkasının makinesi
  senin tarlanı etkilemez. İğneyi bulan ya da pes eden bitirir, herkes bitince sıralama çıkar; kurucu **Rövanş** açabilir.
- Oyun sunucusuz (ör. `python3 -m http.server`) açıldıysa Yarış "Sunucu bulunamadı" der;
  tek kişilik oyun etkilenmez. İleti biçimi: `sunucu/PROTOKOL.md`.

## Kurallar

- Tarla 240×160 hücrelik bir ızgara; her hücrede kaç kat saman olduğu tutulur. Tuvalde dünya
  4 piksel/hücre ile 960×640 pikseldir; ekranda devicePixelRatio kadar daha keskin çizilir.
- Komşusundan 3 kattan fazla yüksek olan hücreden saman aşağı kayar (yığın kayması);
  açtığın çukurun kenarları içeri dökülür.
- İğnenin yerden bir yüksekliği var; üstündeki saman o yüksekliğe inince görünür,
  yanına gidip elle alınır. Traktör kepçesi iğnenin katına inerse iğne kepçeye takılır;
  kepçe tarla kenarında boşaltılınca iğne orada açıkta yere düşer.
- El hücre başına saniyede 45 kat alır (kare hızından bağımsız); kepçe 10000 kat alır.
- **Güneş parıltısı:** iğne yüzeye yakınsa (altındaki saman Kolay 30, Normal 20, Zor 14 kattan
  azsa) Kolay 8, Normal 12, Zor 16 saniyede bir 1,2 saniye parlar. Ekran dışındaki parıltıyı
  ekran kenarında atan bir ok gösterir.
- **Dedektör:** hak Kolay 5, Normal 4, Zor 3. Her okuma yerde kalıcı bir halka bırakır:
  Yanıyor! (iğne 10 hücre içinde), Sıcak (25), Ilık (50), Soğuk. Bütün haklar harcanıp okumaların
  hepsi Soğuk çıkarsa tur başına 1 telafi hakkı verilir. **Mıknatıs:** hak Kolay 2, diğerleri 1;
  iğne 12 hücre içindeyse onu en çok 25 kat yukarı çeker ve parlatır.
- **Kulak:** el ya da makine kazarken kazı noktası iğneye 12 hücreden yakınsa metal tını
  (≤ 4, ≤ 8, ≤ 12 hücre: üç basamak; iğnenin derinliği uzaklığa katılır). Yön ve kesin mesafe
  vermez; ses kapalıysa ara sıra küçük bir pırıltı gösterir.
- **Makineler:** garajda tarla kenarında bekler; yakıtla başlar (Kolay %100, Normal %90, Zor
  %70). Traktör tam gazda depoyu 260 saniyede, balya makinesi 160, üfleyici çalışırken 120
  saniyede harcar; iş aygıtı saman almıyorsa iş yakıtının yalnız %10'u gider. Makine park yerinden
  uzaklaşıp geri dönüp durunca deposu bir kez %100'e dolar (makine başına tur başına).
- **Paslı çivi:** elle alınırsa süreye 25 saniye eklenir (rahat modda 0); dedektör ve mıknatıs
  çiviyi görmez.
- **Buluntular:** tarla başına 3-6 eşya (tohumdan türer, tarlayı ve iğneyi değiştirmez); alınması
  cezasızdır ve süreyi durdurmaz.
- **Puan** = zorluk çarpanı (1, 2, 3) × en az 100 olmak üzere
  `1000 − 2 × saniye − saman / 100 − 100 × kullanılan dedektör ve mıknatıs hakkı`.
  Süreye çivi cezaları dahildir.

## Geliştirme

```
npm test                 # birim testleri (node --test; Node 22)
npm run denetim          # CLAUDE.md kurallarının kod denetimi (satır uzunluğu, dosya boyu, ...)
npm run duman            # Chromium'da uçtan uca duman testi (bkz. aşağı)
```

`npm run denetim` (`js/`, `tests/`, `sunucu/`, `araclar/`, `dev/`) satır > 100 karakter,
kod dosyası > 300 / test dosyası > 400 satır, belge yorumu eksik modül, `js/kural/` içinde
`Math.random` ve boş `catch` bloklarını `dosya:satır: açıklama` biçiminde listeler; bulgu
varsa çıkış kodu 1 olur.

`npm run duman` için Playwright ve Chromium gerekir:

```
npm install --no-save playwright@1.48.2
npx playwright@1.48.2 install chromium
```

### Sürekli entegrasyon

- `.github/workflows/test.yml`: her push ve pull request'te birim testleri, kod denetimi
  ve duman testi çalışır.
- `.github/workflows/pages.yml`: `main` dalına her push'ta oyun GitHub Pages'e yayınlanır.
  Gizli (private) bir repoda GitHub Pages ücretsiz planda çalışmaz; ya repo herkese açık
  olmalı ya da ücretli bir plan gerekir.

| Dosya | Sorumluluk |
| --- | --- |
| `js/kural/boyut.js` | ızgara boyutları |
| `js/kural/rastgele.js` | tohumlu rastgelelik, günün etiketi |
| `js/kural/tarla.js` | tarla üretimi, yığın kayması (`cokert`, kirli bayrağı) |
| `js/kural/kayma.js` | yığın kaymasının kare hızından bağımsız zamanlaması |
| `js/kural/igne.js` | iğneyi saklama, derinlik |
| `js/kural/araclar.js`, `dedektor.js` | el (45 kat/sn), tırmık, dedektör seviyeleri, mıknatıs; dedektör telafi hakkı |
| `js/kural/sinyal.js`, `parilti.js` | kulak basamakları; güneş parıltısı ve ekran dışı parıltı için kenar işareti |
| `js/kural/civi.js`, `balyalar.js` | paslı çiviler, saman balyaları |
| `js/kural/buluntu.js`, `buluntu-defter.js` | samanda saklı buluntular ve kataloğu; defterin saf kuralları |
| `js/kural/hayvan.js`, `hayvan-hareket.js` | tarla hayvanlarının yerleşimi ve ürkme/kaçış hareketi |
| `js/kural/karakter.js` | çiftçinin yürüyüşü, erişim çemberi |
| `js/kural/makineler/` | traktör, üfleyici, balya makinesi, garaj (ikmal dahil), sürüş fiziği |
| `js/kural/zorluk.js`, `istatistik.js` | zorluk ayarları ve puan; istatistik, seri dondurma ve paylaşım |
| `js/kural/akis.js`, `ilerleme.js`, `meydan.js` | akış (kombo) sayacı; temizlik yüzdesi; meydan okuma bağlantısı |
| `js/kural/gorunum.js`, `kol.js` | kamera matematiği; sanal kolun matematiği ve ekran yönlü sürüş |
| `js/oyun.js` | oyun durumu ve kare döngüsü (yeni tarla, kare adımı, bitiş) |
| `js/oyun-karakter.js`, `oyun-arac.js`, `oyun-makine.js`, `oyun-buluntu.js` | karakter karesi, araç eylemleri, makine karesi, buluntu açığa çıkma ve alma |
| `js/kontrol.js`, `js/girdi.js` | kontrol durumu; klavye, fare ve dokunma girdisi |
| `js/olaylar.js` | olay yolu ve olay kataloğu |
| `js/cizim.js`, `js/cizim/` | tuvale çizim; tarla boyası (uzak 1 px/hücre, yakın alt piksel atlası); `tuval-olcek.js` (devicePixelRatio'lu arka bellek) |
| `js/arayuz.js`, `js/hud.js`, `js/ana.js` | DOM arayüzü ve paylaşım; HUD; giriş (özellik modülleri burada bağlanır) |
| `js/ozellik/` | ses, kamera, istatistik, yarış, dokunmatik, efekt, karakter ve makine çizimi, menü, rehber ve yardım, kantar fişi, buluntu defteri, hayvanlar, kulak, kenar işareti, akış, rahat mod, meydan okuma, ön hazırlık işçisi gibi özellikler |
| `sw.js` | service worker: sayfa ağ önce, statik dosyalar önbellek önce (`SURUM`) |
| `sunucu/` | yarış sunucusu ve WebSocket katmanı (`sunucu/PROTOKOL.md`) |
| `araclar/denetim.mjs`, `dev/` | kod denetimi; elle bakılan önizleme sayfaları |
| `KAYNAKLAR.md` | dış varlıklar (yalnız üç font) ve lisansları |
