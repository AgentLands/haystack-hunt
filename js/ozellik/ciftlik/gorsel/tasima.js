/**
 * GEÇİCİ çizimler (H2 ajanı üzerine yazacak): Taşıma ailesi (çatal, birleştirme oluğu,
 * menfez) için yalnız paletten ayırt edilip oyunda denenebilsin diye çok basit gövdeler.
 * Yön: yerel çerçevede (doğuya bakar) çizilir, parçanın yönüne göre döndürülür.
 */
import { parcaCizimiTanimla, KARO_PX, MUREKKEP } from './kayit.js';

const K = KARO_PX;

/** (x, y) karosunun merkezinde, yon çeyrek tur döndürülmüş yerel çerçevede çizer. */
function donuk(ctx, p, ciz) {
  ctx.save();
  ctx.translate(p.x * K + K / 2, p.y * K + K / 2);
  ctx.rotate((p.yon * Math.PI) / 2);
  ciz();
  ctx.restore();
}

function kasa(ctx, eb, renk) {
  ctx.fillStyle = renk;
  ctx.strokeStyle = MUREKKEP;
  ctx.lineWidth = 1.2 * eb;
  ctx.fillRect(-K / 2 + 0.3, -K / 2 + 0.3, K - 0.6, K - 0.6);
  ctx.strokeRect(-K / 2 + 0.3, -K / 2 + 0.3, K - 0.6, K - 0.6);
}

function cizgi(ctx, noktalar, renk, kalinlik) {
  ctx.beginPath();
  noktalar.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = renk;
  ctx.lineWidth = kalinlik;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// Çatal: arkadan gelen tek oluk, önde ve iki yanda üç dal.
parcaCizimiTanimla('catal', {
  govde(ctx, p, eb) {
    donuk(ctx, p, () => {
      kasa(ctx, eb, '#7a5f3e');
      const a = K * 0.5;
      cizgi(ctx, [[-a, 0], [0, 0], [a, 0]], '#d9b36a', 1.6);
      cizgi(ctx, [[0, 0], [0, -a]], '#d9b36a', 1.6);
      cizgi(ctx, [[0, 0], [0, a]], '#d9b36a', 1.6);
    });
  },
});

// Birleştirme oluğu: üç girişten ön çıkışa Y biçimli oluk.
parcaCizimiTanimla('birlestirme-olugu', {
  govde(ctx, p, eb) {
    donuk(ctx, p, () => {
      kasa(ctx, eb, '#6f5a3a');
      const a = K * 0.5;
      cizgi(ctx, [[-a, 0], [0, 0], [a, 0]], '#c9a45a', 1.6);
      cizgi(ctx, [[0, -a], [0, 0]], '#c9a45a', 1.6);
      cizgi(ctx, [[0, a], [0, 0]], '#c9a45a', 1.6);
      ctx.fillStyle = MUREKKEP;
      ctx.fillRect(K * 0.1, -0.5, K * 0.35, 1);
    });
  },
});

// Menfez: taş kemerli ağız (gövde önbelleğe girer: eşleşme durumuna bağlı çizilmez).
parcaCizimiTanimla('menfez', {
  govde(ctx, p, eb) {
    donuk(ctx, p, () => {
      kasa(ctx, eb, '#8d8a82');
      ctx.beginPath();
      ctx.arc(0, 0, K * 0.3, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = '#2a1a0d';
      ctx.fill();
    });
  },
});
