/**
 * Makine karesi: binme/inme (E), sürüş (W/S gaz-geri, A/D dönüş; kontrol.yon'dan), iş
 * aygıtı (Boşluk basılıyken tanımın calis işlevi), yakıt ve makine olayları. Her kare
 * her makinenin kare kancası (ör. kepçedeki iğneyi taşıma) çağrılır. DOM'a dokunmaz.
 */
import { kontrol } from './kontrol.js';
import { KARAKTER_YARICAP } from './kural/karakter.js';
import { yukseklik } from './kural/tarla.js';
import { makineTanimi } from './kural/makineler/kayit.js';
import { surusAdim, yakitHarca, makineEngeli } from './kural/makineler/surus.js';
import { binilebilir, inmeYeri } from './kural/makineler/binme.js';
import { baslat } from './oyun-arac.js';
import { yay } from './olaylar.js';

/** Sürülen makine dışındaki engeller: diğer makineler ve (yürüyorsa) karakter. */
function engeller(durum, haric) {
  const liste = durum.makineler.filter((m) => m !== haric).map(makineEngeli);
  const k = durum.karakter;
  if (!k.makine) liste.push({ x: k.x, y: k.y, r: KARAKTER_YARICAP });
  return liste;
}

function karakteriMakineyeKoy(k, m) {
  Object.assign(k, {
    x: m.x, y: m.y, yon: m.yon, z: m.z, hareketli: Math.abs(m.hiz) > 0.05,
    kullaniyor: m.calisiyor,
  });
}

/** E: makinedeyse iner, değilse en yakın makineye biner (yoksa 'makine-yok'). */
export function binIn(durum, zaman) {
  const k = durum.karakter;
  const m = k.makine;
  if (m) {
    const yer = inmeYeri(m, engeller(durum, m));
    Object.assign(m, { surucu: false, calisiyor: false, hiz: 0 });
    Object.assign(k, {
      makine: null, x: yer.x, y: yer.y, z: yukseklik(durum.tarla, yer.x, yer.y),
      hareketli: false, kullaniyor: false,
    });
    yay('makine-in', { makine: m });
    return;
  }
  const aday = binilebilir(k, durum.makineler);
  if (!aday) {
    yay('makine-yok', { x: k.x, y: k.y });
    return;
  }
  baslat(durum, zaman);
  aday.surucu = true;
  aday.kilitli = kontrol.kullan; // Boşluk zaten basılıysa bırakılana dek çalışmaz
  k.makine = aday;
  Object.assign(durum, { basili: false, fare: null });
  kontrol.hedef = null;
  karakteriMakineyeKoy(k, aday);
  yay('makine-bin', { makine: aday });
}

/** Bir kare: kare kancaları, sürüş ve iş. */
export function makineKaresi(durum, dt, zaman) {
  for (const m of durum.makineler) makineTanimi(m.tur).kare(durum.tarla, m);
  const k = durum.karakter;
  const m = k.makine;
  if (!m) return;
  kontrol.hedef = null;
  const girdi = { gaz: -kontrol.yon.y, donus: kontrol.yon.x };
  if (girdi.gaz || girdi.donus) baslat(durum, zaman);
  const s = surusAdim(durum.tarla, m, girdi, dt, engeller(durum, m));
  if (s.takildi) yay('makine-takildi', { makine: m });
  const bosaldi = isKaresi(durum, m, dt, zaman);
  if (s.yakitBitti || bosaldi) yay('yakit-bitti', { makine: m });
  karakteriMakineyeKoy(k, m);
}

/** İş aygıtı: Boşluk basılıyken (bırakılınca kilit açılır). Depo bu karede boşaldıysa true. */
function isKaresi(durum, m, dt, zaman) {
  const t = makineTanimi(m.tur);
  if (!kontrol.kullan) m.kilitli = false;
  durum.oncekiKullan = kontrol.kullan;
  m.calisiyor = kontrol.kullan && !m.kilitli && !durum.bitti && m.yakit > 0;
  if (!m.calisiyor) return false;
  baslat(durum, zaman);
  const sonuc = t.calis(durum.tarla, m, dt);
  if (sonuc.miktar > 0) yay('makine-calisti', { makine: m, miktar: sonuc.miktar });
  for (const [ad, veri] of sonuc.olaylar) yay(ad, veri);
  return yakitHarca(m, t.isYakit * dt);
}

/** Bindiği makinenin iş noktası ve yarıçapı (imleç halkası için) ya da null. */
export function makineImleci(durum) {
  const m = durum.karakter.makine;
  if (!m) return null;
  const t = makineTanimi(m.tur);
  return { nokta: t.isNoktasi(m), yaricap: t.isYaricap };
}
