# Parçalar: ilk sürüm (30 parça)

Sonraki dalga: `parcalar-dalga2.md`. Kilit kodları (T0, D1-D8): `ekonomi.md` §4.
**Okuma**: başlık = `No. Ad` · `kod-adı` · aile · boyut (karo, yön 0 = doğuya bakar) ·
yönlü mü · maliyet (kuruş) · kilit. **P** portlar (G giriş, Ç çıkış; yöne göre arka/ön/
sol/sağ), **E** enerji (bg; + üretim), **O** oran (tik, eşya/dk; tam güçte), **A** ayırt
edici mekanik, **S** sorduğu soru, **H** hata/tıkanma modu, **G** kuş bakışı görünüm.
Ortak kurallar: güç oranı `o` (0..1024) iş ilerlemesini `o/1024` ile çarpar (yumuşak
bozulma); söküm %100 iade; her parçanın panelinde "neden duruyor" tek cümlesi vardır;
makine, ilerleyemediği tikte (girdi yok / çıkış dolu / sıkışık) güç **talep etmez**.

## Toplama
**1. Emici huni** · `emici-huni` · toplama · 2×2 · yönlü · 40 · T0
- P: ağız = önündeki 2×1 karo (tarla hücreleri, parça dışı); Ç arka orta. E: 0; aks
  bağlıysa 4 bg ile çift hız. O: pasif 1 kat/2 tik = 50 tutam/dk; güçlü 100/dk; tampon 4.
- A: kendi altını kazmaz; ağzındaki çukuru **yığın kayması** doldurur, açıkta kalan iğne
  ve çiviler de çukura yuvarlanır. S: "Yığın nereye akar, huniyi nereye koymalı?"
- H: koni bitince "aç" (ağızda saman yok, kayma durdu): taşı ya da tırmık koluyla besle;
  çıkış dolu. G: ahşap kasnaklı huni, ağızda dört kanatlı tahta çark, içine kayan saman.

**2. Tırmık kolu** · `tirmik-kolu` · toplama · 1×1 · yönlü · 120 · D6
- P: eşya portu yok; etki halkası 1-3 karo yarıçap; yığma noktası = önündeki karo.
  E: 8 bg (güçsüz durur). O: halkadan 2 kat/tik alıp yığma noktasına döker; açıktaki
  nesneleri her 20 tikte 1 hücre yığma noktasına sürükler.
- A: eşya üretmez, **tarlayı şekillendirir**: kaymanın olmadığı düz çayırda ve harmanın
  artık (h ≤ 8) yaygınlarında huniyi besler.
  Çayırda halka ≈ 100 hücre × 5 kat/dk → sürekli ≈ 42 tutam/dk. S: "Düz yerde saman
  huniye nasıl gelir?"
- H: halka boşsa "aç" (çayır büyümesini bekler); yığma noktası 40 katı aşınca durur
  ("yığın taştı": önündeki huni yetişemiyor). G: dönen dört kollu yıldız tırmık, halkada
  yay biçiminde tarak izleri.

**3. Taş toplayıcı** · `tas-toplayici` · toplama · 2×2 · yönlü · 110 · D5
- P: Ç ön; menzil 4 karo yarıçap. E: 6 bg. O: 60 tikte bir açıktaki en yakın nesneyi
  alır (eşitlikte küçük hücre indeksi) ≤ 20/dk; tampon 4.
- A: samana dokunmaz; yalnız **açıkta parlayan** nesneleri (iğne, çivi, taş, buluntu)
  toplar; nesneleri huni çukuru ya da **tırmık kolu halkası** açığa çıkarır (ikisi
  "iğne avcısı" ikilisi: tırmık kazar, toplayıcı alır). S: "Saman taşımadan iğneyi nasıl
  yakalarım?"
- H: menzilde açık nesne yoksa "aç"; çıkış dolu. G: dönen tabla üstünde uzun sepetli
  ahşap kepçe kolu, sepette taşlar.

