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
 *   dedektor       { x, y, seviye, kalan, telafi }  dedektör okundu (telafi: hepsi Soğuk
 *                                                  çıkıp hak bitti, bir hak geri verildi)
 *   dedektor-bos   { x, y }                        hak kalmadan dedektör denendi
 *   parilti        { x, y }                        iğne güneşte parladı (ya da mıknatıs çekti)
 *   balya-parladi  { x, y }                        iğne bir balyada: balya parıltı anında
 *                                                  hafifçe parladı (x, y balyanın hücresi)
 *   civi-parladi   { x, y }                        yüzeye yakın paslı çivi parladı (turuncu)
 *   civi-alindi    { x, y, ceza }                  el paslı çivi aldı; ceza ms süreye eklendi
 *   buluntu-gorundu { x, y, tur }                  samandaki buluntunun üstü ilk kez açıldı
 *   buluntu-alindi { x, y, tur, yeni }             el buluntuyu aldı (cezasız); yeni: defterde
 *                                                  bu tür ilk kez mi (defter özelliği bildirir)
 *   miknatis       { x, y, cekti, kalan }          mıknatıs kullanıldı; cekti: iğne menzildeydi
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
