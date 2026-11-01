/**
 * Çiftlik benzetimi: dünya durumu (c), 20 Hz sabit tik ve tik aşamaları. Gerçek zaman
 * okumaz; aynı tohum + aynı (tik numaralı) komut dizisi = bit bit aynı dünya.
 * Tik sırası (tikAt): 10 komutlar (komut.js; topoloji değiştiyse hatlar ve aşamaların
 * yenidenKur'u) → 20 enerji, 30 sinyal (Faz 1; asamaTanimla ile) → 40 parçaların adim'ı
 * (id artan) → 50 hatlar (aşağı akış önce) → 60 saman (en çok KAYMA_TIK cokertKaro geçişi)
 * → tik++ → 70 ekonomi (ekonomi/siparis.js ekonomiAdim: biten kartlar ödenir, damga basılır,
 * boş pano yuvaları dolar, saniyede bir çevrimdışı penceresi; ozet sayaçları sıfırlanmadan
 * önce). Olaylar dizi olarak döner ({ ad, veri }); yayma oyun-ciftlik.js'in işidir.
 * Parça adim'ına verilen ctx: { c, tarla, tik, zar, oran(p), ver(p, port, kod),
 * samanAl(x, y, r, n), samanDok(x, y, n), gomuluCikar(x, y, r, p), olay(ad, veri),
 * sayac(ad, kod, n) }. Faz 1 ctx'e alan ekleyebilir (ctxGenislet).
 */
import { zarKur, TIK_MS, TIK_EN_COK } from './olcu.js';
import { ESYA_KAP, esyaSamani } from './esya.js';
import { parcaIcerigi } from './parca-kayit.js';
import { izgaraKur, yasakEkle } from './izgara.js';
import {
  samanAl, samanDok, gomuluCikar, cokertKaro, KIRLI_EN, KIRLI_BOY, KAYMA_TIK,
} from './saman.js';
import { hatlariKur } from './tasima/hat.js';
import { hatlarAdim, cikisaVer } from './tasima/hat-adim.js';
import { komutlariUygula } from './komut.js';
import { ekonomiAdim } from './ekonomi/siparis.js';

/** Bir saniyede kaç tik ('ciftlik-ozet' bu aralıkla yayılır). */
export const SANIYE_TIK = 1000 / TIK_MS;

const asamalar = [];
const genisleticiler = [];

/**
 * Tik aşaması ekler (Faz 1: enerji 20, sinyal 30). adim(ctx) her tik; yenidenKur(c, tarla)
 * topoloji değişince (hatlardan sonra). Aynı sıra numarasında kayıt sırası geçerlidir.
 */
export function asamaTanimla(ad, sira, { adim, yenidenKur }) {
  if (asamalar.some((a) => a.ad === ad)) throw new Error(`asamaTanimla: "${ad}" zaten var`);
  asamalar.push({ ad, sira, adim, yenidenKur });
  asamalar.sort((a, b) => a.sira - b.sira);
}

/** ctx'e alan ekleyen işlev kaydeder: islev(ctx) (ör. sinyalOku/sinyalYaz). */
export function ctxGenislet(islev) {
  genisleticiler.push(islev);
}

/**
 * Yeni, boş çiftlik dünyası. gomulu: tarlaya gömülü nesneler ({ esya, x, y, z, alindi, ... };
 * aynı nesneler oyunda tarla.igne/civiler/buluntular olarak da görülür), yasak: [{ x, y, r }]
 * hücre daireleri (garaj park alanı).
 */
export function ciftlikKur(tohum, { gomulu = [], yasak = [] } = {}) {
  const c = {
    tohum: tohum >>> 0, tik: 0, zar: zarKur(tohum ^ 0x2545f491), sonrakiId: 1,
    parcalar: new Map(), kuyruk: [], izgara: izgaraKur(),
    kirli: new Uint8Array(KIRLI_EN * KIRLI_BOY), kaymaAdim: 0, gomulu,
    envanter: new Uint32Array(ESYA_KAP), sayaclar: {}, topoloji: true, yasak,
    hatlar: [], hatSira: [], karoHat: null, karoSira: null,
  };
  for (const y of yasak) yasakEkle(c.izgara, y.x, y.y, y.r);
  return c;
}

/** Komut kuyruğa girer; sonraki tikin başında uygulanır. */
export function komutEkle(c, komut) {
  c.kuyruk.push({ ...komut, tik: c.tik });
}

