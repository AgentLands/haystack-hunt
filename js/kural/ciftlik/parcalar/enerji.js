/**
 * Çiftlik parçaları: Enerji ailesi (docs/ciftlik/parcalar.md 22-26): el krankı, yel
 * değirmeni, lokomobil, şaft, volan. Şebeke ve oran hesabı ag/enerji.js'te (burası yalnız
 * parça verisi: üretim, depo, yakıt). Parça kodları parça numarasıdır (22..26).
 * Yakıt: eşya türünde `yakit` alanı (tam yükte kaç tik yanar) ya da aşağıdaki tablo.
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaTanimi } from '../esya.js';
import { ENERJI, havaAl, ciftciYakin } from '../ag/enerji.js';

/** Eşya `yakit` alanı vermezse: anahtara göre tam yükte yanma süresi (tik). */
const YAKIT_TIK = { 'balya-saman': 1200, 'balya-ot': 1200, 'balya-karisik': 1200, kiyim: 150 };

/** Eşya kodunun yakıt değeri (tam yükte tik); yakıt değilse 0. */
export function yakitTik(kod) {
  const e = esyaTanimi(kod);
  return e ? e.yakit ?? YAKIT_TIK[e.anahtar] ?? 0 : 0;
}

/** Yanan yakıtın kalan yüzdesi (1..100). */
const yanmaYuzdesi = (o) => Math.ceil((o.kalan * 100) / (yakitTik(o.yanan) * ENERJI.LOKO_BG));

parcaTanimla('el-kranki', {
  kod: 22, ad: 'El krankı', aile: 'enerji', boyut: [1, 1], yonlu: false,
  maliyet: { kurus: 20 }, krank: true, enCokBg: ENERJI.KRANK_BG,
  kur(p) {
    Object.assign(p.ozel, { kalan: 0 });
  },
  /** Kullan ile başlayan 600 tik: +6 bg; çiftçi 3 karoyu aşarsa durur. */
  uret(p, ctx) {
    const o = p.ozel;
    if (o.kalan <= 0) return 0;
    if (ctx.c.ciftci && !ciftciYakin(p, ctx.c.ciftci, ENERJI.KRANK_SURDUR_KARO)) {
      o.kalan = 0;
      ctx.olay('krank-durdu', { parca: p, neden: 'uzak' });
      return 0;
    }
    o.kalan -= 1;
    if (o.kalan === 0) ctx.olay('krank-durdu', { parca: p, neden: 'sure' });
    return ENERJI.KRANK_BG;
  },
  durum: (p) => (p.ozel.kalan > 0 ? 'calisiyor' : 'bos'),
  incele: (p) => [['Kalan', p.ozel.kalan > 0 ? `${Math.ceil(p.ozel.kalan / 20)} sn` : 'durdu'],
    ['Üretim', p.ozel.kalan > 0 ? `${ENERJI.KRANK_BG} bg` : '0 bg']],
});

parcaTanimla('yel-degirmeni', {
  kod: 23, ad: 'Yel değirmeni', aile: 'enerji', boyut: [2, 2], yonlu: false,
  maliyet: { kurus: 120 }, enCokBg: ENERJI.YEL_BG[ENERJI.YEL_BG.length - 1],
  kur(p, { c }) {
    Object.assign(p.ozel, { yon: havaAl(c, c.tik).yon, bekle: 0, bg: 0 });
  },
  /** Şiddete göre 0/8/16/24 bg; rüzgâr yönü değişince YEL_DONUS_TIK tik 0. */
  uret(p, ctx, hava) {
    const o = p.ozel;
    if (hava.yon !== o.yon) {
      o.yon = hava.yon;
      o.bekle = ENERJI.YEL_DONUS_TIK;
    }
    if (o.bekle > 0) {
      o.bekle -= 1;
      o.bg = 0;
    } else {
      o.bg = ENERJI.YEL_BG[hava.siddet];
    }
    return o.bg;
  },
  durum: (p) => (p.ozel.bg > 0 ? 'calisiyor' : 'hava'),
  incele(p) {
    const o = p.ozel;
    let durum = o.bg ? 'dönüyor' : 'rüzgâr yok';
    if (o.bekle > 0) durum = `kanatlar yön değiştiriyor (${o.bekle} tik)`;
    return [['Üretim', `${o.bg} bg`], ['Durum', durum]];
  },
});

