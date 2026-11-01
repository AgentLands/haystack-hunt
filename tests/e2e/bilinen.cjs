/**
 * Bilinen hatalar listesi: gerçek bir hata yüzünden başarısız olan e2e denetimleri.
 * Anahtar `senaryo:kimlik` (Senaryo.dogrula'daki kimlik), değer kısa açıklama + rapor göndermesi.
 * Listedeki denetim başarısız olursa test KIRILMAZ, "BİLİNEN HATA" diye yazılır; geçerse
 * "listeden çıkarılabilir" uyarısı verilir. Hata düzelince girdiyi sil.
 */
module.exports = {
  'ekranlar:844x390-yatay-menu-dugmesi-tiklanir':
    'yatay telefonda ≡ düğmesi süre etiketinin altında kalıyor, menü dokunuşla açılamaz '
    + '(rapor/e2e.md madde 1)',
};
