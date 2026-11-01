/**
 * Siparişler (ekonomi.md §3): üretim (saf), ödül, pano ve Komşu kapısı teslimi.
 * Pano üç yuvadır (`c.ekonomi.pano`): yuva 0 sıradaki damga kartı (hepsi bittiyse dönen
 * kart), 1-2 dönen kartlar. Biten kartın yerine PANO.yenileTik sonra yenisi gelir; "Geri
 * çevir" ile atılan kartın yerine geriCevirTik sonra. Sipariş başarısız olmaz, süresi dolmaz.
 * Kart: { tur, kisi, sira, odul, kalemler: [{ kabul: [eşya anahtarı], miktar, teslim }],
 *   bitis? (süreli), yabanci? (temiz), damga?, ad?, civisiz? }
 * Kapı (F) gelen her eşya için `teslimEt(c, kod, olay)` çağırır: önce damga kartı, sonra
 * soldan sağa uyan kalem sayılır; uymayan iğne/buluntu oyuncuya iade (defter, kuruş yok),
 * "fazlasını sat" açıksa değerli eşya taban fiyattan satılır, değilse atılır (boşa giden).
 * Tamamlanan kartlar tikin sonunda (`ekonomiAdim`, benzetim çağırır) ödenir; damga basılır.
 */
import { uretec } from '../../rastgele.js';
import { TIK_MS } from '../olcu.js';
import { esyaTanimi } from '../esya.js';
import { komutTanimla } from '../komut.js';
import { SIPARIS, PANO } from './denge.js';
import { acikParcalar, uretilebilir } from './acilis.js';
import {
  ilerlemeAl, siradakiDamga, etkinDamgaNo, damgaKarti, kartTamam, damgaBas,
} from './damga.js';
import {
  ekonomiAl, anahtarDegeri, esyaDegeri, bulunurSinif, bulundu, kurusEkle,
} from './kurus.js';
import { pencereEkle, satisKaydet } from './cevrimdisi.js';

const SANIYE = 1000 / TIK_MS;
const TURLER = Object.keys(SIPARIS.agirlik);
const HACIM_URUN = ['saman', 'kuru-ot', 'kiyim', 'balya-saman', 'balya-ot'];
const COP_URUN = ['toz', 'civi', 'tas'];
/** Kart sahipleri (yalnız görünür metin; arayüz değiştirebilir). */
const KISI = {
  hacim: ['Muhtar', 'Fırıncı', 'Değirmenci'], temiz: ['Ahırcı', 'Veteriner'],
  karisim: ['Kışlıkçı', 'Çoban'], sureli: ['Pazar arabası'], cop: ['Kümesçi', 'Demirci'],
  nadir: ['Komşunun kızı', 'Muhtarın oğlu'],
};

/** 5'in katına yuvarlar, en az 5. */
export const yuvarla5 = (x) => Math.max(5, Math.round(x / 5) * 5);

/** Sipariş boyu: yuvarla5(taban × (1 + 0,25 × d)). */
export function siparisBoyu(taban, d) {
  return yuvarla5((taban * (100 + SIPARIS.boyAdim * d)) / 100);
}

/** Ödül: Σ miktar × değer × çarpan (çöpte sabit; nadirde masa değeri × 1,5). */
export function odulHesapla(tur, kalemler) {
  if (tur === 'cop') {
    return kalemler.reduce((s, k) => s + k.miktar * SIPARIS.copOdul[k.kabul[0]], 0);
  }
  const taban = kalemler.reduce((s, k) => s + k.miktar * anahtarDegeri(k.kabul[0]), 0);
  return Math.floor((taban * SIPARIS.carpan[tur]) / 10);
}

/** Tamamlanan kartın ödenecek ödülü (süreli geç, temiz yabancı cezası). */
export function odenecekOdul(kart, tik) {
  if (kart.tur === 'sureli' && tik > kart.bitis) {
    return Math.floor((kart.odul * SIPARIS.gecYuzde) / 100);
  }
  if (kart.tur === 'temiz') {
    const yuzde = Math.max(SIPARIS.temizTaban, 100 - SIPARIS.temizCeza * kart.yabanci);
    return Math.floor((kart.odul * yuzde) / 100);
  }
  return kart.odul;
}

