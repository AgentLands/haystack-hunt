# Karakter ve makineler: tasarım sözleşmesi

Oyuncu artık fare imleci değil, tarlada yürüyen bir **çiftçidir**. Samanı araçlarla ve
tarla kenarındaki garajdan alınan **makinelerle** azaltır. Bu belge, paralel çalışan
geliştiricilerin (ve ajanların) uyduğu veri ve olay sözleşmesidir. Değiştirirsen burayı da
güncelle.

## Kontrol (`js/kontrol.js`)
- Girdi kaynakları yalnız `kontrol` nesnesine yazar; oyun.js her karede okur.
- Klavye: **WASD** ve **oklar** hareket; **Boşluk** kullan (basılı tut); **E** bin/in;
  **1–4** araç seçimi; **M** ses. (Ok tuşları artık kamerayı kaydırmaz.)
- Fare/dokunma: tuvalde tıklanan hücre karakterin **erişiminde** (≤ 3 hücre) ise araç orada
  kullanılır (basılı tutma sürer; dedektör ve mıknatıs yine karakterin yerinde); uzaksa
  `kontrol.hedef` olur ve karakter oraya düz çizgide yürür (varınca ya da engelde durur).
  `kontrol.hedef` tam sayı hücre `{x, y}`'dir; karakter hücre merkezine (x + 0.5) yürür.
  Makinedeyken tıklama yok sayılır.
- Boşluk en az 50 ms basılı sayılır (çok kısa dokunuş da bir karede görülsün; girdi.js).
- Oyun `kontrol.binIste`'yi tüketir (false yapar) ve tıkla-yürü bitince `kontrol.hedef`'i
  null'a çeker.
- Dokunmatik sanal kol `yonAyarla()` ile yazar; "Kullan" ve "Bin/İn" düğmeleri `kullan` ve
  `binIste` alanlarını kullanır.

## Koordinatlar
- Karakter ve makineler **dünya** biriminde durur: hücre i, [i, i+1) aralığı; merkezi i + 0.5.
  Çizimde piksel = dünya × OLCEK.
- Araç noktaları, olaylar ve `durum.imlec` eskisi gibi **hücre** birimindedir (hücre i'nin
  merkezi i; çizimde (i + 0.5) × OLCEK). Çeviri: hücre = dünya − 0.5.

## Karakter verisi: `durum.karakter`
```
{ x, y,          // hücre biriminde kayan nokta konum (merkez)
  yon,           // radyan; 0 = sağ (doğu), y aşağı pozitif (Math.atan2(dy, dx))
  hareketli,     // bu karede yürüdü mü
  adimFaz,       // 0..1 yürüme döngüsü (çizim için)
  z,             // ayağının altındaki saman yüksekliği (kat)
  kullaniyor,    // aracı şu an kullanıyor mu
  makine }       // bindiği makine nesnesi ya da null
```
- Kural: `js/kural/karakter.js` (saf). Yürüme hızı: `TEMEL_HIZ / (1 + z / SAMAN_YAVASLATMA)`
  = 13 / (1 + z / 45) hücre/sn (ilk taslaktaki 25 yerine 45: yığın tepesinde de akıcı kalsın).
  Tırmanma: bir sonraki hücre ile yükseklik farkı `TIRMANMA` (3) katını aşıyorsa o eksende
  ilerlenmez (duvar boyunca kayabilir). Yığın kayması yamaçları ≤ 3'te tuttuğundan oturmuş
  samanda hep tırmanılır; yalnız taze kazılmış çukur duvarları durdurur.
- Karakter garajın önünde (içeri ~8 hücre), çevresindeki en alçak boş hücrede başlar.
- Araçlar karakterin **önünde** (yon yönünde ~1.5 hücre) ya da fare/dokunmayla seçilen
  erişimdeki hücrede çalışır. Dedektör ve mıknatıs karakterin bulunduğu hücreyi okur
  (Boşluğa her basışta bir kez). El Boşluk basılıyken her kare kazar; tırmık Boşluk
  basılıyken 0.2 sn'de bir karakterin yönünde (yürürken hareket yönünde) iter.
- `durum.imlec` geriye uyum için karakterin araç noktasını gösterir (yarış imleci vb.);
  fare basılıysa fare noktasını, makinedeyken iş aygıtının noktasını. `durum.aracYaricap`
  makinedeyken iş aygıtının yarıçapıdır (imleç halkası).

