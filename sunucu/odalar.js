/**
 * Yarış odaları: oda kur/katıl/ayrıl, kurucunun başlatması, 3-2-1 geri sayım, imleç
 * yayını, bulundu/pes ile sıralama ve yarışın bitişi. Ağ katmanını bilmez: her oyuncu
 * { id, gonder(metin) } nesnesidir; iletiler dogrulama.js'den temizlenmiş gelir.
 * İleti biçimleri: sunucu/PROTOKOL.md.
 */
import { randomInt } from 'node:crypto';

export const MAKS_OYUNCU = 8;
export const MAKS_ODA = 500;
/** Karışmayan harfler (I, O, Q, W, X yok). */
const HARFLER = 'ABCDEFGHJKLMNPRSTUVYZ';
const GERI_SAYIM = 3;

export function yeniKod() {
  let kod = '';
  for (let i = 0; i < 4; i++) kod += HARFLER[randomInt(HARFLER.length)];
  return kod;
}

/** Oyunun yeniOyun(etiket) çağrısına giden tohum etiketi (6 karakter, taban 36). */
export function yeniEtiket() {
  return randomInt(36 ** 6).toString(36).padStart(6, '0');
}

const bagli = (oda) => [...oda.kayitlar.values()].filter((k) => k.oyuncu);

function bosRenk(oda) {
  const tumu = [...oda.kayitlar.values()].map((k) => k.renk);
  const bagliRenkler = bagli(oda).map((k) => k.renk);
  for (const kullanilan of [tumu, bagliRenkler]) {
    for (let r = 0; r < MAKS_OYUNCU; r++) if (!kullanilan.includes(r)) return r;
  }
  return 0;
}

export function odaDurumu(oda) {
  return {
    t: 'oda',
    kod: oda.kod,
    kurucu: oda.kurucu,
    durum: oda.durum,
    tur: oda.tur,
    oyuncular: [...oda.kayitlar.values()].map((k) => ({
      id: k.id, ad: k.ad, renk: k.renk, durum: k.durum,
      sira: k.sira, sureMs: k.sureMs, saman: k.saman, bagli: Boolean(k.oyuncu),
    })),
  };
}

function hata(oyuncu, kod, mesaj) {
  oyuncu.gonder(JSON.stringify({ t: 'hata', kod, mesaj }));
}

export class Odalar {
  constructor({ geriSayimMs = 1000, yarisMs = 20 * 60 * 1000 } = {}) {
    this.geriSayimMs = geriSayimMs;
    this.yarisMs = yarisMs;
    this.odalar = new Map();
    this.uyelik = new Map();
  }

  /** Doğrulanmış bir istemci iletisini işler. */
  isle(oyuncu, m) {
    switch (m.t) {
      case 'kur': return this.kur(oyuncu, m.ad);
      case 'katil': return this.katil(oyuncu, m.oda, m.ad);
      case 'baslat': return this.baslat(oyuncu, m.zorluk);
      case 'imlec': return this.imlec(oyuncu, m);
      case 'bulundu': return this.bulundu(oyuncu, m);
      case 'pes': return this.pes(oyuncu);
      case 'ayril': return this.ayril(oyuncu);
      default: return hata(oyuncu, 'gecersiz', 'Bilinmeyen ileti türü');
    }
  }

  kur(oyuncu, ad) {
    if (this.uyelik.has(oyuncu.id)) return hata(oyuncu, 'zaten-odada', 'Zaten bir odadasın');
    if (this.odalar.size >= MAKS_ODA) return hata(oyuncu, 'sunucu-dolu', 'Sunucu dolu');
    let kod = yeniKod();
    while (this.odalar.has(kod)) kod = yeniKod();
    const oda = {
      kod, kurucu: oyuncu.id, durum: 'lobi', tur: 0, etiket: null, sira: 0,
      kayitlar: new Map(), zamanlayici: null,
    };
    this.odalar.set(kod, oda);
    return this.#ekle(oda, oyuncu, ad);
  }

  katil(oyuncu, kod, ad) {
    if (this.uyelik.has(oyuncu.id)) return hata(oyuncu, 'zaten-odada', 'Zaten bir odadasın');
    const oda = this.odalar.get(kod);
    if (!oda) return hata(oyuncu, 'oda-yok', 'Bu kodla bir oda yok');
    if (oda.durum === 'geri-sayim' || oda.durum === 'yaris') {
      return hata(oyuncu, 'yaris-suruyor', 'Yarış sürüyor; bitince katılabilirsin');
    }
    if (bagli(oda).length >= MAKS_OYUNCU) return hata(oyuncu, 'oda-dolu', 'Oda dolu (en çok 8)');
    return this.#ekle(oda, oyuncu, ad);
  }

