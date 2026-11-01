# Haystack Hunt: çalışma notları

Kuş bakışı, tarayıcıda oynanan özgün bir "samanlıkta iğne" oyunu. Proje sahibi Türkçe
konuşur; kod, yorum, belge ve arayüz metinleri Türkçedir. Başka bir oyunun kopyası
değildir: başka oyunların adını, görselini ya da birebir mekaniğini kullanma.

## Komutlar
```
npm test                      # birim testleri (node --test, bağımlılık yok)
npm run duman                 # Chromium'da uçtan uca duman testi (Playwright kurulu)
npm run e2e                   # 10 uçtan uca senaryo (tests/e2e/*.cjs; --yavas 4: CPU 4× yavaş)
npm run denetim               # kod kuralları denetimi ("DENETİM TEMİZ" demeli)
node sunucu/sunucu.js --port 8080   # yarış sunucusu (oyunu da sunar; bkz. sunucu/PROTOKOL.md)
node tests/e2e/duman.cjs --ekran KLASOR   # ekran görüntüleriyle
python3 -m http.server 8000   # elle oynamak için
```

## Uçtan uca testler (tests/e2e/)
Ortak araçlar `ortak.cjs` / `ortak-girdi.cjs`: sunucu, sayfa, koşul bekleme (`bekle`: sabit
bekleme yok), klavye/dokunma sürücüleri. Durum kancası oyun koduna eklenmez: test, sayfa
açılınca `window.__e2e = await import('./js/oyun.js')` ile oyunun kendi modül örneğine
bağlanır (durumAl, yeniOyun...). `bekle` koşulu eşzamanlı olmalı (async koşul hemen "doğru"
sayılır). Gerçek hatadan başarısız denetim silinmez: `bilinen.cjs` listesine anahtarla
(`senaryo:kimlik`) yazılır, CI'yı kırmaz, düzelince "listeden çıkarılabilir" uyarısı verir.

