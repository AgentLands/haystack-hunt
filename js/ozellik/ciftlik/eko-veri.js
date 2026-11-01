/**
 * HUD'un ekonomi verisi (saf; DOM yok, Node'da test edilir): G'nin kural verisini
 * (c.ekonomi panosu, c.ilerleme damgaları, kuyu bedelleri) HUD, pano, damga defteri ve kapı
 * panelinin okuduğu biçime çevirir. Sayılar ekonomi/denge.js'ten, kuyu engelleri dünyanın
 * komutlarıyla aynı sırayla (yolda/erken/yer-yok, çayır-yok/en-çok, sonra kuruş/taban).
 *   ekonomiOzeti(c) → { kurus, kartlar[≤3], damgalar[14], rozetler[], siradaki }
 *   kapiBilgisi(c)  → { fazlasiniSat, araba, cayir }   (bedel, uygun, neden metni)
 * Kart: { kimlik, yuva, tur, baslik, metin, ilerleme, hedef, odul, damga, geriCevir,
 * kalanTik }. Olaylar doğrudan G/D'den gelir: damga-basildi, siparis-tamam, harman-arabasi.
 */
import { esyaTurleri } from '../../kural/ciftlik/esya.js';
import { parcaTanimi } from '../../kural/ciftlik/parca-kayit.js';
import { DAMGALAR, KUYU } from '../../kural/ciftlik/ekonomi/denge.js';
import { damganinAcdiklari } from '../../kural/ciftlik/ekonomi/acilis.js';
import { ilerlemeAl, siradakiDamga, kalemDegeri } from '../../kural/ciftlik/ekonomi/damga.js';
import { ekonomiAl, kuyuDenetle } from '../../kural/ciftlik/ekonomi/kurus.js';
import { ARABA, dokumYeri } from '../../kural/ciftlik/dunya/araba.js';
import { CAYIR } from '../../kural/ciftlik/dunya/arazi.js';

/** Usta rozetleri (ekonomi.md §4): parça açmaz, yalnız defterde damga. */
const ROZETLER = [
  ['Sessiz hat', '10 dk tıkanmasız çalışan, en az 15 parçalık hat'],
  ['Rüzgâr ustası', 'Tınazla 500 eşya ayıkla'],
  ['Sıfır çöp', '1 saat boyunca kapıda hiçbir şey boşa gitmesin'],
  ['Altın iğne', 'Altın iğneyi bul'],
];

/** Red nedenlerinin oyuncu metni (kapı paneli ve bildirim). */
export const NEDEN_METNI = {
  bilinmeyen: 'Bu işlem henüz hazır değil.',
  kurus: 'Kuruş yetmiyor.',
  taban: 'Bu harcama kasayı çok boşaltır: önce biraz kazan.',
  erken: 'Araba yeni geldi; bir sonrakini biraz bekle.',
  yolda: 'Araba zaten yolda.',
  'yer-yok': 'Arabanın dökeceği boş yer yok: harmanda yer aç.',
  'cayir-yok': 'Bu çiftlikte çayır yok.',
  'en-cok': 'Çayır en geniş hâlinde.',
  tavan: 'Çayır en geniş hâlinde.',
  damga: 'Damga siparişi geri çevrilmez.',
  bos: 'Bu yuvada sipariş yok.',
};

let adlar = null;
/** Eşya anahtarının küçük harfli adı (dalga 2 ürünleri henüz tanımlı değil: anahtarı). */
function esyaAdi(anahtar) {
  if (anahtar.startsWith('buluntu:')) return 'buluntu';
  adlar ??= new Map(esyaTurleri().map((t) => [t.anahtar, t.ad.toLocaleLowerCase('tr')]));
  return adlar.get(anahtar) ?? anahtar;
}
const BALYA = ['balya-saman', 'balya-ot', 'balya-karisik'];

