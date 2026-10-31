/**
 * Buluntu defteri: bulunan eşyaların kalıcı koleksiyonu (localStorage; erişim yoksa bellekte).
 * "Buluntular" düğmesi kâğıt bir pencere açar: ızgarada bulunanlar çizim, ad, açıklama,
 * adet ve nadirlik damgasıyla; bulunmayanlar "?" silüet. Yeni tür bulununca bildirir.
 * Saf kısımlar js/kural/buluntu-defter.js'te, çizim buluntu-sekil.js'te.
 */
import { dinle } from '../olaylar.js';
import { bildir, dugmeEkle } from '../arayuz.js';
import { bellekDeposu } from '../kural/istatistik.js';
import { KATALOG, NADIRLIK } from '../kural/buluntu.js';
import {
  DEFTER_ANAHTAR, defterYukle, defterKaydet, buluntuEkle, defterOzeti,
} from '../kural/buluntu-defter.js';
import { defterBagla } from '../oyun-buluntu.js';
import { buluntuSekil } from './buluntu-sekil.js';
import { pencereHazirla, stilYukle } from './pencere.js';

function depoAc() {
  try {
    const depo = window.localStorage;
    depo.getItem(DEFTER_ANAHTAR); // erişim engelliyse burada fırlatır
    return depo;
  } catch (hata) {
    console.error('localStorage kullanılamıyor, buluntu defteri yalnız bellekte:', hata);
    return bellekDeposu();
  }
}

const depo = depoAc();
let defter = defterYukle(depo);
const taze = new Set(); // bu oturumda ilk kez bulunanlar ("yeni" etiketi)

function eleman(etiket, sinif, metin) {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

/** Tür çizimi için küçük tuval (yüksek çözünürlüklü); bulunmadıysa silüet. */
function simge(tur, bulundu) {
  const boyut = 56;
  const kat = Math.min(3, window.devicePixelRatio || 1);
  const tuval = eleman('canvas', 'buluntu-simge');
  tuval.width = boyut * kat;
  tuval.height = boyut * kat;
  tuval.setAttribute('aria-hidden', 'true');
  const ctx = tuval.getContext('2d');
  const olcek = (boyut * kat) / 2.3; // yarıçap ~1 birim, kenarlarda pay
  ctx.translate(boyut * kat / 2, boyut * kat / 2);
  ctx.scale(olcek, olcek);
  buluntuSekil(ctx, tur, (1.25 * kat) / olcek, !bulundu);
  return tuval;
}

function kart(b) {
  const adet = defter.bulunan[b.tur] || 0;
  const bulundu = adet > 0;
  const k = eleman('li', bulundu ? `buluntu-kart ${b.nadirlik}` : 'buluntu-kart bos');
  const yazi = eleman('div', 'buluntu-yazi');
  if (bulundu) {
    const ust = eleman('div', 'buluntu-ust');
    ust.append(eleman('strong', 'buluntu-ad', b.ad),
      eleman('span', 'buluntu-damga', NADIRLIK[b.nadirlik].ad));
    yazi.append(ust, eleman('p', 'buluntu-not', b.not),
      eleman('p', 'buluntu-adet', adet === 1 ? 'Bir kez bulundu' : `${adet} kez bulundu`));
    if (taze.has(b.tur)) k.append(eleman('span', 'buluntu-yeni', 'Yeni'));
  } else {
    yazi.append(eleman('strong', 'buluntu-ad', '?'),
      eleman('p', 'buluntu-not', 'Henüz bulunmadı.'));
  }
  k.prepend(simge(b.tur, bulundu));
  k.append(yazi);
  return k;
}

function pencereKur() {
  stilYukle('./buluntu-defter.css');
  const pencere = document.createElement('dialog');
  pencere.id = 'buluntu-pencere';
  pencere.className = 'kagit-pencere pencere buluntu-defter';
  pencere.setAttribute('aria-labelledby', 'buluntu-baslik');
  const baslik = eleman('h2', '', 'Buluntu defteri');
  baslik.id = 'buluntu-baslik';
  const ozet = eleman('p', 'buluntu-ozet');
  const liste = eleman('ul', 'buluntu-izgara');
  const kapat = eleman('button', 'dugme-metin', 'Kapat');
  kapat.type = 'button';
  kapat.addEventListener('click', () => pencere.close());
  const dugmeler = eleman('div', 'dugmeler');
  dugmeler.append(kapat);
  pencere.append(baslik, ozet, liste, dugmeler);
  pencereHazirla(pencere, { dis: true });
  document.body.append(pencere);
  pencere.addEventListener('close', () => taze.clear());

  return {
    ac() {
      const o = defterOzeti(defter);
      ozet.textContent = `${o.bulunanTur} / ${o.toplamTur} sayfa dolu`
        + (o.toplamAdet ? `, toplam ${o.toplamAdet} buluntu.` : '. Samanda küçük sürprizler var.');
      const bulunan = KATALOG.filter((b) => defter.bulunan[b.tur]);
      const eksik = KATALOG.filter((b) => !defter.bulunan[b.tur]);
      liste.replaceChildren(...[...bulunan, ...eksik].map(kart)); // bulunanlar önde
      pencere.showModal();
      liste.scrollTop = 0;
    },
  };
}

const pencere = pencereKur();
dugmeEkle('ust', {
  metin: 'Buluntular', baslik: 'Buluntu defteri', tikla: () => pencere.ac(),
});

defterBagla((tur) => !defter.bulunan[tur]);
dinle('buluntu-alindi', ({ tur }) => {
  const sonuc = buluntuEkle(defter, tur);
  defter = sonuc.defter;
  defterKaydet(depo, defter);
  if (!sonuc.yeni) return;
  taze.add(tur);
  const ad = KATALOG.find((b) => b.tur === tur).ad;
  bildir(`Deftere yeni sayfa: ${ad}`, 3200);
});
