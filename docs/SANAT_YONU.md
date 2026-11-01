# Sanat yönü

Arayüz "Tohum Paketi ve Çuval Damgası", oyun içi "Boyalı oyuncak". Renk ve yazı belirteçleri
`belirtec.css`'te tanımlıdır; CSS dosyaları yeni sabit renk yazmaz, `var(--...)` kullanır.
Oyun içi (Canvas) palet aşağıda; ikisi aynı sıcak öğleden sonra ışığını paylaşır.

## Arayüz

Fikir: oyunun URL'deki tarlası zaten bir **tohum** (`?tohum=`). Arayüz, bir tohum paketi /
yem çuvalı etiketi / kantar fişi gibi basılmış: kraft kâğıt, tek-iki renk mürekkep, lastik
damga, daktilo rakam, delikli kenar, ip ve çengelli iğne. Hepsi tarla dünyasından ve elle
yapılmış basım hissi verir; neon, cam, gradyan yok. Dorfromantik'in kâğıt hissi, Unpacking'in
karton dokusu, A Short Hike'ın az ve oyun içi HUD'u, eski Türk tohum paketleri ve kantar
fişleri ilham (kopya değil).

### 1 Palet (kontrast WCAG ile ölçüldü)
| Belirteç | Hex | Kullanım |
|---|---|---|
| `--ahsap` | `#3A2A1C` | sayfa/kenar zemini (ambar tahtası); `--ahsap-koyu #241910` |
| `--kagit` | `#EAD7B0` | pencere, HUD etiketi zemini |
| `--kraft` | `#D9B98A` | ikincil düğme, kart; `--kraft-koyu #B8925E` çizgi/basılı |
| `--murekkep` | `#2B2118` | yazı, kenar (kâğıtta 11.1:1) |
| `--murekkep-soluk` | `#5C4A36` | ikincil yazı (kâğıtta 6.0:1) |
| `--damga` | `#9E3A26` | birincil düğme, damga, tehlike (kâğıtta 4.8:1; üstünde `#F4E9D0` 5.6:1) |
| `--civit` | `#2F4A6D` | bilgi, yarış, bağlantı (kâğıtta 6.4:1) |
| `--saman` | `#E3B341` | seçili alet, puan vurgusu (ahşapta 7.1:1; kâğıtta yazı için değil) |
| `--cayir` | `#4E6B2F` | başarı/çözüldü (yalnız büyük yazı/ikon, 4.3:1) |

Gölge: `--golge: 2px 3px 0 rgba(36,25,16,.55)` (bulanıksız). Köşe: `--yaricap: 3px`.
Kenar: `2px solid var(--murekkep)`. Kâğıt dokusu: tek küçük SVG `feTurbulence` deseni ya da
64×64 PNG, `background-blend-mode: multiply`, ≤ 2 KB. Gradyan yalnız ikonda bile yok.

### 2 Tipografi (OFL; lisanslar google/fonts METADATA.pb'den doğrulandı)
| Rol | Yazı | Tasarımcı | woff2 boyutu (uygulanan, Latin + Türkçe tek alt küme) |
|---|---|---|---|
| Logo, başlık, düğme | **Alfa Slab One** 400 | JM Solé | 17.7 KB |
| Gövde, rehber, pencere metni | **Bree Serif** 400 | TypeTogether | 9.8 KB |
| Sayılar, etiket, fiş satırları | **Courier Prime** 700 | Alan Dague-Greene | 18.9 KB |

Toplam ≈ 46 KB. Uygulandı: üç yazı tipi de `fontTools.subset` ile tek dosyaya (Latin + Türkçe
harfler) indirildi; dosyalar `font/` altında, OFL metinleri yanlarında, `KAYNAKLAR.md`'de
satırları var; `font-display: swap`; hepsi `sw.js` `KABUK` listesinde. Courier Prime'ın 400
ağırlığı eklenmedi (yalnız 700).
Alternatif (daha "boyalı tabela"): başlıkta Rye (OFL, ≈ 50 KB); önermiyorum, fazla western.

