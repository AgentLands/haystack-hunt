/**
 * Bant hatları (topoloji): uç uca bağlı hat parçası karoları (tanim.hat) tek hatta birleşir.
 * Her hat karo sırasını, karo başına başlangıç konumunu (ofset; 1 karo = BIRIM, yeraltı
 * gibi "sanal" karolar daha uzun olabilir) ve eşyaları (pos: Int32Array, tur: Uint16Array;
 * pos[0] en öndeki eşya) tutar. Topoloji değişince bütün hatlar yeniden kurulur; eşyalar
 * karo + karo içi konumla yeni hatlara aktarılır, karosu kalmayanlar `dusen` listesine çıkar.
 *
 * Ardıl kuralı: A'nın ardılı varsayılan olarak önündeki karodur (A + yön), o karo hat parçası
 * ve A'ya geri bakmıyorsa. tanim.hat.ardil(p, c) → karo indeksi | -1 bunu değiştirir
 * (Faz 1 yeraltı bandı), tanim.hat.uzunluk(p, c) → birim karonun hat boyunu verir.
 * Bir karoya birden çok hat parçası akıyorsa öncül: tam arkadaki aynı yönlü, yoksa en küçük
 * karo indeksli (tek şerit; yan yükleme yok, diğerleri orada tıkanır). Hat; ardıl yoksa,
 * hız değişirse, HAT_EN_UZUN karoya varınca ya da halka kapanınca biter. Halka en küçük
 * karo indeksinde kesilir.
 * Hat çıkışı (hat.cikis): { tur: 'hat', hat } | { tur: 'port', parca, port } | null.
 * Parça çıkış portu (p.cikisHedef[k]) aynı biçimde: komşu karo bir hat BAŞIYSA ve porta geri
 * bakmıyorsa o hat, komşu bir parçanın o kenara bakan giriş portuysa o port.
 */
import {
  BIRIM, ARALIK, KARO_SAYISI, DX, DY, tersYon, karoIndeks, karoIcinde,
} from '../olcu.js';

export const HAT_EN_UZUN = 32;

/** Hat parçalarının karo haritası ve ardıl/öncül tabloları. */
function hatParcalari(c) {
  const karoda = new Map();
  for (const p of c.parcalar.values()) if (p.tanim.hat) karoda.set(karoIndeks(p.x, p.y), p);
  const ardil = new Map();
  const adaylar = new Map(); // hedef karo → ona akan karolar (parça sırasıyla)
  for (const [k, p] of karoda) {
    let hedef;
    if (p.tanim.hat.ardil) {
      hedef = p.tanim.hat.ardil(p, c);
    } else {
      const fx = p.x + DX[p.yon];
      const fy = p.y + DY[p.yon];
      const q = karoIcinde(fx, fy) ? karoda.get(karoIndeks(fx, fy)) : null;
      hedef = q && q.yon !== tersYon(p.yon) ? karoIndeks(fx, fy) : -1;
    }
    if (hedef < 0 || !karoda.has(hedef)) continue;
    ardil.set(k, hedef);
    if (!adaylar.has(hedef)) adaylar.set(hedef, []);
    adaylar.get(hedef).push(k);
  }
  const oncul = new Map();
  for (const [hedef, liste] of adaylar) {
    const q = karoda.get(hedef);
    const arka = liste.find((k) => {
      const p = karoda.get(k);
      return p.yon === q.yon && p.x + DX[p.yon] === q.x && p.y + DY[p.yon] === q.y;
    });
    oncul.set(hedef, arka ?? Math.min(...liste));
  }
  return { karoda, ardil, oncul };
}

function yeniHat(id, karolar, ofset, girisYon, yonler, hiz) {
  const uzun = ofset[karolar.length];
  const kap = Math.floor(uzun / ARALIK) + 1;
  return {
    id, karolar: Int32Array.from(karolar), ofset: Int32Array.from(ofset),
    girisYon: Uint8Array.from(girisYon), yonler: Uint8Array.from(yonler), uzun, hiz, n: 0,
    pos: new Int32Array(kap),
    tur: new Uint16Array(kap), cikis: null, etkin: true,
  };
}

/** Bütün hatları kurar (c.hatlar, c.karoHat, c.karoSira, c.hatSira); düşen eşyaları döndürür. */
export function hatlariKur(c) {
  const eski = hatEsyalari(c);
  const { karoda, ardil, oncul } = hatParcalari(c);
  const karoHat = new Int32Array(KARO_SAYISI);
  const karoSira = new Int32Array(KARO_SAYISI);
  const hatlar = [];
  const dolas = (bas) => {
    let k = bas;
    let karolar = [];
    let ofset = [0];
    let giris = [];
    let yonler = [];
    let onceki = -1;
    const kapat = () => {
      const p0 = karoda.get(karolar[0]);
      const h = yeniHat(hatlar.length, karolar, ofset, giris, yonler, p0.tanim.hat.hiz);
      karolar.forEach((kk, i) => { karoHat[kk] = h.id + 1; karoSira[kk] = i; });
      hatlar.push(h);
      karolar = [];
      ofset = [0];
      giris = [];
      yonler = [];
    };
    while (k >= 0 && !karoHat[k] && !karolar.includes(k)) {
      const p = karoda.get(k);
      const ilk = karolar.length ? karoda.get(karolar[0]) : p;
      if (karolar.length >= HAT_EN_UZUN || ilk.tanim.hat.hiz !== p.tanim.hat.hiz) kapat();
      karolar.push(k);
      ofset.push(ofset.at(-1) + (p.tanim.hat.uzunluk ? p.tanim.hat.uzunluk(p, c) : BIRIM));
      giris.push(onceki < 0 ? p.yon : girisYonu(karoda.get(onceki), p));
      yonler.push(p.yon);
      onceki = k;
      const s = ardil.get(k);
      k = s !== undefined && oncul.get(s) === k ? s : -1;
    }
    if (karolar.length) kapat();
  };
  const sirali = [...karoda.keys()].sort((a, b) => a - b);
  for (const k of sirali) if (!oncul.has(k)) dolas(k);
  for (const k of sirali) if (!karoHat[k]) dolas(k); // halkalar
  Object.assign(c, { hatlar, karoHat, karoSira });
  baglantilariKur(c, karoda, ardil, oncul);
  return eskiyiYerlestir(c, eski);
}

