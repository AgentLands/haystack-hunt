/**
 * İnşa önizlemesi ("hayalet", arayuz.md §3): seçili parça yarı saydam gövdesiyle çizilir.
 * Renk + şekil (renk körlüğü): yeşil zemin + ✓ kurulur; sarı + ! kurulur ama bağlantısız (hiçbir
 * portu bir şeye bakmıyor); kırmızı çizgili zemin + ✕ kurulmaz, altında tek satır neden
 * ("dolu", "saman çok yüksek: önce temizle", "yasak bölge"; ek denetimler: kuruş, kilit).
 * Giriş portu dolu üçgen (içe), çıkış portu boş üçgen (dışa); etki alanı (tanim.etki: ağız,
 * halka, menzil) kesik çizgi; bağlanacağı komşu parçalar çerçeveyle parlar (sade harekette
 * sabit). Bant yolu karo karo (dönemeçler yolun yönünden), yalnız iki ucun bağlantısı parlar.
 * Sök kipinde imleçteki parça kırmızı çerçeve alır. hayaletCiz I1/I2 için de açıktır
 * (yapıştırma kümesi). Ekran-sabit boylar CSS pikselinde (eb).
 */
import { insa, yerlesimKonumu } from '../insa.js';
import { parcaTanimi, parcaOrnegi } from '../../../kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli, parcaAt } from '../../../kural/ciftlik/izgara.js';
import { DX, DY, tersYon } from '../../../kural/ciftlik/olcu.js';
import { ekranBirim } from '../../../cizim/tuval-olcek.js';
import { nabizSade } from '../../sade-hareket.js';
import { KARO_PX, MUREKKEP, parcaCizimi } from './kayit.js';

const K = KARO_PX;
const ZEMIN = {
  gecerli: ['rgba(78, 160, 60, 0.35)', 'rgba(220, 255, 200, 0.9)', '#4E6B2F', '#F4E9D0'],
  baglantisiz: ['rgba(227, 179, 65, 0.42)', 'rgba(255, 240, 192, 0.95)', '#E3B341', MUREKKEP],
  gecersiz: ['rgba(200, 50, 30, 0.45)', 'rgba(255, 220, 200, 0.95)', '#9E3A26', '#F4E9D0'],
};
const NEDEN = {
  disarida: 'tarlanın dışında', yasak: 'garaj ya da kenar', dolu: 'dolu',
  saman: 'saman çok yüksek: önce temizle',
};
const denetimler = [];

/** Ek kurulma denetimi (kuruş, kilit): islev(c, tarla, tanim, x, y, yon) → neden | null. */
export function onizlemeDenetimiEkle(islev) {
  denetimler.push(islev);
}

function engel(c, tarla, tanim, x, y, yon) {
  const e = yerlestirmeEngeli(c, tarla, tanim, x, y, yon);
  if (e) return NEDEN[e] ?? e;
  for (const islev of denetimler) {
    const neden = islev(c, tarla, tanim, x, y, yon);
    if (neden) return neden;
  }
  return null;
}

/** Hayalet p'nin bağlanacağı komşu parçalar (port protokolüyle aynı kenar kuralı). */
export function komsuBaglantilari(c, p) {
  const sonuc = new Set();
  const bakar = (q, x, y) => q.tanim.hat && q.x + DX[q.yon] === x && q.y + DY[q.yon] === y;
  if (p.tanim.hat) {
    const q = parcaAt(c, p.x + DX[p.yon], p.y + DY[p.yon]);
    if (q && (q.tanim.hat ? q.yon !== tersYon(p.yon)
      : q.giris.some((g) => g.hx === p.x && g.hy === p.y))) sonuc.add(q);
    for (let d = 0; d < 4; d++) {
      const r = parcaAt(c, p.x + DX[d], p.y + DY[d]);
      if (r && r !== q && (bakar(r, p.x, p.y)
        || r.cikis?.some((k) => k.hx === p.x && k.hy === p.y))) sonuc.add(r);
    }
    return sonuc;
  }
  for (const port of p.cikis) {
    const q = parcaAt(c, port.hx, port.hy);
    if (q && (q.tanim.hat ? q.yon !== tersYon(port.yon)
      : q.giris.some((g) => g.hx === port.kx && g.hy === port.ky))) sonuc.add(q);
  }
  for (const port of p.giris) {
    const q = parcaAt(c, port.hx, port.hy);
    if (q && (bakar(q, port.kx, port.ky)
      || q.cikis?.some((k) => k.hx === port.kx && k.hy === port.ky))) sonuc.add(q);
  }
  return sonuc;
}

