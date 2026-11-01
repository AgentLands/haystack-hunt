/**
 * Senaryo koşucusu (iş K): gerçek oyun yolundan (`modAc('ciftlik')`, kare kare `adim`) açılan
 * çiftlikte sabit, deterministik bir kurma dizisiyle D1-D5 damgalarına ulaşılır; hiçbir
 * rastgelelik yok (aynı etiket = aynı dünya = aynı akış). Turnuva değil: hedef damgaya
 * varınca durur. Adım düzeni `docs/ciftlik/README.md` "İlk 10 dakika" tablosudur:
 *   D1  huni → bant → Komşu kapısı (30 tutam)        D2  hatta oluk mıknatısı (40 temiz tutam)
 *   D3  tutucudaki iğne "Boşalt" (komut `bosalt`)     D4  hatta balya presi + el krankı
 *   D5  kalbur: toz yan çıkışa, 20 temiz saman balyası
 * VARSAYIMLAR (birleştirmede UYARLA; hepsi bu dosyanın başındaki `UYARLAYICI` içinde):
 * kapı `komsu-kapisi` parçasıdır; öğretici hayalet konumu `c.ogretici.huni = { kx, ky, yon }`
 * (D); damgalar `c.ilerleme.damgalar` (G); komutlar `bosalt` ve `krank` (yol-haritası §1.7).
 */
import { modAc, durumAl, adim } from '../js/oyun.js';
import '../js/oyun-ciftlik.js';
import { komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaIcerigi, parcaTanimi } from '../js/kural/ciftlik/parca-kayit.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { tersYon } from '../js/kural/ciftlik/olcu.js';
import { dinle } from '../js/olaylar.js';
import { HUNI_AD } from './ciftlik-bekleyen.mjs';
import { besleyiciKur, yolCek } from './ciftlik-hatlar.mjs';

const KARE_MS = 1000 / 60;

/** Çekirdek dışı (henüz yazılmamış) API'lere tek geçit: birleşmede yalnız burası uyarlanır. */
export const UYARLAYICI = {
  kapi: (c) => [...c.parcalar.values()].find((p) => p.tanim.anahtar === 'komsu-kapisi'),
  ogreticiHuni: (c) => c.ogretici.huni,
  damgalar: (c) => c.ilerleme?.damgalar ?? [],
};

/** Kareleri sürer: `tik` kadar benzetim tiki geçene dek; son kare zamanını döndürür. */
function ilerle(d, zaman, tik) {
  const hedef = d.ciftlik.tik + tik;
  let z = zaman;
  while (d.ciftlik.tik < hedef) {
    z += KARO_MS;
    adim(z);
  }
  return z;
}

/** İlk hattı kurar: öğretici huni + BFS bant yolu + kapıya. Parçaları döndürür. */
function ilkHat(d) {
  const { ciftlik: c, tarla } = d;
  const kapi = UYARLAYICI.kapi(c);
  const hz = UYARLAYICI.ogreticiHuni(c);
  const huni = besleyiciKur(c, tarla, HUNI_AD, { kx: hz.kx, ky: hz.ky }, hz.yon ?? 0, 0);
  const port = kapi.giris[0];
  const bas = { kx: huni.cikis[0].hx, ky: huni.cikis[0].hy };
  const n = yolCek(c, tarla, bas, { kx: port.hx, ky: port.hy }, tersYon(port.yon));
  return { huni, kapi, bantSayisi: n, bas, port };
}

/** Kapıdan 6 bant geride bir bant karosunu oluk mıknatısıyla değiştirir (komutla). */
function miknatisKoy(d) {
  const { ciftlik: c } = d;
  const bantlar = [...c.parcalar.values()].filter((p) => p.tanim.anahtar === 'bant');
  const hedef = bantlar[Math.max(0, bantlar.length - 6)];
  komutEkle(c, { tur: 'sok', x: hedef.x, y: hedef.y });
  komutEkle(c, { tur: 'kur', parca: 'oluk-miknatisi', x: hedef.x, y: hedef.y, yon: hedef.yon });
  return hedef;
}

