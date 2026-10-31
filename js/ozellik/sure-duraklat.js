/**
 * Sekme gizlenince oyun saatini durdurur: gizli kalınan süre oyun süresine sayılmaz
 * (visibilitychange; kaydırma işi oyun.js zamaniKaydir ile yapılır).
 */
import { zamaniKaydir } from '../oyun.js';

let gizlenme = null;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gizlenme = performance.now();
  } else if (gizlenme !== null) {
    zamaniKaydir(performance.now() - gizlenme);
    gizlenme = null;
  }
});
