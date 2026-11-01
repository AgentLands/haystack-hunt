/**
 * Eşya atlası ve eşya çizimleri. Atlas: bütün türler TEK tuvalde hücre hücre, ekran ölçeğinde
 * bir kez çizilir; seyrek türler (iğne, çivi, buluntu) bantta atlastan tek drawImage ile.
 * Yığın türleri (saman, ot, toz, kıyım, balya, taş) esyaTopluTanimla ile yol tarifidir:
 * bantta tür başına toplu çizilir (esya-cizim.js; drawImage'dan çok ucuz), atlasta da var.
 * Ölçek 2^(1/8) adımlarına yukarı yuvarlanır: yakınlaştırma sürerken her kare değil, ancak
 * adım aşılınca yeniden çizilir. Yeni tür tanımlanınca (esyaCizimiTanimla) atlas yenilenir.
 * Burada da tasarım türlerinin çizimi var (esyalar.md §2: 14 tür; kural tarafında henüz
 * tanımlı olmasalar da anahtarla hazır) ve 20 buluntu (buluntu-sekil.js, defterle aynı).
 * Boyalı oyuncak: düz renk, ekran-sabit koyu kahve dış hat, tek açık vurgu; türler renk
 * körlüğüne karşı biçimle de ayrılır (tutam / balya / iğne / taş / küme).
 */
import { esyaTurleri } from '../../../kural/ciftlik/esya.js';
import { buluntuSekil, SEKIL_TURLERI } from '../../buluntu-sekil.js';
import {
  esyaCizimiTanimla, esyaTopluTanimla, esyaCizimi, esyaCizimSurumu, MUREKKEP,
} from './kayit.js';

/** Eşyanın yarıçapı (dünya pikseli). */
export const ESYA_R = 2.6;
const ADIM = 2 ** (1 / 8);
const EN_COK_HUCRE = 192;
const SUTUN = 8;
let atlas = null;

function nicem(s) {
  return ADIM ** Math.ceil(Math.log(s) / Math.log(ADIM) - 1e-9);
}

function hucreCiz(a, kod, i) {
  const sx = (i % SUTUN) * a.kenar;
  const sy = Math.floor(i / SUTUN) * a.kenar;
  const ctx = a.ctx;
  ctx.setTransform(a.s, 0, 0, a.s, sx + a.kenar / 2, sy + a.kenar / 2);
  ctx.save();
  esyaCizimi(kod)(ctx, ESYA_R, a.dpr / a.s);
  ctx.restore();
  const h = { sx, sy };
  a.hucreler[kod] = h;
  return h;
}

function atlasKur(s, dpr, kap) {
  const kenar = Math.min(EN_COK_HUCRE, Math.ceil(ESYA_R * 2.5 * s) + 2);
  const sEtkin = (kenar - 2) / (ESYA_R * 2.5);
  const tuval = atlas?.tuval ?? document.createElement('canvas');
  tuval.width = SUTUN * kenar;
  tuval.height = Math.ceil(kap / SUTUN) * kenar;
  const a = {
    tuval, ctx: tuval.getContext('2d'), s: sEtkin, istenen: s, dpr, kenar, kap,
    boy: kenar / sEtkin, surum: esyaCizimSurumu(), hucreler: [], dolu: 0,
  };
  for (const t of esyaTurleri()) if (a.dolu < kap) hucreCiz(a, t.kod, a.dolu++);
  atlas = a;
  return a;
}

/**
 * Türün atlas hücresi: { tuval, sx, sy, kenar (kaynak piksel), boy (dünya pikseli) }.
 * s: arka bellek pikseli / dünya pikseli; dpr: ekran.dpr (dış hat CSS pikselinde sabit).
 */
