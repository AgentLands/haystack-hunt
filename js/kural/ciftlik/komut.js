/**
 * Komutlar: oyuncu eylemleri benzetime yalnız komutla girer (komutEkle → c.kuyruk) ve
 * sonraki tikin başında sırayla uygulanır. Yerleşik komutlar:
 *   { tur: 'kur', parca: anahtar, x, y, yon }   x, y: döndürülmüş kutunun sol üst karosu
 *   { tur: 'sok', x, y }                        karodaki parçayı söker
 *   { tur: 'dondur', x, y, yon? }               yerinde döndürür (yon yoksa +1)
 * Yeni komut türü: komutTanimla(tur, uygula(c, tarla, komut, olaylar)). Uygulama sonucu
 * olay olarak döner: 'parca-kuruldu' { parca }, 'parca-sokuldu' { parca, iade },
 * 'parca-dondu' { parca }, 'komut-reddedildi' { komut, neden }.
 * Söküm iadesi: parçanın eşyaları envantere, ham saman katı parçanın yerine dökülür;
 * sonra söküm kancaları (sokumKancasiEkle) çalışır. `tanim.sokulmez` parça (Komşu kapısı)
 * sökülmez ve döndürülmez (neden 'sokulmez').
 * Ekonomi (ekonomi/kurus.js): 'kur' komutu kilidi ve kuruşu denetler (red nedeni 'kilitli'
 * | 'kurus') ve bedeli öder; 'sok' bedeli %100 iade eder (iade.kurus). parcaKur/parcaSok
 * doğrudan çağrılınca (test, dünya kurulumu) kuruş işlemez.
 */
import { KARO } from './olcu.js';
import { parcaTanimi, parcaOrnegi, parcaIcerigi, portlariYenile } from './parca-kayit.js';
import { yerlestirmeEngeli, izgarayaKoy, izgaradanAl, parcaAt } from './izgara.js';
import { samanDok } from './saman.js';
import { donmusBoyut } from './olcu.js';
import { kurulumEngeli, kurulumOde, sokumIade } from './ekonomi/kurus.js';

const komutlar = new Map();
const sokumKancalari = [];

/** Söküm sonrası kanca: islev(c, tarla, p, iade, olaylar) (ör. iğne/buluntu iadesi). */
export function sokumKancasiEkle(islev) {
  sokumKancalari.push(islev);
}

/** Yeni komut türü kaydeder. */
export function komutTanimla(tur, uygula) {
  if (komutlar.has(tur)) throw new Error(`komutTanimla: "${tur}" zaten var`);
  komutlar.set(tur, uygula);
}

/** Kuyruktaki bütün komutları sırayla uygular (tikAt çağırır). */
export function komutlariUygula(c, tarla, olaylar) {
  if (!c.kuyruk.length) return;
  const kuyruk = c.kuyruk;
  c.kuyruk = [];
  for (const k of kuyruk) {
    const uygula = komutlar.get(k.tur);
    if (!uygula) {
      olaylar.push({ ad: 'komut-reddedildi', veri: { komut: k, neden: 'bilinmeyen' } });
      continue;
    }
    uygula(c, tarla, k, olaylar);
  }
}

/**
 * Parçayı hemen kurar (komut yolu da bunu çağırır). Başarıda { parca }, değilse { neden }:
 * 'bilinmeyen' | 'disarida' | 'yasak' | 'dolu' | 'saman'.
 */
export function parcaKur(c, tarla, anahtar, x, y, yon = 0) {
  const tanim = parcaTanimi(anahtar);
  if (!tanim) return { neden: 'bilinmeyen' };
  const neden = yerlestirmeEngeli(c, tarla, tanim, x, y, yon);
  if (neden) return { neden };
  const p = parcaOrnegi(tanim, c.sonrakiId, x, y, yon);
  c.sonrakiId += 1;
  tanim.kur?.(p, { c, tarla });
  c.parcalar.set(p.id, p);
  izgarayaKoy(c, tarla, p);
  c.topoloji = true;
  return { parca: p };
}

/** Parçayı söker: eşyaları envantere, ham samanı yere. İade { esya, saman } döner. */
export function parcaSok(c, tarla, p) {
  const iade = parcaIcerigi(p);
  for (const [kod, n] of iade.esya) c.envanter[kod] += n;
  izgaradanAl(c, p);
  c.parcalar.delete(p.id);
  if (iade.saman > 0) {
    samanDok(tarla, c, (p.x * KARO + p.en) | 0, (p.y * KARO + p.boy) | 0, iade.saman);
  }
  c.topoloji = true;
  return iade;
}

/** Parçayı yerinde döndürür (sol üst karo sabit); olmazsa neden döner, olursa null. */
export function parcaDondur(c, tarla, p, yon) {
  if (!p.tanim.yonlu) return 'yonsuz';
  const neden = yerlestirmeEngeli(c, tarla, p.tanim, p.x, p.y, yon, p.id);
  if (neden) return neden;
  izgaradanAl(c, p);
  p.yon = yon & 3;
  [p.en, p.boy] = donmusBoyut(p.tanim.boyut, p.yon);
  portlariYenile(p);
  izgarayaKoy(c, tarla, p);
  c.topoloji = true;
  return null;
}

const red = (olaylar, komut, neden) => {
  olaylar.push({ ad: 'komut-reddedildi', veri: { komut, neden } });
};

komutTanimla('kur', (c, tarla, k, olaylar) => {
  const engel = parcaTanimi(k.parca) ? kurulumEngeli(c, k.parca) : null;
  if (engel) return red(olaylar, k, engel);
  const s = parcaKur(c, tarla, k.parca, k.x, k.y, k.yon ?? 0);
  if (!s.parca) return red(olaylar, k, s.neden);
  kurulumOde(c, s.parca);
  olaylar.push({ ad: 'parca-kuruldu', veri: { parca: s.parca } });
  return undefined;
});

komutTanimla('sok', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  if (!p) return red(olaylar, k, 'bos');
  if (p.tanim.sokulmez) return red(olaylar, k, 'sokulmez');
  const iade = { ...parcaSok(c, tarla, p), kurus: sokumIade(c, p) };
  for (const kanca of sokumKancalari) kanca(c, tarla, p, iade, olaylar);
  olaylar.push({ ad: 'parca-sokuldu', veri: { parca: p, iade } });
  return undefined;
});

komutTanimla('dondur', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  if (!p) return red(olaylar, k, 'bos');
  if (p.tanim.sokulmez) return red(olaylar, k, 'sokulmez');
  const neden = parcaDondur(c, tarla, p, k.yon ?? p.yon + 1);
  if (neden) red(olaylar, k, neden);
  else olaylar.push({ ad: 'parca-dondu', veri: { parca: p } });
  return undefined;
});