## Mimari
- `js/kural/`: saf oyun kuralları (DOM yok, Node'da test edilir). Deterministik: aynı
  tohum aynı tarla. Burada `Math.random` yok; rastgelelik `rastgele.js` üretecinden.
- `js/oyun.js`: durum + eylemler; DOM'a dokunmaz, `olaylar.js` ile olay yayar.
- `js/oyun-karakter.js`, `oyun-arac.js`, `oyun-makine.js`, `oyun-buluntu.js`: `oyun.js`'in
  kare adımını bölen yardımcılar (karakter, araç eylemleri, makineler, buluntular); durumu
  `oyun.js`'ten alırlar, DOM'a dokunmazlar.
- `js/olaylar.js`: olay yolu ve **olay kataloğu** (başındaki yorum). Yeni olay eklersen
  kataloğa yaz; yayılan her olay (makine olayları dahil) kataloğda olmalı.
- `js/cizim.js`: tuval çizimi; özellikler `katmanEkle(islev, 'alt'|'ust')` ile katman ekler.
  Tarla boyası `js/cizim/`de: uzak görünüm hücre başına 1 piksel (`tarla-boya.js`, yalnız
  değişen koni yeniden boyanır); yakınlaşınca (z > 1.15) dünya-sabit alt piksel atlası
  (`yakin.js`: karolar, süre bütçesi; saf parçalar `alt-piksel.js`, `doku.js`, `karolar.js`).
  `cizim/tuval-olcek.js` arka belleği CSS boyutu × devicePixelRatio yapar (toplam piksel
  üst sınırlı).
- **Tuval ölçeği kuralı:** dünya her zaman 960×640 pikseldir (240×160 hücre × `OLCEK` 4);
  arka bellek boyutu değişir ama dünya koordinatları değişmez. Dünya çizen katmanlar
  `tuval.width/height`'a bakmaz (genişlik `DUNYA_EN`); ekran uzayında çizenler
  `ctx.canvas.width/height` ve `ekran.dpr` ile çalışır; girdi `getBoundingClientRect`
  oranıyla (0..1) çevirir. Ayrıntı: `js/cizim/tuval-olcek.js` başı.
- **Kirli bayrağı kuralı:** `tarla.h`'yi (saman yüksekliği) yazan her kural yolu
  `tarla.kirli = true` kurmalıdır; yoksa yığın kayması o değişikliği hiç taramaz
  (`kural/tarla.js` başı, `tests/cokert-kirli.test.js`).
- `js/girdi.js`, `js/arayuz.js`: işaretçi/klavye ve DOM arayüzü. Özellikler arayüze
  `dugmeEkle('ust'|'alt', {...})` ve `bildir(metin)` ile eklenir ('alt' = menü kartının
  bağlantı satırı, `js/ozellik/menu.js`); ikonlar `js/ozellik/ikon.js`; tuval üstü bindirmeler
  `#tarla-kap` içine. index.html'i elle değiştirmek yerine bunları kullan.
- `js/ana.js`: giriş; özellik modülleri burada birer satırla içe aktarılır.
- `js/ozellik/`: her özellik kendi modülünde (ses, istatistik, efekt, menü, kantar fişi,
  buluntu defteri, hayvanlar, kulak, kenar işareti, akış, rahat mod, meydan okuma...).
  Mümkünse çekirdeği değiştirmeden olay dinleyerek ve katman ekleyerek çalışır. Alt klasörler:
  `efekt/` (parçacık, iz, ortam), `gorsel/` (karakter, makine, garaj çizimi), `hayvan/`.
  Pahalı saf hesaplar `arka-isci.js` (Web Worker) üzerinden `on-hazirlik.js` ile ön hazırlanır;
  işçi kurulamazsa hata günlüğe yazılır ve hesap eşzamanlı sürer.
- Oyuncuya görünen metinler (Nasıl oynanır defteri `yardim-icerik.js`, `rehber.js`, bildirimler)
  sayıları mümkünse kural modüllerinden okur; kural sayısı değişince README ve
  `docs/KARAKTER_TASARIM.md` de güncellenir. Dokunmatik ve klavye metinleri ayrı tutulur.
- `sw.js` (service worker): sayfa ağ önce, statik dosyalar (js, css, font, ikon) önbellek önce
  ve arkada tazelenir. **Yayında (js/css/ikon/font/index.html değişince) `SURUM` artırılır**;
  yoksa eski kullanıcı değişikliği ancak ikinci yüklemede görür. Yeni dosya `ana.js`'ten
  içe aktarma zinciriyle ya da sayfanın yüklediği kaynak olarak (`ozellik/pwa.js` bildirir)
  önbelleğe girer; kök dizine yeni dosya eklersen `sunucu/sunucu.js` beyaz listesine ve gerekirse
  `sw.js` `KABUK`'a ekle.
- Dış kaynak yok: ikonlar, görseller ve sesler kodla çizilir/sentezlenir; yalnız üç yazı tipi
  dışarıdan gelir (`KAYNAKLAR.md`). Yeni dış varlık eklersen lisansını (CC0/MIT/BSD/Apache-2.0/
  OFL/CC-BY) kontrol et ve `KAYNAKLAR.md`'ye yaz.

## Çiftlik modu (kur ve izle)
- Sözleşme: `docs/ciftlik/MIMARI.md` (şemalar, tik sırası, olaylar, kayıt biçimi, "yeni parça
  nasıl eklenir"). Ayrı mod: `durum.mod` ('tarla' | 'ciftlik'), `oyun.js modTanimla/modAc`;
  çiftlik kodu `js/oyun-ciftlik.js`, `js/kural/ciftlik/`, `js/ozellik/ciftlik/`.
- Normal mod (günün tarlası, yarış, istatistik, fiş, ön hazırlık) çiftlikten etkilenmez:
  çiftlikte `ilk-hamle`, `bulundu`, `pes-edildi` yayılmaz; `tests/ciftlik-ayrim.test.js`
  normal izin aynı kaldığını denetler. Normal moda dokunan değişiklikte bu test geçmeli.
- Benzetim 20 Hz sabit tik, yalnız komutla değişir (`komutEkle`), tam sayı ve tohumlu zar
  (`c.zar`); trigonometri yok. Parça kuralı (`parcaTanimla`) ile çizimi (`parcaCizimiTanimla`)
  ayrı kayıtlardadır. Parça/eşya `kod`u kayıtta saklanır, hiç yeniden kullanılmaz; kayıt
  biçimi değişirse `sakla.js SURUM`++ ve göç.
- Ölçüm: `node araclar/ciftlik-olc.mjs` (10.000 tik, hedef ≤ 1500 ms).

## Kurallar
- Derleme adımı ve çalışma zamanı bağımlılığı yok: düz ES modülleri, Canvas, Web API.
  (Sunucu tarafı ayrı klasörde ve kendi package.json'uyla olabilir.)
- Dosya ≤ 250 satır hedef, 300 tavan; satır ≤ 100 karakter; Türkçe tanımlayıcılar;
  her modülün başında sorumluluğunu söyleyen belge yorumu.
- Sessiz hata yutma yok: `catch` içinde en azından `console.error`.
- `localStorage` erişimi try/catch içinde; yoksa oyun yine çalışmalı.
- Telefon genişliğinde (390px) yatay taşma olmamalı; dokunmatik çalışmalı.
- Her değişiklikten sonra `npm test`, `npm run duman` ve `npm run denetim` geçmeli. Kural değişikliğine
  (js/kural/) birim testi ekle.
