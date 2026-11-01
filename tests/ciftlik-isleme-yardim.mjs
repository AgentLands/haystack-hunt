/**
 * İşleme/depo testlerinin yardımcıları: yalnız testte tanımlı iki parça (kaynak: her tik
 * kuyruğundaki ilk eşyayı doğuya verir; alıcı: batıdan her şeyi alır, `acik` 0 iken almaz),
 * makine önüne/arkasına yerleştirme ve iğne korunumu sayımı.
 */
import { parcaTanimla } from '../js/kural/ciftlik/parca-kayit.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { kur } from './ciftlik-yardim.mjs';

parcaTanimla('test-kaynak', {
  kod: 60001, ad: 'Test kaynağı', aile: 'test', boyut: [1, 1],
  cikislar: [{ x: 0, y: 0, yon: 0 }],
  kur(p) {
    Object.assign(p.ozel, { kuyruk: [], verilen: 0 });
  },
  adim(ctx, p) {
    const o = p.ozel;
    if (o.kuyruk.length && ctx.ver(p, 0, o.kuyruk[0])) {
      o.kuyruk.shift();
      o.verilen += 1;
    }
  },
  icerik(p) {
    return { esya: p.ozel.kuyruk.map((kod) => [kod, 1]), saman: 0 };
  },
});

parcaTanimla('test-alici', {
  kod: 60002, ad: 'Test alıcısı', aile: 'test', boyut: [1, 1],
  girisler: [{ x: 0, y: 0, yon: 2 }],
  kur(p) {
    Object.assign(p.ozel, { alinan: [], acik: 1 });
  },
  kabulEder(p) {
    return p.ozel.acik === 1;
  },
  al(p, port, kod, ctx) {
    p.ozel.alinan.push(kod);
    p.ozel.tik = ctx.tik;
  },
  icerik(p) {
    return { esya: p.ozel.alinan.map((kod) => [kod, 1]), saman: 0 };
  },
});

export const K = (ad) => esyaKodu(ad);

/**
 * (x, y)'ye yon 0 ile `ad` makinesini kurar; giriş portunun arkasına kaynak, çıkış portunun
 * önüne alıcı (varsa). Sıra: makine önce kurulur (id küçük: önce adım atar).
 */
export function hatKur(c, tarla, ad, x, y, { kaynak = true, alici = true } = {}) {
  const m = kur(c, tarla, ad, x, y, 0);
  const g = m.giris[0];
  const k = kaynak && g ? kur(c, tarla, 'test-kaynak', g.hx, g.hy, 0) : null;
  const ck = m.cikis[0];
  const a = alici && ck ? kur(c, tarla, 'test-alici', ck.hx, ck.hy, 0) : null;
  return { m, k, a };
}

/** Kaynağa eşya ekler (ad ya da kod; n kez). */
export function ekle(k, ad, n = 1) {
  const kod = typeof ad === 'number' ? ad : esyaKodu(ad);
  for (let i = 0; i < n; i++) k.ozel.kuyruk.push(kod);
}

/** Olay listesinden 'ciftlik-bulundu' verileri. */
export const bulunanlar = (olaylar) => olaylar.filter((o) => o.ad === 'ciftlik-bulundu')
  .map((o) => o.veri);

/** Koşul sağlanana dek (en çok n tik) koşar; geçen tik sayısı (sağlanmazsa -1). */
export function kosKadar(c, tarla, tikAt, n, kosul, olaylar = []) {
  for (let i = 1; i <= n; i++) {
    olaylar.push(...tikAt(c, tarla));
    if (kosul()) return i;
  }
  return -1;
}
