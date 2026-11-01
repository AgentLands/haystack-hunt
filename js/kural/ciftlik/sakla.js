/**
 * Çiftlik kaydı (saf; depolama ozellik/ciftlik/depo.js'te). Dünya JSON'a çevrilir:
 *   { surum, tohum, tik, zar, kaymaAdim, sonrakiId, yasak, kaldirilan, h: 'KODLU', kirli,
 *     gomulu: [[esya, x, y, z, aci, alindi, ek]], parcalar: [[id, kod, x, y, yon, etkin,
 *     tikali, ozel]], hatEsya: [[karo, ic, tur]], envanter: [[kod, n]], kuyruk: [...], ek,
 *     alanlar: { ad: deger } (kayitAlaniTanimla) }
 * Parça ve eşya türleri KOD ile yazılır. ozel genel kodlanır (sayı, dize, dizi, düz nesne;
 * tipli dizi { $t, n, s: [[i, v]] } seyrek). h: eğim tahmininden fark → zigzag → sıfır koşusu →
 * değişken uzunluk bayt → base64 (ham 77 KB, tipik 5-25 KB).
 * Göç: surum < SURUM ise GOCLER[surum] sırayla uygulanır; bozuk/tanınmayan veri hata verir
 * (çağıran yedeği dener). Kaydet → yükle → sürdür, kesintisiz koşuyla bit bit aynıdır
 * (dunyaOzeti; test: tests/ciftlik-sakla.test.js).
 */
import { GENISLIK, YUKSEKLIK } from '../boyut.js';
import { ozetKat, OZET_BASI } from './olcu.js';
import { parcaTanimi, parcaOrnegi } from './parca-kayit.js';
import { izgaraIsaretle } from './izgara.js';
import { ciftlikKur, yenidenKur } from './benzetim.js';
import { hatEsyalari, eskiyiYerlestir } from './tasima/hat.js';

export const SURUM = 1;
/** Göç tablosu: surum → (veri) → bir sonraki sürümün verisi. */
export const GOCLER = {};
const alanlar = new Map();

/**
 * Faz 1 dünya alanı (arazi, araba, öğretici...): kayıtta `alanlar[ad]`. kodla(c) → JSON'lanabilir
 * değer; coz(c, deger) yüklemede (parçalardan ve hatlardan önce) çağrılır. Alanı olmayan
 * eski kayıtta deger undefined gelir: coz varsayılanı kurar (bu yüzden SURUM artmaz).
 */
export function kayitAlaniTanimla(ad, { kodla, coz }) {
  if (alanlar.has(ad)) throw new Error(`kayitAlaniTanimla: "${ad}" zaten var`);
  alanlar.set(ad, { kodla, coz });
}
const TIPLER = { Uint8Array, Uint16Array, Uint32Array, Int32Array, Int16Array, Float64Array };

/** Değişken uzunluklu işaretsiz tam sayı baytları. */
function varint(baytlar, v) {
  let x = v >>> 0;
  while (x >= 128) {
    baytlar.push((x & 127) | 128);
    x >>>= 7;
  }
  baytlar.push(x);
}

/** Eğim tahmini: sol + üst − sol üst (ilk satırda sol, ilk sütunda üst). */
function tahmin(h, i, en) {
  const x = i % en;
  if (i < en) return x > 0 ? h[i - 1] : 0;
  if (x === 0) return h[i - en];
  return h[i - 1] + h[i - en] - h[i - en - 1];
}

/** Uint16Array yükseklik alanını metne kodlar. */
export function hKodla(h, en = GENISLIK) {
  const b = [];
  let sifir = 0;
  const bosalt = () => {
    if (!sifir) return;
    b.push(0);
    varint(b, sifir - 1);
    sifir = 0;
  };
  for (let i = 0; i < h.length; i++) {
    const d = h[i] - tahmin(h, i, en);
    const z = (d << 1) ^ (d >> 31);
    if (z === 0) {
      sifir += 1;
      continue;
    }
    bosalt();
    varint(b, z);
  }
  bosalt();
  let ikili = '';
  for (let i = 0; i < b.length; i += 8192) {
    ikili += String.fromCharCode(...b.slice(i, i + 8192));
  }
  return btoa(ikili);
}

/** hKodla'nın tersi; boyu tutmazsa hata. */
export function hCoz(metin, n = GENISLIK * YUKSEKLIK, en = GENISLIK) {
  const ikili = atob(metin);
  const h = new Uint16Array(n);
  let k = 0;
  const oku = () => {
    let v = 0;
    let kay = 0;
    for (;;) {
      if (k >= ikili.length) throw new Error('kayıt: h kesik');
      const c = ikili.charCodeAt(k++);
      v |= (c & 127) << kay;
      if (c < 128) return v >>> 0;
      kay += 7;
    }
  };
  let i = 0;
  const yaz = (d) => {
    h[i] = tahmin(h, i, en) + d;
    i += 1;
  };
  while (k < ikili.length) {
    const z = oku();
    if (z === 0) {
      const say = oku() + 1;
      for (let s = 0; s < say; s++) yaz(0);
    } else {
      yaz((z >>> 1) ^ -(z & 1));
    }
    if (i > n) throw new Error('kayıt: h taşıyor');
  }
  if (i !== n) throw new Error(`kayıt: h boyu ${i} (beklenen ${n})`);
  return h;
}