parcaTanimla('lokomobil', {
  kod: 24, ad: 'Lokomobil', aile: 'enerji', boyut: [3, 2], yonlu: true,
  girisler: [{ x: 0, y: 0, yon: 2 }], aksYonler: [1, 3], maliyet: { kurus: 300 },
  enCokBg: ENERJI.LOKO_BG,
  kur(p) {
    Object.assign(p.ozel, { tampon: [], yanan: 0, kalan: 0, yuk: 0, uyari: 0 });
  },
  kabulEder: (p, port, kod) => p.ozel.tampon.length < ENERJI.LOKO_TAMPON && yakitTik(kod) > 0,
  al(p, port, kod) {
    p.ozel.tampon.push(kod);
  },
  /** Açığın en çok LOKO_BG'lik kısmını yakıt yakarak kapatır (yük oranında harcar). */
  destek(p, ctx, acik) {
    const o = p.ozel;
    const hedef = Math.min(ENERJI.LOKO_BG, acik);
    let uretilen = 0;
    while (uretilen < hedef) {
      if (o.kalan <= 0) {
        if (!o.tampon.length) break;
        o.yanan = o.tampon.shift();
        o.kalan = yakitTik(o.yanan) * ENERJI.LOKO_BG;
      }
      const n = Math.min(hedef - uretilen, o.kalan);
      o.kalan -= n;
      uretilen += n;
      if (o.kalan === 0) {
        ctx.sayac('yakilan', o.yanan);
        o.yanan = 0;
      }
    }
    o.yuk = uretilen;
    const yakitli = o.kalan > 0 || o.tampon.length > 0;
    if (yakitli) o.uyari = 0;
    else if (uretilen < hedef && !o.uyari) {
      o.uyari = 1;
      ctx.olay('yakit-bitti', { parca: p });
    }
    return uretilen;
  },
  icerik(p) {
    const say = new Map();
    for (const kod of [...p.ozel.tampon, ...(p.ozel.kalan > 0 ? [p.ozel.yanan] : [])]) {
      say.set(kod, (say.get(kod) ?? 0) + 1);
    }
    return { esya: [...say], saman: 0 };
  },
  durum(p) {
    const o = p.ozel;
    if (o.kalan <= 0 && !o.tampon.length) return 'yakit-yok';
    return o.yuk > 0 ? 'calisiyor' : 'bos';
  },
  incele(p) {
    const o = p.ozel;
    return [['Yakıt tamponu', `${o.tampon.length}/${ENERJI.LOKO_TAMPON}`],
      ['Yük', `${o.yuk}/${ENERJI.LOKO_BG} bg`],
      ['Yanan yakıt', o.kalan > 0 ? `%${yanmaYuzdesi(o)}` : 'yok']];
  },
});

parcaTanimla('saft', {
  kod: 25, ad: 'Şaft', aile: 'enerji', boyut: [1, 1], yonlu: false, yurunur: true,
  maliyet: { kurus: 3 },
  durum: () => 'calisiyor',
  incele: () => [],
});

parcaTanimla('volan', {
  kod: 26, ad: 'Volan', aile: 'enerji', boyut: [2, 2], yonlu: false, maliyet: { kurus: 80 },
  enerjiDepo: { kap: ENERJI.VOLAN_KAP, sarj: ENERJI.VOLAN_SARJ, desarj: ENERJI.VOLAN_DESARJ },
  kur(p) {
    Object.assign(p.ozel, { dolu: 0 });
  },
  /** Kantar için doluluk (bg·tik). */
  doluluk: (p) => ({ n: p.ozel.dolu, kap: ENERJI.VOLAN_KAP }),
  durum: (p) => (p.ozel.dolu > 0 ? 'calisiyor' : 'bos'),
  incele: (p) => [['Depolanan', `${p.ozel.dolu}/${ENERJI.VOLAN_KAP} bg·tik`]],
});
