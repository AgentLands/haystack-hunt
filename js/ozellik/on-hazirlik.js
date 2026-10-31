/**
 * Ön hazırlık: pahalı saf hesapları arka plan işçisine (arka-isci.js) yaptırır ki ana iş
 * parçacığı donmasın.
 * 1. Yakın görünüm dokuları: açılışta hemen istenir; gelene dek yakın görünümde kaba tarla
 *    çizilir (cizim/yakin.js dokuKaynagiKur).
 * 2. Tarla yerleşmesi: her yeni oyundan biraz sonra sıradaki rastgele tarla ve günün tarlası
 *    (aynı zorlukta) arkada kurulur; "Yeni tarla" / "Günün tarlası" tıklanınca tarlaKur
 *    yerleşme döngüsünü atlar (kural/tarla.js yerlesmisEkle). Sonuç bit bit aynıdır.
 * İşçi kurulamazsa (eski tarayıcı, çevrimdışı ve önbellekte yok) hata günlüğe yazılır ve
 * her şey eskisi gibi eşzamanlı çalışır.
 */
import { dokuKaynagiKur, yerelDokular, DOKU } from '../cizim/yakin.js';
import { yerlesmisEkle, yerlesmisVar } from '../kural/tarla.js';
import { zorlukTohumu } from '../kural/zorluk.js';
import { gununEtiketi } from '../kural/rastgele.js';
import { siradakiEtiket } from '../oyun.js';
import { dinle } from '../olaylar.js';

/** Yeni oyundan sonra ön hazırlığa başlamadan beklenen süre (ilk kareler rahat çizilsin). */
const BEKLEME_MS = 600;

let isci = null;
let dokular = null;
let dokuIstendi = false;
const bekleyen = new Set();
const anahtar = (tohum, zorluk) => `${tohum}|${zorluk}`;

function isciBirak(neden) {
  console.error('Arka plan işçisi kullanılamıyor; hesaplar eşzamanlı sürecek:', neden);
  if (isci) isci.terminate();
  isci = null;
  bekleyen.clear();
}

function gelen({ data }) {
  if (data.tur === 'doku') {
    dokular = { T: data.T, ...data.saman, toprak: data.toprak };
  } else if (data.tur === 'tarla') {
    bekleyen.delete(anahtar(data.tohum, data.zorluk));
    yerlesmisEkle(data.tohum, data.zorluk, data);
  }
}

function isciKur() {
  try {
    isci = new Worker(new URL('./arka-isci.js', import.meta.url), { type: 'module' });
  } catch (hata) {
    isciBirak(hata);
    return;
  }
  isci.addEventListener('message', gelen);
  isci.addEventListener('error', (olay) => {
    olay.preventDefault();
    isciBirak(olay.message || 'yüklenemedi');
  });
  isci.addEventListener('messageerror', () => isciBirak('ileti çözülemedi'));
}

/** Yakın görünüm dokuları: işçiden gelene dek null (kaba çizim); işçi yoksa burada üret. */
function dokuVer() {
  if (dokular) return dokular;
  if (!isci) return yerelDokular();
  if (!dokuIstendi) {
    dokuIstendi = true;
    isci.postMessage({ tur: 'doku', T: DOKU.T, S: DOKU.S, tohumSaman: DOKU.saman,
      tohumToprak: DOKU.toprak });
  }
  return null;
}

function tarlaHazirla(etiket, zorluk) {
  const tohum = zorlukTohumu(etiket, zorluk);
  const k = anahtar(tohum, zorluk);
  if (!isci || yerlesmisVar(tohum, zorluk) || bekleyen.has(k)) return;
  bekleyen.add(k);
  isci.postMessage({ tur: 'tarla', tohum, zorluk });
}

isciKur();
dokuKaynagiKur(dokuVer);
dokuVer(); // açılışta hemen başlasın: ilk yakın kareye yetişsin

let zamanlayici = null;
dinle('oyun-basladi', ({ durum }) => {
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(() => {
    for (const etiket of [siradakiEtiket(), gununEtiketi()]) {
      if (etiket !== durum.etiket) tarlaHazirla(etiket, durum.zorluk);
    }
  }, BEKLEME_MS);
});
