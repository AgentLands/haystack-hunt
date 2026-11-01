/**
 * Kayıt göçlerinin veri dönüşümleri (saf; sakla.js GOCLER bunları sırayla uygular).
 * Sürüm 1 (Faz 0) eşya kodları: 1 saman, 2 iğne, 3 paslı çivi, 100-119 buluntu. Faz 1
 * tablosunda (esya.js, esyalar.md §2) iğne 10, çivi 13 oldu; 2 ve 3 yaş ot / kuru ot. Bu
 * eşleme yalnız sürüm 1 kayıtlarına uygulanır (sürüm 2 kayıtları zaten yeni kodlarla yazıldı:
 * ayıklama ailesi ekonomiden önce birleşti), bu yüzden kendi SURUM adımı yoktur, 1 → 2
 * göçünün parçasıdır. Faz 0'ın eşya taşıyan yerleri: gömülü nesneler, envanter, hat eşyaları,
 * huninin `ozel.cikis` tamponu, sandığın `ozel.say` sayaçları. Faz 0 sandığı iğne ve buluntuyu
 * depoluyordu; bugünkü sandık depolamaz ("bulundu" sayar): bunlar oyuncunun envanterine
 * taşınır (iğne kaybolmaz, söküm iadesindeki gibi).
 */

/** Sürüm 1 → bugünkü eşya kodu. */
export const V1_ESYA = Object.freeze({ 2: 10, 3: 13 });
const V1_HUNI = 2;
const V1_SANDIK = 3;

const yeniKod = (kod) => V1_ESYA[kod] ?? kod;
/** Sürüm 1'de depoda tutulan değerli eşya: iğne (2) ya da buluntu (100-119). */
const v1Degerli = (kod) => kod === 2 || (kod >= 100 && kod < 120);

/** Sürüm 1 kaydındaki eşya kodlarını bugünkü tabloya çevirir (yeni nesne döndürür). */
export function gocEsyaKodlari(v) {
  const envanter = new Map((v.envanter ?? []).map(([kod, n]) => [yeniKod(kod), n]));
  const ekle = (kod, n) => envanter.set(kod, (envanter.get(kod) ?? 0) + n);
  const parcalar = v.parcalar.map(([id, kod, x, y, yon, etkin, tikali, ozel]) => {
    let o = ozel;
    if (kod === V1_HUNI && Array.isArray(ozel?.cikis)) {
      o = { ...ozel, cikis: ozel.cikis.map(yeniKod) };
    } else if (kod === V1_SANDIK && ozel?.say) {
      const say = {};
      let toplam = ozel.toplam ?? 0;
      for (const [k, n] of Object.entries(ozel.say)) {
        const eski = Number(k);
        if (v1Degerli(eski)) {
          ekle(yeniKod(eski), n);
          toplam -= n;
        } else {
          say[yeniKod(eski)] = n;
        }
      }
      o = { ...ozel, say, toplam };
    }
    return [id, kod, x, y, yon, etkin, tikali, o];
  });
  return {
    ...v,
    gomulu: v.gomulu.map(([esya, ...kalan]) => [yeniKod(esya), ...kalan]),
    hatEsya: (v.hatEsya ?? []).map(([karo, ic, kod]) => [karo, ic, yeniKod(kod)]),
    envanter: [...envanter],
    parcalar,
  };
}
