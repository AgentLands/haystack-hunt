/**
 * Seç / yapıştır kipinin girdisi: işaretçi (fare, tek parmak sürükleme; ikinci parmak gelince
 * bekleyen eylem iptal, iki parmak kamera.js'te kalır), klavye (V, Ctrl+C, Ctrl+V, R, T, Enter,
 * Delete, Q pipet), Esc ve inşa/mod olayları. Durum ve eylemler secim.js'te.
 * Kip kapalıyken hiçbir olayı tüketmez (inşa kipi ve normal mod etkilenmez).
 */
import { girdiOnleyiciEkle, hucreBul } from '../../girdi.js';
import { durumAl } from '../../oyun.js';
import { dinle } from '../../olaylar.js';
import { escOnleyiciEkle } from '../menu-kanca.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { kumeAlKonumlu, ortakAyar } from '../../kural/ciftlik/izgara/kume.js';
import { insaDinle } from './insa.js';
import {
  secim, degisti, ciftlikte, kipKapat, denetimYenile, kopyala, alaniSok,
  yapistirBaslat, yapistirDondur, yapistirAynala, yapistirOnayla, pipetAl, pipetAyari,
} from './secim.js';

const tuval = document.getElementById('tarla');
const parmaklar = new Set();
let surukle = null;

function karoBul(e) {
  const h = hucreBul(tuval, e);
  return { kx: Math.floor(h.x / KARO), ky: Math.floor(h.y / KARO) };
}

function bas(e) {
  if (e.pointerType === 'touch') parmaklar.add(e.pointerId);
  if (!secim.kip || !ciftlikte() || e.button > 0) return false;
  if (parmaklar.size > 1) {
    surukle = null;
    return false;
  }
  const karo = karoBul(e);
  secim.sonKaro = karo;
  if (secim.kip === 'yapistir') {
    secim.hayalet = karo;
    denetimYenile();
  } else {
    surukle = { id: e.pointerId };
    Object.assign(secim, {
      alan: { xa: karo.kx, ya: karo.ky, xb: karo.kx, yb: karo.ky }, secilen: null,
      uyari: '', sokOnay: false,
    });
    degisti();
  }
  tuval.setPointerCapture(e.pointerId);
  return true;
}

function tasi(e) {
  const karo = karoBul(e);
  if (e.pointerType !== 'touch') secim.sonKaro = karo;
  if (!secim.kip) return false;
  if (secim.kip === 'yapistir') {
    if (e.pointerType !== 'touch' || e.buttons) {
      secim.hayalet = karo;
      denetimYenile();
    }
  } else if (surukle && surukle.id === e.pointerId) {
    Object.assign(secim.alan, { xb: karo.kx, yb: karo.ky });
    degisti();
  }
  return true;
}

function bitir(e) {
  if (e.pointerType === 'touch') parmaklar.delete(e.pointerId);
  if (!secim.kip) return false;
  if (secim.kip === 'sec' && surukle && surukle.id === e.pointerId) {
    surukle = null;
    const d = durumAl();
    const a = secim.alan;
    if (e.type === 'pointercancel' || !d || !a) return true;
    secim.secilen = kumeAlKonumlu(d.ciftlik, a.xa, a.ya, a.xb, a.yb);
    secim.uyari = secim.secilen ? '' : 'Seçilen alanda parça yok';
    degisti();
  }
  return true;
}

girdiOnleyiciEkle((tur, e) => (tur === 'bas' ? bas(e) : tur === 'tasi' ? tasi(e) : bitir(e)));

function tusBasildi(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.code === 'KeyC' && secim.kip === 'sec' && secim.secilen) {
      e.preventDefault();
      kopyala();
    } else if (e.code === 'KeyV' && secim.pano) {
      e.preventDefault();
      yapistirBaslat(secim.pano);
    }
    return;
  }
  if (e.repeat) return;
  // V (seç kipi) ve Q (pipet) inşa kısayollarındadır (kisayol.js; I1 'sec' kipi düğmesi)
  if (secim.kip === 'yapistir') {
    if (e.code === 'KeyR') yapistirDondur(e.shiftKey ? 3 : 1);
    else if (e.code === 'KeyT') yapistirAynala();
    else if (e.code === 'Enter') yapistirOnayla();
  } else if (secim.kip === 'sec' && (e.code === 'Delete' || e.code === 'Backspace')) alaniSok();
}

document.addEventListener('keydown', (e) => {
  const hedef = e.target;
  if (!ciftlikte() || e.altKey) return;
  if (hedef.closest && hedef.closest('input, textarea, select, dialog')) return;
  tusBasildi(e);
});

escOnleyiciEkle(() => {
  if (!secim.kip) return false;
  if (secim.kip === 'sec' && (secim.alan || secim.secilen)) {
    Object.assign(secim, { alan: null, secilen: null, uyari: '', sokOnay: false });
    degisti();
  } else kipKapat();
  return true;
});

// İnşa paletinde başka kip seçilince bu kip kapanır; kur kipinden çıkılınca pipet unutulur.
insaDinle((d) => {
  if (d.acik && secim.kip && d.kip !== 'sec') kipKapat();
  if (!d.secili) pipetAl(null);
});

dinle('oyun-basladi', ({ durum }) => {
  if (durum.mod !== 'ciftlik') kipKapat();
});
for (const ad of ['yapistirildi', 'alan-sokuldu', 'parca-kuruldu', 'parca-sokuldu']) {
  dinle(ad, () => denetimYenile());
}

// Kurulan parçaya pipetin ORTAK ayar anahtarları (tür farklıysa yalnız ortak olanlar).
dinle('parca-kuruldu', ({ parca: p }) => {
  const d = durumAl();
  const ayar = pipetAyari();
  if (!ayar || !d || secim.kip) return;
  const ortak = ortakAyar(ayar, p.tanim);
  if (!Object.keys(ortak).length) return;
  komutEkle(d.ciftlik, { tur: 'ayarTasi', x: p.x, y: p.y, ayar: ortak });
});

// Kuruş değişince (ekonomi bağlanınca) sayaç tazelensin.
setInterval(() => {
  if (secim.kip === 'yapistir') denetimYenile();
}, 500);