### 3 İkonografi: elle çizilmiş SVG sprite
- Tek dosya `ikon/arayuz.svg`, `<symbol>`'ler; 24×24 viewBox, `stroke-width:2`, yuvarlak uç,
  `currentColor`; çizgiler kasıtlı hafif eğri (elle çizilmiş gibi, ızgaraya oturmayan uçlar).
  Kodla yazılır, dış kaynak gerekmez. Kullanım: `<svg><use href="ikon/arayuz.svg#el"/></svg>`.
- Liste (27): el, tirmik, dedektor, miknatis, ses-acik, ses-kapali, defter (istatistik),
  soru (rehber), bayrak (yarış), menu (üç saman çöpü), buyutec-arti, buyutec-eksi, cerceve
  (sığdır), igne, civi, balya, traktor, ufleyici, balya-makinesi, kurdele (rekor; 🏆 yerine),
  gunes (seri; 🔥 yerine), tik/kutu (çözüldü), kopyala, damla (yakıt), kapat (×), anahtar
  (Buluntular defteri düğmesi).
- Uygulama: `ikon/arayuz.svg` (27 sembol, 24 ve 48 px'te denetlendi). JS'te
  `ikon(ad, { boy })` (`js/ozellik/ikon.js`) aria-hidden bir `<svg><use/></svg>` döndürür;
  `ikonDegistir(svg, ad)` ikonu değiştirir (ses aç/kapa), `metinDegistir(dugme, metin)`
  ikonlu düğmenin yazısını ikonu silmeden değiştirir. `dugmeEkle(..., { ikon: ikon('defter') })`.
- Uygulama ikonu (`ikon/ikon.svg`, `ikon-maskable.svg`): kraft zemin, dikişli etiket
  çerçevesi, saman yığınından çıkan ipli iğne; düz renk, gradyansız. PNG'ler ve
  `favicon.ico` (16/32/48, çerçevesiz sade sürüm) bu SVG'lerden Chromium ile üretildi.

### 4 HUD yerleşimi (tuval ekranın çoğunu kaplar)
```
┌ ahşap zemin ──────────────────────────────────────────────────────┐
│ [≡ ÇUVALDIZ]  Tarla No. DENEME · Normal     [⏱ 0:42] [▦ 1.204] [♪] │ ← tuvalin üst kenarına
│                                                                   │   iğnelenmiş kâğıt etiketler
│                        (tuval, 3:2, ekrana sığar)                 │
│ [kâğıt harita]                                         [+][−][▢]   │
│        [1 El][2 Tırmık][3 Dedektör ●●○][4 Mıknatıs ●] [⛽▮▮▯]       │ ← alt ortada alet rafı;
└───────────────────────────────────────────────────────────────────┘   makinedeyken yakıt göstergesi
```
- Masaüstü: tuval `min(100vw, 100dvh·1.5)`; HUD tuval kabının içinde, kenarlara yapışık,
  tuvali en fazla ~%10 örter. Menü, istatistik, yarış, yardım: sol üstteki ≡ ve sağ üstteki
  küçük ikonlardan.
- Alet rafı: 4 kart, seçili olan 4 px yukarı kalkık + saman sarısı zemin + kalın kenar;
  diğerleri kraft. Haklar sayı değil nokta/simge. Makineye binince raf "makine kartı"na döner
  (makine ikonu, yakıt şeridi, "E in").
- Dikey telefon: üstte ince HUD şeridi (≡, süre, saman, ses), sonra tam genişlik tuval,
  altında ahşap **kumanda tablası**: alet rafı (4 kare ikon), solda kol, sağda Kullan/Bin.
- Yatay telefon: HUD tuval içinde, kol ve düğmeler köşelerde (bugünkü gibi) ama yarı saydam
  değil kâğıt-damga stilinde.

### 5 Düğmeler
- **Birincil (damga):** `--damga` zemin, `#F4E9D0` yazı, Alfa Slab One, 2 px mürekkep kenar,
  keskin gölge; basılınca `translate(2px,3px)` + gölge 0 (gerçek basma). Ekranda tek tane.
- **İkincil (kraft):** `--kraft` zemin, mürekkep yazı, aynı kenar/gölge.
- **Metin bağlantısı:** altı kesik çizgili, `--civit`; "Atla", "Odadan ayrıl", "Kapat".
- **İkon düğmesi:** 40×40 kâğıt kare, ikon `currentColor`; `title` + `aria-label` korunur.
- Odak: `outline: 3px dashed var(--civit)` (dikiş izi), offset 3 px.

### 6 Pencereler
- `dialog` = kâğıt kart: `--kagit` + doku, 2 px mürekkep kenar, köşe 3 px, keskin gölge,
  hafif `rotate(-0.6deg)` (masaya bırakılmış kâğıt); üstte ip deliği/çengelli iğne süsü
  (CSS `::before`). Başlık Alfa Slab One mürekkep renginde; altında kesik çizgi ayraç.
- Kapatma her pencerede sağ üstte "×" ikon düğmesi + Esc; alt düğme sırası sağa yaslı,
  birincil en sağda.
- Bitiş = kantar fişi (§2-16), İstatistik = tarla defteri (§2-17), Yarış = etiket kartı
  (§2-18), Yardım = sekmeli defter (§2-19). Backdrop: `rgba(36,25,16,.6)`, bulanıklık yok.

### 7 Açılış / menü ekranı
- İlk açılışta tuval arkada boşta (kamera yavaşça kayan tarla, çiftçi garajda), önde **çuval
  etiketi** kartı: el harflenmiş logo, "Tarla No. 2026-10-31" damgası, büyük birincil
  "Günün tarlası", ikincil "Yeni tarla", zorluk damgaları, bağlantı satırı: Yarış · Defter ·
  Nasıl oynanır. Kart yalnız ilk açılışta ve Menü'de görünür; "Günün tarlası" basınca kart
  aşağı kayıp kaybolur, süre ilk hamlede başlar (bugünkü gibi).
- Pes et: menüde, kırmızı metin bağlantısı + "Emin misin? İğnenin yeri gösterilecek." onayı.
- Uygulama (`js/ozellik/menu.js`, `menu.css`, logo `menu-logo.js`): `<dialog id="menu">`.
  `#gunun`, `#yeni`, `#pes` (pes onayındaki "Evet" düğmesi) ve `#alt-dugmeler` (bağlantı
  satırı; `dugmeEkle('alt')` ile eklenenler buraya düşer) DOM'da karta taşınır, kimlikleri
  ve tıklama davranışları aynıdır. Kart URL'de **`?tohum=` yoksa** ilk açılışta açılır;
  `?tohum=` doğrudan o tarlayı oynatır (paylaşılan tarla, yeniden yükleme, duman testi).
  ≡ (`#menu-ac`, başlığın başına eklenir) ve Esc yeniden açar. Açıkken klavye oyuna gitmez
  ve oyun saati durur. Yeni tarla açılınca ya da pes edilince kapanır; zorluk damgası kartı
  açık bırakır (süren tarlada onay ister, yarışta kilitlidir).
- "Nasıl oynanır" defteri (`js/ozellik/yardim.js`, içerik `yardim-icerik.js`; sayılar kural
  modüllerinden okunur): Yürüme · Aletler · Makineler · İpuçları · Diğer · Puan
  sekmeleri; dokunmatikte tuş adları yerine kol, Kullan, Bin/İn yazılır.

### 8 Uygulanan sınıflar (arayüz parçaları)
Hepsi `belirtec.css` değişkenlerini kullanır; sabit renk yok, gradyan yalnız çizgili sayfa
ve delikli kenar gibi desenlerde.
| Parça | Sınıf / kimlik | Dosya |
|---|---|---|
| Kâğıt pencere tabanı, ip deliği süsü, × düğmesi | `.kagit-pencere`, `.pencere`, `.pencere-kapat` | `pencere.css` |
| Açılış menüsü (çuval etiketi) | `#menu`, `.menu-kart`, `.menu-damga`, `.menu-zorluk`, `.zorluk-damga`, `.menu-onay` | `menu.css` |
| Nasıl oynanır defteri | `#yardim`, `.yardim-sekme`, `.yardim-liste`, `.yardim-puan` | `menu.css` |
| Kantar fişi | `#bitis.fis-pencere`, `.fis`, `.fis-satirlar`, `.fis-damga`, `.fis-toplam`, `.fis-notlar` | `pencere.css` |
| Tarla defteri (istatistik) | `.defter`, `.defter-*`, çizgili sayfa | `istatistik.css` |
| Buluntu defteri | `#buluntu-pencere`, `.buluntu-izgara`, `.buluntu-kart`, `.buluntu-damga` (nadirlik), `.buluntu-yeni` | `buluntu-defter.css` |
| Tuval köşesi kâğıt etiketleri | `.meydan-yigin` > `.meydan-etiket.hedef` / `.temiz`, `.akis-cubuk` | `meydan.css` |
| Rahat mod | `body.rahat-mod`, `[data-rahat-gizle]`, `#bitis.rahat-fis` | `meydan.css` |
| Rehber (ilk açılış notu) | `.rehber`, `.rehber-vurgu`, `.rehber-dugmeler` | `rehber.css` |
| Yarış etiket kartı ve tablo | `.yaris-*` | `yaris.css` |
| Dokunmatik kumanda | `body.dokunmatik`, sanal kol, Kullan / Bin-İn | `dokunmatik.css` |
| HUD, alet rafı, makine kartı | `.hud-etiket`, `.araclar`, `.arac-kart`, `.hak-nokta`, `.makine-karti`, `.serit` | `stil-hud.css` |
Hareketi azalt tercihinde (`prefers-reduced-motion`) CSS animasyonları ve tuval içi efektler
(`sade-hareket.js`) yumuşar; ipucu bilgisi kaybolmaz.


## Oyun içi görseller
**Sanat yönü (arayüz ajanının sıcak, elle yapılmış yönüyle uyumlu):** "Boyalı oyuncak" görünüm:
düz renk kütleleri + **ekran-sabit 1-1.5 px koyu kahve dış hat** (`#2a1a0d`, siyah değil) +
ışık tarafında tek açık ton, karşı tarafta tek koyu ton (2 tonlu cel). Palet: saman
`#d8b85a`/`#b8862e`, güneş vurgusu `#fff0c0`, kırmızı traktör `#c8401f`/`#ee5a2a`, gömlek
`#c23a26`, tulum `#34557f`, deri `#e6b089`, şapka **koyulaştırılmış hasır** `#b9813a` (taç
`#e7c27a`, bant `#9c2f1f`), metal `#5d6469`/`#b4bbc2`, gölge `rgba(40,22,8,.38)`.
Prototip (`prototip-ciftci.png`): yalnız dış hat + koyu şapka ile şapka/saman oranı
1.08 → ~1.7; 19 px'te karakter samandan net ayrılıyor (kaba çizim, yalnız etkiyi gösterir).

**Ortak yardımcı (ortak.js):** `ekranBirim(ctx)` = `1 / Math.hypot(ctx.getTransform().a,
ctx.getTransform().b)`: yerel uzayda 1 ekran pikseli. Dış hat kalınlığı = 1.2 × ekranBirim.
Uygulama: önce siluet parçalarını dış hat rengiyle `stroke`, sonra dolgu (iki geçiş).

**Çiftçi**
- Siluet: omuz elipsi biraz daralt (0.74→0.62), sırtta görünen **tulum yaması** (mavi
  dikdörtgen + iki askı düğmesi), kollar kırmızı kol + deri el. Şapka Ø'sı 0.9→0.8 ve hafif
  öne kaymış, ön kenarında ince koyu "siper" yayı: yön buradan okunur; yüz elipsi küçülür.
- Botlar gövdenin altında, adımda biri önde biri arkada görünür (bekleme: ikisi de gizli).
- Yürüme döngüsü (sürekli `adimFaz`, 6 vurgu noktası): kollar karşı fazda, gövde yanal
  salınım ±0.03, adım vurgusu ölçek 1+0.03·|cos|, bekleme nefesi 1+0.01·sin(2t).
  Ayak teması (faz 0 ve 0.5) olay-siz tespit: fazın 0/0.5'ten geçtiği karede `efekt` toz pofu.
- Alet pozları belirgin: el = öne eğilip iki elle sırayla kürek (eller öne-yana açılır, elde
  kısa saman tutamı); tırmık = sap ±35° yay, uçta saman çekilir; dedektör = sağ-sol tarama
  yayı; mıknatıs = ileri uzatılmış, nabız çizgileri. Her poz 19 px'te bekleme pozundan
  ≥%15 piksel farkı vermeli.
- Gölge dünya ekseninde sabit, yüksekliğe (z) göre kayan tek yumuşak elips.

**İğne ve çivi**: İğne gümüş ince gövde + bir ucunda **göz deliği** (boş elips) + sivri uç,
ışık tarafında beyaz çizgi, ara sıra kayan parıltı; ekran-sabit kalınlık, dünya boyu
~1.6 hücre (en az 22 px). Çivi: kalın, pas kahvesi gradyan, düz yassı baş, **hafif bükük**
(iki doğru parçası), turuncu pas lekeleri; boyu ~1.2 hücre. İkisi de dış hatlı. Siluetler
farklı: ince-düz-gözlü vs. kalın-bükük-başlı (renk körlüğüne de dayanıklı).

**Balya**: Görsel çap 1.4→1.8 hücre (kural `BALYA_YARICAP` ile birlikte düşünülmeli; kural
değişirse ayrı iş + test). Dış katman koyu yıpranmış saman `#b08a3c`, ışık yönündeki uç yüzde
açık **spiral** (sahte 3/4: silindirin bir ucu ince elips), file çizgileri, dış hat, yüksekliğe
uygun uzun gölge. Açılırken şerit tek ton + 3 vurgu çizgisi (küçük ölçekte bulanmasın).

**Makineler (ortak)**: dış hat; tekerlek dönüşü korunur; ön tekerleklere **direksiyon açısı**
(çizim modülünde `WeakMap` ile önceki `yon`dan açısal hız → ±25°); egzoz dumanı ivmede koyu
pof; motor çalışınca gövde titreşimi (var). **Yakıt göstergesi**: makine sürülürken ya da
yakıt <%25 iken makinenin üstünde ekran-sabit küçük yay çubuk (yeşil→turuncu→kırmızı,
<%10'da yanıp söner); yakıt 0'da sönük + üstünde boş bidon simgesi. Hasar sistemi kuralda
yok: ekleme (sade kal).
- Traktör: kepçe kalkışı = kepçe ileri kayar, ölçek 1.0→1.06 ve **kepçe gölgesi gövde
  gölgesinden ayrılır** (yükseklik); dolu kepçeden ara sıra çöp düşer. Kabin: ROPS çerçevesi
  kalın + üstte güneşlik tentesi (yarı saydam krem), sürücü altında görünür.
- Balya makinesi: renk değişimi (öneri: **krem gövde `#e8dcc0` + koyu turkuaz `#2f6f7a`
  şerit**; ya da mavi), arkada açılır kapak; balya bırakınca kapak açılıp balya yuvarlanır.
- Üfleyici: yerde sırt çantası çerçevesi + yakıt deposu + çekme ipi + sarılı hortum; boy
  ~1.3×1.6 hücre. Hava akımı: yarı saydam koni + akış çizgileri (glif gibi yaylar yok).

**Dedektör halkaları, kulak ve kenar işareti** (üst/alt katmanlarda, ekran-sabit dış hat):
dedektör okuması yerde kalıcı, kesik çizgili, yarı saydam bir halkadır (yarıçap seviyenin gerçek
uzaklığı; Soğuk mavi ve içi hafif karartılı); kulak ses kapalıyken kazı noktasında ara sıra çok
hafif metal pırıltı gösterir (iğnenin beyaz, çivinin turuncu pırıltısından ayrı); ekran dışı
parıltı için ekran kenarında ~3 sn nabız gibi atan küçük ışık oku vardır.

**Buluntular ve hayvanlar**: buluntular (20 tür) de boyalı oyuncak tarzında, koyu kahve dış hatlı
düz kütlelerdir (`buluntu-sekil.js`; defterde bulunmayanlar silüet); açığa çıkınca küçük "pop" ve
altın halka, alınınca "+1 Yüksük" yazısı süzülür. Hayvanlar (fare, serçe, kurbağa, kirpi, kedi)
samanda saklıdır, yaklaşınca ürküp kaçar ya da uçar (`hayvan/`); yalnız süstür.

**Garaj (yeni)**: `durum.garaj`'dan, 'alt' katmanda makinelerin altında: beton zemin
(`#b9b1a2`, çatlaklar), her park yerine sarı-beyaz çizgi, arka kenarda **açık önlü sundurma**
(paslı kırmızı oluklu sac çatı, sırt çizgisi, 4 direk; çatı makinelerin arkasında kalır ya
da altında araç/karakter varken %40 saydamlaşır), köşede iki yakıt varili + saman yığını.
