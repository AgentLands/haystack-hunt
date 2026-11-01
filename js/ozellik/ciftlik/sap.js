/**
 * SAP (geçici): ekonomi (G) ve hava (D) işleri birleşene dek HUD'un okuduğu veriyi uyduran
 * tek dosya. HUD, pano, damga defteri ve kapı paneli yalnız buradaki üç işlevi bilir:
 *   ekonomiAl(durum)  → { kurus, kartlar[3], damgalar[], rozetler[], siradaki } (G: ekonomi/)
 *   havaAl(tohum, dilim) → { yon, siddet, gok }                       (D: dunya/hava.js)
 *   kapiBilgisi(durum) → { fazlasiniSat, araba, cayir }               (G + D komutları)
 * G ve D gelince bu dosyanın gövdeleri kural modüllerinden okuyan gerçekleriyle değişir
 * (imzalar sabit); sayılar (damga tablosu, ödüller, kapı bedelleri) o zaman denge.js'ten gelir.
 * Sap davranışı: depodaki (sandık) saman tutamı "teslim" sayılır; kuruş ve damga yalnız bellekte.
 * Sap damga basınca G'nin yayacağı 'damga-basildi' olayını kendisi yayar; G gelince bu dosya
 * silinmeli (çift olay olmasın).
 */
import { dinle, yay } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { esyaKodu } from '../../kural/ciftlik/esya.js';

const SAMAN = esyaKodu('saman');
const CIVI = esyaKodu('civi');
const KURUS_BASLANGIC = 300;

/** Damga tablosu (ekonomi.md §4): kod, ad, koşul metni, hedef (sap: yalnız D1-D3 sayılır). */
export const DAMGALAR = [
  ['D1', 'İlk teslim', '30 saman tutamı', 150, 'Çatal, Birleştirme oluğu, Oluk mıknatısı'],
  ['D2', 'Çivisiz', '40 tutam, çivi gelirse sayaç sıfırlanır', 200,
    'Yaba kolu, Defter masası, Menfez'],
  ['D3', 'İlk iğne', 'Herhangi yolla 1 iğne', 300, 'El krankı, Şaft, Balya presi, Yel değirmeni'],
  ['D4', 'İlk balyalar', '10 balya', 400, 'Kalbur, Volan'],
  ['D5', 'Temiz harman', '20 saman balyası (toz ayıklanmış)', 500,
    'Şeytan yeli, Mıknatıslı tambur, Taş toplayıcı'],
  ['D6', 'Kümes altlığı', '30 toz', 600, 'Tırmık kolu, Ot savurucu, Gübre çukuru, Tınaz'],
  ['D7', 'Kuru ot', '60 kuru ot', 800, 'Lokomobil, Ambar, Çekiçli kıyıcı, Kurutma ambarı'],
  ['D8', 'Kışlık', '10 ot balyası ve 60 kıyım', 1000, 'Kantar, Kile sayacı, Rüzgâr gülü, Savak'],
  ['D9', 'Usta harmancı', '30 ot balyası, toplam 10 iğne', 1200, 'Dalga 2 parçaları'],
  ['D10', 'Defter yarısı', '8 farklı buluntu türü', 1200, 'Dalga 2 parçaları'],
  ['D11', 'Ahır dolusu', '20 ot balyası ve 100 kıyım', 1500, 'Dalga 2 parçaları'],
  ['D12', 'Değirmen', '40 tane', 1500, 'Dalga 2 parçaları'],
  ['D13', 'Fırın', '15 un', 1800, 'Dalga 2 parçaları'],
  ['D14', 'Kış hazırlığı', '10 silaj balyası ve 20 karma yem', 2000, 'Dalga 2 parçaları'],
].map(([kod, ad, kosul, odul, acar]) => ({ kod, ad, kosul, odul, acar: acar.split(', ') }));

/** Usta rozetleri (ekonomi.md §4): parça açmaz, yalnız defterde damga. */
const ROZETLER = [
  ['Sessiz hat', '10 dk tıkanmasız çalışan, en az 15 parçalık hat'],
  ['Rüzgâr ustası', 'Tınazla 500 eşya ayıkla'],
  ['Sıfır çöp', '1 saat boyunca kapıda hiçbir şey boşa gitmesin'],
  ['Altın iğne', 'Altın iğneyi bul'],
];

/** Sapta sayılan hedefler (tutam / tutam / iğne) ve kart başlıkları. */
const HEDEF = { D1: 30, D2: 40, D3: 1 };
const BASLIK = { D1: 'Komşu Hatice teyze', D2: 'Çivisiz harman', D3: 'İlk iğne' };
const DONEN = [['Muhtar', 120], ['Ahırcı', 90], ['Kümes teyzesi', 150], ['Değirmenci', 60]];
const KAPI = { araba: 300, cayir: [400, 800, 1200] };

const durumlar = new WeakMap();

function sapAl(c) {
  let s = durumlar.get(c);
  if (!s) {
    s = { kurus: KURUS_BASLANGIC, damga: new Set(), ilerleme: 0, donen: [0, 1],
      donenIl: [0, 0], depolanan: 0 };
    durumlar.set(c, s);
  }
  return s;
}

const siradaki = (s) => DAMGALAR.find((d) => !s.damga.has(d.kod)) ?? null;