/** Önceki karodan bu karoya giriş yönü (bitişikse aradaki yön, değilse karonun kendi yönü). */
function girisYonu(a, b) {
  for (let d = 0; d < 4; d++) if (a.x + DX[d] === b.x && a.y + DY[d] === b.y) return d;
  return b.yon;
}

function baglantilariKur(c, karoda, ardil, oncul) {
  for (const h of c.hatlar) {
    const son = h.karolar[h.karolar.length - 1];
    const s = ardil.get(son);
    if (s !== undefined && oncul.get(s) === son) {
      h.cikis = { tur: 'hat', hat: c.hatlar[c.karoHat[s] - 1] };
      continue;
    }
    const p = karoda.get(son);
    h.cikis = portBul(c, p.x, p.y, p.x + DX[p.yon], p.y + DY[p.yon]);
  }
  for (const p of c.parcalar.values()) {
    if (p.tanim.hat) continue;
    p.cikisHedef = p.cikis.map((port) => {
      if (!karoIcinde(port.hx, port.hy)) return null;
      const k = karoIndeks(port.hx, port.hy);
      const hp = karoda.get(k);
      if (hp) {
        const bas = !oncul.has(k) && hp.yon !== tersYon(port.yon);
        return bas ? { tur: 'hat', hat: c.hatlar[c.karoHat[k] - 1] } : null;
      }
      return portBul(c, port.kx, port.ky, port.hx, port.hy);
    });
  }
  c.hatSira = asagiAkisSirasi(c.hatlar);
}

/** (kx, ky)'den (hx, hy)'deki parçaya: o kenara bakan giriş portu varsa hedefi. */
function portBul(c, kx, ky, hx, hy) {
  if (!karoIcinde(hx, hy)) return null;
  const id = c.izgara.dolu[karoIndeks(hx, hy)];
  const q = id ? c.parcalar.get(id - 1) : null;
  if (!q || q.tanim.hat) return null;
  const i = q.giris.findIndex((g) => g.kx === hx && g.ky === hy && g.hx === kx && g.hy === ky);
  return i < 0 ? null : { tur: 'port', parca: q, port: i };
}

/** Aşağı akış önce: çıkış hattını izleyen sonsıra (halkada sıra kararlı ama keyfî). */
function asagiAkisSirasi(hatlar) {
  const sira = [];
  const goruldu = new Uint8Array(hatlar.length);
  for (const bas of hatlar) {
    const yol = [];
    let h = bas;
    while (h && !goruldu[h.id]) {
      goruldu[h.id] = 1;
      yol.push(h);
      h = h.cikis?.tur === 'hat' ? h.cikis.hat : null;
    }
    for (let i = yol.length - 1; i >= 0; i--) sira.push(yol[i]);
  }
  return sira;
}

/** Hattaki konumun karosu: { sira, ic } (ic: karo içi birim). */
export function hatKonumu(h, pos) {
  let a = 0;
  let b = h.karolar.length - 1;
  while (a < b) {
    const m = (a + b + 1) >> 1;
    if (h.ofset[m] <= pos) a = m;
    else b = m - 1;
  }
  return { sira: a, ic: pos - h.ofset[a] };
}

/** Bütün hat eşyaları: [karo, ic, tur] (kayıt ve yeniden kurma için). */
export function hatEsyalari(c) {
  const liste = [];
  for (const h of c.hatlar ?? []) {
    for (let k = 0; k < h.n; k++) {
      const { sira, ic } = hatKonumu(h, h.pos[k]);
      liste.push([h.karolar[sira], ic, h.tur[k]]);
    }
  }
  return liste;
}

/**
 * Eşyaları karo + iç konumla hatlara koyar (öndekinden geriye ARALIK korunur). Karosu hat
 * olmayan ya da sığmayan eşyalar düşer: [{ karo, tur }] döner (çağıran yere döker/iade eder).
 */
export function eskiyiYerlestir(c, esyalar) {
  const dusen = [];
  const hatta = new Map();
  for (const [karo, ic, tur] of esyalar) {
    const hid = c.karoHat[karo];
    if (!hid) {
      dusen.push({ karo, tur });
      continue;
    }
    const h = c.hatlar[hid - 1];
    const pos = Math.min(h.uzun, h.ofset[c.karoSira[karo]] + ic);
    if (!hatta.has(h)) hatta.set(h, []);
    hatta.get(h).push([pos, tur, karo]);
  }
  for (const [h, liste] of hatta) {
    liste.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    let sinir = h.uzun;
    for (const [pos, tur, karo] of liste) {
      const p = Math.min(pos, sinir);
      if (p < 0 || h.n >= h.pos.length) {
        dusen.push({ karo, tur });
        continue;
      }
      h.pos[h.n] = p;
      h.tur[h.n] = tur;
      h.n += 1;
      sinir = p - ARALIK;
    }
  }
  return dusen;
}