## Makine verisi: `durum.makineler[]`
```
{ id, tur,       // 'traktor' | 'balya' | 'ufleyici'
  x, y, yon,     // hücre birimi, radyan
  hiz,           // hücre/sn (işaretli: geri vites negatif)
  yakit,         // 0..1
  surucu,        // karakter binmiş mi
  calisiyor,     // iş aygıtı (kepçe/balyalayıcı/üfleyici) şu an çalışıyor mu
  yuk,           // türe özgü durum (ör. kepçe doluluğu 0..1), çizim okur
  z,             // gövdenin altındaki saman yüksekliği
  takili,        // tırmanma eşiğine takıldı (geri gidince / dönünce / ilerleyince biter)
  kilitli,       // iş aygıtı Boşluk bırakılana dek beklesin (ör. boşalttıktan sonra)
  icerik }       // traktör: { saman, igne: bool, civiler: [çivi] } (kepçenin içi)
                 // balya: aynı biçim (haznenin içi; dolunca balyaya geçer)
```
- Garaj: `durum.garaj = { x, y, kenar, yon, en }` (park sırasının ortası, dünya birimi;
  kenar 0 üst, 1 sağ, 2 alt, 3 sol; yon tarlaya bakan açı; en sıranın boyu). Kendi
  üretecinden seçilir (tarla/iğne üretimi değişmez); başlangıç yakıtı `zorluk.js` `yakit`
  alanından (Kolay 1, Normal 0.7, Zor 0.4).
- Makineler garajda (tarla kenarında, tohumdan belirlenen yerde) başlar.
- Makine tanımları `js/kural/makineler/<tur>.js` modüllerinde, ortak kayıt
  `js/kural/makineler/kayit.js` (`makineTanimla(tur, tanim)`); tanım saf işlevlerdir
  (DOM yok): zorunlu `{ ad, boy, en, azamiHiz, donus, yakitTuketim, calis(tarla, makine,
  dt) }`; isteğe bağlı `tirmanma, yaricap, isYaricap, isNoktasi(m), isYakit, kur(m),
  kare(tarla, m)` (ayrıntı kayit.js başında). `calis` `{ miktar, olaylar: [[ad, veri]] }`
  döndürür; oyun `makine-calisti`yi ve dönen olayları yayar.
- Türler `js/kural/makineler/hepsi.js`'te birer satırla içe aktarılarak kaydedilir; içe
  aktarma sırası garajdaki park sırasıdır. Garaj her türden bir makine koyar.
- Sürüş (`surus.js`): bindiğinde W/S gaz/geri (geri yarı hız), A/D dönüş (tank tipi).
  Saman hızı düşürür (`/ (1 + z / 40)`); ön (geri giderken arka) uç yeni hücreye girerken
  yükseklik farkı makinenin `tirmanma` eşiğini aşarsa durur ve takılır (geri çıkmak gerekir).
  Yakıt sürerken hızla orantılı, çalışırken `isYakit` kadar harcanır; bitince kımıldamaz.
- Çarpışma: karakter, makineler birbirine girmez (daire: makine `yaricap`, karakter 0.6).
- **E**: gövde kenarına ≤ 2.5 hücre yakın makineye bin / makineden in (yanına iner;
  `binme.js`).

## Kepçeli traktör (`js/kural/makineler/traktor.js`)
- Boşluk basılıyken önündeki kepçe dairesinden (merkezden 3 hücre önde, yarıçap 2.2) yüzey
  samanını alır: hücre başına 360 kat/sn, kapasite 6000 (`yuk` = doluluk). Saman kepçedeyken
  tarlada değildir; `kaldirilan` boşaltınca artar. W ile itince yığına gömülerek kazar.
- Dolu kepçe tarla kenarına (kepçe kenardan ≤ 3 hücre) götürülüp Boşlukla boşaltılır; sonra
  Boşluk bırakılana dek kepçe bekler (`kilitli`).
- Kepçe iğnenin katına inerse (kepçe altındaki iğne hücresinde saman ≤ iğne.z) iğne kepçeye
  takılır: `tarla.igne.kepcede = true`, derinliği sonsuz (görünmez, alınamaz, parlamaz;
  dedektör onu kepçede bulur, mıknatıs çekemez). Boşaltınca boşaltma noktasında açıkta
  yere düşer; oyuncu inip elle almalı. Paslı çiviler de aynı (iğnenin yanına düşer).

## Sırt üfleyicisi (`js/kural/makineler/ufleyici.js`)
- **Giyilen** makine (tanımda `giyilir: true`, `yuruHizi: 0.8`): E ile takılınca sürüş yok;
  çiftçi normal WASD ile yürür (hızı %80: ağırlık), makine nesnesi her kare karakterin
  x, y, yon, z'sine eşitlenir (`karakter.makine` doludur, `makine.surucu` true). E ile
  çıkınca makine karakterin durduğu yere bırakılır (yeniden alınabilir). Giyilirken
  tıkla-yürü yok (tıklama yok sayılır); sanal kol ve klavye çalışır; el/tırmık araçları
  kullanılmaz. Ortak sürüş kodu (`surusAdim`) çağrılmaz; `oyun-makine.js` giyilen makine
  için ayrı dal (`giyilenKare`) işletir.
