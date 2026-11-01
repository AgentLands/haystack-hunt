/**
 * Harman arabası (docs/ciftlik/sistemler.md §5): her ARABA.yoklama tikte yoklanır; son
 * arabadan beri harmandan ARABA.esik kat toplandıysa (c.tuketilenKat; harman stoku
 * başlangıcın %10'unun altındaysa dusukEsik) araba gelir. Önce duyuru ('harman-arabasi'
 * { asama: 'duyuru', x, y, tik }), ARABA.duyuru tik sonra döküm: tohumdan 8 adaydan merkezinin
 * `bosluk` karo çevresinde parça olmayan ilki; r 12 hücre, tepe 45 kat koni (c.arabaKat'a
 * yazılır) + 1 iğne türü (%80 iğne, %15 çuvaldız, %5 altın), 3 çivi, 2 taş, 1 buluntu.
 * Uygun yer yoksa araba bekler ('yer-yok' bir kez) ve her duyuru süresinde yeniden dener.
 * Komut `arabaCagir` (kuruş kuyusu; bedel G'nin bedelBagla'sıyla): ARABA.cagri tikte en çok 1.
 */
import { GENISLIK, YUKSEKLIK } from '../../boyut.js';
import { KARO, KARO_EN, KARO_BOY, karoIndeks, zarAralik } from '../olcu.js';
import { esyaKodu } from '../esya.js';
import { KATALOG, NADIRLIK } from '../../buluntu.js';
import { asamaTanimla } from '../benzetim.js';
import { komutTanimla } from '../komut.js';
import { kayitAlaniTanimla } from '../sakla.js';
import { kirliIsaretle } from '../saman.js';
import { harmanStogu, bedelOde, dunyaHazirla } from './arazi.js';
import { gomuluEkle } from './gomulu.js';

export const ARABA = Object.freeze({
  yoklama: 6000, esik: 15000, dusukEsik: 8000, dusukStokYuzde: 10, duyuru: 600,
  r: 12, tepe: 45, bosluk: 6, cagri: 6000, nesneR: 9,
  civi: 3, tas: 2, buluntu: 1, igneTuru: [[800, 'igne'], [950, 'cuvaldiz'], [1000, 'altin-igne']],
});

const yeniDurum = () => ({ bekleyen: null, bekliyor: false, sayi: 0, sonCagri: -ARABA.cagri });

function durumAl(c) {
  c.araba ??= yeniDurum();
  return c.araba;
}

/** İlk uygun döküm yeri (karo merkezi [kx, ky]) ya da null. */
export function dokumYeri(c) {
  const b = ARABA.bosluk;
  for (const [x, y] of dunyaHazirla(c).dokum) {
    let bos = true;
    for (let ky = Math.max(0, y - b); ky <= Math.min(KARO_BOY - 1, y + b) && bos; ky++) {
      for (let kx = Math.max(0, x - b); kx <= Math.min(KARO_EN - 1, x + b); kx++) {
        if (c.izgara.dolu[karoIndeks(kx, ky)]) {
          bos = false;
          break;
        }
      }
    }
    if (bos) return [x, y];
  }
  return null;
}

/** Araba yola çıkar (duyuru); yer yoksa false. */
function baslat(ctx) {
  const a = durumAl(ctx.c);
  const yer = dokumYeri(ctx.c);
  if (!yer) {
    if (!a.bekliyor) ctx.olay('harman-arabasi', { asama: 'yer-yok' });
    a.bekliyor = true;
    return false;
  }
  const [x, y] = [yer[0] * KARO + 1, yer[1] * KARO + 1];
  a.bekliyor = false;
  a.bekleyen = { x, y, tik: ctx.tik + ARABA.duyuru };
  ctx.olay('harman-arabasi', { asama: 'duyuru', x, y, tik: a.bekleyen.tik });
  return true;
}

/** Bu tik için eşik (stok %10'un altındaysa düşük). */
export function arabaEsigi(c, tarla) {
  const a = dunyaHazirla(c);
  const dusuk = harmanStogu(a, tarla) * 100 < a.baslangicStok * ARABA.dusukStokYuzde;
  return dusuk ? ARABA.dusukEsik : ARABA.esik;
}