  baslat(oyuncu, zorluk = 'normal') {
    const oda = this.uyelik.get(oyuncu.id);
    if (!oda) return hata(oyuncu, 'odada-degil', 'Bir odada değilsin');
    if (oda.kurucu !== oyuncu.id) return hata(oyuncu, 'kurucu-degil', 'Yalnız kurucu başlatır');
    if (oda.durum !== 'lobi' && oda.durum !== 'bitti') {
      return hata(oyuncu, 'yaris-suruyor', 'Yarış zaten sürüyor');
    }
    for (const [id, k] of oda.kayitlar) if (!k.oyuncu) oda.kayitlar.delete(id);
    for (const k of oda.kayitlar.values()) {
      Object.assign(k, { durum: 'bekliyor', sira: null, sureMs: null, saman: 0 });
    }
    Object.assign(oda, {
      durum: 'geri-sayim', tur: oda.tur + 1, sira: 0, etiket: yeniEtiket(), zorluk,
    });
    this.#yay(oda, odaDurumu(oda));
    return this.#say(oda, GERI_SAYIM);
  }

  imlec(oyuncu, m) {
    const { oda, kayit } = this.#oynayan(oyuncu);
    if (!kayit) return;
    kayit.saman = m.saman;
    this.#yay(oda, { t: 'imlec', id: kayit.id, x: m.x, y: m.y, saman: m.saman }, kayit.id);
  }

  bulundu(oyuncu, m) {
    const { oda, kayit } = this.#oynayan(oyuncu);
    if (!kayit) return hata(oyuncu, 'yaris-yok', 'Sürmekte olan bir yarışın yok');
    oda.sira += 1;
    Object.assign(kayit, { durum: 'buldu', sira: oda.sira, sureMs: m.sureMs, saman: m.saman });
    if (kayit.sira === 1) {
      this.#yay(oda, { t: 'kazanan', id: kayit.id, ad: kayit.ad, sureMs: m.sureMs });
    }
    return this.#guncelle(oda);
  }

  pes(oyuncu) {
    const { oda, kayit } = this.#oynayan(oyuncu);
    if (!kayit) return hata(oyuncu, 'yaris-yok', 'Sürmekte olan bir yarışın yok');
    kayit.durum = 'pes';
    return this.#guncelle(oda);
  }

  /** Odadan ayrılır (ileti ya da bağlantı kopması). Yarıştaysa sonucu tabloda kalır. */
  ayril(oyuncu) {
    const oda = this.uyelik.get(oyuncu.id);
    if (!oda) return;
    this.uyelik.delete(oyuncu.id);
    const kayit = oda.kayitlar.get(oyuncu.id);
    if (oda.durum === 'lobi' || kayit.durum === 'bekliyor') {
      oda.kayitlar.delete(oyuncu.id);
    } else {
      kayit.oyuncu = null;
      if (kayit.durum === 'oynuyor') kayit.durum = 'ayrildi';
    }
    const kalan = bagli(oda);
    if (!kalan.length) {
      clearTimeout(oda.zamanlayici);
      this.odalar.delete(oda.kod);
      return;
    }
    if (oda.kurucu === oyuncu.id) oda.kurucu = kalan[0].id;
    this.#guncelle(oda);
  }

  /** Bütün zamanlayıcıları durdurur (sunucu kapanışı). */
  kapat() {
    for (const oda of this.odalar.values()) clearTimeout(oda.zamanlayici);
    this.odalar.clear();
    this.uyelik.clear();
  }

  #ekle(oda, oyuncu, ad) {
    oda.kayitlar.set(oyuncu.id, {
      id: oyuncu.id, ad, renk: bosRenk(oda), oyuncu,
      durum: 'bekliyor', sira: null, sureMs: null, saman: 0,
    });
    this.uyelik.set(oyuncu.id, oda);
    this.#yay(oda, odaDurumu(oda));
  }

  #oynayan(oyuncu) {
    const oda = this.uyelik.get(oyuncu.id);
    const kayit = oda && oda.durum === 'yaris' ? oda.kayitlar.get(oyuncu.id) : null;
    return { oda, kayit: kayit && kayit.durum === 'oynuyor' ? kayit : null };
  }

  #say(oda, n) {
    if (n > 0) {
      this.#yay(oda, { t: 'geri-sayim', n });
      oda.zamanlayici = setTimeout(() => this.#say(oda, n - 1), this.geriSayimMs);
      oda.zamanlayici.unref();
      return;
    }
    oda.durum = 'yaris';
    for (const k of bagli(oda)) k.durum = 'oynuyor';
    this.#yay(oda, { t: 'basla', etiket: oda.etiket, zorluk: oda.zorluk, tur: oda.tur });
    oda.zamanlayici = setTimeout(() => this.#sureDoldu(oda), this.yarisMs);
    oda.zamanlayici.unref();
    this.#guncelle(oda);
  }

  #sureDoldu(oda) {
    for (const k of oda.kayitlar.values()) if (k.durum === 'oynuyor') k.durum = 'pes';
    this.#guncelle(oda);
  }

  /** Oynayan kalmadıysa yarışı bitirir; oda durumunu herkese yayar. */
  #guncelle(oda) {
    const oynayan = [...oda.kayitlar.values()].some((k) => k.durum === 'oynuyor');
    if (oda.durum === 'yaris' && !oynayan) {
      oda.durum = 'bitti';
      clearTimeout(oda.zamanlayici);
      oda.zamanlayici = null;
    }
    this.#yay(oda, odaDurumu(oda));
  }

  #yay(oda, nesne, haric = null) {
    const metin = JSON.stringify(nesne);
    for (const k of oda.kayitlar.values()) {
      if (k.oyuncu && k.id !== haric) k.oyuncu.gonder(metin);
    }
  }
}
