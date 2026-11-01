# Çiftlik modu: uygulanan mimari (Faz 0 sözleşmesi)

Bu belge **kodda gerçekten olanı** anlatır. Faz 1 ajanları (taşıma düğümleri, enerji, sinyal,
parçalar, çizim, arayüz, kayıt/ilerleme) buna dayanır; sözleşmeyi değiştiren iş bu belgeyi de
günceller. Oyun tasarımı (parça listesi, hedefler) `docs/ciftlik/` altındaki diğer belgelerde.

## 1. Dosya haritası
```
js/kural/ciftlik/             saf kural (DOM yok, Node'da test edilir, Math.random/trig yok)
  olcu.js         KARO, KARO_EN/BOY, TIK_MS, TIK_EN_COK, BIRIM, ARALIK, DX/DY, yön ve döndürme
                  yardımcıları, durumlu zar (zarKur/zarSayi/zarAralik), FNV özet (ozetKat)
  esya.js         esyaTanimla / esyaTanimi / esyaKodu / esyaTurleri / esyaSamani, SAMAN_TUTAM
  parca-kayit.js  parcaTanimla / parcaTanimi / parcaTurleri / parcaOrnegi / portlariYenile /
                  parcaIcerigi / parcaDurumu, AILELER
  izgara.js       izgaraKur, yasakEkle, yerlestirmeEngeli, izgarayaKoy, izgaradanAl,
                  izgaraIsaretle, parcaAt, engelleriTopla, KURMA_ESIK
  benzetim.js     ciftlikKur, komutEkle, tikAt, tikSayisi, yenidenKur, asamaTanimla,
                  ctxGenislet, ciftlikSamani, SANIYE_TIK
  komut.js        komutTanimla, komutlariUygula, parcaKur, parcaSok, parcaDondur
  saman.js        samanAl, samanDok, cevreyeDagit, cokertKaro, gomuluCikar, kirliIsaretle,
                  alaniKirlet, KIRLI_KARO, KAYMA_TIK
  sakla.js        dunyaKodla, dunyaCoz, dunyaOzeti, gocUygula, GOCLER, SURUM, hKodla/hCoz,
                  ozelKodla/ozelCoz
  kayit-goc.js    göç dönüşümleri (sürüm 1 eşya kodları: iğne 2→10, çivi 3→13)
  insa/ayar.js    ayar şemalarının ortak okuyucusu (aile nesnesi / I1 dizisi → tek biçim)
  tasima/hat.js       hat topolojisi: hatlariKur, hatKonumu, hatEsyalari, HAT_EN_UZUN
  tasima/hat-adim.js  hat adımı ve port protokolü: hatAdim, hatlarAdim, hatBasaKoy,
                      hatBasiBos, hedefKabul, hedefeVer, cikisaVer
  tasima/dugum.js     düğüm altyapısı: dagit, oncelikle, sirayla, tampon*, yuva*, bekleIsle
  tasima/menfez.js    menfez eşleme kuralı: menfezEsi, MENFEZ_ARA_EN_AZ/EN_COK
  ekonomi/denge.js    TEK KAYNAK denge sayıları: fiyatlar, eşya değerleri, sipariş, damgalar,
                      kuyular, çevrimdışı; PARCA_SABIT (bütün parça sabitleri; aileler
                      parcaSabiti(anahtar) ile türetir)
  ekonomi/acilis.js   kilit kaynağı (ACILIS, kipler damga/arastirma/acik, acikMi), URETIM
                      (ürün → gereken parçalar; erişilebilirlik ve sipariş üretimi)
  ekonomi/damga.js    kalıcı ilerleme (ilerlemeKur/Bagla/Al/Kodla/Coz), damga kartı ve basma
  ekonomi/kurus.js    c.ekonomi, kurulum bedeli/söküm iadesi, esyaDegeri, bulundu, kuyular
  ekonomi/siparis.js  siparisUret, ödül, pano (ekonomiAdim), teslimEt (kapı), ekonomi komutları
  ekonomi/cevrimdisi.js  5 dk ölçüm penceresi, cevrimdisiHesapla/Uygula/Ilerle
  parcalar/temel.js   dikey dilim: bant (kod 1), sandik (3)
  parcalar/toplama.js huni (2; temel.js'ten taşındı), tırmık kolu (4), taş toplayıcı (5)
  dunya/              arazi, zemin, hava, gomulu, araba, ogretici, kapi, cekim: §18
  parcalar/tasima.js  çatal (40), birleştirme oluğu (41), menfez (42)
  parcalar/hepsi.js   aile dosyalarını yükler (yeni aile = bir satır)
js/oyun-ciftlik.js            modTanimla('ciftlik'): durum kurulumu, tik, iğneler, olay yayma
js/ozellik/ciftlik/           tarayıcı tarafı
  ciftlik.js      giriş: menü düğmesi, ciftlikAc, ciftlikKaydet, otomatik kayıt, ciftlik-mod
  depo.js         localStorage (son kayıt + yedek, bozuk → '-bozuk'), kalıcı ilerleme
                  (ilerlemeAl/Oku/Yaz), kota hatası bildirimi
  baglar.js       kural bağları: inşa ekonomisi (G), şablon yuvaları ilerlemede, hazır şablon
                  öğretici sonrası, menfez önerisi, hayaletin kuruş/kilit denetimi
  eko-veri.js     HUD verisi (saf): G panosu/damgalar/kuyular → ekonomiOzeti, kapiBilgisi
  insa.js         inşa kipi durumu, kip kaydı, işaretçi dağıtımı, geri al (ayrıntı §13)
  palet.js        inşa paleti (aile sekmeleri, kartlar, hızlı çubuk)
  ciftlik.css     palet ve mod sınıfı
  gorsel/kayit.js     parcaCizimiTanimla, esyaCizimiTanimla, esyaTopluTanimla, KARO_PX
  gorsel/temel.js     huni ve sandık çizimleri
  gorsel/bant.js      bant dokusu (dönemeçte çeyrek halka), dönemeç geometrisi
  gorsel/bolge.js     bölge dizini + önbelleği (gövdeler; kendini ölçen önbellek/doğrudan)
  gorsel/esya-atlas.js  eşya çizimleri (14 tasarım türü + 20 buluntu) ve atlas
  gorsel/esya-cizim.js  bant eşyalarının toplu çizimi (yığın türleri yolla, seyrekler atlasla)
  gorsel/hava.js      bulut gölgesi, yağmur, zerre (dunya/hava.js havaAl'dan)
  gorsel/rozet.js     durum rozetleri (şekille ayırt)
  gorsel/akis.js      akış katmanı (F; akisDegistir, akisKatmaniEkle)
  gorsel/onizleme.js  inşa hayaleti (✓ ! ✕, portlar, etki, komşu parlaması; hayaletCiz)
  gorsel/katman.js    çiftlik katmanları ('alt' ve 'ust'), ciftlikOlcum, F kısayolu
js/ozellik/menu-kanca.js      menuAnaEkle, escOnleyiciEkle, menuModSatiriEkle
araclar/ciftlik-olc.mjs       benzetim ölçümü (10.000 tik)
tests/ciftlik-*.test.js, tests/ciftlik-yardim.mjs, tests/e2e/ciftlik.cjs
```

