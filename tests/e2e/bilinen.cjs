/**
 * Bilinen hatalar listesi: gerçek bir hata yüzünden başarısız olan e2e denetimleri.
 * Anahtar `senaryo:kimlik` (Senaryo.dogrula'daki kimlik), değer kısa açıklama + rapor göndermesi.
 * Listedeki denetim başarısız olursa test KIRILMAZ, "BİLİNEN HATA" diye yazılır; geçerse
 * "listeden çıkarılabilir" uyarısı verilir. Hata düzelince girdiyi sil.
 */
module.exports = {
  'ciftlik-koruma:zorluk-korunur': 'çiftlik zorluğu "normal"e sıfırlar; dönüşte yeniOyun onu '
    + 'miras alır (S/rapor/ciftlik/c-dogrulama.md bulgu 2)',
  'ciftlik-kayit:bozuk-bildirim': 'iki kayıt da bozuk JSON ise kayitlariOku boş döner, ciftlikAc '
    + 'bildirimsiz yeni çiftlik açar (S/rapor/ciftlik/c-dogrulama.md bulgu 3)',
};