## Taşıma
**4. Bant** · `bant` · taşıma · 1×1 · yönlü · 2 · T0
- P: G arka, Ç ön; yürünür. E: 0. O: 4,5 eşya/sn = 270/dk (HIZ 18, ARALIK 80).
- A: tek şerit, yan yükleme yok, önü doluysa durur (geri basınç); sürükleyerek çekilir,
  dönemeç kendiliğinden. S: "Nereye?" H: uç kabul etmezse sıkışır (uç karo kırmızı).
- G: ahşap kasa, akışla kayan çıta deseni.

**5. Menfez** · `menfez` · taşıma · 1×1 + 1×1 çift · yönlü · 30 (çift) · D2
- P: giriş ağzı G arka; çıkış ağzı Ç ön; arada 1-5 karo, ara karolara her şey kurulur.
  Hat çekerken başka bir hattın ya da şaftın üstünden geçilirse çift kendiliğinden önerilir.
  E: 0. O: bant hızı (sanal hat, uzunluk = mesafe × 240).
- A: hattı başka hattın ya da şaftın **altından** geçirir. S: "Kesişmeyi nasıl çözerim?"
- H: eşi yoksa "eşsiz" rozeti, eşya girmez. G: iki ucunda taş kemerli yarım daire ağız.

**6. Çatal** · `catal` · taşıma · 1×1 · yönlü · 20 · D1
- P: G arka; Ç sol, ön, sağ (bağlı olanlar). E: 0. O: bant hızı.
- A: türe bakmaz. Ayar (2): **sırayla** (dönüşümlü, kabul etmeyeni atlar) / **taşma**
  (önce ön; ön almazsa sol, sonra sağ). S: "Ne kadar, hangi öncelikle?"
- H: hiçbir çıkış almazsa durur. G: üç dişli yaba çatalı, üstünde dönen ok.

**7. Birleştirme oluğu** · `birlestirme-olugu` · taşıma · 1×1 · yönlü · 20 · D1
- P: G arka, sol, sağ; Ç ön. E: 0. O: bant hızı; girişler dönüşümlü (boşu atlar, adil).
- A: iki üç hattı tek hatta adilce toplar (yan yükleme yerine). S: "İki huni tek prese
  nasıl girer?" H: çıkış doluysa bütün girişler bekler; panel giriş paylarını gösterir.
- G: Y biçimli tahta oluk.

## Ayıklama
**8. Oluk mıknatısı** · `oluk-miknatisi` · ayıklama · 1×1 · yönlü · 30 · D1
- P: hat karosu gibi G arka, Ç ön; **tutucu** 6 yuva. E: 0. O: bant hızı.
- A: pasif; geçen manyetik eşyayı tutucuya çeker; **doyunca** manyetikler geçer. Tutucuyu
  yaba kolu boşaltır ya da panelde "Boşalt" (iğne/buluntu → defter + kuruş, çöp atılır).
  S: "Mıknatısı kim boşaltacak?"
- H: "doymuş" rozeti ve hatta geçen çiviler. G: oluğun üstünde at nalı mıknatıs, tutucuda
  6 çentik, dolan çentikte çivi simgesi.

**9. Mıknatıslı tambur** · `miknatisli-tambur` · ayıklama · 2×1 · yönlü · 120 · D5
- P: G arka; Ç ön (manyetik değil), sağ (manyetik). E: 4 bg. O: 5 tik/eşya = 240/dk.
- A: doymaz, sürekli ayırır; ama güç ve bir yan hat ister. Oluk + kol ile **ödünleşim**:
  pasif ve ucuz ama bakım ister / güçlü ve kendi başına. S: "Kol mu, şebeke mi?"
- H: güçsüz durur (girişte bekler); sağ çıkış doluysa bekleyen manyetik bütün akışı durdurur
  ("yan çıkış dolu"). G: yatık silindir, içinde yarım ay kırmızı alan, yüzeyde çiviler.