function zemin(ctx, x, y, en, boy, tur, eb) {
  const [dolgu, cizgi] = ZEMIN[tur];
  const px = x * K;
  const py = y * K;
  ctx.fillStyle = dolgu;
  ctx.fillRect(px, py, en * K, boy * K);
  ctx.strokeStyle = cizgi;
  ctx.lineWidth = 1.5 * eb;
  ctx.strokeRect(px, py, en * K, boy * K);
  if (tur !== 'gecersiz') return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, en * K, boy * K);
  ctx.clip();
  ctx.beginPath();
  for (let t = 0; t < (en + boy) * K; t += 3) {
    ctx.moveTo(px + t, py);
    ctx.lineTo(px + t - boy * K, py + boy * K);
  }
  ctx.stroke();
  ctx.restore();
}

/** Ekran-sabit işaret (✓ ! ✕) ve gerekirse neden etiketi. */
function isaret(ctx, p, tur, neden, eb) {
  const [, , plaka, simge] = ZEMIN[tur];
  const r = 7 * eb;
  const x = (p.x + p.en) * K;
  const y = p.y * K;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = plaka;
  ctx.fill();
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.stroke();
  ctx.strokeStyle = simge;
  ctx.lineWidth = 2 * eb;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const u = 3 * eb;
  if (tur === 'gecerli') {
    ctx.moveTo(x - u, y);
    ctx.lineTo(x - u * 0.2, y + u * 0.8);
    ctx.lineTo(x + u, y - u * 0.8);
  } else if (tur === 'gecersiz') {
    ctx.moveTo(x - u, y - u);
    ctx.lineTo(x + u, y + u);
    ctx.moveTo(x + u, y - u);
    ctx.lineTo(x - u, y + u);
  } else {
    ctx.moveTo(x, y - u * 1.1);
    ctx.lineTo(x, y + u * 0.25);
    ctx.moveTo(x, y + u);
    ctx.lineTo(x, y + u * 1.05);
  }
  ctx.stroke();
  if (!neden) return;
  ctx.font = `${12 * eb}px "Bree Serif", Georgia, serif`;
  const en = ctx.measureText(neden).width + 8 * eb;
  const ox = (p.x + p.en / 2) * K - en / 2;
  const oy = (p.y + p.boy) * K + 4 * eb;
  ctx.fillStyle = '#EAD7B0';
  ctx.fillRect(ox, oy, en, 17 * eb);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeRect(ox, oy, en, 17 * eb);
  ctx.fillStyle = '#2B2118';
  ctx.textBaseline = 'middle';
  ctx.fillText(neden, ox + 4 * eb, oy + 8.5 * eb);
}

