/**
 * Makine kaydı: her makine türü kendi modülünde (traktor.js, ...) makineTanimla ile
 * tanımını kaydeder; sürüş, garaj ve oyun.js tanımı makineTanimi(tur) ile okur.
 * Tanım saf işlevlerdir (DOM yok). Türlerin kayıt sırası garajdaki park sırasıdır;
 * sıra hepsi.js'teki içe aktarma sırasıdır.
 *
 * Tanım alanları (zorunlu ★):
 *   ★ad            arayüz adı ('Kepçeli traktör')
 *   ★boy, ★en      gövde ölçüsü (hücre); boy yön boyunca
 *   ★azamiHiz      hücre/sn (geri vites bunun yarısı)
 *   ★donus         dönüş hızı (radyan/sn, tank tipi)
 *   ★yakitTuketim  tam gazda saniyede harcanan yakıt (0..1 deposunun kesri)
 *   ★calis(tarla, makine, dt) → { miktar, olaylar: [[ad, veri], ...] }
 *                  Boşluk basılıyken her kare; miktar = bu karede kaldırılan/itilen saman
 *    tirmanma      geçebileceği yükseklik farkı (kat/hücre; varsayılan 2)
 *    yaricap       çarpışma dairesi (hücre; varsayılan max(boy, en) / 2 · 0.85)
 *    isYaricap     iş aygıtının etki yarıçapı (halka çizimi; varsayılan 1.5)
 *    isNoktasi(m)  iş aygıtının noktası, HÜCRE biriminde (varsayılan gövdenin önü)
 *    isYakit       çalışırken saniyede ek yakıt (varsayılan yakitTuketim / 2)
 *    kur(m)        yeni makinenin türe özgü alanlarını kurar (yuk vb.)
 *    kare(tarla, m) her kare (sürülmese de) çağrılır; ör. kepçedeki iğneyi taşır
 *    giyilir       true: araç değil giyilen makine (sırt üfleyicisi); E ile takılınca çiftçi
 *                  yürümeye devam eder, makine karakteri izler, sürüş yok, yakıt yalnız
 *                  çalışırken (isYakit) harcanır. Çıkınca makine karakterin yerine bırakılır
 *    yuruHizi      giyilirken yürüme hızının kesri (varsayılan 1; ağırlık için < 1)
 */
const tanimlar = new Map();
const ZORUNLU = ['ad', 'boy', 'en', 'azamiHiz', 'donus', 'yakitTuketim', 'calis'];

/** Önü: merkezden yön boyunca boy/2 + 1 hücre, hücre biriminde. */
function onNoktasi(m, t) {
  const d = t.boy / 2 + 1;
  return { x: m.x - 0.5 + Math.cos(m.yon) * d, y: m.y - 0.5 + Math.sin(m.yon) * d };
}

export function makineTanimla(tur, tanim) {
  const eksik = ZORUNLU.filter((alan) => tanim[alan] === undefined);
  if (eksik.length) throw new Error(`"${tur}" makine tanımında eksik alan: ${eksik.join(', ')}`);
  const tam = {
    tirmanma: 2, isYaricap: 1.5, yaricap: (Math.max(tanim.boy, tanim.en) / 2) * 0.85,
    isYakit: tanim.yakitTuketim / 2, kur: () => {}, kare: () => {},
    giyilir: false, yuruHizi: 1,
    ...tanim,
    tur,
  };
  if (!tanim.isNoktasi) tam.isNoktasi = (m) => onNoktasi(m, tam);
  tanimlar.set(tur, tam);
  return tam;
}

export function makineTanimi(tur) {
  const tanim = tanimlar.get(tur);
  if (!tanim) throw new Error(`Bilinmeyen makine türü: ${tur}`);
  return tanim;
}

/** Kayıtlı türler, kayıt sırasıyla. */
export function makineTurleri() {
  return [...tanimlar.keys()];
}
