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
  kullanılır (basılı tutma sürer); uzaksa `kontrol.hedef` olur ve karakter oraya yürür.
- Dokunmatik sanal kol `yonAyarla()` ile yazar; "Kullan" ve "Bin/İn" düğmeleri `kullan` ve
  `binIste` alanlarını kullanır.

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
- Yürüme hızı: `TEMEL_HIZ / (1 + z / 25)`; tırmanma: bir sonraki hücre ile yükseklik farkı
  `TIRMANMA` katını aşıyorsa o eksende ilerlenmez (duvar boyunca kayabilir).
- Araçlar karakterin **önünde** (yon yönünde ~1.5 hücre) ya da fare/dokunmayla seçilen
  erişimdeki hücrede çalışır. Dedektör ve mıknatıs karakterin bulunduğu hücreyi okur.
- `durum.imlec` geriye uyum için karakterin araç noktasını gösterir (yarış imleci vb.).

## Makine verisi: `durum.makineler[]`
```
{ id, tur,       // 'traktor' | 'balya' | 'ufleyici'
  x, y, yon,     // hücre birimi, radyan
  hiz,           // hücre/sn (işaretli: geri vites negatif)
  yakit,         // 0..1
  surucu,        // karakter binmiş mi
  calisiyor,     // iş aygıtı (kepçe/balyalayıcı/üfleyici) şu an çalışıyor mu
  yuk }          // türe özgü durum (ör. kepçe doluluğu 0..1), çizim okur
```
- Makineler garajda (tarla kenarında, tohumdan belirlenen yerde) başlar.
- Makine tanımları `js/kural/makineler/<tur>.js` modüllerinde, ortak kayıt
  `js/kural/makineler/kayit.js` (`makineTanimla(tur, tanim)`); tanım saf işlevlerdir
  (DOM yok): `{ ad, boy, en, azamiHiz, donus, yakitTuketim, calis(tarla, makine, dt) }`.
- Sürüş: bindiğinde W/S gaz/geri, A/D dönüş (tank tipi). Saman hızı düşürür; yükseklik
  farkı makinenin `tirmanma` eşiğini aşarsa takılır (geri çıkmak gerekir).
- **E**: yakındaki (≤ 2.5 hücre) makineye bin / makineden in.

## Çizim
- Karakter ve makineler `katmanEkle(..., 'ust')` ile, piksel uzayında (hücre * OLCEK) çizilir.
  Çizim modülü yalnız yukarıdaki verileri okur; kural koduna dokunmaz.
- Kamera varsayılan olarak karakteri (bindiyse makineyi) yumuşak takip eder; **0** tüm
  tarlayı gösterir, tekerlek yakınlaştırır.

## Yeni olaylar (olaylar.js kataloğuna eklenir)
- `karakter-adim { x, y, z }` (adım sesi/izi için, ~her adımda bir)
- `makine-bin { makine }`, `makine-in { makine }`
- `makine-calisti { makine, miktar }` (bu karede kaldırılan/itilen saman)
- `makine-takildi { makine }`, `yakit-bitti { makine }`