function damgaBas(s, d) {
  s.damga.add(d.kod);
  s.kurus += d.odul;
  s.ilerleme = 0;
  const sonraki = DAMGALAR[DAMGALAR.indexOf(d) + 1];
  yay('damga-basildi', { damga: d.kod, ad: d.ad, odul: d.odul, acilanlar: d.acar,
    siradaki: sonraki?.kod ?? null });
}

/** Depoya giren saman ve çivi (sayaç: 'depolanan'); damga ve dönen kartların ilerlemesi. */
function depolandi(s, say) {
  const saman = say[SAMAN] ?? 0;
  s.depolanan += saman;
  const d = siradaki(s);
  if (d && HEDEF[d.kod] && d.kod !== 'D3') {
    s.ilerleme += saman;
    if (d.kod === 'D2' && say[CIVI]) s.ilerleme = 0;
    if (s.ilerleme >= HEDEF[d.kod]) damgaBas(s, d);
  }
  s.donen.forEach((k, i) => {
    s.donenIl[i] += saman;
    const [baslik, hedef] = DONEN[k];
    if (s.donenIl[i] < hedef) return;
    s.kurus += hedef * 2;
    s.donenIl[i] = 0;
    let yeni = (k + 1) % DONEN.length;
    while (s.donen.includes(yeni)) yeni = (yeni + 1) % DONEN.length;
    s.donen[i] = yeni;
    yay('siparis-teslim', { baslik, odul: hedef * 2 });
  });
}

dinle('ciftlik-ozet', ({ depolanan }) => {
  const c = durumAl()?.ciftlik;
  if (c && depolanan) depolandi(sapAl(c), depolanan);
});
dinle('ciftlik-igne', () => {
  const c = durumAl()?.ciftlik;
  const s = c && sapAl(c);
  if (s && siradaki(s)?.kod === 'D3') damgaBas(s, siradaki(s));
});

/** G: kuruş, pano kartları (damga + 2 dönen) ve damga defteri. */
export function ekonomiAl(durum) {
  const s = sapAl(durum.ciftlik);
  const d = siradaki(s);
  const kartlar = [];
  if (d) {
    const hedef = HEDEF[d.kod] ?? Number.parseInt(d.kosul, 10);
    kartlar.push({ kimlik: d.kod, tur: 'damga', baslik: BASLIK[d.kod] ?? d.ad, metin: d.kosul,
      ilerleme: HEDEF[d.kod] && d.kod !== 'D3' ? s.ilerleme : 0, hedef, odul: d.odul,
      damga: d.kod, geriCevir: false, kalanTik: null });
  }
  s.donen.forEach((k, i) => {
    const [baslik, hedef] = DONEN[k];
    kartlar.push({ kimlik: `S${k}`, tur: 'hacim', baslik, metin: `${hedef} saman tutamı`,
      ilerleme: s.donenIl[i], hedef, odul: hedef * 2, damga: null, geriCevir: true,
      kalanTik: null });
  });
  const damgalar = DAMGALAR.map((x) => ({ ...x, basildi: s.damga.has(x.kod) }));
  const rozetler = ROZETLER.map(([ad, kosul]) => ({ ad, kosul, kazanildi: false }));
  return { kurus: s.kurus, kartlar: kartlar.slice(0, 3), damgalar, rozetler,
    siradaki: d?.kod ?? null };
}

/** Kapı paneli: "fazlasını sat" durumu, araba çağırma ve çayır genişletme (bedeller, hak). */
export function kapiBilgisi(durum) {
  const s = sapAl(durum.ciftlik);
  const cayirAdim = 0;
  return {
    fazlasiniSat: true,
    araba: { bedel: KAPI.araba, uygun: s.kurus >= KAPI.araba, neden: null },
    cayir: { bedel: KAPI.cayir[cayirAdim], adim: cayirAdim, toplam: KAPI.cayir.length,
      uygun: s.kurus >= KAPI.cayir[cayirAdim], neden: null },
  };
}

/** Basit karma (tamsayı, deterministik): tohum ve dilimden 0..2^32 sayısı. */
function karma(a, b) {
  let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * D: hava(tohum, dilim). Yön 3 dilimlik cephede sabit; şiddet %15/35/35/15; 10 dilimlik günde
 * %40 olasılıkla 2 dilimlik yağmur (sistemler.md §3). yon: rüzgârın gittiği yön (0 doğu...).
 */
export function havaAl(tohum, dilim) {
  const yon = karma(tohum, Math.floor(dilim / 3) + 1000) & 3;
  const z = karma(tohum, dilim) % 100;
  let siddet = z < 15 ? 0 : z < 50 ? 1 : z < 85 ? 2 : 3;
  const gun = Math.floor(dilim / 10);
  const yagmurGunu = karma(tohum, gun + 5000) % 100 < 40;
  const bas = karma(tohum, gun + 9000) % 9;
  const yagmur = yagmurGunu && dilim % 10 >= bas && dilim % 10 < bas + 2;
  let gok = karma(tohum, dilim + 7000) % 100 < 30 ? 'bulutlu' : 'gunesli';
  if (yagmur) {
    gok = 'yagmur';
    siddet = Math.max(1, siddet);
  }
  return { yon, siddet, gok };
}
