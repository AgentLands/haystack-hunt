/**
 * Oyuncu istatistiklerinin saf kuralları: güncelleme, "günün tarlası" serisi, özet ve paylaşım
 * emojileri. DOM yok; depo (getItem/setItem) dışarıdan verilir, sahte depoyla test edilir.
 */
import { gununEtiketi } from './rastgele.js';

export const ANAHTAR = 'haystack-hunt:istatistik';
export const SON_SAYISI = 10;
export const TOHUM_SINIRI = 300;

/** Rekorlar zorluğa göre ayrı tutulur; zorluğu olmayan (eski) kayıtlar normal sayılır. */
export const VARSAYILAN_ZORLUK = 'normal';

const OKUMA_EMOJI = { 'Soğuk': '🟦', 'Ilık': '🟨', 'Sıcak': '🟧', 'Yanıyor!': '🟥' };

export function bosIstatistik() {
  return {
    surum: 1,
    oynanan: 0, bulunan: 0, pesEdilen: 0,
    enIyiMs: null, toplamSureMs: 0, toplamSaman: 0,
    zorlukEnIyi: Object.create(null), // zorluk → en iyi süre (ms): rekor zorluğa göre
    tohumEnIyi: Object.create(null), // tarlaAnahtari(etiket, zorluk) → en iyi süre (ms)
    sonSureler: [],                  // son bulunan tarlalar: { etiket, sureMs }
    seri: 0, enUzunSeri: 0, gunlukSon: null, // günün tarlası serisi
    dondurmaSon: null,               // seri dondurmanın en son kullanıldığı gün (etiket)
  };
}

/**
 * Tarla rekorunun anahtarı: aynı etiket farklı zorlukta başka tarladır. Normal zorluk (ve
 * zorluğu kayıtlı olmayan eski kayıtlar) düz etiketle tutulur, böylece eski veri geçerli kalır.
 */
export function tarlaAnahtari(etiket, zorluk) {
  return zorluk && zorluk !== VARSAYILAN_ZORLUK ? `${etiket}|${zorluk}` : etiket;
}

/** Bellekte duran, localStorage arayüzünü taklit eden depo (erişim yoksa yedek). */
export function bellekDeposu() {
  const harita = new Map();
  return {
    getItem: (anahtar) => (harita.has(anahtar) ? harita.get(anahtar) : null),
    setItem: (anahtar, deger) => { harita.set(anahtar, String(deger)); },
  };
}

const sayiMi = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const sayi = (v) => (sayiMi(v) ? v : 0);
const etiketMi = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Depodan gelen (bozuk olabilecek) veriyi temizleyip tam bir istatistik nesnesi yapar. */
export function temizle(ham) {
  const ist = bosIstatistik();
  if (!ham || typeof ham !== 'object') return ist;
  for (const alan of ['oynanan', 'bulunan', 'pesEdilen', 'toplamSureMs', 'toplamSaman',
    'seri', 'enUzunSeri']) ist[alan] = sayi(ham[alan]);
  ist.enIyiMs = sayiMi(ham.enIyiMs) ? ham.enIyiMs : null;
  ist.gunlukSon = etiketMi(ham.gunlukSon) ? ham.gunlukSon : null;
  ist.dondurmaSon = etiketMi(ham.dondurmaSon) ? ham.dondurmaSon : null;
  if (ham.zorlukEnIyi && typeof ham.zorlukEnIyi === 'object') {
    for (const [zorluk, ms] of Object.entries(ham.zorlukEnIyi)) {
      if (sayiMi(ms)) ist.zorlukEnIyi[zorluk] = ms;
    }
  } else if (ist.enIyiMs !== null) {
    ist.zorlukEnIyi[VARSAYILAN_ZORLUK] = ist.enIyiMs; // eski kayıt: zorluk yoktu, normal say
  }
  if (ham.tohumEnIyi && typeof ham.tohumEnIyi === 'object') {
    for (const [etiket, ms] of Object.entries(ham.tohumEnIyi)) {
      if (sayiMi(ms)) ist.tohumEnIyi[etiket] = ms;
    }
  }
  if (Array.isArray(ham.sonSureler)) {
    ist.sonSureler = ham.sonSureler
      .filter((s) => s && typeof s.etiket === 'string' && sayiMi(s.sureMs))
      .map((s) => ({ etiket: s.etiket, sureMs: s.sureMs })).slice(-SON_SAYISI);
  }
  return ist;
}

