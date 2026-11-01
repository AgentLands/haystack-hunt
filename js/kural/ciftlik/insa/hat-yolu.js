/**
 * Hat çekme yolu (saf; DOM yok): sürüklenen imleci izleyen 4 yönlü karo izi ve izin
 * denetimi. İz (izKur / izIlerle) imlecin kesirli karo konumuyla ilerler: çapraz atlama yok,
 * köşede histerezis (eksen değişimi için imleç son karonun merkezinden ≥ HISTEREZIS karo
 * sapmalı; yoksa titreme köşeyi ters çevirir), imleç izin önceki bir karosuna dönerse kuyruk
 * silinir (geri izleme). İlk karonun yönü ilk baskın hareketten gelir. lYolu iki dokunuşlu
 * yedek (WCAG 2.5.7) içindir. yolDenetle izi dünyaya göre sınıflar: baştaki dolu parça
 * karoları atlanır (huninin ağzından çekmek), sonra her karo 'yeni' (kurulur), 'don' (aynı
 * türden mevcut bant yeniden yönlenir), 'ayni' (zaten öyle) ya da ilk engelde 'engel' /
 * 'kesisme' (başka hattı dik kesiyor: menfez önerisi kancası) olur ve yol orada biter:
 * geçerli önek kurulur. Engel bir parçanın o kenara bakan giriş kapısıysa `bag` true.
 */
import { DX, DY } from '../olcu.js';
import { parcaTanimi } from '../parca-kayit.js';
import { parcaAt, yerlestirmeEngeli } from '../izgara.js';

/** Köşe histerezisi (karo): eksen değişimi için merkezden en az bu kadar sapma. */
export const HISTEREZIS = 0.6;
/** Bir ilerlemede atılacak en çok adım (sıçrayan imleçte döngü sınırı). */
const EN_COK_ADIM = 512;

/** Tek karoluk yeni iz. */
export function izKur(kx, ky) {
  return { karolar: [{ kx, ky }], eksen: null };
}

function eksenBul(karolar) {
  const n = karolar.length;
  if (n < 2) return null;
  return karolar[n - 1].kx !== karolar[n - 2].kx ? 'x' : 'y';
}

/** Son karodan imlece doğru atılacak adımın ekseni (yoksa null). */
function adimEkseni(iz, dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (iz.eksen === 'x') return ax >= 0.5 ? 'x' : ay >= HISTEREZIS ? 'y' : null;
  if (iz.eksen === 'y') return ay >= 0.5 ? 'y' : ax >= HISTEREZIS ? 'x' : null;
  if (Math.max(ax, ay) < 0.5) return null;
  return ax >= ay ? 'x' : 'y';
}

/**
 * İzi imlecin bulunduğu (fx, fy: karo birimi, kesirli) yere doğru ilerletir; iz yerinde
 * değişir ve döner. Kendi karosuna basan adım kuyruğu oraya kadar siler.
 */
export function izIlerle(iz, fx, fy) {
  const hx = Math.floor(fx);
  const hy = Math.floor(fy);
  const k = iz.karolar;
  const geri = k.findIndex((t) => t.kx === hx && t.ky === hy);
  if (geri >= 0 && geri < k.length - 1) {
    k.length = geri + 1;
    iz.eksen = eksenBul(k);
  }
  for (let n = 0; n < EN_COK_ADIM; n++) {
    const son = k[k.length - 1];
    if (son.kx === hx && son.ky === hy) break;
    const dx = fx - (son.kx + 0.5);
    const dy = fy - (son.ky + 0.5);
    const eksen = adimEkseni(iz, dx, dy);
    if (!eksen) break;
    const yeni = eksen === 'x'
      ? { kx: son.kx + Math.sign(dx), ky: son.ky }
      : { kx: son.kx, ky: son.ky + Math.sign(dy) };
    const i = k.findIndex((t) => t.kx === yeni.kx && t.ky === yeni.ky);
    if (i >= 0) k.length = i + 1;
    else k.push(yeni);
    iz.eksen = eksenBul(k) ?? eksen;
  }
  return iz;
}

/** a karosundan komşu b karosuna yön (komşu değilse -1). */
function yonBul(a, b) {
  for (let d = 0; d < 4; d++) if (a.kx + DX[d] === b.kx && a.ky + DY[d] === b.ky) return d;
  return -1;
}

/**
 * Karolara yön ekler: her karo sonrakine bakar, son karo öncekinden gelen yönü sürdürür;
 * tek karoda `yon` kullanılır.
 */
export function yonlariAta(karolar, yon) {
  return karolar.map((k, i) => {
    let y = yon;
    if (i + 1 < karolar.length) y = yonBul(k, karolar[i + 1]);
    else if (i > 0) y = yonBul(karolar[i - 1], k);
    return { kx: k.kx, ky: k.ky, yon: y };
  });
}

