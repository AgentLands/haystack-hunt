# Haystack Hunt: çalışma notları

Kuş bakışı, tarayıcıda oynanan özgün bir "samanlıkta iğne" oyunu. Proje sahibi Türkçe
konuşur; kod, yorum, belge ve arayüz metinleri Türkçedir. Başka bir oyunun kopyası
değildir: başka oyunların adını, görselini ya da birebir mekaniğini kullanma.

## Komutlar
```
npm test                      # birim testleri (node --test, bağımlılık yok)
npm run duman                 # Chromium'da uçtan uca duman testi (Playwright kurulu)
node tests/e2e/duman.cjs --ekran KLASOR   # ekran görüntüleriyle
python3 -m http.server 8000   # elle oynamak için
```

## Mimari
- `js/kural/`: saf oyun kuralları (DOM yok, Node'da test edilir). Deterministik: aynı
  tohum aynı tarla. Burada `Math.random` yok; rastgelelik `rastgele.js` üretecinden.
- `js/oyun.js`: durum + eylemler; DOM'a dokunmaz, `olaylar.js` ile olay yayar.
- `js/olaylar.js`: olay yolu ve **olay kataloğu** (başındaki yorum). Yeni olay eklersen
  kataloğa yaz.
- `js/cizim.js`: tuval çizimi; özellikler `katmanEkle(islev, 'alt'|'ust')` ile katman ekler.
  Tarla boyası `js/cizim/`de: uzak görünüm hücre başına 1 piksel (`tarla-boya.js`, yalnız
  değişen koni yeniden boyanır); yakınlaşınca (z > 1.15) dünya-sabit alt piksel atlası
  (`yakin.js`: karolar, süre bütçesi; saf parçalar `alt-piksel.js`, `doku.js`, `karolar.js`).
- `js/girdi.js`, `js/arayuz.js`: işaretçi/klavye ve DOM arayüzü. Özellikler arayüze
  `dugmeEkle('ust'|'alt', {...})` ve `bildir(metin)` ile eklenir ('alt' = menü kartının
  bağlantı satırı, `js/ozellik/menu.js`); ikonlar `js/ozellik/ikon.js`; tuval üstü bindirmeler
  `#tarla-kap` içine. index.html'i elle değiştirmek yerine bunları kullan.
- `js/ana.js`: giriş; özellik modülleri burada birer satırla içe aktarılır.
- `js/ozellik/`: her özellik kendi modülünde (ses, istatistik, efekt...). Mümkünse
  çekirdeği değiştirmeden olay dinleyerek ve katman ekleyerek çalışır.

## Kurallar
- Derleme adımı ve çalışma zamanı bağımlılığı yok: düz ES modülleri, Canvas, Web API.
  (Sunucu tarafı ayrı klasörde ve kendi package.json'uyla olabilir.)
- Dosya ≤ 250 satır hedef, 300 tavan; satır ≤ 100 karakter; Türkçe tanımlayıcılar;
  her modülün başında sorumluluğunu söyleyen belge yorumu.
- Sessiz hata yutma yok: `catch` içinde en azından `console.error`.
- `localStorage` erişimi try/catch içinde; yoksa oyun yine çalışmalı.
- Telefon genişliğinde (390px) yatay taşma olmamalı; dokunmatik çalışmalı.
- Her değişiklikten sonra `npm test` ve `npm run duman` geçmeli. Kural değişikliğine
  (js/kural/) birim testi ekle.
