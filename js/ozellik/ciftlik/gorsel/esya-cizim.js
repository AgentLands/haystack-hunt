/**
 * Bant üzerindeki eşyaların toplu çizimi. Yığın türleri (esyaTopluTanimla: saman, ot,
 * balya...) tür başına Path2D'lerde birikir ve kare sonunda tür başına birkaç çağrıyla
 * çizilir (önce mürekkep alt dolgu = dış hat, sonra renk, sonra ekler); seyrek türler (iğne,
 * buluntu) en üste, esya-atlas.js'teki TEK atlas tuvalinden kaynak dikdörtgenle (drawImage)
 * basılır. Ekranda eşya UZAK_PX (9) CSS pikselinden küçükse (uzak görünüm: ayrıntı seçilmez)
 * kare: tek mürekkep alt yolu + renk başına tek fill (binlerce eşyada da ucuz). Görünür
 * alanın dışındaki hatlar (sınır kutusu) atlanır.
 * Konum: pos + hiz × alfa (öndekine ARALIK'tan çok yaklaşmaz). Düz karoda girişten merkeze,
 * merkezden çıkışa; dönemeçte (giriş yönü ≠ çıkış yönü) bant dokusuyla aynı çeyrek yay
 * üzerinde (bant.js donemec). Karo sırası her eşyada aranmaz: eşyalar öndeki önce geldiğinden
 * karo imleci geriye doğru yürür.
 */
import { ARALIK, DX, DY, KARO_EN } from '../../../kural/ciftlik/olcu.js';
import { esyaTanimi } from '../../../kural/ciftlik/esya.js';
import { hatKonumu } from '../../../kural/ciftlik/tasima/hat.js';
import { ekran, ekranBirim } from '../../../cizim/tuval-olcek.js';
import { KARO_PX, MUREKKEP, esyaToplu, esyaCizimSurumu } from './kayit.js';
import { ESYA_R, atlasHucresi } from './esya-atlas.js';
import { donemec, donemecNoktasi, karoGirisi } from './bant.js';

export { ESYA_R };
/** Eşya çapı bu kadar CSS pikselinden küçükse uzak (kare) çizim. */
const UZAK_PX = 9;
const kutular = new WeakMap();
const nokta = { x: 0, y: 0 };
const tarifler = { surum: -1, kod: [] };

/** Kodun toplu tarifi (önbellekli; yeni çizim tanımlanınca yenilenir) ya da null. */
function tarif(kod) {
  if (tarifler.surum !== esyaCizimSurumu()) {
    tarifler.surum = esyaCizimSurumu();
    tarifler.kod = [];
  }
  let t = tarifler.kod[kod];
  if (t === undefined) {
    t = esyaToplu(kod);
    tarifler.kod[kod] = t;
  }
  return t;
}

/** Biriken toplu türleri çizer (kod sırasıyla; mürekkep alt dolgu, renk, ekler). */
function kumeleriCiz(ctx, kumeler, eb) {
  ctx.lineCap = 'round';
  for (const kod of [...kumeler.keys()].sort((a, b) => a - b)) {
    const k = kumeler.get(kod);
    ctx.fillStyle = MUREKKEP;
    ctx.fill(k.dis);
    ctx.fillStyle = k.t.renk;
    ctx.fill(k.govde);
    k.t.ekler.forEach((ek, j) => {
      if (ek.dolgu) {
        ctx.fillStyle = ek.renk;
        ctx.fill(k.ekler[j]);
      } else {
        ctx.strokeStyle = ek.renk;
        ctx.lineWidth = (ek.kalin ?? 0.9) * eb;
        ctx.stroke(k.ekler[j]);
      }
    });
  }
}

/** Hattın karo sınır kutusu (önbellekli; hat nesnesi topolojiyle değişir). */
function hatKutusu(h) {
  let k = kutular.get(h);
  if (k) return k;
  k = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const karo of h.karolar) {
    const x = karo % KARO_EN;
    const y = (karo / KARO_EN) | 0;
    k = { x0: Math.min(k.x0, x), y0: Math.min(k.y0, y), x1: Math.max(k.x1, x),
      y1: Math.max(k.y1, y) };
  }
  kutular.set(h, k);
  return k;
}

/**
 * Hattın sira. karosunda iç konum ic'nin dünya pikseli konumu (paylaşılan nesneye yazar).
 * c verilirse ilk karonun giriş yönü gerçek öncülden (halka dikişi; bant.js karoGirisi).
 */