/** a'dan b'ye L biçimli 4 yönlü karo yolu; eksen 'x': önce yatay, 'y': önce dikey. */
export function lYolu(a, b, eksen, yon) {
  const yol = [{ kx: a.kx, ky: a.ky }];
  const git = (dx, dy, n) => {
    for (let i = 0; i < n; i++) {
      const s = yol[yol.length - 1];
      yol.push({ kx: s.kx + dx, ky: s.ky + dy });
    }
  };
  const yatay = () => git(Math.sign(b.kx - a.kx), 0, Math.abs(b.kx - a.kx));
  const dikey = () => git(0, Math.sign(b.ky - a.ky), Math.abs(b.ky - a.ky));
  if (eksen === 'x') { yatay(); dikey(); } else { dikey(); yatay(); }
  return yonlariAta(yol, yon);
}

/** k karosu düz geçişte mi (öncesi ve sonrası aynı eksende)? */
function duzGecis(yol, i) {
  if (i === 0 || i === yol.length - 1) return false;
  return (yol[i - 1].yon & 1) === (yol[i].yon & 1);
}

/** q, k karosunun o kenarından (önceki karoya bakan) giriş kapısı açıyor mu? */
function girisBakar(q, k, onceki) {
  return Boolean(onceki) && q.giris.some((g) => g.kx === k.kx && g.ky === k.ky
    && g.hx === onceki.kx && g.hy === onceki.ky);
}

/**
 * Yolu dünyaya göre sınıflar. secenek: { fiyat (karo başı, null: yok), butce (null:
 * sınırsız), kilit (metin: hepsi kilitli) }. Dönen: { karolar: [{ kx, ky, yon, durum,
 * neden? }] (ilk engelde biter), yeni, don, bag, kesisme (indeks ya da -1), maliyet }.
 */
export function yolDenetle(c, tarla, anahtar, yol, secenek = {}) {
  const tanim = parcaTanimi(anahtar);
  const { fiyat = null, butce = null, kilit = null } = secenek;
  const cikti = { karolar: [], yeni: 0, don: 0, bag: false, kesisme: -1, maliyet: 0 };
  let basladi = false;
  for (let i = 0; i < yol.length; i++) {
    const k = yol[i];
    const p = parcaAt(c, k.kx, k.ky);
    const ekle = (durum, neden) => cikti.karolar.push({ ...k, durum, ...(neden && { neden }) });
    if (!basladi && p && p.tanim !== tanim && !p.tanim.hat) {
      ekle('atla');
      continue;
    }
    basladi = true;
    if (kilit) {
      ekle('engel', 'kilitli');
      return cikti;
    }
    if (p?.tanim.hat && (p.yon & 1) !== (k.yon & 1) && duzGecis(yol, i)) {
      cikti.kesisme = cikti.karolar.length;
      ekle('kesisme', 'kesisme');
      return cikti;
    }
    if (p && p.tanim === tanim) {
      const don = p.yon !== k.yon;
      cikti.don += don ? 1 : 0;
      ekle(don ? 'don' : 'ayni');
      continue;
    }
    let neden = p ? 'dolu' : yerlestirmeEngeli(c, tarla, tanim, k.kx, k.ky, k.yon);
    if (!neden && fiyat !== null && butce !== null && cikti.maliyet + fiyat > butce) {
      neden = 'kurus';
    }
    if (neden) {
      cikti.bag = Boolean(p) && girisBakar(p, k, yol[i - 1]);
      ekle('engel', neden);
      return cikti;
    }
    cikti.yeni += 1;
    cikti.maliyet += fiyat ?? 0;
    ekle('yeni');
  }
  return cikti;
}

/**
 * Denetlenmiş yolun komut çiftleri (geri al için): 'yeni' → kur / sök, 'don' → döndür /
 * eski yöne döndür. Dönen: [{ yap: [komut], geri: [komut] }].
 */
export function yolCiftleri(c, anahtar, denetim) {
  const ciftler = [];
  for (const k of denetim.karolar) {
    if (k.durum === 'yeni') {
      ciftler.push({
        yap: [{ tur: 'kur', parca: anahtar, x: k.kx, y: k.ky, yon: k.yon }],
        geri: [{ tur: 'sok', x: k.kx, y: k.ky }],
      });
    } else if (k.durum === 'don') {
      const eski = parcaAt(c, k.kx, k.ky).yon;
      ciftler.push({
        yap: [{ tur: 'dondur', x: k.kx, y: k.ky, yon: k.yon }],
        geri: [{ tur: 'dondur', x: k.kx, y: k.ky, yon: eski }],
      });
    }
  }
  return ciftler;
}
