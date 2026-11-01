/**
 * Menfez eşleme kuralı (saf, durumsuz): aynı yöne bakan iki menfez ağzı aynı doğru üzerinde,
 * arada MENFEZ_ARA_EN_AZ..MENFEZ_ARA_EN_COK karo kalacak biçimde bir çift olur; arka ağız
 * girişi, ön ağız çıkışı sayılır. Ara karolara her şey kurulabilir (başka hat, şaft, parça).
 *
 * Eşleme, bir ağzın yönünde ya da tersinde bulduğu EN YAKIN aynı yönlü menfeze bakar; zincirde
 * (ardışık menfezler) arkadan sayılan sıra belirler: 0. giriş, 1. çıkış, 2. yeni çiftin girişi...
 * Böylece sonuç yerleştirme sırasından bağımsızdır. Eşi olmayan menfez "eşsizdir": hat dışı
 * sayılır (tasima/hat.js kopuk kancası), eşya girmez, rozeti 'essiz'.
 * Mesafe: giriş ağzından çıkış ağzına karo sayısı (ara karo + 1); hat uzunluğu mesafe × BIRIM.
 */
import { DX, DY, tersYon, karoIcinde } from '../olcu.js';
import { parcaAt } from '../izgara.js';

export const MENFEZ_ARA_EN_AZ = 1;
export const MENFEZ_ARA_EN_COK = 5;

/** p'den ileri (ileri = true) ya da geri doğrultuda en yakın aynı yönlü menfez. */
function komsuBul(c, p, ileri) {
  const yon = ileri ? p.yon : tersYon(p.yon);
  for (let m = 1; m <= MENFEZ_ARA_EN_COK + 1; m++) {
    const x = p.x + DX[yon] * m;
    const y = p.y + DY[yon] * m;
    if (!karoIcinde(x, y)) return null;
    const q = parcaAt(c, x, y);
    if (q && q.tanim.menfez && q.yon === p.yon) {
      return m - 1 >= MENFEZ_ARA_EN_AZ ? { parca: q, mesafe: m } : null;
    }
  }
  return null;
}

/** Zincirde arkada kaç menfez var (en yakın aynı yönlü geri bağlantıları sayar). */
function derinlik(c, p) {
  let n = 0;
  for (let g = komsuBul(c, p, false); g; g = komsuBul(c, g.parca, false)) n += 1;
  return n;
}

/**
 * Menfezin eşi: { rol: 'giris' | 'cikis', es, mesafe } ya da eşi yoksa null. `mesafe` her iki
 * ağızdan da aynıdır (giriş ağzından çıkış ağzına karo).
 */
export function menfezEsi(c, p) {
  if (derinlik(c, p) % 2 === 1) {
    const g = komsuBul(c, p, false);
    return { rol: 'cikis', es: g.parca, mesafe: g.mesafe };
  }
  const f = komsuBul(c, p, true);
  return f ? { rol: 'giris', es: f.parca, mesafe: f.mesafe } : null;
}
