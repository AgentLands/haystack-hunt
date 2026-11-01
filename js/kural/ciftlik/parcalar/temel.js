/**
 * Dikey dilim parçaları (örnek ve test için): bant ve sandık; üçüncü örnek olan emici huni
 * (kod 2, üretici: tarladan saman alır, çıkış portuna verir) toplama.js'e taşındı. Örnek
 * alınacak en küçük tanımlar: hat parçası (bant) ve tüketici/depo (sandık: port protokolüyle
 * alır, biriktirir).
 * Kodlar sabittir (kayıtta saklanır); yeni parça yeni kod alır, eski kod yeniden kullanılmaz.
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaTanimi } from '../esya.js';

/** Bant: 1×1 hat parçası; HIZ birim/tik (18: 1,5 karo/sn, 4,5 eşya/sn). */
export const BANT_HIZ = 18;
parcaTanimla('bant', {
  kod: 1, ad: 'Bant', aile: 'tasima', boyut: [1, 1], yurunur: true, hat: { hiz: BANT_HIZ },
  maliyet: { tahta: 1 },
});

/** Sandık: dört kenardan alır, türe göre sayar; KAPASITE eşyada dolar. */
export const SANDIK_KAP = 400;
parcaTanimla('sandik', {
  kod: 3, ad: 'Sandık', aile: 'depo', boyut: [1, 1], yonlu: false,
  girisler: [0, 1, 2, 3].map((yon) => ({ x: 0, y: 0, yon })), maliyet: { tahta: 4 },
  kur(p) {
    Object.assign(p.ozel, { say: {}, toplam: 0 });
  },
  kabulEder(p) {
    return p.ozel.toplam < SANDIK_KAP;
  },
  al(p, port, kod, ctx) {
    p.ozel.say[kod] = (p.ozel.say[kod] ?? 0) + 1;
    p.ozel.toplam += 1;
    ctx.sayac('depolanan', kod);
  },
  icerik(p) {
    return { esya: Object.entries(p.ozel.say).map(([kod, n]) => [Number(kod), n]), saman: 0 };
  },
  durum(p) {
    return p.ozel.toplam >= SANDIK_KAP ? 'cikis-dolu' : 'calisiyor';
  },
  incele(p) {
    const satirlar = Object.entries(p.ozel.say)
      .map(([kod, n]) => [esyaTanimi(Number(kod))?.ad ?? `#${kod}`, n]);
    return [['Dolu', `${p.ozel.toplam}/${SANDIK_KAP}`], ...satirlar];
  },
});
