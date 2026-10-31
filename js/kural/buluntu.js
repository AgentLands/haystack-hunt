/**
 * Samanda saklı buluntular: iğne dışında tarlaya gömülü küçük, esprili eşyalar (tarla başına
 * 3-6 tane). Konum, derinlik ve tür tarla tohumundan ayrı bir üreteçle türetilir; tarla,
 * iğne ve çivi üretimi bundan etkilenmez. Toplamak cezasızdır. Katalog ve nadirlik burada,
 * defterin saf kuralları buluntu-defter.js'te.
 */
import { GENISLIK, YUKSEKLIK } from './boyut.js';
import { uretec } from './rastgele.js';
import { EL_YARICAP } from './araclar.js';

const TOHUM_KARISTIR = 0x5bd1e995;
export const EN_AZ = 3;
export const EN_COK = 6;
/** Buluntu açığa çıktıktan bu kadar ms sonra alınabilir (oyuncu görsün, el sonra kapsın). */
export const ALMA_BEKLEME_MS = 320;

/** Nadirlik basamakları: ağırlık, deftere yazılan ad ve damga. */
export const NADIRLIK = {
  yaygin: { ad: 'Yaygın', agirlik: 52, sira: 0 },
  seyrek: { ad: 'Seyrek', agirlik: 28, sira: 1 },
  nadir: { ad: 'Nadir', agirlik: 14, sira: 2 },
  cokNadir: { ad: 'Çok nadir', agirlik: 6, sira: 3 },
};

/** Katalog: anahtar, defterdeki ad, nadirlik ve tek cümlelik açıklama. */
export const KATALOG = [
  { tur: 'dugme', ad: 'Düğme', nadirlik: 'yaygin',
    not: 'Gömleğin en önemli düğmesi, tam da yemekte düşen.' },
  { tur: 'tuy', ad: 'Kuş tüyü', nadirlik: 'yaygin',
    not: 'Bir serçe, balyadan hızlı çıkmayı seçmiş.' },
  { tur: 'yuksek', ad: 'Yüksük', nadirlik: 'yaygin',
    not: 'Nineye ait. Dikiş kutusu hâlâ onu arıyor.' },
  { tur: 'bilye', ad: 'Cam bilye', nadirlik: 'yaygin',
    not: 'Bir çocuğun en değerli mavisi, samanın en derin cebinde.' },
  { tur: 'anahtar', ad: 'Paslı anahtar', nadirlik: 'yaygin',
    not: 'Hangi kapıya uyduğunu kimse hatırlamıyor, bu daha da heyecanlı.' },
  { tur: 'caki', ad: 'Kırık çakı', nadirlik: 'yaygin',
    not: 'Bıçağı kırık, hatırası sapasağlam.' },
  { tur: 'kurus', ad: 'Eski bakır kuruş', nadirlik: 'seyrek',
    not: 'Bir ekmeğe yetmez ama güzel bir hikâyeye yeter.' },
  { tur: 'nal', ad: 'At nalı', nadirlik: 'seyrek',
    not: 'Şans getirir diyorlar; en azından bulana getirdi.' },
  { tur: 'toka', ad: 'Saç tokası', nadirlik: 'seyrek',
    not: 'Düğün günü kaybolmuş, kızın gözü hâlâ samanda.' },
  { tur: 'mektup', ad: 'Mektup parçası', nadirlik: 'seyrek',
    not: '"Sevgili Hasan, ineği sattım ama..." Gerisi yok.' },
  { tur: 'yonca', ad: 'Dört yapraklı yonca', nadirlik: 'seyrek',
    not: 'Kurumuş ama şansı tamamen kurumamış.' },
  { tur: 'can', ad: 'İnek çanı', nadirlik: 'seyrek',
    not: 'Çalmayı unutmuş; boynu eksik, sesi yerinde.' },
  { tur: 'oyuncak', ad: 'Tahta oyuncak at', nadirlik: 'nadir',
    not: 'Bir dede yapmış, üç torun kavga etmiş.' },
  { tur: 'kasik', ad: 'Gümüş kaşık', nadirlik: 'nadir',
    not: 'Düğün sofrasından kalma. Çorba hâlâ aranıyor.' },
  { tur: 'cingirak', ad: 'Bebek çıngırağı', nadirlik: 'nadir',
    not: 'İçinde hâlâ bir şeyler şıkırdıyor, belki bir hayal.' },
  { tur: 'tarak', ad: 'Kemik tarak', nadirlik: 'nadir',
    not: 'Bir bıyığı çok sevmiş bir çiftçiden.' },
  { tur: 'pusula', ad: 'Pirinç pusula', nadirlik: 'nadir',
    not: 'Kuzeyi şaşırmış. Samanın içinde herkes şaşırır.' },
  { tur: 'yuzuk', ad: 'Altın yüzük', nadirlik: 'cokNadir',
    not: 'Biri tarlada evlenme teklifi etmiş, parmak ürkmüş.' },
  { tur: 'kupe', ad: 'İnci küpe', nadirlik: 'cokNadir',
    not: 'Eşi hâlâ çekmecede, sahibi pes etmemiş.' },
  { tur: 'saat', ad: 'Altın cep saati', nadirlik: 'cokNadir',
    not: 'Durmuş ama zamanı çoktan geçmiş sayılmaz.' },
];

