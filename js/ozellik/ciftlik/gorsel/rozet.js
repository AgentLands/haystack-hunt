/**
 * Durum rozetleri (arayuz.md §7, sistemler.md §7): parça yalnız SORUN varken sağ üst
 * köşesinde küçük bir damga taşır (sessizlik = iyi). Rozetler renk dışında ŞEKİLLE ayrılır
 * (renk körlüğü): çizik şimşek, yarım şimşek, boş huni, dolu kutu + duran ok, taşan kutu,
 * çivi + ünlem, kırık çekiç, at nalı, lekeli kalbur, damla, soru, bulut, boş bidon, ▮▮,
 * dişli, kopuk halka (bilinmeyen: üç nokta). Plaka rengi belirteçten (damga, saman, çivit, gri).
 * Faz 0 kodları eşlenir: 'girdi-yok' → ac, 'tikali' → sikisti; 'calisiyor' ve 'bos' rozetsiz;
 * bilinmeyen kod gri üç nokta rozetiyle görünür (sessiz kalmaz).
 * Çizim: her boy (cihaz pikseli) için bütün rozetler bir kez küçük bir atlasa çizilir; parça
 * başına tek drawImage. Boy ekran-sabittir (CSS pikseli; DPR'de aynı görünür).
 */
import { parcaDurumu } from '../../../kural/ciftlik/parca-kayit.js';
import { ekran } from '../../../cizim/tuval-olcek.js';
import { KARO_PX, MUREKKEP } from './kayit.js';
import { gorunurParcalar } from './bolge.js';

const PLAKA = {
  damga: ['#9E3A26', '#F4E9D0'], saman: ['#E3B341', '#2B2118'],
  civit: ['#2F4A6D', '#F4E9D0'], gri: ['#6F675C', '#F4E9D0'],
};

// --- Şekiller (birim uzay: yarıçap 1; r.ic simge, r.pl plaka rengi, r.lw çizgi) ---
function yol(c, noktalar) {
  c.beginPath();
  noktalar.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}
const SIMSEK = [[0.18, -0.78], [-0.38, 0.1], [-0.02, 0.1], [-0.18, 0.78], [0.4, -0.14],
  [0.04, -0.14]];
