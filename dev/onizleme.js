/**
 * Önizleme: onizleme-bolum.js'teki bölümleri ızgarada çizer (oyun ölçeği şeritleri sabit
 * yakınlaştırmada ve saman dokulu zeminde) ve karakterCiz'in kare başına süresini ölçer.
 * Adres bayrakları: ?z=3 (yakınlaştırma), ?animasyon=0 (dur), ?zaman=ms (sabit zaman).
 */
import { OLCEK } from '../js/cizim.js';
import { karakterCiz } from '../js/ozellik/gorsel/karakter-cizim.js';
import { OYUN_Z, bolumler, k } from './onizleme-bolum.js';

const adres = new URLSearchParams(location.search);
let z = Number(adres.get('z')) || 3;
const sabit = adres.get('zaman') !== null ? Number(adres.get('zaman')) : null;

const BOLUMLER = bolumler();
const kap = document.getElementById('bolumler');
const tuvaller = BOLUMLER.map((b) => {
  const baslik = document.createElement('h2');
  baslik.textContent = b.baslik;
  const tuval = document.createElement('canvas');
  kap.append(baslik, tuval);
  return tuval;
});

/** Saman dokusu deseni (deterministik çizgiler), bir kez üretilir. */
function samanDeseni(ctx) {
  const d = document.createElement('canvas');
  d.width = d.height = 128;
  const c = d.getContext('2d');
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  c.fillStyle = '#cfae55';
  c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 700; i++) {
    const x = r() * 128;
    const y = r() * 128;
    const a = r() * 6.28;
    const l = 3 + r() * 7;
    c.strokeStyle = r() < 0.5 ? 'rgba(120, 80, 20, 0.35)' : 'rgba(255, 236, 160, 0.45)';
    c.lineWidth = 1 + r();
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
  return ctx.createPattern(d, 'repeat');
}

function zemin(ctx, b, x, y, oz) {
  const [px, py, w, h] = [x * OLCEK, y * OLCEK, b.en * OLCEK, b.boy * OLCEK];
  if (b.zemin === 'saman') {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = samanDeseni(ctx);
    ctx.fillRect(px * oz, py * oz, w * oz, h * oz);
    ctx.restore();
  } else {
    ctx.fillStyle = '#684e34';
    ctx.fillRect(px, py, w / 2, h);
    ctx.fillStyle = '#d3b866';
    ctx.fillRect(px + w / 2, py, w / 2, h);
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1 / oz;
  ctx.strokeRect(px, py, w, h);
}

function ciz(zaman) {
  BOLUMLER.forEach((b, i) => {
    const tuval = tuvaller[i];
    const oz = b.z ?? z;
    const satir = Math.ceil(b.hucreler.length / b.sutun);
    const gen = Math.ceil(b.sutun * b.en * OLCEK * oz);
    const yuk = Math.ceil(satir * b.boy * OLCEK * oz);
    if (tuval.width !== gen || tuval.height !== yuk) {
      tuval.width = gen;
      tuval.height = yuk;
    }
    const ctx = tuval.getContext('2d');
    ctx.setTransform(oz, 0, 0, oz, 0, 0);
    b.hucreler.forEach((h, n) => {
      const x = (n % b.sutun) * b.en;
      const y = Math.floor(n / b.sutun) * b.boy;
      zemin(ctx, b, x, y, oz);
      h.ciz(ctx, zaman, x + b.en / 2, y + b.boy / 2);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '10px system-ui, sans-serif';
    b.hucreler.forEach((h, n) => {
      if (h.etiket && !b.z) {
        ctx.fillText(h.etiket, ((n % b.sutun) * b.en + 0.3) * OLCEK * oz,
          (Math.floor(n / b.sutun) * b.boy + 0.9) * OLCEK * oz);
      }
    });
  });
}

/** karakterCiz ortalama süresi (ms): oyun ölçeğinde, her araç ve yürüme karışık 1000 çağrı. */
function olc() {
  const tv = document.createElement('canvas');
  tv.width = tv.height = 200;
  const c = tv.getContext('2d');
  c.setTransform(OYUN_Z, 0, 0, OYUN_Z, 0, 0);
  const araclar = ['el', 'tirmik', 'dedektor', 'miknatis'];
  const kayit = (i) => k(i * 0.01, { x: 6, y: 6, hareketli: i % 2 === 0, adimFaz: (i % 50) / 50,
    kullaniyor: i % 3 === 0 });
  for (let i = 0; i < 200; i++) karakterCiz(c, kayit(i), i * 16, araclar[i % 4]);
  const bas = performance.now();
  for (let i = 0; i < 1000; i++) karakterCiz(c, kayit(i), i * 16, araclar[i % 4]);
  const ms = (performance.now() - bas) / 1000;
  document.getElementById('olcum').textContent = `karakterCiz: ${ms.toFixed(4)} ms / çağrı`;
  console.log(`karakterCiz ortalama ${ms.toFixed(4)} ms`);
}

function dongu(zaman) {
  ciz(sabit ?? zaman);
  const canli = adres.get('animasyon') !== '0' && document.getElementById('anim').checked;
  if (canli && sabit === null) {
    requestAnimationFrame(dongu);
  }
}

for (const d of document.querySelectorAll('button[data-z]')) {
  d.classList.toggle('secili', Number(d.dataset.z) === z);
  d.addEventListener('click', () => {
    z = Number(d.dataset.z);
    for (const o of document.querySelectorAll('button[data-z]')) {
      o.classList.toggle('secili', o === d);
    }
    ciz(sabit ?? performance.now());
  });
}
document.getElementById('anim').addEventListener('change', () => requestAnimationFrame(dongu));
document.getElementById('olc').addEventListener('click', olc);
requestAnimationFrame(dongu);
if (adres.get('olcum') === '1') setTimeout(olc, 300);
