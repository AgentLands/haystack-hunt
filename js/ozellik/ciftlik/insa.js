/**
 * Çiftlikte inşa kipi (temel; arayüz ajanı genişletecek). B (ya da paletteki "İnşa") paleti
 * açar; parça seçiliyken tuvalde: masaüstünde imleç hayaleti izler, sol tık kurar, R döndürür
 * (Shift+R ters), banda basılı sürükleme L biçimli yol çeker (eksen ilk harekette seçilir,
 * sürükleme boyunca sabit kalır). Palet açıkken sağ tık / X (Sök) / Delete söker; Esc önce
 * seçimi, sonra paleti kapatır. Dokunmatikte: palete dokun, tuvale dokun → orada kurulur
 * (8 px'ten az kaydıysa); bantta tek parmak sürükleme yol çeker. İkinci parmak gelince
 * bekleyen eylem iptal edilir: iki parmak kamera.js'te kalır (sözleşme bozulmaz). Eylemler
 * komut olarak benzetime girer (komutEkle; sonraki tikte). Karakter inşada da yürür.
 */
import { girdiOnleyiciEkle, hucreBul } from '../../girdi.js';
import { durumAl } from '../../oyun.js';
import { escOnleyiciEkle } from '../menu-kanca.js';
import { KARO, DX, DY, donmusBoyut } from '../../kural/ciftlik/olcu.js';
import { parcaTanimi } from '../../kural/ciftlik/parca-kayit.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { parcaAt } from '../../kural/ciftlik/izgara.js';

/** Sürükleme sayılması için en az hareket (CSS px). */
const SURUKLE_PX = 8;
const tuval = document.getElementById('tarla');

/** Paylaşılan inşa durumu (palet ve önizleme çizimi okur). */
export const insa = {
  acik: false, secili: null, yon: 0, hayalet: null, yol: null, basili: null,
};
const dinleyiciler = [];
const parmaklar = new Set();

/** İnşa durumu değişince çağrılır (palet düğmeleri). */
export function insaDinle(islev) {
  dinleyiciler.push(islev);
}

function degisti() {
  for (const islev of dinleyiciler) islev(insa);
}

const ciftlikte = () => durumAl()?.mod === 'ciftlik';

export function paletAc(acik = !insa.acik) {
  insa.acik = acik && ciftlikte();
  if (!insa.acik) Object.assign(insa, { secili: null, yol: null, basili: null });
  degisti();
}

/** Parça (anahtar) ya da 'sok' seçer; aynısı yeniden seçilirse bırakır. */
export function sec(secim) {
  insa.secili = insa.secili === secim ? null : secim;
  insa.yol = null;
  degisti();
}

export function dondur(adim = 1) {
  insa.yon = (insa.yon + adim + 4) & 3;
  degisti();
}

function karoBul(e) {
  const h = hucreBul(tuval, e);
  return { kx: Math.floor(h.x / KARO), ky: Math.floor(h.y / KARO) };
}

/** İmleç karosuna göre parçanın sol üst karosu (çok karolu parça imleçte ortalanır). */
export function yerlesimKonumu(anahtar, kx, ky, yon) {
  const [en, boy] = donmusBoyut(parcaTanimi(anahtar).boyut, yon);
  return { x: kx - ((en - 1) >> 1), y: ky - ((boy - 1) >> 1) };
}

/** a'dan b'ye L biçimli 4 yönlü karo yolu; eksen: 'x' önce yatay, 'y' önce dikey. */
export function lYolu(a, b, eksen, yon) {
  const yol = [{ kx: a.kx, ky: a.ky }];
  const adim = (dx, dy, n) => {
    for (let i = 0; i < n; i++) {
      const s = yol[yol.length - 1];
      yol.push({ kx: s.kx + dx, ky: s.ky + dy });
    }
  };
  const ax = Math.sign(b.kx - a.kx);
  const ay = Math.sign(b.ky - a.ky);
  if (eksen === 'x') {
    adim(ax, 0, Math.abs(b.kx - a.kx));
    adim(0, ay, Math.abs(b.ky - a.ky));
  } else {
    adim(0, ay, Math.abs(b.ky - a.ky));
    adim(ax, 0, Math.abs(b.kx - a.kx));
  }
  return yol.map((k, i) => {
    const s = yol[i + 1] ?? k;
    const o = yol[i - 1];
    let y = yon;
    for (let d = 0; d < 4; d++) {
      if (yol[i + 1] && k.kx + DX[d] === s.kx && k.ky + DY[d] === s.ky) y = d;
      else if (!yol[i + 1] && o && o.kx + DX[d] === k.kx && o.ky + DY[d] === k.ky) y = d;
    }
    return { ...k, yon: y };
  });
}

