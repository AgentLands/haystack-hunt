/**
 * Dikey dilim parçaları (örnek ve test için): bant, emici huni, sandık. Yeni parça eklerken
 * örnek alınacak en küçük üç tanım: hat parçası (bant), üretici (huni: tarladan saman alır,
 * çıkış portuna verir) ve tüketici/depo (sandık: port protokolüyle alır, biriktirir).
 * Kodlar sabittir (kayıtta saklanır); yeni parça yeni kod alır, eski kod yeniden kullanılmaz.
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaKodu, SAMAN_TUTAM, esyaTanimi } from '../esya.js';
import { KARO } from '../olcu.js';
import { degerliMi } from '../isleme/esya-ozellik.js';
import { bulundu } from '../isleme/bulundu.js';

const SAMAN = esyaKodu('saman');

/** Bant: 1×1 hat parçası; HIZ birim/tik (18: 1,5 karo/sn, 4,5 eşya/sn). */
export const BANT_HIZ = 18;
parcaTanimla('bant', {
  kod: 1, ad: 'Bant', aile: 'tasima', boyut: [1, 1], yurunur: true, hat: { hiz: BANT_HIZ },
  maliyet: { tahta: 1 },
});

/** Emici huni: ağzı çevresindeki samanı çeker, SAMAN_TUTAM katta bir saman tutamı verir. */
export const HUNI = { yaricap: 4, hiz: 2, tampon: 4 };
parcaTanimla('huni', {
  kod: 2, ad: 'Emici huni', aile: 'toplama', boyut: [2, 2],
  cikislar: [{ x: 1, y: 0, yon: 0 }], maliyet: { tahta: 6, demir: 2 },
  kur(p) {
    Object.assign(p.ozel, { birikim: 0, cikis: [], son: 0 });
  },
  adim(ctx, p) {
    const o = p.ozel;
    const cx = p.x * KARO + p.en;
    const cy = p.y * KARO + p.boy;
    o.son = 0;
    if (o.cikis.length < HUNI.tampon) {
      o.son = ctx.samanAl(cx, cy, HUNI.yaricap, (HUNI.hiz * ctx.oran(p)) >> 10);
      o.birikim += o.son;
      if (o.birikim >= SAMAN_TUTAM) {
        o.birikim -= SAMAN_TUTAM;
        o.cikis.push(SAMAN);
        ctx.sayac('uretilen', SAMAN);
      }
      for (const kod of ctx.gomuluCikar(cx, cy, HUNI.yaricap, p)) o.cikis.push(kod);
    }
    if (o.cikis.length && ctx.ver(p, 0, o.cikis[0])) o.cikis.shift();
  },
  icerik(p) {
    return { esya: p.ozel.cikis.map((kod) => [kod, 1]), saman: p.ozel.birikim };
  },
  durum(p) {
    if (p.ozel.cikis.length >= HUNI.tampon) return 'cikis-dolu';
    return p.ozel.son > 0 ? 'calisiyor' : 'girdi-yok';
  },
  incele(p) {
    return [['Çıkış tamponu', `${p.ozel.cikis.length}/${HUNI.tampon}`],
      ['Biriken saman', `${p.ozel.birikim}/${SAMAN_TUTAM} kat`]];
  },
});

/**
 * Sandık: dört kenardan alır, türe göre sayar; KAPASITE eşyada dolar. İğne/buluntu girerse
 * "bulundu" sayılır (yarı kuruş, defter; esyalar.md §5), depoda tutulmaz, dolulukta da alınır.
 * Yaba kolu `cek` ile en küçük kodlu uygun eşyayı çeker.
 */
export const SANDIK_KAP = 400;
parcaTanimla('sandik', {
  kod: 3, ad: 'Sandık', aile: 'depo', boyut: [1, 1], yonlu: false,
  girisler: [0, 1, 2, 3].map((yon) => ({ x: 0, y: 0, yon })), maliyet: { tahta: 4 },
  kur(p) {
    Object.assign(p.ozel, { say: {}, toplam: 0 });
  },
  kabulEder(p, port, kod) {
    return p.ozel.toplam < SANDIK_KAP || degerliMi(kod);
  },
  al(p, port, kod, ctx) {
    if (degerliMi(kod)) {
      bulundu(ctx, kod, 'sandik', 'yari', p);
      return;
    }
    p.ozel.say[kod] = (p.ozel.say[kod] ?? 0) + 1;
    p.ozel.toplam += 1;
    ctx.sayac('depolanan', kod);
  },
  cek(p, uygun) {
    return depodanCek(p.ozel, uygun);
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

/**
 * Tür sayaçlı depodan ({ say: {kod: n}, toplam }) `uygun` ilk eşyayı (en küçük kod) çıkarır;
 * kodunu ya da 0 döndürür. Sandık ve ambar (yaba kolu) kullanır.
 */
export function depodanCek(o, uygun) {
  for (const [anahtar, n] of Object.entries(o.say)) {
    const kod = Number(anahtar);
    if (!n || !uygun(kod)) continue;
    if (n === 1) delete o.say[anahtar];
    else o.say[anahtar] = n - 1;
    o.toplam -= 1;
    return kod;
  }
  return 0;
}
