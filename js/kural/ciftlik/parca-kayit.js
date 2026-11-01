/**
 * Parça kaydı (kural tarafı; DOM ve çizim yok, çizim ozellik/ciftlik/gorsel/kayit.js'te).
 * `parcaTanimla(anahtar, tanim)` şemayı denetler, varsayılanları doldurur, dondurur.
 * Şema (docs/ciftlik/MIMARI.md "Parça tanımı"):
 *   kod        1..65535, benzersiz, HİÇ yeniden kullanılmaz (kayıtta parça türü budur)
 *   ad, aile   görünen ad; aile ('toplama' | 'tasima' | 'ayiklama' | 'isleme' | 'depo' |
 *              'enerji' | 'mantik' ya da yeni bir ad)
 *   boyut      [en, boy] karo (yon 0 için); yonlu: false ise yon hep 0
 *   yurunur    karakter üstünden geçer mi (makineler hiçbir parçadan geçemez)
 *   girisler, cikislar  [{ x, y, yon }]: parçanın İÇİNDEKİ yerel karo ve baktığı kenar
 *              (yon 0 çerçevesinde); bağlandığı karo o kenarın komşusudur
 *   hat        { hiz } verilirse 1×1 taşıma parçası: uç uca hatlara katılır (tasima/hat.js)
 *   guc        enerji talebi (Faz 1 enerji ağı; üretici negatif), varsayılan 0
 *   (fiyat ve kilit tanımda DEĞİL: tek kaynak ekonomi/denge.js PARCA_MALIYET, acilis.js)
 *   kur(p, ctx)            p.ozel'i hazırlar (ozel JSON'lanabilir olmalı: sayı, dizi, düz
 *                          nesne, tipli dizi)
 *   adim(ctx, p)           her tik, id sırasıyla (benzetim.js)
 *   kabulEder(p, port, kod, ctx) → bool;  al(p, port, kod, ctx)   giriş portu protokolü
 *   icerik(p) → { esya: [[kod, adet]...], saman: kat }   söküm iadesi ve saman korunumu
 *   durum(p) → 'calisiyor' | 'bos' | 'girdi-yok' | 'cikis-dolu' | 'guc-yok' | 'tikali'
 *   incele(p) → [[etiket, değer]...]   inceleme paneli satırları (saf)
 *   ayarla(p, ad, deger) → bool   'ayar' komutu (yoksa `ayarlar` şeması, ag/ayar.js)
 *   temizle / onar(p, komut, ortam) → null | neden   parça komutları (isleme/komutlar.js)
 *   cek(p, uygun(kod), ctx) → kod | 0   depodan bir eşya çeker (yaba kolu; sandık, ambar)
 *   sokulmez   true: sökülmez, döndürülmez (Komşu kapısı); paletDisi: palette gösterilmez
 */
import { donmusBoyut, yerelDondur, yonDondur, DX, DY } from './olcu.js';

const adla = new Map();
const kodla = new Map();
/** Bilinen aileler (palet sırası); listede olmayan aile adı da kabul edilir (sona dizilir). */
export const AILELER = ['toplama', 'tasima', 'ayiklama', 'isleme', 'depo', 'enerji', 'mantik'];
const ISLEVLER = ['kur', 'adim', 'kabulEder', 'al', 'icerik', 'durum', 'incele', 'ayarla',
  'temizle', 'onar', 'cek'];

function portDenetle(anahtar, port, [en, boy]) {
  const { x, y, yon } = port;
  const icinde = Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
    && x < en && y < boy;
  if (!icinde || ![0, 1, 2, 3].includes(yon)) {
    throw new Error(`parcaTanimla(${anahtar}): port ${JSON.stringify(port)} geçersiz`);
  }
  return Object.freeze({ x, y, yon });
}

