/**
 * Parça kümesi (seç, kopyala, döndür, aynala, yapıştır): saf kural, DOM ve rastgelelik yok.
 *   küme = { en, boy, parcalar: [{ kod, x, y, yon, ayar }] }
 * x, y kümenin sol üst karosuna göre, döndürülmüş kutunun sol üst karosudur; yon kopya
 * anındaki dünya yönü; ayar parçanın ayar anahtarlarının kopyası (ayarlar şemasındaki
 * anahtarlar: p.ozel'den). Parça türü KOD ile saklanır (kayıt ve şablon kararlılığı).
 * Dönüşümler (kumeDondur çeyrek tur saat yönü; kumeAynala sol/sağ) yeni küme döndürür;
 * parça çakışması oluşursa null. Ayna: kutular x'te yansır, yön 0↔2; port kümesi ayna
 * görüntüsüyle eşleşen yön seçilir (simetrik parçada tam eşleşir). Eşleşemeyen (kiral)
 * parça `yaklasik` listesine girer: portları kayar, arayüz uyarır. Parça tanımı isteğe bağlı
 * `aynaAyar(ayar) → ayar` ile sol/sağ ayarlarını çevirir.
 * Yerleşim denetimi (kuruş, kilit, engel) denetim.js'te.
 */
import { donmusBoyut, yonDondur } from '../olcu.js';
import { parcaTanimi, parcaOrnegi } from '../parca-kayit.js';
import { parcaAt } from '../izgara.js';

/** En çok parça (kayıt ve içe aktarma sınırı). */
export const KUME_EN_COK = 400;

export const kutu = (tanim, yon) => donmusBoyut(tanim.boyut, tanim.yonlu ? yon & 3 : 0);
const aynaYonu = (yon) => (yon & 1 ? yon : yon ^ 2);
const klonla = (v) => JSON.parse(JSON.stringify(v));

/** Türün ayar anahtarları (`ayarlar` şeması: dizi ya da nesne; yoksa ayarsız). */
export function ayarAnahtarlari(tanim) {
  const a = tanim.ayarlar;
  if (!a) return [];
  const liste = Array.isArray(a) ? a : Object.keys(a);
  return liste.map((o) => (typeof o === 'string' ? o : o.anahtar ?? o.ad));
}

/** Parçanın ayarları (yalnız ayar anahtarları, derin kopya). */
export function ayarAl(p) {
  const ayar = {};
  for (const k of ayarAnahtarlari(p.tanim)) if (k in p.ozel) ayar[k] = klonla(p.ozel[k]);
  return ayar;
}

/** Ayarı parçaya yazar (yalnız türün ayar anahtarları); yazılan anahtar sayısı döner. */
export function ayarYaz(p, ayar) {
  let n = 0;
  for (const k of ayarAnahtarlari(p.tanim)) {
    if (ayar && k in ayar) {
      p.ozel[k] = klonla(ayar[k]);
      n += 1;
    }
  }
  return n;
}

/** Pipet: ayarın hedef türle ORTAK anahtarları (başka türe geçince de taşınan ayarlar). */
export function ortakAyar(ayar, tanim) {
  const ortak = {};
  for (const k of ayarAnahtarlari(tanim)) if (ayar && k in ayar) ortak[k] = klonla(ayar[k]);
  return ortak;
}

/** Parçalardan kümeyi sol üste oturtup sıralar; çakışma varsa null. */
function kumele(liste) {
  if (!liste.length) return null;
  const kutular = liste.map((q) => {
    const [en, boy] = kutu(parcaTanimi(q.kod), q.yon);
    return { q, en, boy };
  });
  const x0 = Math.min(...kutular.map((k) => k.q.x));
  const y0 = Math.min(...kutular.map((k) => k.q.y));
  const dolu = new Set();
  let en = 0;
  let boy = 0;
  for (const k of kutular) {
    for (let y = k.q.y; y < k.q.y + k.boy; y++) {
      for (let x = k.q.x; x < k.q.x + k.en; x++) {
        const anahtar = `${x},${y}`;
        if (dolu.has(anahtar)) return null;
        dolu.add(anahtar);
      }
    }
    en = Math.max(en, k.q.x + k.en - x0);
    boy = Math.max(boy, k.q.y + k.boy - y0);
  }
  const parcalar = liste
    .map((q) => ({ ...q, x: q.x - x0, y: q.y - y0 }))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.kod - b.kod);
  return { en, boy, parcalar };
}

