/**
 * Görünüm durumu: kameranın tek ortak kaydı. cizim.js dönüşümü buradan uygular (ve tuvalin
 * en/boy oranını `oran` olarak buraya yazar), girdi.js ekran→hücre çevirisinde okur,
 * ozellik/kamera.js günceller.
 */
import { varsayilan, sinirla, oranDegistir } from './kural/gorunum.js';

export const gorunum = varsayilan();

/** Görünümü (sınırlara kenetleyerek) değiştirir; g'de oran yoksa tuvalinki kullanılır. */
export function gorunumAyarla(g) {
  Object.assign(gorunum, sinirla({ ...g, oran: g.oran ?? gorunum.oran, ust: g.ust ?? gorunum.ust,
    zCok: g.zCok ?? gorunum.zCok }));
}

/**
 * Çiftlik kamera payları (kural/gorunum.js `ust`, `zCok`): 0 / 0 = normal tarla. Pay
 * değişince görünüm yeniden kenetlenir; kaldırılan pay alanlarını sinirla düşürür.
 */
export function kameraPayiAyarla(ust = 0, zCok = 0) {
  if ((gorunum.ust ?? 0) === ust && (gorunum.zCok ?? 0) === zCok) return;
  delete gorunum.ust;
  delete gorunum.zCok;
  gorunumAyarla({ ...gorunum, ust, zCok });
}

/** Tuvalin en/boy oranı değişti: merkez sabit kalacak biçimde görünüme yazılır. */
export function gorunumOraniAyarla(oran) {
  if (!(oran > 0) || gorunum.oran === oran) return;
  Object.assign(gorunum, oranDegistir(gorunum, oran));
}