function karoNoktasi(h, sira, ic, hedef, c = null) {
  const karo = h.karolar[sira];
  const uzun = h.ofset[sira + 1] - h.ofset[sira];
  const t = Math.min(1, ic / uzun);
  const cx = (karo % KARO_EN) * KARO_PX + KARO_PX / 2;
  const cy = ((karo / KARO_EN) | 0) * KARO_PX + KARO_PX / 2;
  const g = c ? karoGirisi(c, h, sira) : h.girisYon[sira];
  const dm = donemec(g, h.yonler[sira]);
  if (dm) {
    const n = donemecNoktasi(dm, cx, cy, t);
    hedef.x = n.x;
    hedef.y = n.y;
    return hedef;
  }
  const d = t < 0.5 ? g : h.yonler[sira];
  const m = (t - 0.5) * KARO_PX; // sanal (uzun) karoda da tek karo boyunda gösterilir
  hedef.x = cx + DX[d] * m;
  hedef.y = cy + DY[d] * m;
  return hedef;
}

/** Hattaki pos'un dünya pikseli konumu (c verilirse halka dikişi düzeltilir). */
export function esyaKonumu(h, pos, c = null) {
  const { sira, ic } = hatKonumu(h, pos);
  return karoNoktasi(h, sira, ic, { x: 0, y: 0 }, c);
}

/**
 * Görünür hatlardaki eşyaları çizer. alan: karo dikdörtgeni, s: arka bellek ölçeği,
 * alfa: iki tik arası kesir. Dönüş: çizilen eşya sayısı.
 */
export function esyalariCiz(ctx, c, alan, s, alfa) {
  const eb = ekranBirim(ctx);
  const kucuk = (ESYA_R * 2) / eb < UZAK_PX;
  const renkler = kucuk ? new Map() : null;
  const murekkep = kucuk ? new Path2D() : null;
  const u = ESYA_R * 0.75;
  const kumeler = new Map();
  const dis = 1.1 * eb;
  const seyrek = [];
  let sayi = 0;
  const gx0 = alan.kx0 * KARO_PX;
  const gy0 = alan.ky0 * KARO_PX;
  const gx1 = (alan.kx1 + 1) * KARO_PX;
  const gy1 = (alan.ky1 + 1) * KARO_PX;
  let sonTur = -1;
  let sonKume = null;
  for (const h of c.hatlar) {
    if (!h.n) continue;
    const k = hatKutusu(h);
    if (k.x1 < alan.kx0 || k.y1 < alan.ky0 || k.x0 > alan.kx1 || k.y0 > alan.ky1) continue;
    let sinir = h.uzun;
    const ilerle = h.etkin ? h.hiz * alfa : 0;
    let sira = h.karolar.length - 1;
    for (let i = 0; i < h.n; i++) {
      const pos = Math.min(h.pos[i] + ilerle, sinir);
      sinir = pos - ARALIK;
      while (sira > 0 && h.ofset[sira] > pos) sira -= 1;
      const { x, y } = karoNoktasi(h, sira, pos - h.ofset[sira], nokta, c);
      if (x < gx0 || y < gy0 || x > gx1 || y > gy1) continue; // hattın görünmeyen kısmı
      sayi += 1;
      if (kucuk) {
        const renk = esyaTanimi(h.tur[i])?.renk ?? '#b9a27a';
        if (!renkler.has(renk)) renkler.set(renk, new Path2D());
        renkler.get(renk).rect(x - u, y - u, u * 2, u * 2);
        murekkep.rect(x - u - eb, y - u - eb, (u + eb) * 2, (u + eb) * 2);
        continue;
      }
      const t = tarif(h.tur[i]);
      if (!t) {
        seyrek.push(h.tur[i], x, y);
        continue;
      }
      let kume = h.tur[i] === sonTur ? sonKume : kumeler.get(h.tur[i]);
      if (!kume) {
        kume = { t, dis: new Path2D(), govde: new Path2D(),
          ekler: t.ekler.map(() => new Path2D()) };
        kumeler.set(h.tur[i], kume);
      }
      sonTur = h.tur[i];
      sonKume = kume;
      t.govde(kume.dis, x, y, ESYA_R, dis);
      t.govde(kume.govde, x, y, ESYA_R, 0);
      for (let j = 0; j < t.ekler.length; j++) t.ekler[j].sekil(kume.ekler[j], x, y, ESYA_R);
    }
  }
  kumeleriCiz(ctx, kumeler, eb);
  for (let i = 0; i < seyrek.length; i += 3) {
    const a = atlasHucresi(seyrek[i], s, ekran.dpr);
    ctx.drawImage(a.tuval, a.sx, a.sy, a.kenar, a.kenar, seyrek[i + 1] - a.boy / 2,
      seyrek[i + 2] - a.boy / 2, a.boy, a.boy);
  }
  if (renkler) {
    ctx.fillStyle = MUREKKEP;
    ctx.fill(murekkep);
    for (const [renk, yol] of renkler) {
      ctx.fillStyle = renk;
      ctx.fill(yol);
    }
  }
  return sayi;
}
