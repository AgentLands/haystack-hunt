/**
 * Yarış bağlantısı: sunucu adresini bulur (sayfa hangi sunucudan açıldıysa onun /ws yolu),
 * zaman aşımıyla bağlanır, JSON iletileri gönderir/alır. Sunucu yoksa söz reddedilir.
 */

/** Sayfa http(s) ile açıldıysa aynı sunucunun WebSocket adresi; değilse null. */
export function sunucuAdresi() {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return null;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/**
 * Bağlanır; açılınca { gonder(nesne), kapat() } ile çözülür. ileti(nesne) her gelen iletide,
 * kapandi() bağlantı açıldıktan sonra kapanınca çağrılır.
 */
export function baglan({ ileti, kapandi }, sure = 4000) {
  const adres = sunucuAdresi();
  if (!adres) return Promise.reject(new Error('Sayfa bir sunucudan açılmadı'));
  return new Promise((coz, red) => {
    let soket;
    try {
      soket = new WebSocket(adres);
    } catch (hata) {
      console.error('WebSocket kurulamadı:', hata);
      red(hata);
      return;
    }
    let acik = false;
    const zaman = setTimeout(() => {
      soket.close();
      red(new Error('Sunucu yanıt vermedi'));
    }, sure);
    soket.addEventListener('open', () => {
      acik = true;
      clearTimeout(zaman);
      coz({
        gonder(nesne) {
          if (soket.readyState === WebSocket.OPEN) soket.send(JSON.stringify(nesne));
        },
        kapat() {
          acik = false;
          soket.close(1000);
        },
      });
    });
    soket.addEventListener('message', (e) => {
      let veri;
      try {
        veri = JSON.parse(e.data);
      } catch (hata) {
        console.error('Yarış iletisi çözülemedi:', hata);
        return;
      }
      ileti(veri);
    });
    soket.addEventListener('close', () => {
      clearTimeout(zaman);
      if (acik) {
        acik = false;
        kapandi();
      } else {
        red(new Error('Sunucu bulunamadı'));
      }
    });
  });
}
