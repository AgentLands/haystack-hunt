/**
 * Makine çizimlerinin ortak parçaları: kare başına ortak bilgi (sönük mü, titreşim,
 * tekerlek kayması), tekerlek izleri, egzoz dumanı ve kutu gölgeleri.
 */
import { GOLGE_RENGI, donuk, golgeKayma, yuvarDik } from './ortak.js';

/** Makinenin bu karedeki ortak çizim bilgisi. */
export function makineBilgi(makine, zaman) {
  const t = zaman / 1000;
  const hiz = makine.hiz || 0;
  const hareket = Math.abs(hiz) > 0.05;
  const sonuk = !(makine.yakit > 0);
  return {
    t,
    hiz,
    hareket,
    sonuk,
    motorAcik: !sonuk && !!makine.surucu,
    calis: !!makine.calisiyor && !sonuk,
    yuk: Math.min(1, Math.max(0, makine.yuk || 0)),
    titre: hareket ? Math.sin(t * 55) * Math.min(Math.abs(hiz) * 0.008 + 0.012, 0.03) : 0,
    kayma: -hiz * t,
  };
}

/** Yerel kutuların ([x, y, w, h, r]) sağ alta kaymış gölgesi. */
export function kutuGolgesi(ctx, makine, kutular) {
  const [gx, gy] = golgeKayma(0);
  donuk(ctx, makine.x + gx, makine.y + gy, makine.yon, 1, (c) => {
    c.fillStyle = GOLGE_RENGI;
    for (const [x, y, w, h, r] of kutular) {
      yuvarDik(c, x, y, w, h, r);
      c.fill();
    }
  });
}

/**
 * Tekerlek izi: her tekerlek merkezinden (xler: [[x, y, uzun, en]]) hareketin tersine
 * uzayan sönük kesik çizgiler; hız arttıkça uzar. Yerel uzayda çizilir.
 */
export function izleriCiz(ctx, tekerlekler, hiz) {
  if (Math.abs(hiz) <= 0.05) return;
  const yon = hiz > 0 ? -1 : 1;
  const boy = Math.min(Math.abs(hiz) * 0.4, 1.5);
  ctx.strokeStyle = 'rgba(45, 28, 12, 0.3)';
  ctx.lineCap = 'butt';
  ctx.setLineDash([0.22, 0.12]);
  for (const [x, y, uzun, en] of tekerlekler) {
    const bas = x + yon * uzun / 2;
    ctx.lineWidth = en * 0.8;
    ctx.beginPath();
    ctx.moveTo(bas, y);
    ctx.lineTo(bas + yon * boy, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/**
 * Egzoz dumanı: yerel (lx, ly) noktasından çıkan, yukarı (ekranda) sürüklenen büyüyüp
 * solan gri kabarcıklar. Dünya uzayında çizilir; guc 0..1.
 */
export function dumanCiz(ctx, makine, lx, ly, guc, t) {
  const c = Math.cos(makine.yon);
  const s = Math.sin(makine.yon);
  const wx = makine.x + lx * c - ly * s;
  const wy = makine.y + lx * s + ly * c;
  donuk(ctx, wx, wy, 0, 1, (g) => {
    for (let i = 0; i < 5; i++) {
      const f = (t * 0.75 + i / 5) % 1;
      const r = 0.1 + 0.42 * f;
      g.fillStyle = `rgba(${96 + 70 * f}, ${96 + 70 * f}, ${100 + 66 * f}, ${
        (0.42 * (1 - f) * guc).toFixed(3)})`;
      g.beginPath();
      g.arc(f * 0.9 + Math.sin(t * 2 + i) * 0.05, -f * 1.5, r, 0, Math.PI * 2);
      g.fill();
    }
  });
}
