/**
 * Senaryo koşucusu (iş K; birleştirmede gerçek API'lere uyarlandı): gerçek oyun yolundan
 * (`modAc('ciftlik')`, kare kare `adim`) açılan çiftlikte sabit, deterministik bir kurma
 * dizisiyle D1-D5 damgalarına ulaşılır; rastgelelik yok (aynı etiket = aynı dünya = aynı akış).
 * Turnuva değil: hedef damgaya varınca durur. Adımlar `docs/ciftlik/README.md` "İlk 10 dakika":
 *   D1  öğretici huni (dunya/ogretici.js ogreticiHuniYeri) → bant → Komşu kapısı (30 tutam)
 *   D2  hatta oluk mıknatısı; tutucu dolmadan Boşalt (40 temiz tutam)
 *   D3  tutucudaki öğretici iğnesi Boşalt ile "bulundu" (G: toplam iğne)
 *   D4  hatta balya presi + yanına el krankı, çiftçi krankın yanında (Kullan her 600 tikte)
 *   D5  presin önüne kalbur (ince toz yan çıkıştan sandığa): 20 temiz saman balyası
 * Hat: huni → BFS bant yolu → düz "istasyon sırası" (doğuya akan, altındaki iki satır boş) →
 * BFS bant yolu → kapı. Makineler istasyon sırasındaki bantların yerine komutla kurulur.
 * Sıkışan pres Temizle ile açılır (taş gibi sert eşya; oyuncu da öyle yapar). D1 açılınca
 * yolun başına birleştirme oluğuyla ikinci bir huni eklenir (tek huninin ağzı ≈ 200 tutamda
 * tükenir; README "ilk 10 dakika"dan sonra oyuncunun da yaptığı).
 */
import { modAc, durumAl, adim } from '../js/oyun.js';
import '../js/oyun-ciftlik.js';
import { komutEkle } from '../js/kural/ciftlik/benzetim.js';
import { parcaTanimi, parcaIcerigi } from '../js/kural/ciftlik/parca-kayit.js';
import { yerlestirmeEngeli, parcaAt } from '../js/kural/ciftlik/izgara.js';
import { parcaKur } from '../js/kural/ciftlik/komut.js';
import { parcaOrnegi } from '../js/kural/ciftlik/parca-kayit.js';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { KARO, KARO_EN, KARO_BOY, tersYon } from '../js/kural/ciftlik/olcu.js';
import { GENISLIK } from '../js/kural/boyut.js';
import { ogreticiHuniYeri, agizKarolari } from '../js/kural/ciftlik/dunya/ogretici.js';
import { karoHucreleri } from '../js/kural/ciftlik/saman.js';
import { kapiParcasi } from '../js/kural/ciftlik/dunya/kapi.js';
import { dinle } from '../js/olaylar.js';
import { yolCek } from './ciftlik-hatlar.mjs';
import { bantCek } from './ciftlik-yardim.mjs';

const KARE_MS = 1000 / 60;
/** İstasyon sırası: n karo, makine konumları sıranın başından (x ofseti). */
const SIRA = { n: 14, miknatis: 2, kalbur: 5, pres: 8 };

/** Gerçek API'lere tek geçit (birleştirmede uyarlandı). */
export const UYARLAYICI = {
  kapi: (c) => kapiParcasi(c),
  ogreticiHuni: (c, tarla) => ogreticiHuniYeri(c, tarla),
  damgalar: (c) => c.ilerleme?.damgalar ?? [],
};

/** Kareleri sürer: `tik` kadar benzetim tiki geçene dek; son kare zamanını döndürür. */
function ilerle(d, zaman, tik) {
  const hedef = d.ciftlik.tik + tik;
  let z = zaman;
  while (d.ciftlik.tik < hedef) {
    z += KARE_MS;
    adim(z);
  }
  return z;
}

/** Karo bant için boş ve samansız mı (yığın kayınca dolmasın: h ≤ 2)? */
function duzBos(c, tarla, kx, ky) {
  if (kx < 1 || ky < 1 || kx >= KARO_EN - 1 || ky >= KARO_BOY - 1) return false;
  if (yerlestirmeEngeli(c, tarla, parcaTanimi('bant'), kx, ky, 0)) return false;
  for (let y = ky * KARO; y < (ky + 1) * KARO; y++) {
    for (let x = kx * KARO; x < (kx + 1) * KARO; x++) {
      if (tarla.h[y * GENISLIK + x] > 2) return false;
    }
  }
  return true;
}

