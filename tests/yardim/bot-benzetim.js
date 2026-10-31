/**
 * Bot benzetimi (DOM ve oyun.js yok): js/kural/ işlevleriyle oyun.js'in kare mantığını
 * yeniden kurar, botun komutlarını uygular ve olayları bota iletir.
 */
import { tarlaKur, cokert } from '../../js/kural/tarla.js';
import { igneDerinligi } from '../../js/kural/igne.js';
import {
  elIleAl, tirmikla, dedektorOku, igneyiAlabilirMi, DEDEKTOR_HAKKI,
} from '../../js/kural/araclar.js';
import { metindenTohum } from '../../js/kural/rastgele.js';
import { botKur } from '../../js/ozellik/bot-surucu.js';

const KARE_MS = 1000 / 60;
const PARILTI_ARALIK = 12000;
const PARILTI_DERINLIK = 8;

/** Bir tohumda botu oynatır; { bulundu, kare, saniye, okumalar } döndürür. */
export function botOynat(etiket, kareLimiti = 3600, izle = null) {
  const tarla = tarlaKur(metindenTohum(etiket));
  const bot = botKur({ h0: tarla.h.slice() });
  const d = { arac: 'el', basili: false, imlec: null, son: null, hak: DEDEKTOR_HAKKI };
  let gorundu = false;
  let sonrakiParilti = PARILTI_ARALIK;
  const olaylar = [];
  const sonuc = (bulundu, kare) => ({
    bulundu, kare, saniye: (kare * KARE_MS) / 1000, okumalar: DEDEKTOR_HAKKI - d.hak,
  });

  const uygula = (k, zaman) => {
    if (k.t === 'arac') d.arac = k.arac;
    else if (k.t === 'birak') d.basili = false;
    else if (k.t === 'surukle') {
      d.imlec = { x: k.x, y: k.y };
      if (d.basili && d.arac === 'tirmik') {
        const dx = k.x - d.son.x;
        const dy = k.y - d.son.y;
        if (Math.hypot(dx, dy) >= 1.5) {
          tirmikla(tarla, k.x, k.y, dx, dy);
          d.son = { x: k.x, y: k.y };
        }
      }
    } else if (k.t === 'bas') {
      Object.assign(d, { basili: true, imlec: { x: k.x, y: k.y }, son: { x: k.x, y: k.y } });
      if (d.arac === 'dedektor' && d.hak > 0) {
        d.hak--;
        olaylar.push(['dedektor', { x: k.x, y: k.y, seviye: dedektorOku(tarla, k.x, k.y) }]);
      }
    }
  };

  for (let kare = 0; kare < kareLimiti; kare++) {
    const zaman = (kare + 1) * KARE_MS;
    for (const k of bot.kare({ h: tarla.h, dedektor: d.hak, bitti: false }, KARE_MS / 1000)) {
      if (izle) izle(kare, k, tarla);
      uygula(k, zaman);
    }
    if (d.basili && d.arac === 'el' && d.imlec) {
      if (igneyiAlabilirMi(tarla, d.imlec.x, d.imlec.y)) {
        return sonuc(true, kare + 1);
      }
      elIleAl(tarla, d.imlec.x, d.imlec.y);
    }
    if (cokert(tarla)) cokert(tarla);
    const derinlik = igneDerinligi(tarla);
    if (derinlik === 0 && !gorundu) {
      gorundu = true;
      olaylar.push(['igne-gorundu', { x: tarla.igne.x, y: tarla.igne.y }]);
    }
    if (zaman >= sonrakiParilti) {
      const { x, y } = tarla.igne;
      if (derinlik <= PARILTI_DERINLIK) olaylar.push(['parilti', { x, y }]);
      sonrakiParilti = zaman + PARILTI_ARALIK;
    }
    while (olaylar.length) bot.olay(...olaylar.shift());
  }
  return sonuc(false, kareLimiti);
}
