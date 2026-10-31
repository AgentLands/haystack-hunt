# Haystack Hunt

Kuş bakışı, tarayıcıda oynanan bir arama oyunu: tepeli bir saman tarlasının içinde tek
bir iğne var. Samanı elle al, tırmıkla it, üç dedektör hakkını akıllıca kullan, güneşte
parlayan iğneyi gözden kaçırma.

## Oynamak

Derleme adımı yok; düz HTML + JavaScript (ES modülleri) + Canvas.

```
python3 -m http.server 8000      # sonra http://localhost:8000
```

(ES modülleri `file://` ile açılmaz; küçük bir yerel sunucu gerekir.)

- `?tohum=abc` adresi aynı tarlayı herkese açar; tohum yoksa **günün tarlası** gelir.
- Klavye: `1` el, `2` tırmık, `3` dedektör.

## Yarış modu

Arkadaşlarınla aynı tarlada, aynı anda yarış: ilk bulan kazanır. Bağımlılıksız bir Node 22
sunucusu hem oyunu sunar hem de odaları yürütür (`npm install` gerekmez):

```
node sunucu/sunucu.js --port 8080          # sonra http://localhost:8080 (LAN'da IP ile)
```

- **Yarış** düğmesi → adını yaz, **Oda kur** (4 harfli kod çıkar) ya da kodla **Katıl**;
  odada en çok 8 kişi. Kurucu **Başlat** deyince 3-2-1 geri sayımla herkese aynı tarla açılır.
- Yarışta diğerlerinin imleçleri renkli noktalarla, sağ üstte canlı tablo görünür; iğneyi
  bulan ya da pes eden bitirir, herkes bitince sıralama çıkar; kurucu **Rövanş** açabilir.
- Oyun sunucusuz (ör. `python3 -m http.server`) açıldıysa Yarış "Sunucu bulunamadı" der;
  tek kişilik oyun etkilenmez. İleti biçimi: `sunucu/PROTOKOL.md`.

## Kurallar

- Tarla 240×160 hücrelik bir ızgara; her hücrede kaç kat saman olduğu tutulur.
- Komşusundan 3 kattan fazla yüksek olan hücreden saman aşağı kayar (yığın kayması);
  açtığın çukurun kenarları içeri dökülür.
- İğnenin yerden bir yüksekliği var; üstündeki saman o yüksekliğe inince görünür,
  elle üstüne basınca alınır.
- İğne yüzeye 8 kattan yakınsa her 12 saniyede bir güneşte parlar.

## Geliştirme

```
node --test              # birim testleri (Node 20+)
```

| Dosya | Sorumluluk |
| --- | --- |
| `js/boyut.js` | ızgara boyutları |
| `js/rastgele.js` | tohumlu rastgelelik, günün etiketi |
| `js/tarla.js` | tarla üretimi, yığın kayması |
| `js/igne.js` | iğneyi saklama, derinlik |
| `js/araclar.js` | el, tırmık, dedektör |
| `js/cizim.js` | tuvale çizim |
| `js/oyun.js` | döngü, girdi, arayüz |
