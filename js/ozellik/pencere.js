/**
 * Kâğıt pencere yardımcısı: ortak pencere.css'i ve istenen ek stil dosyalarını yükler;
 * dialog'a sağ üstte × kapatma düğmesi ve (isteğe bağlı) dışına tıklayınca kapanma ekler.
 * Esc ile kapanmayı showModal() kendisi sağlar. Sınıflar (kagit-pencere, pencere) çağıranda.
 */
const yuklenen = new Set();

/** Bir stil dosyasını (bu modüle göre göreli adres) bir kez <link> ile yükler. */
export function stilYukle(dosya) {
  const adres = new URL(dosya, import.meta.url).href;
  if (yuklenen.has(adres)) return;
  yuklenen.add(adres);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = adres;
  document.head.append(link);
}

stilYukle('./pencere.css');

const CARPI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5 C9 9 15 15 19 18.8 '
  + 'M18.6 5 C15 9.2 9 15.2 5.3 19" fill="none" stroke="currentColor" stroke-width="2.4" '
  + 'stroke-linecap="round"/></svg>';

/** Tıklama pencerenin kâğıdının dışında (arka plan perdesinde) mi? */
function perdeyeTiklandi(pencere, olay) {
  const k = pencere.getBoundingClientRect();
  return olay.clientX < k.left || olay.clientX > k.right
    || olay.clientY < k.top || olay.clientY > k.bottom;
}

/**
 * × düğmesini ekler. kap: düğmenin konduğu kâğıt kutu (varsayılan dialog'un kendisi);
 * dis: perdeye tıklayınca kapansın mı.
 */
export function pencereHazirla(pencere, { kap = pencere, dis = false } = {}) {
  const kapat = document.createElement('button');
  kapat.type = 'button';
  kapat.className = 'pencere-kapat';
  kapat.title = 'Kapat (Esc)';
  kapat.setAttribute('aria-label', 'Kapat');
  kapat.innerHTML = CARPI;
  kapat.addEventListener('click', () => pencere.close());
  kap.append(kapat); // sıra sonda: ilk odak içeriğe düşsün, × yalnız Tab ile gelsin
  if (dis) {
    pencere.addEventListener('click', (olay) => {
      if (olay.target === pencere && perdeyeTiklandi(pencere, olay)) pencere.close();
    });
  }
  return kapat;
}
