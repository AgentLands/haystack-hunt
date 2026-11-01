/**
 * Referans hatlar A/B/C (`docs/ciftlik/ekonomi.md` §8) test dünyasında kurulur; denge testi
 * 6000 tik koşturup hızları belgedeki sayılarla ±%10 kıyaslar. Kurulum `ciftlik-hatlar.mjs`
 * ile port bilgisinden yapılır; parçalar henüz birleşmediği için bu dosya BİRLEŞMEDE
 * doğrulanacak varsayımlar içerir (sağdaki "VARSAYIM" notları). Hava: rüzgâr sabit şiddet 3,
 * güneşli (`c.havaSabit` test kancası; D yazmadıysa uyarlanır). Güç: `c.testTamGuc`.
 */
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { KARO_EN, DX, DY } from '../js/kural/ciftlik/olcu.js';
import { GENISLIK } from '../js/kural/boyut.js';
import { dunya, duzTarla, kur } from './ciftlik-yardim.mjs';
import { HUNI_AD } from './ciftlik-bekleyen.mjs';
import {
  girisineKur, kolKur, sonraki, zincir, bantlar, cikisImleci, platoYap,
} from './ciftlik-hatlar.mjs';

/** Referans hatların belgedeki hedefleri: eşya/dk ve taban kuruş/dk (`ekonomi.md` §8). */
export const HEDEF = {
  A: { esya: 'balya-saman', dk: 11, kurus: 132 },
  B: { esya: 'balya-ot', dk: 10.5, kurus: 315 },
  C: { esya: 'kiyim', dk: 120, kurus: 240 },
};
export const TOLERANS = 0.10;

const SABIT_HAVA = { yon: 0, siddet: 3, gok: 'gunesli' };

/** Boş dünya: düz tarla, tam güç ve sabit hava kancaları açık. */
function bosDunya(tohum) {
  const d = dunya(tohum, duzTarla(0));
  d.c.testTamGuc = true;
  d.c.havaSabit = SABIT_HAVA;
  return d;
}

/** Plato: bütün hatları kapsayan geniş saman tabakası (hunilerin ağzı nerede olursa olsun). */
function plato(c, tarla) {
  platoYap(c, tarla, { x0: 0, y0: 30, x1: 240, y1: 130 }, 40);
}

/** Hat A (saman balyası): 2 huni → oluk → mıknatıs → şeytan yeli → ön: pres → sandık. */
export function hatA(tohum = 11) {
  const { c, tarla } = bosDunya(tohum);
  const oluk = girisineKur(c, tarla, 'birlestirme-olugu', { kx: 30, ky: 40 }, 0, 0);
  kolKur(c, tarla, oluk.giris[0], 4, HUNI_AD);
  kolKur(c, tarla, oluk.giris[1], 4, HUNI_AD);
  const [, , yel] = zincir(c, tarla, oluk, [[2, 'oluk-miknatisi'], [2, 'seytan-yeli']]);
  const pres = sonraki(c, tarla, yel, 0, 2, 'balya-presi');
  const balya = sonraki(c, tarla, pres, 0, 2, 'sandik');
  const toz = sonraki(c, tarla, yel, 1, 2, 'gubre-cukuru'); // VARSAYIM: çıkış sırası ön, sol, sağ
  const agir = sonraki(c, tarla, yel, 2, 2, 'sandik');
  plato(c, tarla);
  return { c, tarla, ana: balya, sinkler: [balya, agir], parcalar: [toz], hedef: HEDEF.A };
}

/** Hat C (kıyım): 3 huni → oluk → mıknatıs → şeytan yeli → ön: kıyıcı → sandık. */
export function hatC(tohum = 13) {
  const { c, tarla } = bosDunya(tohum);
  const oluk = girisineKur(c, tarla, 'birlestirme-olugu', { kx: 30, ky: 40 }, 0, 0);
  for (let g = 0; g < 3; g++) kolKur(c, tarla, oluk.giris[g], 4, HUNI_AD);
  const [, , yel] = zincir(c, tarla, oluk, [[2, 'oluk-miknatisi'], [2, 'seytan-yeli']]);
  const kiyici = sonraki(c, tarla, yel, 0, 2, 'cekicli-kiyici');
  const kiyim = sonraki(c, tarla, kiyici, 0, 2, 'sandik');
  const toz = sonraki(c, tarla, yel, 1, 2, 'sandik');
  const agir = sonraki(c, tarla, yel, 2, 2, 'sandik');
  plato(c, tarla);
  return { c, tarla, ana: kiyim, sinkler: [kiyim, toz, agir], parcalar: [], hedef: HEDEF.C };
}