/** Port üçgeni: giriş dolu (içe bakar), çıkış boş (dışa bakar). */
function portlar(ctx, p, eb) {
  const u = Math.max(1.3, 4.5 * eb);
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeStyle = MUREKKEP;
  for (const [liste, ice] of [[p.giris, true], [p.cikis, false]]) {
    for (const port of liste) {
      const d = ice ? tersYon(port.yon) : port.yon;
      const cx = (port.kx + 0.5 + DX[port.yon] * 0.5) * K - DX[port.yon] * u * (ice ? 0.9 : 0);
      const cy = (port.ky + 0.5 + DY[port.yon] * 0.5) * K - DY[port.yon] * u * (ice ? 0.9 : 0);
      ctx.beginPath();
      ctx.moveTo(cx + DX[d] * u, cy + DY[d] * u);
      ctx.lineTo(cx - DY[d] * u * 0.8, cy + DX[d] * u * 0.8);
      ctx.lineTo(cx + DY[d] * u * 0.8, cy - DX[d] * u * 0.8);
      ctx.closePath();
      ctx.fillStyle = ice ? MUREKKEP : '#F4E9D0';
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** tanim.etki: nesne, dizi ya da işlev(p) → [{ tur: 'halka'|'menzil', r } | { tur: 'agiz', … }]. */
function etkiCiz(ctx, p, eb) {
  let etki = p.tanim.etki;
  if (typeof etki === 'function') etki = etki(p);
  if (!etki) return;
  ctx.save();
  ctx.setLineDash([4 * eb, 3 * eb]);
  ctx.lineWidth = 1.5 * eb;
  ctx.strokeStyle = 'rgba(244, 233, 208, 0.95)';
  for (const e of [].concat(etki)) {
    ctx.beginPath();
    if (e.tur === 'agiz') {
      let { x, y, en, boy } = e;
      let pb = p.tanim.boyut[1];
      let pe = p.tanim.boyut[0];
      for (let i = 0; i < p.yon; i++) {
        [x, y, en, boy] = [pb - y - boy, x, boy, en];
        [pe, pb] = [pb, pe];
      }
      ctx.rect((p.x + x) * K, (p.y + y) * K, en * K, boy * K);
    } else {
      ctx.arc((p.x + p.en / 2) * K, (p.y + p.boy / 2) * K, e.r * K, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Bağlanacak komşuları parlatır. */
function parlat(ctx, komsular, eb, zaman) {
  if (!komsular.size) return;
  ctx.strokeStyle = `rgba(255, 214, 90, ${nabizSade(0.55 + 0.4 * Math.sin(zaman / 180), 0.85)})`;
  ctx.lineWidth = 2.5 * eb;
  for (const q of komsular) ctx.strokeRect(q.x * K, q.y * K, q.en * K, q.boy * K);
}

/**
 * Tek hayalet (x, y: döndürülmüş kutunun sol üstü). secenek: { gecerliZorla (mevcut bant
 * yeniden yönlenir), giris (bant dönemeci için giriş yönü), isaretli (✓ ! ✕ ve neden; true),
 * komsu (bağlantı denetimi ve parlama; true), zaman (ms) }.
 * Dönüş: { tur: 'gecerli' | 'baglantisiz' | 'gecersiz', neden, komsular }.
 */
export function hayaletCiz(ctx, c, tarla, anahtar, x, y, yon, eb, secenek = {}) {
  const { gecerliZorla = false, giris, isaretli = true, komsu = true, zaman = 0 } = secenek;
  const tanim = parcaTanimi(anahtar);
  const p = parcaOrnegi(tanim, 0, x, y, yon);
  if (giris !== undefined) p.onizlemeGiris = giris;
  const neden = gecerliZorla ? null : engel(c, tarla, tanim, x, y, yon);
  const komsular = komsu && !neden ? komsuBaglantilari(c, p) : new Set();
  const portlu = tanim.hat || p.giris.length + p.cikis.length > 0;
  const tur = neden ? 'gecersiz' : komsu && portlu && !komsular.size ? 'baglantisiz' : 'gecerli';
  zemin(ctx, x, y, p.en, p.boy, tur, eb);
  ctx.globalAlpha = 0.6;
  parcaCizimi(anahtar).govde(ctx, p, eb, null);
  ctx.globalAlpha = 1;
  etkiCiz(ctx, p, eb);
  if (!tanim.hat) portlar(ctx, p, eb);
  parlat(ctx, komsular, eb, zaman);
  if (isaretli) isaret(ctx, p, tur, neden, eb);
  return { tur, neden, komsular };
}

function yolCiz(ctx, c, tarla, eb, zaman) {
  const yol = insa.yol;
  yol.forEach((k, i) => {
    const var_ = parcaAt(c, k.kx, k.ky)?.tanim.anahtar === insa.secili;
    const onceki = yol[i - 1];
    const giris = onceki ? DX.findIndex((dx, d) => onceki.kx + dx === k.kx
      && onceki.ky + DY[d] === k.ky) : undefined;
    const uc = i === 0 || i === yol.length - 1;
    hayaletCiz(ctx, c, tarla, insa.secili, k.kx, k.ky, k.yon, eb, {
      gecerliZorla: var_, giris: giris >= 0 ? giris : undefined, isaretli: i === yol.length - 1,
      komsu: uc, zaman,
    });
  });
}

export function onizlemeCiz(ctx, durum, zaman = 0) {
  if (!insa.acik || !insa.secili || !insa.hayalet) return;
  const c = durum.ciftlik;
  const eb = ekranBirim(ctx);
  const { kx, ky } = insa.hayalet;
  if (insa.secili === 'sok') {
    const p = parcaAt(c, kx, ky);
    if (p) zemin(ctx, p.x, p.y, p.en, p.boy, 'gecersiz', eb);
    return;
  }
  if (insa.yol) {
    yolCiz(ctx, c, durum.tarla, eb, zaman);
    return;
  }
  const { x, y } = yerlesimKonumu(insa.secili, kx, ky, insa.yon);
  hayaletCiz(ctx, c, durum.tarla, insa.secili, x, y, insa.yon, eb, { zaman });
}
