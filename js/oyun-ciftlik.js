/**
 * Çiftlik modu (oyun tarafı; DOM yok): modTanimla('ciftlik', { kur, adim }). Durum normal
 * tarlanınkiyle aynı biçimdedir (karakter, makineler, araçlar, kamera, HUD paylaşılır) +
 * `ciftlik` (kural/ciftlik/benzetim.js dünyası) ve `ekEngeller` (parçalar karakteri ve
 * makineleri durdurur). Süre, puan, bulundu/pes-edildi, istatistik, yarış yoktur
 * (durum.bitti hep false, baslangic null). Kare başına: karakter/makine (oyun.js), sonra
 * birikmiş süre kadar 20 Hz tik (en çok TIK_EN_COK), olaylar burada yayılır.
 * Arazi (çiftlik tarlası, çayır, kapı yeri) ve gömülü nesneler kural/ciftlik/dunya/'dan.
 * İğneler: c.gomulu'daki ilk alınmamış iğne ailesi nesnesi (iğne, çuvaldız, altın iğne)
 * `tarla.igne` olur (parıltı, dedektör, kepçe kodu değişmez); alınınca sıradakine geçer,
 * kalmazsa igneYok() (tarlada değil, çizilmez). Elle alınan iğne envantere girer ve "bulundu"
 * sayılır (G: tam ödeme, defter); elle alınan buluntu da (envantere girmez).
 * Kalıcı ilerleme (damgalar) secenek.ilerleme ile bağlanır (ozellik/ciftlik/depo.js okur);
 * yeni çiftlik ekonomiBaslat ile kuruşunu alır; Komşu kapısı dunya/kapi.js ile kurulur.
 * Girişteki tarla zorluğu durum.tarlaZorlugu'nda saklanır (dönüşte yeniOyun onu kullanır).
 * Her tikten önce c.ciftci = karakterin hücresi (el krankı mesafesi).
 */
import { durumKur, durumAl, modTanimla } from './oyun.js';
import { metindenTohum } from './kural/rastgele.js';
import { esyaKodu } from './kural/ciftlik/esya.js';
import { ciftlikKur, tikAt, tikSayisi } from './kural/ciftlik/benzetim.js';
import { engelleriTopla } from './kural/ciftlik/izgara.js';
import { dunyaCoz } from './kural/ciftlik/sakla.js';
import { IKMAL_YARICAP } from './kural/makineler/garaj.js';
import { buluntuKaresi } from './oyun-buluntu.js';
import './kural/ciftlik/parcalar/hepsi.js';
import { ciftlikTarlasi, araziKur, araziBagla } from './kural/ciftlik/dunya/arazi.js';
import { gomuluYerlestir, igneMi } from './kural/ciftlik/dunya/gomulu.js';
import { kapiKur } from './kural/ciftlik/dunya/kapi.js';
import { ilerlemeKur } from './kural/ciftlik/ekonomi/damga.js';
import { ekonomiBaslat } from './kural/ciftlik/ekonomi/kurus.js';
import { bulundu } from './kural/ciftlik/isleme/bulundu.js';
import { dinle, yay } from './olaylar.js';

export const CIFTLIK_ZORLUK = 'normal';
/**
 * Aranacak iğne kalmayınca tarla.igne: tarlada değil (derinlik ∞), çizilmez, parlamaz. Her
 * seferinde yeni nesne (makine kodu iğne nesnesine yazabilir; donmuş nesne hata verirdi).
 */
export const igneYok = () => ({ x: -99, y: -99, z: 0, aci: 0, kepcede: true, yok: true });
const CIVI = esyaKodu('civi');
/** Karakter ve makine çevresinde parça engeli aranan yarıçap (hücre). */
const ENGEL_YARICAP = 8;
/** Dedektör ve mıknatıs hakkı: başta 1'er, her harman arabası +1, en çok 3 (sistemler §5). */
const HAK_BASI = { dedektor: 1, dedektorHakki: 1, miknatis: 1, miknatisHakki: 1 };
const HAK_TAVAN = 3;

/**
 * Gömülü nesneleri (c.gomulu) oyunun listelerine bağlar: çiviler tarla.civiler (parıltı,
 * elle alma), buluntular durum.buluntular. Nesne eklenince (araba, öğretici) yeniden
 * çağrılır; buluntunun görülme alanları yalnız ilk bağlamada kurulur.
 */
function gomuluBagla(durum, c) {
  durum.tarla.civiler = c.gomulu.filter((g) => g.esya === CIVI);
  durum.buluntular = c.gomulu.filter((g) => g.tur && !igneMi(g.esya) && g.esya !== CIVI);
  for (const b of durum.buluntular) {
    if (b.goruldu === undefined) Object.assign(b, { acikSure: null, goruldu: b.alindi });
  }
}

/** Aranan iğneyi c.gomulu'daki ilk alınmamış iğne ailesi nesnesine ayarlar. */
export function igneGuncelle(durum) {
  const sonraki = durum.ciftlik.gomulu.find((g) => igneMi(g.esya) && !g.alindi);
  durum.tarla.igne = sonraki ?? igneYok();
  durum.gorundu = false;
}

