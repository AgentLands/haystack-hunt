/**
 * Çiftlik modu (oyun tarafı; DOM yok): modTanimla('ciftlik', { kur, adim }). Durum normal
 * tarlanınkiyle aynı biçimdedir (karakter, makineler, araçlar, kamera, HUD paylaşılır) +
 * `ciftlik` (kural/ciftlik/benzetim.js dünyası) ve `ekEngeller` (parçalar karakteri ve
 * makineleri durdurur). Süre, puan, bulundu/pes-edildi, istatistik, yarış yoktur
 * (durum.bitti hep false, baslangic null). Kare başına: karakter/makine (oyun.js), sonra
 * birikmiş süre kadar 20 Hz tik (en çok TIK_EN_COK), olaylar burada yayılır.
 * İğneler: c.gomulu'daki ilk alınmamış iğne `tarla.igne` olur (parıltı, dedektör, kepçe kodu
 * değişmez); alınınca sıradakine geçer, kalmazsa IGNE_YOK (tarlada değil, çizilmez).
 */
import { durumKur, modTanimla } from './oyun.js';
import { metindenTohum } from './kural/rastgele.js';
import { esyaKodu } from './kural/ciftlik/esya.js';
import { ciftlikKur, tikAt, tikSayisi } from './kural/ciftlik/benzetim.js';
import { engelleriTopla } from './kural/ciftlik/izgara.js';
import { dunyaCoz } from './kural/ciftlik/sakla.js';
import { IKMAL_YARICAP } from './kural/makineler/garaj.js';
import { buluntuKaresi } from './oyun-buluntu.js';
import './kural/ciftlik/parcalar/hepsi.js';
import { yay } from './olaylar.js';

export const CIFTLIK_ZORLUK = 'normal';
/** Aranacak iğne kalmayınca tarla.igne: tarlada değil (derinlik ∞), çizilmez, parlamaz. */
export const IGNE_YOK = Object.freeze({ x: -99, y: -99, z: 0, aci: 0, kepcede: true, yok: true });
const IGNE = esyaKodu('igne');
const CIVI = esyaKodu('civi');
/** Karakter ve makine çevresinde parça engeli aranan yarıçap (hücre). */
const ENGEL_YARICAP = 8;

/** Yeni çiftlik için gömülü nesneler: tarlanın iğnesi, çivileri ve buluntuları (aynı nesneler). */
function gomuluKur(durum) {
  const { tarla } = durum;
  const igne = Object.assign(tarla.igne, { esya: IGNE, alindi: false });
  const civiler = tarla.civiler.map((cv) => Object.assign(cv, { esya: CIVI }));
  const buluntular = durum.buluntular.map((b) => Object.assign(b, {
    esya: esyaKodu(`buluntu:${b.tur}`),
  }));
  return [igne, ...civiler, ...buluntular];
}

/** Kayıttan gelen gömülü nesneleri oyunun listelerine bağlar. */
function gomuluBagla(durum, c) {
  durum.tarla.civiler = c.gomulu.filter((g) => g.esya === CIVI);
  durum.buluntular = c.gomulu.filter((g) => g.tur && g.esya !== IGNE && g.esya !== CIVI);
  for (const b of durum.buluntular) Object.assign(b, { acikSure: null, goruldu: b.alindi });
}

/** Aranan iğneyi c.gomulu'daki ilk alınmamış iğneye ayarlar. */
export function igneGuncelle(durum) {
  const sonraki = durum.ciftlik.gomulu.find((g) => g.esya === IGNE && !g.alindi);
  durum.tarla.igne = sonraki ?? IGNE_YOK;
  durum.gorundu = false;
}

/**
 * Çiftlik durumu. secenek.kayit (sakla.js dunyaKodla nesnesi) varsa yüklenir; yoksa
 * secenek.etiket (yoksa 'ciftlik') tohumuyla yeni çiftlik. Bozuk kayıt hata verir.
 */
function kur({ kayit = null, etiket = 'ciftlik' } = {}) {
  const ad = kayit?.ek?.etiket ?? etiket;
  const durum = durumKur(ad, CIFTLIK_ZORLUK, { rahat: true });
  Object.assign(durum, { mod: 'ciftlik', tikBirikim: 0 });
  const { garaj, tarla } = durum;
  const yasak = [{ x: garaj.x, y: garaj.y, r: IKMAL_YARICAP + garaj.en / 2 + 2 }];
  if (kayit) {
    durum.ciftlik = dunyaCoz(kayit, tarla).c;
    gomuluBagla(durum, durum.ciftlik);
  } else {
    const tohum = metindenTohum(`ciftlik:${ad}`);
    durum.ciftlik = ciftlikKur(tohum, { gomulu: gomuluKur(durum), yasak });
  }
  igneGuncelle(durum);
  const c = durum.ciftlik;
  durum.ekEngeller = (x, y, makine) => engelleriTopla(c, x, y, ENGEL_YARICAP, makine);
  return durum;
}

/** Elle alınan iğne envantere girer; aranan iğne sıradakine geçer. */
function igneToplandi(durum, kaynak) {
  const igne = durum.tarla.igne;
  if (igne.yok || igne.alindi) return;
  igne.alindi = true;
  durum.ciftlik.envanter[IGNE] += 1;
  igneGuncelle(durum);
  yay('ciftlik-igne', { kaynak, x: igne.x, y: igne.y });
}

/** Benzetim olaylarını yayar; parçanın çıkardığı iğne aranan iğneyse sıradakine geçilir. */
function olaylariYay(durum, olaylar) {
  for (const { ad, veri } of olaylar) {
    if (ad === 'gomulu-cikti' && veri.tur === IGNE) {
      if (veri.nesne === durum.tarla.igne) igneGuncelle(durum);
      yay('ciftlik-igne', { kaynak: 'parca', x: veri.x, y: veri.y });
    }
    yay(ad, veri);
  }
}

function adim(durum, dt, zaman, igneAlindi) {
  if (igneAlindi) igneToplandi(durum, 'el');
  const a = tikSayisi(durum.tikBirikim, dt * 1000);
  durum.tikBirikim = a.birikim;
  for (let i = 0; i < a.n; i++) olaylariYay(durum, tikAt(durum.ciftlik, durum.tarla));
  buluntuKaresi(durum, zaman);
}

modTanimla('ciftlik', { kur, adim });
