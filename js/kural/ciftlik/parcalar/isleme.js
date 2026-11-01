/**
 * Çiftlik parçaları: İşleme ailesi (docs/ciftlik/parcalar.md 13-17): ot savurucu, kurutma
 * ambarı, balya presi, çekiçli kıyıcı, gübre çukuru. Güç oranı (ctx.oran, 0..1024) iş
 * ilerlemesini çarpar; `talep(p)` enerji ağına (ag/enerji.js) bu tikin bg talebini verir:
 * ilerleyemeyen makine 0 ister (pres darbelidir: dolarken 4, basarken 30). İğne/buluntu
 * hiçbir makinede yok olmaz: ya geçer (ot savurucu) ya girişte bekler (kurutma); sert olan
 * presi sıkıştırır (Temizle oyuncuya verir), kıyıcının çekicini kırar (çıkıştan olduğu gibi
 * atılır); gübre çukuru oyuncuya iade eder. Kıyıcı ve gübre çukuru isleme/kiyici-gubre.js'te
 * (dosya boyu); sabitler ve gübre sapı (D) isleme/sabitler.js'te.
 */
import { parcaTanimla } from '../parca-kayit.js';
import { esyaKodu } from '../esya.js';
import { gucRozeti } from '../ag/enerji.js';
import { esyaAdi as ad } from '../isleme/esya-ozellik.js';
import { oyuncuyaVer, girisBekleyen, ilerle } from '../isleme/bulundu.js';
import {
  ISLEME, YAS, KURU, SAMAN, PRES_KABUL, sert, redRozeti, havaOku,
} from '../isleme/sabitler.js';
import '../isleme/kiyici-gubre.js';
import '../isleme/komutlar.js';

export { ISLEME } from '../isleme/sabitler.js';

/** Ot savurucu: yaş otu havayla kurutur (9 yuva); kuru ve diğer eşya bekletmeden geçer. */
parcaTanimla('ot-savurucu', {
  kod: 13, ad: 'Ot savurucu', aile: 'isleme', boyut: [3, 1],
  girisler: [{ x: 0, y: 0, yon: 2 }], cikislar: [{ x: 2, y: 0, yon: 0 }],
  guc: ISLEME.savurucu.guc, gucsuzOran: 341,
  kur(p) {
    Object.assign(p.ozel, { tur: [], puan: [], yagmur: 0, dolu: 0 });
  },
  kabulEder(p) {
    return p.ozel.tur.length < ISLEME.savurucu.kap;
  },
  al(p, port, kod) {
    p.ozel.tur.push(kod);
    p.ozel.puan.push(0);
  },
  adim(ctx, p) {
    const o = p.ozel;
    const S = ISLEME.savurucu;
    const h = havaOku(ctx);
    const artis = h.gok === 'yagmur' ? 0 : h.gok === 'bulut' ? S.bulut
      : h.siddet >= 1 ? S.gunesRuzgar : S.gunes;
    o.yagmur = artis ? 0 : 1;
    for (let i = 0; artis && i < o.tur.length; i++) {
      if (o.tur[i] !== YAS) continue;
      o.puan[i] += artis * ctx.oran(p);
      if (o.puan[i] < S.puan * 1024) continue;
      o.tur[i] = KURU;
      o.puan[i] = 0;
      ctx.sayac('uretilen', KURU);
    }
    const i = o.tur.findIndex((kod) => kod !== YAS);
    o.dolu = 0;
    if (i < 0) return;
    if (ctx.ver(p, 0, o.tur[i])) {
      o.tur.splice(i, 1);
      o.puan.splice(i, 1);
    } else o.dolu = 1;
  },
  icerik(p) {
    return { esya: p.ozel.tur.map((kod) => [kod, 1]), saman: 0 };
  },
  durum(p) {
    const o = p.ozel;
    if (o.dolu) return 'cikis-dolu';
    if (!o.tur.length) return 'ac';
    return o.yagmur ? 'hava' : gucRozeti(p) ?? 'calisiyor';
  },
  talep(p) {
    const o = p.ozel;
    return !o.yagmur && o.tur.includes(YAS) ? ISLEME.savurucu.guc : 0;
  },
  incele(p) {
    const o = p.ozel;
    const neden = o.yagmur ? 'Yağmur: ot kurumuyor, hava bekleniyor' : o.dolu
      ? 'Çıkış dolu: kuruyan ot bekliyor' : o.tur.length ? 'Ot kuruyor' : 'Yaş ot bekliyor';
    return [['Durum', neden], ['İçeride', `${o.tur.length}/${ISLEME.savurucu.kap}`]];
  },
});