**10. Kalbur** · `kalbur` · ayıklama · 2×1 · yönlü · 50 · D4
- P: G arka; Ç ön (iri), sağ (ince). E: 0. O: 6 tik/eşya = 200/dk.
- A: boyuta göre: iğneyi çividen, tozu samandan, altın iğneyi taştan ayırır. **Sıva**: her
  yaş ot sıvayı +1 yapar; sıva ≥ 4 iken delikler kapalı, her şey öne gider; yaş ot
  gelmeyen her 200 tikte −1. S: "Hangisi ince?"
- H: "sıvalı" rozeti (sessiz yanlış ayırma yok, görünür). G: yuvarlak çerçeveli delikli
  kalbur, sallantı titreşimi, altına düşen kırıntı.

**11. Tınaz** · `tinaz` · ayıklama · 3×3 · yönlü · 60 · D6
- P: G arka orta; Ç ön orta (dip), sol orta ve sağ orta (savrulma). E: 0. O: 4 tik/eşya
  = 300/dk.
- A: rüzgâr parçanın eksenine **dik** eserse savrulan eşya rüzgârın gittiği yandan çıkar:
  şiddet 1 → yalnız çok hafif; şiddet ≥ 2 → hafif ve çok hafif. Eksen boyunca ya da
  durgunsa hepsi dipten çıkar. Yön 3 dakikada bir, şiddet her dakika değişir (`sistemler.md`
  §3); ≈ %42 zaman ayırır, panel şimdiki hâlini yazar. Bedava, hızlı, kararsız. S: "Rüzgâr dönünce savrulan saman hangi yandan çıkacak?"
- H: savrulma yanı bağlı değil ya da dolu → "rüzgâr yanı kapalı", akış durur. G: toprak
  harman dairesi, ortada tınaz yığını, rüzgâr yönüne savrulan zerreler, rüzgâr oku.

**12. Şeytan yeli** · `seytan-yeli` · ayıklama · 2×2 · yönlü · 160 · D5
- P: G arka; Ç ön (hafif), sol (çok hafif), sağ (ağır). E: 6 bg. O: 6 tik/eşya = 200/dk.
- A: rüzgârsız, **üç yollu**: tozu samandan da ayırır; tınazdan yavaş ve güç ister.
  S: "Toz, saman ve ağır üç ayrı yere nasıl gider?"
- H: bir çıkış dolu → durur; güçsüz → "güç yok". G: ahşap kasa, yanda kollu fan çarkı,
  önde eğik elek, sol ağızdan toz bulutu.

## İşleme
**13. Ot savurucu** · `ot-savurucu` · işleme · 3×1 · yönlü · 90 · D6
- P: G arka, Ç ön; içinde 9 eşya (karo başına 3) yavaş yürür. E: 3 bg (güçsüz kuruma
  ⅓). O: yaş otun kuruma puanı 1200; tik başına güneş +5 (şiddet ≥ 1 ise +6), bulutlu +3,
  yağmur 0 → 200 / 240 / 400 tik; 54 / 45 / 27 / 0 eşya/dk. Kuru eşya bekletmeden geçer.
- A: kurutmayı **havaya** bağlar; bedava sayılır ama yağmurda hattı durdurur. S: "Yağmur
  gelince yaş ot nereye gidecek?" (cevap: bekle ya da çatal taşma → ambar, D7)
- H: "hava bekliyor" (yağmur) rozeti, giriş tarafı tıkanır. G: üç dönen yıldız tırmık
  diski, havada serpilen ot; yağmurda koyu ıslak ton.

**14. Kurutma ambarı** · `kurutma-ambari` · işleme · 3×3 · yönlü · 200 · D7
- P: G arka orta; Ç ön orta. E: 8 bg; güçsüz ¼ hız. O: 24 yuva, yaş ot başına 600 tik
  → 48/dk (güçsüz 12/dk). Yalnız yaş ot alır.
