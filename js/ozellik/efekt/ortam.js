/**
 * Ortam ışığı: tarlanın üstüne sol üstten sıcak güneş tülü ve kenarlarda hafif vinyet.
 * Ekran uzayında çizilir (kamera dönüşümünden bağımsız). İki gradyan, tuval boyutu
 * değişince bir kez küçük bir ara tuvale (çeyrek çözünürlük; yumuşak geçişte fark
 * görünmez) boyanır ve her karede tek bir yumuşatılmış drawImage ile serilir: her karede
 * iki tam ekran gradyan dolgusu yapılmaz.
 */
const KUCULTME = 4;

let onbellek = null;

function kur(en, boy) {
  const ara = document.createElement('canvas');
  ara.width = Math.max(1, Math.ceil(en / KUCULTME));
  ara.height = Math.max(1, Math.ceil(boy / KUCULTME));
  const c = ara.getContext('2d');
  c.scale(ara.width / en, ara.height / boy);
  const gunes = c.createLinearGradient(0, 0, en, boy);
  gunes.addColorStop(0, 'rgba(255, 226, 160, 0.10)');
  gunes.addColorStop(0.5, 'rgba(255, 226, 160, 0)');
  gunes.addColorStop(1, 'rgba(40, 30, 60, 0.10)');
  const vinyet = c.createRadialGradient(en * 0.45, boy * 0.42, boy * 0.45,
    en * 0.5, boy * 0.5, Math.hypot(en, boy) * 0.62);
  vinyet.addColorStop(0, 'rgba(20, 12, 4, 0)');
  vinyet.addColorStop(1, 'rgba(20, 12, 4, 0.38)');
  c.fillStyle = gunes;
  c.fillRect(0, 0, en, boy);
  c.fillStyle = vinyet;
  c.fillRect(0, 0, en, boy);
  return { en, boy, ara };
}

export function ortamCiz(ctx) {
  const { width: en, height: boy } = ctx.canvas;
  if (!onbellek || onbellek.en !== en || onbellek.boy !== boy) onbellek = kur(en, boy);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(onbellek.ara, 0, 0, en, boy);
  ctx.restore();
}
