/**
 * Çiftlik parça önizlemesi (H2): kural tanımları olmadan, sahte parça nesneleriyle
 * (ciftlik-onizleme-veri.js) bütün parça çizimlerini gösterir.
 *   A: 19 px karo, her parça 4 yönde (çalışıyor)   B: 56 px karo, 4 durum (yön 0)
 *   C: küçük hat sahnesi 19 px karoda (geniş ekranda 37 px de; bantlarla, oyundaki komşuluk)
 * Zemin hücre hücre saman / toprak (iki zeminde de okunsun). Adres: ?zaman=ms (sabit an),
 * ?bolum=A|B|C (yalnız biri), ?oran=0..1024 (bütün çalışanlara güç oranı), ?ruzgar=0..3
 * (rüzgârın gittiği yön, varsayılan 1 güney), ?siddet=0..3, ?gok=gunes|bulut|yagmur.
 * `window.__olc(n)`: n parçanın hareketli çizim süresi (ms/parça) ve gövde süresi.
 */
import { KARO_PX, parcaCizimi } from '../js/ozellik/ciftlik/gorsel/kayit.js';
import '../js/ozellik/ciftlik/gorsel/temel.js';
import '../js/ozellik/ciftlik/gorsel/toplama.js';
import '../js/ozellik/ciftlik/gorsel/tasima.js';
import '../js/ozellik/ciftlik/gorsel/ayiklama.js';
import '../js/ozellik/ciftlik/gorsel/isleme.js';
import '../js/ozellik/ciftlik/gorsel/depo-kol.js';
import '../js/ozellik/ciftlik/gorsel/enerji.js';
import '../js/ozellik/ciftlik/gorsel/mantik.js';
import { PARCALAR, HALLER } from './ciftlik-onizleme-veri.js';
import { SAHNE } from './ciftlik-onizleme-sahne.js';
import { yay } from '../js/olaylar.js';

const adres = new URLSearchParams(location.search);
const sabitZaman = adres.has('zaman') ? Number(adres.get('zaman')) : null;
const tekBolum = adres.get('bolum');
const oranAyar = adres.has('oran') ? Number(adres.get('oran')) : 1024;
const kap = document.getElementById('bolumler');
yay('hava-degisti', {
  yon: Number(adres.get('ruzgar') ?? 1), siddet: Number(adres.get('siddet') ?? 2),
  gok: adres.get('gok') ?? 'gunes',
});
let sayac = 1;

/** Sahte parça: kural örneğinin (parcaOrnegi) çizimin okuduğu alanları. */
export function sahte(kayit, kx, ky, yon, hal) {
  const [anahtar, boyut, yonlu, ek] = kayit;
  const [ad, durumKodu, oran] = hal;
  const yonu = yonlu ? yon : 0;
  const [en, boy] = yonu & 1 ? [boyut[1], boyut[0]] : boyut;
  const ozelDurum = ek.durum?.(ad);
  const p = {
    id: sayac++, kod: 0, x: kx, y: ky, yon: yonu, en, boy, etkin: true, tikali: false,
    oran: durumKodu === 'calisiyor' ? Math.min(oran, oranAyar) : oran,
    ozel: ek.ozel ? ek.ozel(ad) : {},
  };
  if (ek.bag !== undefined) p.bag = ek.bag;
  const kod = ozelDurum || durumKodu;
  p.tanim = {
    anahtar, boyut, girisler: ek.girisler ?? [], cikislar: ek.cikislar ?? [],
    hat: ek.hat ? { hiz: 18 } : null, durum: () => kod,
  };
  p.adim = ek.adim ? (tik) => ek.adim(p.ozel, tik, ad) : null;
  return p;
}

/** Bölüm: { baslik, karoPx, hucreler: [{ kx, ky, en, boy, zemin, etiket }], parcalar }. */
function bolumKur(baslik, karoPx, satirlar, enCok) {
  const hucreler = [];
  const parcalar = [];
  let x = 0;
  let y = 0;
  let satirBoy = 0;
  for (const { boy: hb, en: he, ekle, etiket } of satirlar) {
    if (x + he > enCok && x > 0) {
      x = 0;
      y += satirBoy + 1;
      satirBoy = 0;
    }
    hucreler.push({ kx: x, ky: y, en: he, boy: hb, zemin: hucreler.length % 2, etiket });
    parcalar.push(...ekle(x, y));
    x += he;
    satirBoy = Math.max(satirBoy, hb);
  }
  const tuval = document.createElement('canvas');
  const h2 = document.createElement('h2');
  h2.textContent = baslik;
  kap.append(h2, tuval);
  return { baslik, karoPx, hucreler, parcalar, tuval, enK: enCok, boyK: y + satirBoy + 1 };
}

