/**
 * Öğretici adımları (saf; DOM yok, Node'da test edilir): README "ilk 10 dakika" tablosunun
 * her satırı bir adım (kavram, ne yapılacak, ne zaman bitti sayılır) ve olayla bir kez gelen
 * ipuçları. Koşullar yalnız dünyadan türetilir (parça sayıları, alınmış çivi/iğne, damgalar),
 * bu yüzden sayfa yenilenince adım kendiliğinden doğru yere atlar. Sayılar siparişten
 * (kart) ve kural sabitlerinden okunur; metinde elle yazılmış sipariş sayısı yoktur.
 */
import { TIK_MS } from '../../kural/ciftlik/olcu.js';
import { esyaKodu } from '../../kural/ciftlik/esya.js';

const CIVI = esyaKodu('civi');
const IGNE = esyaKodu('igne');
/** Öğreticinin tanıdığı parça anahtarları (parcalar.md "kod-adı"). */
export const PARCA = { huni: 'huni', bant: 'bant', sandik: 'sandik',
  miknatis: 'oluk-miknatisi', kol: 'yaba-kolu' };
/** El krankının tek dokunuşta döndüğü süre (tik; sistemler.md §1: 600 tik). SAP: B'den gelir. */
export const KRANK_TIK = 600;
const KRANK_SN = (KRANK_TIK * TIK_MS) / 1000;
/** "Bant çekti" saymak için en az bant sayısı. */
export const BANT_ESIK = 4;
/** Yığın akışını izleme adımının en uzun bekleyişi (tik). */
export const IZLEME_TIK = 300;

/** Dünyadan öğretici bağlamı: parça sayıları, alınmış çivi/iğne, yaşayan durum kodları. */
export function baglamKur(c, ek = {}) {
  const parca = { huni: 0, bant: 0, sandik: 0, miknatis: 0, kol: 0 };
  const durumlar = new Set(ek.durumlar ?? []);
  for (const p of c.parcalar.values()) {
    for (const ad of Object.keys(parca)) if (p.tanim.anahtar === PARCA[ad]) parca[ad] += 1;
  }
  return {
    parca, durumlar, kart: ek.kart ?? null, elle: Boolean(ek.elle), damga: ek.damga ?? new Set(),
    uretilen: ek.uretilen ?? 0, adimTik: ek.adimTik ?? 0,
    civiAlindi: c.gomulu.some((g) => g.esya === CIVI && g.alindi),
    igneAlindi: c.gomulu.some((g) => g.esya === IGNE && g.alindi),
  };
}

const kart = (b) => b.kart ?? { baslik: 'Komşu', metin: 'saman', hedef: 0 };

