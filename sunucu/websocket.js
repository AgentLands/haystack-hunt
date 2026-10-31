/**
 * Bağımlılıksız WebSocket (RFC 6455) sunucu katmanı: el sıkışma, maskeli istemci
 * çerçevelerini çözme, parçalı iletileri birleştirme, metin gönderme, ping/pong ve
 * kapanış. Uygulama yalnız 'ileti' (UTF-8 metin) ve 'kapandi' olaylarını görür.
 */
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { isUtf8 } from 'node:buffer';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
/** Bir iletinin (parçaları birleşmiş hâliyle) en büyük boyu. */
export const MAKS_ILETI = 64 * 1024;
/** Okumayan istemci: gönderim kuyruğu bunu aşarsa bağlantı kesilir. */
const MAKS_KUYRUK = 1024 * 1024;
export const OLAGAN_KOPMA = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT']);

export function kabulAnahtari(anahtar) {
  return createHash('sha1').update(anahtar + GUID).digest('base64');
}

/** HTTP yanıtı yazıp soketi kapatır (el sıkışma reddi). */
export function reddet(soket, durum) {
  soket.end(`HTTP/1.1 ${durum}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

/** 'upgrade' isteğini doğrular ve el sıkışır; geçersizse reddeder ve null döner. */
export function elSikis(istek, soket) {
  const b = istek.headers;
  const anahtar = b['sec-websocket-key'];
  const gecerli = istek.method === 'GET'
    && /\bwebsocket\b/i.test(b.upgrade || '')
    && /\bupgrade\b/i.test(b.connection || '')
    && b['sec-websocket-version'] === '13'
    && typeof anahtar === 'string'
    && Buffer.from(anahtar, 'base64').length === 16;
  if (!gecerli) {
    reddet(soket, '400 Bad Request');
    return null;
  }
  soket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n'
    + `Connection: Upgrade\r\nSec-WebSocket-Accept: ${kabulAnahtari(anahtar)}\r\n\r\n`);
  return new Baglanti(soket);
}

/**
 * Tampon başındaki bir çerçeveyi çözer. Eksikse null; protokol hatasıysa
 * { hata: kapanışKodu, neden }; tamamsa { fin, kod, yuk, toplam } (yuk maskesi çözülmüş).
 */
export function cerceveCoz(b) {
  if (b.length < 2) return null;
  const fin = (b[0] & 0x80) !== 0;
  const kod = b[0] & 0x0f;
  if (b[0] & 0x70) return { hata: 1002, neden: 'RSV biti' };
  if (!(b[1] & 0x80)) return { hata: 1002, neden: 'maskesiz çerçeve' };
  let uzunluk = b[1] & 0x7f;
  let i = 2;
  if (uzunluk === 126) {
    if (b.length < 4) return null;
    uzunluk = b.readUInt16BE(2);
    i = 4;
  } else if (uzunluk === 127) {
    if (b.length < 10) return null;
    uzunluk = b.readUInt32BE(2) ? Infinity : b.readUInt32BE(6);
    i = 10;
  }
  if (kod >= 0x8 && (uzunluk > 125 || !fin)) return { hata: 1002, neden: 'denetim çerçevesi' };
  if (uzunluk > MAKS_ILETI) return { hata: 1009, neden: 'ileti çok büyük' };
  if (b.length < i + 4 + uzunluk) return null;
  const maske = b.subarray(i, i + 4);
  const yuk = Buffer.from(b.subarray(i + 4, i + 4 + uzunluk));
  for (let k = 0; k < yuk.length; k++) yuk[k] ^= maske[k & 3];
  return { fin, kod, yuk, toplam: i + 4 + uzunluk };
}

/** Sunucudan istemciye (maskesiz) bir çerçeve. */
export function cerceveYap(kod, yuk) {
  const n = yuk.length;
  let bas;
  if (n < 126) {
    bas = Buffer.from([0x80 | kod, n]);
  } else if (n < 65536) {
    bas = Buffer.from([0x80 | kod, 126, n >> 8, n & 0xff]);
  } else {
    bas = Buffer.alloc(10);
    bas[0] = 0x80 | kod;
    bas[1] = 127;
    bas.writeBigUInt64BE(BigInt(n), 2);
  }
  return Buffer.concat([bas, yuk]);
}

/** El sıkışmış bir WebSocket bağlantısı. Olaylar: 'ileti' (metin), 'kapandi'. */
export class Baglanti extends EventEmitter {
  #tampon = Buffer.alloc(0);
  #parcalar = [];
  #parcaBoyu = 0;
  #parcaKod = 0;
  #bitti = false;

  constructor(soket) {
    super();
    this.soket = soket;
    this.canli = true;
    this.kapali = false;
    soket.setNoDelay(true);
    soket.on('data', (veri) => this.#al(veri));
    soket.on('close', () => this.#bitir());
    soket.on('error', (hata) => {
      if (!OLAGAN_KOPMA.has(hata.code)) console.error('WebSocket soket hatası:', hata);
      this.#bitir();
    });
  }

  /** Metin iletisi gönderir; bağlantı kapalıysa false. */
  gonder(metin) {
    if (this.kapali) return false;
    this.#yaz(0x1, Buffer.from(metin, 'utf8'));
    return true;
  }

  /** Kapanış çerçevesi gönderip bağlantıyı kapatır (neden ≤ 123 bayt). */
  kapat(kod = 1000, neden = '') {
    if (this.kapali) return;
    const metin = Buffer.from(neden, 'utf8').subarray(0, 123);
    const yuk = Buffer.alloc(2 + metin.length);
    yuk.writeUInt16BE(kod, 0);
    metin.copy(yuk, 2);
    this.#yaz(0x8, yuk);
    this.kapali = true;
    this.soket.end();
    setTimeout(() => this.soket.destroy(), 2000).unref();
    this.#bitir();
  }

  /** Nabız: önceki ping'e yanıt (ya da ileti) gelmediyse bağlantıyı düşürür. */
  nabiz() {
    if (this.kapali) return;
    if (!this.canli) {
      this.kapali = true;
      this.soket.destroy();
      this.#bitir();
      return;
    }
    this.canli = false;
    this.#yaz(0x9, Buffer.alloc(0));
  }

  #yaz(kod, yuk) {
    if (this.soket.writableLength > MAKS_KUYRUK) {
      console.error('WebSocket: istemci okumuyor, bağlantı kesiliyor');
      this.kapali = true;
      this.soket.destroy();
      this.#bitir();
      return;
    }
    this.soket.write(cerceveYap(kod, yuk));
  }

  #bitir() {
    this.kapali = true;
    if (this.#bitti) return;
    this.#bitti = true;
    this.emit('kapandi');
  }

  #al(veri) {
    this.#tampon = this.#tampon.length ? Buffer.concat([this.#tampon, veri]) : veri;
    while (!this.kapali) {
      const cerceve = cerceveCoz(this.#tampon);
      if (cerceve === null) return;
      if (cerceve.hata) {
        this.kapat(cerceve.hata, cerceve.neden);
        return;
      }
      this.#tampon = this.#tampon.subarray(cerceve.toplam);
      this.#isle(cerceve);
    }
  }

  #isle({ fin, kod, yuk }) {
    this.canli = true;
    if (kod === 0x8) return this.kapat(1000);
    if (kod === 0x9) return this.#yaz(0xa, yuk);
    if (kod === 0xa) return undefined;
    if (kod === 0x1 || kod === 0x2) {
      if (this.#parcaKod) return this.kapat(1002, 'parçalı ileti bitmeden yeni ileti');
      this.#parcaKod = kod;
    } else if (kod !== 0x0 || !this.#parcaKod) {
      return this.kapat(1002, 'beklenmeyen işlem kodu');
    }
    this.#parcaBoyu += yuk.length;
    if (this.#parcaBoyu > MAKS_ILETI) return this.kapat(1009, 'ileti çok büyük');
    this.#parcalar.push(yuk);
    if (!fin) return undefined;
    const tur = this.#parcaKod;
    const tum = this.#parcalar.length === 1 ? this.#parcalar[0] : Buffer.concat(this.#parcalar);
    this.#parcalar = [];
    this.#parcaBoyu = 0;
    this.#parcaKod = 0;
    if (tur === 0x2) return this.kapat(1003, 'yalnız metin iletisi');
    if (!isUtf8(tum)) return this.kapat(1007, 'geçersiz UTF-8');
    this.emit('ileti', tum.toString('utf8'));
    return undefined;
  }
}
