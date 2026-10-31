/**
 * Oyun döngüsü: durum, fare/dokunma/klavye girdisi, araç kullanımı, süre, güneş
 * parıltısı ve iğne bulununca bitiş ekranı.
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';
import { tarlaKur, cokert } from './tarla.js';
import { igneDerinligi } from './igne.js';
import {
  elIleAl, tirmikla, dedektorOku, igneyiAlabilirMi,
  DEDEKTOR_HAKKI, EL_YARICAP, TIRMIK_YARICAP,
} from './araclar.js';
import { cizici } from './cizim.js';
import { metindenTohum, gununEtiketi } from './rastgele.js';

const PARILTI_ARALIK = 12000;
const PARILTI_SURE = 800;
const PARILTI_DERINLIK = 8;
const YARICAP = { el: EL_YARICAP, tirmik: TIRMIK_YARICAP, dedektor: 1.5 };

const $ = (id) => document.getElementById(id);
const tuval = $('tarla');
const ciz = cizici(tuval);
const sayi = new Intl.NumberFormat('tr-TR');
let durum;

function yeniOyun(etiket) {
  durum = {
    etiket,
    tarla: tarlaKur(metindenTohum(etiket)),
    arac: durum ? durum.arac : 'el',
    aracYaricap: YARICAP[durum ? durum.arac : 'el'],
    basili: false, imlec: null, son: null,
    halkalar: [], dedektor: DEDEKTOR_HAKKI,
    baslangic: null, bitis: null, bitti: false, goster: false,
    parilti: null, sonrakiParilti: Infinity,
  };
  const adres = new URL(location.href);
  adres.searchParams.set('tohum', etiket);
  history.replaceState(null, '', adres);
  $('etiket').textContent = etiket === gununEtiketi() ? `Günün tarlası (${etiket})` : etiket;
  $('bitis').close();
  $('paylas').textContent = 'Sonucu kopyala';
  aracSec(durum.arac);
}

function aracSec(arac) {
  durum.arac = arac;
  durum.aracYaricap = YARICAP[arac];
  for (const d of document.querySelectorAll('[data-arac]')) {
    d.setAttribute('aria-pressed', String(d.dataset.arac === arac));
  }
  $('dedektor-hak').textContent = durum.dedektor;
}

function hucre(e) {
  const k = tuval.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - k.left) / k.width) * GENISLIK),
    y: Math.floor(((e.clientY - k.top) / k.height) * YUKSEKLIK),
  };
}

function baslat(zaman) {
  if (durum.baslangic !== null) return;
  durum.baslangic = zaman;
  durum.sonrakiParilti = zaman + PARILTI_ARALIK;
}

tuval.addEventListener('pointerdown', (e) => {
  if (durum.bitti) return;
  tuval.setPointerCapture(e.pointerId);
  const p = hucre(e);
  Object.assign(durum, { basili: true, imlec: p, son: p });
  baslat(performance.now());
  if (durum.arac === 'dedektor' && durum.dedektor > 0) {
    durum.dedektor -= 1;
    $('dedektor-hak').textContent = durum.dedektor;
    durum.halkalar.push({ ...p, seviye: dedektorOku(durum.tarla, p.x, p.y), zaman: performance.now() });
  }
});

tuval.addEventListener('pointermove', (e) => {
  const p = hucre(e);
  durum.imlec = p;
  if (!durum.basili || durum.bitti || durum.arac !== 'tirmik') return;
  const dx = p.x - durum.son.x;
  const dy = p.y - durum.son.y;
  if (Math.hypot(dx, dy) >= 1.5) {
    tirmikla(durum.tarla, p.x, p.y, dx, dy);
    durum.son = p;
  }
});

for (const olay of ['pointerup', 'pointercancel']) {
  tuval.addEventListener(olay, () => { durum.basili = false; });
}
tuval.addEventListener('pointerleave', () => { if (!durum.basili) durum.imlec = null; });

function kazan(zaman) {
  durum.bitti = true;
  durum.basili = false;
  durum.bitis = zaman;
  const sure = sureMetni(zaman - durum.baslangic);
  const kullanilan = DEDEKTOR_HAKKI - durum.dedektor;
  $('sonuc').textContent = `${sure} sürede, ${sayi.format(durum.tarla.kaldirilan)} saman `
    + `kaldırarak ve ${kullanilan}/${DEDEKTOR_HAKKI} dedektörle buldun.`;
  durum.paylas = `Haystack Hunt · ${durum.etiket}\n🪡 ${sure} · `
    + `${sayi.format(durum.tarla.kaldirilan)} saman · 📡 ${kullanilan}/${DEDEKTOR_HAKKI}`;
  $('bitis').showModal();
}

function sureMetni(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function kare(zaman) {
  const { tarla } = durum;
  if (durum.basili && !durum.bitti && durum.arac === 'el' && durum.imlec) {
    if (igneyiAlabilirMi(tarla, durum.imlec.x, durum.imlec.y)) kazan(zaman);
    else elIleAl(tarla, durum.imlec.x, durum.imlec.y);
  }
  if (cokert(tarla)) cokert(tarla);
  if (!durum.bitti && zaman >= durum.sonrakiParilti) {
    if (igneDerinligi(tarla) <= PARILTI_DERINLIK) {
      durum.parilti = { bitis: zaman + PARILTI_SURE, sure: PARILTI_SURE };
    }
    durum.sonrakiParilti = zaman + PARILTI_ARALIK;
  }
  ciz(durum, zaman);
  const gecen = durum.baslangic === null ? 0 : (durum.bitis ?? zaman) - durum.baslangic;
  $('sure').textContent = sureMetni(gecen);
  $('kaldirilan').textContent = sayi.format(tarla.kaldirilan);
  requestAnimationFrame(kare);
}

function rastgeleEtiket() {
  const dizi = new Uint32Array(1);
  crypto.getRandomValues(dizi);
  return dizi[0].toString(36).slice(0, 6);
}

for (const d of document.querySelectorAll('[data-arac]')) {
  d.addEventListener('click', () => aracSec(d.dataset.arac));
}
document.addEventListener('keydown', (e) => {
  const arac = { 1: 'el', 2: 'tirmik', 3: 'dedektor' }[e.key];
  if (arac && !durum.bitti) aracSec(arac);
});
$('yeni').addEventListener('click', () => yeniOyun(rastgeleEtiket()));
$('gunun').addEventListener('click', () => yeniOyun(gununEtiketi()));
$('tekrar').addEventListener('click', () => yeniOyun(rastgeleEtiket()));
$('pes').addEventListener('click', () => {
  if (durum.bitti) return;
  durum.goster = true;
  durum.bitti = true;
  durum.bitis = durum.baslangic === null ? null : performance.now();
});
$('paylas').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(durum.paylas);
    $('paylas').textContent = 'Kopyalandı';
  } catch {
    $('paylas').textContent = 'Kopyalanamadı';
  }
});

yeniOyun(new URLSearchParams(location.search).get('tohum') || gununEtiketi());
requestAnimationFrame(kare);