/** Adımlar: kimlik, başlık, metin (t: klavye, d: dokunmatik; tek dize ikisi), vurgu seçici. */
export const ADIMLAR = [
  { kimlik: 'amac', baslik: 'Amaç', vurgu: '[data-ciftlik-pano]', elle: true,
    metin: (b) => `${kart(b).baslik}: ${kart(b).metin} istiyor. Yığından kapıya bir hat kur.`,
    tamam: (b) => b.elle || b.parca.huni > 0 },
  { kimlik: 'huni', baslik: 'Emici huni', vurgu: '[data-parca="huni"], .ciftlik-insa-ac',
    metin: { t: 'B ile paleti aç, Emici huni\'yi seç ve saman yığınının eteğine koy.',
      d: 'İnşa\'ya dokun, Emici huni\'yi seç, yığının eteğinde bir yere dokun.' },
    tamam: (b) => b.parca.huni > 0 },
  { kimlik: 'akis', baslik: 'Yığın akar', vurgu: null,
    metin: 'Saman huninin ağzına kayıyor. Çıkış dolunca huninin üstünde "çıkış dolu" belirir.',
    tamam: (b) => b.uretilen > 0 || b.adimTik >= IZLEME_TIK },
  { kimlik: 'bant', baslik: 'Bant', vurgu: '[data-parca="bant"]',
    metin: { t: 'Bant seç, huniden kapıya doğru fareyi basılı sürükle.',
      d: 'Bant seç, parmağını huniden kapıya doğru sürükle.' },
    tamam: (b) => b.parca.bant >= BANT_ESIK },
  { kimlik: 'teslim', baslik: 'Teslim', vurgu: '[data-ciftlik-pano]',
    metin: (b) => `${kart(b).hedef || 'Biraz'} tutam kapıya gidince sipariş biter; bekle.`,
    tamam: (b) => b.damga.has('D1') },
  { kimlik: 'civi', baslik: 'Paslı çivi', vurgu: null,
    metin: (b) => `Yeni sipariş çivisiz ${kart(b).hedef || ''} tutam. Hatta bir çivi gelirse `
      + 'sayaç sıfırlanır.',
    tamam: (b) => b.civiAlindi || b.damga.has('D2') },
  { kimlik: 'miknatis', baslik: 'Oluk mıknatısı', vurgu: '[data-parca="oluk-miknatisi"]',
    metin: 'Hatta bir Oluk mıknatısı koy: çiviler tutucuda birikir, saman geçer.',
    tamam: (b) => b.parca.miknatis > 0 || b.damga.has('D2') },
  { kimlik: 'doyma', baslik: 'Doyma', vurgu: null,
    metin: 'Tutucu dolunca "doymuş" rozeti çıkar; mıknatısa dokunup Boşalt\'a bas.',
    tamam: (b) => b.durumlar.has('doymus') || b.damga.has('D2') },
  { kimlik: 'civisiz', baslik: 'Çivisiz teslim', vurgu: '[data-ciftlik-pano]',
    metin: 'Temiz tutamları kapıya ulaştırmaya devam et.',
    tamam: (b) => b.damga.has('D2') },
  { kimlik: 'kol', baslik: 'Yaba kolu', vurgu: '[data-parca="yaba-kolu"]',
    metin: 'Yaba kolunu mıknatısın yanına koy: tutucuyu sandığa kendisi boşaltır.',
    tamam: (b) => b.parca.kol > 0 || b.damga.has('D3') },
  { kimlik: 'igne', baslik: 'İlk iğne', vurgu: null,
    metin: 'İlk iğne huninin ağzına yakın. Tutucuda parlar; sandığa taşı ya da Boşalt.',
    tamam: (b) => b.igneAlindi || b.damga.has('D3') },
];

/** Adımın metni (işlev ya da { t, d } ya da dize); dokunmatik: boolean. */
export function adimMetni(adim, b, dokunmatik) {
  const m = typeof adim.metin === 'function' ? adim.metin(b) : adim.metin;
  return typeof m === 'string' ? m : m[dokunmatik ? 'd' : 't'];
}

/** sira'dan başlayarak koşulu sağlanmış adımları atlar; yeni sıra (ADIMLAR.length: bitti). */
export function ilerlet(sira, b) {
  let s = sira;
  while (s < ADIMLAR.length && ADIMLAR[s].tamam(b)) s += 1;
  return s;
}

/** Olayla bir kez gelen ipuçları (README "sonraki ipuçları"). */
export const IPUCLARI = [
  { kimlik: 'guc-yok', baslik: 'Güç yok',
    metin: `Makine güç bekliyor. El krankı kur ve Kullan'a bir kez dokun: ${KRANK_SN} sn döner.`,
    kosul: (b) => b.durumlar.has('guc-yok') && b.damga.has('D3') },
  { kimlik: 'sikisma', baslik: 'Sıkışma',
    metin: 'Bir parçaya sert bir cisim sıkıştı. Parçaya dokunup Temizle\'ye bas, hat yürür.',
    kosul: (b) => b.durumlar.has('tikali') || b.durumlar.has('sikisti') },
  { kimlik: 'ruzgar', baslik: 'Rüzgâr dönüşü',
    metin: 'Rüzgâr yön değiştirdi: yel değirmeni bir an durur, üst şeritteki tahmine bak.',
    kosul: (b) => b.durumlar.has('hava') },
];

/** Henüz gösterilmemiş ve koşulu sağlanan ilk ipucu (yoksa null). */
export function ipucuBul(gorulen, b) {
  return IPUCLARI.find((i) => !gorulen.has(i.kimlik) && i.kosul(b)) ?? null;
}
