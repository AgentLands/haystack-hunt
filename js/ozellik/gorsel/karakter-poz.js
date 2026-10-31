/**
 * Çiftçi pozlarının saf hesabı (tuval yok, Node'da test edilir): yürüme döngüsü (adım
 * vurgusu, yanal salınım, omuz burulması, karşı fazlı kollar, önde/arkada botlar), bekleme
 * nefesi ve alet kullanırken gövde eğilmesi, el ve alet açıları. Yerel birim: çiftçi ölçeği;
 * +x ileri, +y sağ. adimFaz 0 ve 0.5 ayak temasıdır (kural/karakter.js adım olayı).
 */
const TAM = Math.PI * 2;
/** Omuz noktası (gövde uzayında, y işaretsiz). */
export const OMUZ = [-0.04, 0.36];
/** Bekleme duruşunda ellerin yeri (y işaretsiz): gövdenin iki yanında. */
const BEKLE_EL = [0.1, 0.6];

/**
 * Gövde pozu. Dönüş: { olcek, yanal, burulma, botlar: [[x, y], [x, y]] | null,
 * eller: [sag, sol] }. Yürürken faz 0'da sağ ayak, 0.5'te sol ayak öndedir (temas); iki
 * faz birbirinin x eksenine göre aynasıdır. Beklerken botlar gövde altında gizlidir.
 */
export function govdePozu(faz, yuruyor, t) {
  if (!yuruyor) {
    const nefes = Math.sin(t * 2);
    const x = BEKLE_EL[0] + 0.012 * nefes;
    return {
      olcek: 1 + 0.012 * nefes, yanal: 0, burulma: 0, botlar: null,
      eller: [[x, BEKLE_EL[1]], [x, -BEKLE_EL[1]]],
    };
  }
  const c = Math.cos(faz * TAM);
  const s = Math.sin(faz * TAM);
  return {
    // Geçişte gövde yüksekte (kameraya yakın), temasta basık: adım vurgusu.
    olcek: 1 + 0.035 * Math.abs(s) - 0.01,
    yanal: 0.035 * c,
    burulma: 0.1 * c,
    botlar: [[0.02 + 0.42 * c, 0.17], [0.02 - 0.42 * c, -0.17]],
    eller: [[0.06 - 0.32 * c, 0.58], [0.06 + 0.32 * c, -0.58]],
  };
}

/**
 * Alet pozu. Dönüş: { egilme (gövdenin öne kayması), sapka (şapka ölçeği: eğilince
 * baş uzaklaşır), aci (aletin açısı), uzat (alet sapı boyunca ileri kayma), iz (dedektör
 * tarama izinin açı boyu, işaretli), eller (yalnız el ile kazarken [sag, sol]), tutam (elde
 * saman tutamı olan elin sırası ya da -1) }.
 */
export function aracPozu(ad, kullan, t) {
  const bos = { egilme: 0, sapka: 1, aci: -0.2, uzat: 0, iz: 0, eller: null, tutam: -1 };
  if (ad === 'el') {
    if (!kullan) return bos;
    // İki elle sırayla kürek: eller öne-yana açılır, geri gelen el saman tutamı taşır.
    const p = t * 9;
    const s = Math.sin(p);
    const c = Math.cos(p);
    return {
      ...bos, egilme: 0.16, sapka: 0.93,
      eller: [[0.74 + 0.15 * s, 0.46 + 0.08 * c], [0.74 - 0.15 * s, -0.46 + 0.08 * c]],
      tutam: c > 0 ? 0 : 1,
    };
  }
  if (ad === 'tirmik') {
    if (!kullan) return { ...bos, aci: -0.25 };
    // Sap ±35° yay çizer; her yayın ortasında tırmık geri çekilir, gövde hafif geriye yaslanır.
    const s = Math.sin(t * 6);
    return { ...bos, egilme: -0.05, aci: 0.61 * s, uzat: -0.25 * Math.abs(Math.cos(t * 6)) };
  }
  if (ad === 'dedektor') {
    if (!kullan) return bos;
    // Sağ-sol tarama; iz: başın son geçtiği açı aralığı (hareket yönünün tersine).
    return { ...bos, egilme: 0.05, aci: 0.75 * Math.sin(t * 3.2), iz: 0.6 * Math.cos(t * 3.2) };
  }
  if (ad === 'miknatis') {
    if (!kullan) return { ...bos, aci: -0.15 };
    return { ...bos, egilme: 0.08, aci: 0.07 * Math.sin(t * 5), uzat: 0.4 };
  }
  return bos;
}