## 2. Mod kancası (`js/oyun.js`)
- `durumKur(etiket, zorluk, secenek)`: normal tarlanın durumunu kurar (olay yaymaz);
  `yeniOyun` = `durumKur` + `oyun-basladi`. Durumda `mod: 'tarla'`.
- `modTanimla(ad, { kur(secenek) → durum, adim(durum, dt, zaman, igneAlindi) })`,
  `modAc(ad, secenek)`. `kur` hata fırlatırsa süren durum değişmez (bozuk kayıt güvenli).
- Durum değişirken süren mod `tarla` değilse önce **`mod-kapaniyor { durum }`** yayılır
  (çiftlik orada eşzamanlı kaydeder), sonra `oyun-basladi`, `arac-secildi`.
- `adim(zaman)`: bin/in, makine karesi, imleç, karakter karesi herkes için aynı sırada; sonra
  `mod !== 'tarla'` ise modun `adim`'ı ve `kare` olayı. Normal modun kalan adımları (kazan,
  kayma, iğne görünürlüğü, buluntu, parıltı) değişmedi (test: `ciftlik-ayrim`).
- Korumalar: `oyun-arac.js baslat` çiftlikte süre başlatmaz → `ilk-hamle` yok (istatistik,
  yarış, menü "süren tarla" etkilenmez); çivi cezası 0 ise `baslangic` değişmez.
  `durum.ekEngeller(x, y, makine)` varsa karakter ve makine engellerine eklenir.
- Çiftlik durumu = normal durum + `mod: 'ciftlik'`, `rahat: true`, `tikBirikim`,
  `ciftlik` (benzetim dünyası `c`), `ekEngeller`. `bitti` hep false, `baslangic` null.
- URL: çiftlikte `?mod=ciftlik` (arayuz.js), açılışta `ana.js` bunu görürse `ciftlikAc()`.
  Menü bu adresle açılınca kendiliğinden açılmaz.

## 3. Ölçüler (`olcu.js`)
| Ad | Değer | Anlam |
|---|---|---|
| `KARO` | 2 | karo kenarı (tarla hücresi); dünya pikselinde `KARO_PX = 8` |
| `KARO_EN × KARO_BOY` | 120 × 80 | inşa ızgarası; indeks `ky * 120 + kx` |
| `TIK_MS` | 50 | 20 Hz sabit tik; karede en çok `TIK_EN_COK = 4` tik |
| `BIRIM` | 240 | bir karonun hat boyu |
| `ARALIK` | 80 | bantta eşyalar arası en az (karoda 3 eşya) |
| yön | 0 doğu, 1 güney, 2 batı, 3 kuzey | `DX`, `DY`, `tersYon`, `yonDondur` |
Döndürme: yerel (x, y) her çeyrek turda saat yönünde `(boy-1-y, x)`; boyut `[boy, en]`.

## 4. Eşya kaydı (`esya.js`)
```js
esyaTanimla('saman', { kod: 1, ad: 'Saman tutamı', renk: '#e3b341', agirlik: 12,
  saman: SAMAN_TUTAM /* korunum: içerdiği kat */, gomulu: false, ...serbestAlanlar });
```
- `kod` 1..511 (`ESYA_KAP = 512`; depolar `Uint32Array(ESYA_KAP)` tutabilir), benzersiz, **hiç
  yeniden kullanılmaz**. Kayıtlar dondurulur; bilinmeyen alanlar saklanır (Faz 1: `yakit`...).
- Kodlar `esyalar.md` §2 ile aynı: 1 saman, 2 yas-ot, 3 kuru-ot, 4 toz, 5 kiyim, 6-8 balyalar,
  9 curuk-ot, 10 igne, 11 cuvaldiz, 12 altin-igne, 13 civi, 14 tas (15-20 dalga 2, ayrılı),
  100-119 `buluntu:<tur>` (sabit tablo, katalog sırası değişse de kayıt bozulmaz; yeni buluntu
  tabloya ve `BULUNTU_OZELLIK` satırına eklenmezse yükleme hata verir).
- Fizik alanları (varsayılanlı, geçersiz değer hata): `hafiflik` 0|1|2, `boyut` ince|iri,
  `manyetik`, `nem` 0|1, `sert`, `uzunluk` kisa|uzun, `yogunluk` 0..2, `deger`, `sinif`
  (saman|urun|igne|metal|cop|buluntu). Ayıklayıcılar yalnız bunları okur.

## 5. Parça tanımı (`parca-kayit.js`)
```js
parcaTanimla('emici-huni-2', {
  kod: 12,                 // 1..65535, benzersiz, hiç yeniden kullanılmaz (kayıttaki tür)
  ad: 'Büyük huni', aile: 'toplama',   // aile: AILELER ya da yeni ad (palette sona)
  boyut: [2, 2],           // karo, yon 0 için; 1..8
  yonlu: true,             // false: yon hep 0 (sandık)
  yurunur: false,          // karakter geçer mi; makineler hiçbir parçadan geçmez
  girisler: [{ x: 0, y: 0, yon: 2 }],  // parçanın İÇİNDEKİ yerel karo + baktığı kenar
  cikislar: [{ x: 1, y: 0, yon: 0 }],  // bağlandığı karo: o kenarın komşusu
  hat: null,               // { hiz, ardil?(p, c), uzunluk?(p, c) }: 1×1 taşıma parçası
  guc: 0,                  // fiyat ve kilit tanımda DEĞİL: ekonomi/denge.js PARCA_MALIYET,
                           // ekonomi/acilis.js ACILIS (tek kaynak); sabitler PARCA_SABIT
  kur(p, { c, tarla }) {}, // p.ozel'i hazırla (JSON'lanabilir: sayı, dize, dizi, düz nesne,
                           // tipli dizi; genel kodlanır, parça başına kayıt kodu yok)
  adim(ctx, p) {},         // her tik, id artan sırada (p.etkin false ise çağrılmaz)
  kabulEder(p, port, kod, ctx) { return false; },  // giriş portu protokolü (yan etkisiz)
  al(p, port, kod, ctx) {},                       // kabulEder true ise çağrılır
  icerik(p) { return { esya: [[kod, adet]], saman: 0 }; },  // söküm iadesi + korunum
  durum(p) { return 'calisiyor'; },  // 'calisiyor'|'bos'|'girdi-yok'|'cikis-dolu'|'guc-yok'|'tikali'
  incele(p) { return [['Tampon', '2/4']]; },      // inceleme paneli satırları (saf)
});
```
- Örnek `p`: `{ id, kod, x, y, yon, en, boy, etkin, tikali, oran: 1024, ozel }` + numaralanmayan
  `tanim`, `giris`/`cikis` (dünya portları `{ kx, ky, yon, hx, hy }`), `cikisHedef[k]`
  (topolojiden: `{ tur: 'hat', hat } | { tur: 'port', parca, port } | null`).
