/**
 * Çiftlik dünya çizimleri (D · dunya): çayır yeşili, huni ağzı işareti, Komşu kapısının yeri
 * (kesik çerçeve) ve açıktaki taş/iğne ailesi parıltısı. Hava (bulut, yağmur, zerre) H1'in
 * gorsel/hava.js'indedir. Parça çizimleri aile dosyalarında (toplama.js vb.).
 */
import { katmanEkle } from '../../../cizim.js';
import { gorunum } from '../../../gorunum.js';
import { gorunurAlan } from '../../../kural/gorunum.js';
import { OLCEK, ekranBirim } from '../../../cizim/tuval-olcek.js';
import { GENISLIK } from '../../../kural/boyut.js';
import { esyaTanimi, esyaKodu } from '../../../kural/ciftlik/esya.js';
import { tarladaMi } from '../../../kural/ciftlik/saman.js';
import { agizKarolari } from '../../../kural/ciftlik/dunya/ogretici.js';
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';
const K = KARO_PX;
const CIVI = esyaKodu('civi');

function kutu(ctx, x, y, en, boy, renk, eb) {
  ctx.fillStyle = renk;
  ctx.fillRect(x, y, en, boy);
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.strokeRect(x, y, en, boy);
}

function araziCiz(ctx, c, eb) {
  const a = c.arazi;
  if (!a) return;
  if (a.cayir) {
    ctx.fillStyle = 'rgba(92, 150, 60, 0.28)';
    ctx.fillRect(a.cayir.x * K, a.cayir.y * K, a.cayir.en * K, a.cayir.boy * K);
  }
  if (a.kapi) {
    ctx.setLineDash([2 * eb, 2 * eb]);
    ctx.strokeStyle = MUREKKEP;
    ctx.lineWidth = 1.2 * eb;
    ctx.strokeRect(a.kapi.x * K, a.kapi.y * K, a.kapi.en * K, a.kapi.boy * K);
    ctx.setLineDash([]);
  }
}

/** Huni ağızları: kesik çerçeveli koyu bant (ağzın hangi yanda olduğu görünsün). */
function agizCiz(ctx, c, eb) {
  ctx.fillStyle = 'rgba(43, 26, 16, 0.3)';
  ctx.strokeStyle = 'rgba(255, 240, 192, 0.8)';
  ctx.lineWidth = eb;
  ctx.setLineDash([1.5 * eb, 1.5 * eb]);
  for (const p of c.parcalar.values()) {
    if (p.tanim.anahtar !== 'huni') continue;
    for (const [kx, ky] of agizKarolari(p)) {
      ctx.fillRect(kx * K + 0.5, ky * K + 0.5, K - 1, K - 1);
      ctx.strokeRect(kx * K + 0.5, ky * K + 0.5, K - 1, K - 1);
    }
  }
  ctx.setLineDash([]);
}

/** Açıktaki (h ≤ z) taş ve iğne ailesi nesneleri: küçük nokta (taş gri, metal gümüş). */
function acikNesneler(ctx, durum, alan, eb) {
  const { tarla } = durum;
  for (const g of durum.ciftlik.gomulu) {
    if (!tarladaMi(g) || g === tarla.igne || g.tur || g.esya === CIVI) continue;
    if (g.x < alan.x || g.y < alan.y || g.x > alan.x + alan.en || g.y > alan.y + alan.boy) {
      continue;
    }
    if (tarla.h[(g.y | 0) * GENISLIK + (g.x | 0)] > g.z) continue;
    ctx.beginPath();
    ctx.arc((g.x + 0.5) * OLCEK, (g.y + 0.5) * OLCEK, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = esyaTanimi(g.esya)?.renk ?? '#ccc';
    ctx.fill();
    ctx.strokeStyle = MUREKKEP;
    ctx.lineWidth = eb;
    ctx.stroke();
  }
}

katmanEkle((ctx, durum) => {
  if (durum.mod !== 'ciftlik') return;
  const eb = ekranBirim(ctx);
  araziCiz(ctx, durum.ciftlik, eb);
  agizCiz(ctx, durum.ciftlik, eb);
  acikNesneler(ctx, durum, gorunurAlan(gorunum), eb);
}, 'alt');