/**
 * Senaryoyu koşar. hedef: 'D1'..'D5'; tikTavan: en çok tik (30 dk = 36000). Döner:
 * { basildi, tik, damgalar, damgaTik (damga → basıldığı tik), civiAraliklari } (civiAraliklari:
 * gömülü çivilerin açığa çıktığı ardışık tikler arası fark).
 */
export async function senaryoKos(
  { hedef = 'D5', tikTavan = 30 * 1200, etiket = 'senaryo-1' } = {},
) {
  modAc('ciftlik', { etiket });
  const d = durumAl();
  const c = d.ciftlik;
  const sira = ['D1', 'D2', 'D3', 'D4', 'D5'];
  const hedefNo = sira.indexOf(hedef);
  ilkHat(d);
  const civiTikleri = [];
  const birak = dinle('gomulu-cikti', ({ tur }) => {
    if (tur === esyaKodu('civi')) civiTikleri.push(c.tik);
  });
  let zaman = 1000;
  let asama = 0;
  const damgaTik = {};
  const bas = (ad) => UYARLAYICI.damgalar(c).includes(ad);
  while (c.tik < tikTavan && !bas(hedef)) {
    zaman = ilerle(d, zaman, 20);
    for (const ad of sira) if (bas(ad) && !(ad in damgaTik)) damgaTik[ad] = c.tik;
    if (asama === 0 && bas('D1')) {
      miknatisKoy(d);
      asama = 1;
    }
    if (asama === 1 && bas('D2') && hedefNo >= 2) asama = 2;
    if (asama === 2 && !bas('D3')) {
      const tutucu = [...c.parcalar.values()].find((p) => p.tanim.anahtar === 'oluk-miknatisi');
      const igne = esyaKodu('igne');
      if (tutucu && parcaIcerigi(tutucu).esya.some(([k, n]) => k === igne && n > 0)) {
        komutEkle(c, { tur: 'bosalt', x: tutucu.x, y: tutucu.y });
      }
    }
    if (asama >= 2 && bas('D3') && hedefNo >= 3 && asama < 3) {
      presKoy(d);
      asama = 3;
    }
    if (asama === 3 && c.tik % 600 === 0) {
      const kr = [...c.parcalar.values()].find((p) => p.tanim.anahtar === 'el-kranki');
      if (kr) komutEkle(c, { tur: 'krank', x: kr.x, y: kr.y });
    }
    if (asama === 3 && bas('D4') && hedefNo >= 4) {
      kalburKoy(d);
      asama = 4;
    }
  }
  birak();
  return {
    basildi: bas(hedef), tik: c.tik, damgalar: UYARLAYICI.damgalar(c), damgaTik,
    civiAraliklari: civiTikleri.slice(1).map((t, i) => t - civiTikleri[i]),
  };
}

/** D4: kapıdan 8 karo geride düz bir yerde balya presi + yanına el krankı (aks komşuluğu). */
function presKoy(d) {
  const { ciftlik: c } = d;
  const pres = parcaTanimi('balya-presi');
  const bantlar = [...c.parcalar.values()].filter((p) => p.tanim.anahtar === 'bant');
  const yer = bantlar[Math.max(0, bantlar.length - 12)];
  for (let i = 0; i < 3; i++) {
    const b = bantlar[bantlar.length - 12 + i];
    if (b) komutEkle(c, { tur: 'sok', x: b.x, y: b.y });
  }
  komutEkle(c, { tur: 'kur', parca: pres.anahtar, x: yer.x, y: yer.y, yon: yer.yon });
  komutEkle(c, { tur: 'kur', parca: 'el-kranki', x: yer.x, y: yer.y + 2 });
}

/** D5: kalbur (iri ön, ince yan) presin önüne. Ayrıntı birleşmede parça portlarına uyarlanır. */
function kalburKoy(d) {
  const { ciftlik: c } = d;
  const bantlar = [...c.parcalar.values()].filter((p) => p.tanim.anahtar === 'bant');
  const yer = bantlar[Math.max(0, bantlar.length - 20)];
  komutEkle(c, { tur: 'sok', x: yer.x, y: yer.y });
  komutEkle(c, { tur: 'kur', parca: 'kalbur', x: yer.x, y: yer.y, yon: yer.yon });
}
