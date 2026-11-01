/**
 * Çiftlik parçaları: Depo ve kol ailesi (docs/ciftlik/parcalar.md 19-21, ekonomi.md §2):
 * ambar (600 eşya; nemi cezalandırır: 1200 tikte ⌈yaş ot / 4⌉ çürür), defter masası (iğne ve
 * buluntu: tam kuruş + defter), yaba kolu (arkadaki depo/hat karosundan filtreye uyanı alır,
 * öndeki parçaya ya da hat karosuna bırakır; 16 tik salınım) ve Komşu kapısı (kurulu gelir,
 * sökülmez; kabul tarafı: sipariş → fazlasını sat → at; iğne/buluntu oyuncuya iade).
 * Sandık ve ambar iğne/buluntuyu "bulundu" sayar (yarı kuruş), depoda tutmaz.
 * SAP (G ekonomi): kapının sipariş eşlemesi `kapiSiparisKur(islev(ctx, kod) → bool)`;
 * varsayılan hiçbir siparişe uymaz (hepsini sat).
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaKodu, esyaTanimi } from '../esya.js';
import { DX, DY } from '../olcu.js';
import { ozellik, degerliMi } from '../isleme/esya-ozellik.js';
import {
  bulundu, oyuncuyaVer, kurusEkle, samanCikti, girisBekleyen,
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
const ad = (kod) => esyaTanimi(kod)?.ad ?? `#${kod}`;
/** Yaba kolu filtre sınıfları (esyalar.md §1 `sinif`). */
export const SINIFLAR = ['saman', 'urun', 'igne', 'metal', 'cop', 'buluntu'];

/** SAP (G): kapıya gelen eşya etkin bir siparişe sayıldıysa true. */
let kapiSiparisi = () => false;
export function kapiSiparisKur(islev) {
  kapiSiparisi = islev;
}

const satirlar = (say) => Object.entries(say).map(([kod, n]) => [ad(Number(kod)), n]);

/** Ambar: dört kenarın orta karosundan alır; yaş ot zamanla çürür. */
parcaTanimla('ambar', {
  kod: 119, ad: 'Ambar', aile: 'depo', boyut: [3, 3], yonlu: false,
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
  kod: 120, ad: 'Defter masası', aile: 'depo', boyut: [2, 1],
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
 * Filtre dizgesi → uygunluk işlevi: 'hepsi' | 'manyetik' | 'tur:<kod>' | 'sinif:<ad>'.
 * Seçimi boş ('tur:', 'sinif:') → null (kol "ayar" rozetiyle bekler).
 */
export function filtreIslevi(filtre) {
  if (filtre === 'hepsi') return () => true;
  if (filtre === 'manyetik') return (kod) => ozellik(kod).manyetik;
  const [tip, deger] = filtre.split(':');
  if (!deger) return null;
  if (tip === 'tur') return (kod) => kod === Number(deger);
  if (tip === 'sinif') return (kod) => ozellik(kod).sinif === deger;
  return null;
}

/** Filtre geçerli mi (komut doğrulaması)? */
function filtreGecerli(f) {
  if (typeof f !== 'string') return false;
  if (f === 'hepsi' || f === 'manyetik' || f === 'tur:' || f === 'sinif:') return true;
  const [tip, deger] = f.split(':');
  if (tip === 'tur') return Boolean(esyaTanimi(Number(deger)));
  return tip === 'sinif' && SINIFLAR.includes(deger);
}

/** Yaba kolu: arkadan alır, 16 tik salınır, öne bırakır; bırakamazsa havada bekler. */
parcaTanimla('yaba-kolu', {
  kod: 121, ad: 'Yaba kolu', aile: 'depo', boyut: [1, 1], maliyet: { kurus: 30 }, kilit: 'D2',
  kur(p) {
    Object.assign(p.ozel, { el: 0, il: 0, filtre: 'hepsi', hal: 'ac' });
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
  ayarla(p, k) {
    if (k.ad !== 'filtre' || !filtreGecerli(k.deger)) return 'gecersiz';
    p.ozel.filtre = k.deger;
    return null;
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
    return [['Durum', neden], ['Filtre', o.filtre], ['Elinde', o.el ? ad(o.el) : '-']];
  },
});

/** Komşu kapısı: sınırsız alır, asla tıkanmaz; kurulu gelir, sökülmez, palette yok. */
parcaTanimla('komsu-kapisi', {
  kod: 131, ad: 'Komşu kapısı', aile: 'depo', boyut: [2, 2], sokulmez: true, paletDisi: true,
  girisler: [{ x: 0, y: 0, yon: 2 }, { x: 0, y: 1, yon: 2 }],
  kur(p) {
    Object.assign(p.ozel, { sat: 1, siparis: 0, satilan: 0, bosa: 0, iade: 0, kurus: 0 });
  },
  kabulEder() {
    return true;
  },
  al(p, port, kod, ctx) {
    const o = p.ozel;
    const d = degerliMi(kod);
    if (kapiSiparisi(ctx, kod)) {
      o.siparis += 1;
      if (d) bulundu(ctx, kod, 'kapi', 'yok', p);
      else samanCikti(ctx.c, kod);
      return;
    }
    if (d) {
      o.iade += 1;
      oyuncuyaVer(ctx, kod, 'kapi', 'yok', p);
      return;
    }
    samanCikti(ctx.c, kod);
    const deger = ozellik(kod).deger;
    if (o.sat && deger > 0) {
      kurusEkle(ctx.c, deger);
      o.satilan += 1;
      o.kurus += deger;
      ctx.sayac('satilan', kod);
    } else {
      o.bosa += 1;
      ctx.sayac('bosa', kod);
    }
  },
  ayarla(p, k) {
    if (k.ad !== 'sat' || ![0, 1, true, false].includes(k.deger)) return 'gecersiz';
    p.ozel.sat = k.deger ? 1 : 0;
    return null;
  },
  incele(p) {
    const o = p.ozel;
    return [['Durum', o.sat ? 'Fazlasını satıyor' : 'Siparişe uymayanı atıyor'],
      ['Siparişe', o.siparis], ['Satılan', `${o.satilan} (${o.kurus} kuruş)`],
      ['Boşa giden', o.bosa], ['Geri getirilen', o.iade]];
  },
});