const hucreBoyu = (b) => Math.max(3, Math.max(b[0], b[1]) + 2);

function bolumA() {
  const enCok = Math.floor((innerWidth - 40) / 19);
  const satirlar = [];
  for (const k of PARCALAR) {
    for (const yon of k[2] ? [0, 1, 2, 3] : [0]) {
      const n = k[0] === 'yel-degirmeni' ? 5 : hucreBoyu(k[1]);
      satirlar.push({
        en: n, boy: n, etiket: yon ? '' : k[0],
        ekle: (x, y) => {
          const b = yon & 1 ? [k[1][1], k[1][0]] : k[1];
          return [sahte(k, x + Math.floor((n - b[0]) / 2), y + Math.floor((n - b[1]) / 2), yon,
            HALLER[0])];
        },
      });
    }
  }
  return bolumKur('A · 19 px karo, 4 yön (çalışıyor)', 19, satirlar, enCok);
}

function bolumB() {
  const enCok = Math.floor((innerWidth - 40) / 56);
  const satirlar = [];
  for (const k of PARCALAR) {
    for (const hal of HALLER) {
      const n = k[0] === 'yel-degirmeni' ? 5 : hucreBoyu(k[1]);
      satirlar.push({
        en: n, boy: n, etiket: `${k[0]} · ${hal[0]}`,
        ekle: (x, y) => [sahte(k, x + Math.floor((n - k[1][0]) / 2),
          y + Math.floor((n - k[1][1]) / 2), 0, hal)],
      });
    }
  }
  return bolumKur('B · 56 px karo, 4 durum (çalışıyor, duruyor, güçsüz, dolu)', 56, satirlar,
    Math.max(enCok, 5));
}

function bolumC(karoPx) {
  const satirlar = [{
    en: SAHNE.en, boy: SAHNE.boy, etiket: '',
    ekle: (x, y) => SAHNE.parcalar.map(([ad, kx, ky, yon, ozel]) => {
      const k = ad === 'bant'
        ? ['bant', [1, 1], true, { hat: true }] : PARCALAR.find((q) => q[0] === ad);
      const p = sahte(k, x + kx, y + ky, yon, HALLER[0]);
      if (ozel) Object.assign(p.ozel, ozel);
      return p;
    }),
  }];
  return bolumKur(`C · hat sahnesi, ${karoPx} px karo`, karoPx, satirlar, SAHNE.en);
}

const bolumler = [];
if (!tekBolum || tekBolum === 'A') bolumler.push(bolumA());
if (!tekBolum || tekBolum === 'B') bolumler.push(bolumB());
if (!tekBolum || tekBolum === 'C') {
  bolumler.push(bolumC(19));
  if (innerWidth >= SAHNE.en * 37 + 40) bolumler.push(bolumC(37));
}

function zeminCiz(ctx, h) {
  ctx.fillStyle = h.zemin ? '#684e34' : '#c9a957';
  ctx.fillRect(h.kx * KARO_PX, h.ky * KARO_PX, h.en * KARO_PX, h.boy * KARO_PX);
  ctx.fillStyle = h.zemin ? 'rgba(211, 184, 102, 0.25)' : 'rgba(104, 78, 52, 0.18)';
  for (let i = 0; i < h.en * h.boy; i += 3) {
    const x = h.kx + ((i * 7) % h.en) + 0.3;
    const y = h.ky + ((i * 3) % h.boy) + 0.6;
    ctx.fillRect(x * KARO_PX, y * KARO_PX, 3, 1);
  }
}