/** Topoloji değişti: hatlar ve aşamalar yeniden kurulur; düşen hat eşyaları envantere. */
export function yenidenKur(c, tarla) {
  for (const d of hatlariKur(c)) c.envanter[d.tur] += 1;
  for (const a of asamalar) a.yenidenKur?.(c, tarla);
  c.topoloji = false;
}

const ctxler = new WeakMap();

function ctxAl(c, tarla, olaylar) {
  let ctx = ctxler.get(c);
  if (!ctx || ctx.tarla !== tarla) {
    ctx = {
      c, tarla, tik: 0, zar: c.zar, olaylar,
      oran: (p) => p.oran,
      ver: (p, port, kod) => cikisaVer(ctx, p, port, kod),
      samanAl: (x, y, r, n) => samanAl(tarla, c, x, y, r, n),
      samanDok: (x, y, n) => samanDok(tarla, c, x, y, n),
      gomuluCikar: (x, y, r, p) => gomuluCikar(tarla, c, x, y, r).map((g) => {
        ctx.olay('gomulu-cikti', { nesne: g, tur: g.esya, x: g.x, y: g.y, parca: p ?? null });
        return g.esya;
      }),
      olay: (ad, veri) => ctx.olaylar.push({ ad, veri }),
      sayac: (ad, kod, n = 1) => {
        const s = (c.sayaclar[ad] ??= new Uint32Array(ESYA_KAP));
        s[kod] += n;
      },
    };
    for (const g of genisleticiler) g(ctx);
    ctxler.set(c, ctx);
  }
  ctx.tik = c.tik;
  ctx.zar = c.zar;
  ctx.olaylar = olaylar;
  return ctx;
}

/** Bir tik. Olay listesi döner. */
export function tikAt(c, tarla) {
  const olaylar = [];
  const ctx = ctxAl(c, tarla, olaylar);
  komutlariUygula(c, tarla, olaylar);
  if (c.topoloji) yenidenKur(c, tarla);
  for (const a of asamalar) if (a.sira < 40) a.adim(ctx);
  for (const p of c.parcalar.values()) if (p.etkin && p.tanim.adim) p.tanim.adim(ctx, p);
  for (const a of asamalar) if (a.sira >= 40 && a.sira < 50) a.adim(ctx);
  hatlarAdim(ctx);
  for (const a of asamalar) if (a.sira >= 50 && a.sira < 60) a.adim(ctx);
  for (let k = 0; k < KAYMA_TIK && cokertKaro(tarla, c); k++);
  for (const a of asamalar) if (a.sira >= 60) a.adim(ctx);
  c.tik += 1;
  ekonomiAdim(c, olaylar);
  if (c.tik % SANIYE_TIK === 0) ozetOlayi(c, olaylar);
  return olaylar;
}

/** Saniyede bir: bu saniyede üretilen/depolanan eşyalar (ses, efekt, HUD için). */
function ozetOlayi(c, olaylar) {
  const veri = { tik: c.tik };
  for (const [ad, s] of Object.entries(c.sayaclar)) {
    const say = {};
    s.forEach((n, kod) => { if (n) say[kod] = n; });
    veri[ad] = say;
    s.fill(0);
  }
  olaylar.push({ ad: 'ciftlik-ozet', veri });
}

/**
 * Kare süresi birikiminden atılacak tik sayısı: { n, birikim }. Karede en çok TIK_EN_COK
 * tik; geride kalan atılır (benzetim yavaşlar, sıçramaz).
 */
export function tikSayisi(birikim, ms) {
  const toplam = birikim + Math.max(0, ms);
  const n = Math.min(TIK_EN_COK, Math.floor(toplam / TIK_MS));
  const kalan = toplam - n * TIK_MS;
  return { n, birikim: n === TIK_EN_COK ? Math.min(kalan, TIK_MS) : kalan };
}

/**
 * Benzetimdeki toplam saman katı (korunum): tarla.h + hat eşyaları + parça içerikleri +
 * envanter. Oyuncunun eliyle kaldırdığı (tarla.kaldirilan) ayrıca eklenir.
 */
export function ciftlikSamani(c, tarla) {
  let s = 0;
  for (let i = 0; i < tarla.h.length; i++) s += tarla.h[i];
  for (const h of c.hatlar) for (let k = 0; k < h.n; k++) s += esyaSamani(h.tur[k]);
  for (const p of c.parcalar.values()) {
    const ic = parcaIcerigi(p);
    s += ic.saman;
    for (const [kod, n] of ic.esya) s += esyaSamani(kod) * n;
  }
  c.envanter.forEach((n, kod) => { s += n * esyaSamani(kod); });
  return s;
}