/** Bant yolu: imleçten başlayıp [yon, n] parçalarını sırayla çeker, son imleci döndürür. */
function rota(c, tarla, im, parcalar) {
  let s = im;
  for (const [yon, n] of parcalar) s = bantlar(c, tarla, { ...s, yon }, n);
  return s;
}

/** Tırmığı, huninin ağzındaki karoya yığacak biçimde huninin önüne koyar (VARSAYIM: ağız =
 *  gövdenin önündeki karo; tırmığın yığma noktası = tırmığın önündeki karo). */
function tirmikBagla(c, tarla, huni) {
  const f = (huni.cikis[0].yon + 2) & 3; // huni ağzı çıkışın tersine bakar
  const agiz = [
    { kx: huni.x + huni.en, ky: huni.y }, { kx: huni.x, ky: huni.y + huni.boy },
    { kx: huni.x - 1, ky: huni.y }, { kx: huni.x, ky: huni.y - 1 },
  ][f];
  return kur(c, tarla, 'tirmik-kolu', agiz.kx + DX[f], agiz.ky + DY[f], (f + 2) & 3);
}

/** Çayır tabakası (VARSAYIM: D `c.zemin[karo] = CAYIR`; çayır hücreleri 12 kat). */
async function cayirYap(c, tarla, { kx0, ky0, kx1, ky1 }) {
  const { CAYIR } = await import('../js/kural/ciftlik/dunya/arazi.js');
  for (let ky = ky0; ky < ky1; ky++) {
    for (let kx = kx0; kx < kx1; kx++) {
      c.zemin[ky * KARO_EN + kx] = CAYIR;
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        tarla.h[(ky * 2 + y) * GENISLIK + kx * 2 + x] = 12;
      }
    }
  }
}

/**
 * Hat B (ot balyası): çayırda 2 tırmık + 2 huni → oluk → ot savurucu → çatal (taşma): ön →
 * oluk2; yan: kurutma ambarı → U dönüşü → oluk2 yan → pres → sandık.
 */
export async function hatB(tohum = 12) {
  const { c, tarla } = bosDunya(tohum);
  await cayirYap(c, tarla, { kx0: 5, ky0: 28, kx1: 40, ky1: 52 });
  const oluk = girisineKur(c, tarla, 'birlestirme-olugu', { kx: 30, ky: 40 }, 0, 0);
  for (let g = 0; g < 2; g++) {
    const huni = kolKur(c, tarla, oluk.giris[g], 4, HUNI_AD);
    tirmikBagla(c, tarla, huni);
  }
  const [, , catal] = zincir(c, tarla, oluk, [[2, 'ot-savurucu'], [1, 'catal']]);
  catal.ozel.ayar = 'tasma'; // VARSAYIM: B/A `ayar` alanı; çatal 'taşma' kipi
  const on = cikisImleci(catal, 0);
  const oluk2 = girisineKur(c, tarla, 'birlestirme-olugu', bantlar(c, tarla, on, 2), 0, 0);
  const ambar = sonraki(c, tarla, catal, 1, 1, 'kurutma-ambari');
  const o = cikisImleci(ambar, 0);
  const git = rota(c, tarla, o, [[o.yon, 1], [0, oluk2.x - o.kx], [1, oluk2.y - 1 - o.ky]]);
  if (git.yon !== 1) throw new Error('Hat B: U dönüşü yönü beklenmedik');
  const pres = sonraki(c, tarla, oluk2, 0, 2, 'balya-presi');
  const balya = sonraki(c, tarla, pres, 0, 2, 'sandik');
  return { c, tarla, ana: balya, sinkler: [balya], parcalar: [], hedef: HEDEF.B };
}

/** Hedef eşyanın kodu. */
export const hedefKodu = (h) => esyaKodu(h.esya);
