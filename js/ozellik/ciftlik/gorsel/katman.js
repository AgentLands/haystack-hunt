/**
 * Çiftlik çizim katmanları (yalnız durum.mod === 'ciftlik' iken). 'alt' (tarladan sonra,
 * karakter ve makinelerden önce): bölge önbelleğinden parça gövdeleri, görünür parçaların
 * hareketli kısımları (bant çıtaları, huni, sandık doluluğu), bant eşyaları. 'ust':
 * inşa önizlemesi (önizleme.js). Görünür alan dışı ayıklanır. Ölçüm: ciftlikOlcum.ms (son
 * karenin çiftlik çizimi), .esya (çizilen eşya), .parca (hareketli çizilen parça).
 */
import { katmanEkle } from '../../../cizim.js';
import { gorunum } from '../../../gorunum.js';
import { gorunurAlan } from '../../../kural/gorunum.js';
import { KARO, TIK_MS, BIRIM } from '../../../kural/ciftlik/olcu.js';
import { sadeHareket } from '../../sade-hareket.js';
import { KARO_PX, parcaCizimi } from './kayit.js';
import { bolgeleriCiz, bolgeKirlet } from './bolge.js';
import { esyalariCiz } from './esya-cizim.js';
import { onizlemeCiz } from './onizleme.js';
import { ekranBirim } from '../../../cizim/tuval-olcek.js';
import { dinle } from '../../../olaylar.js';
import './temel.js';

export const ciftlikOlcum = { ms: 0, esya: 0, parca: 0, ornekler: null };

/** Görünür alan (karo, 1 karo payla). */
function karoAlani() {
  const a = gorunurAlan(gorunum);
  return {
    kx0: Math.floor(a.x / KARO) - 1, ky0: Math.floor(a.y / KARO) - 1,
    kx1: Math.ceil((a.x + a.en) / KARO) + 1, ky1: Math.ceil((a.y + a.boy) / KARO) + 1,
  };
}

function hareketlileriCiz(ctx, c, alan, an) {
  const eb = ekranBirim(ctx);
  let n = 0;
  for (const p of c.parcalar.values()) {
    if (p.x + p.en < alan.kx0 || p.y + p.boy < alan.ky0 || p.x > alan.kx1 || p.y > alan.ky1) {
      continue;
    }
    const ciz = parcaCizimi(p.tanim.anahtar).hareketli;
    if (!ciz) continue;
    an.faz = p.tanim.hat && !sadeHareket()
      ? (((an.tik + an.alfa) * p.tanim.hat.hiz) / BIRIM) * KARO_PX : 0;
    ciz(ctx, p, an, eb);
    n += 1;
  }
  return n;
}

katmanEkle((ctx, durum, zaman) => {
  if (durum.mod !== 'ciftlik') return;
  const bas = performance.now();
  const c = durum.ciftlik;
  const t = ctx.getTransform();
  const s = Math.hypot(t.a, t.b);
  const alan = karoAlani();
  const alfa = Math.max(0, Math.min(1, durum.tikBirikim / TIK_MS));
  bolgeleriCiz(ctx, c, alan, s);
  ciftlikOlcum.parca = hareketlileriCiz(ctx, c, alan, { zaman, tik: c.tik, alfa, faz: 0 });
  ciftlikOlcum.esya = esyalariCiz(ctx, c, alan, s, alfa);
  ciftlikOlcum.ms = performance.now() - bas;
  ciftlikOlcum.ornekler?.push(ciftlikOlcum.ms);
}, 'alt');

katmanEkle((ctx, durum) => {
  if (durum.mod === 'ciftlik') onizlemeCiz(ctx, durum);
}, 'ust');

for (const ad of ['parca-kuruldu', 'parca-sokuldu', 'parca-dondu']) {
  dinle(ad, ({ parca: p }) => bolgeKirlet(p.x, p.y, Math.max(p.en, p.boy), Math.max(p.en, p.boy)));
}