/** Dikdörtgene (karo, uçlar dahil) değen parçalar (id sırasıyla). */
export function alanParcalari(c, xa, ya, xb, yb) {
  const bulunan = new Map();
  for (let ky = Math.min(ya, yb); ky <= Math.max(ya, yb); ky++) {
    for (let kx = Math.min(xa, xb); kx <= Math.max(xa, xb); kx++) {
      const p = parcaAt(c, kx, ky);
      if (p) bulunan.set(p.id, p);
    }
  }
  return [...bulunan.values()].sort((a, b) => a.id - b.id);
}

/** Alandaki parçaların kümesi ve kaynak sol üst karosu { kume, ox, oy }; yoksa null. */
export function kumeAlKonumlu(c, xa, ya, xb, yb) {
  const parcalar = alanParcalari(c, xa, ya, xb, yb);
  const kume = kumele(parcalar.map((p) => ({
    kod: p.kod, x: p.x, y: p.y, yon: p.yon, ayar: ayarAl(p),
  })));
  if (!kume) return null;
  const ox = Math.min(...parcalar.map((p) => p.x));
  return { kume, ox, oy: Math.min(...parcalar.map((p) => p.y)) };
}

/** Dikdörtgene değen bütün parçaların kümesi; yoksa null. */
export function kumeAl(c, xa, ya, xb, yb) {
  return kumeAlKonumlu(c, xa, ya, xb, yb)?.kume ?? null;
}

/** Çeyrek tur saat yönünde (yerelDondur ile aynı sözleşme: (x, y) → (boy - 1 - y, x)). */
export function kumeDondur(kume) {
  return kumele(kume.parcalar.map((q) => {
    const tanim = parcaTanimi(q.kod);
    const [, pboy] = kutu(tanim, q.yon);
    return {
      ...q, x: kume.boy - q.y - pboy, y: q.x, yon: tanim.yonlu ? yonDondur(q.yon, 1) : 0,
    };
  }));
}

/** Parça kutusu içindeki portlar: [tür, x, y, yön] (tür 0 giriş, 1 çıkış). */
function portlar(p, yansit) {
  const liste = [];
  for (const [t, ad] of [[0, 'giris'], [1, 'cikis']]) {
    for (const o of p[ad]) {
      liste.push(yansit ? [t, p.en - 1 - o.kx, o.ky, aynaYonu(o.yon)] : [t, o.kx, o.ky, o.yon]);
    }
  }
  return liste;
}

/**
 * Ayna görüntüsünün portlarını yeniYon yönündeki parçanın portlarına en çok oturtan
 * kaydırma: { puan, tam, dx, dy }. Kaydırma yalnız kiral parçada (ör. huni: çıkış köşede)
 * gerekir; gövde kayar ama port komşu parçaya bağlı kalır.
 */
function aynaEslestir(tanim, yon0, yeniYon) {
  const m = portlar(parcaOrnegi(tanim, 0, 0, 0, yon0), true);
  const n = portlar(parcaOrnegi(tanim, 0, 0, 0, yeniYon), false);
  const adaylar = [[0, 0]];
  for (const a of m) {
    for (const b of n) {
      if (a[0] === b[0] && a[3] === b[3]) adaylar.push([a[1] - b[1], a[2] - b[2]]);
    }
  }
  let en = null;
  for (const [dx, dy] of adaylar) {
    const hedef = new Set(n.map((b) => `${b[0]},${b[1] + dx},${b[2] + dy},${b[3]}`));
    const puan = m.filter((a) => hedef.has(a.join(','))).length;
    const uzak = Math.abs(dx) + Math.abs(dy);
    if (!en || puan > en.puan || (puan === en.puan && uzak < en.uzak)) {
      en = { puan, uzak, dx, dy, tam: puan === m.length && n.length === m.length };
    }
  }
  return en;
}

