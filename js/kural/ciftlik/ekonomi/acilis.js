/**
 * Kilit kaynağı (ekonomi.md §6): hangi parça ne zaman açılır. Veri kural kodundan ayrıdır:
 *   ACILIS[anahtar] = { damga: 'D3' | null (T0), arastirma: { kurus, numune } }
 * Üç kip (ilerleme.kilit; yalnız yeni çiftlik kurulurken seçilir):
 *   'damga'      (varsayılan) parça, damgası basılınca açılır
 *   'arastirma'  parça "Usta defteri"nde araştırılınca açılır (ilerleme.arastirilan); ilk
 *                sürümde YALNIZ veri ve bu okuma dalı var, pencere ve komut dalga 2'de
 *   'acik'       her şey açık (kum havuzu); kuruş yine geçerli
 * URETIM: hangi ürün hangi parçalarla üretilebilir (sipariş üretimi "yalnız üretilebilir
 * ürün" ve erişilebilirlik testi bunu okur). Gereksinim CNF'dir: her grup en az bir açık
 * parça ister; `urun` alanındaki ürünler de üretilebilir olmalıdır. Hiçbir ürün mantık
 * ailesi istemez (mantık isteğe bağlıdır, test).
 */
import { PARCA_MALIYET, ARASTIRMA, DAMGALAR } from './denge.js';

export const KILIT_KIPLERI = Object.freeze(['damga', 'arastirma', 'acik']);

/** Damga → açtığı parçalar (parcalar.md "aile × kilit"). T0 = başlangıçta açık. */
const KILIT = {
  T0: ['huni', 'bant', 'sandik', 'komsu-kapisi'],
  D1: ['catal', 'birlestirme-olugu', 'oluk-miknatisi'],
  D2: ['yaba-kolu', 'defter-masasi', 'menfez'],
  D3: ['el-kranki', 'saft', 'balya-presi', 'yel-degirmeni'],
  D4: ['kalbur', 'volan'],
  D5: ['seytan-yeli', 'miknatisli-tambur', 'tas-toplayici'],
  D6: ['tirmik-kolu', 'ot-savurucu', 'gubre-cukuru', 'tinaz'],
  D7: ['lokomobil', 'ambar', 'cekicli-kiyici', 'kurutma-ambari'],
  D8: ['kantar', 'kile-sayaci', 'ruzgar-gulu', 'savak-kapagi'],
};

/** Parça başına kilit satırı (dondurulmuş). */
export const ACILIS = Object.freeze(Object.fromEntries(Object.entries(KILIT).flatMap(
  ([damga, liste]) => liste.map((anahtar) => [anahtar, Object.freeze({
    damga: damga === 'T0' ? null : damga,
    arastirma: damga === 'T0' ? null : Object.freeze({
      kurus: (PARCA_MALIYET[anahtar] ?? 0) * ARASTIRMA.kurusKat,
      numune: ARASTIRMA.numune[damga],
    }),
  })]),
)));

const ENERJI = ['el-kranki', 'yel-degirmeni', 'lokomobil'];
const TOZ_AYIKLA = ['kalbur', 'seytan-yeli', 'tinaz'];
const HAM = Object.freeze({ parca: [['huni'], ['bant']] });
const BULMA = Object.freeze({ parca: [['huni'], ['sandik', 'defter-masasi']] });

/**
 * Ürün → gereksinim. Ham akış (huni → bant → kapı) saman, toz, çivi, taş ve çayırda yaş ot
 * verir: kapı karışık akıştan uyanı sayar. İğne/buluntu: sandık "bulundu" sayar (ya da masa;
 * elle bulmak da her zaman mümkün). Saman balyası tozun ayıklanmasını ister (D5 "temiz").
 */
export const URETIM = Object.freeze({
  saman: HAM, toz: HAM, civi: HAM, tas: HAM, 'yas-ot': HAM,
  igne: BULMA, buluntu: BULMA,
  'kuru-ot': { urun: ['yas-ot'], parca: [['ot-savurucu', 'kurutma-ambari']] },
  'balya-karisik': { urun: ['saman'], parca: [['balya-presi'], ENERJI] },
  'balya-saman': { urun: ['saman'], parca: [['balya-presi'], ENERJI, TOZ_AYIKLA] },
  'balya-ot': { urun: ['kuru-ot'], parca: [['balya-presi'], ENERJI] },
  kiyim: { urun: ['saman'], parca: [['cekicli-kiyici'], ENERJI] },
  'curuk-ot': { urun: ['yas-ot'], parca: [['ambar']] },
});

function kipDenetle(kilit) {
  if (!KILIT_KIPLERI.includes(kilit)) throw new Error(`acilis: bilinmeyen kilit kipi ${kilit}`);
}

/**
 * Parça açık mı? Tabloda olmayan parça kapalıdır (dalga 2 ya da yazım hatası; test her
 * kayıtlı parçanın satırı olduğunu denetler).
 */
export function acikMi(anahtar, ilerleme) {
  const s = ACILIS[anahtar];
  if (!s) return false;
  kipDenetle(ilerleme.kilit);
  if (s.damga === null || ilerleme.kilit === 'acik') return true;
  if (ilerleme.kilit === 'arastirma') return ilerleme.arastirilan.includes(anahtar);
  return ilerleme.damgalar.includes(s.damga);
}

/** Açık parçaların kümesi (anahtar). */
export function acikParcalar(ilerleme) {
  return new Set(Object.keys(ACILIS).filter((a) => acikMi(a, ilerleme)));
}

/**
 * Palet için kilit bilgisi: { acik, damga, damgaAd, arastirma }. Kilitliyse damgaAd
 * ("D4 İlk balyalar'da açılır" metni arayüzündür).
 */
export function kilitBilgisi(anahtar, ilerleme) {
  const s = ACILIS[anahtar];
  const d = s?.damga ? DAMGALAR.find((x) => x.id === s.damga) : null;
  return {
    acik: acikMi(anahtar, ilerleme), damga: s?.damga ?? null, damgaAd: d?.ad ?? null,
    arastirma: ilerleme.kilit === 'arastirma' ? s?.arastirma ?? null : null,
  };
}

/** Bir damganın açtığı parçalar (tablo sırasıyla). */
export function damganinAcdiklari(id) {
  return Object.keys(ACILIS).filter((a) => ACILIS[a].damga === id);
}

/** Eşya anahtarının üretim anahtarı ('buluntu:dugme' → 'buluntu'). */
export const uretimAnahtari = (anahtar) => (anahtar.startsWith('buluntu:') ? 'buluntu' : anahtar);

/** Ürün, verilen açık parça kümesiyle üretilebilir mi (tabloda yoksa hayır)? */
export function uretilebilir(urun, acik, yol = new Set()) {
  const g = URETIM[uretimAnahtari(urun)];
  if (!g || yol.has(urun)) return false;
  yol.add(urun);
  const sonuc = g.parca.every((grup) => grup.some((p) => acik.has(p)))
    && (g.urun ?? []).every((u) => uretilebilir(u, acik, yol));
  yol.delete(urun);
  return sonuc;
}

/** Kalem (teslim ya da durum) üretilebilir mi? Teslimde kabul listesinden biri yeter. */
export function kalemUretilebilir(kalem, acik) {
  if (kalem.durum === 'igne') return uretilebilir('igne', acik);
  if (kalem.durum === 'buluntuTuru') return uretilebilir('buluntu', acik);
  if (kalem.durum) throw new Error(`acilis: bilinmeyen durum kalemi ${kalem.durum}`);
  return kalem.kabul.some((u) => uretilebilir(u, acik));
}
