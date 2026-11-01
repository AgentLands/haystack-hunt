/**
 * İnşa açıkken parça kurulamayan karoları gösterir ('alt' katman): garajın çevresi ve tarlanın
 * en dış karo halkası. Soluk kırmızı zemin üstüne çapraz çizgi (renk tek başına taşımaz) ve
 * dış sınırında kesik çizgi. Yol c.izgara.yasak'tan bir kez kurulur (yasak alan değişmez).
 */
import { katmanEkle } from '../../cizim.js';
import { ekranBirim } from '../../cizim/tuval-olcek.js';
import { KARO_EN, KARO_BOY, karoIndeks } from '../../kural/ciftlik/olcu.js';
import { insa } from './insa.js';
import { KARO_PX } from './gorsel/kayit.js';

const onbellek = new WeakMap();

/** Yasak karoların dolgu yolu ve dış sınır kenarları (Path2D). */
function yollar(c) {
  let y = onbellek.get(c);
  if (y) return y;
  const { yasak } = c.izgara;
  const dolgu = new Path2D();
  const sinir = new Path2D();
  const yasakMi = (kx, ky) => kx < 0 || ky < 0 || kx >= KARO_EN || ky >= KARO_BOY
    || yasak[karoIndeks(kx, ky)] === 1;
  for (let ky = 0; ky < KARO_BOY; ky++) {
    for (let kx = 0; kx < KARO_EN; kx++) {
      if (!yasak[karoIndeks(kx, ky)]) continue;
      const px = kx * KARO_PX;
      const py = ky * KARO_PX;
      dolgu.rect(px, py, KARO_PX, KARO_PX);
      const kenarlar = [[kx, ky - 1, px, py, px + KARO_PX, py],
        [kx + 1, ky, px + KARO_PX, py, px + KARO_PX, py + KARO_PX],
        [kx, ky + 1, px, py + KARO_PX, px + KARO_PX, py + KARO_PX],
        [kx - 1, ky, px, py, px, py + KARO_PX]];
      for (const [nx, ny, x1, y1, x2, y2] of kenarlar) {
        if (yasakMi(nx, ny)) continue;
        sinir.moveTo(x1, y1);
        sinir.lineTo(x2, y2);
      }
    }
  }
  y = { dolgu, sinir };
  onbellek.set(c, y);
  return y;
}

katmanEkle((ctx, durum) => {
  if (durum.mod !== 'ciftlik' || !insa.acik || !durum.ciftlik) return;
  const eb = ekranBirim(ctx);
  const { dolgu, sinir } = yollar(durum.ciftlik);
  ctx.save();
  ctx.fillStyle = 'rgba(158, 58, 38, 0.24)';
  ctx.fill(dolgu);
  ctx.clip(dolgu);
  ctx.strokeStyle = 'rgba(158, 58, 38, 0.5)';
  ctx.lineWidth = 1 * eb;
  ctx.beginPath();
  const en = KARO_EN * KARO_PX;
  const boy = KARO_BOY * KARO_PX;
  for (let t = -boy; t < en; t += 6) {
    ctx.moveTo(t, boy);
    ctx.lineTo(t + boy, 0);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(158, 58, 38, 0.8)';
  ctx.lineWidth = 1.5 * eb;
  ctx.setLineDash([4 * eb, 3 * eb]);
  ctx.stroke(sinir);
  ctx.setLineDash([]);
}, 'alt');
