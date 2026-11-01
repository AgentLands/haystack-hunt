/**
 * Çiftlik test hatları kurucusu (denge, senaryo ve soft-lock testleri için; üretim kodu
 * değil). Parçaların port geometrisini ELLE yazmaz: portları kayıttan okur (`parcaOrnegi`
 * ile dünya portları) ve parçayı, istenen karoya istenen yönde akış girecek biçimde döndürüp
 * yerleştirir. Böylece Faz 1 parçalarının iç düzeni (hangi kenar giriş/çıkış) değişse de
 * hat kurulur. Varsayımlar (birleşmede doğrulanır): çok çıkışlı parçada çıkış sırası
 * `docs/ciftlik/parcalar.md` P satırı sırasıdır (şeytan yeli: ön, sol, sağ), birleştirme
 * oluğunda girişler arka, sol, sağ.
 *
 * Tam güç kancası: `c.testTamGuc = true` iken `guc > 0` olan her parça (huni hariç: referans
 * hatlar pasif huniyle ölçülür) enerji aşamasından sonra `oran = 1024` alır; böylece hızlar
 * `ekonomi.md` §8 "tam güç" sütunuyla kıyaslanır, enerji ağı ayrı test edilir.
 */
import { parcaTanimi, parcaOrnegi } from '../js/kural/ciftlik/parca-kayit.js';
import { tersYon, DX, DY, KARO_EN, karoIcinde } from '../js/kural/ciftlik/olcu.js';
import { asamaTanimla, tikAt } from '../js/kural/ciftlik/benzetim.js';
import { parcaKur } from '../js/kural/ciftlik/komut.js';
import { yerlestirmeEngeli } from '../js/kural/ciftlik/izgara.js';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';
import { bantCek } from './ciftlik-yardim.mjs';
import { HUNI_AD } from './ciftlik-bekleyen.mjs';

asamaTanimla('test-tam-guc', 25, {
  adim(ctx) {
    if (!ctx.c.testTamGuc) return;
    for (const p of ctx.c.parcalar.values()) {
      if (p.tanim.guc > 0 && p.tanim.anahtar !== HUNI_AD) p.oran = 1024;
    }
  },
});

const hata = (ad, ne) => new Error(`hat kurulamadı: ${ad} ${ne}`);

/** Parçanın `yon` dönüşündeki dünya portları (x, y = 0 için göreli; hx, hy komşu karo). */
const ornek = (tanim, yon) => parcaOrnegi(tanim, 0, 0, 0, yon);

/**
 * Parçayı, `g`. giriş portunun karosu `hucre` olacak ve akış `akis` yönünde girecek
 * biçimde kurar (g verilmezse uygun herhangi bir giriş). Kurulan parçayı döndürür.
 */
export function girisineKur(c, tarla, ad, hucre, akis, g = null) {
  const tanim = parcaTanimi(ad);
  if (!tanim) throw hata(ad, 'tanımsız');
  for (const yon of tanim.yonlu ? [0, 1, 2, 3] : [0]) {
    const o = ornek(tanim, yon);
    for (let i = 0; i < o.giris.length; i++) {
      if ((g !== null && i !== g) || o.giris[i].yon !== tersYon(akis)) continue;
      const s = parcaKur(c, tarla, ad, hucre.kx - o.giris[i].kx, hucre.ky - o.giris[i].ky, yon);
      if (!s.parca) throw hata(ad, `(${hucre.kx}, ${hucre.ky}) yönü ${akis}: ${s.neden}`);
      return s.parca;
    }
  }
  throw hata(ad, `giriş portu ${g ?? '*'} akış ${akis} ile eşleşmedi`);
}

/** Çıkış portu `k` (dünya) `hucre` karosuna `akis` yönünde verecek biçimde kurar (üretici). */
export function besleyiciKur(c, tarla, ad, hucre, akis, k = 0) {
  const tanim = parcaTanimi(ad);
  if (!tanim) throw hata(ad, 'tanımsız');
  for (const yon of tanim.yonlu ? [0, 1, 2, 3] : [0]) {
    const o = ornek(tanim, yon);
    if (!o.cikis[k] || o.cikis[k].yon !== akis) continue;
    const s = parcaKur(c, tarla, ad, hucre.kx - o.cikis[k].hx, hucre.ky - o.cikis[k].hy, yon);
    if (!s.parca) throw hata(ad, `(${hucre.kx}, ${hucre.ky}) yönü ${akis}: ${s.neden}`);
    return s.parca;
  }
  throw hata(ad, `çıkış portu ${k} akış ${akis} ile eşleşmedi`);
}

/** İmleç { kx, ky, yon }: akışın gireceği sonraki karo ve yönü. n bant çeker, yeni imleci verir. */
export function bantlar(c, tarla, im, n) {
  bantCek(c, tarla, im.kx, im.ky, im.yon, n);
  return { kx: im.kx + DX[im.yon] * n, ky: im.ky + DY[im.yon] * n, yon: im.yon };
}

/** Parçanın `k`. çıkışından sonraki ilk karo ve yönü. */
export const cikisImleci = (p, k = 0) => ({
  kx: p.cikis[k].hx, ky: p.cikis[k].hy, yon: p.cikis[k].yon,
});

