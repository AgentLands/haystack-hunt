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
  tasima/hat.js       hat topolojisi: hatlariKur, hatKonumu, hatEsyalari, HAT_EN_UZUN
  tasima/hat-adim.js  hat adımı ve port protokolü: hatAdim, hatlarAdim, hatBasaKoy,
                      hatBasiBos, hedefKabul, hedefeVer, cikisaVer
  tasima/dugum.js     düğüm altyapısı: dagit, oncelikle, sirayla, tampon*, yuva*, bekleIsle
  tasima/menfez.js    menfez eşleme kuralı: menfezEsi, MENFEZ_ARA_EN_AZ/EN_COK
  parcalar/temel.js   dikey dilim: bant (kod 1), huni (2), sandik (3)
  parcalar/tasima.js  çatal (40), birleştirme oluğu (41), menfez (42)
  parcalar/hepsi.js   aile dosyalarını yükler (yeni aile = bir satır)
js/oyun-ciftlik.js            modTanimla('ciftlik'): durum kurulumu, tik, iğneler, olay yayma
js/ozellik/ciftlik/           tarayıcı tarafı
  ciftlik.js      giriş: menü düğmesi, ciftlikAc, ciftlikKaydet, otomatik kayıt, ciftlik-mod
  depo.js         localStorage (son kayıt + yedek), kota hatası bildirimi
  insa.js         inşa kipi durumu ve girdisi (işaretçi önleyici, klavye, Esc)
  palet.js        geçici palet (DOM)
  ciftlik.css     palet ve mod sınıfı
  gorsel/kayit.js     parcaCizimiTanimla, esyaCizimiTanimla, KARO_PX
  gorsel/temel.js     bant, huni, sandık ve eşya çizimleri
  gorsel/bolge.js     bölge önbelleği (gövdeler)
  gorsel/esya-cizim.js  bant eşyalarının toplu çizimi (atlas, ayıklama)
  gorsel/onizleme.js  inşa hayaleti
  gorsel/katman.js    çiftlik katmanları ('alt' ve 'ust'), ciftlikOlcum
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
- Mevcut kodlar: 1 saman, 2 iğne, 3 çivi, 100-119 `buluntu:<tur>` (sabit tablo, katalog sırası
  değişse de kayıt bozulmaz; yeni buluntu tabloya eklenmezse yükleme hata verir).

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
  guc: 0, maliyet: {}, kilit: null,    // Faz 1 verisi (çekirdek saklar)
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

## 6. Çizim kaydı (`ozellik/ciftlik/gorsel/kayit.js`)
`parcaCizimiTanimla(anahtar, { govde(ctx, p, eb), hareketli(ctx, p, an, eb) })`.
`govde` durağan gövdedir, **bölge önbelleğine** girer (16×16 karo, ekran ölçeğinde ara tuval;
parça kur/sök/dön olayı bölge sürümünü artırır, ölçek %2 değişince yenilenir). `hareketli`
her kare görünür parçalar için: `an = { zaman, tik, alfa, faz }` (`faz`: bant çıtasının dünya
pikseli kayması; sade harekette 0). Dünya pikseli: karo `(kx, ky)` = `(kx*8, ky*8)`, `eb` =
1 CSS pikselinin dünya boyu (dış hat `1.2 * eb`). Tanımsız parça yedek kutuyla çizilir.
`esyaCizimiTanimla(anahtar, ciz(ctx, r, eb))`: eşya atlasa bir kez çizilir; uzak görünümde
(eşya < 4 px) tür rengiyle toplu `fill`. Ölçüm: `ciftlikOlcum.ms/esya/parca`.