function ciz(b, zaman) {
  const dpr = devicePixelRatio || 1;
  const s = b.karoPx / KARO_PX;
  const gen = Math.ceil(b.enK * b.karoPx);
  const yuk = Math.ceil(b.boyK * b.karoPx);
  if (b.tuval.width !== gen * dpr) {
    b.tuval.width = gen * dpr;
    b.tuval.height = yuk * dpr;
    b.tuval.style.width = `${gen}px`;
    b.tuval.style.height = `${yuk}px`;
  }
  const ctx = b.tuval.getContext('2d');
  ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(0, 0, gen / s, yuk / s);
  const eb = 1 / s;
  for (const h of b.hucreler) zeminCiz(ctx, h);
  const tik = Math.floor(zaman / 50);
  const an = { zaman, tik, alfa: (zaman % 50) / 50, faz: 0 };
  for (const p of b.parcalar) parcaCizimi(p.tanim.anahtar).govde(ctx, p, eb);
  for (const p of b.parcalar) {
    p.adim?.(tik);
    const h = parcaCizimi(p.tanim.anahtar).hareketli;
    an.faz = p.tanim.hat ? ((tik + an.alfa) * 18 / 240) * KARO_PX : 0;
    if (h) h(ctx, p, an, eb);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#f4e9d0';
  for (const h of b.hucreler) {
    if (h.etiket) ctx.fillText(h.etiket, h.kx * b.karoPx + 3, (h.ky + h.boy) * b.karoPx + 12);
  }
}

function kare(zaman) {
  for (const b of bolumler) ciz(b, zaman);
  if (sabitZaman === null && document.getElementById('anim').checked) requestAnimationFrame(kare);
}

/**
 * Hareketli çizim süresi (ms/parça): her parça türünden `adet` kopya 19 px ölçekte, tür tür
 * blok halinde `tekrar` kare. `kayit`: ana iş parçacığının çizim çağrıları (oyundaki
 * ciftlikOlcum gibi; tuval blok dışında boşaltılır). `raster`: her kare getImageData ile
 * boşaltılarak (yazılım raster dahil; GPU'suz başsız tarayıcıda kötümser üst sınır).
 */
window.__olc = (adet = 40, tekrar = 40) => {
  const tuval = document.createElement('canvas');
  tuval.width = 1280;
  tuval.height = 800;
  const ctx = tuval.getContext('2d');
  const s = 19 / KARO_PX;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const an = { zaman: 0, tik: 0, alfa: 0, faz: 3 };
  const sonuc = { kayit: {}, raster: {} };
  const b0 = performance.now();
  for (let t = 0; t < tekrar; t++) ctx.getImageData(0, 0, 1, 1);
  const bos = (performance.now() - b0) / tekrar;
  let toplam = 0;
  let govde = 0;
  for (const k of PARCALAR) {
    const liste = [];
    for (let i = 0; i < adet; i++) {
      liste.push(sahte(k, (i * 5) % 60, Math.floor(i / 12) * 5, i & 3, HALLER[0]));
    }
    const { govde: g, hareketli: h } = parcaCizimi(k[0]);
    for (const bosalt of [false, true]) {
      ctx.getImageData(0, 0, 1, 1);
      const bas = performance.now();
      for (let t = 0; t < tekrar; t++) {
        an.zaman = t * 16;
        for (const p of liste) h?.(ctx, p, an, 1 / s);
        if (bosalt) ctx.getImageData(0, 0, 1, 1);
      }
      const sure = performance.now() - bas - (bosalt ? tekrar * bos : 0);
      sonuc[bosalt ? 'raster' : 'kayit'][k[0]] = +(sure / (tekrar * adet)).toFixed(4);
      if (!bosalt) toplam += sure;
    }
    const bas = performance.now();
    for (const p of liste) g(ctx, p, 1 / s);
    govde += performance.now() - bas;
  }
  ctx.getImageData(0, 0, 1, 1);
  const n = tekrar * adet * PARCALAR.length;
  return {
    kayitMs: +(toplam / n).toFixed(4),
    enCokKayit: Math.max(...Object.values(sonuc.kayit)),
    govdeMs: +(govde / (adet * PARCALAR.length)).toFixed(4), ...sonuc,
  };
};

document.getElementById('olc').addEventListener('click', () => {
  document.getElementById('olcum').textContent = JSON.stringify(window.__olc(), null, 1);
});
if (sabitZaman !== null) {
  for (let t = Math.max(0, sabitZaman - 1500); t < sabitZaman; t += 16) {
    for (const b of bolumler) ciz(b, t);
  }
  kare(sabitZaman);
  window.__hazir = true;
} else {
  requestAnimationFrame(kare);
  window.__hazir = true;
}
