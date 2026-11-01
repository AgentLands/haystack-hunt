/**
 * Olay yolu: çekirdek (oyun.js) olay yayar; özellik modülleri (js/ozellik/*) dinler.
 * Bir dinleyicinin hatası oyunu durdurmaz ama konsola yazılır (sessiz yutma yok).
 *
 * Olay kataloğu (ad → veri):
 *   oyun-basladi   { durum }                       yeni tarla kuruldu
 *   ilk-hamle      { zaman }                       süre başladı
 *   arac-secildi   { arac }                        'el' | 'tirmik' | 'dedektor' | 'miknatis'
 *   (Araç olaylarında x, y hücre birimidir: hücre i'nin merkezi i.)
 *   kazildi        { x, y, miktar }                el bu karede saman aldı (miktar > 0)
 *   tirmiklandi    { x, y, dx, dy, disari }        tırmık bir adım itti
 *   dedektor       { x, y, seviye, kalan, telafi }  dedektör okundu (telafi: hiçbir okuma yön
 *                                                  göstermeden hak bitti, bir hak verildi)
 *   dedektor-bos   { x, y }                        hak kalmadan dedektör denendi
 *   parilti        { x, y }                        iğne güneşte parladı (ya da mıknatıs çekti)
 *   balya-parladi  { x, y }                        iğne bir balyada: balya parıltı anında
 *                                                  hafifçe parladı (x, y balyanın hücresi)
 *   civi-parladi   { x, y }                        yüzeye yakın paslı çivi parladı (turuncu)
 *   civi-alindi    { x, y, ceza }                  el paslı çivi aldı; ceza ms süreye eklendi
 *   buluntu-gorundu { x, y, tur }                  samandaki buluntunun üstü ilk kez açıldı
 *   buluntu-alindi { x, y, tur, yeni }             el buluntuyu aldı (cezasız); yeni: defterde
 *                                                  bu tür ilk kez mi (defter özelliği bildirir)
 *   miknatis       { x, y, cekti, uzaklik, kalan } mıknatıs kullanıldı; cekti: iğne menzildeydi;
 *                                                  uzaklik: 'menzilde' | 'biraz' | 'cok' (kaba)
 *   miknatis-bos   { x, y }                        hak kalmadan mıknatıs denendi
 *   igne-gorundu   { x, y }                        iğne ilk kez açığa çıktı
 *   bulundu        { sonuc }                       iğne alındı (sonuc: oyun.js sonucOlustur;
 *                                                  zorluk, puan, cezaMs, miknatis* alanlarıyla)
 *   pes-edildi     { durum }                       oyuncu pes etti, iğne gösterildi
 *   kare           { zaman, durum }                her kare, çizimden hemen önce
 *
 * Karakter ve makineler (sözleşme: docs/KARAKTER_TASARIM.md; x, y dünya birimi):
 *   karakter-adim    { x, y, z }                   yürürken ayak yere bastı (~0.85 hücrede)
 *   makine-bin       { makine }                    E ile makineye binildi
 *   makine-in        { makine }                    E ile makineden inildi
 *   makine-yok       { x, y }                      E basıldı ama yakında makine yok
 *   makine-calisti   { makine, miktar }            iş aygıtı bu karede miktar saman aldı/itti
 *   makine-takildi   { makine }                    yükseklik farkı tırmanma eşiğini aştı
 *   yakit-bitti      { makine }                    depo boşaldı (makine artık kımıldamaz)
 *   yakit-ikmal      { makine, onceki }            garajdaki park yerine dönüp durdu: depo
 *                                                  %100'e doldu (makine başına tur başına
 *                                                  bir kez; onceki: ikmalden önceki yakıt)
 * Kepçeli traktör (x, y hücre birimi):
 *   kepce-doldu      { makine }                    kepçe kapasiteye ulaştı
 *   kepce-bosaltildi { makine, miktar, igne, civi, x, y }  kenarda boşaltıldı (miktar saman
 *                                                  tarladan çıktı; igne: iğne düştü mü,
 *                                                  civi: düşen çivi sayısı)
 *   igne-kepcede     { makine, x, y }              kepçe iğnenin katına indi, iğne kepçede
 *   civi-kepcede     { makine, x, y }              paslı çivi kepçeye takıldı
 * Sırt üfleyicisi (giyilen makine; x, y hücre birimi):
 *   ufleme           { x, y, yon, menzil }         Boşlukla üflerken ~10 Hz (kare başına değil);
 *                                                  x, y namlunun noktası, yon radyan, menzil
 *                                                  hücre (koni ±25°). Efekt ve ses için
 * Balya makinesi ve balyalar (balya.x, y dünya; diğer x, y hücre birimi):
 *   balya-birakildi  { balya, makine }             hazne doldu, arkaya balya bırakıldı
 *   igne-yutuldu     { x, y }                      iğne toplayıcıya girdi (yalnız ses/efekt:
 *                                                  metalik tık; oyuncuya açıkça söylenmez)
 *   civi-yutuldu     { x, y }                      paslı çivi toplayıcıya girdi (aynı tık)
 *   balya-acildi     { balya, igne, civiSayisi }   El ile açıldı: saman çevreye döndü, iğne
 *                                                  (igne: true ise) ve çiviler balyanın
 *                                                  yerinde açıkta; balya listeden çıktı
 * Tarla hayvanları (süs; x, y dünya birimi, ürktüğü yer):
 *   hayvan-kacti     { tur, x, y }                 bir hayvan ürkünce (tur: 'fare' | 'serce' |
 *                                                  'kurbaga' | 'kirpi' | 'kedi'); aynı fare
 *                                                  iki kez kaçarsa iki kez yayılır
 * Modlar ve çiftlik (sözleşme: docs/ciftlik/MIMARI.md; x, y karo, gömülüde hücre birimi):
 *   mod-kapaniyor    { durum }                     normal olmayan mod (çiftlik) yeni oyundan
 *                                                  hemen önce kapanıyor (eşzamanlı kayıt için)
 *   ciftlik-acildi   { durum }                     çiftlik açıldı (oyun-basladi'dan sonra)
 *   ciftlik-kaydedildi { boyut }                   kayıt yazıldı (bayt)
 *   parca-kuruldu    { parca }                     komut tikte uygulandı
 *   parca-sokuldu    { parca, iade }               iade: { esya: [[kod, n]], saman: kat }
 *   parca-dondu      { parca }                     yerinde döndürüldü
 *   komut-reddedildi { komut, neden }              neden: 'dolu' | 'saman' | 'yasak' | ...
 *   parca-tikandi    { parca, neden }              (Faz 1) parça tıkandı (ör. paslı çivi)
 *   gomulu-cikti     { nesne, tur, x, y, parca }   toplayıcı gömülü nesneyi eşyaya çevirdi
 *                                                  (tur: eşya kodu; x, y hücre)
 *   ciftlik-igne     { kaynak, x, y }              iğne alındı: 'el' (envantere) | 'parca'
 *   ciftlik-ozet     { tik, uretilen, depolanan }  saniyede bir; { kod: adet } (eşya başına
 *                                                  olay YOK; ses/efekt bunu dinler)
 *
 *   [A taşıma] olay yaymaz: çatal, oluk ve menfez durumu rozet kodlarıyla bildirir
 *                ('cikis-dolu', 'essiz'; parca-durum olayı ortak sözlüktedir)
 *
 *   [B enerji] (şebeke: kural/ciftlik/ag/enerji.js, parcalar/enerji.js)
 *   krank-basladi    { parca }                     Kullan komutu kabul edildi (600 tik)
 *   krank-durdu      { parca, neden }              'sure' (600 tik doldu) | 'uzak' (çiftçi > 3
 *                                                  karo)
 *   yakit-bitti      { parca }                     lokomobil açıkta yakıtsız kaldı (geçişte bir
 *                                                  kez; ipucu notu: krank ya da yaba kolu)
 *   ('ciftlik-ozet' sayacı 'yakilan': lokomobilde yanan yakıt eşyaları)
 *
 *   [C mantık] renk kanalları (ag/sinyal.js), mantık parçaları (parcalar/mantik.js)
 *   sinyal-degisti   { renk, deger }               kanalın okunan değeri değişti (renk 0..5:
 *                                                  kırmızı, çivit, sarı, yeşil, mor, beyaz;
 *                                                  deger: o tik 1 yazan yazıcı sayısı)
 *   kile-doldu       { parca }                     kile sayacı N'e vardı ve kapıyı kapattı
 *
 *   [D dünya] (kural/ciftlik/dunya/: arazi, hava, gomulu, araba, ogretici; toplama ailesi)
 *   hava-degisti     { dilim, yon, siddet, gok }   yeni hava dilimi (1200 tik; ilk dilimde
 *                                                  yok); gok 'gunes' | 'bulut' | 'yagmur'
 *   gomulu-eklendi   { nesneler }                  araba ya da öğretici gömülü nesne ekledi
 *                                                  (oyun çivi/buluntu listelerini yeniler)
 *   harman-arabasi   { asama, x, y, ... }          'duyuru' (+ tik: döküm tiki) | 'dokum'
 *                                                  (+ kat, sayi) | 'yer-yok' (bir kez)
 *   cayir-genisledi  { seviye, cayir }             Çayır genişlet uygulandı (cayir: karo
 *                                                  dikdörtgeni)
 *   ('ciftlik-igne' artık tur da taşır: eşya kodu; iğne, çuvaldız ya da altın iğne)
 *
 *   [E ayıklama]
 *   tutucu-doldu     { parca }                     oluk mıknatısının tutucusu 6/6 oldu
 *                                                  (doymuş: bundan sonra manyetikler geçer)
 *   tutucu-bosaldi   { parca, bulunan, atilan }    Boşalt komutu: bulunan = iğne/buluntu eşya
 *                                                  kodları (envantere döner; her biri ayrıca
 *                                                  ciftlik-bulundu 'tam'), atilan =
 *                                                  atılan çöp/çivi sayısı
 *   kalbur-sivandi   { parca }                     kalbur sıva eşiğine (4) vardı: delikler
 *                                                  kapandı, her şey öne gider
 *
 *   [F işleme-depo]
 *   ciftlik-bulundu  { kod, anahtar, buluntu, sinif, kaynak, kip, kurus, parca, x, y }
 *                                                  iğne/buluntu "bulundu" (defter + kutlama
 *                                                  dinleyicinin işi): kaynak 'masa' | 'sandik' |
 *                                                  'ambar' | 'kapi' | 'gubre' | 'temizle' |
 *                                                  'sokum' | 'bosalt'; kip 'tam' | 'yari' |
 *                                                  'kurussuz' (kurus: ödenen); buluntu: tür
 *                                                  adı ya da null
 *   parca-temizlendi { parca, komut }              sıkışmış pres açıldı (eşya envantere)
 *   parca-onarildi   { parca, komut }              kıyıcı onarımı başladı (50 kuruş, 200 tik)
 *   parca-ayarlandi  { parca, komut, ad, deger }   'ayar' komutu uygulandı (tek tanım)
 *   gubre-serpildi   { parca, karo }               gübre çukuru 20 puanla çayırı gübreledi
 *                                                  (karo: gübrelenen çayır karosu, -1 bilinmez)
 *   (parca-tikandi'nin nedenleri: 'sikisti' pres, 'kirik' kıyıcı; veri.kod sert eşya.
 *    ciftlik-ozet sayaçları: uretilen, depolanan, satilan, bosa, gubre.)
 *
 *   [G ekonomi] (kural/ciftlik/ekonomi/; pano yuva 0 = damga kartı, 1-2 dönen kartlar)
 *   siparis-geldi    { yuva, kart }                yuvaya yeni kart (başlangıç panosu olaysız)
 *   siparis-tamam    { yuva, kart, odul }          kart teslim edildi, ödül kuruşa eklendi
 *   siparis-sifirlandi { yuva, neden }             D2 Çivisiz: kapıya çivi geldi ('civi')
 *   siparis-cevrildi { yuva }                      "Geri çevir" (yenisi 1200 tik sonra)
 *   damga-basildi    { damga, ad, odul, acilanlar } damga basıldı; acilanlar: parça anahtarları
 *   (ciftlik-bulundu: [F]'deki zengin biçim; kural kaynakları isleme/bulundu.js'ten yayar,
 *    oyun elle alınan iğne/buluntu için kaynak 'el')
 *   kuyu-kullanildi  { tur, bedel }                kuruş kuyusu: 'araba' | 'cayir'
 *   ciftlik-cevrimdisi { dk, kazanc }              (ozellik/ciftlik/ciftlik.js yayar) açılışta
 *                                                  çevrimdışı kazanç uygulandı: kazanc { esya:
 *                                                  { kod: adet }, kurus, dolu: [ad] } (fiş)
 *   (komut-reddedildi nedenleri: 'kilitli', 'kurus', 'taban', 'tavan', 'damga'; kuyular
 *    için dünyanın 'yolda', 'erken', 'yer-yok', 'cayir-yok', 'en-cok';
 *    parca-sokuldu iade'sinde ek alan kurus: iade edilen parça bedeli)
 *
 *   [I inşa] ('ayar' komutu tek tanım: isleme/komutlar.js; olayı parca-ayarlandi [F])
 *   [I2 seçim-şablon]
 *   yapistirildi     { parcalar }                  'yapistir' komutu kümeyi tek işlemde kurdu
 *                                                  (ayrıca parça başına 'parca-kuruldu')
 *   alan-sokuldu     { parcalar }                  'sokAlan' komutu alandakileri söktü
 *                                                  (ayrıca parça başına 'parca-sokuldu')
 *   ayar-tasindi     { parca }                     'ayarTasi' (pipet ortak ayarı) yazıldı
 *   komut-reddedildi neden: 'yapistir-engelli' (+ engelliKaro, eksik) | 'bos' | 'bilinmeyen'
 *
 *   [J hud] (ozellik/ciftlik/hud.js, ogretici.js, sorun.js; veri eko-veri.js + dunya/hava.js)
 *   ciftlik-hud      { eko, hava, sorunlar, bekleyenler }   çiftlikte saniyede 4 kez: ekonomi
 *                                                  özeti (kuruş, 3 kart, damgalar), hava satırı
 *                                                  (şimdi + 3 dilim), tıkanan ve bekleyen parçalar
 *   ciftlik-ekran-ac { ad }                        ad: 'pano' | 'sorun' | 'damga' | 'istatistik'
 *                                                  | 'kapi' (inceleme paneli Komşu kapısına
 *                                                  dokununca 'kapi' yayabilir)
 *   ciftlik-kurus    { fark, kurus }               kuruş arttı (ses ve "+N" göstergesi)
 *   ciftlik-sorun-secildi { parca, kx, ky }        sorun listesinden parça seçildi, kamera gitti
 *   ogretici-adim    { kimlik, sira }              öğreticinin yeni adımı gösterildi
 *   ogretici-bitti   { atlandi }                   öğretici bitti ya da atlandı
 *   J'nin dinlediği G/D olayları: damga-basildi, siparis-tamam, harman-arabasi,
 *   ciftlik-cevrimdisi, hava-degisti (açılışta da bir kez: ozellik/ciftlik/ciftlik.js).
 */
const dinleyiciler = new Map();

/** Dinleyici ekler; kaldırmak için dönen işlevi çağır. */
export function dinle(ad, islev) {
  if (!dinleyiciler.has(ad)) dinleyiciler.set(ad, new Set());
  dinleyiciler.get(ad).add(islev);
  return () => dinleyiciler.get(ad).delete(islev);
}

export function yay(ad, veri = {}) {
  const kume = dinleyiciler.get(ad);
  if (!kume) return;
  for (const islev of [...kume]) {
    try {
      islev(veri);
    } catch (hata) {
      console.error(`"${ad}" dinleyicisi hata verdi:`, hata);
    }
  }
}
