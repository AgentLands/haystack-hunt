/**
 * Toplama ailesi (docs/ciftlik/parcalar.md 1-3): emici huni (ağız + güç; temel.js'ten
 * taşındı, kod 2 aynı), tırmık kolu, taş toplayıcı. Dünya modüllerini (arazi, hava,
 * gömülü, araba, öğretici) de yükler: hepsi.js bu dosyayı içe aktarır.
 * Huni yön kuralı (Faz 0 kayıt uyumu): çıkış portu yön tarafındadır (yon 0: doğu), ağız
 * KARŞI kenarın önündeki 2×1 karo (parça dışında; taban maskesi ağızı kapsamaz).
 * Güç: tanımdaki gucsuzOran şebekesiz çalışma oranıdır; etkin oranı (p.oran) B · enerji
 * yazar (bağlıysa max(gucsuzOran, oran)). İş ilerlemesi `ilerleme += oran`, 1024'te bir birim.
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaKodu, esyaTanimi, SAMAN_TUTAM } from '../esya.js';
import { GENISLIK, YUKSEKLIK } from '../../boyut.js';
import { KARO, DX, DY, zarAralik } from '../olcu.js';
import { karoHucreleri, agizdanAl, gomuluBirAl, tarladaMi, kirliIsaretle } from '../saman.js';
import { ZEMIN, hucreZemini } from '../dunya/arazi.js';
import { agizKarolari } from '../dunya/ogretici.js';
import '../dunya/hava.js';
import '../dunya/gomulu.js';
import '../dunya/araba.js';

const SAMAN = esyaKodu('saman');
const YAS_OT = esyaKodu('yas-ot');
const TOZ = esyaKodu('toz');

/** Emici huni: tampon 4; tam oranda 1 kat/tik (100 tutam/dk), şebekesiz 512 (50/dk). */
export const HUNI = Object.freeze({ tampon: 4, gucsuzOran: 512, guc: 4, tozBinde: 125 });

const cikanOlay = (ctx, g, p) => ctx.olay('gomulu-cikti', { nesne: g, tur: g.esya, x: g.x,
  y: g.y, parca: p });

/** Tamamlanan tutamın türü: çayır katı çoğunluktaysa yaş ot; harmanda 1/8 toz. */
function tutamTuru(ctx, o) {
  const cayir = Math.min(o.cayir, SAMAN_TUTAM);
  o.cayir -= cayir;
  if (cayir * 2 >= SAMAN_TUTAM) return YAS_OT;
  return zarAralik(ctx.zar, 1000) < HUNI.tozBinde ? TOZ : SAMAN;
}

const cikisIncele = (o, tampon) => [['Çıkış tamponu', `${o.cikis.length}/${tampon}`],
  ...o.cikis.map((kod) => ['', esyaTanimi(kod)?.ad ?? `#${kod}`])];

function huniDurumu(p) {
  if (p.ozel.cikis.length >= HUNI.tampon) return 'cikis-dolu';
  return p.ozel.son > 0 ? 'calisiyor' : 'girdi-yok';
}

parcaTanimla('huni', {
  kod: 2, ad: 'Emici huni', aile: 'toplama', boyut: [2, 2],
  cikislar: [{ x: 1, y: 0, yon: 0 }], guc: HUNI.guc, gucsuzOran: HUNI.gucsuzOran,
  maliyet: { kurus: 40 }, kilit: 'T0',
  kur(p) {
    Object.assign(p.ozel, { birikim: 0, cayir: 0, ilerleme: 0, cikis: [], son: 0 });
  },
  adim(ctx, p) {
    const { c, tarla } = ctx;
    const o = p.ozel;
    o.cayir ??= 0; // Faz 0 kaydı: eksik alanlar
    o.ilerleme ??= 0;
    o.son = 0;
    if (o.cikis.length < HUNI.tampon) {
      const hucreler = karoHucreleri(c, agizKarolari(p));
      o.ilerleme += ctx.oran(p);
      const n = o.ilerleme >> 10;
      o.ilerleme &= 1023;
      if (n > 0) {
        const cayirMi = (i) => hucreZemini(c, i % GENISLIK, (i / GENISLIK) | 0) === ZEMIN.CAYIR;
        const al = agizdanAl(tarla, c, hucreler, n, cayirMi);
        o.birikim += al.alinan;
        o.cayir += al.cayir;
        o.son = al.alinan;
      }
      const g = gomuluBirAl(tarla, c, new Set(hucreler));
      if (g) {
        o.cikis.push(g.esya);
        cikanOlay(ctx, g, p);
      } else if (o.birikim >= SAMAN_TUTAM) {
        o.birikim -= SAMAN_TUTAM;
        const tur = tutamTuru(ctx, o);
        o.cikis.push(tur);
        ctx.sayac('uretilen', tur);
      }
    }
    if (o.cikis.length && ctx.ver(p, 0, o.cikis[0])) o.cikis.shift();
  },
  etki(p) {
    return { agiz: agizKarolari(p) };
  },
  icerik(p) {
    return { esya: p.ozel.cikis.map((kod) => [kod, 1]), saman: p.ozel.birikim };
  },
  durum: huniDurumu,
  incele(p) {
    const neden = {
      'cikis-dolu': 'Çıkış dolu: önüne bant ya da sandık bağla.',
      calisiyor: 'Ağızdaki samanı çekiyor.',
      'girdi-yok': 'Ağızda saman yok: yığın kaymasını bekliyor ya da besle.',
    }[huniDurumu(p)];
    return [['Durum', neden], ...cikisIncele(p.ozel, HUNI.tampon),
      ['Biriken saman', `${p.ozel.birikim}/${SAMAN_TUTAM} kat`]];
  },
});

