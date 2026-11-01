/**
 * İnşanın tuval üstü ek işaretleri ('ust' katman, dünya pikseli; hayaletin kendisi
 * gorsel/onizleme.js'te): bağlantısız hayaletin sarı kesik çerçevesi, hayaletin bağlandığı
 * komşuların parıltısı, hat yolunun kesişme karosu (sarı, çizgili) ve bağlandığı kapı
 * (parlayan çerçeve), sil kipinde sürükleme yolunda toplanan parçalar (kırmızı, çizgili).
 * Renk tek başına taşımaz: kesik çizgi / çizgili desen şekil farkıdır.
 */
import { katmanEkle } from '../../cizim.js';
import { ekranBirim } from '../../cizim/tuval-olcek.js';
import { insa } from './insa.js';
import { KARO_PX } from './gorsel/kayit.js';

const SARI = 'rgba(227, 179, 65, 0.95)';
const KIRMIZI = 'rgba(200, 50, 30, 0.9)';

function kutu(ctx, x, y, en, boy, renk, eb, { kesik = false, desen = false } = {}) {
  const px = x * KARO_PX;
  const py = y * KARO_PX;
  const w = en * KARO_PX;
  const h = boy * KARO_PX;
  ctx.strokeStyle = renk;
  ctx.lineWidth = 2 * eb;
  ctx.setLineDash(kesik ? [3 * eb, 2 * eb] : []);
  ctx.strokeRect(px, py, w, h);
  ctx.setLineDash([]);
  if (!desen) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, w, h);
  ctx.clip();
  ctx.lineWidth = 1 * eb;
  ctx.beginPath();
  for (let t = -h; t < w; t += 3) {
    ctx.moveTo(px + t, py + h);
    ctx.lineTo(px + t + h, py);
  }
  ctx.stroke();
  ctx.restore();
}

katmanEkle((ctx, durum) => {
  if (durum.mod !== 'ciftlik' || !insa.acik) return;
  const eb = ekranBirim(ctx);
  const c = durum.ciftlik;
  const o = insa.kip === 'kur' && !insa.yol ? insa.onizleme : null;
  if (o && insa.hayalet) {
    if (o.durum === 'uyari') kutu(ctx, o.x, o.y, o.en, o.boy, SARI, eb, { kesik: true });
    for (const b of o.baglar) kutu(ctx, b.kx, b.ky, 1, 1, SARI, eb);
  }
  const yd = insa.yol && insa.yolDenetim;
  if (yd) {
    for (const k of insa.yol) {
      if (k.durum === 'kesisme') kutu(ctx, k.kx, k.ky, 1, 1, SARI, eb, { desen: true });
    }
    const son = insa.yol[insa.yol.length - 1];
    if (yd.bag && son) kutu(ctx, son.kx, son.ky, 1, 1, SARI, eb);
  }
  if (insa.silinecek) {
    for (const id of insa.silinecek) {
      const p = c.parcalar.get(id);
      if (p) kutu(ctx, p.x, p.y, p.en, p.boy, KIRMIZI, eb, { desen: true });
    }
  }
}, 'ust');