/**
 * Bir dönen sipariş üretir (saf): zar uretec(tohum ^ sira × 0x9e3779b1). acik: açık parça
 * kümesi; gorulen: çiftlik defterindeki buluntu türleri; onceki: bir önceki kartın türü
 * (aynısı gelmez); d: boy formülündeki damga numarası.
 */
export function siparisUret(tohum, sira, { acik, gorulen = [], onceki = null, d = 1 }) {
  const zar = uretec((tohum ^ Math.imul(sira, 0x9e3779b1)) >>> 0);
  const sec = (liste) => liste[Math.floor(zar() * liste.length)];
  const urun = HACIM_URUN.filter((u) => uretilebilir(u, acik));
  const aday = {
    hacim: urun, temiz: urun, sureli: urun, karisim: urun.length >= 2 ? urun : [],
    cop: COP_URUN.filter((u) => uretilebilir(u, acik)),
    nadir: uretilebilir('buluntu', acik) ? [...gorulen].sort() : [],
  };
  let turler = TURLER.filter((t) => aday[t].length && t !== onceki);
  if (!turler.length) turler = TURLER.filter((t) => aday[t].length);
  const toplam = turler.reduce((s, t) => s + SIPARIS.agirlik[t], 0);
  let r = Math.floor(zar() * toplam);
  const tur = turler.find((t) => (r -= SIPARIS.agirlik[t]) < 0);
  const kalem = (u, miktar) => ({ kabul: [u], miktar, teslim: 0 });
  let kalemler;
  if (tur === 'karisim') {
    const a = sec(aday.karisim);
    const b = sec(aday.karisim.filter((u) => u !== a));
    kalemler = [a, b].map((u) => kalem(u, yuvarla5(siparisBoyu(SIPARIS.taban[u], d) / 2)));
  } else if (tur === 'cop') {
    const u = sec(aday.cop);
    kalemler = [kalem(u, SIPARIS.copMiktar[u] ?? siparisBoyu(SIPARIS.taban[u], d))];
  } else if (tur === 'nadir') {
    kalemler = [kalem(`buluntu:${sec(aday.nadir)}`, 1)];
  } else {
    const u = sec(aday[tur]);
    kalemler = [kalem(u, tur === 'sureli' ? yuvarla5(SIPARIS.taban[u])
      : siparisBoyu(SIPARIS.taban[u], d))];
  }
  const kart = { tur, kisi: sec(KISI[tur]), sira, odul: odulHesapla(tur, kalemler), kalemler };
  if (tur === 'sureli') kart.sure = SIPARIS.sureliTik;
  if (tur === 'temiz') kart.yabanci = 0;
  return kart;
}

/** Yuva i için sıradaki kartı yaratır (damga ya da dönen). */
function yeniKart(c, e, il, i) {
  const damga = i === 0 ? siradakiDamga(il) : null;
  if (damga) return damgaKarti(damga);
  const kart = siparisUret(c.tohum, e.siparisSira, {
    acik: acikParcalar(il), gorulen: Object.keys(il.defterCiftlik), onceki: e.sonTur,
    d: etkinDamgaNo(il),
  });
  e.siparisSira += 1;
  e.sonTur = kart.tur;
  if (kart.sure) kart.bitis = c.tik + kart.sure;
  return kart;
}

/**
 * Kapıya gelen bir eşya. Dönüş { sonuc: 'siparis' | 'iade' | 'satildi' | 'atildi', yuva?,
 * kurus? }. olay(ad, veri): ctx.olay.
 */
