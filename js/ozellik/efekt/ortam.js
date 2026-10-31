/**
 * Ortam ışığı: tarlanın üstüne sol üstten sıcak güneş tülü ve kenarlarda hafif vinyet.
 * Ekran uzayında çizilir (kamera dönüşümünden bağımsız); gradyanlar tuval boyutuna göre
 * bir kez kurulur.
 */
let onbellek = null;

function kur(ctx, en, boy) {
  const gunes = ctx.createLinearGradient(0, 0, en, boy);
  gunes.addColorStop(0, 'rgba(255, 226, 160, 0.10)');
  gunes.addColorStop(0.5, 'rgba(255, 226, 160, 0)');
  gunes.addColorStop(1, 'rgba(40, 30, 60, 0.10)');
  const vinyet = ctx.createRadialGradient(en * 0.45, boy * 0.42, boy * 0.45,
    en * 0.5, boy * 0.5, Math.hypot(en, boy) * 0.62);
  vinyet.addColorStop(0, 'rgba(20, 12, 4, 0)');
  vinyet.addColorStop(1, 'rgba(20, 12, 4, 0.38)');
  return { en, boy, gunes, vinyet };
}

export function ortamCiz(ctx) {
  const { width: en, height: boy } = ctx.canvas;
  if (!onbellek || onbellek.en !== en || onbellek.boy !== boy) onbellek = kur(ctx, en, boy);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = onbellek.gunes;
  ctx.fillRect(0, 0, en, boy);
  ctx.fillStyle = onbellek.vinyet;
  ctx.fillRect(0, 0, en, boy);
  ctx.restore();
}