export function atlasHucresi(kod, s, dpr = 1) {
  const sq = nicem(s);
  let a = atlas;
  if (!a || a.istenen !== sq || a.dpr !== dpr || a.surum !== esyaCizimSurumu()) {
    a = atlasKur(sq, dpr, Math.max(64, a?.kap ?? 0));
  }
  let h = a.hucreler[kod];
  if (!h) {
    if (a.dolu >= a.kap) a = atlasKur(sq, dpr, a.kap * 2);
    h = a.hucreler[kod] ?? hucreCiz(a, kod, a.dolu++);
  }
  return { tuval: a.tuval, sx: h.sx, sy: h.sy, kenar: a.kenar, boy: a.boy };
}

// --- Çizim yardımcıları (yerel uzay: dünya pikseli, (0, 0) merkez) ---
function cizgi(ctx, x1, y1, x2, y2, renk, kalin) {
  ctx.strokeStyle = renk;
  ctx.lineWidth = kalin;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// --- Toplu türler (esyalar.md §2): yol tarifleri (Path2D'ye ekler; x, y merkez, r yarıçap).
// closePath YOK: büyük Path2D'de her çağrısı yolu baştan tarar (ölçüldü: 900 okta ~20 ms);
// kapanış başlangıca lineTo ile, dolgu zaten kapatır. ---
const cizgiEk = (renk, x1, y1, x2, y2, kalin = 0.9) => ({
  renk, kalin,
  sekil(yol, x, y, r) {
    yol.moveTo(x + x1 * r, y + y1 * r);
    yol.lineTo(x + x2 * r, y + y2 * r);
  },
});
const noktaEk = (renk, liste, k) => ({
  renk, dolgu: true,
  sekil(yol, x, y, r) {
    for (const [nx, ny] of liste) {
      yol.moveTo(x + (nx + k) * r, y + ny * r);
      yol.arc(x + nx * r, y + ny * r, k * r, 0, Math.PI * 2);
    }
  },
});
/**
 * Kabarcık: (ux, uy) ekseninde a, dik eksende b yarı boylu, dört quadraticCurveTo ile elipse
 * yakın kapalı eğri (ellipse() toplu çizimde çok pahalı).
 */
function kabarcik(yol, x, y, a, b, ux, uy) {
  const ax = ux * a;
  const ay = uy * a;
  const bx = -uy * b;
  const by = ux * b;
  yol.moveTo(x + ax, y + ay);
  yol.quadraticCurveTo(x + ax + bx, y + ay + by, x + bx, y + by);
  yol.quadraticCurveTo(x - ax + bx, y - ay + by, x - ax, y - ay);
  yol.quadraticCurveTo(x - ax - bx, y - ay - by, x - bx, y - by);
  yol.quadraticCurveTo(x + ax - bx, y + ay - by, x + ax, y + ay);
}
const UX = Math.cos(-0.5);
const UY = Math.sin(-0.5);
/**
 * Tutam gövdesi: −0.5 rad eğik mercek (iki quadraticCurveTo; bantta en sık eşya olduğundan en
 * ucuz kapalı eğri). Kontrol noktası 2b uzakta: en kalın yeri b.
 */
function elips(yol, x, y, r, d) {
  const a = r * 0.92 + d;
  const b = (r * 0.62 + d) * 2;
  yol.moveTo(x + UX * a, y + UY * a);
  yol.quadraticCurveTo(x - UY * b, y + UX * b, x - UX * a, y - UY * a);
  yol.quadraticCurveTo(x + UY * b, y - UX * b, x + UX * a, y + UY * a);
}

/**
 * Ot tutamı: eğik kabarcık + ışık çizgisi + koyu lif ya da türün ayırt edici eki (renk
 * körlüğü: damla, çapraz lif, leke); ek sayısı az tutulur (toplu çizim maliyeti).
 */
function tutam(govde, acik, koyu, ...ek) {
  return { renk: govde, govde: elips, ekler: [cizgiEk(acik, -0.45, -0.05, 0.35, -0.38),
    ...(ek.length ? ek : [cizgiEk(koyu, -0.3, 0.32, 0.5, 0)])] };
}
esyaTopluTanimla('saman', tutam('#e3b341', '#fff0c0', '#b8862e'));
esyaTopluTanimla('yas-ot', tutam('#5f9a35', '#a5d26a', '#3d6b20',
  noktaEk('#bfe3ff', [[0.5, -0.55]], 0.2)));
esyaTopluTanimla('kuru-ot', tutam('#b5a548', '#ece29a', '#7d7330',
  cizgiEk('#7d7330', -0.55, -0.3, 0.25, 0.35)));
esyaTopluTanimla('curuk-ot', tutam('#5d5434', '#8a7f55', '#2f2a18',
  noktaEk('#1f1c10', [[-0.35, 0.05], [0.15, -0.1], [0.45, 0.15]], 0.13)));

esyaTopluTanimla('toz', {
  renk: '#a39478',
  govde(yol, x, y, r, d) {
    kabarcik(yol, x - r * 0.25, y + r * 0.2, r * 0.42 + d, r * 0.34 + d, 1, 0);
    kabarcik(yol, x + r * 0.15, y - r * 0.22, r * 0.4 + d, r * 0.3 + d, 1, 0);
  },
  ekler: [noktaEk('#d8ccb2', [[-0.1, -0.38]], 0.12)],
});

esyaTopluTanimla('kiyim', {
  renk: '#c9a24a',
  govde(yol, x, y, r, d) {
    yol.moveTo(x - r * 0.85 - d, y + r * 0.45 + d);
    yol.quadraticCurveTo(x, y - r * 1.05 - d * 2, x + r * 0.85 + d, y + r * 0.45 + d);
    yol.lineTo(x - r * 0.85 - d, y + r * 0.45 + d);
  },
  ekler: [{ renk: '#7a5a1c', kalin: 0.8, sekil(yol, x, y, r) {
    for (const [nx, ny] of [[-0.35, 0.15], [0.05, -0.15], [0.35, 0.2], [0.05, 0.28]]) {
      yol.moveTo(x + (nx - 0.1) * r, y + ny * r);
      yol.lineTo(x + (nx + 0.1) * r, y + (ny - 0.08) * r);
    }
  } }],
});

/** Balya: dikdörtgen, ışık çizgisi, iki ip; karışıkta yeşil yama. */
function balya(govde, acik, yama = null) {
  const ekler = [];
  if (yama) {
    ekler.push({ renk: yama, dolgu: true, sekil(yol, x, y, r) {
      yol.moveTo(x - r * 0.55, y + r * 0.4);
      yol.lineTo(x + r * 0.17, y - r * 0.4);
      yol.lineTo(x + r * 0.55, y - r * 0.4);
      yol.lineTo(x + r * 0.55, y + r * 0.05);
      yol.lineTo(x - r * 0.55, y + r * 0.4);
    } });
  }
  ekler.push(cizgiEk(acik, -0.6, -0.4, 0.6, -0.4, 0.8));
  ekler.push({ renk: '#9c2f1f', kalin: 1.4, sekil(yol, x, y, r) {
    for (const nx of [-0.37, 0.37]) {
      yol.moveTo(x + nx * r, y - r * 0.62);
      yol.lineTo(x + nx * r, y + r * 0.62);
    }
  } });
  return { renk: govde, ekler, govde(yol, x, y, r, d) {
    yol.rect(x - r * 0.85 - d, y - r * 0.62 - d, r * 1.7 + d * 2, r * 1.25 + d * 2);
  } };
}
esyaTopluTanimla('balya-saman', balya('#d8b85a', '#fff0c0'));
esyaTopluTanimla('balya-ot', balya('#8fa548', '#d6e39a'));
esyaTopluTanimla('balya-karisik', balya('#d8b85a', '#fff0c0', '#7f9a3e'));

esyaTopluTanimla('tas', {
  renk: '#8d8a82',
  govde(yol, x, y, r, d) {
    const n = [[-0.8, 0.1], [-0.45, -0.6], [0.35, -0.7], [0.85, -0.05], [0.5, 0.6], [-0.4, 0.65]];
    const k = r + d * 1.3;
    n.forEach(([nx, ny], i) => (i ? yol.lineTo(x + nx * k, y + ny * k)
      : yol.moveTo(x + nx * k, y + ny * k)));
    yol.lineTo(x + n[0][0] * k, y + n[0][1] * k);
  },
  ekler: [cizgiEk('#c9c4b8', -0.4, -0.35, 0.2, -0.48)],
});

// --- Seyrek, ayrıntılı türler: sprite ---
/** İğne biçimi: gövde çizgisi, göz deliği (boş elips), sivri uç. */
function igne(ctx, r, eb, renk, kalin, goz) {
  ctx.lineCap = 'round';
  cizgi(ctx, -r * 0.85, r * 0.5, r * 0.85, -r * 0.5, MUREKKEP, (kalin + 1.6) * eb);
  cizgi(ctx, -r * 0.85, r * 0.5, r * 0.85, -r * 0.5, renk, kalin * eb);
  ctx.beginPath();
  ctx.ellipse(-r * 0.62, r * 0.37, goz * 1.6, goz, -0.53, 0, Math.PI * 2);
  ctx.fillStyle = MUREKKEP;
  ctx.fill();
  cizgi(ctx, -r * 0.2, r * 0.02, r * 0.5, -r * 0.4, '#ffffff', 0.6 * eb);
}

esyaCizimiTanimla('igne', (ctx, r, eb) => igne(ctx, r, eb, '#c3cad1', 1.2, r * 0.09));
esyaCizimiTanimla('cuvaldiz', (ctx, r, eb) => igne(ctx, r * 1.1, eb, '#9aa3ac', 2.2, r * 0.15));
esyaCizimiTanimla('altin-igne', (ctx, r, eb) => {
  igne(ctx, r, eb, '#e9b82c', 1.3, r * 0.09);
  cizgi(ctx, r * 0.55, -r * 0.95, r * 0.55, -r * 0.45, '#fff6c8', 0.7 * eb);
  cizgi(ctx, r * 0.3, -r * 0.7, r * 0.8, -r * 0.7, '#fff6c8', 0.7 * eb);
});

/** Kalın çubuk (P→Q, yarı kalınlık w) dörtgeni. */
function cubuk(yol, x1, y1, x2, y2, w) {
  const u = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / u) * w;
  const ny = ((x2 - x1) / u) * w;
  yol.moveTo(x1 + nx, y1 + ny);
  yol.lineTo(x2 + nx, y2 + ny);
  yol.lineTo(x2 - nx, y2 - ny);
  yol.lineTo(x1 - nx, y1 - ny);
  yol.lineTo(x1 + nx, y1 + ny);
}
/** Paslı çivi: bükük gövde (iki çubuk) + yassı baş; çiviler hatta sık olabilir: toplu. */
esyaTopluTanimla('civi', {
  renk: '#a0522d',
  govde(yol, x, y, r, d) {
    const w = r * 0.13 + d;
    cubuk(yol, x - r * 0.55, y - r * 0.6, x + r * 0.12, y + r * 0.07, w);
    cubuk(yol, x + r * 0.08, y + r * 0.03, x + r * 0.45, y + r * 0.75, w);
    kabarcik(yol, x - r * 0.6, y - r * 0.65, r * 0.38 + d, r * 0.2 + d, 0.6967, 0.7174);
  },
  ekler: [cizgiEk('#e07a3a', 0.15, 0.15, 0.27, 0.32, 1.6)],
});

// --- Buluntular: defterle aynı şekiller (yerel uzay yarıçap ~1, ölçeklenir) ---
for (const tur of SEKIL_TURLERI) {
  esyaCizimiTanimla(`buluntu:${tur}`, (ctx, r, eb) => {
    const k = r * 0.92;
    ctx.scale(k, k);
    buluntuSekil(ctx, tur, eb / k);
  });
}

/** Tasarımdaki (esyalar.md §2) tür anahtarları: çizimi burada hazır olanlar. */
export const TASARIM_TURLERI = Object.freeze([
  'saman', 'yas-ot', 'kuru-ot', 'toz', 'kiyim', 'balya-saman', 'balya-ot', 'balya-karisik',
  'curuk-ot', 'igne', 'cuvaldiz', 'altin-igne', 'civi', 'tas',
]);
