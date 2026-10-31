/**
 * Makine karesi: binme/inme (E), sürüş (W/S gaz-geri, A/D dönüş; kontrol.yon'dan), iş
 * aygıtı (Boşluk basılıyken tanımın calis işlevi), yakıt ve makine olayları. Her kare
 * her makinenin kare kancası (ör. kepçedeki iğneyi taşıma) çağrılır. Giyilen makineler
 * (tanımda giyilir: sırt üfleyicisi) sürülmez: çiftçi normal yürür (yuruHizi kadar yavaş),
 * makine karakteri izler; E ile çıkınca karakterin durduğu yere bırakılır. Park yerine
 * dönen makine bir kez garajda ikmal yapar (garaj.js ikmalKontrol). DOM'a dokunmaz.
 */
import { kontrol } from './kontrol.js';
import { KARAKTER_YARICAP, karakterYuru } from './kural/karakter.js';
import { yukseklik } from './kural/tarla.js';
import { makineTanimi } from './kural/makineler/kayit.js';
import {
  surusAdim, yakitHarca, makineEngeli, isYakiti,
} from './kural/makineler/surus.js';
import { ikmalKontrol } from './kural/makineler/garaj.js';
import { binilebilir, inmeYeri } from './kural/makineler/binme.js';
import { balyaEngelleri } from './kural/balyalar.js';
import { baslat } from './oyun-arac.js';
import { yay } from './olaylar.js';

/** Sürülen makine dışındaki engeller: diğer makineler, balyalar ve (yürüyorsa) karakter. */
function engeller(durum, haric) {
  const liste = durum.makineler.filter((m) => m !== haric).map(makineEngeli);
  liste.push(...balyaEngelleri(durum.balyalar));
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

/** Giyilen makine karakterin konumunu ve yönünü izler (sürülen makinenin tersi). */
function makineyiKaraktereKoy(m, k) {
  Object.assign(m, { x: k.x, y: k.y, yon: k.yon, z: k.z, takili: false });
}

/** E: makinedeyse iner, değilse en yakın makineye biner (yoksa 'makine-yok'). */
export function binIn(durum, zaman) {
  const k = durum.karakter;
  const m = k.makine;
  if (m) {
    const giyilir = makineTanimi(m.tur).giyilir;
    const yer = giyilir ? { x: k.x, y: k.y } : inmeYeri(m, engeller(durum, m));
    if (giyilir) makineyiKaraktereKoy(m, k); // olduğu yere bırakılır, yeniden alınabilir
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
  if (makineTanimi(aday.tur).giyilir) makineyiKaraktereKoy(aday, k);
  else karakteriMakineyeKoy(k, aday);
  yay('makine-bin', { makine: aday });
}

/** Bir kare: kare kancaları, sürüş ve iş. */
export function makineKaresi(durum, dt, zaman) {
  for (const m of durum.makineler) makineTanimi(m.tur).kare(durum.tarla, m);
  const k = durum.karakter;
  const m = k.makine;
  if (!m) return;
  kontrol.hedef = null;
  if (makineTanimi(m.tur).giyilir) {
    giyilenKare(durum, m, dt, zaman);
    return;
  }
  const girdi = { gaz: -kontrol.yon.y, donus: kontrol.yon.x };
  if (girdi.gaz || girdi.donus) baslat(durum, zaman);
  const s = surusAdim(durum.tarla, m, girdi, dt, engeller(durum, m));
  if (s.takildi) yay('makine-takildi', { makine: m });
  const bosaldi = isKaresi(durum, m, dt, zaman);
  if (s.yakitBitti || bosaldi) yakitBitti(durum, m);
  ikmalKaresi(m);
  karakteriMakineyeKoy(k, m);
}

/** Park yerine dönüp duran makinenin tek seferlik garaj ikmali. */
function ikmalKaresi(m) {
  const onceki = ikmalKontrol(m);
  if (onceki !== null) yay('yakit-ikmal', { makine: m, onceki });
}

/** Giyilen makine: karakter yürür (yuruHizi), makine izler, Boşlukla iş çalışır. */
function giyilenKare(durum, m, dt, zaman) {
  const k = durum.karakter;
  const { x, y } = kontrol.yon;
  if (x || y) baslat(durum, zaman);
  const s = karakterYuru(durum.tarla, k, x, y, dt, engeller(durum, m),
    makineTanimi(m.tur).yuruHizi);
  if (s.adim) yay('karakter-adim', { x: k.x, y: k.y, z: k.z });
  makineyiKaraktereKoy(m, k);
  m.hiz = dt > 0 ? s.mesafe / dt : 0;
  const bosaldi = isKaresi(durum, m, dt, zaman);
  if (bosaldi) yakitBitti(durum, m);
  ikmalKaresi(m);
  k.kullaniyor = m.calisiyor;
}

/**
 * Depo boşaldı: makine içindekileri (iğne, çivi, saman) dışarı bırakır ki iğne yakıtsız
 * bir makinede mahsur kalıp oyun bitirilemez olmasın (tanımın yakitBitince kancası).
 */
function yakitBitti(durum, m) {
  yay('yakit-bitti', { makine: m });
  const kanca = makineTanimi(m.tur).yakitBitince;
  if (!kanca) return;
  for (const [ad, veri] of kanca(durum.tarla, m)) yay(ad, veri);
}

/**
 * İş aygıtı: Boşluk basılıyken (bırakılınca kilit açılır). Yakıt surus.js isYakiti ile:
 * iş yapılmayan karede çok az. Depo bu karede boşaldıysa true.
 */
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
  return yakitHarca(m, isYakiti(t, sonuc, dt));
}

/** Bindiği makinenin iş noktası ve yarıçapı (imleç halkası için) ya da null. */
export function makineImleci(durum) {
  const m = durum.karakter.makine;
  if (!m) return null;
  const t = makineTanimi(m.tur);
  return { nokta: t.isNoktasi(m), yaricap: t.isYaricap };
}
