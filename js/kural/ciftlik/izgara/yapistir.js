/**
 * Küme komutları (tek işlemde, hepsi ya hiç) ve hazır şablon:
 *   { tur: 'yapistir', parcalar: [{ kod, x, y, yon, ayar }] }   mutlak yerleşim (arayüz
 *       kopyayı konumlandırıp yollar; yeniden oynatma pano durumuna bağlı değildir). Tikte
 *       önce bütün küme denetlenir; tek engel/kilit/kuruş eksiği varsa HİÇBİRİ kurulmaz
 *       ('komut-reddedildi' neden 'yapistir-engelli' + engelliKaro, eksik). Sonra sırayla
 *       kurulur ve bedeli ödenir (kurulumOde); beklenmedik bir ret olursa kurulanlar geri
 *       sökülür (bedelsiz).
 *   { tur: 'sokAlan', xa, ya, xb, yb }   dikdörtgene değen bütün parçaları 'sok' gibi söker
 *       (bedel iadesi, söküm kancaları; Komşu kapısı sökülmez).
 *   { tur: 'ayarTasi', x, y, ayar }      karodaki parçaya ayarı yazar (pipet ortak ayarı).
 * Olaylar: 'parca-kuruldu' (parça başına), 'yapistirildi' { parcalar },
 * 'parca-sokuldu' (parça başına), 'alan-sokuldu' { parcalar }, 'ayar-tasindi' { parca }.
 * `hazirSablonlar()`: "Önerilen ilk hat" (huni, 6 bant, sandık).
 */
import { komutTanimla, parcaKur, parcaSok, oyuncuSokumu } from '../komut.js';
import { kurulumOde } from '../ekonomi/kurus.js';
import { parcaTanimi } from '../parca-kayit.js';
import { parcaAt } from '../izgara.js';
import { ayarYaz } from './kume.js';
import { yerlesimDenetle } from './denetim.js';

const red = (olaylar, komut, neden, ek = {}) => {
  olaylar.push({ ad: 'komut-reddedildi', veri: { komut, neden, ...ek } });
};

komutTanimla('yapistir', (c, tarla, k, olaylar) => {
  const yerler = Array.isArray(k.parcalar) ? k.parcalar : [];
  if (!yerler.length || yerler.some((q) => !parcaTanimi(q.kod))) {
    return red(olaylar, k, 'bilinmeyen');
  }
  const d = yerlesimDenetle(c, tarla, yerler);
  if (!d.gecerli) {
    return red(olaylar, k, 'yapistir-engelli', { engelliKaro: d.engelliKaro, eksik: d.eksik });
  }
  const kurulan = [];
  for (const q of yerler) {
    const s = parcaKur(c, tarla, parcaTanimi(q.kod).anahtar, q.x, q.y, q.yon);
    if (!s.parca) {
      for (const p of kurulan.reverse()) parcaSok(c, tarla, p);
      return red(olaylar, k, s.neden);
    }
    ayarYaz(s.parca, q.ayar);
    kurulan.push(s.parca);
  }
  for (const p of kurulan) {
    kurulumOde(c, p); // bedel denetimi yerlesimDenetle'de (hepsi ya hiç)
    olaylar.push({ ad: 'parca-kuruldu', veri: { parca: p } });
  }
  olaylar.push({ ad: 'yapistirildi', veri: { parcalar: kurulan } });
  return undefined;
});

komutTanimla('sokAlan', (c, tarla, k, olaylar) => {
  const bulunan = new Map();
  for (let ky = Math.min(k.ya, k.yb); ky <= Math.max(k.ya, k.yb); ky++) {
    for (let kx = Math.min(k.xa, k.xb); kx <= Math.max(k.xa, k.xb); kx++) {
      const p = parcaAt(c, kx, ky);
      if (p) bulunan.set(p.id, p);
    }
  }
  const sokulen = [...bulunan.values()].filter((p) => !p.tanim.sokulmez)
    .sort((a, b) => a.id - b.id);
  if (!sokulen.length) return red(olaylar, k, 'bos');
  for (const p of sokulen) oyuncuSokumu(c, tarla, p, olaylar); // iade + söküm kancaları
  olaylar.push({ ad: 'alan-sokuldu', veri: { parcalar: sokulen } });
  return undefined;
});

komutTanimla('ayarTasi', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  if (!p) return red(olaylar, k, 'bos');
  if (ayarYaz(p, k.ayar)) olaylar.push({ ad: 'ayar-tasindi', veri: { parca: p } });
  return undefined;
});

/** Hazır şablonlar (yuvaya girmez): { ad, kume }. Kayıtlı parçalar yüklendikten sonra çağır. */
export function hazirSablonlar() {
  const kod = (anahtar) => parcaTanimi(anahtar).kod;
  const bant = [2, 3, 4, 5, 6, 7].map((x) => ({ kod: kod('bant'), x, y: 0, yon: 0, ayar: {} }));
  const parcalar = [
    { kod: kod('huni'), x: 0, y: 0, yon: 0, ayar: {} }, ...bant,
    { kod: kod('sandik'), x: 8, y: 0, yon: 0, ayar: {} },
  ];
  return [{ id: 'ilk-hat', ad: 'Önerilen ilk hat', kume: { en: 9, boy: 2, parcalar } }];
}
