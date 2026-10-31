# Haystack Hunt

Kuş bakışı, tarayıcıda oynanan bir arama oyunu: tepeli bir saman tarlasının içinde tek
bir iğne var. Tarlada yürüyen bir çiftçisin: samanı elle al, tırmıkla it, garajdaki kepçeli
traktörle taşı, dedektör ve mıknatıs haklarını akıllıca kullan, güneşte parlayan iğneyi paslı
çivilerin parıltısından ayırt et.

**Özellikler:** Kolay / Normal / Zor seviyeleri ve puan · paslı çivi yemleri · yığın kayması,
gölgeler ve parçacık efektleri · sentezlenmiş sesler (M ile kapat) · yakınlaştırma, kaydırma ve
mini harita · istatistikler, günün tarlası serisi ve emojili paylaşım · çevrimdışı çalışan,
ana ekrana eklenebilen uygulama (PWA) · ilk açılış rehberi · çevrimiçi yarış (8 kişiye kadar).

## Oynamak

Derleme adımı yok; düz HTML + JavaScript (ES modülleri) + Canvas.

```
python3 -m http.server 8000      # sonra http://localhost:8000
```

(ES modülleri `file://` ile açılmaz; küçük bir yerel sunucu gerekir.)

- `?tohum=abc` adresi aynı tarlayı herkese açar; tohum yoksa **günün tarlası** gelir.
  `?zorluk=kolay|zor` zorluğu seçer.
- Klavye: `WASD` / oklar yürü (makinede W/S gaz, A/D dön), `Boşluk` kullan (basılı tut),
  `E` makineye bin/in, `1` el, `2` tırmık, `3` dedektör, `4` mıknatıs, `M` ses,
  `+`/`−` yakınlaştırma, `0` tüm tarla. Kamera çiftçiyi izler; fare tekerleği / iki parmak
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

- Tarla 240×160 hücrelik bir ızgara; her hücrede kaç kat saman olduğu tutulur.
- Komşusundan 3 kattan fazla yüksek olan hücreden saman aşağı kayar (yığın kayması);
  açtığın çukurun kenarları içeri dökülür.
- İğnenin yerden bir yüksekliği var; üstündeki saman o yüksekliğe inince görünür,
  yanına gidip elle alınır. Traktör kepçesi iğnenin katına inerse iğne kepçeye takılır;
  kepçe tarla kenarında boşaltılınca iğne orada açıkta yere düşer.
- İğne yüzeye 8 kattan yakınsa her 12 saniyede bir güneşte parlar (Normal; Kolay ve Zor farklı).

## Geliştirme

```
npm test                 # birim testleri (node --test; Node 22)
npm run denetim          # CLAUDE.md kurallarının kod denetimi (satır uzunluğu, dosya boyu, ...)
npm run duman            # Chromium'da uçtan uca duman testi (bkz. aşağı)
```

`npm run denetim` satır > 100 karakter, kod dosyası > 300 / test dosyası > 400 satır,
belge yorumu eksik modül, `js/kural/` içinde `Math.random` ve boş `catch` bloklarını
`dosya:satır: açıklama` biçiminde listeler; bulgu varsa çıkış kodu 1 olur.

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
| `js/boyut.js` | ızgara boyutları |
| `js/rastgele.js` | tohumlu rastgelelik, günün etiketi |
| `js/tarla.js` | tarla üretimi, yığın kayması |
| `js/igne.js` | iğneyi saklama, derinlik |
| `js/araclar.js` | el, tırmık, dedektör |
| `js/cizim.js` | tuvale çizim |
| `js/oyun.js` | döngü, girdi, arayüz |
