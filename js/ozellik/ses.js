/**
 * Ses özelliği: oyun olaylarını dinleyip sentezlenmiş seslere bağlar; sessiz/aç düğmesi
 * (🔊/🔇) ve 'M' tuşu. AudioContext ilk işaretçi/klavye hareketinde açılır.
 */
import { dinle } from '../olaylar.js';
import { dugmeEkle } from '../arayuz.js';
import { hizSinirlayici, kazimDuzeyi, sessizMi, sessizKaydet } from './ses-desen.js';
import * as motor from './ses-motor.js';

const KAZIM_ARALIK_MS = 80;
const TIRMIK_ARALIK_MS = 120;

function depo() {
  try {
    return window.localStorage;
  } catch (hata) {
    console.error('localStorage kullanılamıyor:', hata);
    return null;
  }
}

let sessiz = false;
let dugme = null;

function dugmeyiGuncelle() {
  dugme.textContent = sessiz ? '🔇' : '🔊';
  const ad = sessiz ? 'Sesi aç' : 'Sesi kapat';
  dugme.title = `${ad} (M)`;
  dugme.setAttribute('aria-label', ad);
  dugme.setAttribute('aria-pressed', String(sessiz));
}

function sessizDegistir() {
  sessiz = !sessiz;
  motor.sessizAyarla(sessiz);
  const d = depo();
  if (d) sessizKaydet(d, sessiz);
  dugmeyiGuncelle();
}

function sesKur() {
  const d = depo();
  sessiz = d ? sessizMi(d) : false;
  motor.sessizAyarla(sessiz);
  dugme = dugmeEkle('ust', { metin: '🔊', baslik: 'Sesi kapat', tikla: sessizDegistir });
  dugmeyiGuncelle();

  // Otomatik çalma politikası: bağlam yalnız kullanıcı hareketinde kurulur/sürdürülür.
  for (const olay of ['pointerdown', 'keydown']) {
    document.addEventListener(olay, () => motor.uyandir(), { capture: true });
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') sessizDegistir();
  });

  const kazimIzni = hizSinirlayici(KAZIM_ARALIK_MS);
  const tirmikIzni = hizSinirlayici(TIRMIK_ARALIK_MS);
  dinle('kazildi', ({ miktar }) => {
    if (kazimIzni(performance.now())) motor.kazimSesi(kazimDuzeyi(miktar));
  });
  dinle('tirmiklandi', () => {
    if (tirmikIzni(performance.now())) motor.tirmikSesi();
  });
  dinle('dedektor', ({ seviye }) => motor.dedektorSesi(seviye));
  dinle('dedektor-bos', () => motor.dedektorBosSesi());
  dinle('parilti', () => motor.pariltiSesi());
  dinle('igne-gorundu', () => motor.igneSesi());
  dinle('bulundu', () => motor.bulunduSesi());
  dinle('pes-edildi', () => motor.pesSesi());
  dinle('arac-secildi', () => motor.tikSesi());
}

sesKur();
