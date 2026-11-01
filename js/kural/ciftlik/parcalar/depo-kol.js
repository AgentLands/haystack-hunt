/**
 * Çiftlik parçaları: Depo ve kol ailesi (docs/ciftlik/parcalar.md 19-21, ekonomi.md §2):
 * ambar (600 eşya; nemi cezalandırır: 1200 tikte ⌈yaş ot / 4⌉ çürür), defter masası (iğne ve
 * buluntu: tam kuruş + defter), yaba kolu (arkadaki depo/hat karosundan filtreye uyanı alır,
 * öndeki parçaya ya da hat karosuna bırakır; 16 tik salınım) ve Komşu kapısı (kurulu gelir,
 * sökülmez; kabul tarafı: sipariş → fazlasını sat → at; iğne/buluntu oyuncuya iade).
 * Sandık ve ambar iğne/buluntuyu "bulundu" sayar (yarı kuruş), depoda tutmaz.
 * SAP (G ekonomi): kapı teslimi `kapiTeslimKur(islev(ctx, kod, p) → { sonuc, kurus? })`;
 * varsayılan hiçbir siparişe uymaz ("fazlasını sat" açıksa değeri olanı satar).
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaKodu, esyaTanimi } from '../esya.js';
import { DX, DY } from '../olcu.js';
import { ozellik, degerliMi, esyaAdi as ad } from '../isleme/esya-ozellik.js';
import {
  bulundu, kurusEkle, samanCikti, girisBekleyen,
} from '../isleme/bulundu.js';
import { karodanCek, karoyaBirak } from '../isleme/hat-el.js';
import { depodanCek } from './temel.js';

/** Denge sayıları (parcalar.md; G denge.js'e taşıyabilir). */
export const DEPO_KOL = {
  ambar: { kap: 600, curume: 1200, bolen: 4 },
  kol: { salinim: 16 },
};
const YAS = esyaKodu('yas-ot');
const CURUK = esyaKodu('curuk-ot');
/** Yaba kolu filtre sınıfları (esyalar.md §1 `sinif`). */
export const SINIFLAR = ['saman', 'urun', 'igne', 'metal', 'cop', 'buluntu'];

const satirlar = (say) => Object.entries(say).map(([kod, n]) => [ad(Number(kod)), n]);

/** Ambar: dört kenarın orta karosundan alır; yaş ot zamanla çürür. */
parcaTanimla('ambar', {
  kod: 19, ad: 'Ambar', aile: 'depo', boyut: [3, 3], yonlu: false,
  girisler: [{ x: 1, y: 0, yon: 3 }, { x: 2, y: 1, yon: 0 }, { x: 1, y: 2, yon: 1 },
    { x: 0, y: 1, yon: 2 }],
  maliyet: { kurus: 180 }, kilit: 'D7',
  kur(p) {
    Object.assign(p.ozel, { say: {}, toplam: 0, sayac: 0, curuyen: 0 });
  },
  kabulEder(p, port, kod) {
    return degerliMi(kod) || p.ozel.toplam < DEPO_KOL.ambar.kap;
  },
  al(p, port, kod, ctx) {
    if (degerliMi(kod)) {
      bulundu(ctx, kod, 'ambar', 'yari', p);
      return;
    }
    p.ozel.say[kod] = (p.ozel.say[kod] ?? 0) + 1;
    p.ozel.toplam += 1;
    ctx.sayac('depolanan', kod);
  },
  adim(ctx, p) {
    const o = p.ozel;
    if (++o.sayac < DEPO_KOL.ambar.curume) return;
    o.sayac = 0;
    const n = o.say[YAS] ?? 0;
    const k = Math.ceil(n / DEPO_KOL.ambar.bolen);
    o.curuyen = k;
    if (!k) return;
    if (n === k) delete o.say[YAS];
    else o.say[YAS] = n - k;
    o.say[CURUK] = (o.say[CURUK] ?? 0) + k;
  },
  cek(p, uygun) {
    return depodanCek(p.ozel, uygun);
  },
  icerik(p) {
    return { esya: Object.entries(p.ozel.say).map(([kod, n]) => [Number(kod), n]), saman: 0 };
  },
  durum(p) {
    return p.ozel.toplam >= DEPO_KOL.ambar.kap ? 'dolu' : 'calisiyor';
  },
  incele(p) {
    const o = p.ozel;
    const neden = o.toplam >= DEPO_KOL.ambar.kap ? 'Dolu: girdi bekliyor'
      : o.say[YAS] ? 'Yaş ot çürüyor: kurut ya da çıkar' : 'Depoluyor';
    return [['Durum', neden], ['Dolu', `${o.toplam}/${DEPO_KOL.ambar.kap}`],
      ['Son çürüyen', o.curuyen], ...satirlar(o.say)];
  },
});