- `p.oran` 0..1024: enerji oranı (Faz 1 enerji aşaması yazar; Faz 0'da hep 1024).
- `p.tikali` true ise `parcaDurumu` hep `'tikali'` (Faz 1: paslı çivi; olay `parca-tikandi`).

**ctx** (her tik, `benzetim.js`): `{ c, tarla, tik, zar, olaylar, oran(p), ver(p, port, kod),
samanAl(x, y, r, n), samanDok(x, y, n), gomuluCikar(x, y, r, p) → [kod], olay(ad, veri),
sayac(ad, kod, n) }`. Koordinatlar samanda HÜCRE (parça merkezi `p.x * KARO + p.en`).
`ctxGenislet(islev)` ile Faz 1 alan ekler (ör. `sinyalOku/sinyalYaz`). Parça DOM'a, `yay`'a,
`Date`/`performance`'a dokunmaz; olaylar `ctx.olay` ile döner, `oyun-ciftlik.js` yayar.
`ctx.sayac('uretilen' | 'depolanan', kod)` saniyelik `ciftlik-ozet` olayına girer.

**Port protokolü**: hat sonu ya da üretici `ctx.ver` → hedef hat başıysa `hatBasaKoy`
(son eşya ≥ ARALIK ilerideyse; yeni eşya sondakinin tam ARALIK gerisine, en çok `hiz` içeri
konur → sürekli besleme tam verim), parça portuysa `kabulEder` → `al`. Bir çıkış portu
yalnız **hat başına** (öncülü olmayan bant karosu, porta geri bakmayan) ya da komşu parçanın
**o kenara bakan giriş portuna** bağlanır; aksi `null` (eşya tamponda bekler).

**Ayıklama ailesi** (parça kodları 40-44, `parcalar/ayiklama.js`; kurallar `ayiklama/ayirma.js`):
oluk mıknatısı (tamponsuz; `ozel.tutucu` kod dizisi; tanımda `cek(p, uygun)` yaba kolu için,
`doluluk(p)` kantar için, `bosalt(c, p)`; komut `{ tur: 'bosalt', x, y }`), mıknatıslı tambur,
kalbur (`ozel.siva`), tınaz, şeytan yeli. Yuvalı makineler `ozel = { kod, ilerleme, ... }`
(tek eşya; çıkış kabul etmezse yuvada bekler). Rozetler: `doymus`, `sivali`, `cikis-dolu`,
`girdi-yok`, `calisiyor` (durum güç oranına bakmaz: talep döngüsü olmasın). Rüzgâr:
`ayirma.js` `ruzgarOku(ctx)` = `dunya/hava.js havaAl(ctx.c, ctx.tik)`.

## 6. Çizim kaydı (`ozellik/ciftlik/gorsel/kayit.js`)
`parcaCizimiTanimla(anahtar, { govde(ctx, p, eb, c), hareketli(ctx, p, an, eb), akis? })`
(H1'de geriye uyumlu genişledi: `govde`'ye 4. bağımsız değişken `c`, hayalette null; `an`'a
`c`, `dolgu(renk)`, `cizgi(renk, kalin)`; isteğe bağlı `akis(ctx, p, eb, c)`).
`govde` durağan gövdedir, **bölge önbelleğine** girer (16×16 karo, ekran ölçeğinde ara tuval;
parça kur/sök/dön olayı 1 karo payla bölge sürümünü artırır, ölçek %2 değişince bütçeyle
yenilenir). Bölge dizini kare başı gezintiyi görünür bölgelerle sınırlar (`gorunurParcalar`).
`hareketli` her kare görünür parçalar için: `an = { zaman, tik, alfa, faz, c, dolgu, cizgi }`
(`faz`: bant çıtasının dünya pikseli kayması; sade harekette 0; `dolgu/cizgi` toplu Path2D:
bütün parçalardan sonra renk başına tek fill/stroke). Dünya pikseli: karo `(kx, ky)` =
`(kx*8, ky*8)`, `eb` = 1 CSS pikselinin dünya boyu (dış hat `1.2 * eb`). Tanımsız parça yedek
kutuyla çizilir. Eşya: `esyaCizimiTanimla(anahtar, ciz(ctx, r, eb))` (sprite; atlasa bir kez,
seyrek türler) ya da `esyaTopluTanimla(anahtar, { renk, govde(yol, x, y, r, d), ekler })`
(yığın türleri: tür başına toplu yol, dış hat çift dolgu; stroke/ellipse/closePath yok).
Uzak görünümde (eşya < 9 CSS px) mürekkep altlı renk kareleri. Ölçüm:
`ciftlikOlcum.ms/alt/ust/esya/parca/rozet`, `bolgeOlcum`.

## 7. Benzetim (`benzetim.js`)
- **Tik sırası** (`tikAt(c, tarla)`): komutlar (`komut.js`) → topoloji değiştiyse `yenidenKur`
  (hatlar + aşamaların `yenidenKur`'u; düşen hat eşyaları envantere) → aşamalar `sira < 40`
  (Faz 1: enerji 20, sinyal 30) → parçaların `adim`'ı (id artan) → aşamalar `40..49` →
  hatlar (aşağı akış önce) → aşamalar `50..59` → saman: en çok `KAYMA_TIK = 6` `cokertKaro`
  (saniyede 120, normal modla aynı) → aşamalar `≥ 60` → `c.tik++` → `ekonomiAdim` (biten
  kartlar ödenir/damga basılır, boş pano yuvaları dolar; saniyede bir çevrimdışı penceresi) →
  her 20 tikte `ciftlik-ozet`.
- `asamaTanimla(ad, sira, { adim(ctx), yenidenKur(c, tarla) })` Faz 1 ağları içindir.
- **Komutlar** (`komutEkle(c, komut)`; sonraki tikte uygulanır, `tik` alanı eklenir):
  `{ tur: 'kur', parca, x, y, yon }` (x, y döndürülmüş kutunun sol üstü), `{ tur: 'sok', x, y }`,
  `{ tur: 'dondur', x, y, yon? }`. `komutTanimla(tur, uygula(c, tarla, komut, olaylar))` ile
  yeni tür (Faz 1: ayar, temizle, sandıktan al). Arayüz benzetimi **yalnız komutla** değiştirir.
  `kur` kilidi ve kuruşu denetler (red `'kilitli'`, `'kurus'`) ve bedeli öder; `sok` bedeli
  %100 iade eder (`iade.kurus`); `parcaKur`/`parcaSok` doğrudan çağrılınca kuruş işlemez.
  Ekonomi komutları: `{ tur: 'siparisCevir', yuva }`, `{ tur: 'kapiSat', acik }`; kuyu
  komutları `{ tur: 'arabaCagir' }`, `{ tur: 'cayirGenislet' }` dünyanındır (§18), bedeli
  `kurus.js kuyuOde` (sayaçlar `c.ekonomi.arabaSon/arabaIstek/cayirEk`). Tek genel ayar
  komutu `{ tur: 'ayar', x, y, ad, deger }` (`isleme/komutlar.js`; şema `insa/ayar.js`).
  Alan komutları (`yapistir`, `sokAlan`) da bedel öder / iade eder (`komut.js oyuncuSokumu`).
- **Determinizm**: gerçek zaman okunmaz; zar `c.zar = { a }` (kayda girer); Map sırası = id
  sırası; trigonometri yok. Aynı tohum + aynı tik numaralı komutlar = aynı `dunyaOzeti`.
- Kare tarafı: `oyun-ciftlik.js` `tikSayisi(birikim, dt*1000)` ile karede 0-4 tik atar; geride
  kalınca tik atılır (yavaşlar, sıçramaz). Menü açıkken oyun durur → benzetim de durur.

## 8. Taşıma (`tasima/`)
- Hat: `{ id, karolar: Int32Array, ofset: Int32Array, girisYon, yonler: Uint8Array, uzun, hiz,
  n, pos: Int32Array(kap), tur: Uint16Array(kap), cikis, etkin }`; `pos[0]` en öndeki,
  `kap = uzun / ARALIK + 1`.
- Kuruluş: ardıl = önündeki bant (geri bakmıyorsa) ya da `tanim.hat.ardil`. Öncül: tam
  arkadaki aynı yönlü, yoksa en küçük karo indeksli (tek şerit, **yan yükleme yok**: diğerleri
  orada tıkanır; birleştirici parça Faz 1). Hat; ardıl yoksa, hız değişirse, `HAT_EN_UZUN = 32`
  karoda ya da halka kapanınca biter; bölünen hatlar `cikis: { tur: 'hat' }` ile bağlıdır.
  Halka en küçük karo indeksinde kesilir, kendine akar.
- Adım: öndeki bu tik sona varacaksa önce devredilir, sonra
  `pos[k] = min(pos[k] + hiz, sinir); sinir = pos[k] - ARALIK`. Verim `20 * hiz / ARALIK`
  (bant: 18 → 4,5 eşya/sn). Sıkışma doğal; üst üste binme yok.
- Topoloji değişince bütün hatlar yeniden kurulur; eşyalar karo + karo içi konumla taşınır,
  karosu kalmayan ya da sığmayan **envantere** düşer (`c.envanter`).
- Hat kancaları (`tanim.hat`): `ardil(p, c)` ardıl karo indeksi, `-1` (yok) ya da `undefined`
  (varsayılan: önündeki karo); `uzunluk(p, c)` karonun hat boyu (sanal uzun karo; çizimde tek
  karo boyunda gösterilir); `kopuk(p, c)` true ise parça hat dışıdır (önündeki bant orada
  biter, eşya girmez). Bir karoya hem `ardil` işlevi değer vermiş (sanal bağ) hem sıradan
  bant akıyorsa **sanal bağ öncül olur** (menfez çıkışının arkasına bant konsa da tünel
  besler). Şalter: `hat.etkin = false` hattı durdurur (çizimde eşyalar da durur).
- **Menfez** (`parcalar/tasima.js`, `tasima/menfez.js`): aynı yöne bakan iki ağız aynı
  doğruda, **arada 1-5 karo** (mesafe 2-6) kalırsa çift olur: arka ağız giriş (`ardil` = çıkış
  karosu, `uzunluk` = mesafe × BIRIM, bant hızı), ön ağız çıkış. Eşleme durumsuzdur ve
  yerleştirme sırasından bağımsızdır: en yakın aynı yönlü menfezlere bakılır, zincirde arkadan
  sayılan çift sıra çıkış, tek sıra giriş olur (0 giriş, 1 çıkış, 2 yeni giriş...). Eşi olmayan
  menfez `kopuk`tur: rozet `essiz`. Ara karolara her şey kurulabilir. `p.ozel` (es, rol,
  mesafe) yalnız arayüz içindir ve her tik tazelenir.
- **Çatal / birleştirme oluğu** (portlu parça + `dugum.js`): çatal tek tamponludur (giriş
  arka; çıkışlar [ön, sol, sağ]); kip `p.ozel.kip`: `sirayla` (`dagit`: dönüşümlü, kabul
  etmeyeni atlar) | `tasma` (`oncelikle`: ön, sol, sağ sırasıyla ilk kabul eden). Ayar
  `tanim.ayarlar.kip` şemasıyla ve `tanim.ayarla(p, 'kip', deger)` ile yapılır (genel `ayar`
  komutu bunu çağırmalıdır). Oluk girişi başına bir yuvalıdır (arka, sol, sağ); çıkışa
  `yuvaVer` dönüşümlü verir, böylece hat sırası (id) adaleti bozmaz: doygun girişler ±1
  paylaşır. İkisi de bir tik gecikir; bant hızını kısmaz. Rozet: ilerleyemeden
  `BEKLE_ESIK = 20` tik bekleyen eşya `cikis-dolu` verir (sürekli akışta sayaç her geçişte
  sıfırlanır).

## 9. Saman (`saman.js`)
- Kirli bölgeler: 16×16 hücre, 15×10 (`c.kirli`). Çiftliğin yazıcıları yalnız bölge işaretler.
  **`tarla.kirli` çiftlikte "yeri bilinmeyen dış değişiklik"tir** (el, tırmık, kepçe, üfleyici,
  balya yalnız onu kurar): `cokertKaro` onu görünce bütün bölgeleri kirletir ve bayrağı indirir.
  (Mimari taslaktaki "hiç karo işaretli değilse" kuralından farklı: o kural, bölge işaretliyken
  oyuncunun kazdığı yeri kaçırırdı.)
- `cokertKaro`: kirli bölgeler + 1 hücre pay, `tarla.js akit` (ESIK 3 / CAPRAZ 4), yön her
  geçişte döner; parça tabanı (`izgara.taban`) duvardır; akış olan hücrelerin bölgeleri kirli
  kalır. Normal modun `cokert`i ve izi değişmedi.
- `samanAl(tarla, c, x, y, r, n)`: her kat en yüksek hücreden (tarla.kaldirilan'a yazılmaz);
  `samanDok`: en alçağa; `cevreyeDagit`: dikdörtgen halkasına eşit (artan ilk hücrelere).
- `gomuluCikar`: menzilde, alınmamış, kepçede/balyada olmayan, taban dışı ve `h ≤ z` nesne
  `alindi` olur, eşya olur, olay `gomulu-cikti`. `c.gomulu` nesneleri oyunun `tarla.igne`,
  `tarla.civiler`, `durum.buluntular` nesneleriyle **aynıdır** (alan `esya` = kod).
- **Korunum** (test): `ciftlikSamani(c, tarla) + tarla.kaldirilan` sabittir
  (Σh + hat eşyaları + parça içerikleri + envanter).

## 10. Izgara (`izgara.js`)
`yerlestirmeEngeli` → `null | 'disarida' | 'yasak' | 'dolu' | 'saman'`. Yasak: tarla kenarının
1 karosu + `ciftlikKur(…, { yasak: [{ x, y, r }] })` daireleri (oyun: garaj park alanı).
Saman: kutudaki her hücre `h ≤ KURMA_ESIK (8)`. Kurulunca alttaki saman 1 hücrelik halkaya,
alttaki gömülü nesneler halkadaki en yakın hücreye (z = 0) itilir; taban maskesi yazılır.
Söküm: içerik envantere, ham saman (`icerik().saman`) parçanın yerine dökülür. Döndürme
yerinde (sol üst sabit; kendi kutusu boş sayılır). `engelleriTopla(c, x, y, r, makine)` →
dolu karoların `{ x, y, r: 1 }` daireleri (karakterde yürünür parçalar hariç).

## 11. Kayıt (`sakla.js`, `ozellik/ciftlik/depo.js`)
```
{ surum: 2, tohum, tik, zar, kaymaAdim, sonrakiId, yasak: [{x,y,r}], kaldirilan,
  h: 'base64', kirli: [150], tarlaKirli, gomulu: [[esya, x, y, z, aci, alindi, ek]],
  parcalar: [[id, kod, x, y, yon, etkin, tikali, ozel]], hatEsya: [[karo, ic, kod]],
  envanter: [[kod, n]], kuyruk: [komut...], ekonomi: { kurus, pano, ..., cevrimdisiKat },
  sayaclar, alanlar: { arazi, araba, ogretici }, ek: { etiket, zaman } }
```
- Göç 1 → 2: Faz 0 eşya kodları eşlenir (`kayit-goc.js`: iğne 2→10, çivi 3→13; gömülü,
  envanter, hat eşyası, huni `cikis`, sandık `say`; Faz 0 sandığındaki iğne/buluntu
  envantere), `ekonomi` eklenir, eski kurulu parçalar ödenmiş sayılır (kuruş = 300 − Σ fiyat).
  Eşya eşlemesi SURUM adımı değildir: sürüm 2 kayıtları zaten yeni kodlarla yazıldı.
- `ek.zaman` (ms): açılışta "sen yokken" kazancı (`cevrimdisiIlerle`, olay
  `ciftlik-cevrimdisi { dk, kazanc }`; yalnız menüden/adresten açılışta, dosya yüklemede değil).
  Kalıcı ilerleme dünyada değil: `ilerlemeKodla/Coz` (ayrı anahtar), `dunyaCoz(veri, tarla,
  { ilerleme })` bağlar; bağlanmamış dünya ilk okumada varsayılanı (damga kipi) alır.
- `h`: eğim tahmini (sol + üst − sol üst) farkı → zigzag → sıfır koşusu → varint → base64
  (gerçek tarla ~28 KB; tüm kayıt ~30 KB).
- Göç: `GOCLER[surum](veri) → sonraki sürüm`; `gocUygula` sırayla uygular. Bilinmeyen sürüm,
  bilinmeyen parça kodu, kesik `h` hata verir; `ciftlikAc` önce son kaydı, sonra yedeği dener,
  olmazsa yeni çiftlik + bildirim. **Yeni alan eklemek = `SURUM`++ ve bir göç.**
- Anahtarlar: `haystack-hunt:ciftlik` (son), `haystack-hunt:ciftlik-yedek` (önceki),
  `haystack-hunt:ciftlik-ilerleme` (kalıcı ilerleme: damgalar, toplamlar, defter, şablon
  yuvaları; her kayıtta ve damga basılınca yazılır, "yeni çiftlik"te kalır). Ayrıştırılamayan
  kayıt `<anahtar>-bozuk`a kopyalanır ve oyuncuya bildirilir.
- Otomatik kayıt: 30 sn, sekme gizlenince, `pagehide`, `mod-kapaniyor`, inşa/söküm/dönmeden
  2 sn sonra. Kaydet → yükle → sürdür kesintisiz koşuyla bit bit aynı (test).

## 12. Olaylar (`olaylar.js` kataloğu, "Modlar ve çiftlik")
`mod-kapaniyor {durum}`, `ciftlik-acildi {durum}`, `ciftlik-kaydedildi {boyut}`,
`parca-kuruldu {parca}`, `parca-sokuldu {parca, iade}`, `parca-dondu {parca}`,
`komut-reddedildi {komut, neden}`, `parca-tikandi {parca, neden}` (Faz 1),
`gomulu-cikti {nesne, tur, x, y, parca}`, `ciftlik-igne {kaynak: 'el'|'parca', x, y}`,
`ciftlik-ozet {tik, uretilen, depolanan}` (saniyede bir; eşya başına olay YOK).
Çiftlik `bulundu`, `pes-edildi`, `ilk-hamle` yaymaz.

## 13. Arayüz: inşa (I1; davranış `arayuz.md` §1-§6, §10)
- Menü: ana satırda "Çiftlik" (`menuAnaEkle`); çiftlikteyken zorluk, rahat ve pes gizli,
  "süren" satırında "Çiftliğe dön" (`menuModSatiriEkle`). Çıkış: "Günün tarlası"/"Yeni tarla".
- Dosyalar (`ozellik/ciftlik/`): `insa.js` durum + kip kaydı + işaretçi dağıtımı + geri al;
  `kisayol.js` tuşlar; `yerlestir.js` kur kipi (giriş; `ana.js` içe aktarır); `gez-sil.js`;
  `hat-cek.js`; `panel.js` (+ `panel-metin.js`); `palet.js` (+ `palet-ayrinti.js`, `simge.js`);
  `baloncuk.js` (✓ baloncuğu, neden etiketi, ↶ ↷, ⌖, söküm onayı); `insa-kamera.js`;
  `insa-katman.js`; `krank.js`. Saf: `kural/ciftlik/insa/{hat-yolu,yerlesim,gecmis,ayar}.js`.
- Durum `insa = { acik, kip: 'gez'|'kur'|'sil'|kayıtlı, secili (kur: anahtar, sil: 'sok'),
  yon, hayalet {kx,ky}, yol [{kx,ky,yon,durum,neden?}], yolDenetim, onizleme {x,y,en,boy,
  durum: 'gecerli'|'uyari'|'gecersiz', neden, baglar}, bekleyen, etiket, imlec, incelenen,
  silinecek, hizli }` (`gorsel/onizleme.js` okur; `yerlesimKonumu` yeniden dışa aktarılır).
- **Kip kancası** (I2): `kipTanimla(ad, { bas, tasi, bitir (e, karo) → bool, iptal, gir, cik,
  dondu, tus(e) → bool, dugme: { metin, baslik, tus: 'KeyV' } })`; `kipAc(ad)`. Düğmesi olan
  kip palette eylem şeridine ve tuşuna kendiliğinden bağlanır. Toplu eylem tek geri alma
  adımı olur: `insaEylem(ad, [{ yap: [komut], geri: [komut] }])` (`kurCifti`, `sokCifti`,
  `dondurCifti`: `kural/ciftlik/insa/gecmis.js`). Yığın 100 adım, oturumluk; reddedilen
  komutun çifti son adımdan düşer.
- **Ekonomi kancası** (G): `insaKaynagiKur({ kurus(durum) → n|null, fiyat(tanim) → n|null,
  kilit(tanim, durum) → null|metin })`; `baglar.js` G'ye bağlar (parcaMaliyeti, kilitBilgisi).
- **Menfez kancası** (A): `menfezOnerisiKur(({ c, tarla, anahtar, yol, denetim }) →
  { metin, ciftler } | null)`; yoksa dik kesişme engeldir (önek kurulur).
- **Ayar** (parçalar): iki şema biçimi `insa/ayar.js`'te tek biçime çevrilir: aile nesnesi
  `ayarlar: { ad: { tur: 'iki'|'secim'|'renk'|'filtre'|'eylem', secenekler, etiket? } }`
  (`ag/ayar.js ayarUygula` doğrular) ya da dizi `[{ ad, tur, etiket, secenekler: [{ deger,
  metin }], varsayilan }]`; isteğe bağlı `ayarOku(p, ad)`, `ayarla(p, ad, deger, { c, tarla })`
  (false → red). Tek komut `{ tur: 'ayar', x, y, ad, deger }` (`isleme/komutlar.js`) →
  `parca-ayarlandi { parca, komut, ad, deger }`, red `'gecersiz'`. Panel, pipet ve geri al
  bunu kullanır. Palet kartının ayrıntı kâğıdı `tanim.aciklama` ve `tanim.soru` okur.
- **Krank** (B): Kullan / Boşluk bir dokunuşta çiftçinin yanındaki (kuralın başlatma menzili)
  `el-kranki` parçasına `{ tur: 'krank', x, y, ciftci }` verir; 3 karo içinde ama uzaksa
  "yanına git" denir. Süre ve uzaklaşınca durma kuralda.
- **Seç kipi** (I2): `kipTanimla('sec')` (palette ▢ Seç, V); I2 şeridi yalnız kip açıkken.
- Panel eylemleri `{ tur: 'temizle'|'onar'|'bosalt', x, y }` komutlarını verir (durum
  `tikali`/`sikisti`, `kirik`, depo dolu); komutu ilgili iş tanımlar.

## 14. Yeni parça nasıl eklenir
1. Aile dosyası seç ya da aç: `js/kural/ciftlik/parcalar/<aile>.js` (≤ 250 satır); yeni dosya
   ise `parcalar/hepsi.js`'e `import './<aile>.js';` ekle.
2. Kullanılmamış bir `kod` al (bu belgedeki tablo + `grep -rn "kod:" js/kural/ciftlik/parcalar`);
   yeni eşya türü gerekiyorsa `esyaTanimla` ile (kodu 4..99 ya da 120..511).
3. `parcaTanimla(anahtar, { … })`: boyut, portlar (yon 0 çerçevesinde, içerideki karo),
   `kur` (ozel), `adim` (ctx ile; ctx dışına çıkma), giriş portu varsa `kabulEder`/`al`, içinde
   eşya/saman tutuyorsa **`icerik`** (korunum ve söküm iadesi bunu kullanır), `durum`, `incele`.
4. Çizim: `js/ozellik/ciftlik/gorsel/<aile>.js` içinde `parcaCizimiTanimla(anahtar, { govde,
   hareketli })`; dosyayı `gorsel/katman.js`'e bir satırla içe aktar. (Çizim yoksa yedek kutu.)
5. Test: `tests/ciftlik-<aile>.test.js` (yardımcılar `tests/ciftlik-yardim.mjs`: `dunya`,
   `duzTarla`, `kur`, `bantCek`, `kos`). Korunum: `ciftlikSamani + kaldirilan` sabit kalmalı;
   ozel kaydet → yükle gidiş-dönüşü (`dunyaKodla`/`dunyaCoz`) aynı özet vermeli.
6. `node araclar/ciftlik-olc.mjs` ile maliyet (10.000 tik ≤ 1500 ms), `npm test`,
   `npm run denetim`, `npm run e2e`.
Kodu, `ozel` biçimini ya da port düzenini değiştirmek kayıt uyumunu bozar: `SURUM`++ + göç.

## 15. Ölçümler (Faz 0, masaüstü Node 22)
- `araclar/ciftlik-olc.mjs`: 904 parça (4 huni hattı + 36 halka), 2016 eşya, 4 huni yığını
  sürekli kirletirken 10.000 tik ≈ 750 ms (75 µs/tik); huni yokken ≈ 450 ms.
- Kayıt: ~30 KB JSON, kodlama ~5 ms.

## 16. Bilinen sınırlar / Faz 1'e kalanlar
- Elle alınan iğne ve buluntu "bulundu" sayılır ('tam'); buluntu envantere girmez.
- Dik yığının eteğinde sökülen parçanın karosunu yığın doldurabilir (h > 8): aynı yere geri
  kurmak için önce temizlemek gerekir (test todo; gerçek tarlada nadir).
- Telefonda tarlanın en üst satırları HUD şeridinin altında kalır (kamera dünyanın kenarından
  öteye kaymaz); inşa kipinde daha yakın zoom (≈ 28 px karo) eklenmedi.
- Kepçe/balya makinesi çiftlikte normal kodla çalışır; gömülü nesneyi kepçeye alırsa `c.gomulu`
  bağı korunur ama makinenin boşaltma kuralı çiftlikte özel değil.
- Dönemeçte bant çıtası düz çizilir; bölge önbelleği gövdeleri parça başına tarar (300 parçada
  sorun değil; binlerce parçada bölge dizini eklenmeli).
- Şaft şebekesi ve renk kanalı akış çizimleri B/C'nin `akisKatmaniEkle` / `akis` kancalarıyla
  gelir (H1).

## 17. Enerji (B işi: `kural/ciftlik/ag/enerji.js`, `parcalar/enerji.js`)
- Aşama `enerji` (sıra 20, `asamaTanimla`): her tik bileşen başına `arz`/`talep` → `oran`; makinenin
  `p.oran`'ı yazılır (parça `ctx.oran(p)` ile okur). Sıra: üreticiler (`uret`) → volan (`depo`)
  → lokomobil (`destek`, volandan sonra kalan açık) → `oran = talep ? min(1024, arz*1024/talep) : 1024`.
- **Şebeke** (`yenidenKur`'da, topoloji değişince): şaft + `aile: 'enerji'` parçalar iletkendir;
  makine = `guc > 0` ya da `gucsuzOran` tanımlı parça. Kenar komşuluğu birleştirir; iki makine
  birbirine iletmez (en az biri iletken olmalı); iletken parçasız makine şebekesizdir
  (`oran = gucsuzOran ?? 0`). `aksYonler: [yon...]` (yon 0 çerçevesi) aks kenarlarını kısıtlar
  (lokomobil: yalnız iki yan). `c.enerji = { aglar, yalniz }` (kayda girmez, kurulur);
  `agiBul(c, p)` panel için `{ arz, talep, oran, uyeler }`; `gucRozeti(p)` 'guc-yok' | 'guc-az'.
- **Makine parça sözleşmesi** (E, F, D): `guc` (bg), isteğe bağlı `gucsuzOran` (0..1024) ve talep:
  `talep(p, ctx)` → bg (darbeli yük: pres basarken 30, dolarken 4) ya da yoksa `durum(p)`
  `'calisiyor' | 'guc-yok' | 'guc-az'` iken `guc`, başka durumda 0 (boş makine talep etmez).
  Durum, oran 0 olduğu için "girdi-yok"a düşmemeli (girdiyi oran'dan bağımsız ölç). Etkin oran
  `max(gucsuzOran, oran)`; `guc: 0` ve `gucsuzOran` yoksa parça şebekeye girmez, `p.oran` 1024 kalır.
- Parça kodları: 22 el-kranki, 23 yel-degirmeni, 24 lokomobil, 25 saft, 26 volan (parça numarası).
- **Hava**: `dunya/hava.js havaAl(c, tik)` (enerji.js yeniden dışa aktarır). Testler
  `havaSabitle(h)` (bütün dünyalar) ya da dünya başına `c.havaSabit` ile sabitler.
- Çizim verisi: aks parçalarında `p.bag` (bağlı kenar bitleri), üreticilerde `p.oran` =
  üretim / `tanim.enCokBg` × 1024. Volanın deposu `tanim.enerjiDepo` (`depo` adı eşya
  deposunun çevrimdışı arayüzüdür). Makineler çalışırken `gucRozeti(p)` rozetini verir.
- **Krank**: komut `{ tur: 'krank', x, y, ciftci: { x, y } }` (hücre); yalnız çiftçi parçanın 1 karo
  yakınındayken; `p.ozel.kalan = 600` (yeniler, eklemez). Sürerken çiftçi 3 karoyu aşarsa durur:
  oyun kare döngüsü her tikten önce `c.ciftci = { x, y }` (karakter hücresi) yazmalı; yoksa
  mesafe denetlenmez (testler, çevrimdışı). Olaylar `krank-basladi`, `krank-durdu {neden}`.
- **Lokomobil**: tampon 4 yakıt (`kabulEder`: eşya `yakit` alanı ya da tablo; balya 1200 / kıyım 150
  tik tam yükte = 40 bg × tik), yük oranında yakar; yanan eşya `icerik`'te kalır (saman korunumu),
  bitince `ctx.sayac('yakilan', kod)` ve saman sistemden çıkar. Yakıt bitip açık varsa `yakit-bitti`.
- Ölü döngü: yakıt + yel yoksa krank (bedava) hattı yürütür, sandıktaki balya yaba koluyla
  lokomobile verilir (lokomobil girişi güç istemez). Test: `tests/ciftlik-enerji.test.js`.

## F. İşleme, depo ve kol (F işi: `parcalar/isleme.js`, `parcalar/depo-kol.js`, `isleme/`)
- Parça kodları: 13 ot-savurucu, 14 kurutma-ambari, 15 balya-presi, 16 cekicli-kiyici,
  17 gubre-cukuru, 19 ambar, 20 defter-masasi, 21 yaba-kolu, 31 komsu-kapisi (18 boş; sandık 3).
  Kıyıcı ve gübre çukuru `isleme/kiyici-gubre.js`'te (dosya boyu), sabitler `isleme/sabitler.js`
  (`ISLEME`, `DEPO_KOL` depo-kol.js'te; G denge.js'e taşıyabilir).
- **Makineler** `talep(p)` verir (ilerleyemeyen 0; pres dolarken 4, basarken 30), `gucsuzOran`:
  ot savurucu 341, kurutma 256. İlerleme `isleme/bulundu.js ilerle(o, alan, oran, tik)`: tam güçte
  tam `tik` sürer. Ot savurucu havayı `ag/enerji.js havaAl` ile okur (gok 'gunes'|'bulut'|'yagmur').
  Rozet için giriş portunda bekleyen reddedilmiş eşya (`girisBekleyen`, hattın ucundaki)
  `p.ozel.bekleyen`'e yazılır: 'nemli' (nem 1) | 'yabanci'.
- **Pres sıkışması** `p.tikali = true` + `parca-tikandi { neden: 'sikisti', kod }`; **kıyıcı
  kırılması** `p.ozel.kirik` (rozet 'kirik'), sert eşya çıkıştan atılır. Komutlar
  (`isleme/komutlar.js`): `{ tur: 'temizle', x, y }` → `tanim.temizle(p, k, ortam)`,
  `{ tur: 'onar', x, y }` → `tanim.onar` (50 kuruş + 200 tik), ve **genel** `{ tur: 'ayar', x, y,
  ad, deger }` → `tanim.ayarla(p, ad, deger) → bool` varsa o, yoksa `ag/ayar.js ayarUygula`.
- **İğne/buluntu hiçbir yolla yok olmaz** (`isleme/bulundu.js`): `bulundu(ortam, kod, kaynak,
  kip, p)` = G'nin `ekonomi/kurus.js bulundu` (kuruş, toplamlar, defterCiftlik) + zengin olay
  `ciftlik-bulundu`; `oyuncuyaVer` envantere koyar + bulundu. Sandık ve ambar 'yari' (depoda
  tutmaz, doluyken de alır; `ozel.bulunan` tür sayacı), defter masası 'tam', kapı ve gübre çukuru
  'kurussuz' + envanter, Temizle 'tam' + envanter. **Söküm kancası** (`komut.js
  sokumKancasiEkle`): sökülen parçanın içeriğindeki ve sökülen bant karosundaki iğne/buluntu için
  'sokum' 'tam' (envantere çekirdek koyar). `tanim.sokulmez` (kapı) sökülmez/döndürülmez.
- **Yaba kolu** (`isleme/hat-el.js`): arkadaki karodan alır: `tanim.cek(q, uygun) → kod | 0`
  olan parça (sandık, ambar, oluk mıknatısı) ya da hat karosundaki filtreye uyan ilk eşya;
  16 tik salınır, öndeki karoya bırakır: kola bakan giriş portu (kabulEder/al) ya da hat
  karosu (aralık kuralıyla araya). Filtre `{ tur: 'hepsi' | 'esya', kod | 'sinif', sinif |
  'manyetik' }` (ag/ayar.js biçimi + manyetik); seçimsiz → rozet 'ayar'.
- **Komşu kapısı** (2×2, girişler arka kenarın iki karosu; `paletDisi`: palet bunu atlamalı,
  kurulumu D yapar): her şeyi alır, tıkanmaz; her eşya G'nin `ekonomi/siparis.js teslimEt`'ine
  gider ('siparis' | 'iade' | 'satildi' | 'atildi'); 'iade'de eşya envantere girer.
- `doluluk(p) → { n, kap }` (kantar): ambar, kurutma ambarı (yuva + hazır), gübre çukuru (puan).
- Dünyadan çıkan saman `c.cikanKat` (satılan, atılan, gübrelenen, yakılan; arazi kayıt alanı
  sayacı); gübre çukuru `dunya/zemin.js gubrele` ile çayırı gübreler (gübrelenen karo sayısı).
- Depolar (sandık, ambar) çevrimdışı kazanç için `depo: { bos(p), ekle(p, kod, n) }` verir
  (`parcalar/temel.js sayacDeposu`).
- Testler: `tests/ciftlik-isleme.test.js`, `tests/ciftlik-depo.test.js` (yardımcı parçalar
  `tests/ciftlik-isleme-yardim.mjs`: test-kaynak, test-alici, test-guc).
## 18. Dünya (D işi: `kural/ciftlik/dunya/`, `parcalar/toplama.js`)
- **Arazi** (`arazi.js`, `zemin.js`): `ciftlikTarlasi(tohum)` = `tarlaKurAyar` (normal formül,
  `CIFTLIK_YIGIN`); `araziKur(tarla, garaj, yasakDaire, tohum)` → `c.arazi = { zemin: Uint8Array
  (karo; ZEMIN.HARMAN/CAYIR/EKIN), gubre: Uint32Array (gübrenin bittiği tik), cayir, kapi, dokum,
  seviye, baslangicStok }`; `araziBagla(c, arazi)`. Arazisiz dünya (testler, eski kayıt) =
  hepsi harman (`dunyaHazirla`). Çayır karosunda kurma eşiği yok (`izgara.js`). Oyun:
  `durumKur(…, { tarlaKur: ciftlikTarlasi })` (normal tarla izi AYNI; `oyun.js` tek satır).
- **Kaynak sayaçları** (c üstünde): `cayirKat`, `arabaKat`, `cevrimdisiKat` (G yazar),
  `tuketilenKat` (harmandan toplanan; araba tetiği), `cikanKat` (F). Korunum: `ciftlikSamani +
  kaldirilan − cayirKat − arabaKat − cevrimdisiKat + cikanKat` sabit.
- **Hava** (`hava.js`, durumsuz): `hava(tohum, dilim) → { dilim, yon, siddet, gok }`,
  `havaAl(c, tik = c.tik)`, `havaTahmini(c, n = 3)`, `ruzgarDik(h, eksen)`, `DILIM_TIK` 1200,
  `GOK.GUNES/BULUT/YAGMUR` ('gunes'/'bulut'/'yagmur'). Bütün parçalar, HUD ve hava görseli
  buradan okur (tek kaynak). Aşama 5: yeni dilimde `hava-degisti`; açılışta bir kez
  `ozellik/ciftlik/ciftlik.js` yayar.
- **Komşu kapısı** (`kapi.js`): kapı karoları `araziKur`'da düzlenir; `kapiKur(c, tarla)` F'nin
  `komsu-kapisi` parçasını arazinin kapı yerine kurar (parça yönü = arazi yönü + 2; yeni
  çiftlikte ve eski kayıt açılırken; zaten varsa bir şey yapmaz).
- **Huni çekimi** (`cekim.js`, birleştirme kararı): yığınlar doğal eğime (ESIK 3) yakın
  olduğundan ağzı yalnız kendi karosundan alan huni önündeki koniyi ≈ 150-250 tutamda tüketip
  aç kalıyordu. Ağız boşken önündeki 16 hücrelik alanda saman ağza doğru fark ≥ 2 ile kayar
  (tikte ≤ 2 kat, korunumlu): pasif huni yığın eteğinde sürekli ≈ 50/dk. Öğretici huni yeri
  ağzın önünde yığın gövdesi (≥ 8000 kat) arar.
- **Aşamalar**: hava 5, çayır büyümesi 55, araba 57, yuvarlanma 65, öğretici 66.
- **Toplama kuralı** (`saman.js` eki: `karoHucreleri`, `agizdanAl`, `gomuluBirAl`): huni ağzı
  çıkışın KARŞI kenarındaki 2×1 karo (yon 0: çıkış doğu, ağız batı; Faz 0 kayıt uyumu için),
  `ilerleme += oran` (1024 = 1 kat), tutam türü ağız zemininden (çayır → yaş ot; harman →
  saman, `c.zar` binde 125 toz), bir tikte bir eşya (gömülü önce), tampon doluyken almaz.
  `etki(p)` önizleme için ağız/halka/menzil verir. `gucsuzOran` huni 512, tırmık/taş 0.
- **Gömülü** (`gomulu.js`): başlangıç 4 iğne + 1 çuvaldız + (%30) altın, 120 çivi, 90 taş,
  40 buluntu; `gomuluEkle(c, nesneler, olay)` → `gomulu-eklendi` (oyun listeleri yeniler);
  hiçbir nesne silinmez. `igneMi(kod)`, `enYakinAcik`.
- **Kayıt**: `sakla.js kayitAlaniTanimla(ad, { kodla(c), coz(c, v|undefined) })` → kayıtta
  `alanlar[ad]` (arazi+sayaçlar, araba, ogretici). Alanı olmayan eski kayıt varsayılan kurar.
- **Kuruş kuyuları**: `arabaCagir`, `cayirGenislet` komutları dünyanındır (red 'yolda', 'erken',
  'yer-yok' / 'cayir-yok', 'en-cok'); bedeli G'nin `kurus.js kuyuOde(c, tur, seviye, olay)` öder
  (red 'kurus', 'taban'; olay `kuyu-kullanildi`).

