/**
 * Gez ve sil kipleri (docs/ciftlik/arayuz.md §1, §5, §6): gezde parçaya tık/dokunuş inceleme
 * panelini açar (araç çalışmaz; boş tarla normal mod gibi), aynı parçaya çift dokunuş
 * pipettir (ilk dokunuş paneli gecikmesiz açar), palet açıkken sağ tık söker. Sil kipinde
 * dokun / tık söker, sürükleme yolundaki bütün parçalar bırakınca tek adımda sökülür
 * (içinde eşya varsa onay kâğıdı). Orta tık (sürüklemesiz) pipettir; orta sürükleme
 * kameranındır. Kısayol kancaları: Q pipet, Delete incelenen ya da imleçteki parçayı söker,
 * C / Home çiftçiye dön.
 */
import { durumAl } from '../../oyun.js';
import { dinle } from '../../olaylar.js';
import { girdiOnleyiciEkle } from '../../girdi.js';
import { parcaAt } from '../../kural/ciftlik/izgara.js';
import { insa, kipTanimla, karoBul, pipetAl, ciftlikte } from './insa.js';
import { tusKancalariKur } from './kisayol.js';
import { kenarIzle, kenarBirak, ciftciyeDon } from './insa-kamera.js';
import { sokIste } from './baloncuk.js';
import { SURUKLE_PX } from './hat-cek.js';
import { panelAc, panelKapat } from './panel.js';

const CIFT_DOKUNUS_MS = 350;
const tuval = document.getElementById('tarla');
const d = () => durumAl();
const uzaklik = (e, b) => Math.hypot(e.clientX - b.x, e.clientY - b.y);

/** Sil kipi: yol boyunca dokunulan parçalar toplanır, bırakınca tek adımda sökülür. */
function silTopla(b, karo) {
  const adim = Math.max(Math.abs(karo.kx - b.son.kx), Math.abs(karo.ky - b.son.ky), 1);
  for (let i = 0; i <= adim; i++) {
    const kx = Math.round(b.son.kx + ((karo.kx - b.son.kx) * i) / adim);
    const ky = Math.round(b.son.ky + ((karo.ky - b.son.ky) * i) / adim);
    const p = parcaAt(d().ciftlik, kx, ky);
    if (p) b.idler.add(p.id);
  }
  b.son = { kx: karo.kx, ky: karo.ky };
  insa.silinecek = b.idler;
}

const sil = {
  iptal() {
    insa.silinecek = null;
    kenarBirak();
  },
  bas(e, karo) {
    if (e.button !== 0 && e.button !== 2) return false;
    insa.basili = { id: e.pointerId, son: karo, idler: new Set() };
    silTopla(insa.basili, karo);
    tuval.setPointerCapture?.(e.pointerId);
    return true;
  },
  tasi(e, karo) {
    const b = insa.basili;
    insa.hayalet = karo;
    if (!b || b.id !== e.pointerId) return false;
    silTopla(b, karo);
    kenarIzle(e, (s) => insa.basili === b && sil.tasi(s, karoBul(s)));
    return true;
  },
  bitir(e) {
    const b = insa.basili;
    if (!b || b.id !== e.pointerId) return false;
    insa.basili = null;
    kenarBirak();
    const c = d().ciftlik;
    const parcalar = [...b.idler].map((id) => c.parcalar.get(id)).filter(Boolean);
    insa.silinecek = null;
    if (e.type !== 'pointercancel') sokIste(parcalar);
    if (e.pointerType === 'touch') insa.hayalet = null;
    return true;
  },
};

let sonDokunus = null;
const gez = {
  bas(e, karo) {
    const p = parcaAt(d().ciftlik, karo.kx, karo.ky);
    if (e.button === 2 && p && insa.acik) {
      sokIste([p]);
      return true;
    }
    if (e.button !== 0 || !p) return false;
    insa.basili = { id: e.pointerId, x: e.clientX, y: e.clientY, parca: p.id };
    return true;
  },
  tasi(e, karo) {
    const b = insa.basili;
    if (!b) tuval.classList.toggle('ciftlik-parca-ustu', Boolean(parcaAt(d().ciftlik, karo.kx,
      karo.ky)));
    if (!b || b.id !== e.pointerId) return false;
    if (uzaklik(e, b) >= SURUKLE_PX) b.kaydi = true;
    return true;
  },
  bitir(e) {
    const b = insa.basili;
    if (!b || b.id !== e.pointerId) return false;
    insa.basili = null;
    const p = d().ciftlik.parcalar.get(b.parca);
    if (b.kaydi || e.type === 'pointercancel' || !p) return true;
    const simdi = performance.now();
    if (sonDokunus?.id === p.id && simdi - sonDokunus.zaman < CIFT_DOKUNUS_MS) {
      sonDokunus = null;
      panelKapat();
      pipetAl(p);
      return true;
    }
    sonDokunus = { id: p.id, zaman: simdi };
    panelAc(p);
    return true;
  },
};

kipTanimla('gez', gez);
kipTanimla('sil', sil);

// Orta tık (sürüklemesiz) pipettir; orta sürükleme kameranın (kamera.js tüketir).
let orta = null;
girdiOnleyiciEkle((tur, e) => {
  if (!ciftlikte() || e.button !== 1 || e.pointerType === 'touch') return false;
  if (tur === 'bas') orta = { id: e.pointerId, x: e.clientX, y: e.clientY };
  else if (tur === 'bitir' && orta?.id === e.pointerId) {
    if (uzaklik(e, orta) < 6) {
      const k = karoBul(e);
      pipetAl(parcaAt(d().ciftlik, k.kx, k.ky));
    }
    orta = null;
  }
  return false;
});

tusKancalariKur({
  pipet: (karo) => karo && pipetAl(parcaAt(d().ciftlik, karo.kx, karo.ky)),
  sok: (karo) => {
    const c = d().ciftlik;
    const p = insa.incelenen !== null ? c.parcalar.get(insa.incelenen)
      : karo && parcaAt(c, karo.kx, karo.ky);
    if (p) sokIste([p]);
  },
  ciftci: ciftciyeDon,
});

dinle('oyun-basladi', () => {
  sonDokunus = null;
  tuval.classList.remove('ciftlik-parca-ustu');
});