/** ozel'i JSON'lanabilir biçime çevirir (tipli diziler seyrek). */
export function ozelKodla(v) {
  if (ArrayBuffer.isView(v)) {
    const s = [];
    v.forEach((x, i) => { if (x) s.push([i, x]); });
    return { $t: v.constructor.name, n: v.length, s };
  }
  if (Array.isArray(v)) return v.map(ozelKodla);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ozelKodla(x)]));
  }
  return v;
}

export function ozelCoz(v) {
  if (Array.isArray(v)) return v.map(ozelCoz);
  if (v && typeof v === 'object') {
    if (v.$t) {
      const Tip = TIPLER[v.$t];
      if (!Tip) throw new Error(`kayıt: bilinmeyen tip ${v.$t}`);
      const d = new Tip(v.n);
      for (const [i, x] of v.s) d[i] = x;
      return d;
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ozelCoz(x)]));
  }
  return v;
}

const gomuluEk = (g) => {
  const { x, y, z, aci, alindi, esya, kepcede, balyada, ...ek } = g;
  return ek;
};

/** Dünyayı kayıt nesnesine çevirir. ek: oyunun saklamak istediği küçük alanlar. */
export function dunyaKodla(c, tarla, ek = {}) {
  const parcalar = [...c.parcalar.values()].map((p) => [
    p.id, p.kod, p.x, p.y, p.yon, p.etkin ? 1 : 0, p.tikali ? 1 : 0, ozelKodla(p.ozel)]);
  const envanter = [];
  c.envanter.forEach((n, kod) => { if (n) envanter.push([kod, n]); });
  return {
    surum: SURUM, tohum: c.tohum, tik: c.tik, zar: c.zar.a, kaymaAdim: c.kaymaAdim,
    sonrakiId: c.sonrakiId, yasak: c.yasak, kaldirilan: tarla.kaldirilan, h: hKodla(tarla.h),
    kirli: [...c.kirli], tarlaKirli: tarla.kirli ? 1 : 0,
    gomulu: c.gomulu.map((g) => [g.esya, g.x, g.y, g.z, g.aci ?? 0, g.alindi ? 1 : 0,
      gomuluEk(g)]),
    parcalar, hatEsya: hatEsyalari(c), envanter,
    kuyruk: c.kuyruk.map((k) => ({ ...k })), ek,
    alanlar: Object.fromEntries([...alanlar].map(([ad, a]) => [ad, a.kodla(c)])),
  };
}

/** Göçleri uygular; tanınmayan sürüm hata verir. */
export function gocUygula(veri, gocler = GOCLER, hedef = SURUM) {
  if (!veri || typeof veri !== 'object' || !Number.isInteger(veri.surum)) {
    throw new Error('kayıt: sürüm yok');
  }
  let v = veri;
  while (v.surum < hedef) {
    const goc = gocler[v.surum];
    if (!goc) throw new Error(`kayıt: ${v.surum} sürümünden göç yok`);
    v = goc(v);
  }
  if (v.surum !== hedef) throw new Error(`kayıt: sürüm ${v.surum} bu oyundan yeni`);
  return v;
}

/**
 * Kayıttan dünyayı kurar: tarla.h ve kaldirilan yazılır, gömülü nesneler yeniden yaratılır.
 * Dönüş { c, ek }. Bozuk veri hata verir.
 */
export function dunyaCoz(veri, tarla) {
  const v = gocUygula(veri);
  tarla.h.set(hCoz(v.h, tarla.h.length));
  tarla.kaldirilan = v.kaldirilan;
  tarla.kirli = Boolean(v.tarlaKirli);
  const gomulu = v.gomulu.map(([esya, x, y, z, aci, alindi, ek]) => ({
    ...ek, esya, x, y, z, aci, alindi: Boolean(alindi),
  }));
  const c = ciftlikKur(v.tohum, { gomulu, yasak: v.yasak });
  Object.assign(c, { tik: v.tik, kaymaAdim: v.kaymaAdim, sonrakiId: v.sonrakiId });
  c.zar.a = v.zar >>> 0;
  c.kirli.set(v.kirli);
  for (const [ad, a] of alanlar) a.coz(c, v.alanlar?.[ad]);
  for (const [id, kod, x, y, yon, etkin, tikali, ozel] of v.parcalar) {
    const tanim = parcaTanimi(kod);
    if (!tanim) throw new Error(`kayıt: bilinmeyen parça kodu ${kod}`);
    const p = parcaOrnegi(tanim, id, x, y, yon);
    Object.assign(p, { etkin: Boolean(etkin), tikali: Boolean(tikali), ozel: ozelCoz(ozel) });
    c.parcalar.set(id, p);
    izgaraIsaretle(c, p);
  }
  for (const [kod, n] of v.envanter) c.envanter[kod] = n;
  c.kuyruk = v.kuyruk.map((k) => ({ ...k }));
  yenidenKur(c, tarla);
  for (const d of eskiyiYerlestir(c, v.hatEsya)) c.envanter[d.tur] += 1;
  return { c, ek: v.ek ?? {} };
}

/** Dünyanın FNV özeti (kayıt nesnesi + h üzerinden): determinizm testleri için. */
export function dunyaOzeti(c, tarla) {
  const metin = JSON.stringify(dunyaKodla(c, tarla));
  let s = OZET_BASI;
  for (let i = 0; i < metin.length; i++) s = ozetKat(s, metin.charCodeAt(i));
  return ozetKat(s, tarla.h);
}
