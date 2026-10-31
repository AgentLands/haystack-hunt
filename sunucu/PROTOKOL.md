# Yarış protokolü (sürüm 1)

Bağlantı: sayfayı sunan sunucunun `/ws` yolu (`ws://` ya da `wss://`). Her ileti tek bir
JSON nesnesidir (WebSocket metin çerçevesi); `t` alanı türünü söyler. Sunucu yalnız metin
kabul eder: ikili çerçeve 1003, 64 KB üstü ileti 1009, geçersiz UTF-8 1007 ile kapatılır.
Uygulama düzeyinde ileti ≤ 1024 karakter; bağlantı başına ~15 ileti/sn (30'luk patlama).
Sınırı aşan ileti atılır ve arada bir `hata{kod:'hiz'}` gelir; ısrar 1008 ile kapatılır.
Sunucu 15 sn'de bir ping atar; yanıt gelmeyen bağlantı düşer.

## İstemci → sunucu

| `t` | Alanlar | Ne zaman |
| --- | --- | --- |
| `kur` | `ad` | Yeni oda kurar; kuran kurucu olur. |
| `katil` | `oda` (4 harf), `ad` | Odaya katılır (lobide ya da yarış bittikten sonra). |
| `baslat` | `zorluk?` | Yalnız kurucu; oda `lobi` ya da `bitti` iken (rövanş). `zorluk`: `kolay`, `normal` (varsayılan) ya da `zor`; kurucunun seçimi. |
| `imlec` | Çiftçi konumu (aşağıda): `x`, `y`, `yon?`, `hareketli?`, `arac?`, `makine?`, `kullan?`, `saman` | Yarışta ~8 Hz, yalnız değişince. |
| `bulundu` | `sureMs` (yarış başından), `saman` | İğne alındı. |
| `pes` | — | Oyuncu pes etti. |
| `ayril` | — | Odadan çık (bağlantıyı kapatmak da aynıdır). |

### Konum iletisi (`imlec`)

Oyun artık fare imleci değil, yürüyen bir çiftçidir; `imlec` iletisi (adı geriye uyum için
korundu) çiftçinin konumunu ve bindiği makineyi taşır. Alanlar:

| Alan | Anlam | Doğrulama |
| --- | --- | --- |
| `x`, `y` | Merkez, **dünya** birimi (tarla 240×160; hücre i, [i, i+1)); makinedeyken makinenin konumu | Sayı, 0..1024, 2 ondalığa yuvarlanır. İkisi `null` ise oyuncunun çiftçisi gizlenir. |
| `yon` | Bakış yönü, radyan (0 = doğu, y aşağı pozitif) | Sayı; (-π, π]'ye sarılıp 2 ondalığa yuvarlanır. Yoksa 0. |
| `hareketli` | Bu karede yürüdü/sürüldü mü | Bool; yoksa `false`. |
| `kullan` | Aracı/iş aygıtını kullanıyor mu (Boşluk) | Bool; yoksa `false`. |
| `arac` | Seçili araç | `el`, `tirmik`, `dedektor`, `miknatis`; yoksa `el`. |
| `makine` | `null` (yürüyor) ya da `{ tur, yon, yuk? }` | `tur`: `traktor`, `balya`, `ufleyici`; `yon` açı gibi; `yuk` 0..1 (kepçe/balya doluluğu). |
| `saman` | Kaldırdığı saman (kat) | Tam sayı, 0..10⁸. |

Eski biçim (yalnız `x`, `y`, `saman`) geçerlidir; eksik alanlar varsayılanla doldurulur. Biçimsiz
alan tüm iletiyi `hata{kod:'gecersiz'}` yapar ve yayılmaz. Gönderen ~8 Hz'i (125 ms) aşmaz ve
yalnız değişince yollar; alıcı gelen konumları ~120 ms geriden doğrusal ara değerler.
Diğer oyuncuların çiftçisi ve makinesi yalnız **görsel hayalettir**: herkes kendi tarlasında
kazar, başkasının makinesi yerel tarlayı etkilemez.

`ad` temizlenir: denetim/biçim karakterleri ve `<>` atılır, boşluklar tekleşir, en çok 16
karakter. Bilinmeyen alanlar yok sayılır; biçimsiz ileti `hata{kod:'gecersiz'}` döner.

## Sunucu → istemci

| `t` | Alanlar | Anlamı |
| --- | --- | --- |
| `merhaba` | `id`, `surum` | Bağlanınca; `id` bu bağlantının oyuncu kimliği. |
| `oda` | `kod`, `kurucu`, `durum`, `tur`, `oyuncular[]` | Odanın tam durumu; her değişiklikte. |
| `geri-sayim` | `n` (3, 2, 1) | Başlat'tan sonra saniyede bir. |
| `basla` | `etiket`, `zorluk`, `tur` | Herkes aynı anda `yeniOyun(etiket, zorluk)` açar; aynı etiket + zorluk = aynı tarla. |
| `imlec` | `id` + temizlenmiş konum alanlarının hepsi | Başka bir oyuncunun çiftçisi (kendi konumun gelmez). |
| `kazanan` | `id`, `ad`, `sureMs` | İğneyi ilk bulan. |
| `hata` | `kod`, `mesaj` | Reddedilen istek; `mesaj` Türkçe, gösterilebilir. |

Hata kodları: `oda-yok`, `oda-dolu`, `yaris-suruyor`, `zaten-odada`, `kurucu-degil`,
`odada-degil`, `yaris-yok`, `sunucu-dolu`, `gecersiz`, `hiz`.

Oda `durum`u: `lobi` → `geri-sayim` → `yaris` → `bitti` (→ rövanşla yeniden `geri-sayim`).
Oyuncu kaydı: `{ id, ad, renk (0-7), durum, sira, sureMs, saman, bagli }`; oyuncu `durum`u
`bekliyor`, `oynuyor`, `buldu`, `pes`, `ayrildi`. `sira` sunucuya varış sırasıdır (ilk
`bulundu` 1.). Oynayan kalmayınca (ya da 20 dakika dolunca) yarış `bitti` olur. Odada en çok
8 bağlı oyuncu olur; kurucu ayrılırsa ilk bağlı oyuncu kurucu olur; boşalan oda silinir.

Güven: sunucu istemcinin `bulundu`, `sureMs` ve `saman` değerlerine güvenir (yalnız tür ve
aralık denetler); hile önleme yoktur.
