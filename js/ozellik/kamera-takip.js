/**
 * Kamera takibi: varsayılan olarak karakteri (bindiyse makineyi) TAKIP_Z yakınlaştırmayla
 * yumuşakça izler. Elle kaydırma (orta tuş, mini harita) ya da "tüm tarla" (0, ⤢) takibi
 * bırakır; oyuncu yürüyünce ya da sürünce takip, bırakıldığı yakınlaştırmayla geri gelir.
 * Matematik kural/gorunum.js'te (takipEt, merkezle).
 */
import { gorunum, gorunumAyarla } from '../gorunum.js';
import { takipEt, YAKIN_EN_AZ } from '../kural/gorunum.js';
import { kontrol } from '../kontrol.js';
import { dinle } from '../olaylar.js';

export const TAKIP_Z = 3.5;
/** Takip yumuşaklığı (1/sn): büyüdükçe kamera karaktere daha sıkı yapışır. */
const TAKIP_HIZI = 6;

const takip = { acik: true, z: TAKIP_Z, sonZaman: null, birakilanHedef: null };

/** Takibi bırakır (elle kaydırma, tüm tarla); süren tıkla-yürü takibi geri getirmez. */
export function takipBirak() {
  takip.acik = false;
  takip.birakilanHedef = kontrol.hedef;
}

export function takipAcikMi() {
  return takip.acik;
}

/** Takip sürerken yakınlaştırma değişti (tekerlek, +/−, sıkıştırma): yeni takip düzeyi. */
export function takipYakinligi(z) {
  if (takip.acik) takip.z = Math.max(YAKIN_EN_AZ, z);
}

/** Yeni hareket isteği: yön (yürüme ya da sürüş) ya da bırakıldıktan sonra verilen hedef. */
function hareketIstendi() {
  return kontrol.yon.x !== 0 || kontrol.yon.y !== 0
    || (kontrol.hedef !== null && kontrol.hedef !== takip.birakilanHedef);
}

dinle('oyun-basladi', ({ durum }) => {
  takip.acik = true;
  takip.sonZaman = null;
  const k = durum.karakter;
  gorunumAyarla(takipEt(gorunum, k.x, k.y, takip.z, 1));
});

dinle('kare', ({ zaman, durum }) => {
  const dt = takip.sonZaman === null ? 0 : Math.min(0.1, (zaman - takip.sonZaman) / 1000);
  takip.sonZaman = zaman;
  if (!takip.acik && hareketIstendi()) takip.acik = true;
  if (!takip.acik) return;
  const k = durum.karakter;
  gorunumAyarla(takipEt(gorunum, k.x, k.y, takip.z, 1 - Math.exp(-TAKIP_HIZI * dt)));
});
