/**
 * Seç ve yapıştır düğmeleri (DOM; ciftlik.js'in tek içe aktardığı giriş: çizim, girdi ve şablon
 * penceresini de yükler). Tuvalin altında, inşa paletinin üstünde küçük kâğıt şerit:
 *   boşta      ▢ Seç · Şablon (· Yapıştır: panoda küme varsa)
 *   seç kipi   ▢ Seç · Kopyala · Sök · Şablon kaydet · ✕       (+ "N parça · M karo")
 *   yapıştır   ⟳ döndür · ⇋ aynala · ✓ onayla · ✕              (+ "N karo engelli · M kuruş")
 * ✓ engel ya da kuruş eksiği varken soluk (aria-disabled): hepsi ya hiç. Düğmeler ≥ 44 px.
 * Yalnız çiftlik modunda görünür (CSS: body.ciftlik-mod). Kısayollar: V, Ctrl+C, Ctrl+V, R, T.
 */
import { kumeKaroSayisi } from '../../kural/ciftlik/izgara/kume.js';
import { sayacMetni } from '../../kural/ciftlik/izgara/denetim.js';
import {
  secim, secimDinle, secimKipi, kopyala, alaniSok, kipKapat, yapistirBaslat, yapistirDondur,
  yapistirAynala, yapistirOnayla,
} from './secim.js';
import { sablonPaneliAc } from './sablon-arayuz.js';
import './secim-girdi.js';
import './secim-cizim.js';

const stil = document.createElement('link');
stil.rel = 'stylesheet';
stil.href = new URL('./secim.css', import.meta.url).href;
document.head.append(stil);

const kap = document.getElementById('tarla-kap');
const serit = document.createElement('div');
serit.className = 'ciftlik-secim-serit kagit-pencere';
serit.setAttribute('role', 'toolbar');
serit.setAttribute('aria-label', 'Seç ve yapıştır');
kap.append(serit);

function dugme(sinif, metin, baslik, tikla) {
  const d = document.createElement('button');
  d.type = 'button';
  d.className = `ciftlik-secim-dugme ${sinif}`;
  d.textContent = metin;
  d.title = baslik;
  d.addEventListener('click', tikla);
  d.addEventListener('pointerup', () => d.blur());
  return d;
}

const secDugme = dugme('sec', '▢ Seç', 'Seç ve kopyala (V)', () => secimKipi());
const sablonDugme = dugme('sablon', 'Şablon', 'Şablonlar', () => sablonPaneliAc());
const yapistirDugme = dugme('yapistir', 'Yapıştır', 'Kopyayı yapıştır (Ctrl+V)',
  () => yapistirBaslat(secim.pano));
const kopyaDugme = dugme('kopya', 'Kopyala', 'Seçimi kopyala (Ctrl+C)', kopyala);
const sokDugme = dugme('sok', 'Sök', 'Seçimi söker (Delete)', alaniSok);
const kaydetDugme = dugme('kaydet', 'Şablon kaydet', 'Seçimi şablon olarak kaydet',
  () => sablonPaneliAc({ kume: secim.secilen.kume }));
const donDugme = dugme('don', '⟳', 'Döndür (R, Shift+R ters)', () => yapistirDondur(1));
const aynaDugme = dugme('ayna', '⇋', 'Aynala: sol/sağ (T)', yapistirAynala);
const onayDugme = dugme('onay', '✓', 'Yapıştır (Enter)', yapistirOnayla);
const kapatDugme = dugme('kapat', '✕', 'Kipten çık (Esc)', kipKapat);
for (const [d, ad] of [[donDugme, 'Döndür'], [aynaDugme, 'Aynala'], [onayDugme, 'Yapıştır'],
  [kapatDugme, 'Kipten çık']]) d.setAttribute('aria-label', ad);
const durum = document.createElement('span');
durum.className = 'ciftlik-secim-durum';
durum.setAttribute('aria-live', 'polite');
serit.append(secDugme, sablonDugme, yapistirDugme, kopyaDugme, sokDugme, kaydetDugme,
  donDugme, aynaDugme, onayDugme, kapatDugme, durum);

function metin(s) {
  if (s.kip === 'yapistir') {
    const sayac = s.denetim ? sayacMetni(s.denetim) : '';
    return [sayac, s.uyari].filter(Boolean).join(' · ');
  }
  if (s.kip === 'sec') {
    if (s.uyari) return s.uyari;
    if (!s.alan) return 'Alan sürükle';
    return s.secilen
      ? `${s.secilen.kume.parcalar.length} parça · ${kumeKaroSayisi(s.secilen.kume)} karo` : '';
  }
  return '';
}

secimDinle((s) => {
  const yap = s.kip === 'yapistir';
  const sec = s.kip === 'sec';
  secDugme.setAttribute('aria-pressed', String(sec));
  sablonDugme.hidden = yap;
  yapistirDugme.hidden = !s.pano || yap;
  for (const d of [kopyaDugme, sokDugme, kaydetDugme]) d.hidden = !(sec && s.secilen);
  for (const d of [donDugme, aynaDugme, onayDugme]) d.hidden = !yap;
  kapatDugme.hidden = !s.kip;
  secDugme.hidden = yap;
  sokDugme.classList.toggle('onay', s.sokOnay);
  onayDugme.setAttribute('aria-disabled', String(!(s.denetim?.gecerli)));
  durum.textContent = metin(s);
  durum.hidden = !durum.textContent;
});
kipKapat();
