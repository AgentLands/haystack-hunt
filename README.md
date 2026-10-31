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

## Kurallar

- Tarla 240×160 hücrelik bir ızgara; her hücrede kaç kat saman olduğu tutulur.
- Komşusundan 3 kattan fazla yüksek olan hücreden saman aşağı kayar (yığın kayması);
  açtığın çukurun kenarları içeri dökülür.
- İğnenin yerden bir yüksekliği var; üstündeki saman o yüksekliğe inince görünür,
  elle üstüne basınca alınır.
- İğne yüzeye 8 kattan yakınsa her 12 saniyede bir güneşte parlar.

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