/** Defter masası: iğne ve buluntu alır (tam kuruş + defter); başka eşya girişte bekler. */
parcaTanimla('defter-masasi', {
  kod: 20, ad: 'Defter masası', aile: 'depo', boyut: [2, 1],
  girisler: [{ x: 0, y: 0, yon: 2 }, { x: 0, y: 0, yon: 3 }, { x: 0, y: 0, yon: 1 }],
  maliyet: { kurus: 40 }, kilit: 'D2',
  kur(p) {
    Object.assign(p.ozel, { sayi: 0, kurus: 0, son: 0, bekleyen: 0 });
  },
  kabulEder(p, port, kod) {
    return degerliMi(kod);
  },
  al(p, port, kod, ctx) {
    const o = p.ozel;
    o.kurus += bulundu(ctx, kod, 'masa', 'tam', p);
    o.sayi += 1;
    o.son = kod;
  },
  adim(ctx, p) {
    p.ozel.bekleyen = girisBekleyen(ctx.c, p);
  },
  durum(p) {
    return p.ozel.bekleyen ? 'yabanci' : 'calisiyor';
  },
  incele(p) {
    const o = p.ozel;
    const neden = o.bekleyen ? `Yabancı: ${ad(o.bekleyen)} (yalnız iğne ve buluntu)`
      : 'İğne ve buluntu bekliyor';
    return [['Durum', neden], ['Bulunan', o.sayi], ['Kazanılan', `${o.kurus} kuruş`],
      ['Son', o.son ? ad(o.son) : '-']];
  },
});

/**
 * Kol filtresi (ag/ayar.js biçimi + manyetik): { tur: 'hepsi' } | { tur: 'esya', kod } |
 * { tur: 'sinif', sinif } | { tur: 'manyetik' } → uygunluk işlevi. Seçimi eksik ({ tur:
 * 'esya' } kodsuz, { tur: 'sinif' } sınıfsız) → null: kol "ayar" rozetiyle bekler.
 */
export function filtreIslevi(f) {
  if (f?.tur === 'hepsi') return () => true;
  if (f?.tur === 'manyetik') return (kod) => ozellik(kod).manyetik;
  if (f?.tur === 'esya' && f.kod) return (kod) => kod === f.kod;
  if (f?.tur === 'sinif' && f.sinif) return (kod) => ozellik(kod).sinif === f.sinif;
  return null;
}

/** Filtre geçerli mi (komut doğrulaması; seçimsiz 'esya'/'sinif' de geçerli)? */
function filtreGecerli(f) {
  if (!f || typeof f !== 'object') return false;
  if (f.tur === 'hepsi' || f.tur === 'manyetik') return true;
  if (f.tur === 'esya') return f.kod === undefined || Boolean(esyaTanimi(f.kod));
  return f.tur === 'sinif' && (f.sinif === undefined || SINIFLAR.includes(f.sinif));
}