- Boşluk basılıyken (yakıt harcar: `isYakit` = 1/120 sn; yürürken harcamaz) namlu
  noktasından (karakterin 1.8 hücre önü) başlayan koni (menzil 9 hücre, ±25°) içindeki her
  hücreden kare başına en çok 1 kat alır; yakın hücre 48 kat/sn, menzil sonu 12 kat/sn;
  yüksekliği 24'ü aşan hücrede hız `24 / yükseklik` ile çarpılır (yalnız yüzey).
  Alınan kat, hücrenin namluya göre yönünde 10–13 hücre ötesine (koninin dışına) bırakılır;
  tarla dışına düşen `kaldirilan`'a eklenir. İğne ve çiviler uçmaz; üstlerindeki saman
  uçarsa açıkta kalırlar, üzerlerine saman yağarsa gömülürler.
- Olaylar: `makine-calisti { makine, miktar }` (savrulan kat), `ufleme { x, y, yon,
  menzil }` (~10 Hz; efekt ve ses için).
## Balya makinesi ve balyalar
- Tanım `js/kural/makineler/balya.js`, balya kuralları `js/kural/balyalar.js`.
- Traktörden hızlı (azami 20); tırmanma eşiği traktörünkü kadar (2): 1.5 düz tarladaki
  serpintide (komşu farkı 2, geçişlerin ~%11'i) sürekli takılıyordu. "Yalnız alçak/orta
  samanda iyi çalışır" kısıtı toplayıcının erişimiyle gelir: gövdenin altındaki samanın en
  çok `TOPLAYICI_ERISIM` (20) kat üstündeki hücrelere uzanır, yüksek yığın duvarına girmez.
- Boşluk basılıyken önündeki **toplayıcı şeridinden** (merkezden 3.1 önde, en 4.2, derinlik 2;
  ~10 hücre) hücre başına 60 kat/sn alır. Saman haznede birikir (`yuk` = doluluk);
  `BALYA_KAPASITE` (600) dolunca gövdenin 3.9 arkasına bir balya bırakır (yer doluysa yana
  kayar). Balyadaki saman tarlada sayılır: `tarla.kaldirilan` artmaz.
- Toplayıcı iğnenin (ya da paslı çivinin) katına inerse nesne hazneye girer (`kepcede =
  true`, makineyle taşınır) ve o sırada oluşan balyaya paketlenir: `balyada` = balya kimliği,
  x, y balyanın hücresi; derinlik sonsuz (görünmez, parlamaz, alınamaz). Oyuncuya söylenmez;
  yalnız `igne-yutuldu` (ses/efekt: metalik tık) yayılır.
- Balya verisi: `durum.balyalar` (= `tarla.balyalar`, aynı dizi):
  `{ id, x, y, yon, acik, acilma, saman, igne: bool, civiler: [çivi] }`; x, y DÜNYA birimi,
  çarpışma dairesi 0.8 (karakter ve makineler içinden geçemez).
- İğnenin etkin konumu: `igne.js` `igneKonumu(tarla)` (balyadaysa balyanın yeri). Dedektör,
  mıknatıs ve parıltı bunu okur; mıknatıs balyadaki iğneyi çekemez (boşa gider).
  `tarlada(nesne)`: kepçede/haznede ya da balyada değil.
- **Açma**: yürürken El seçiliyken, kenarına ≤ 1.5 hücre yakın ve yüzü dönük balyaya Boşluk
  basılı tutulunca `acik = true`, `acilma` 1.5 sn'de 0→1 (bırakılırsa kaldığı yerde bekler).
  1'e varınca saman balyanın çevresindeki halkaya (1.5–4 hücre) yayılır (yığın kayması
  dağıtır), iğne ve çiviler balyanın yerinde açıkta kalır (z yayılan samanın üstünde,
  gömülmez); balya listeden çıkar. Açtıktan sonra el, Boşluk bırakılana dek bekler
  (`durum.elKilitli`; basılı tutmak yayılan samanı kazıp iğneyi kendiliğinden almasın).
  İğneyi bulmak yine oyuncunun işi (bildirim yalnız "Balya açıldı").
- Pes edince iğne balyada (ya da bir makinede) ise `js/ozellik/balya-isaret.js` balyanın
  üstüne küçük bir iğne işareti ve halka çizer.

## Çizim
- Karakter ve makineler `katmanEkle(..., 'ust')` ile, piksel uzayında (hücre * OLCEK) çizilir.
  Çizim modülü yalnız yukarıdaki verileri okur; kural koduna dokunmaz.