/** Kalemin metni: "30 saman tutamı", "1 iğne bul", "8 farklı buluntu türü". */
export function kalemMetni(k) {
  if (k.durum === 'igne') return `toplam ${k.miktar} iğne`;
  if (k.durum === 'buluntuTuru') return `${k.miktar} farklı buluntu türü`;
  const ad = k.kabul.length === BALYA.length && BALYA.every((b) => k.kabul.includes(b))
    ? 'balya' : esyaAdi(k.kabul[0]);
  return `${k.miktar} ${ad}`;
}

/** Pano kartı (G) → HUD kartı. */
function kartOzeti(c, kart, yuva, il) {
  const deger = (k) => Math.min(k.miktar, kalemDegeri(k, il));
  const metin = kart.kalemler.map(kalemMetni).join(' + ') + (kart.civisiz ? ', çivisiz' : '');
  return {
    kimlik: kart.damga ?? `S${kart.sira}`, yuva, tur: kart.tur,
    baslik: kart.damga ? kart.ad : kart.kisi, metin,
    ilerleme: kart.kalemler.reduce((s, k) => s + deger(k), 0),
    hedef: kart.kalemler.reduce((s, k) => s + k.miktar, 0), odul: kart.odul,
    damga: kart.damga ?? null, geriCevir: !kart.damga,
    kalanTik: kart.tur === 'sureli' ? Math.max(0, kart.bitis - c.tik) : null,
  };
}

/** Damganın açtığı parçaların adları (dalga 2: tek satır). */
function acar(id) {
  const adlar = damganinAcdiklari(id).map((a) => parcaTanimi(a)?.ad ?? a);
  return adlar.length ? adlar : ['Dalga 2 parçaları'];
}

/** HUD'un ekonomi özeti. */
export function ekonomiOzeti(c) {
  const e = ekonomiAl(c);
  const il = ilerlemeAl(c);
  const kartlar = [];
  e.pano.forEach((kart, yuva) => {
    if (kart) kartlar.push(kartOzeti(c, kart, yuva, il));
  });
  const damgalar = DAMGALAR.map((d) => ({
    kod: d.id, ad: d.ad, kosul: d.kalemler.map(kalemMetni).join(', ')
      + (d.civisiz ? ' (çivi gelirse sayaç sıfırlanır)' : ''),
    odul: d.odul, acar: acar(d.id), basildi: il.damgalar.includes(d.id),
  }));
  const rozetler = ROZETLER.map(([ad, kosul]) => ({ ad, kosul,
    kazanildi: il.rozetler.includes(ad) }));
  return { kurus: e.kurus, kartlar, damgalar, rozetler, siradaki: siradakiDamga(il)?.id ?? null };
}

const neden = (kod) => (kod ? NEDEN_METNI[kod] ?? kod : null);

/** Kapı paneli: "fazlasını sat", Araba çağır ve Çayır genişlet (bedel, uygunluk, neden). */
export function kapiBilgisi(c) {
  const e = ekonomiAl(c);
  const a = c.araba;
  let arabaNeden = null;
  if (a?.bekleyen) arabaNeden = 'yolda';
  else if (a && c.tik - a.sonCagri < ARABA.cagri) arabaNeden = 'erken';
  else if (!dokumYeri(c)) arabaNeden = 'yer-yok';
  else arabaNeden = kuyuDenetle(c, 'araba').neden ?? null;
  const seviye = c.arazi?.seviye ?? 0;
  const toplam = KUYU.cayir.bedeller.length;
  let cayirNeden = null;
  if (!c.arazi?.cayir) cayirNeden = 'cayir-yok';
  else if (seviye >= CAYIR.genisletEnCok) cayirNeden = 'en-cok';
  else cayirNeden = kuyuDenetle(c, 'cayir', seviye).neden ?? null;
  return {
    fazlasiniSat: e.fazlasiniSat,
    araba: { bedel: KUYU.araba.bedel, uygun: !arabaNeden, neden: neden(arabaNeden) },
    cayir: { bedel: KUYU.cayir.bedeller[Math.min(seviye, toplam - 1)], adim: seviye, toplam,
      uygun: !cayirNeden, neden: neden(cayirNeden) },
  };
}