/** Ayna görüntüsüne en iyi uyan yön, kaydırma ve eşleşmenin tam olup olmadığı. */
function aynaYonuSec(tanim, yon) {
  const yon0 = tanim.yonlu ? yon & 3 : 0;
  if (!tanim.yonlu) return { yon: 0, ...aynaEslestir(tanim, 0, 0) };
  const varsayilan = aynaYonu(yon0);
  let en = null;
  for (const y of [varsayilan, ...[0, 1, 2, 3].filter((k) => k !== varsayilan)]) {
    const s = aynaEslestir(tanim, yon0, y);
    if (!en || s.puan > en.puan || (s.puan === en.puan && s.uzak < en.uzak)) en = { ...s, yon: y };
  }
  return en;
}

/**
 * Sol/sağ aynalar: x yansır, yön 0↔2, kiral parçada gövde port hizası için kayabilir. Küme
 * ve (kaydırma çakışırsa) portu kayan parça türleri `yaklasik` olarak döner.
 */
export function kumeAynala(kume) {
  const yaklasik = [];
  const kur = (kaydir) => kume.parcalar.map((q) => {
    const tanim = parcaTanimi(q.kod);
    const [pen] = kutu(tanim, q.yon);
    const sec = aynaYonuSec(tanim, q.yon);
    const tam = sec.tam && (kaydir || (!sec.dx && !sec.dy));
    if (!tam && !yaklasik.includes(tanim.anahtar)) yaklasik.push(tanim.anahtar);
    const ayar = tanim.aynaAyar ? tanim.aynaAyar(klonla(q.ayar ?? {})) : q.ayar;
    const [dx, dy] = kaydir ? [sec.dx, sec.dy] : [0, 0];
    return { ...q, x: kume.en - q.x - pen + dx, y: q.y + dy, yon: sec.yon, ayar };
  });
  let yeni = kumele(kur(true));
  if (!yeni) {
    yaklasik.length = 0;
    yeni = kumele(kur(false));
  }
  return yeni && { ...yeni, yaklasik: [...new Set(yaklasik)] };
}

/** Kümenin dünya portları (arayüz çizimi ve testler): [{ kod, giris, cikis }], kümeye göre. */
export function kumePortlari(kume) {
  return kume.parcalar.map((q) => {
    const tanim = parcaTanimi(q.kod);
    const p = parcaOrnegi(tanim, 0, q.x, q.y, q.yon);
    const al = (l) => l.map((o) => ({ kx: o.kx, ky: o.ky, yon: o.yon }));
    // Hat parçası (bant): çıkışı kendi yönündeki komşu karodur (tasima/hat.js).
    const cikis = tanim.hat ? [{ kx: p.x, ky: p.y, yon: p.yon }] : al(p.cikis);
    return { kod: q.kod, giris: al(p.giris), cikis };
  });
}

/** Kümeyi (ox, oy) sol üst karosuna taşır: mutlak yerleşim listesi. */
export function kumeKonumla(kume, ox, oy) {
  return kume.parcalar.map((q) => ({ ...q, x: q.x + ox, y: q.y + oy }));
}

/** Kümenin kapladığı karo sayısı. */
export function kumeKaroSayisi(kume) {
  let n = 0;
  for (const q of kume.parcalar) {
    const [en, boy] = kutu(parcaTanimi(q.kod), q.yon);
    n += en * boy;
  }
  return n;
}

/** Biçim ve içerik denetimi (içe aktarma, kayıt): hata metni ya da null. */
export function kumeDogrula(kume) {
  if (!kume || !Array.isArray(kume.parcalar) || !kume.parcalar.length) return 'boş küme';
  if (kume.parcalar.length > KUME_EN_COK) return `en çok ${KUME_EN_COK} parça`;
  for (const q of kume.parcalar) {
    const tanim = parcaTanimi(q.kod);
    if (!tanim) return `bilinmeyen parça (kod ${q.kod})`;
    if (![q.x, q.y].every((n) => Number.isInteger(n) && n >= 0 && n < 120)) return 'konum bozuk';
    if (![0, 1, 2, 3].includes(q.yon) || (!tanim.yonlu && q.yon !== 0)) return 'yön bozuk';
  }
  const yeni = kumele(kume.parcalar);
  if (!yeni) return 'parçalar çakışıyor';
  return yeni.en === kume.en && yeni.boy === kume.boy ? null : 'boyut tutmuyor';
}