/** Tırmık kolu: etki dairesinden (yarıçap 1-3 karo) 2 kat/tik yığma noktasına (ön karo). */
export const TIRMIK = Object.freeze({ hiz: 2, yaricap: 3, tasma: 40, surukle: 20, guc: 8 });

/** Tırmığın yığma karosu ve etki dairesi hücreleri (taban ve yığma karosu hariç). */
export function tirmikAlani(c, p) {
  const yigma = [p.x + DX[p.yon], p.y + DY[p.yon]];
  const dok = karoHucreleri(c, [yigma]);
  const r = (p.ozel.yaricap ?? TIRMIK.yaricap) * KARO;
  const cx2 = 2 * p.x * KARO + KARO;
  const cy2 = 2 * p.y * KARO + KARO;
  const halka = [];
  for (let y = p.y * KARO - r; y < p.y * KARO + KARO + r; y++) {
    for (let x = p.x * KARO - r; x < p.x * KARO + KARO + r; x++) {
      const dx = 2 * x + 1 - cx2;
      const dy = 2 * y + 1 - cy2;
      if (dx * dx + dy * dy > 4 * r * r || x < 0 || y < 0 || x >= GENISLIK) continue;
      const i = y * GENISLIK + x;
      if (y >= YUKSEKLIK || c.izgara.taban[i] || dok.includes(i)) continue;
      halka.push(i);
    }
  }
  return { yigma, dok, halka };
}

/** Açıktaki nesneleri yığma karosuna doğru bir hücre sürükler. */
function surukle(c, tarla, alan) {
  const set = new Set(alan.halka);
  const hx = alan.yigma[0] * KARO;
  const hy = alan.yigma[1] * KARO;
  for (const g of c.gomulu) {
    const i = (g.y | 0) * GENISLIK + (g.x | 0);
    if (!tarladaMi(g) || !set.has(i) || tarla.h[i] > g.z) continue;
    const fx = g.x < hx ? 1 : g.x >= hx + KARO ? -1 : 0;
    const fy = g.y < hy ? 1 : g.y >= hy + KARO ? -1 : 0;
    const ax = Math.abs(2 * g.x + 1 - 2 * hx - KARO);
    const ay = Math.abs(2 * g.y + 1 - 2 * hy - KARO);
    const yatay = fx !== 0 && (fy === 0 || ax >= ay);
    const nx = g.x + (yatay ? fx : 0);
    const ny = g.y + (yatay ? 0 : fy);
    const j = ny * GENISLIK + nx;
    if (c.izgara.taban[j]) continue;
    Object.assign(g, { x: nx, y: ny, z: tarla.h[j] });
  }
}