- A: havadan bağımsız, büyük **zaman tamponu** (eşya başına hız değil, süre). S: "Yağmurda
  ot ne olacak?" H: dolu → girdi bekler; yabancı tür girişte bekler ("yabancı").
- G: kırmızı çatılı ambar, çatı sırtında dönen havalandırma pervanesi, kapıdan buhar.

**15. Balya presi** · `balya-presi` · işleme · 3×2 · yönlü · 150 · D3
- P: G arka orta; Ç ön orta. Kalıp 8 tutam: `saman`, `kuru-ot`, `toz`, `kiyim`. O: dolum
  7 tik/eşya (56 tik) + basma 40 tik = 96 tik/balya → 12,5 balya/dk = 100 tutam/dk.
  E: dolarken 4 bg, basarken 30 bg (ortalama ≈ 15; **darbeli**).
- A: ürün türünü **saflık** belirler: 8 saman → saman balyası, 8 kuru ot → ot balyası,
  aksi → karışık balya. S: "Akışım ne kadar temiz?"
- H: sert eşya kalıba girer, piston **sıkışır**: "Temizle" bedava, eşyayı oyuncuya verir,
  kalıptaki tutamlar kalır. Yaş ot ve hafif buluntu reddedilir ("nemli", "yabancı").
- G: uzun yeşil gövde, ileri geri piston, arkadan iple bağlı dikdörtgen balya çıkar.

**16. Çekiçli kıyıcı** · `cekicli-kiyici` · işleme · 2×2 · yönlü · 180 · D7
- P: G arka; Ç ön. E: 12 bg. O: `saman`/`kuru-ot` → `kiyim` 1:1, 10 tik = 120/dk.
- A: hatanın bedeli var: sert eşya **çekici kırar**; önüne mıknatıs ve taş ayıklama
  şart. S: "Önüne ne koymalıyım?"
- H: kırık: sert eşya çıkıştan olduğu gibi atılır, makine durur; "Onar" 50 kuruş + 200 tik.
  Diğer yabancılar reddedilir. G: kazan gövde, dönen çekiç diski; kırıkken eğri çekiç, duman.

**17. Gübre çukuru** · `gubre-cukuru` · işleme · 2×2 · yönsüz · 60 · D6
- P: G dört kenar. E: 0. O: toz 1 puan, çürük ot 2, karışık balya 8; kapasite 120. Her
  2400 tikte puan ≥ 20 ise −20 ve 8 karo içindeki çayır 2400 tik **gübreli** (büyüme ×2).
  Ortalama yutma 10 puan/dk.
- A: çöpün yutağı + çayırı besleyen döngü. S: "Çöpüm nereye gider, işe yarar mı?"
- H: dolu → reddeder, toz hattı tıkanır; çayıra uzaksa rozet "yalnız çöp". İğne/buluntu
  gelirse oyuncuya iade. G: çitli çukur, iki sinek noktası, buhar; gübreli çayır koyu yeşil.

## Depo ve kol
**18. Sandık** · `sandik` · depo · 1×1 · yönsüz · 15 · T0
- P: G dört kenar; Ç yok (yaba kolu alır). E: 0. O: 48 eşya, karışık; iğne/buluntu
  girerse "bulundu" olur (yarı kuruş, `esyalar.md` §5), depoda tutulmaz.
- A: küçük, her şeyi alır. S: "Fazlasını nerede bekletirim?" H: dolu → girdi bekler.
- G: demir köşeli sandık, kapakta en çok bulunan türün simgesi.

**19. Ambar** · `ambar` · depo · 3×3 · yönsüz · 180 · D7
- P: G dört kenarın orta karosu; Ç yok. E: 0. O: 600 eşya.
- A: büyük ama **nemi cezalandırır**: her 1200 tikte ⌈yaş ot / 4⌉ yaş ot çürük ota döner.
  S: "Kuru mu saklıyorum?" H: dolu; çürüme uyarısı.