/** Depodan okur; yoksa ya da bozuksa boş istatistik döner (bozuk veri konsola yazılır). */
export function yukle(depo) {
  try {
    const metin = depo.getItem(ANAHTAR);
    return metin ? temizle(JSON.parse(metin)) : bosIstatistik();
  } catch (hata) {
    console.error('İstatistik okunamadı, sıfırdan başlanıyor:', hata);
    return bosIstatistik();
  }
}

/** Depoya yazar; başarısızsa false döner (istatistik bellekte kalır). */
export function kaydet(depo, ist) {
  try {
    depo.setItem(ANAHTAR, JSON.stringify(ist));
    return true;
  } catch (hata) {
    console.error('İstatistik kaydedilemedi (bellekte kalıyor):', hata);
    return false;
  }
}

function kopya(ist) {
  return {
    ...ist,
    zorlukEnIyi: Object.assign(Object.create(null), ist.zorlukEnIyi),
    tohumEnIyi: Object.assign(Object.create(null), ist.tohumEnIyi),
    sonSureler: ist.sonSureler.map((s) => ({ ...s })),
  };
}

/** Yerel tarihten bir gün öncenin etiketi. */
export function dunEtiketi(etiket) {
  const [y, a, g] = etiket.split('-').map(Number);
  return gununEtiketi(new Date(y, a - 1, g - 1));
}

/** İki gün etiketi arasındaki takvim günü farkı (b - a; yerel saat dilimi kaymasız). */
export function gunFarki(a, b) {
  const [ya, aa, ga] = a.split('-').map(Number);
  const [yb, ab, gb] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, ab - 1, gb) - Date.UTC(ya, aa - 1, ga)) / 86400000);
}

/** Seri dondurma hakkı: son kullanımdan bu kadar gün geçmeden yeniden kullanılmaz. */
export const DONDURMA_ARALIK_GUN = 7;

/** Haftada bir dondurma hakkı var mı (hiç kullanılmadıysa ya da 7 gün geçtiyse)? */
export function dondurmaVar(ist, bugun = gununEtiketi()) {
  return ist.dondurmaSon === null
    || gunFarki(ist.dondurmaSon, bugun) >= DONDURMA_ARALIK_GUN;
}

/**
 * Tek bir kaçırılan günü (en son çözülen gün iki gün önceyse) dondurma hakkı kurtarır:
 * bugün çözülürse seri sürer. Daha uzun boşluk seriyi koparır.
 */
export function dondurmaKurtarir(ist, bugun = gununEtiketi()) {
  return ist.seri > 0 && ist.gunlukSon === dunEtiketi(dunEtiketi(bugun))
    && dondurmaVar(ist, bugun);
}

/**
 * Şu anki geçerli seri: bugün ya da dün çözüldüyse sürer; tek gün kaçırıldıysa ve dondurma
 * hakkı varsa bugün çözülene dek korunur; yoksa kopmuştur (0).
 */
export function gecerliSeri(ist, bugun = gununEtiketi()) {
  if (ist.gunlukSon === bugun || ist.gunlukSon === dunEtiketi(bugun)) return ist.seri;
  return dondurmaKurtarir(ist, bugun) ? ist.seri : 0;
}

/** İlk hamle yapıldı: bir tarla "oynandı" sayılır. */
export function oynandiKaydet(ist) {
  const yeni = kopya(ist);
  yeni.oynanan += 1;
  return yeni;
}

/** Oyuncu pes etti (yalnızca oynanmış tarlada çağrılır). */
export function pesKaydet(ist) {
  const yeni = kopya(ist);
  yeni.pesEdilen += 1;
  return yeni;
}

/**
 * İğne bulundu. Döner: { ist, rapor } (rapor: rekor, tohumRekoru, oncekiEnIyiMs, gunluk, seri,
 * dondurma: seri bir dondurma hakkıyla kurtarıldı). Günün tarlası yalnızca etiketi bugüne
 * eşitse seriye sayılır.
 */
