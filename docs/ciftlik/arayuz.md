# Arayüz: inşa, inceleme, HUD

Sanat yönü `docs/SANAT_YONU.md`: arayüz kâğıt/kraft/damga (DOM), oyun içi boyalı oyuncak
(Canvas). Yeni simgeler `ikon/arayuz.svg`'ye kodla çizilir: döndür, ayna, sil, seç, geri al,
yinele, akış, pano, kuruş, rüzgâr, rozet şekilleri. Dokunma hedefleri ≥ 44 px (telefon),
≥ 32 px (masaüstü), aralarında ≥ 8 px. Kaynak raporlar: `yerlestirme-ux.md` (ux),
`mimari.md` (mimari); çelişkiler §10'da kararla çözüldü.

## 1 Kipler (`ozellik/ciftlik/yerlestir.js`)
| Kip | Giriş | Tuval dokunuşu / tık | Çıkış |
|---|---|---|---|
| **gez** (varsayılan) | Esc, ✕ | boş tarla: yürü/araç (normal mod); parça üstü: **incele** paneli | |
| **kur:<tür>** | paletten kart, 1-9, Q pipet | hayaleti koy (§3) | Esc, sağ tık, ✕, aynı karta tekrar |
| **hat** | kur:bant ya da kur:şaft | sürükle = yol çiz (§4) | aynı |
| **sil** | X, ✂ | dokun = sök; sürükle = yoldakileri sök | aynı |
| **seç** | V, ▢ | dikdörtgen sürükle → Kopyala / Sök / Şablon kaydet | aynı |
| **yapıştır** | Ctrl+V, şablon kartı | hayalet kümesi; ✓ kurar | ✕, Esc |
Gez dışındaki kiplerde karakter yine yürür (WASD / sanal kol; kolun kendi işaretçisi var),
araçlar çalışmaz; kamera takibi bırakılır, ⌖ **Çiftçi** düğmesi (C / Home) geri getirir.
İnşa menzili yok: her yere kurulur, maliyet kuruştan (çiftçi "çekiç sallar", süs).

## 2 Palet
- Kâğıt tabla: üstte 7 aile sekmesi (Topla · Taşı · Ayıkla · İşle · Depo · Enerji · Mantık),
  altta yatay kaydırmalı kartlar (64 px): simge, ad, maliyet; kuruş yetmezse kart soluk ve
  fiyat kırmızı. Kilitli parça: gri siluet + damga adı ("D4 İlk balyalar'da açılır");
  araştırma kipinde "Araştır" bağlantısı. Öğreticide yalnız T0 kartları görünür.
- **Hızlı çubuk** (masaüstü): 1-9 son kullanılan 9 parça (yalnız kur/hat kiplerinde; gez
  kipinde 1-4 araçlardır). Telefonda sekme satırının başında son 4 parça.
- Karta uzun bas / fareyle bekle: ayrıntı kâğıdı: tek cümle ne işe yarar, portlar
  (G/Ç şeması), enerji, oran, "neyi sorar" satırı (`parcalar.md` S).

## 3 Yerleştirme ve önizleme
- **Hayalet**: yarı saydam gövde; giriş portu dolu üçgen, çıkış boş üçgen; ağız/menzil/etki
  halkası kesik çizgi; komşu bağlantılar (bu bant şu huniye bağlanır) bir an parlar.
- Renk + şekil (renk körlüğü): yeşil + ✓ geçerli; **sarı + !** geçerli ama bağlantısız
  (port boşa bakıyor); kırmızı + ✕ + çizgili desen geçersiz, altında tek satır neden:
  "dolu", "saman çok yüksek: önce temizle" (çayır dışı karoda `h > 8`), "yasak bölge",
  "kuruş yetmez", "kilitli". Kurarken alttaki ≤ 8 katlık serpinti çevreye itilir (`mimari` §2).
- **Masaüstü**: hayalet imleci izler, sol tık kurar (seri: kip açık kalır).
- **Dokunmatik** (karar §10-1): *bas-sürükle-bırak* = hayalet parmağın 48 px üstünde
  izler, **bırakınca kurulur**; parmağı palete geri sürüklemek iptal. *Tek dokunuş*
  (sürüklemesiz) = hayalet o karoya oturur ve yanında **↻ ✓ ✕** baloncuğu çıkar; ✓
  kurar, hayalet sürüklenerek taşınır. İkinci parmak gelince bekleyen eylem iptal (kamera).
- **Döndürme**: R (Shift+R ters), fare tekerleği kur kipinde döndürür (yakınlaştırma Ctrl+
  tekerlek); dokunmatikte eylem şeridindeki ⟳ (kalıcı). Kip son yönü hatırlar.