/** Huni ile kapı arasına en yakın, SIRA.n × 3 düz ve boş dikdörtgenin sol üstü. */
function istasyonYeri(c, tarla, huni, kapi) {
  const mx = (huni.x + kapi.x) >> 1;
  const my = (huni.y + kapi.y) >> 1;
  let en = null;
  for (let ky = 2; ky < KARO_BOY - 4; ky++) {
    for (let kx = 2; kx < KARO_EN - SIRA.n - 3; kx++) {
      const d = (kx + (SIRA.n >> 1) - mx) ** 2 + (ky - my) ** 2;
      if (en && d >= en.d) continue;
      let bos = duzBos(c, tarla, kx - 1, ky) && duzBos(c, tarla, kx + SIRA.n, ky);
      for (let y = ky; y < ky + 3 && bos; y++) {
        for (let x = kx; x < kx + SIRA.n && bos; x++) bos = duzBos(c, tarla, x, y);
      }
      if (bos) en = { kx, ky, d };
    }
  }
  if (!en) throw new Error('senaryo: istasyon sırası için düz yer yok');
  return en;
}

/** İlk hat: öğretici huni → yol → istasyon sırası → yol → kapı. */
function ilkHat(d) {
  const { ciftlik: c, tarla } = d;
  const kapi = UYARLAYICI.kapi(c);
  const y = UYARLAYICI.ogreticiHuni(c, tarla);
  const huni = parcaKur(c, tarla, 'huni', y.x, y.y, y.yon).parca;
  const ist = istasyonYeri(c, tarla, huni, kapi);
  bantCek(c, tarla, ist.kx, ist.ky, 0, SIRA.n);
  const cik = huni.cikis[0];
  ist.bas = { kx: cik.hx, ky: cik.hy };
  yolCek(c, tarla, ist.bas, { kx: ist.kx - 1, ky: ist.ky }, 0);
  const port = kapi.giris[0];
  yolCek(c, tarla, { kx: ist.kx + SIRA.n, ky: ist.ky }, { kx: port.hx, ky: port.hy },
    tersYon(port.yon));
  return ist;
}

/** İstasyon sırasının x ofsetinden başlayan n bandı söker, yerine parçayı (yön 0) kurar. */
function degistir(c, ist, ofset, n, anahtar) {
  for (let i = 0; i < n; i++) komutEkle(c, { tur: 'sok', x: ist.kx + ofset + i, y: ist.ky });
  komutEkle(c, { tur: 'kur', parca: anahtar, x: ist.kx + ofset, y: ist.ky, yon: 0 });
}

const parca = (c, ist, ofset) => parcaAt(c, ist.kx + ofset, ist.ky);

/** Huni ağzı karolarındaki en yüksek saman (kat). */
function agizTepesi(c, tarla, p) {
  let tepe = 0;
  for (const i of karoHucreleri(c, agizKarolari(p))) tepe = Math.max(tepe, tarla.h[i]);
  return tepe;
}

/**
 * D1 sonrası ikinci huni (tek huni ağzındaki koniyi ≈ 200 tutamda tüketir: yığın ESIK 3
 * eğimine oturur): yolun ilk bandı birleştirme oluğu olur, ikinci huni oluğun yan girişine,
 * ağzı en dolu yığına bakacak yönde kurulur (komutla: kilit ve kuruş denetlenir).
 */
function ikinciHuni(d, ist) {
  const { ciftlik: c, tarla } = d;
  const bant = parcaAt(c, ist.bas.kx, ist.bas.ky);
  const tanim = parcaTanimi('huni');
  let en = null;
  for (const yan of [(bant.yon + 1) & 3, (bant.yon + 3) & 3]) {
    for (let yon = 0; yon < 4; yon++) {
      const o = parcaOrnegi(tanim, 0, 0, 0, yon);
      if (o.cikis[0].yon !== tersYon(yan)) continue;
      const x = ist.bas.kx - o.cikis[0].hx;
      const y = ist.bas.ky - o.cikis[0].hy;
      if (yerlestirmeEngeli(c, tarla, tanim, x, y, yon)) continue;
      const tepe = agizTepesi(c, tarla, parcaOrnegi(tanim, 0, x, y, yon));
      if (!en || tepe > en.tepe) en = { x, y, yon, tepe };
    }
  }
  if (!en) return;
  komutEkle(c, { tur: 'sok', x: bant.x, y: bant.y });
  komutEkle(c, { tur: 'kur', parca: 'birlestirme-olugu', x: bant.x, y: bant.y, yon: bant.yon });
  komutEkle(c, { tur: 'kur', parca: 'huni', x: en.x, y: en.y, yon: en.yon });
}