## 7. Benzetim (`benzetim.js`)
- **Tik sırası** (`tikAt(c, tarla)`): komutlar (`komut.js`) → topoloji değiştiyse `yenidenKur`
  (hatlar + aşamaların `yenidenKur`'u; düşen hat eşyaları envantere) → aşamalar `sira < 40`
  (Faz 1: enerji 20, sinyal 30) → parçaların `adim`'ı (id artan) → aşamalar `40..49` →
  hatlar (aşağı akış önce) → aşamalar `50..59` → saman: en çok `KAYMA_TIK = 6` `cokertKaro`
  (saniyede 120, normal modla aynı) → aşamalar `≥ 60` → `c.tik++` → her 20 tikte
  `ciftlik-ozet`.
- `asamaTanimla(ad, sira, { adim(ctx), yenidenKur(c, tarla) })` Faz 1 ağları içindir.
- **Komutlar** (`komutEkle(c, komut)`; sonraki tikte uygulanır, `tik` alanı eklenir):
  `{ tur: 'kur', parca, x, y, yon }` (x, y döndürülmüş kutunun sol üstü), `{ tur: 'sok', x, y }`,
  `{ tur: 'dondur', x, y, yon? }`. `komutTanimla(tur, uygula(c, tarla, komut, olaylar))` ile
  yeni tür (Faz 1: ayar, temizle, sandıktan al). Arayüz benzetimi **yalnız komutla** değiştirir.
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
{ surum: 1, tohum, tik, zar, kaymaAdim, sonrakiId, yasak: [{x,y,r}], kaldirilan,
  h: 'base64', kirli: [150], tarlaKirli, gomulu: [[esya, x, y, z, aci, alindi, ek]],
  parcalar: [[id, kod, x, y, yon, etkin, tikali, ozel]], hatEsya: [[karo, ic, kod]],
  envanter: [[kod, n]], kuyruk: [komut...], ek: { etiket } }
```
- `h`: eğim tahmini (sol + üst − sol üst) farkı → zigzag → sıfır koşusu → varint → base64
  (gerçek tarla ~28 KB; tüm kayıt ~30 KB).
- Göç: `GOCLER[surum](veri) → sonraki sürüm`; `gocUygula` sırayla uygular. Bilinmeyen sürüm,
  bilinmeyen parça kodu, kesik `h` hata verir; `ciftlikAc` önce son kaydı, sonra yedeği dener,
  olmazsa yeni çiftlik + bildirim. **Yeni alan eklemek = `SURUM`++ ve bir göç.**
- Anahtarlar: `haystack-hunt:ciftlik` (son), `haystack-hunt:ciftlik-yedek` (önceki),
  `haystack-hunt:ciftlik-ilerleme` (Faz 1 kalıcı ilerleme; ayrı tutulacak).
- Otomatik kayıt: 30 sn, sekme gizlenince, `pagehide`, `mod-kapaniyor`, inşa/söküm/dönmeden
  2 sn sonra. Kaydet → yükle → sürdür kesintisiz koşuyla bit bit aynı (test).

## 12. Olaylar (`olaylar.js` kataloğu, "Modlar ve çiftlik")
`mod-kapaniyor {durum}`, `ciftlik-acildi {durum}`, `ciftlik-kaydedildi {boyut}`,
`parca-kuruldu {parca}`, `parca-sokuldu {parca, iade}`, `parca-dondu {parca}`,
`komut-reddedildi {komut, neden}`, `parca-tikandi {parca, neden}` (Faz 1),
`gomulu-cikti {nesne, tur, x, y, parca}`, `ciftlik-igne {kaynak: 'el'|'parca', x, y}`,
`ciftlik-ozet {tik, uretilen, depolanan}` (saniyede bir; eşya başına olay YOK).
Çiftlik `bulundu`, `pes-edildi`, `ilk-hamle` yaymaz.

## 13. Arayüz (temel; arayüz ajanı genişletir)
- Menü: ana satırda "Çiftlik" (`menuAnaEkle`); çiftlikteyken zorluk, rahat ve pes gizli,
  "süren" satırında "Çiftliğe dön" (`menuModSatiriEkle`). Çıkış: "Günün tarlası"/"Yeni tarla".
- Kip (`insa.js`, durum `insa = { acik, secili, yon, hayalet, yol, basili }`, `insaDinle`):
  B palet, R/Shift+R döndür, X sök, Delete imleçtekini sök, sağ tık sök, Esc önce seçimi sonra
  paleti kapatır (`escOnleyiciEkle`; menü açılmaz). Sol tık kurar; bantta basılı sürükleme L
  yol (eksen ilk harekette seçilir), mevcut bandı yeniden yönlendirir. Çok karolu parça
  imleçte ortalanır (`yerlesimKonumu`).
- Dokunmatik: palete dokun, tuvale dokun → kurulur (8 px'ten az kaydıysa); bantta tek parmak
  sürükleme yol çeker; ikinci parmak bekleyen eylemi iptal eder (iki parmak kamera.js'te).
- Palet (`palet.js`) `parcaTurleri()`'nden kendiliğinden düğme üretir: yeni parça tanımlanınca
  palette görünür.

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
- Enerji, sinyal, maliyet/envanter harcama, siparişler, çevrimdışı hesap yok
  (kancalar hazır). Söküm maliyet iadesi yok (yalnız içerik).
- Kepçe/balya makinesi çiftlikte normal kodla çalışır; gömülü nesneyi kepçeye alırsa `c.gomulu`
  bağı korunur ama makinenin boşaltma kuralı çiftlikte özel değil.
- Elle alınan çivi/buluntu envantere girmez (normal moddaki gibi yalnız alınır); elle alınan
  iğne envantere girer.
- Dönemeçte bant çıtası düz çizilir; bölge önbelleği gövdeleri parça başına tarar (300 parçada
  sorun değil; binlerce parçada bölge dizini eklenmeli).

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
- **Hava sapı**: `havaKaynagiAyarla((c, tik) => ({ yon, siddet, gok }))`; varsayılan sabit rüzgâr 2
  (16 bg, yön 0). D gelince `hava(c.tohum, floor(tik / 1200))` bağlanır (tek satır).
- **Krank**: komut `{ tur: 'krank', x, y, ciftci: { x, y } }` (hücre); yalnız çiftçi parçanın 1 karo
  yakınındayken; `p.ozel.kalan = 600` (yeniler, eklemez). Sürerken çiftçi 3 karoyu aşarsa durur:
  oyun kare döngüsü her tikten önce `c.ciftci = { x, y }` (karakter hücresi) yazmalı; yoksa
  mesafe denetlenmez (testler, çevrimdışı). Olaylar `krank-basladi`, `krank-durdu {neden}`.
- **Lokomobil**: tampon 4 yakıt (`kabulEder`: eşya `yakit` alanı ya da tablo; balya 1200 / kıyım 150
  tik tam yükte = 40 bg × tik), yük oranında yakar; yanan eşya `icerik`'te kalır (saman korunumu),
  bitince `ctx.sayac('yakilan', kod)` ve saman sistemden çıkar. Yakıt bitip açık varsa `yakit-bitti`.
- Ölü döngü: yakıt + yel yoksa krank (bedava) hattı yürütür, sandıktaki balya yaba koluyla
  lokomobile verilir (lokomobil girişi güç istemez). Test: `tests/ciftlik-enerji.test.js`.