- **Yakınlık** (karar §10-3): kur kipine girerken z < 3,5 ise kamera seçili noktaya z = 3,5
  (karo ≈ 28 CSS px) yumuşakça yaklaşır; telefonda bunun için çiftlikte tavan 6 → 9
  (`zCok`), normal tarlada 6 kalır. Uzak görünümde yalnız izleme ve inceleme.
- **Pipet** (Q / parçaya çift dokunuş): alttaki parçanın türünü ve ayarlarını (yön,
  filtre, renk) kur kipine alır.

## 4 Hat çekme (bant ve şaft)
- 4 yönlü karo izi (çapraz atlama yok); ilk karonun yönü ilk baskın hareketten. Köşede
  **histerezis**: eksen değişimi için imleç karo merkezinden ≥ 0,6 karo sapmalı.
- **Geri izleme** kuyruğu siler. Var olan bandın üstünden geçmek onu yeniden yönlendirir.
- Engel: geçerli önek yeşil kalır, engel karosu kırmızı; bırakınca **önek kurulur**.
- Uçta bir portu olan parçaya varınca oraya bağlanır (sondaki ok parlar).
- Dokunmatik eşik: ≥ 8 px hareket ve ≥ 120 ms tutma sürükleme sayılır; daha kısası dokunuş.
  Kenara 24 px yaklaşınca kamera kayar.
- **Sürüklemesiz yedek** (WCAG 2.5.7): hat kipinde başlangıç karosuna dokun, bitiş
  karosuna dokun → L yolu önizlenir (⟳ köşe sırasını çevirir) → ✓.
- Yol başka bir hattın ya da şaftın üstünden geçerse o kesişme sarı gösterilir ve bırakınca
  bir **menfez** çifti önerilir (✓ ile kurulur; menfez açık değilse kırmızı).
- Rozet: "×14 · 28 kuruş". Bir sürükleme = **bir** geri alma adımı.

## 5 Silme, geri al, kopyala, şablon
- **Sil**: X kipi (tık / sürükle), sağ tık (masaüstü), panelde "Sök". İade %100, anında.
  İçinde eşya olan depo: onay kâğıdı ("Sandıkta 31 eşya: 2 iğne sana döner, gerisi atılır").
  Hattaki eşyalar sökülen bantla atılır (iğne/buluntu oyuncuya).
- **Geri al / yinele**: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z); dokunmatikte tuvalin sol altında
  ↶ ↷ (44 px) + "Geri alındı: 14 bant" bildirimi. Komut yığını 100 adım, oturumluk (kayda
  yazılmaz). Kur, sök, ayar, yapıştır geri alınır; kuruş geri alınanla birlikte döner.
  Benzetim geri alınmaz (yalnız inşa komutları).
- **Seç ve kopyala**: V/▢ ile dikdörtgen; Ctrl+C ya da "Kopyala": yönler **kopya anındaki**
  yönle saklanır. Yapıştırırken küme imleçle gelir; R/⟳ döndürür, T/⇋ aynalar (yön ve sol/sağ
  portlar yer değiştirir). **Hepsi ya da hiç**: tek kırmızı karo varsa ✓ soluk, sayaç
  "3 karo engelli · 40 kuruş eksik". Dokunmatik ve masaüstünde yapıştırma ✓ ile onaylanır.
- **Şablon**: seçimden "Şablon kaydet": ad + küçük resim; 10 yuva, ilerleme kaydında
  (dünyalar arası). Kilitli parça içeren şablon yapıştırılırken o karolar kırmızı. Paylaşım
  kodu (metin) dalga 2. Öğretici sonrası "Önerilen ilk hat" hazır şablonu.

