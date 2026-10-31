/**
 * Dedektör halkaları: her okuma dünyada kalıcı, yarı saydam, kesik çizgili bir daire
 * olarak çizilir; yarıçap seviyenin gerçek uzaklığıdır (araclar.js SEVIYELER: iğne o
 * daireyle bir alt seviyenin dairesi arasındaki halkada). "Soğuk" okuma en geniş seviye
 * dairesini mavi çizer ve içini hafifçe karartır (iğne burada değil). Okumada daire
 * merkezden büyüyerek açılır; etiket ("Sıcak ≤25") okuma noktasının epey üstünde (karakterin
 * üstüne binmeden) durur: ilk ETIKET_TAM ms belirgin, sonra soluk ama kalıcı.
 * Alt katmanda (iğne ve imleçten önce) çizilir; yalnız durum.halkalar'ı okur. Telafi hakkı
 * verilince (kural/dedektor.js) kısa bir bildirim gösterir.
 */
import { katmanEkle, OLCEK } from '../cizim.js';
import { dinle } from '../olaylar.js';
import { bildir } from '../arayuz.js';
import { gorunum } from '../gorunum.js';
import { SEVIYELER } from '../kural/araclar.js';

const ACILMA_MS = 650;
const ETIKET_TAM = 9000;
const ETIKET_SOLUK = 0.6;
const ETIKET_ALT = 42;
const ETIKET_UST = 64;
/** Sonlu en büyük seviye uzaklığı (Soğuk dairesi). */
const EN_GENIS = Math.max(...SEVIYELER.filter((s) => Number.isFinite(s.mesafe))
  .map((s) => s.mesafe));

/** Seviyenin bandı (hücre): iç ve dış yarıçap; Soğuk için dış Infinity. */
export function seviyeBandi(seviye) {
  const i = SEVIYELER.findIndex((s) => s.ad === seviye.ad);
  const ic = i > 0 ? SEVIYELER[i - 1].mesafe : 0;
  return { ic, dis: seviye.mesafe };
}

/** Etiket metni: "Sıcak ≤25", "Soğuk >50". */
export function seviyeEtiketi(seviye) {
  const { ic, dis } = seviyeBandi(seviye);
  return Number.isFinite(dis) ? `${seviye.ad} ≤${dis}` : `${seviye.ad} >${ic}`;
}

function daire(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}

function halkaCiz(ctx, halka, zaman, k) {
  const gecen = zaman - halka.zaman;
  const acilma = Math.min(1, Math.max(0, gecen / ACILMA_MS));
  const yumusak = 1 - (1 - acilma) ** 3;
  const x = (halka.x + 0.5) * OLCEK;
  const y = (halka.y + 0.5) * OLCEK;
  const { ic, dis } = seviyeBandi(halka.seviye);
  const soguk = !Number.isFinite(dis);
  const r = (soguk ? EN_GENIS : dis) * OLCEK * yumusak;
  const renk = halka.seviye.renk;
  // Dolgu: Soğuk'ta elenen iç, diğerlerinde iğnenin olabileceği halka bandı.
  ctx.globalAlpha = soguk ? 0.1 : 0.08;
  ctx.fillStyle = soguk ? '#1d2a3a' : renk;
  daire(ctx, x, y, r);
  if (!soguk && ic > 0) ctx.arc(x, y, ic * OLCEK * yumusak, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = renk;
  ctx.lineWidth = 2 * k;
  ctx.setLineDash([7 * k, 5 * k]);
  ctx.lineDashOffset = -zaman / 90 * k;
  daire(ctx, x, y, r);
  ctx.stroke();
  ctx.setLineDash([]);
  // Okuma noktası: ekranda sabit küçük halka.
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2 * k;
  daire(ctx, x, y, 4 * k);
  ctx.stroke();
  // Etiket okuma noktasının ETIKET_ALT..ETIKET_UST ekran pikseli üstünde (karakterden açıkta),
  // daire kenarı bu aralıktaysa tam kenarında.
  const ust = Math.min(ETIKET_UST * k, Math.max(ETIKET_ALT * k, r));
  etiketCiz(ctx, halka, x, y - ust, gecen, k);
}

function etiketCiz(ctx, halka, x, ustY, gecen, k) {
  const metin = seviyeEtiketi(halka.seviye);
  ctx.save();
  ctx.translate(x, ustY);
  ctx.scale(k, k);
  ctx.globalAlpha = gecen < ETIKET_TAM ? 1 : ETIKET_SOLUK;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const en = ctx.measureText(metin).width + 10;
  ctx.fillStyle = 'rgba(20, 14, 8, 0.72)';
  ctx.fillRect(-en / 2, -18, en, 16);
  ctx.fillStyle = halka.seviye.renk;
  ctx.fillText(metin, 0, -10);
  ctx.restore();
}

katmanEkle((ctx, durum, zaman) => {
  if (!durum.halkalar || !durum.halkalar.length) return;
  const k = 1 / gorunum.z;
  ctx.save();
  for (const halka of durum.halkalar) halkaCiz(ctx, halka, zaman, k);
  ctx.restore();
}, 'alt');

dinle('dedektor', ({ telafi }) => {
  if (telafi) bildir('Hepsi Soğuk çıktı: şansına bir dedektör hakkı daha verildi.', 3600);
});
