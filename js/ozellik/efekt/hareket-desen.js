/**
 * Hareket efektlerinin saf hesapları (DOM ve parçacık havuzu yok; Node'da test edilir):
 * tekerlek noktaları, izin solması, zamana bağlı üretim birikimi, ayak izi ve üfleyici
 * konisi. Koordinatlar dünya birimi (hücre; piksel = dünya * OLCEK) ayrıca belirtilmedikçe.
 */
const kirp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Bu yüksekliğin üstünde ayak altından saman çöpü, altında toz kalkar. */
export const SAMAN_ESIGI = 1.5;
/** Bu yüksekliğin üstünde yürürken arkada kısa ömürlü ayak izi kalır. */
export const IZ_ESIGI = 6;

/** Arka tekerleklerin makine yerelindeki konumları [[ileri, yan]]; boy/en tanımdan. */
export function arkaTekerlekler(boy, en) {
  return [[-boy * 0.28, -en * 0.4], [-boy * 0.28, en * 0.4]];
}

/** Makine yerelindeki (ileri, yan) noktanın dünya konumu (yon radyan, x'e göre). */
export function dunyaNoktasi(m, ileri, yan) {
  const c = Math.cos(m.yon);
  const s = Math.sin(m.yon);
  return { x: m.x + ileri * c - yan * s, y: m.y + ileri * s + yan * c };
}

/** İz solması: yaşam başında azami alfa, sonunda 0 (kuadratik yumuşak sönüş). */
export function izAlfa(yas, omur, azami) {
  if (!(omur > 0) || yas >= omur || yas < 0) return 0;
  const k = 1 - yas / omur;
  return azami * k * k;
}

/**
 * Saniyede `hiz` parçacık hızıyla üretim: dt süresince kaç tane çıkacağı ve kalan
 * kesir. birikim bir sonraki çağrıya verilir; hiz 0 ise birikim sıfırlanır.
 */
export function uretimAdimi(birikim, hiz, dt) {
  if (!(hiz > 0)) return { n: 0, birikim: 0 };
  const toplam = birikim + hiz * dt;
  const n = Math.floor(toplam);
  return { n, birikim: toplam - n };
}

/** Yürüme adımı → efekt kararı: z > eşik ise saman çöpü, değilse toz; yüksekte iz bırakır. */
export function adimEfekti(z) {
  const yuk = Number.isFinite(z) ? Math.max(0, z) : 0;
  const saman = yuk > SAMAN_ESIGI;
  return {
    tur: saman ? 'saman' : 'toz',
    adet: saman ? Math.min(5, 2 + Math.floor(yuk / 25)) : 1,
    iz: yuk > IZ_ESIGI,
    izAlfa: kirp(0.14 + yuk / 400, 0.14, 0.32),
  };
}

/** Sol ve sağ ayak için yürüme yönüne dik kayma (dünya birimi): adım sırası çift/tek. */
export function ayakKaymasi(yon, sira, aralik = 0.28) {
  const taraf = sira % 2 === 0 ? -1 : 1;
  return { x: -Math.sin(yon) * aralik * taraf, y: Math.cos(yon) * aralik * taraf };
}

/**
 * Üfleyici konisinde bir çöp noktası: yönün ileri ekseninde mesafe (a: 0..1 rastgele),
 * yanlara mesafeyle açılan sapma (b: 0..1). Dönüş: { dx, dy, uzaklik } dünya birimi.
 */
export function koniNoktasi(yon, menzil, a, b) {
  const uzaklik = menzil * (0.3 + 0.7 * kirp(a, 0, 1));
  const yan = (kirp(b, 0, 1) * 2 - 1) * uzaklik * 0.35;
  const c = Math.cos(yon);
  const s = Math.sin(yon);
  return { dx: uzaklik * c - yan * s, dy: uzaklik * s + yan * c, uzaklik };
}

/** Makine hızına göre tekerlek tozu üretim hızı (parçacık/sn); duruyorsa 0. */
export function tozHizi(hiz, azamiHiz) {
  if (!(azamiHiz > 0) || Math.abs(hiz) < 1) return 0;
  return 8 + 22 * kirp(Math.abs(hiz) / azamiHiz, 0, 1);
}