const TUR_HARITASI = new Map(KATALOG.map((b) => [b.tur, b]));

/** Türün katalog kaydı; bilinmeyen tür için null. */
export function turBilgisi(tur) {
  return TUR_HARITASI.get(tur) || null;
}

/** Ağırlıklı tür seçimi; `disinda` içindeki türler seçilmez (bir tarlada tür tekrarlanmaz). */
function turSec(zar, disinda) {
  const adaylar = KATALOG.filter((b) => !disinda.has(b.tur));
  const toplam = adaylar.reduce((t, b) => t + NADIRLIK[b.nadirlik].agirlik, 0);
  let pay = zar() * toplam;
  for (const b of adaylar) {
    pay -= NADIRLIK[b.nadirlik].agirlik;
    if (pay < 0) return b.tur;
  }
  return adaylar[adaylar.length - 1].tur;
}

/**
 * Tarlaya 3-6 buluntu gömer ve listeyi döndürür (tarlayı DEĞİŞTİRMEZ). Yüksek hücrelere,
 * iğneden ve çivilerden, birbirinden uzak. z: yerden yükseklik; üstündeki saman kalınca gizli.
 */
export function buluntulariSakla(tarla) {
  const zar = uretec((tarla.tohum ^ TOHUM_KARISTIR) >>> 0);
  const sayi = EN_AZ + Math.floor(zar() * (EN_COK - EN_AZ + 1));
  const liste = [];
  const turler = new Set();
  const uzak = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) >= d;
  const kenar = 8;
  for (let deneme = 0; deneme < 4000 && liste.length < sayi; deneme++) {
    const x = kenar + Math.floor(zar() * (GENISLIK - 2 * kenar));
    const y = kenar + Math.floor(zar() * (YUKSEKLIK - 2 * kenar));
    const yuk = tarla.h[y * GENISLIK + x];
    if (yuk < 20) continue;
    const aday = { x, y, z: Math.floor(yuk * (0.08 + 0.55 * zar())), aci: (zar() - 0.5) * 2 };
    const tur = turSec(zar, turler);
    if (!uzak(aday, tarla.igne, 12) || liste.some((b) => !uzak(aday, b, 14))) continue;
    if (tarla.civiler.some((c) => !uzak(aday, c, 6))) continue;
    turler.add(tur);
    liste.push({ ...aday, tur, alindi: false, acikSure: null, goruldu: false });
  }
  return liste;
}

/** Buluntunun üstündeki saman kalınlığı (tek hücre); 0 ise açıkta. */
export function buluntuDerinligi(tarla, b) {
  return Math.max(0, tarla.h[b.y * GENISLIK + b.x] - b.z);
}

/** El (cx, cy) üstündeyken alınabilecek, yeterince süredir açıkta olan ilk buluntu. */
export function alinabilirBuluntu(tarla, buluntular, cx, cy, zaman) {
  for (const b of buluntular) {
    if (b.alindi || b.acikSure === null || zaman - b.acikSure < ALMA_BEKLEME_MS) continue;
    if (Math.hypot(cx - b.x, cy - b.y) <= EL_YARICAP + 1.5) return b;
  }
  return null;
}

/** Yüzeye yakın (1..esik kat saman altında), alınmamış buluntular: pırıltı için. */
export function yakinBuluntular(tarla, buluntular, esik) {
  return buluntular.filter((b) => {
    if (b.alindi) return false;
    const d = buluntuDerinligi(tarla, b);
    return d > 0 && d <= esik;
  });
}