function cizgi(c, x1, y1, x2, y2, renk, kalin) {
  c.strokeStyle = renk;
  c.lineWidth = kalin;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
function dolu(c, r) {
  c.fillStyle = r.ic;
  c.fill();
}
function hat(c, r, k = 1) {
  c.strokeStyle = r.ic;
  c.lineWidth = r.lw * k;
  c.lineJoin = 'round';
  c.stroke();
}
function nokta(c, r, x, y, yc) {
  c.beginPath();
  c.arc(x, y, yc, 0, Math.PI * 2);
  dolu(c, r);
}

const SEKIL = {
  'guc-yok'(c, r) {
    yol(c, SIMSEK);
    dolu(c, r);
    cizgi(c, -0.62, -0.62, 0.62, 0.62, r.pl, r.lw * 2.6);
    cizgi(c, -0.62, -0.62, 0.62, 0.62, r.ic, r.lw * 1.1);
  },
  'guc-az'(c, r) {
    yol(c, SIMSEK);
    hat(c, r, 0.8);
    c.save();
    c.beginPath();
    c.rect(-1, 0.05, 2, 1);
    c.clip();
    yol(c, SIMSEK);
    dolu(c, r);
    c.restore();
  },
  ac(c, r) {
    yol(c, [[-0.62, -0.5], [0.62, -0.5], [0.14, 0.08], [0.14, 0.62], [-0.14, 0.62],
      [-0.14, 0.08]]);
    hat(c, r);
  },
  'cikis-dolu'(c, r) {
    c.beginPath();
    c.rect(-0.68, -0.42, 0.62, 0.84);
    dolu(c, r);
    cizgi(c, 0.04, 0, 0.36, 0, r.ic, r.lw);
    yol(c, [[0.42, 0], [0.24, -0.18], [0.24, 0.18]]);
    dolu(c, r);
    cizgi(c, 0.62, -0.42, 0.62, 0.42, r.ic, r.lw * 1.2);
  },
  dolu(c, r) {
    c.beginPath();
    c.rect(-0.55, -0.15, 1.1, 0.7);
    dolu(c, r);
    c.beginPath();
    c.arc(0, -0.15, 0.42, Math.PI, 0);
    dolu(c, r);
  },
  sikisti(c, r) {
    cizgi(c, -0.5, -0.38, 0.12, 0.55, r.ic, r.lw * 1.3);
    cizgi(c, -0.7, -0.22, -0.3, -0.55, r.ic, r.lw * 1.3);
    cizgi(c, 0.52, -0.62, 0.52, 0.12, r.ic, r.lw * 1.3);
    nokta(c, r, 0.52, 0.45, r.lw * 0.8);
  },
  kirik(c, r) {
    cizgi(c, -0.55, 0.6, 0.1, -0.12, r.ic, r.lw * 1.2);
    yol(c, [[-0.15, -0.35], [0.25, -0.75], [0.6, -0.4], [0.2, 0]]);
    dolu(c, r);
    cizgi(c, -0.45, 0.05, -0.15, 0.2, r.pl, r.lw);
    cizgi(c, -0.15, 0.2, -0.3, 0.42, r.pl, r.lw);
  },
  doymus(c, r) {
    c.beginPath();
    c.arc(0, 0.05, 0.5, 0, Math.PI);
    c.lineTo(-0.5, -0.55);
    c.moveTo(0.5, 0.05);
    c.lineTo(0.5, -0.55);
    hat(c, r, 2.1);
  },
  sivali(c, r) {
    c.beginPath();
    c.arc(0, 0, 0.62, 0, Math.PI * 2);
    hat(c, r);
    for (const t of [-0.22, 0.22]) {
      cizgi(c, t, -0.55, t, 0.55, r.ic, r.lw * 0.5);
      cizgi(c, -0.55, t, 0.55, t, r.ic, r.lw * 0.5);
    }
    c.beginPath();
    c.ellipse(0.18, 0.12, 0.3, 0.22, 0.5, 0, Math.PI * 2);
    dolu(c, r);
  },
  nemli(c, r) {
    c.beginPath();
    c.moveTo(0, -0.75);
    c.quadraticCurveTo(0.6, 0.05, 0.42, 0.35);
    c.arc(0, 0.3, 0.42, 0.1, Math.PI - 0.1);
    c.quadraticCurveTo(-0.6, 0.05, 0, -0.75);
    dolu(c, r);
  },
  yabanci(c, r) {
    c.beginPath();
    c.arc(0, -0.25, 0.3, Math.PI * 1.05, Math.PI * 2.35);
    c.lineTo(0, 0.22);
    hat(c, r, 1.1);
    nokta(c, r, 0, 0.55, r.lw * 0.75);
  },
  hava(c, r) {
    c.beginPath();
    c.arc(-0.32, 0.12, 0.3, 0, Math.PI * 2);
    c.arc(0.05, -0.08, 0.38, 0, Math.PI * 2);
    c.arc(0.4, 0.15, 0.27, 0, Math.PI * 2);
    c.rect(-0.32, 0.12, 0.72, 0.3);
    dolu(c, r);
  },
  'yakit-yok'(c, r) {
    c.beginPath();
    c.rect(-0.45, -0.3, 0.85, 0.9);
    hat(c, r);
    cizgi(c, 0.15, -0.3, 0.42, -0.62, r.ic, r.lw);
    cizgi(c, -0.3, -0.48, 0.02, -0.48, r.ic, r.lw);
  },
  kapali(c, r) {
    c.fillStyle = r.ic;
    c.fillRect(-0.48, -0.55, 0.32, 1.1);
    c.fillRect(0.16, -0.55, 0.32, 1.1);
  },
  ayar(c, r) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      cizgi(c, Math.cos(a) * 0.3, Math.sin(a) * 0.3, Math.cos(a) * 0.68, Math.sin(a) * 0.68,
        r.ic, r.lw * 1.3);
    }
    c.beginPath();
    c.arc(0, 0, 0.42, 0, Math.PI * 2);
    dolu(c, r);
    nokta(c, r, 0, 0, 0.16);
    c.fillStyle = r.pl;
    c.fill();
  },
  bilinmeyen(c, r) { // üç nokta: tanınmayan durum kodu
    for (const x of [-0.45, 0, 0.45]) nokta(c, r, x, 0, r.lw * 0.9);
  },
  essiz(c, r) {
    c.beginPath();
    c.arc(-0.05, 0.05, 0.5, Math.PI * 0.3, Math.PI * 1.75);
    hat(c, r, 1.2);
    cizgi(c, 0.42, -0.42, 0.66, -0.66, r.ic, r.lw);
    cizgi(c, 0.5, 0.05, 0.75, 0.12, r.ic, r.lw);
  },
};