- G: büyük ahşap ambar, açık çatıda doluluk yığını, çürükte kara-yeşil lekeler.

**20. Defter masası** · `defter-masasi` · depo · 2×1 · yönlü · 40 · D2
- P: G arka, sol, sağ. E: 0. O: anında. Kabul: `igne` ve `buluntu` sınıfı.
- A: asıl ödül noktası: tam kuruş (`esyalar.md` §2; sandık yarısını öder) + defter + kutlama.
  S: "İğneyi buraya kadar nasıl ayıklarım?" H: yabancı eşya girişte bekler ("yabancı: çivi").
- G: büyüteçli küçük masa, açık defter; eşya gelince damga iner, parıltı.

**21. Yaba kolu** · `yaba-kolu` · kol · 1×1 · yönlü · 30 · D2
- P: arkadaki karodan alır: bir depo ya da tutucu (sandık, ambar, oluk mıknatısı) ya da o
  karodaki hattın üstündeki filtreye uyan ilk eşya; öndeki karoya bırakır (parça girişi ya
  da hat). E: 0. O: salınım 16 tik = 75/dk.
- A: **yavaş ama kesin**: filtre (hiçbiri / tek tür / sınıf / manyetik); depodan hatta tek
  köprü. S: "Tam olarak hangisini?"
- H: hedef almazsa havada bekler ("bırakamıyor"); kaynak boşsa "aç".
- G: ahşap direkte dönen yaba, ucunda taşıdığı eşya.

## Enerji
**22. El krankı** · `el-kranki` · enerji · 1×1 · yönsüz · 20 · D3
- P: aks dört yan. E: +6 bg; **Kullan**'a bir dokunuş/tuş 600 tik (30 sn) döndürür, çiftçi
  3 karo içinde kaldıkça (komut `krank`, tik numaralı; basılı tutmak gerekmez, telefonda
  başparmak joystick'te). A: oyuncu emeği = enerji; rüzgâr yokken ya da yel değirmeninden
  önce bir balyayı elle bitirmek için (krankla pres ≈ 4,7 balya/dk). S: "Şebekem ne
  kadar istiyor?" H: süre bitince 0. G: dişli kutusu ve kollu çark, çiftçi kola tutunur.

**23. Yel değirmeni** · `yel-degirmeni` · enerji · 2×2 (kanat 4×4 yürünür gölge) · 120 · D3
- P: aks dört yan. E: +0 / 8 / 16 / 24 bg (durgun / esinti / rüzgâr / sert). Yön değişince
  100 tik döner (0 bg). A: bedava, kararsız; tahmin HUD'da. S: "Rüzgâr düşünce ne olur?"
- H: "rüzgâr yok". G: ahşap kule, dört bezli kanat, dönüş şiddetle orantılı.

**24. Lokomobil** · `lokomobil` · enerji · 3×2 · yönlü · 300 · D7
- P: G arka (yakıt), tampon 4; aks iki yan. E: en çok +40 bg. O: balya (her tür) tam
  yükte 1200 tik, kıyım 150 tik; yük oranında yakar (talep / 40).
- A: enerjiyi **üretim zincirine** bağlar: kendi balyanı yakarsın. S: "Ürünümün ne kadarı
  yakıta gider?" H: "yakıt yok" (ölü döngüde krank ya da sandıktan yaba kolu kurtarır,
  `sistemler.md` §1). G: tekerlekli kara kazan, kırmızı tekerlek, yükle
  koyulaşan baca dumanı, yanda kasnak.

**25. Şaft** · `saft` · enerji · 1×1 · yönsüz · 3 · D3
- P: dört komşuya (şaft, enerji parçası, aks) bağlanır; yürünür. E: kayıp yok.
- A: şebeke yalnız komşuluk; kablo çizmek yok, menfezle kesişir. S: "Hangi makine hangi
  şebekede?" H: kopuk ağ → makine "güç yok". G: alçak kızakta dönen demir mil.

