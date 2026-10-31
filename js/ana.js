/**
 * Giriş noktası: çizimi, arayüzü ve girdiyi kurar, özellik modüllerini yükler,
 * oyunu başlatıp kare döngüsünü çalıştırır.
 */
import { cizici } from './cizim.js';
import { yeniOyun, adim, durumAl } from './oyun.js';
import { girdiKur } from './girdi.js';
import { arayuzKur } from './arayuz.js';
import { gununEtiketi } from './kural/rastgele.js';
// Özellik modülleri (js/ozellik/): her biri kendi satırında, olaylara kendisi bağlanır.
import './ozellik/ses.js';
import './ozellik/ses-makine.js';
import './ozellik/pwa.js';
import './ozellik/rehber.js';
import './ozellik/duyuru.js';
import './ozellik/sure-duraklat.js';
import './ozellik/istatistik.js';
import './ozellik/kamera.js';
import './ozellik/makine-bildirim.js';
import './ozellik/mekanik.js';
import './ozellik/efekt/efekt.js';
import './ozellik/yaris.js';
import './ozellik/dokunmatik.js';
import './ozellik/gorsel/katman.js';
import './ozellik/balya-isaret.js';

const tuval = document.getElementById('tarla');
const ciz = cizici(tuval);
arayuzKur();
girdiKur(tuval);
yeniOyun(new URLSearchParams(location.search).get('tohum') || gununEtiketi());

function kare(zaman) {
  adim(zaman);
  ciz(durumAl(), zaman);
  requestAnimationFrame(kare);
}
requestAnimationFrame(kare);
