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