/** Çıkıştan n bant, ardından `ad` parçası (varsa giriş g). Kurulan parçayı döndürür. */
export function sonraki(c, tarla, p, k, n, ad, g = null) {
  const im = bantlar(c, tarla, cikisImleci(p, k), n);
  return girisineKur(c, tarla, ad, im, im.yon, g);
}

/**
 * Hedef giriş portuna (dünya portu) n bantla `kaynakAd` üreticisini bağlar: bantlar porta
 * akar, üretici bantların arkasındadır. Üreticiyi döndürür.
 */
export function kolKur(c, tarla, port, n, kaynakAd, k = 0) {
  const akis = tersYon(port.yon);
  const bas = { kx: port.hx + DX[port.yon] * (n - 1), ky: port.hy + DY[port.yon] * (n - 1) };
  bantCek(c, tarla, bas.kx, bas.ky, akis, n);
  return besleyiciKur(c, tarla, kaynakAd, bas, akis, k);
}

/**
 * En kısa bant yolu (4 komşulu BFS, boş karolar): `bas` karosundan `hedef` karosuna bant
 * döşer (ikisi de boş olmalı); son bant `sonYon` yönüne bakar (giriş portuna akış).
 * Döşenen bant sayısını döndürür; yol yoksa hata verir. Engelden dolanır (Manhattan değil).
 */
export function yolCek(c, tarla, bas, hedef, sonYon) {
  const bant = parcaTanimi('bant');
  const bos = (kx, ky) => karoIcinde(kx, ky) && !yerlestirmeEngeli(c, tarla, bant, kx, ky, 0);
  const onceki = new Map([[bas.ky * KARO_EN + bas.kx, -1]]);
  const sira = [bas];
  for (let i = 0; i < sira.length && !onceki.has(hedef.ky * KARO_EN + hedef.kx); i++) {
    for (let y = 0; y < 4; y++) {
      const kx = sira[i].kx + DX[y];
      const ky = sira[i].ky + DY[y];
      const k = ky * KARO_EN + kx;
      if (onceki.has(k) || !bos(kx, ky)) continue;
      onceki.set(k, sira[i].ky * KARO_EN + sira[i].kx);
      sira.push({ kx, ky });
    }
  }
  const yol = [];
  for (let k = hedef.ky * KARO_EN + hedef.kx; k !== -1; k = onceki.get(k)) {
    if (!onceki.has(k)) {
      throw hata('bant', `yol yok: (${bas.kx},${bas.ky}) → (${hedef.kx},${hedef.ky})`);
    }
    yol.push({ kx: k % KARO_EN, ky: Math.floor(k / KARO_EN) });
  }
  yol.reverse();
  yol.forEach((h, i) => {
    const son = yol[i + 1];
    const yon = son ? [0, 1, 2, 3].find((d) => DX[d] === son.kx - h.kx && DY[d] === son.ky - h.ky)
      : sonYon;
    kurBant(c, tarla, h, yon);
  });
  return yol.length;
}

function kurBant(c, tarla, h, yon) {
  const s = parcaKur(c, tarla, 'bant', h.kx, h.ky, yon);
  if (!s.parca) throw hata('bant', `(${h.kx}, ${h.ky}): ${s.neden}`);
}

/** Parçanın kutusu dışındaki bütün hücrelere `kat` saman koyar (yığın yerine plato). */
export function platoYap(c, tarla, { x0, y0, x1, y1 }, kat) {
  for (let y = Math.max(0, y0); y < Math.min(YUKSEKLIK, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(GENISLIK, x1); x++) {
      if (!c.izgara.taban[y * GENISLIK + x]) tarla.h[y * GENISLIK + x] = kat;
    }
  }
  tarla.kirli = true;
}

/** Ana yönde n bant + parça zinciri için kısa yol: ardışık (bant sayısı, parça adı) çiftleri. */
export function zincir(c, tarla, bas, adimlar) {
  let p = bas;
  const parcalar = [p];
  for (const [n, ad, g] of adimlar) {
    p = sonraki(c, tarla, p, 0, n, ad, g ?? null);
    parcalar.push(p);
  }
  return parcalar;
}

/**
 * Sinkleri (depo parçaları) her 100 tikte boşaltıp saniyelik `ciftlik-ozet` içindeki
 * `depolanan` sayaçlarından kodlara göre eşya/dk ölçer. Pencere = isinma sonrası tikler.
 * Döner: { [kod]: eşya/dk }.
 */
export function olcHat(c, tarla, sinkler, kodlar, { tik = 6000, isinma = 1200 } = {}) {
  const say = Object.fromEntries(kodlar.map((k) => [k, 0]));
  for (let t = 0; t < tik; t++) {
    if (t % 100 === 0) for (const p of sinkler) p.tanim.kur(p, { c, tarla });
    for (const o of tikAt(c, tarla)) {
      if (o.ad !== 'ciftlik-ozet' || t < isinma) continue;
      for (const k of kodlar) say[k] += o.veri.depolanan?.[k] ?? 0;
    }
  }
  const dk = (tik - isinma) / 1200;
  return Object.fromEntries(kodlar.map((k) => [k, say[k] / dk]));
}