/** Kurutma ambarı: yalnız yaş ot; 24 yuva, ot başına 600 tik (güçsüz ¼ hız). */
parcaTanimla('kurutma-ambari', {
  kod: 14, ad: 'Kurutma ambarı', aile: 'isleme', boyut: [3, 3],
  girisler: [{ x: 0, y: 1, yon: 2 }], cikislar: [{ x: 2, y: 1, yon: 0 }],
  guc: ISLEME.kurutma.guc, gucsuzOran: 256,
  kur(p) {
    Object.assign(p.ozel, { yuva: [], hazir: 0, il: 0, bekleyen: 0, dolu: 0 });
  },
  kabulEder(p, port, kod) {
    const o = p.ozel;
    return kod === YAS && o.yuva.length + o.hazir < ISLEME.kurutma.yuva;
  },
  al(p) {
    p.ozel.yuva.push(0);
  },
  adim(ctx, p) {
    const o = p.ozel;
    const K = ISLEME.kurutma;
    const oran = ctx.oran(p);
    for (let i = 0; i < o.yuva.length; i++) o.yuva[i] += oran;
    while (o.yuva.length && o.yuva[0] >= K.sure * 1024) {
      o.yuva.shift();
      o.hazir += 1;
      ctx.sayac('uretilen', KURU);
    }
    o.dolu = o.hazir && !ctx.ver(p, 0, KURU) ? 1 : 0;
    if (o.hazir && !o.dolu) o.hazir -= 1;
    o.bekleyen = girisBekleyen(ctx.c, p);
  },
  icerik(p) {
    return { esya: [[YAS, p.ozel.yuva.length], [KURU, p.ozel.hazir]], saman: 0 };
  },
  doluluk: (p) => ({ n: p.ozel.yuva.length + p.ozel.hazir, kap: ISLEME.kurutma.yuva }),
  durum(p) {
    const o = p.ozel;
    if (o.dolu) return 'cikis-dolu';
    if (o.bekleyen && o.bekleyen !== YAS) return redRozeti(o.bekleyen);
    if (o.yuva.length + o.hazir >= ISLEME.kurutma.yuva) return 'dolu';
    return o.yuva.length ? gucRozeti(p) ?? 'calisiyor' : 'ac';
  },
  talep(p) {
    return p.ozel.yuva.length ? ISLEME.kurutma.guc : 0;
  },
  incele(p) {
    const o = p.ozel;
    const neden = o.bekleyen && o.bekleyen !== YAS ? `Yabancı eşya girişte: ${ad(o.bekleyen)}`
      : o.yuva.length ? 'Ot kuruyor' : 'Yaş ot bekliyor';
    return [['Durum', neden], ['Kuruyan', `${o.yuva.length}/${ISLEME.kurutma.yuva}`],
      ['Hazır', o.hazir]];
  },
});

/** Balya presi: kalıba 8 tutam (7 tik/eşya), 40 tik basma; saflık balya türünü seçer. */
function balyaTuru(kalip) {
  if (kalip.every((k) => k === SAMAN)) return esyaKodu('balya-saman');
  if (kalip.every((k) => k === KURU)) return esyaKodu('balya-ot');
  return esyaKodu('balya-karisik');
}
parcaTanimla('balya-presi', {
  kod: 15, ad: 'Balya presi', aile: 'isleme', boyut: [3, 2],
  girisler: [{ x: 0, y: 0, yon: 2 }], cikislar: [{ x: 2, y: 0, yon: 0 }],
  guc: ISLEME.pres.guc,
  kur(p) {
    Object.assign(p.ozel, { kalip: [], doluyor: 0, basiyor: 0, il: 0, cikis: 0, sikisan: 0,
      bekleyen: 0, dolu: 0 });
  },
  kabulEder(p, port, kod) {
    const o = p.ozel;
    if (p.tikali || o.doluyor || o.basiyor || o.kalip.length >= ISLEME.pres.kalip) return false;
    return PRES_KABUL.has(kod) || sert(kod);
  },
  al(p, port, kod, ctx) {
    const o = p.ozel;
    if (sert(kod)) {
      o.sikisan = kod;
      p.tikali = true;
      ctx.olay('parca-tikandi', { parca: p, neden: 'sikisti', kod });
      return;
    }
    o.kalip.push(kod);
    o.doluyor = 1;
  },
  adim(ctx, p) {
    const o = p.ozel;
    const P = ISLEME.pres;
    o.dolu = o.cikis && !ctx.ver(p, 0, o.cikis) ? 1 : 0;
    if (!o.dolu) o.cikis = 0;
    o.bekleyen = girisBekleyen(ctx.c, p);
    if (p.tikali) return;
    if (o.doluyor) {
      if (ilerle(o, 'il', ctx.oran(p), P.dolum)) o.doluyor = 0;
      if (!o.doluyor && o.kalip.length >= P.kalip) o.basiyor = 1;
    } else if (o.basiyor && !o.cikis) {
      if (!ilerle(o, 'il', ctx.oran(p), P.basma)) return;
      o.cikis = balyaTuru(o.kalip);
      o.kalip = [];
      o.basiyor = 0;
      ctx.sayac('uretilen', o.cikis);
    }
  },
  talep(p) {
    const o = p.ozel;
    if (p.tikali) return 0;
    if (o.doluyor) return ISLEME.pres.gucDolum;
    return o.basiyor && !o.cikis ? ISLEME.pres.gucBasma : 0;
  },
  temizle(p, k, ortam) {
    if (!p.tikali) return 'gereksiz';
    oyuncuyaVer(ortam, p.ozel.sikisan, 'temizle', 'tam', p);
    p.ozel.sikisan = 0;
    p.tikali = false;
    return null;
  },
  icerik(p) {
    const o = p.ozel;
    const esya = o.kalip.map((kod) => [kod, 1]);
    if (o.cikis) esya.push([o.cikis, 1]);
    if (o.sikisan) esya.push([o.sikisan, 1]);
    return { esya, saman: 0 };
  },
  durum(p) {
    const o = p.ozel;
    if (o.dolu) return 'cikis-dolu';
    if (o.basiyor || o.doluyor) return gucRozeti(p) ?? 'calisiyor';
    return o.bekleyen ? redRozeti(o.bekleyen) : 'ac';
  },
  incele(p) {
    const o = p.ozel;
    const neden = p.tikali ? `Sıkıştı: ${ad(o.sikisan)} kalıba girdi (Temizle)`
      : o.bekleyen && !o.doluyor && !o.basiyor ? `Kabul etmiyor: ${ad(o.bekleyen)}`
        : o.basiyor ? 'Basıyor' : o.kalip.length ? 'Kalıp doluyor' : 'Saman bekliyor';
    return [['Durum', neden], ['Kalıp', `${o.kalip.length}/${ISLEME.pres.kalip}`]];
  },
});
