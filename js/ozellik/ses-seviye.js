/**
 * Ses seviyeleri (saf, DOM ve WebAudio yok): kategori kazançları (dB), ana ses düzeyi eğrisi
 * (0-100 → kazanç), çıkıştaki yumuşak kırpıcının eğrisi, tekrar eden seslerde "makineli tüfek"
 * etkisini kıran küçük sapma yardımcısı ve kayıtlı ses düzeyi tercihi. Zincir ses-motor.js'te.
 */

/** Ana kazanç (düzey 100 iken): kategori kazançlarının toplamı bununla çıkışa gider. */
export const ANA_KAZANC = 0.55;

/**
 * Kategori kazançları (dB; araclar/ses-olc.cjs ölçümüyle ayarlandı, ayrıntı: ses-cilasi raporu).
 * makine: kepçe, balya, marş, takılma; motor: binilen makinenin sürekli sesi (en kısık);
 * arac: kazı, tırmık, adım (sık tekrar eder, kısık); ipucu: dedektör, kulak, parıltı, buluntu,
 * bulundu (öne çıkar); ortam: hayvanlar (arka plan); arayuz: düğme tıkı.
 */
export const KATEGORI_DB = {
  makine: 0, motor: -12, arac: -6.5, ipucu: 0, ortam: -3, arayuz: 4,
};

export const dbKazanc = (db) => 10 ** (db / 20);

/** Kategorinin doğrusal kazancı; bilinmeyen kategori programlama hatasıdır. */
export function kategoriKazanci(kat) {
  if (!Object.hasOwn(KATEGORI_DB, kat)) throw new Error(`Bilinmeyen ses kategorisi: ${kat}`);
  return dbKazanc(KATEGORI_DB[kat]);
}

/** Ses düzeyi (0-100) → ana kazanç çarpanı 0..1; kulağa doğrusala yakın gelsin diye kare eğri. */
export function duzeyKazanci(yuzde) {
  const y = Math.min(100, Math.max(0, Number(yuzde) || 0)) / 100;
  return y * y;
}

/**
 * Çıkış kırpıcısının (WaveShaper) eğrisi, -1..1 girişi n örnekle: eşiğin altı olduğu gibi geçer,
 * üstü tanh ile yumuşakça 1'in biraz altında (≈ -0.65 dBFS) tavana yaslanır; tavan dışı girişler
 * eğrinin uçlarına sıkışır, yani çıkış hiçbir zaman 1'i geçmez.
 */
export function yumusakKirpmaEgrisi(n = 2048, esik = 0.7) {
  const egri = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= esik ? a : esik + (1 - esik) * Math.tanh((a - esik) / (1 - esik));
    egri[i] = Math.sign(x) * y;
  }
  return egri;
}

/**
 * Tabanın ±oran kadar sapmışı (r: 0..1 rastgele sayı; testte verilir). Sık tekrar eden seslerde
 * perde, düzey, süre ve aralığa uygulanır: her tık biraz farklı olsun.
 */
export function sapmali(taban, oran, r = Math.random()) {
  return taban * (1 + oran * (2 * r - 1));
}

const DUZEY_ANAHTAR = 'haystack-hunt-ses-duzeyi';
export const VARSAYILAN_DUZEY = 100;

/** Kayıtlı ses düzeyi (0-100 tam sayı); yoksa ya da bozuksa varsayılan. */
export function duzeyOku(depo) {
  try {
    const ham = depo.getItem(DUZEY_ANAHTAR);
    if (ham === null || ham === '') return VARSAYILAN_DUZEY;
    const sayi = Number(ham);
    return Number.isFinite(sayi) ? Math.round(Math.min(100, Math.max(0, sayi))) : VARSAYILAN_DUZEY;
  } catch (hata) {
    console.error('Ses düzeyi okunamadı:', hata);
    return VARSAYILAN_DUZEY;
  }
}

export function duzeyKaydet(depo, yuzde) {
  try {
    depo.setItem(DUZEY_ANAHTAR, String(Math.round(yuzde)));
  } catch (hata) {
    console.error('Ses düzeyi yazılamadı:', hata);
  }
}