/** Rozet kodu → [plaka, şekil]. */
const ROZETLER = {
  'guc-yok': 'saman', 'guc-az': 'saman', ac: 'civit', 'cikis-dolu': 'damga', dolu: 'damga',
  sikisti: 'damga', kirik: 'damga', doymus: 'saman', sivali: 'saman', nemli: 'civit',
  yabanci: 'civit', hava: 'saman', 'yakit-yok': 'saman', kapali: 'gri', ayar: 'gri',
  essiz: 'gri', bilinmeyen: 'gri',
};
export const ROZET_KODLARI = Object.freeze(Object.keys(ROZETLER));
const SESSIZ = new Set(['calisiyor', 'bos']);
const ESLEME = { 'girdi-yok': 'ac', tikali: 'sikisti' };

/** Parça durumundan rozet kodu; sorun yoksa null. */
export function rozetKodu(durum) {
  if (!durum || SESSIZ.has(durum)) return null;
  const kod = ESLEME[durum] ?? durum;
  return ROZETLER[kod] ? kod : 'bilinmeyen';
}

/** Rozetin şekil işlevi (test: renk dışı ayırt edilebilirlik). */
export const rozetSekli = (kod) => SEKIL[kod];

/** Birim uzayda bir rozet (plaka + şekil); birim: 1 CSS pikselinin birim uzunluğu. */
export function rozetCizBirim(c, kod, birim) {
  const [pl, ic] = PLAKA[ROZETLER[kod]];
  c.beginPath();
  c.arc(0, 0, 1 - birim * 0.8, 0, Math.PI * 2);
  c.fillStyle = pl;
  c.fill();
  c.strokeStyle = MUREKKEP;
  c.lineWidth = birim * 1.4;
  c.stroke();
  c.save();
  c.scale(0.86, 0.86);
  rozetSekli(kod)(c, { ic, pl, lw: Math.max(0.15, birim * 1.6) });
  c.restore();
}

const atlaslar = new Map();
function atlas(px) {
  const anahtar = `${px}:${ekran.dpr}`;
  let a = atlaslar.get(anahtar);
  if (a) return a;
  const tuval = document.createElement('canvas');
  const kenar = px + 2;
  tuval.width = kenar * ROZET_KODLARI.length;
  tuval.height = kenar;
  const c = tuval.getContext('2d');
  ROZET_KODLARI.forEach((kod, i) => {
    c.setTransform(px / 2, 0, 0, px / 2, i * kenar + kenar / 2, kenar / 2);
    rozetCizBirim(c, kod, (2 * ekran.dpr) / px);
  });
  a = { tuval, kenar };
  atlaslar.set(anahtar, a);
  if (atlaslar.size > 8) atlaslar.delete(atlaslar.keys().next().value);
  return a;
}

/**
 * Görünür parçaların rozetlerini çizer (ctx dünya dönüşümünde). eb: 1 CSS pikselinin dünya
 * boyu. hepsi: akış katmanı açık (uzak görünümde de küçük rozet). Dönüş: çizilen rozet.
 */
export function rozetleriCiz(ctx, c, alan, eb, hepsi = false) {
  const karoCss = KARO_PX / eb;
  if (!hepsi && karoCss < 8) return 0;
  const boyCss = karoCss >= 22 ? 16 : karoCss >= 12 ? 12 : 9;
  const px = Math.max(6, Math.round(boyCss * ekran.dpr));
  const a = atlas(px);
  const boy = (a.kenar / px) * boyCss * eb;
  let n = 0;
  gorunurParcalar(c, alan, (p) => {
    const kod = rozetKodu(parcaDurumu(p));
    if (!kod) return;
    const i = ROZET_KODLARI.indexOf(kod);
    const x = (p.x + p.en) * KARO_PX - boyCss * eb * 0.3;
    const y = p.y * KARO_PX + boyCss * eb * 0.3;
    ctx.drawImage(a.tuval, i * a.kenar, 0, a.kenar, a.kenar, x - boy / 2, y - boy / 2, boy, boy);
    n += 1;
  });
  return n;
}
