/**
 * Çizim önbelleği: kımıldamayan şeyleri (park etmiş makine, garaj zemini, çatı) ekran
 * ölçeğinde bir kez ara tuvale çizip her karede tek drawImage ile basar. Önbellek dünya
 * hizalıdır (döndürme içine işlenir) ve ekran ölçeğinde çizilir: basarken yumuşatma
 * gerekmez (yumuşatmalı drawImage yazılımsal çizimde pahalı). Anahtar değişince ya da
 * yakınlaştırma %2'den çok değişince yeniden çizilir (yakınlaşma sürerken önbellek her kare
 * yenilenir, durunca kalır). Belge yoksa (Node birim testleri gibi) doğrudan çizer.
 */
import { OLCEK } from '../../cizim.js';

const kayitlar = new WeakMap();
const OLCEK_PAYI = 0.02;
/** Ara tuvalin bir kenarı en çok bu kadar piksel olur (çok yakında bellek patlamasın). */
const EN_BUYUK = 2048;

/** Ara tuvali (gerekirse yeniden) çizer; dönüş: kayıt { tuval, anahtar, olcek }. */
function hazirla(belge, sahip, anahtar, olcek, kutu, cizim) {
  const [x0, y0, x1, y1] = kutu;
  let k = kayitlar.get(sahip);
  if (k && k.anahtar === anahtar && Math.abs(olcek / k.olcek - 1) <= OLCEK_PAYI) return k;
  const w = Math.min(EN_BUYUK, Math.max(1, Math.ceil((x1 - x0) * OLCEK * olcek)));
  const h = Math.min(EN_BUYUK, Math.max(1, Math.ceil((y1 - y0) * OLCEK * olcek)));
  if (!k) {
    k = { tuval: belge.createElement('canvas') };
    kayitlar.set(sahip, k);
  }
  const { tuval } = k;
  if (tuval.width !== w || tuval.height !== h) {
    tuval.width = w;
    tuval.height = h;
  }
  const c = tuval.getContext('2d');
  const sx = w / ((x1 - x0) * OLCEK);
  const sy = h / ((y1 - y0) * OLCEK);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  c.setTransform(sx, 0, 0, sy, -x0 * OLCEK * sx, -y0 * OLCEK * sy);
  cizim(c);
  k.anahtar = anahtar;
  k.olcek = olcek;
  return k;
}

/**
 * sahip (nesne; önbellek ona bağlı) için önbellekli çizim. cizim(c) dünya uzayında,
 * sahibin merkezi (0, 0) olacak şekilde çizer (ör. makinenin x = y = 0 kopyasıyla);
 * kutu [x0, y0, x1, y1] merkeze göre kapsayan dikdörtgen (hücre); (mx, my) merkez (dünya
 * birimi). alfa: basarken saydamlık.
 */
export function onbellekliCiz(ctx, sahip, anahtar, mx, my, kutu, cizim, alfa = 1) {
  const tuval = ctx.canvas;
  const belge = tuval && tuval.ownerDocument;
  const t = ctx.getTransform();
  const olcek = Math.hypot(t.a, t.b);
  ctx.save();
  ctx.globalAlpha *= alfa;
  if (!belge || !(olcek > 0)) {
    ctx.translate(mx * OLCEK, my * OLCEK);
    cizim(ctx);
    ctx.restore();
    return;
  }
  const k = hazirla(belge, sahip, anahtar, olcek, kutu, cizim);
  const [x0, y0, x1, y1] = kutu;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(k.tuval, (mx + x0) * OLCEK, (my + y0) * OLCEK, (x1 - x0) * OLCEK,
    (y1 - y0) * OLCEK);
  ctx.restore();
}
