/**
 * Geçici inşa paleti (DOM; arayüz ajanı aile sekmeleri ve kartlarla genişletecek): tuvalin
 * altında kâğıt şerit. Kayıtlı bütün parça türleri (parcaTurleri) kendiliğinden düğme olur;
 * yanında Sök, Döndür (R) ve Kapat. Palet kapalıyken çiftlikte tek "İnşa (B)" düğmesi
 * görünür. Düğmeler ≥ 44 px (dokunmatik); 390 px'te şerit kendi içinde kayar.
 */
import { parcaTurleri } from '../../kural/ciftlik/parca-kayit.js';
import { YON_ADI } from '../../kural/ciftlik/olcu.js';
import { insa, insaDinle, paletAc, sec, dondur } from './insa.js';

const kap = document.getElementById('tarla-kap');

function dugme(sinif, metin, baslik, tikla) {
  const d = document.createElement('button');
  d.type = 'button';
  d.className = sinif;
  d.textContent = metin;
  if (baslik) d.title = baslik;
  d.addEventListener('click', tikla);
  d.addEventListener('pointerup', () => d.blur());
  return d;
}

const ac = dugme('ciftlik-insa-ac dugme-birincil', 'İnşa', 'İnşa paleti (B)', () => paletAc(true));
ac.hidden = true;
const palet = document.createElement('div');
palet.className = 'ciftlik-palet kagit-pencere';
palet.setAttribute('role', 'toolbar');
palet.setAttribute('aria-label', 'İnşa paleti');
palet.hidden = true;
const seritler = document.createElement('div');
seritler.className = 'ciftlik-palet-serit';
const parcaDugmeleri = new Map();

function parcalariKur() {
  for (const t of parcaTurleri()) {
    if (parcaDugmeleri.has(t.anahtar)) continue;
    const d = dugme('ciftlik-parca', t.ad, `${t.ad} (${t.boyut.join('×')})`,
      () => sec(t.anahtar));
    d.dataset.parca = t.anahtar;
    parcaDugmeleri.set(t.anahtar, d);
    seritler.append(d);
  }
}

const sokDugme = dugme('ciftlik-parca ciftlik-sok', 'Sök', 'Sök (X, sağ tık)', () => sec('sok'));
sokDugme.dataset.parca = 'sok';
const donDugme = dugme('ciftlik-arac', '↻', 'Döndür (R)', () => dondur(1));
const kapat = dugme('ciftlik-arac', '✕', 'Paleti kapat (Esc)', () => paletAc(false));
donDugme.setAttribute('aria-label', 'Döndür');
kapat.setAttribute('aria-label', 'Paleti kapat');
parcalariKur();
seritler.append(sokDugme);
palet.append(seritler, donDugme, kapat);
kap.append(ac, palet);

/** Çiftliğe girilince/çıkılınca görünürlük (ciftlik.js çağırır). */
export function paletGoster(ciftlikte) {
  parcalariKur();
  ac.hidden = !ciftlikte || insa.acik;
  palet.hidden = !ciftlikte || !insa.acik;
}

insaDinle((d) => {
  ac.hidden = d.acik || !document.body.classList.contains('ciftlik-mod');
  palet.hidden = !d.acik;
  for (const [ad, b] of [...parcaDugmeleri, ['sok', sokDugme]]) {
    b.setAttribute('aria-pressed', String(d.secili === ad));
  }
  donDugme.title = `Döndür (R): şimdi ${YON_ADI[d.yon]}`;
});