/** Oyuncunun düzenli işleri: mıknatıs dolmadan Boşalt, sıkışan presi Temizle, krankı çevir. */
function bakim(d, ist) {
  const c = d.ciftlik;
  const m = parca(c, ist, SIRA.miknatis);
  if (m?.tanim.anahtar === 'oluk-miknatisi' && m.ozel.tutucu.length >= 3) {
    komutEkle(c, { tur: 'bosalt', x: m.x, y: m.y });
  }
  const p = parca(c, ist, SIRA.pres);
  if (p?.tanim.anahtar === 'balya-presi' && p.tikali) {
    komutEkle(c, { tur: 'temizle', x: p.x, y: p.y });
  }
  const kr = parcaAt(c, ist.kx + SIRA.pres + 1, ist.ky + 2);
  if (kr?.tanim.anahtar === 'el-kranki' && kr.ozel.kalan <= 0) {
    komutEkle(c, { tur: 'krank', x: kr.x, y: kr.y, ciftci: c.ciftci });
  }
}

/** D4: pres (3×2) sıraya, el krankı altına; çiftçi krankın yanına geçer. */
function presKoy(d, ist) {
  const c = d.ciftlik;
  degistir(c, ist, SIRA.pres, 3, 'balya-presi');
  komutEkle(c, { tur: 'kur', parca: 'el-kranki', x: ist.kx + SIRA.pres + 1, y: ist.ky + 2 });
  Object.assign(d.karakter, { x: (ist.kx + SIRA.pres + 2) * KARO + 1, y: (ist.ky + 2) * KARO + 1 });
}

/** D5: kalbur (2×1) sıraya; ince (toz) yan çıkışı güneydeki sandığa. */
function kalburKoy(d, ist) {
  const c = d.ciftlik;
  degistir(c, ist, SIRA.kalbur, 2, 'kalbur');
  komutEkle(c, { tur: 'kur', parca: 'sandik', x: ist.kx + SIRA.kalbur + 1, y: ist.ky + 1 });
}

/**
 * Senaryoyu koşar. hedef: 'D1'..'D5'; tikTavan: en çok tik (30 dk = 36000). Döner:
 * { basildi, tik, damgalar, damgaTik (damga → basıldığı tik), civiAraliklari } (öğretici
 * çivilerinin açığa çıktığı ardışık tikler arası fark).
 */
export async function senaryoKos(
  { hedef = 'D5', tikTavan = 30 * 1200, etiket = 'senaryo-1' } = {},
) {
  modAc('ciftlik', { etiket });
  const d = durumAl();
  const c = d.ciftlik;
  const ist = ilkHat(d);
  const civiTikleri = [];
  const CIVI = esyaKodu('civi');
  const birak = dinle('gomulu-cikti', ({ nesne, tur }) => {
    if (tur === CIVI && nesne?.ogretici) civiTikleri.push(c.tik);
  });
  let zaman = 1000;
  const damgaTik = {};
  const bas = (ad) => UYARLAYICI.damgalar(c).includes(ad);
  const yapildi = new Set();
  const bir = (ad, kosul, islev) => {
    if (!yapildi.has(ad) && kosul) {
      yapildi.add(ad);
      islev();
    }
  };
  while (c.tik < tikTavan && !bas(hedef)) {
    zaman = ilerle(d, zaman, 20);
    for (const ad of ['D1', 'D2', 'D3', 'D4', 'D5']) {
      if (bas(ad) && !(ad in damgaTik)) damgaTik[ad] = c.tik;
    }
    bir('miknatis', bas('D1'), () => degistir(c, ist, SIRA.miknatis, 1, 'oluk-miknatisi'));
    bir('huni2', bas('D1'), () => ikinciHuni(d, ist));
    bir('pres', bas('D3'), () => presKoy(d, ist));
    bir('kalbur', bas('D4'), () => kalburKoy(d, ist));
    bakim(d, ist);
  }
  birak();
  return {
    basildi: bas(hedef), tik: c.tik, damgalar: UYARLAYICI.damgalar(c), damgaTik,
    civiAraliklari: civiTikleri.slice(1).map((t, i) => t - civiTikleri[i]),
    icerik: (ad) => [...c.parcalar.values()].filter((p) => p.tanim.anahtar === ad)
      .map(parcaIcerigi),
  };
}