/**
 * Çiftlik durumu. secenek.kayit (sakla.js dunyaKodla nesnesi) varsa yüklenir; yoksa
 * secenek.etiket (yoksa 'ciftlik') tohumuyla yeni çiftlik. Bozuk kayıt hata verir.
 * Haklar kayda girmez (her açılışta başlangıç hakkı).
 */
function kur({ kayit = null, etiket = 'ciftlik', ilerleme = null } = {}) {
  const ad = kayit?.ek?.etiket ?? etiket;
  const onceki = durumAl();
  const tarlaZorlugu = onceki ? onceki.tarlaZorlugu ?? onceki.zorluk : null;
  const durum = durumKur(ad, CIFTLIK_ZORLUK, { rahat: true, tarlaKur: ciftlikTarlasi });
  Object.assign(durum, { mod: 'ciftlik', tikBirikim: 0, tarlaZorlugu }, HAK_BASI);
  const { garaj, tarla } = durum;
  const yasak = [{ x: garaj.x, y: garaj.y, r: IKMAL_YARICAP + garaj.en / 2 + 2 }];
  if (kayit) {
    durum.ciftlik = dunyaCoz(kayit, tarla, { ilerleme }).c;
  } else {
    const tohum = metindenTohum(`ciftlik:${ad}`);
    const arazi = araziKur(tarla, garaj, yasak[0], tohum);
    durum.ciftlik = ciftlikKur(tohum, { gomulu: gomuluYerlestir(tarla, arazi, tohum), yasak });
    araziBagla(durum.ciftlik, arazi);
    ekonomiBaslat(durum.ciftlik, ilerleme ?? ilerlemeKur());
  }
  const kapi = kapiKur(durum.ciftlik, tarla);
  if (kapi?.neden) console.error(`Komşu kapısı kurulamadı (${kapi.neden})`);
  gomuluBagla(durum, durum.ciftlik);
  igneGuncelle(durum);
  const c = durum.ciftlik;
  durum.ekEngeller = (x, y, makine) => engelleriTopla(c, x, y, ENGEL_YARICAP, makine);
  return durum;
}

/** Oyun tarafından "bulundu" ortamı (olaylar hemen yayılır). */
const ortam = (c) => ({ c, olay: yay });

/** Elle alınan iğne envantere girer ve bulundu sayılır; aranan iğne sıradakine geçer. */
function igneToplandi(durum, kaynak) {
  const igne = durum.tarla.igne;
  if (igne.yok || igne.alindi) return;
  igne.alindi = true;
  durum.ciftlik.envanter[igne.esya] += 1;
  igneGuncelle(durum);
  yay('ciftlik-igne', { kaynak, tur: igne.esya, x: igne.x, y: igne.y });
  bulundu(ortam(durum.ciftlik), igne.esya, 'el', 'tam');
}

// Elle alınan buluntu (oyun-buluntu.js): çiftlikte de defter + tam ödeme (envantere girmez)
dinle('buluntu-alindi', ({ tur }) => {
  const durum = durumAl();
  if (durum?.mod !== 'ciftlik') return;
  bulundu(ortam(durum.ciftlik), esyaKodu(`buluntu:${tur}`), 'el', 'tam');
});

/** Harman arabası dökünce dedektör ve mıknatıs +1 (tavan HAK_TAVAN). */
function hakEkle(durum) {
  durum.dedektor = Math.min(HAK_TAVAN, durum.dedektor + 1);
  durum.miknatis = Math.min(HAK_TAVAN, durum.miknatis + 1);
  durum.dedektorHakki = Math.max(durum.dedektorHakki, durum.dedektor);
  durum.miknatisHakki = Math.max(durum.miknatisHakki, durum.miknatis);
}

/**
 * Benzetim olaylarını yayar; parçanın çıkardığı iğne aranan iğneyse sıradakine geçilir,
 * yeni gömülü nesneler oyunun listelerine bağlanır.
 */
function olaylariYay(durum, olaylar) {
  for (const { ad, veri } of olaylar) {
    if (ad === 'gomulu-cikti' && igneMi(veri.tur)) {
      if (veri.nesne === durum.tarla.igne) igneGuncelle(durum);
      yay('ciftlik-igne', { kaynak: 'parca', tur: veri.tur, x: veri.x, y: veri.y });
    }
    if (ad === 'gomulu-eklendi') {
      gomuluBagla(durum, durum.ciftlik);
      if (durum.tarla.igne.yok) igneGuncelle(durum);
    }
    if (ad === 'harman-arabasi' && veri.asama === 'dokum') hakEkle(durum);
    yay(ad, veri);
  }
}

function adim(durum, dt, zaman, igneAlindi) {
  if (igneAlindi) igneToplandi(durum, 'el');
  const a = tikSayisi(durum.tikBirikim, dt * 1000);
  durum.tikBirikim = a.birikim;
  const k = durum.karakter;
  if (a.n) durum.ciftlik.ciftci = { x: Math.floor(k.x), y: Math.floor(k.y) };
  for (let i = 0; i < a.n; i++) olaylariYay(durum, tikAt(durum.ciftlik, durum.tarla));
  buluntuKaresi(durum, zaman);
}

modTanimla('ciftlik', { kur, adim });
