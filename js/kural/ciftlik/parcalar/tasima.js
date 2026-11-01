/**
 * Çiftlik parçaları: Taşıma ailesi (docs/ciftlik/parcalar.md 5-7): çatal, birleştirme oluğu,
 * menfez. Bant temel.js'te. Çatal ve oluk portlu düğümdür (tasima/dugum.js), menfez sanal hat
 * parçasıdır (hat.ardil/uzunluk/kopuk kancaları, tasima/menfez.js).
 * Kodlar (kayıtta saklanır, yeniden kullanılmaz): çatal 40, birleştirme oluğu 41, menfez 42.
 * Port sırası: çatal çıkışları [ön, sol, sağ], oluk girişleri [arka, sol, sağ]; sol/sağ
 * parçanın baktığı yöne göredir (doğuya bakarken sol kuzey, sağ güney).
 */
import { parcaTanimla } from '../parca-kayit.js';
import { BIRIM, karoIndeks } from '../olcu.js';
import {
  dagit, oncelikle, tamponKabul, tamponAl, tamponVer, yuvaKabul, yuvaAl, yuvaVer,
  bekleIsle, bekleyenVar,
} from '../tasima/dugum.js';
import { menfezEsi, MENFEZ_ARA_EN_AZ, MENFEZ_ARA_EN_COK } from '../tasima/menfez.js';
import { BANT_HIZ } from './temel.js';

/** Çatal dağıtım kipleri: sırayla (dönüşümlü) | taşma (önce ön, sonra sol, sonra sağ). */
export const CATAL_KIPLERI = ['sirayla', 'tasma'];
const YAN_ADI = ['ön', 'sol', 'sağ'];
const GIRIS_ADI = ['arka', 'sol', 'sağ'];

/** Düğümün neden cümlesi (inceleme panelinin ilk satırı). */
function dugumNeden(p, bos) {
  if (!p.cikisHedef.some(Boolean)) {
    return 'Çıkış yok: hiçbir yan bir banda ya da parçaya bağlı değil';
  }
  if (bekleyenVar(p)) return 'Çıkış dolu: bağlı çıkışlar eşya almıyor';
  return bos ? 'Girdi bekliyor' : 'Akıyor';
}

function payMetni(say, adlar) {
  return say.map((n, i) => `${adlar[i]} ${n}`).join(' · ');
}

parcaTanimla('catal', {
  kod: 40, ad: 'Çatal', aile: 'tasima', boyut: [1, 1], kilit: 'D1', maliyet: { kurus: 20 },
  tampon: { giris: 1 },
  girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 0, y: 0, yon: 0 }, { x: 0, y: 0, yon: 3 }, { x: 0, y: 0, yon: 1 }],
  ayarlar: {
    kip: { ad: 'Dağıtım', secenekler: [['sirayla', 'Sırayla'], ['tasma', 'Taşma']] },
  },
  /** Ayar komutunun çağıracağı yer: başarılıysa true. */
  ayarla(p, ad, deger) {
    if (ad !== 'kip' || !CATAL_KIPLERI.includes(deger)) return false;
    p.ozel.kip = deger;
    return true;
  },
  kur(p) {
    Object.assign(p.ozel, { tampon: [], sira: 0, bekle: 0, kip: 'sirayla', say: [0, 0, 0] });
  },
  kabulEder: (p) => tamponKabul(p),
  al: (p, port, kod) => tamponAl(p, kod),
  adim(ctx, p) {
    let gecti = false;
    tamponVer(p, (kod) => {
      const dagitici = p.ozel.kip === 'tasma' ? oncelikle : dagit;
      const k = dagitici(ctx, p, kod);
      if (k < 0) return false;
      p.ozel.say[k] += 1;
      gecti = true;
      return true;
    });
    bekleIsle(p, p.ozel.tampon.length > 0 && !gecti);
  },
  icerik: (p) => ({ esya: p.ozel.tampon.map((kod) => [kod, 1]), saman: 0 }),
  durum: (p) => (bekleyenVar(p) ? 'cikis-dolu' : 'calisiyor'),
  incele: (p) => [
    ['Durum', dugumNeden(p, p.ozel.tampon.length === 0)],
    ['Dağıtım', p.ozel.kip === 'tasma' ? 'Taşma (ön, sol, sağ)' : 'Sırayla'],
    ['Tampon', `${p.ozel.tampon.length}/1`],
    ['Çıkış payı', payMetni(p.ozel.say, YAN_ADI)],
  ],
});