function kur(d, kx, ky) {
  const { x, y } = yerlesimKonumu(insa.secili, kx, ky, insa.yon);
  komutEkle(d.ciftlik, { tur: 'kur', parca: insa.secili, x, y, yon: insa.yon });
}

/** Bant yolu: boş karoya bant kurulur, mevcut bant yeniden yönlenir. */
function yoluKur(d, yol) {
  for (const k of yol) {
    const p = parcaAt(d.ciftlik, k.kx, k.ky);
    if (p && p.tanim.anahtar === insa.secili) {
      if (p.yon !== k.yon) komutEkle(d.ciftlik, { tur: 'dondur', x: k.kx, y: k.ky, yon: k.yon });
    } else {
      komutEkle(d.ciftlik, { tur: 'kur', parca: insa.secili, x: k.kx, y: k.ky, yon: k.yon });
    }
  }
  if (yol.length > 1) insa.yon = yol[yol.length - 1].yon;
}

function sok(d, kx, ky) {
  komutEkle(d.ciftlik, { tur: 'sok', x: kx, y: ky });
}

function bas(e) {
  if (e.pointerType === 'touch') parmaklar.add(e.pointerId);
  if (parmaklar.size > 1) {
    insa.basili = null;
    insa.yol = null;
    return false;
  }
  if (!ciftlikte() || e.button === 1) return false;
  const karo = karoBul(e);
  if (e.button === 2) {
    if (insa.acik) sok(durumAl(), karo.kx, karo.ky); // palet kapalıyken sağ tık bir şey yapmaz
    return insa.acik;
  }
  if (!insa.acik || !insa.secili) return false;
  insa.basili = { id: e.pointerId, bas: karo, x: e.clientX, y: e.clientY, eksen: null };
  insa.hayalet = karo;
  insa.yol = parcaTanimi(insa.secili)?.hat ? lYolu(karo, karo, 'x', insa.yon) : null;
  tuval.setPointerCapture(e.pointerId);
  return true;
}

function tasi(e) {
  if (!ciftlikte() || !insa.acik) return false;
  const karo = karoBul(e);
  const b = insa.basili;
  if (!b || b.id !== e.pointerId) {
    if (e.pointerType !== 'touch') insa.hayalet = karo;
    return false;
  }
  insa.hayalet = karo;
  if (Math.hypot(e.clientX - b.x, e.clientY - b.y) >= SURUKLE_PX) b.surukledi = true;
  if (insa.yol) {
    if (!b.eksen && (karo.kx !== b.bas.kx || karo.ky !== b.bas.ky)) {
      b.eksen = Math.abs(karo.kx - b.bas.kx) >= Math.abs(karo.ky - b.bas.ky) ? 'x' : 'y';
    }
    insa.yol = lYolu(b.bas, karo, b.eksen ?? 'x', insa.yon);
  }
  return true;
}

function bitir(e) {
  if (e.pointerType === 'touch') parmaklar.delete(e.pointerId);
  const b = insa.basili;
  if (!b || b.id !== e.pointerId) return false;
  insa.basili = null;
  const d = durumAl();
  if (e.type === 'pointercancel' || !ciftlikte()) {
    insa.yol = null;
    return true;
  }
  const karo = karoBul(e);
  if (insa.secili === 'sok') sok(d, karo.kx, karo.ky);
  else if (insa.yol) yoluKur(d, b.eksen ? insa.yol : lYolu(karo, karo, 'x', insa.yon));
  else kur(d, karo.kx, karo.ky);
  insa.yol = null;
  if (e.pointerType === 'touch') insa.hayalet = null;
  return true;
}

girdiOnleyiciEkle((tur, e) => (tur === 'bas' ? bas(e) : tur === 'tasi' ? tasi(e) : bitir(e)));

tuval.addEventListener('contextmenu', (e) => {
  if (ciftlikte()) e.preventDefault();
});

document.addEventListener('keydown', (e) => {
  const hedef = e.target;
  if (!ciftlikte() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (hedef.closest && hedef.closest('input, textarea, select, dialog')) return;
  if (e.code === 'KeyB') paletAc();
  else if (!insa.acik) return;
  else if (e.code === 'KeyR') dondur(e.shiftKey ? -1 : 1);
  else if (e.code === 'KeyX') sec('sok');
  else if (e.code === 'Delete' && insa.hayalet) sok(durumAl(), insa.hayalet.kx, insa.hayalet.ky);
});

escOnleyiciEkle(() => {
  if (!ciftlikte() || !insa.acik) return false;
  if (insa.secili) sec(insa.secili);
  else paletAc(false);
  return true;
});