export function bulunduKaydet(ist, sonuc, bugun = gununEtiketi()) {
  const yeni = kopya(ist);
  const ms = sayiMi(sonuc.sureMs) ? sonuc.sureMs : null;
  const zorluk = sonuc.zorluk || VARSAYILAN_ZORLUK;
  const anahtar = tarlaAnahtari(sonuc.etiket, zorluk);
  const oncekiEnIyiMs = Object.hasOwn(ist.zorlukEnIyi, zorluk) ? ist.zorlukEnIyi[zorluk] : null;
  const oncekiTohumMs = Object.hasOwn(ist.tohumEnIyi, anahtar) ? ist.tohumEnIyi[anahtar] : null;
  const rapor = {
    rekor: false, tohumRekoru: false, oncekiEnIyiMs, gunluk: false, seri: 0,
    dondurma: false,
  };
  yeni.bulunan += 1;
  yeni.toplamSaman += sayi(sonuc.kaldirilan);
  if (ms !== null) {
    yeni.toplamSureMs += ms;
    rapor.rekor = oncekiEnIyiMs !== null && ms < oncekiEnIyiMs;
    if (oncekiEnIyiMs === null || ms < oncekiEnIyiMs) yeni.zorlukEnIyi[zorluk] = ms;
    if (yeni.enIyiMs === null || ms < yeni.enIyiMs) yeni.enIyiMs = ms;
    rapor.tohumRekoru = oncekiTohumMs !== null && ms < oncekiTohumMs;
    if (oncekiTohumMs === null || ms < oncekiTohumMs) {
      delete yeni.tohumEnIyi[anahtar]; // yeniden eklenince en yeni sona geçer
      yeni.tohumEnIyi[anahtar] = ms;
      const anahtarlar = Object.keys(yeni.tohumEnIyi);
      for (const eski of anahtarlar.slice(0, Math.max(0, anahtarlar.length - TOHUM_SINIRI))) {
        delete yeni.tohumEnIyi[eski];
      }
    }
    yeni.sonSureler = [...yeni.sonSureler, { etiket: sonuc.etiket, sureMs: ms }].slice(-SON_SAYISI);
  }
  if (sonuc.etiket === bugun) {
    rapor.gunluk = true;
    if (yeni.gunlukSon !== bugun) {
      if (dondurmaKurtarir(ist, bugun)) {
        rapor.dondurma = true;
        yeni.dondurmaSon = bugun;
        yeni.seri += 1;
      } else {
        yeni.seri = yeni.gunlukSon === dunEtiketi(bugun) ? yeni.seri + 1 : 1;
      }
      yeni.gunlukSon = bugun;
      yeni.enUzunSeri = Math.max(yeni.enUzunSeri, yeni.seri);
    }
  }
  rapor.seri = gecerliSeri(yeni, bugun);
  return { ist: yeni, rapor };
}

/** Pencerenin göstereceği türetilmiş değerler. */
export function ozet(ist, bugun = gununEtiketi()) {
  return {
    oynanan: ist.oynanan,
    bulunan: ist.bulunan,
    pesEdilen: ist.pesEdilen,
    bulmaYuzde: ist.oynanan > 0 ? Math.round((100 * ist.bulunan) / ist.oynanan) : null,
    enIyiMs: ist.enIyiMs,
    ortalamaMs: ist.bulunan > 0 ? Math.round(ist.toplamSureMs / ist.bulunan) : null,
    toplamSaman: ist.toplamSaman,
    seri: gecerliSeri(ist, bugun),
    enUzunSeri: ist.enUzunSeri,
    bugunCozuldu: ist.gunlukSon === bugun,
    dondurmaVar: dondurmaVar(ist, bugun),
    sonSureler: ist.sonSureler,
  };
}

/** Dedektör okumalarını emoji dizisine çevirir (bilinmeyen ad ⬜ olur). */
export function okumalarEmoji(okumalar = []) {
  return okumalar.map((ad) => OKUMA_EMOJI[ad] ?? '⬜').join('');
}

/**
 * Paylaşım metnine eklenecek satırlar: okuma emojileri ve oyun bağlantısı. Zorluk normal
 * değilse bağlantıya `&zorluk=` eklenir (aynı etiket başka zorlukta başka tarladır).
 */
export function paylasimEki(sonuc, adres) {
  const satirlar = [];
  const emoji = okumalarEmoji(sonuc.okumalar);
  if (emoji) satirlar.push(emoji);
  const zorluk = sonuc.zorluk && sonuc.zorluk !== VARSAYILAN_ZORLUK
    ? `&zorluk=${encodeURIComponent(sonuc.zorluk)}` : '';
  satirlar.push(`${adres}?tohum=${encodeURIComponent(sonuc.etiket)}${zorluk}`);
  return satirlar.join('\n');
}
