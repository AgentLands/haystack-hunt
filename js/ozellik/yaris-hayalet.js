/**
 * Yarış "hayaletleri": diğer oyuncuların çiftçileri (ve bindikleri makine) tuvalde renkli
 * halka + ad etiketiyle görünür. Konumlar yaris-konum.js ile gecikmeli ara değerlenir;
 * yürüme adımı (adimFaz) ve makine hızı alıcıda, ara değerli konumdan üretilir.
 * Bu yalnız görsel bir gösterimdir: başkasının makinesi yerel tarlayı etkilemez.
 */
import { katmanEkle, OLCEK } from '../cizim.js';
import { DUNYA_EN, dunyaPikseli } from '../cizim/tuval-olcek.js';
import { gorunum } from '../gorunum.js';
import { ADIM_BOYU } from '../kural/karakter.js';
import { karakterCiz } from './gorsel/karakter-cizim.js';
import { makineCiz } from './gorsel/makine-cizim.js';
import { anlikEkle, ornekle, GECIKME } from './yaris-konum.js';

/** Halka yarıçapı (hücre): çiftçi ve makine boyuna göre. */
const HALKA = { traktor: 2.9, balya: 3.2, ufleyici: 1.2 };
const HALKA_CIFTCI = 1.2;
const EN_UZUN_KARE = 0.1;

const oyuncular = new Map();

/** Gelen 'imlec' iletisi: oyuncunun geçmişine anlık ekler (x null ise gizler). */
export function hayaletKonum(id, ileti, simdi) {
  if (ileti.x === null || ileti.y === null) {
    oyuncular.delete(id);
    return;
  }
  let o = oyuncular.get(id);
  if (!o) {
    o = { gecmis: [], faz: 0, hiz: 0, onceki: null, sonZaman: null };
    oyuncular.set(id, o);
  }
  anlikEkle(o.gecmis, ileti, simdi);
}

export const hayaletSil = (id) => oyuncular.delete(id);
export const hayaletTemizle = () => oyuncular.clear();
/** En son bilinen konumlar (mini harita, testler): [{ id, x, y, makine }] (dünya birimi). */
export function hayaletKonumlari() {
  return [...oyuncular].map(([id, o]) => {
    const { x, y, makine } = o.gecmis.at(-1);
    return { id, x, y, makine };
  });
}

/** Kare başına: ara değerli durumu alır, yürüme fazını ve makine hızını günceller. */
function guncelle(o, zaman) {
  const s = ornekle(o.gecmis, zaman - GECIKME);
  const dt = o.sonZaman === null ? 0 : Math.min(EN_UZUN_KARE, (zaman - o.sonZaman) / 1000);
  if (dt > 0 && o.onceki) {
    const dx = s.x - o.onceki.x;
    const dy = s.y - o.onceki.y;
    const ileri = (dx * Math.cos(s.yon) + dy * Math.sin(s.yon)) / dt;
    o.hiz += (ileri - o.hiz) * 0.3;
    if (s.hareketli) o.faz = (o.faz + Math.hypot(dx, dy) / (2 * ADIM_BOYU)) % 1;
  }
  if (!s.hareketli) o.hiz *= 0.7;
  o.onceki = { x: s.x, y: s.y };
  o.sonZaman = zaman;
  return s;
}

function cizBir(ctx, s, o, zaman) {
  const m = s.makine;
  if (m && m.tur !== 'ufleyici') {
    const yuk = m.yuk ?? 0;
    makineCiz(ctx, {
      tur: m.tur, x: s.x, y: s.y, yon: m.yon, hiz: o.hiz, yakit: 1, surucu: true,
      calisiyor: s.kullan, yuk, z: 0,
    }, zaman);
    return;
  }
  const ufleyici = m ? { tur: 'ufleyici', calisiyor: s.kullan, yakit: 1 } : null;
  karakterCiz(ctx, {
    x: s.x, y: s.y, yon: s.yon, z: 0, hareketli: s.hareketli, adimFaz: o.faz,
    kullaniyor: s.kullan, makine: ufleyici,
  }, zaman, s.arac);
}

function halkaCiz(ctx, s, renk, k) {
  const r = (s.makine ? HALKA[s.makine.tur] : HALKA_CIFTCI) * OLCEK;
  ctx.beginPath();
  ctx.arc(s.x * OLCEK, s.y * OLCEK, r, 0, Math.PI * 2);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = renk;
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = renk;
  ctx.lineWidth = 2.5 * k;
  ctx.stroke();
  ctx.globalAlpha = 1;
  return r;
}

/** Ad etiketi: ekran boyutu sabit (k = dünya pikseli / CSS pikseli, gorunum.z'ye bölünür). */
function etiketCiz(ctx, s, r, ad, renk, k) {
  const px = s.x * OLCEK;
  const en = ctx.measureText(ad).width + 10 * k;
  const boy = 18 * k;
  const lx = Math.max(0, Math.min(DUNYA_EN - en, px - en / 2));
  const ly = Math.max(boy / 2, s.y * OLCEK - r - 8 * k);
  ctx.fillStyle = 'rgba(20, 14, 8, 0.8)';
  ctx.fillRect(lx, ly - boy / 2, en, boy);
  ctx.fillStyle = renk;
  ctx.fillText(ad, lx + 5 * k, ly);
}

/**
 * Hayalet katmanını kurar. bilgiAl(id, durum) → { ad, renk } ya da null (çizme).
 * Katman 'ust' sırada, yerel çiftçinin üstünde ve mini haritadan önce çizilir.
 */
export function hayaletKatmaniKur(bilgiAl) {
  katmanEkle((ctx, durum, zaman) => {
    if (!oyuncular.size) return;
    const k = dunyaPikseli() / gorunum.z;
    const cizilen = [];
    for (const [id, o] of oyuncular) {
      const bilgi = bilgiAl(id, durum);
      if (!bilgi || !o.gecmis.length) continue;
      const s = guncelle(o, zaman);
      const r = halkaCiz(ctx, s, bilgi.renk, k);
      cizBir(ctx, s, o, zaman);
      cizilen.push({ s, r, bilgi });
    }
    ctx.save();
    ctx.font = `bold ${Math.round(12 * k * 10) / 10}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const { s, r, bilgi } of cizilen) etiketCiz(ctx, s, r, bilgi.ad, bilgi.renk, k);
    ctx.restore();
  }, 'ust');
}
