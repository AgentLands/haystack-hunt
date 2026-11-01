/**
 * Kulak (sıcak-soğuk ses ipucu): el ya da bir makine kazarken kazılan nokta iğneye
 * yaklaştıkça (kural/sinyal.js basamakları) kısa metal tınılar duyulur; yaklaştıkça sıklaşır
 * ve incelir (kulak-desen.js). Her tıkta (ses açık ya da kapalı) kazı noktasında küçük bir
 * nabız halkası açılır; basamak yükseldikçe daha belirgin. Ses kapalıysa (ya da henüz
 * açılmadıysa) ayrıca ara sıra çok hafif bir metal pırıltı görünür. Sade harekette halka
 * büyümez, yalnız söner. Yalnız olay dinler ve üst katman çizer.
 */
import { dinle } from '../olaylar.js';
import { katmanEkle, OLCEK } from '../cizim.js';
import { durumAl } from '../oyun.js';
import { gorunum } from '../gorunum.js';
import { kulakBasamagi } from '../kural/sinyal.js';
import { makineTanimi } from '../kural/makineler/kayit.js';
import { kulakDeseni, tikZamani } from './kulak-desen.js';
import { sapmali } from './ses-seviye.js';
import * as motor from './ses-motor.js';
import { sadeHareket } from './sade-hareket.js';

const PIRILTI_SURE = 520;
const HALKA_SURE = 620;
/** Kazı olayları arasında bu kadar boşluk olursa basamak sıfırlanır (ms). */
const SESSIZLIK_MS = 500;

let sonTik = -Infinity;
let aralikCarpani = 1; // her tıktan sonra yeniden çekilir: tıklar metronom gibi olmaz
let sonBasamak = 0;
let sonOlay = -Infinity;
const piriltilar = [];
const halkalar = [];

/** Metal tını: her tık hafifçe farklı perde ve düzeyde (makineli tüfek olmasın). */
function tini(desen) {
  const f = sapmali(desen.frekans, 0.035);
  const d = desen.duzey * sapmali(1, 0.18);
  motor.nota({ frekans: f, sure: sapmali(0.09, 0.15), duzey: d, atak: 0.002,
    bitisFrekans: f * 0.97 });
  motor.nota({ frekans: f * 2.71, sure: 0.05, duzey: d * 0.35, atak: 0.002 });
}

function kazildi(x, y, yaricap) {
  const durum = durumAl();
  if (!durum || durum.bitti) return;
  const simdi = performance.now();
  if (simdi - sonOlay > SESSIZLIK_MS) sonBasamak = 0;
  sonOlay = simdi;
  const basamak = kulakBasamagi(durum.tarla, x, y);
  const desen = kulakDeseni(basamak);
  const tik = tikZamani(basamak, sonBasamak, simdi, sonTik, aralikCarpani);
  sonBasamak = basamak;
  if (!tik) return;
  sonTik = simdi;
  aralikCarpani = sapmali(1, 0.2);
  halkalar.push({ x, y, basamak, bas: simdi });
  if (halkalar.length > 6) halkalar.shift();
  if (motor.hazirMi()) {
    tini(desen);
    return;
  }
  if (Math.random() >= desen.pirilti) return;
  const aci = Math.random() * Math.PI * 2;
  const r = Math.random() * yaricap;
  piriltilar.push({ x: x + Math.cos(aci) * r, y: y + Math.sin(aci) * r, bas: simdi });
}

dinle('kazildi', ({ x, y }) => kazildi(x, y, 2));
dinle('makine-calisti', ({ makine }) => {
  const t = makineTanimi(makine.tur);
  const p = t.isNoktasi(makine);
  kazildi(p.x, p.y, t.isYaricap);
});
dinle('oyun-basladi', () => {
  piriltilar.length = 0;
  halkalar.length = 0;
  sonBasamak = 0;
});

/** Kazı noktasında nabız halkaları: büyüyerek (sade harekette sabit) söner. */
function halkalariCiz(ctx, simdi, k) {
  const sade = sadeHareket();
  for (let i = halkalar.length - 1; i >= 0; i--) {
    const h = halkalar[i];
    const t = (simdi - h.bas) / HALKA_SURE;
    if (t >= 1) {
      halkalar.splice(i, 1);
      continue;
    }
    const buyume = sade ? 0.6 : 1 - (1 - t) ** 2;
    // El imlecinin (2.5 hücre) dışına taşar ki onunla karışmasın.
    const r = (3 + (1.5 + 0.8 * h.basamak) * buyume) * OLCEK;
    const kalin = (1.4 + 0.4 * h.basamak) * k;
    ctx.globalAlpha = (0.45 + 0.15 * h.basamak) * (1 - t * t);
    ctx.beginPath();
    ctx.arc((h.x + 0.5) * OLCEK, (h.y + 0.5) * OLCEK, r, 0, Math.PI * 2);
    // Koyu alt çizgi + açık metal çizgi: hem samanda hem toprakta seçilir.
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.45)';
    ctx.lineWidth = kalin + 2 * k;
    ctx.stroke();
    ctx.strokeStyle = '#e4eeff';
    ctx.lineWidth = kalin;
    ctx.stroke();
  }
}

katmanEkle((ctx) => {
  if (!piriltilar.length && !halkalar.length) return;
  const simdi = performance.now();
  const k = 1 / gorunum.z;
  ctx.save();
  halkalariCiz(ctx, simdi, k);
  ctx.lineCap = 'round';
  for (let i = piriltilar.length - 1; i >= 0; i--) {
    const p = piriltilar[i];
    const t = (simdi - p.bas) / PIRILTI_SURE;
    if (t >= 1) {
      piriltilar.splice(i, 1);
      continue;
    }
    const boy = (2 + 4 * Math.sin(t * Math.PI)) * k;
    ctx.globalAlpha = 0.55 * Math.sin(t * Math.PI);
    ctx.strokeStyle = '#eef4ff';
    ctx.lineWidth = 1.2 * k;
    const px = (p.x + 0.5) * OLCEK;
    const py = (p.y + 0.5) * OLCEK;
    ctx.beginPath();
    ctx.moveTo(px - boy, py);
    ctx.lineTo(px + boy, py);
    ctx.moveTo(px, py - boy);
    ctx.lineTo(px, py + boy);
    ctx.stroke();
  }
  ctx.restore();
}, 'ust');