- Makinedeyken (`karakter.makine !== null`) karakterin x, y, yon'u makineninkidir; karakter
  ayrıca çizilmez. Geçici yer tutucu çizim `js/ozellik/karakter-yer-tutucu.js` (birleştirmede
  kaldırılır).
- Kamera varsayılan olarak karakteri (bindiyse makineyi) 3.5× yumuşak takip eder; **0** / ⤢
  tüm tarlayı gösterip takibi bırakır (orta tuşla kaydırma ve mini harita da bırakır); yeni
  bir hareket isteği (yön ya da yeni tıkla-yürü hedefi) takibi geri getirir. Tekerlek ve
  +/− takip sürerken takibin yakınlığını değiştirir. Ok tuşu ve Boşluk+sürükle kaydırma yok.

## Yarış (çevrimiçi)
- Yarışta `durum.karakter` (konum, yön, hareketli, kullaniyor, bindiği makine türü/yönü/yükü)
  ve `durum.arac` ~8 Hz, yalnız değişince `imlec` iletisiyle sunucuya gider
  (`js/ozellik/yaris-konum.js`; biçim `sunucu/PROTOKOL.md`). Diğer oyuncular
  `js/ozellik/yaris-hayalet.js`'te `karakterCiz`/`makineCiz` ile çizilen **görsel
  hayaletlerdir** (120 ms gecikmeli ara değer, oyuncu renginde halka + ad etiketi); yerel
  tarlayı etkilemezler. Mini harita (`kamera-arayuz.js`) onları renkli nokta gösterir.

## Yakıt bitince
Tanımın isteğe bağlı `yakitBitince(tarla, m)` kancası (olay listesi döndürür) depo boşaldığı
karede çağrılır: traktör kepçedekileri önüne döker (saman tarlaya döner, iğne/çiviler açıkta),
balya makinesi haznedekileri yarım balya olarak bırakır. Böylece iğne yakıtsız bir makinede
mahsur kalıp oyun bitirilemez olmaz.

## Yeni olaylar (olaylar.js kataloğuna eklenir)
- `karakter-adim { x, y, z }` (adım sesi/izi için, ~her adımda bir)
- `makine-bin { makine }`, `makine-in { makine }`
- `makine-calisti { makine, miktar }` (bu karede kaldırılan/itilen saman)
- `makine-takildi { makine }`, `yakit-bitti { makine }`
- `ufleme { x, y, yon, menzil }` (sırt üfleyicisi çalışırken ~10 Hz; x, y hücre birimi)
- Eklenenler: `makine-yok { x, y }` (E ama yakında makine yok), `kepce-doldu { makine }`,
  `kepce-bosaltildi { makine, miktar, igne, civi, x, y }`, `igne-kepcede { makine, x, y }`,
  `civi-kepcede { makine, x, y }`. Tam katalog: `js/olaylar.js`.
- Balya: `balya-birakildi { balya, makine }`, `igne-yutuldu { x, y }` (yalnız ses/efekt),
  `civi-yutuldu { x, y }`, `balya-acildi { balya, igne, civiSayisi }`.

## Kod yerleşimi
- `js/oyun.js` durum ve kare döngüsü; `js/oyun-karakter.js` yürüme + araç kullanımı;
  `js/oyun-makine.js` binme, sürüş, iş; `js/oyun-arac.js` araç eylemleri ve sonuç.
- Kamera takibi `js/ozellik/kamera-takip.js` (matematik `kural/gorunum.js` `takipEt`).
- Makine bildirimleri `js/ozellik/makine-bildirim.js`.

## Yeni makine eklemek (ikinci dalga: balya makinesi, üfleyici)
1. `js/kural/makineler/<tur>.js` yaz: `makineTanimla('<tur>', { ad, boy, en, azamiHiz,
   donus, yakitTuketim, calis(tarla, m, dt) { ...; return { miktar, olaylar } }, ... })`.
   `kur(m)` ile `yuk` ve türe özgü alanları kur; gerekirse `kare(tarla, m)` kancası.
   Saman tarladan çıkarsa `tarla.kaldirilan`'ı artır; iğne/çivi taşıyorsan `kepcede` alanını
   ve traktördeki yereBirak desenini izle. DOM yok, `Math.random` yok.
2. `js/kural/makineler/hepsi.js`'e `import './<tur>.js';` satırı ekle (sona: garaj sırası).
3. Yeni olayları `js/olaylar.js` kataloğuna ve buraya yaz; bildirim gerekiyorsa
   `js/ozellik/makine-bildirim.js`'e bir `dinle` satırı.
4. Birim testi: `tests/makineler.test.js`'teki traktör testleri örnek (dosya 400 satırı
   aşacaksa `tests/<tur>.test.js` aç). `makineTurleri()` beklentisini güncelle.
5. Sürüş, binme, garaj, yakıt ve çarpışma ortaktır; dokunma gerekmez.
