/**
 * Makine çizimi girişi: makinenin türüne göre traktör, balya makinesi ya da sırt
 * üfleyicisi çizimine yönlendirir, üstüne yakıt göstergesini (yakit-gosterge) ekler.
 * Kımıldamayan (park etmiş, sürücüsüz) makine önbellekten tek drawImage ile basılır.
 * Sırt üfleyicisine binilmişse (surucu) makine ayrıca çizilmez; karakter-cizim sırtında
 * motor ve elinde boru olarak gösterir, burada yalnız göstergesi çizilir.
 */
import { traktorCiz } from './traktor-cizim.js';
import { balyaMakineCiz } from './balya-makine-cizim.js';
import { ufleyiciCiz } from './ufleyici-cizim.js';
import { yakitGostergesi } from './yakit-gosterge.js';
import { halAl, kapakAcikligi, pofYasi } from './makine-hal.js';
import { onbellekliCiz } from './onbellek.js';

/**
 * Tür → { çizim, gövdenin yarı boyu ve yarı eni (gösterge makinenin ekrandaki üst kenarının
 * hemen üstüne konur), önbellek kutusunun yarı boyu }.
 */
const TURLER = {
  traktor: { ciz: traktorCiz, boy: 2.9, en: 1.8, yari: 4.3 },
  balya: { ciz: balyaMakineCiz, boy: 3.2, en: 2.0, yari: 4.3 },
  ufleyici: { ciz: ufleyiciCiz, boy: 1.0, en: 0.7, yari: 2.9 },
};

/** Göstergenin makine merkezinin üstündeki uzaklığı: yöne göre gövdenin ekrandaki üst ucu. */
function gostergeYukari(tur, yon) {
  return Math.abs(Math.sin(yon)) * tur.boy + Math.abs(Math.cos(yon)) * tur.en + 0.3;
}

/** Makine bu karede hiç kımıldamıyor mu (görüntüsü önbellekten basılabilir mi)? */
function durgun(makine, zaman) {
  if (makine.surucu || makine.calisiyor || Math.abs(makine.hiz || 0) > 0.01) return false;
  const h = halAl(makine, zaman);
  const t = zaman / 1000;
  return h.kalkis < 0.005 && Math.abs(h.direksiyon) < 0.002 && pofYasi(h, t) >= 1
    && kapakAcikligi(h, t) === 0;
}

/** makine: durum.makineler[i] (tur 'traktor' | 'balya' | 'ufleyici'); zaman ms. */
export function makineCiz(ctx, makine, zaman) {
  const tur = TURLER[makine.tur];
  if (!tur) return;
  if (makine.tur === 'ufleyici' && makine.surucu) {
    yakitGostergesi(ctx, makine, zaman, 1.3);
    return;
  }
  if (durgun(makine, zaman)) {
    const yakit = Math.round(Math.max(0, makine.yakit || 0) * 50);
    const anahtar = `${makine.tur}|${(makine.yon || 0).toFixed(3)}|${yakit}|${
      (makine.yuk || 0).toFixed(2)}`;
    const r = tur.yari;
    onbellekliCiz(ctx, makine, anahtar, makine.x, makine.y, [-r, -r, r, r],
      (c) => tur.ciz(c, { ...makine, x: 0, y: 0 }, zaman));
  } else {
    tur.ciz(ctx, makine, zaman);
  }
  yakitGostergesi(ctx, makine, zaman, gostergeYukari(tur, makine.yon || 0));
}