parcaTanimla('birlestirme-olugu', {
  kod: 41, ad: 'Birleştirme oluğu', aile: 'tasima', boyut: [1, 1], kilit: 'D1',
  maliyet: { kurus: 20 },
  girisler: [{ x: 0, y: 0, yon: 2 }, { x: 0, y: 0, yon: 3 }, { x: 0, y: 0, yon: 1 }],
  cikislar: [{ x: 0, y: 0, yon: 0 }],
  kur(p) {
    Object.assign(p.ozel, { yuva: [0, 0, 0], sira: 0, bekle: 0, pay: [0, 0, 0] });
  },
  kabulEder: (p, port) => yuvaKabul(p, port),
  al: (p, port, kod) => yuvaAl(p, port, kod),
  adim(ctx, p) {
    const k = yuvaVer(p, (kod) => ctx.ver(p, 0, kod));
    if (k >= 0) p.ozel.pay[k] += 1;
    bekleIsle(p, p.ozel.yuva.some(Boolean) && k < 0);
  },
  icerik: (p) => ({ esya: p.ozel.yuva.filter(Boolean).map((kod) => [kod, 1]), saman: 0 }),
  durum: (p) => (bekleyenVar(p) ? 'cikis-dolu' : 'calisiyor'),
  incele: (p) => [
    ['Durum', dugumNeden(p, !p.ozel.yuva.some(Boolean))],
    ['Giriş payı', payMetni(p.ozel.pay, GIRIS_ADI)],
    ['Bekleyen', `${p.ozel.yuva.filter(Boolean).length}/3`],
  ],
});

/**
 * Menfez: aynı yöne bakan iki ağız (çift); arka ağız giriş, ön ağız çıkış. Hat parçasıdır:
 * giriş ağzının ardılı çıkış ağzı, hat boyu mesafe × BIRIM (sanal hat, bant hızı). Eşi
 * olmayan menfez hat dışıdır ('essiz' rozeti, eşya girmez). p.ozel yalnız arayüz içindir
 * (eş, rol, mesafe; her tik tazelenir, kural her seferinde topolojiden hesaplanır).
 */
parcaTanimla('menfez', {
  kod: 42, ad: 'Menfez', aile: 'tasima', boyut: [1, 1], kilit: 'D2', maliyet: { kurus: 15 },
  menfez: true,
  hat: {
    hiz: BANT_HIZ,
    ardil(p, c) {
      const e = menfezEsi(c, p);
      return e?.rol === 'giris' ? karoIndeks(e.es.x, e.es.y) : undefined;
    },
    uzunluk(p, c) {
      const e = menfezEsi(c, p);
      return e?.rol === 'giris' ? e.mesafe * BIRIM : BIRIM;
    },
    kopuk: (p, c) => menfezEsi(c, p) === null,
  },
  kur(p) {
    Object.assign(p.ozel, { es: 0, rol: 0, mesafe: 0 });
  },
  adim(ctx, p) {
    const e = menfezEsi(ctx.c, p);
    const o = p.ozel;
    o.es = e ? e.es.id : 0;
    o.rol = e ? (e.rol === 'giris' ? 1 : 2) : 0;
    o.mesafe = e ? e.mesafe : 0;
  },
  durum: (p) => (p.ozel.rol === 0 ? 'essiz' : 'calisiyor'),
  incele: (p) => (p.ozel.rol === 0
    ? [['Durum', `Eşsiz: ${MENFEZ_ARA_EN_AZ}-${MENFEZ_ARA_EN_COK} karo arayla aynı yöne bakan `
      + 'bir menfez yok; eşya girmez']]
    : [['Durum', 'Akıyor'], ['Ağız', p.ozel.rol === 1 ? 'Giriş' : 'Çıkış'],
      ['Mesafe', `${p.ozel.mesafe} karo`]]),
});