export function teslimEt(c, kod, olay = null) {
  const e = ekonomiAl(c);
  const ad = esyaTanimi(kod)?.anahtar ?? '';
  const sinif = bulunurSinif(kod);
  const d2 = e.pano[0];
  if (d2?.civisiz && ad === 'civi') {
    for (const k of d2.kalemler) if (k.kabul) k.teslim = 0;
    olay?.('siparis-sifirlandi', { yuva: 0, neden: 'civi' });
  }
  for (let i = 0; i < e.pano.length; i++) {
    const kalem = e.pano[i]?.kalemler.find((k) => k.kabul?.includes(ad) && k.teslim < k.miktar);
    if (!kalem) continue;
    kalem.teslim += 1;
    if (sinif) bulundu(c, kod, 'kurussuz', olay);
    return { sonuc: 'siparis', yuva: i };
  }
  for (const k of e.pano) if (k?.tur === 'temiz') k.yabanci += 1;
  if (sinif) {
    bulundu(c, kod, 'kurussuz', olay);
    return { sonuc: 'iade' };
  }
  const deger = esyaDegeri(kod);
  if (e.fazlasiniSat && deger > 0) {
    kurusEkle(c, deger);
    satisKaydet(c, deger);
    e.satilan += 1;
    return { sonuc: 'satildi', kurus: deger };
  }
  e.bosa += 1;
  return { sonuc: 'atildi' };
}

/**
 * Her tik (benzetim, tik++'dan sonra): biten kartları öder (damga basar), boş yuvaları
 * doldurur (başlangıç panosu, gelis 0, olay vermez), saniyede bir çevrimdışı penceresine
 * yazar.
 */
export function ekonomiAdim(c, olaylar) {
  const e = ekonomiAl(c);
  const il = ilerlemeAl(c);
  const olay = (ad, veri) => olaylar.push({ ad, veri });
  for (let i = 0; i < e.pano.length; i++) {
    const kart = e.pano[i];
    if (kart && kartTamam(kart, il)) {
      const odul = kart.damga ? kart.odul : odenecekOdul(kart, c.tik);
      kurusEkle(c, odul);
      il.toplam.siparis += 1;
      e.pano[i] = null;
      e.gelis[i] = c.tik + PANO.yenileTik;
      olay('siparis-tamam', { yuva: i, kart, odul });
      if (kart.damga) {
        const { acilanlar } = damgaBas(il, kart.damga);
        olay('damga-basildi', { damga: kart.damga, ad: kart.ad, odul, acilanlar });
      }
    }
    if (!e.pano[i] && c.tik >= e.gelis[i]) {
      e.pano[i] = yeniKart(c, e, il, i);
      if (e.gelis[i] > 0) olay('siparis-geldi', { yuva: i, kart: e.pano[i] });
    }
  }
  if (c.tik % SANIYE === 0) pencereEkle(c);
}

/** "Geri çevir": dönen kart atılır, yerine geriCevirTik sonra yenisi. Neden ya da null. */
export function siparisCevir(c, yuva) {
  const e = ekonomiAl(c);
  const kart = e.pano[yuva];
  if (!kart) return 'bos';
  if (kart.damga) return 'damga';
  e.pano[yuva] = null;
  e.gelis[yuva] = c.tik + PANO.geriCevirTik;
  return null;
}

const red = (olaylar, komut, neden) => {
  olaylar.push({ ad: 'komut-reddedildi', veri: { komut, neden } });
};

// Komutlar (kapı paneli ve pano): { tur: 'siparisCevir', yuva }, { tur: 'kapiSat', acik }.
// Kuyu komutları ({ tur: 'arabaCagir' }, { tur: 'cayirGenislet' }) dünyanındır
// (dunya/araba.js, dunya/arazi.js); bedeli kurus.js kuyuOde öder.
komutTanimla('siparisCevir', (c, tarla, k, olaylar) => {
  const neden = siparisCevir(c, k.yuva);
  if (neden) red(olaylar, k, neden);
  else olaylar.push({ ad: 'siparis-cevrildi', veri: { yuva: k.yuva } });
});

komutTanimla('kapiSat', (c, tarla, k) => {
  ekonomiAl(c).fazlasiniSat = Boolean(k.acik);
});
