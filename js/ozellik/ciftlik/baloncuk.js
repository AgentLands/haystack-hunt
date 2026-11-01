/**
 * İnşanın tuval üstü DOM öğeleri (#tarla-kap içinde): onay baloncuğu (↻ ✓ ✕; dokunmatikte
 * tek dokunuşla konan hayalet, iki dokunuşlu hat ve menfez önerisi `insa.bekleyen` ile
 * gelir), hayaletin yanındaki tek satırlık etiket (geçersizlik nedeni, "bağlantısız",
 * hat rozeti "×14 · 28 kuruş"; `insa.etiket`), sol altta ↶ ↷ (geri al / yinele, 44 px
 * dokunmatik) ve sağda ⌖ Çiftçi. Konumlar her karede karonun ekran yerinden hesaplanır.
 * bekleyen: { kx, ky, onay(), dondur?(), metin? }; etiket: { metin, tur: 'hata' | 'uyari' |
 * 'bilgi', kx, ky }. sokIste: içinde eşya olan parça sökülecekse önce onay kâğıdı.
 */
import { dinle } from '../../olaylar.js';
import { parcaIcerigi } from '../../kural/ciftlik/parca-kayit.js';
import { esyaTanimi } from '../../kural/ciftlik/esya.js';
import { sokCifti } from '../../kural/ciftlik/insa/gecmis.js';
import {
  insa, insaDinle, hamleIptal, geriAl, yinele, geriAlinabilir, ciftlikte, insaEylem,
} from './insa.js';
import { ekranNoktasi, karoPx, ciftciyeDon } from './insa-kamera.js';

const kap = document.getElementById('tarla-kap');

function dugme(sinif, metin, baslik, tikla) {
  const d = document.createElement('button');
  d.type = 'button';
  d.className = sinif;
  d.textContent = metin;
  d.title = baslik;
  d.setAttribute('aria-label', baslik);
  d.addEventListener('click', (e) => {
    e.stopPropagation();
    tikla();
  });
  d.addEventListener('pointerup', () => d.blur());
  return d;
}

const baloncuk = document.createElement('div');
baloncuk.className = 'ciftlik-baloncuk kagit-pencere';
baloncuk.setAttribute('role', 'group');
baloncuk.setAttribute('aria-label', 'Yerleştirmeyi onayla');
baloncuk.hidden = true;
const balonMetin = document.createElement('span');
balonMetin.className = 'ciftlik-baloncuk-metin';
const balonDon = dugme('ciftlik-balon-don', '↻', 'Döndür', () => insa.bekleyen?.dondur?.());
const onay = dugme('ciftlik-onay', '✓', 'Kur', () => insa.bekleyen?.onay());
baloncuk.append(balonMetin, balonDon, onay,
  dugme('ciftlik-balon-iptal', '✕', 'Vazgeç', () => hamleIptal()));

const etiket = document.createElement('div');
etiket.className = 'ciftlik-etiket';
etiket.setAttribute('role', 'status');
etiket.setAttribute('aria-live', 'polite');
etiket.hidden = true;

const gerial = document.createElement('div');
gerial.className = 'ciftlik-gerial';
gerial.hidden = true;
const geriDugme = dugme('', '↶', 'Geri al (Ctrl+Z)', geriAl);
const ileriDugme = dugme('', '↷', 'Yinele (Ctrl+Y)', yinele);
gerial.append(geriDugme, ileriDugme);
const ciftciDugme = dugme('ciftlik-ciftci', '⌖', 'Çiftçiye dön (C)', ciftciyeDon);
ciftciDugme.hidden = true;
kap.append(baloncuk, etiket, gerial, ciftciDugme);

/** Öğeyi karonun üstüne (yukarı payıyla) yerleştirir; kabın içinde kenetler. */
function konumla(oge, kx, ky, yukari) {
  const k = kap.getBoundingClientRect();
  const p = ekranNoktasi(kx, ky);
  const en = oge.offsetWidth;
  const boy = oge.offsetHeight;
  const x = Math.min(k.width - en - 4, Math.max(4, p.x - k.left - en / 2));
  let y = p.y - k.top - karoPx() / 2 - yukari - boy;
  if (y < 4) y = p.y - k.top + karoPx() / 2 + yukari;
  oge.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

dinle('kare', () => {
  const b = ciftlikte() ? insa.bekleyen : null;
  baloncuk.hidden = !b;
  if (b) {
    balonMetin.textContent = b.metin ?? '';
    balonMetin.hidden = !b.metin;
    balonDon.hidden = !b.dondur;
    onay.disabled = b.gecersiz === true;
    konumla(baloncuk, b.kx, b.ky, 10);
  }
  const e = ciftlikte() && !b ? insa.etiket : null;
  etiket.hidden = !e;
  if (e) {
    if (etiket.textContent !== e.metin) etiket.textContent = e.metin;
    etiket.dataset.tur = e.tur;
    konumla(etiket, e.kx, e.ky, insa.basili?.dokunus ? 56 : 6);
  }
});

insaDinle(() => {
  const goster = ciftlikte() && insa.acik;
  gerial.hidden = !goster;
  ciftciDugme.hidden = !goster;
  const { geri, ileri } = geriAlinabilir();
  geriDugme.disabled = !geri;
  ileriDugme.disabled = !ileri;
});

// --- Söküm onayı ---
const kagit = document.createElement('div');
kagit.className = 'ciftlik-onay-kagidi kagit-pencere';
kagit.setAttribute('role', 'alertdialog');
kagit.hidden = true;
const kagitMetin = document.createElement('p');
let kagitEvet = null;
kagit.append(kagitMetin, dugme('dugme-ikincil', 'Vazgeç', 'Vazgeç', () => {
  kagit.hidden = true;
}), dugme('dugme-birincil ciftlik-onay-sok', 'Sök', 'Sök', () => {
  kagit.hidden = true;
  kagitEvet?.();
}));
kap.append(kagit);

/** Parçalardaki eşyaların özeti: { n, degerli } (degerli: iğne ve buluntu). */
function icerikOzeti(parcalar) {
  let n = 0;
  let degerli = 0;
  for (const p of parcalar) {
    for (const [kod, adet] of parcaIcerigi(p).esya) {
      n += adet;
      const t = esyaTanimi(kod);
      if (t && (t.anahtar === 'igne' || t.anahtar.startsWith('buluntu:'))) degerli += adet;
    }
  }
  return { n, degerli };
}

/** Parçaları tek adımda söker; içinde eşya varsa önce sorar. */
export function sokIste(parcalar) {
  if (!parcalar.length) return;
  const ad = parcalar.length === 1 ? parcalar[0].tanim.ad : `${parcalar.length} parça`;
  const sok = () => insaEylem(`${ad} sökümü`, parcalar.map(sokCifti));
  const { n, degerli } = icerikOzeti(parcalar);
  if (!n) {
    sok();
    return;
  }
  const ek = degerli ? ` (${degerli} iğne/buluntu)` : '';
  kagitMetin.textContent = `${ad}: içinde ${n} eşya var${ek}. Sökünce eşyalar envanterine `
    + 'geçer.';
  kagitEvet = sok;
  kagit.hidden = false;
  kagit.querySelector('.ciftlik-onay-sok').focus();
}

dinle('oyun-basladi', () => {
  kagit.hidden = true;
});
