/**
 * Makine önizlemesi: makine-sahne.js bölümlerini (traktör, balya makinesi, üfleyici,
 * balyalar, garaj) her durumda büyük ölçekte ızgarada çizer; zemin hücrenin solunda toprak,
 * sağında saman (kontrast için). "Süre ölç": oyun ölçeğinde (z=3.5, 960×640) garaj + üç
 * makinenin kare başına çizim süresi.
 * Adres bayrakları: ?z=10 (yakınlaştırma), ?zaman=ms (sabit zaman; önce 1.5 sn ısınma
 * kareleri oynatılır), ?animasyon=0 (dur), ?olc=1 (açılışta süre ölç).
 */
import { OLCEK } from '../js/cizim.js';
import { BOLUMLER } from './makine-sahne.js';

const adres = new URLSearchParams(location.search);
let z = Number(adres.get('z')) || 6;
const sabit = adres.get('zaman') !== null ? Number(adres.get('zaman')) : null;
const kap = document.getElementById('bolumler');

const sahneler = BOLUMLER.map((b) => {
  const baslik = document.createElement('h2');
  baslik.textContent = b.baslik;
  const tuval = document.createElement('canvas');
  kap.append(baslik, tuval);
  const hucreler = b.hucreler.map((kur, n) => {
    const x = (n % b.sutun) * b.en;
    const y = Math.floor(n / b.sutun) * b.boy;
    return { x, y, ...kur(x + b.en / 2, y + b.boy / 2) };
  });
  return { ...b, tuval, hucreler };
});

function zemin(ctx, s, h) {
  const garaj = s.en > 20;
  ctx.fillStyle = '#684e34';
  ctx.fillRect(h.x * OLCEK, h.y * OLCEK, (garaj ? s.en : s.en / 2) * OLCEK, s.boy * OLCEK);
  if (!garaj) {
    ctx.fillStyle = '#d3b866';
    ctx.fillRect((h.x + s.en / 2) * OLCEK, h.y * OLCEK, s.en * OLCEK / 2, s.boy * OLCEK);
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1 / z;
  ctx.strokeRect(h.x * OLCEK, h.y * OLCEK, s.en * OLCEK, s.boy * OLCEK);
}

/** Bir kare: önce sahneleri oynatır (dt sn), sonra çizer. */
function kare(zaman, dt, etiketli = true) {
  for (const s of sahneler) {
    const satir = Math.ceil(s.hucreler.length / s.sutun);
    const gen = Math.ceil(s.sutun * s.en * OLCEK * z);
    const yuk = Math.ceil(satir * s.boy * OLCEK * z);
    if (s.tuval.width !== gen || s.tuval.height !== yuk) {
      s.tuval.width = gen;
      s.tuval.height = yuk;
    }
    const ctx = s.tuval.getContext('2d');
    ctx.setTransform(z, 0, 0, z, 0, 0);
    for (const h of s.hucreler) {
      h.adim(zaman / 1000, dt);
      zemin(ctx, s, h);
    }
    for (const h of s.hucreler) h.ciz(ctx, zaman);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!etiketli) continue;
    ctx.font = '12px system-ui, sans-serif';
    for (const h of s.hucreler) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      const w = ctx.measureText(h.etiket).width + 8;
      ctx.fillRect((h.x + 0.2) * OLCEK * z, (h.y + 0.2) * OLCEK * z, w, 17);
      ctx.fillStyle = '#fff6dc';
      ctx.fillText(h.etiket, (h.x + 0.2) * OLCEK * z + 4, (h.y + 0.2) * OLCEK * z + 13);
    }
  }
}

/** Sabit zamanlı görüntü: 1.5 sn'lik ısınma karelerinden sonra hedef kare. */
function sabitCiz(hedef) {
  const adimMs = 1000 / 60;
  for (let t = hedef - 1500; t < hedef; t += adimMs) kare(t, adimMs / 1000, false);
  kare(hedef, adimMs / 1000);
}

/** Oyun ölçeğinde (z=3.5, 960×640) garaj sahnesinin kare başına çizim süresi. */
function sureOlc() {
  const tuval = document.createElement('canvas');
  tuval.width = 960;
  tuval.height = 640;
  const ctx = tuval.getContext('2d');
  const garaj = sahneler.at(-1).hucreler[0];
  const g = garaj.durum.garaj;
  const zO = 3.5;
  const kur = () => ctx.setTransform(zO, 0, 0, zO, -(g.x - 34) * OLCEK * zO,
    -(g.y - 23) * OLCEK * zO);
  const N = 400;
  for (let i = 0; i < 30; i++) { kur(); garaj.ciz(ctx, i * 16); }
  const bas = performance.now();
  for (let i = 0; i < N; i++) { kur(); garaj.ciz(ctx, 1000 + i * 16); }
  ctx.getImageData(0, 0, 1, 1);
  const ms = (performance.now() - bas) / N;
  const metin = `garaj + 3 makine + çiftçi + çatı: ${ms.toFixed(3)} ms/kare (z=3.5, ${N} kare)`;
  document.getElementById('olcum').textContent = metin;
  return ms;
}
window.sureOlc = sureOlc;

let onceki = null;
function dongu(zaman) {
  const dt = onceki === null ? 0 : Math.min(0.1, (zaman - onceki) / 1000);
  onceki = zaman;
  kare(zaman, dt);
  if (document.getElementById('anim').checked) requestAnimationFrame(dongu);
}

function baslat() {
  if (sabit !== null || adres.get('animasyon') === '0') {
    document.getElementById('anim').checked = false;
    sabitCiz(sabit ?? 5000);
  } else {
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
    if (!document.getElementById('anim').checked) sabitCiz(sabit ?? 5000);
  });
}
document.getElementById('anim').addEventListener('change', (e) => {
  onceki = null;
  if (e.target.checked) requestAnimationFrame(dongu);
});
document.getElementById('olc').addEventListener('click', sureOlc);
baslat();
if (adres.get('olc') === '1') sureOlc();