function buluntuSec(zar) {
  const toplam = KATALOG.reduce((t, b) => t + NADIRLIK[b.nadirlik].agirlik, 0);
  let pay = zarAralik(zar, toplam);
  for (const b of KATALOG) {
    pay -= NADIRLIK[b.nadirlik].agirlik;
    if (pay < 0) return b.tur;
  }
  return KATALOG[KATALOG.length - 1].tur;
}

/** Koni döker, nesneleri gömer. Dökülen katı döndürür. */
function dok(ctx, { x: cx, y: cy }) {
  const { c, tarla, zar } = ctx;
  const r = ARABA.r;
  let kat = 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(YUKSEKLIK - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(GENISLIK - 1, cx + r); x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      const i = y * GENISLIK + x;
      if (d2 >= r * r || c.izgara.taban[i]) continue;
      const ek = Math.floor((ARABA.tepe * (r * r - d2)) / (r * r));
      tarla.h[i] += ek;
      kat += ek;
      kirliIsaretle(c, x, y);
    }
  }
  c.arabaKat += kat;
  const u = zarAralik(zar, 1000);
  const igne = ARABA.igneTuru.find(([sinir]) => u < sinir)[1];
  const adlar = [igne, ...Array(ARABA.civi).fill('civi'), ...Array(ARABA.tas).fill('tas')];
  for (let k = 0; k < ARABA.buluntu; k++) adlar.push(`buluntu:${buluntuSec(zar)}`);
  const nesneler = [];
  for (const ad of adlar) {
    const x = cx - ARABA.nesneR + zarAralik(zar, 2 * ARABA.nesneR + 1);
    const y = cy - ARABA.nesneR + zarAralik(zar, 2 * ARABA.nesneR + 1);
    const h = tarla.h[y * GENISLIK + x];
    const g = { esya: esyaKodu(ad), x, y, z: Math.floor((h * (10 + zarAralik(zar, 50))) / 100),
      aci: 0, alindi: false };
    if (ad.startsWith('buluntu:')) g.tur = ad.slice(8);
    nesneler.push(g);
  }
  gomuluEkle(c, nesneler, ctx.olay);
  return kat;
}

/** Tik aşaması 57 (saman kaymasından önce): yoklama, bekleme, döküm. */
export function arabaAdim(ctx) {
  const { c } = ctx;
  const a = durumAl(c);
  if (a.bekleyen) {
    if (ctx.tik < a.bekleyen.tik) return;
    const b = a.bekleyen;
    a.bekleyen = null;
    const kat = dok(ctx, b);
    a.sayi += 1;
    c.tuketilenKat = 0;
    ctx.olay('harman-arabasi', { asama: 'dokum', x: b.x, y: b.y, kat, sayi: a.sayi });
    return;
  }
  const yokla = ctx.tik > 0 && ctx.tik % ARABA.yoklama === 0;
  const yeniden = a.bekliyor && ctx.tik % ARABA.duyuru === 0;
  if (!yokla && !yeniden) return;
  if (a.bekliyor || c.tuketilenKat >= arabaEsigi(c, ctx.tarla)) baslat(ctx);
}

asamaTanimla('araba', 57, { adim: arabaAdim, yenidenKur: (c) => { durumAl(c); } });

komutTanimla('arabaCagir', (c, tarla, k, olaylar) => {
  const a = durumAl(c);
  dunyaHazirla(c);
  const red = (neden) => olaylar.push({ ad: 'komut-reddedildi', veri: { komut: k, neden } });
  if (a.bekleyen) return red('yolda');
  if (c.tik - a.sonCagri < ARABA.cagri) return red('erken');
  if (!dokumYeri(c)) return red('yer-yok');
  if (!bedelOde(c, 'arabaCagir', 0)) return red('kurus');
  a.sonCagri = c.tik;
  const ctx = { c, tarla, tik: c.tik, olay: (ad, veri) => olaylar.push({ ad, veri }) };
  baslat(ctx);
  return undefined;
});

kayitAlaniTanimla('araba', {
  kodla: (c) => {
    const a = durumAl(c);
    return { ...a, bekleyen: a.bekleyen && { ...a.bekleyen } };
  },
  coz(c, v) {
    c.araba = v ? { ...yeniDurum(), ...v } : yeniDurum();
  },
});