/** Yaba kolu: arkadan alır, 16 tik salınır, öne bırakır; bırakamazsa havada bekler. */
parcaTanimla('yaba-kolu', {
  kod: 21, ad: 'Yaba kolu', aile: 'depo', boyut: [1, 1], maliyet: { kurus: 30 }, kilit: 'D2',
  kur(p) {
    Object.assign(p.ozel, { el: 0, il: 0, filtre: { tur: 'hepsi' }, hal: 'ac' });
  },
  adim(ctx, p) {
    const o = p.ozel;
    if (!o.el) {
      const uygun = filtreIslevi(o.filtre);
      if (!uygun) {
        o.hal = 'ayar';
        return;
      }
      o.el = karodanCek(ctx, p, p.x - DX[p.yon], p.y - DY[p.yon], uygun);
      o.hal = o.el ? 'calisiyor' : 'ac';
      if (!o.el) return;
      o.il = 0;
    }
    const tam = DEPO_KOL.kol.salinim * 1024;
    if (o.il < tam) o.il = Math.min(tam, o.il + ctx.oran(p));
    if (o.il < tam) return;
    if (karoyaBirak(ctx, p, p.x + DX[p.yon], p.y + DY[p.yon], o.el)) {
      o.el = 0;
      o.il = 0;
      o.hal = 'calisiyor';
    } else o.hal = 'cikis-dolu';
  },
  ayarlar: { filtre: { ad: 'Filtre', tur: 'filtre', manyetik: true } },
  ayarla(p, ad, deger) {
    if (ad !== 'filtre' || !filtreGecerli(deger)) return false;
    const { tur, kod, sinif } = deger;
    p.ozel.filtre = { tur, ...(kod !== undefined && { kod }), ...(sinif && { sinif }) };
    return true;
  },
  icerik(p) {
    return { esya: p.ozel.el ? [[p.ozel.el, 1]] : [], saman: 0 };
  },
  durum(p) {
    return p.ozel.hal;
  },
  incele(p) {
    const o = p.ozel;
    const neden = { ac: 'Arkada uygun eşya yok', ayar: 'Filtre seçilmemiş',
      'cikis-dolu': 'Bırakamıyor: önündeki almıyor', calisiyor: 'Taşıyor' }[o.hal];
    const f = o.filtre;
    const filtre = { hepsi: 'Hepsi', manyetik: 'Manyetik', esya: f.kod ? ad(f.kod) : 'Tür?',
      sinif: f.sinif ?? 'Sınıf?' }[f.tur];
    return [['Durum', neden], ['Filtre', filtre], ['Elinde', o.el ? ad(o.el) : '-']];
  },
});

/**
 * Kapı teslimi (G'nin ekonomi/siparis.js teslimEt(c, kod, olay) sözleşmesi): { sonuc:
 * 'siparis' | 'iade' | 'satildi' | 'atildi', kurus? }. İğne/buluntu "bulundu" (kuruşsuz)
 * sayılır; 'iade'de kapı eşyayı oyuncunun envanterine koyar. SAP: sipariş yok, fazlasını
 * sat kapı ayarından (G gelince `kapiTeslimKur` ile teslimEt bağlanır, ayar ekonomiye geçer).
 */
let kapiTeslimi = (ctx, kod, p) => {
  if (degerliMi(kod)) {
    bulundu(ctx, kod, 'kapi', 'kurussuz', p);
    return { sonuc: 'iade' };
  }
  const deger = ozellik(kod).deger;
  if (!p.ozel.sat || deger <= 0) return { sonuc: 'atildi' };
  kurusEkle(ctx.c, deger);
  return { sonuc: 'satildi', kurus: deger };
};
export function kapiTeslimKur(islev) {
  kapiTeslimi = islev;
}

/** Komşu kapısı: sınırsız alır, asla tıkanmaz; kurulu gelir, sökülmez, palette yok. */
parcaTanimla('komsu-kapisi', {
  kod: 31, ad: 'Komşu kapısı', aile: 'depo', boyut: [2, 2], sokulmez: true, paletDisi: true,
  girisler: [{ x: 0, y: 0, yon: 2 }, { x: 0, y: 1, yon: 2 }],
  ayarlar: { sat: { ad: 'Fazlasını sat', tur: 'iki', secenekler: [1, 0] } },
  kur(p) {
    Object.assign(p.ozel, { sat: 1, siparis: 0, satildi: 0, atildi: 0, iade: 0, kurus: 0 });
  },
  kabulEder() {
    return true;
  },
  al(p, port, kod, ctx) {
    const o = p.ozel;
    const s = kapiTeslimi(ctx, kod, p);
    o[s.sonuc] += 1;
    if (s.sonuc === 'iade') ctx.c.envanter[kod] += 1;
    else samanCikti(ctx.c, kod);
    if (s.sonuc === 'satildi') {
      o.kurus += s.kurus ?? 0;
      ctx.sayac('satilan', kod);
    } else if (s.sonuc === 'atildi') ctx.sayac('bosa', kod);
  },
  incele(p) {
    const o = p.ozel;
    return [['Durum', o.sat ? 'Fazlasını satıyor' : 'Siparişe uymayanı atıyor'],
      ['Siparişe', o.siparis], ['Satılan', `${o.satildi} (${o.kurus} kuruş)`],
      ['Boşa giden', o.atildi], ['Geri getirilen', o.iade]];
  },
});
