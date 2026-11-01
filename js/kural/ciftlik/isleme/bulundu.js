/**
 * İğne ve buluntunun sonu (docs/ciftlik/esyalar.md §5) ve işleme/depo parçalarının ortak
 * küçük yardımcıları. Kural: **iğne ve buluntu hiçbir yolla yok olmaz**: bir sink'te
 * "bulundu" olur (olay `ciftlik-bulundu`; defter + kutlama + kuruş) ya da oyuncuya döner
 * (envanter + `ciftlik-bulundu`, kuruşsuz ya da tam).
 *   bulundu(ortam, kod, kaynak, odeme, p)   olay + kuruş; odeme 'tam' | 'yari' | 'yok'
 *   oyuncuyaVer(ortam, kod, kaynak, odeme, p)   envantere koyar; değerliyse bulundu da
 * `ortam` bir tik ctx'i ya da komut ortamı `{ c, olay(ad, veri) }`.
 * Söküm kancası (komut.js): sökülen parçanın içindeki ve sökülen bant karosundaki iğne/
 * buluntu oyuncuya döner (envantere çekirdek koyar; burada "bulundu", tam ödeme).
 * SAP (G ekonomi): kuruş `c.kurus` (kurusEkle/kurusHarca), dünyadan çıkan saman
 * `c.cikanKat` (satılan, gübrelenen; korunum: ciftlikSamani + kaldirilan + cikanKat sabit).
 * İkisi de kayda G/D göçüyle girmeli.
 */
import { esyaTanimi, esyaSamani } from '../esya.js';
import { karoIndeks, karoIcinde } from '../olcu.js';
import { sokumKancasiEkle } from '../komut.js';
import { hatKonumu } from '../tasima/hat.js';
import { ozellik, degerliMi } from './esya-ozellik.js';

/** Kuruş ekler (SAP: G'nin kurus.js'i gelince ona devredilir). */
export function kurusEkle(c, n) {
  if (n > 0) c.kurus = (c.kurus ?? 0) + n;
}

/** Kuruş harcar; yetmezse false (hiçbir şey değişmez). */
export function kurusHarca(c, n) {
  if ((c.kurus ?? 0) < n) return false;
  c.kurus -= n;
  return true;
}

/** Eşya dünyadan çıktı (satıldı, atıldı, gübre oldu): samanı korunum sayacına. */
export function samanCikti(c, kod, n = 1) {
  const s = esyaSamani(kod) * n;
  if (s) c.cikanKat = (c.cikanKat ?? 0) + s;
}

/** Değerli eşya bulundu: kuruş (odeme oranında) + olay. Kuruş miktarını döndürür. */
export function bulundu(ortam, kod, kaynak, odeme, p = null) {
  const oz = ozellik(kod);
  const kurus = odeme === 'tam' ? oz.deger : odeme === 'yari' ? oz.deger >> 1 : 0;
  kurusEkle(ortam.c, kurus);
  const t = esyaTanimi(kod);
  ortam.olay('ciftlik-bulundu', {
    kod, anahtar: t?.anahtar ?? null, buluntu: t?.buluntu ?? null, sinif: oz.sinif, kaynak,
    odeme, kurus, parca: p, x: p ? p.x : null, y: p ? p.y : null,
  });
  return kurus;
}

/** Eşyayı oyuncuya (envantere) verir; iğne/buluntuysa "bulundu" da yazılır. */
export function oyuncuyaVer(ortam, kod, kaynak, odeme, p = null) {
  ortam.c.envanter[kod] += 1;
  if (degerliMi(kod)) bulundu(ortam, kod, kaynak, odeme, p);
}

/** (kx, ky) karosundaki hat ve sırası: { h, sira } ya da null. */
export function karoHatti(c, kx, ky) {
  if (!karoIcinde(kx, ky) || !c.karoHat) return null;
  const k = karoIndeks(kx, ky);
  const hid = c.karoHat[k];
  return hid ? { h: c.hatlar[hid - 1], sira: c.karoSira[k] } : null;
}

/** Hattın verilen karosundaki eşyaların indeksleri (öndeki önce). */
export function karodakiIndeksler(h, sira) {
  const liste = [];
  for (let k = 0; k < h.n; k++) if (hatKonumu(h, h.pos[k]).sira === sira) liste.push(k);
  return liste;
}

/**
 * Giriş portlarından birinde bekleyen (hattın ucunda kabul edilmemiş) eşyanın kodu, yoksa 0.
 * Rozet için ("nemli", "yabancı"): durum(p) yalnız p'yi görür, adim bunu ozel'e yazar.
 */
export function girisBekleyen(c, p) {
  for (const g of p.giris) {
    const yer = karoHatti(c, g.hx, g.hy);
    if (!yer) continue;
    const { h } = yer;
    if (h.cikis?.tur === 'port' && h.cikis.parca === p && h.n && h.pos[0] === h.uzun) {
      return h.tur[0];
    }
  }
  return 0;
}

/**
 * Güç oranıyla ilerleme: o[alan] += oran; hedef tik × 1024'e varınca true (alan sıfırlanır).
 * Tam sayı; oran 1024 iken tam `hedef` tik sürer, 256 iken dört katı.
 */
export function ilerle(o, alan, oran, hedef) {
  o[alan] += oran;
  if (o[alan] < hedef * 1024) return false;
  o[alan] = 0;
  return true;
}

// Söküm: içerikteki ve sökülen bant karosundaki iğne/buluntu oyuncuya döner (tam ödeme:
// elle bulmuş sayılır). Envantere koymayı çekirdek yapar (parcaSok, hatlar yeniden kurulurken).
sokumKancasiEkle((c, tarla, p, iade, olaylar) => {
  const ortam = { c, olay: (ad, veri) => olaylar.push({ ad, veri }) };
  for (const [kod, n] of iade.esya) {
    if (degerliMi(kod)) for (let i = 0; i < n; i++) bulundu(ortam, kod, 'sokum', 'tam', p);
  }
  if (!p.tanim.hat) return;
  const yer = karoHatti(c, p.x, p.y);
  if (!yer) return;
  for (const k of karodakiIndeksler(yer.h, yer.sira)) {
    const kod = yer.h.tur[k];
    if (degerliMi(kod)) bulundu(ortam, kod, 'sokum', 'tam', p);
  }
});