## 6 İnceleme paneli (`panel.js`)
Gezde parçaya dokun/tıkla. Masaüstü: sağda kâğıt fiş (280 px); telefon: alttan yarım sayfa,
kaydırınca küçülür, seçili parça görünür kalır. Satırlar (kural `incele(p)` saf satır verir):
1. Simge + ad + rozet + **neden cümlesi** ("Çıkış dolu: bant #13 komşu kapısında değil
   sandıkta bitiyor, sandık dolu").
2. Verim: son 60 sn giren/çıkan eşya/dk, küçük çubuk; güç oranı "Güç %62 (yel 16 / talep 26)".
3. Tamponlar: türe göre küçük simgeler ve sayılar (tutucu 4/6, kalıp 5/8, kuruma 12/24).
4. Ayarlar: 2-durumlu anahtarlar (çatal sırayla/taşma, savak), filtre seçici (tür/sınıf),
   renk seçici (6 kare), N seçici (kile), eşik (kantar).
5. Eylemler: Döndür · Sök · Pipet · bağlama göre **Temizle / Boşalt / Onar (50)**.
Panel açıkken parçanın girdi/çıktı komşuları ve şebekesi bir an çerçevelenir.

## 7 Durum rozetleri ve akış katmanı
Rozet yalnız **sorun varken** görünür (sessizlik = iyi). Kodlar `sistemler.md` §7.
| Rozet | Şekil | Belirteç |
|---|---|---|
| guc-yok / guc-az | çizik şimşek / yarım şimşek | `--saman` |
| ac | boş huni | `--civit` |
| cikis-dolu, dolu | dolu kutu + duran ok | `--damga` |
| sikisti, kirik | çivi + ünlem / kırık çekiç | `--damga` |
| doymus, sivali | at nalı dolu / kalbur lekeli | `--saman` |
| nemli, yabanci | damla / soru | `--civit` |
| hava, yakit-yok | bulut / boş bidon (`damla`) | `--saman` |
| kapali, ayar, essiz | ▮▮ / dişli+soru / kopuk halka | gri |
- **Sorun listesi**: üst şeritte "⚠ 3" düğmesi; liste satırına dokun → kamera parçaya.
- **Akış katmanı** (F / göz düğmesi): bütün rozetler, bant yön okları, şaft şebekeleri renk
  renk, mantık parçalarında renk halkası, depolarda doluluk çubuğu. Çizim maliyeti yalnız
  açıkken.

## 8 HUD, pano, istatistik, hız, kayıt
- **Üst şerit**: ≡ · kuruş · hava (şimdi + 3 dilim tahmini: ok, şiddet, gök) · ▮▮ 1× 2× 4×
  · ⚠ sorunlar · [Pano] · ses. Süre/puan HUD'u çiftlikte gizli (`body.ciftlik-mod`).
- **Pano**: sağ üstte katlanır üç sipariş kartı (ilerleme çubuğu, ödül, süreli kartta
  kum saati). Teslimde damga iner + ses. **Kapı paneli** (Komşu kapısına dokun): Fazlasını
  sat, Araba çağır (300), Çayır genişlet (400/800/1200): kuruşun geç oyundaki kuyuları. Damga defteri: D1-D14 izleri, usta rozetleri.
- **İstatistik** (I / defter düğmesi): eşya başına üretilen/teslim/boşa giden/dk; 10
  dakikalık çizgi (1 dk kova, son 10 dk dünya kaydında); enerji dengesi; en çok duran 3
  parça (dokun → kamera); sipariş geçmişi; "bugünkü rekor kuruş/dk"; toplam iğne.
- **Hız**: ▮▮ / 1× / 2× / 4× deterministik çarpan (karede en çok 4 × hız tik; geride
  kalırsa yavaşlar, sıçramaz). P duraklat, `,` `.` hız. İnşa benzetimi **durdurmaz**;
  ayar "İnşa ederken duraklat" (varsayılan kapalı). Menü açıkken durur (mevcut kural).
- **Kayıt** (karar §10-4): tek etkin çiftlik + otomatik kayıt (30 sn, sekme gizlenince,
  inşadan 2 sn sonra) + yedek; menüde **Dışa aktar** (dosya `.json` ve panoya metin) ve
  **İçe aktar**; üst şeritte kısa "kaydedildi" izi; kota hatasında görünür uyarı + "Dışa
  aktar" önerisi. 3 adlı yuva dalga 2.

## 9 Ekran şemaları
Masaüstü 1280×800:
```
+------------------------------------------------------------------------------+
| [≡] ÇİFTLİK  ◎ 1.240  ➚ esinti ➚ ➚ ☂  [▮▮][1×][2×][4×]  ⚠2  [Pano]  ♪       |
+------------------------------------------------------------------------------+
|                                                  +--------------------------+|
|            TUVAL (kuş bakışı)                    | PANO                     ||
|   hayalet ░▒ yeşil ✓  ▷ giriş ▶ çıkış            | D5 Temiz harman  12/20 ▮▮ ||
|   hat izi ▬▬▬▬┐ ×14 · 28 kuruş                   | Muhtar 12 balya   4/12   ||
|               └▬▬▶ [pres]                        | Kümes 30 toz      0/30   ||
|                      (çiftçi)                    +--------------------------+|
|  [↶][↷]                                          | İNCELE: Balya presi  ⚠   ||
|                                         [⌖][Akış]  | Sıkıştı: kalıpta çivi   ||
|                                                  | [Temizle] [Döndür] [Sök] ||
+------------------------------------------------------------------------------+
| Topla | Taşı | Ayıkla | İşle | Depo | Enerji | Mantık |  1 2 3 4 5 6 7 8 9    |
| [huni 40][bant 2][sandık 15][çatal 20][oluk 20][mıknatıs 30]...  ->          |
+------------------------------------------------------------------------------+
  R döndür · Q pipet · X sil · V seç · Ctrl+Z geri al · F akış · Esc çık
```
Telefon 390×844 (dikey):
```
+--------------------------------------+
|[≡] ◎1.240  ➚2 ➚ ☂  [▮▮]1× ⚠2 [Pano]      |  44 px
+--------------------------------------+
|                                      |
|          TUVAL ≈ 390×470             |
|     hayalet + [↻][✓][✕] baloncuk     |
|                                      |
| [↶][↷]                     [⌖][Akış]   |
+--------------------------------------+
| Bant ▸  [⟳] [✂ Sil] [▢ Seç] [✕]      |  eylem şeridi 44 px
| [Top][Taş][Ayk][İşl][Dep][Enj][Man]  |  sekmeler (kaydırılır)
| [huni][bant][sandık][çatal][...] ->  |  kartlar 64 px (kaydırılır)
| (kol)                       [Kullan] |  ahşap tabla
+--------------------------------------+
```
İnceleme paneli telefonda tablanın üstüne alttan kayar (yarım yükseklik); pano ve
istatistik kâğıt pencere (`pencere.css`). 390 px'te yatay taşma yok: kaydırma yalnız
sekme ve kart satırlarının içinde.

## 10 Eylem tablosu ve çelişki kararları
| Eylem | Fare / klavye | Dokunmatik |
|---|---|---|
| Palet / kur kipi | B, kart tıkla, 1-9 | sekme + kart dokun |
| Yerleştir | sol tık | sürükle-bırak; ya da dokun + ✓ |
| Hat çek | sol tık sürükle | bas-sürükle; yedek: iki dokunuş + ✓ |
| Döndür | R / Shift+R / tekerlek | ⟳ |
| Pipet | Q, orta tık | parçaya çift dokun (ilk dokunuş incele panelini açar, gecikme yok) |
| Krank | Kullan | Kullan'a bir dokunuş: 30 sn döner, basılı tutma yok |
| İncele | gezde sol tık | gezde dokun |
| Sil | X kipi, sağ tık, Del (seçili) | ✂ kipi dokun/sürükle; panelde Sök |
| Seç / kopyala / yapıştır | V sürükle, Ctrl+C, Ctrl+V | ▢ sürükle → Kopyala → Yapıştır → ✓ |
| Ayna (yapıştırma) | T | ⇋ |
| Geri al / yinele | Ctrl+Z / Ctrl+Y | ↶ / ↷ |
| Kamera | orta tuş sürükle, tekerlek (gezde), + − 0 | iki parmak kaydır/sıkıştır |
| Çiftçiye dön | C, Home | ⌖ |
| Akış katmanı | F | Akış |
| Duraklat / hız | P, `,` `.` | ▮▮ 1× 2× 4× |
| İstatistik | I | defter düğmesi |
| Çık | Esc | ✕ |
Kısayollar yalnız çiftlikte ve E, Boşluk, M, WASD ile çakışmaz.

**Kararlar** (ux ↔ mimari):
1. *Dokunmatikte ✓ onayı*: mimari her yerleştirmeye ✓ istiyordu, ux onaysız bırakmayı.
   Karar: sürükle-bırak onaysız (hayalet görünürken bırakmak bilinçli), tek dokunuş ✓'lu
   (28 px karoya kısa dokunuş belirsiz: kaydırma da olabilir). Hata maliyetini geri al düşürür.
2. *Kur kipinde karakter*: ikisi uyumlu: yürür (kol ayrı işaretçi), tuval inşaya gider.
3. *Yakınlık*: ux hücre 20 px için 5× istiyordu; birim karo olduğundan z = 3,5 (karo 28 px
   ≥ WCAG 24 px) yeter ve 390 px'te ≈ 14 karo görünür (5×'te 10).
4. *Kayıt*: ux 3 yuva + IndexedDB, mimari tek dünya + localStorage. Karar: localStorage
   (dünya 5-25 KB), tek dünya + yedek + dışa/içe aktar; yuvalar dalga 2 (sömürü ve
   karmaşa yok, kayıp korkusu dışa aktarımla çözülür).
5. *Bant yolu*: mimari L yolu, ux serbest iz. Karar: sürüklemede serbest iz + histerezis,
   L yalnız iki dokunuşlu yedekte; dokunmatik eşik sayıları mimariden.
6. *Mantık bağlantısı*: mimari kablo parçası, araştırma renk. Karar: renk kanalı
   (`sistemler.md` §2): çizilecek tel yok, parça sayısı azalır.
7. *Kısayol F*: ux hem akış hem ayna için F öneriyordu: F akış, T ayna.
8. *Silme iadesi*: ux yalnız son N adıma iade öneriyordu; iade her zaman %100 olduğundan
   sömürü yok, kural sade kalır.
