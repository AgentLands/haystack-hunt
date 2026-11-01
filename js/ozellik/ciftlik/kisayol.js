/**
 * Çiftlik inşa kısayolları (yalnız çiftlikte; yazı alanında ve pencerede çalışmaz): B palet,
 * R / Shift+R döndür, Q pipet, X sil kipi, Delete imleçtekini sök, kayıtlı kiplerin tuşu
 * (I2: V seç), 1-9 kur kipinde hızlı çubuk (girdi.js'in 1-4 araç tuşundan önce yakalanır),
 * Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z geri al / yinele, C / Home çiftçiye dön, tekerlek kur
 * kipinde döndürür (Ctrl+tekerlek kameraya kalır), Esc sırayla bekleyen onayı, kipi,
 * paneli, paleti kapatır (menü açılmaz). E, Boşluk, M, WASD ve oklar normal kalır.
 */
import { escOnleyiciEkle } from '../menu-kanca.js';
import {
  insa, ciftlikte, kipler, kipAc, kipDugmeleri, sec, paletAc, dondur, geriAl, yinele,
  hamleIptal, kapaticilar,
} from './insa.js';

const tuval = document.getElementById('tarla');
const yaziAlani = (e) => e.target.closest?.('input, textarea, select, dialog');
let tusKancalari = {};

/** Kip dışı tuş eylemleri { pipet(karo), sok(karo), ciftci() }: yerlestir.js bağlar. */
export function tusKancalariKur(kancalar) {
  tusKancalari = kancalar;
}

function tus(e) {
  if (!ciftlikte() || yaziAlani(e)) return;
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    if (e.code === 'KeyZ') (e.shiftKey ? yinele : geriAl)();
    else if (e.code === 'KeyY') yinele();
    else return;
    e.preventDefault();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (kipler.get(insa.kip)?.tus?.(e)) {
    e.preventDefault();
    return;
  }
  const kayitli = kipDugmeleri().find(([, d]) => d.tus === e.code);
  if (kayitli) kipAc(insa.kip === kayitli[0] ? 'gez' : kayitli[0]);
  else if (e.code === 'KeyB') paletAc();
  else if (e.code === 'KeyR' && insa.kip === 'kur') dondur(e.shiftKey ? -1 : 1);
  else if (e.code === 'KeyX') kipAc(insa.kip === 'sil' ? 'gez' : 'sil');
  else if (e.code === 'KeyQ') tusKancalari.pipet?.(insa.imlec);
  else if (e.code === 'Delete') tusKancalari.sok?.(insa.imlec);
  else if (e.code === 'KeyC' || e.code === 'Home') tusKancalari.ciftci?.();
}
document.addEventListener('keydown', tus);

// 1-9 kur kipinde hızlı çubuk: girdi.js'in araç tuşlarından (1-4) önce yakalanır.
window.addEventListener('keydown', (e) => {
  if (!ciftlikte() || insa.kip !== 'kur' || yaziAlani(e)) return;
  if (e.ctrlKey || e.metaKey || e.altKey || !/^Digit[1-9]$/.test(e.code)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const anahtar = insa.hizli[Number(e.code.slice(5)) - 1];
  if (anahtar && !e.repeat) sec(anahtar);
}, true);

// Tekerlek kur kipinde döndürür (Ctrl+tekerlek kameraya kalır).
let tekerBirikim = 0;
window.addEventListener('wheel', (e) => {
  if (e.target !== tuval || !ciftlikte() || insa.kip !== 'kur' || e.ctrlKey) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  tekerBirikim += e.deltaMode ? Math.sign(e.deltaY) * 60 : e.deltaY;
  if (Math.abs(tekerBirikim) < 50) return;
  dondur(tekerBirikim > 0 ? 1 : -1);
  tekerBirikim = 0;
}, { capture: true, passive: false });

escOnleyiciEkle(() => {
  if (!ciftlikte()) return false;
  if (insa.bekleyen || insa.basili) hamleIptal();
  else if (insa.kip !== 'gez') kipAc('gez');
  else if (kapaticilar.some((islev) => islev())) return true;
  else if (insa.acik) paletAc(false);
  else return false;
  return true;
});