parcaTanimla('tirmik-kolu', {
  kod: 4, ad: 'Tırmık kolu', aile: 'toplama', boyut: [1, 1], guc: TIRMIK.guc, gucsuzOran: 0,
  maliyet: { kurus: 120 }, kilit: 'D6', ayarlar: { yaricap: { secim: [1, 2, 3] } },
  kur(p) {
    Object.assign(p.ozel, { yaricap: TIRMIK.yaricap, ilerleme: 0, son: 0, durum: 'bos' });
  },
  adim(ctx, p) {
    const { c, tarla } = ctx;
    const o = p.ozel;
    const alan = tirmikAlani(c, p);
    o.son = 0;
    if (!alan.dok.length) {
      o.durum = 'cikis-dolu';
      return;
    }
    const { h } = tarla;
    if (alan.dok.some((i) => h[i] >= TIRMIK.tasma)) {
      o.durum = 'cikis-dolu';
      return;
    }
    o.ilerleme += TIRMIK.hiz * ctx.oran(p);
    for (let n = o.ilerleme >> 10; n > 0; n--) {
      let en = -1;
      for (const i of alan.halka) if (en < 0 || h[i] > h[en]) en = i;
      if (en < 0 || h[en] === 0) break;
      let dip = alan.dok[0];
      for (const i of alan.dok) if (h[i] < h[dip]) dip = i;
      h[en] -= 1;
      h[dip] += 1;
      o.son += 1;
      kirliIsaretle(c, en % GENISLIK, (en / GENISLIK) | 0);
      kirliIsaretle(c, dip % GENISLIK, (dip / GENISLIK) | 0);
    }
    o.ilerleme &= 1023;
    o.durum = o.son > 0 ? 'calisiyor' : 'girdi-yok';
    if (ctx.tik % TIRMIK.surukle === 0 && ctx.oran(p) > 0) surukle(c, tarla, alan);
  },
  etki(p) {
    return { halka: p.ozel.yaricap, yigma: [[p.x + DX[p.yon], p.y + DY[p.yon]]] };
  },
  durum: (p) => p.ozel.durum ?? 'bos',
  incele(p) {
    const neden = {
      'cikis-dolu': 'Yığın taştı: öndeki huni yetişemiyor ya da önü kapalı.',
      calisiyor: 'Halkadaki samanı önündeki karoya tarıyor.',
      'girdi-yok': 'Halka boş: çayırın büyümesini bekliyor.',
      bos: 'Daha çalışmadı.',
    }[p.ozel.durum ?? 'bos'];
    return [['Durum', neden], ['Etki yarıçapı', `${p.ozel.yaricap} karo`]];
  },
});

/** Taş toplayıcı: 60 tikte bir menzildeki (4 karo) en yakın AÇIKTAKİ nesneyi alır. */
export const TAS_TOPLAYICI = Object.freeze({ aralik: 60, menzil: 4, tampon: 4, guc: 6 });
const TAS_ISI = TAS_TOPLAYICI.aralik * 1024;

/** Menzildeki en yakın açıktaki nesne (eşitlikte küçük hücre indeksi) ya da null. */
export function enYakinAcik(c, tarla, p) {
  const cx2 = 2 * p.x * KARO + p.en * KARO;
  const cy2 = 2 * p.y * KARO + p.boy * KARO;
  const r2 = 4 * (TAS_TOPLAYICI.menzil * KARO) ** 2;
  let en = null;
  for (const g of c.gomulu) {
    if (!tarladaMi(g)) continue;
    const i = (g.y | 0) * GENISLIK + (g.x | 0);
    if (tarla.h[i] > g.z || c.izgara.taban[i]) continue;
    const dx = 2 * (g.x | 0) + 1 - cx2;
    const dy = 2 * (g.y | 0) + 1 - cy2;
    const d = dx * dx + dy * dy;
    if (d > r2) continue;
    if (!en || d < en.d || (d === en.d && i < en.i)) en = { g, d, i };
  }
  return en?.g ?? null;
}

function tasDurumu(p) {
  if (p.ozel.cikis.length >= TAS_TOPLAYICI.tampon) return 'cikis-dolu';
  return p.ozel.son ? 'calisiyor' : 'girdi-yok';
}

parcaTanimla('tas-toplayici', {
  kod: 5, ad: 'Taş toplayıcı', aile: 'toplama', boyut: [2, 2],
  cikislar: [{ x: 1, y: 0, yon: 0 }], guc: TAS_TOPLAYICI.guc, gucsuzOran: 0,
  maliyet: { kurus: 110 }, kilit: 'D5',
  kur(p) {
    Object.assign(p.ozel, { ilerleme: 0, cikis: [], son: 0 });
  },
  adim(ctx, p) {
    const o = p.ozel;
    if (o.cikis.length < TAS_TOPLAYICI.tampon) {
      o.ilerleme = Math.min(TAS_ISI, o.ilerleme + ctx.oran(p));
      if (o.ilerleme >= TAS_ISI) {
        const g = enYakinAcik(ctx.c, ctx.tarla, p);
        o.son = g ? 1 : 0;
        if (g) {
          g.alindi = true;
          o.ilerleme = 0;
          o.cikis.push(g.esya);
          cikanOlay(ctx, g, p);
        }
      }
    }
    if (o.cikis.length && ctx.ver(p, 0, o.cikis[0])) o.cikis.shift();
  },
  etki() {
    return { menzil: TAS_TOPLAYICI.menzil };
  },
  icerik(p) {
    return { esya: p.ozel.cikis.map((kod) => [kod, 1]), saman: 0 };
  },
  durum: tasDurumu,
  incele(p) {
    const neden = {
      'cikis-dolu': 'Çıkış dolu: önüne bant bağla.',
      calisiyor: 'Açıkta parlayan nesneleri topluyor.',
      'girdi-yok': 'Menzilde açıkta nesne yok: huni ya da tırmık kolu açığa çıkarsın.',
    }[tasDurumu(p)];
    return [['Durum', neden], ...cikisIncele(p.ozel, TAS_TOPLAYICI.tampon)];
  },
});
