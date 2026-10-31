/**
 * Sanal kolun saf matematiği (DOM yok): kol merkezine göre dokunma noktasını analog yöne
 * çevirir. Ölü bölge içi sıfırdır; ölü bölge dışı 0..1 aralığına yeniden ölçeklenir
 * (sıçrama olmaz), yarıçapta doygunluğa ulaşır. y aşağı pozitif (ekran yönü).
 * Ayrıca kolu bir sürüş girdisine çevirir (kolSurus): kol ekran yönlüdür, araç o yöne döner.
 */

/** Varsayılan ölü bölge: yarıçapın oranı. */
export const OLU_BOLGE = 0.15;

/**
 * Merkezden (dx, dy) kadar uzaktaki dokunuşun analog yönü ve başparmak konumu.
 * Dönen `yon` her eksen -1..1 ve bileşke uzunluğu ≤ 1; `parmak` kolun içindeki
 * başparmağın piksel kayması (yarıçapla sınırlı).
 */
export function kolYonu(dx, dy, yaricap, oluBolge = OLU_BOLGE) {
  const uzaklik = Math.hypot(dx, dy);
  if (!(yaricap > 0) || !Number.isFinite(uzaklik) || uzaklik === 0) {
    return { yon: { x: 0, y: 0 }, parmak: { x: 0, y: 0 }, guc: 0 };
  }
  const oran = Math.min(1, uzaklik / yaricap);
  const bx = dx / uzaklik;
  const by = dy / uzaklik;
  const parmak = { x: bx * oran * yaricap, y: by * oran * yaricap };
  if (oran < oluBolge) return { yon: { x: 0, y: 0 }, parmak, guc: 0 };
  const guc = Math.min(1, (oran - oluBolge) / (1 - oluBolge));
  return { yon: { x: bx * guc, y: by * guc }, parmak, guc };
}

/** Hedef yönle aracın yönü arasındaki fark bu kadar (radyan) ya da fazlaysa tam dönüş verilir. */
export const DONUS_BOLGE = 0.6;

/** Açıyı (-π, π] aralığına sarar. */
function sar(a) {
  const t = 2 * Math.PI;
  const r = ((a % t) + t) % t;
  return r > Math.PI ? r - t : r;
}

/**
 * Ekran yönlü sürüş: kol (ex, ey) yönü (ekran, y aşağı, bileşke ≤ 1) aracın gideceği yöndür.
 * yon aracın şimdiki yönü (radyan, 0 = doğu, y aşağı pozitif). Dönüş: { gaz, donus } (-1..1;
 * gaz + ileri, donus + saat yönü: surusAdim girdisi). Araç önce hedefe döner; hedef ±90°'nin
 * ötesindeyse gaz verilmez (yerinde döner), önündeyse kol gücü kadar ileri gider.
 * Kol bırakılmışsa (ex = ey = 0) ikisi de 0'dır.
 */
export function kolSurus(yon, ex, ey) {
  const guc = Math.min(1, Math.hypot(ex, ey));
  if (!(guc > 0)) return { gaz: 0, donus: 0 };
  const fark = sar(Math.atan2(ey, ex) - yon);
  return {
    gaz: guc * Math.max(0, Math.cos(fark)),
    donus: Math.max(-1, Math.min(1, fark / DONUS_BOLGE)),
  };
}