**26. Volan** · `volan` · enerji · 2×2 · yönsüz · 80 · D4
- P: aks dört yan. E: 2400 bg·tik depolar; artan arzı ≤ 12 bg ile yükler, açığı ≤ 30 bg
  ile kapatır. A: pres darbesini ve saniyelik dalgalanmayı yumuşatır (rüzgâr sessizliğini
  değil). S: "Basma anında şebeke
  neden yavaşlıyor?" H: boşalınca etkisiz (kantarla okunur).
- G: dökme demir çark, dönüş hızı doluluğu gösterir.

## Mantık (renk kanalları: `sistemler.md` §2)
**27. Rüzgâr gülü** · `ruzgar-gulu` · mantık · 1×1 · yönlü · 40 · D8
- Yazar: rengi koşul doğruyken 1. Ayar (2): **dik esiyor** (parçanın eksenine sol/sağdan,
  şiddet ≥ 2) / **şiddet ≥ eşik** (1-3). Panelde sonraki 3 dilimin tahmini.
- A: havayı sinyale çevirir. S: "Rüzgâr dönünce akışı nereye yollarım?"
- G: direkte horoz biçimli gül, dibinde renk lambası.

**28. Savak kapağı** · `savak-kapagi` · mantık · 1×1 · yönlü · 25 · D8
- Hat karosu (G arka, Ç ön). Okur: rengi. Ayar (2): **sinyalde kapan** / **sinyalde açıl**.
  Kapalıyken geri basınç. A: çatalın "taşma"sıyla koşullu yönlendirme. S: "Ne zaman?"
- G: değirmen savağı gibi sürgülü kapak; kapalıyken iner.

**29. Kantar** · `kantar` · mantık · 1×1 · yönsüz · 40 · D8
- Komşu ilk depoyu okur: sandık, ambar, kurutma ambarı, gübre çukuru, volan, oluk
  mıknatısı tutucusu. Ayar: eşik %25/50/75/100 ve **≥** / **<**. Yazar: rengi.
- A: doluluğu sinyale çevirir: taşma koruması, enerji önceliği (volan). S: "Ne kadar dolu?"
- G: kefeli kantar, ibre doluluğu gösterir.

**30. Kile sayacı** · `kile-sayaci` · mantık · 1×1 · yönlü · 40 · D8
- Hat karosu. Sayar (filtre: hepsi / tür / sınıf); N ∈ {5, 10, 20, 40, 80}. Ayar (2):
  **darbe** (her N eşyada yazma rengine 20 tik 1) / **kile** (N geçince kendini kapatır ve
  1 yazar; sıfır rengi 1 olunca açılır, sayaç sıfırlanır).
- A: sayıyla kapı: siparişe tam N gönderir. S: "Kaç tane?"
- G: ahşap kile ölçeği, yanında çentik sayacı ve damga rakamı.

## Özet: aile × kilit
| Kilit | Açılanlar |
|---|---|
| T0 | emici huni, bant, sandık |
| D1 | çatal, birleştirme oluğu, oluk mıknatısı |
| D2 | yaba kolu, defter masası, menfez |
| D3 | el krankı, şaft, balya presi, yel değirmeni |
| D4 | kalbur, volan |
| D5 | şeytan yeli, mıknatıslı tambur, taş toplayıcı |
| D6 | tırmık kolu, ot savurucu, gübre çukuru, tınaz |
| D7 | lokomobil, ambar, çekiçli kıyıcı, kurutma ambarı |
| D8 | kantar, kile sayacı, rüzgâr gülü, savak kapağı (mantık ailesi bir arada) |
Ayrıca kurulu gelen, sökülmeyen **Komşu kapısı** (2×2, G iki kenar; `ekonomi.md` §2).