/** Yeni parça türü; şema hatasında açıklayıcı hata verir. Dondurulmuş kaydı döndürür. */
export function parcaTanimla(anahtar, tanim) {
  const { kod } = tanim;
  if (!Number.isInteger(kod) || kod < 1 || kod > 65535) {
    throw new Error(`parcaTanimla(${anahtar}): kod 1..65535 tam sayı olmalı`);
  }
  if (adla.has(anahtar)) throw new Error(`parcaTanimla: "${anahtar}" zaten tanımlı`);
  if (kodla.has(kod)) throw new Error(`parcaTanimla(${anahtar}): kod ${kod} kullanılıyor`);
  const boyut = tanim.boyut ?? [1, 1];
  if (!boyut.every((n) => Number.isInteger(n) && n >= 1 && n <= 8)) {
    throw new Error(`parcaTanimla(${anahtar}): boyut [en, boy] 1..8 olmalı`);
  }
  for (const ad of ISLEVLER) {
    if (tanim[ad] !== undefined && typeof tanim[ad] !== 'function') {
      throw new Error(`parcaTanimla(${anahtar}): ${ad} işlev olmalı`);
    }
  }
  if (tanim.hat && (boyut[0] !== 1 || boyut[1] !== 1 || !(tanim.hat.hiz > 0))) {
    throw new Error(`parcaTanimla(${anahtar}): hat parçası 1×1 ve hat.hiz > 0 olmalı`);
  }
  const kayit = Object.freeze({
    ad: anahtar, aile: 'diger', yonlu: true, yurunur: false, guc: 0, hat: null, ...tanim,
    anahtar, boyut: Object.freeze([...boyut]),
    girisler: Object.freeze((tanim.girisler ?? []).map((p) => portDenetle(anahtar, p, boyut))),
    cikislar: Object.freeze((tanim.cikislar ?? []).map((p) => portDenetle(anahtar, p, boyut))),
  });
  adla.set(anahtar, kayit);
  kodla.set(kod, kayit);
  return kayit;
}

/** Anahtar ya da koddan tanım; bilinmeyen için null. */
export function parcaTanimi(anahtarVeyaKod) {
  const m = typeof anahtarVeyaKod === 'number' ? kodla : adla;
  return m.get(anahtarVeyaKod) || null;
}

/** Kayıtlı bütün parça türleri (kod sırasıyla). */
export function parcaTurleri() {
  return [...kodla.values()].sort((a, b) => a.kod - b.kod);
}

/** Dünyadaki portlar: { kx, ky, yon, hx, hy } (hx, hy: bağlandığı komşu karo). */
function dunyaPortlari(liste, p) {
  const [en, boy] = p.tanim.boyut;
  return liste.map((port) => {
    const yer = yerelDondur(port.x, port.y, en, boy, p.yon);
    const yon = yonDondur(port.yon, p.yon);
    const kx = p.x + yer.x;
    const ky = p.y + yer.y;
    return { kx, ky, yon, hx: kx + DX[yon], hy: ky + DY[yon] };
  });
}

/**
 * Yeni parça örneği (ızgaraya henüz konmamış). x, y: sol üst karo (döndürülmüş kutunun);
 * en, boy döndürülmüş boyut. tanim alanı numaralandırılmaz (kayda girmez).
 */
export function parcaOrnegi(tanim, id, x, y, yon) {
  const yonu = tanim.yonlu ? yon & 3 : 0;
  const [en, boy] = donmusBoyut(tanim.boyut, yonu);
  const p = {
    id, kod: tanim.kod, x, y, yon: yonu, en, boy, etkin: true, tikali: false, oran: 1024,
    ozel: {},
  };
  Object.defineProperty(p, 'tanim', { value: tanim, enumerable: false, writable: true });
  portlariYenile(p);
  return p;
}

/** Konum ya da yön değişince dünya portlarını yeniden hesaplar (kayda girmez). */
export function portlariYenile(p) {
  for (const [ad, liste] of [['giris', p.tanim.girisler], ['cikis', p.tanim.cikislar]]) {
    Object.defineProperty(p, ad, {
      value: dunyaPortlari(liste, p), enumerable: false, writable: true, configurable: true,
    });
  }
  Object.defineProperty(p, 'cikisHedef', {
    value: p.cikis.map(() => null), enumerable: false, writable: true, configurable: true,
  });
}

/** Parçanın içerdiği eşya ve saman (tanım vermezse boş). */
export function parcaIcerigi(p) {
  const ic = p.tanim.icerik ? p.tanim.icerik(p) : null;
  return { esya: ic?.esya ?? [], saman: ic?.saman ?? 0 };
}

/** Parçanın durum kodu (tanım vermezse 'calisiyor'; tıkalıysa hep 'tikali'). */
export function parcaDurumu(p) {
  if (p.tikali) return 'tikali';
  return p.tanim.durum ? p.tanim.durum(p) : 'calisiyor';
}
