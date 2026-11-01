/**
 * İşleme ailesinin ikinci yarısı (parcalar/isleme.js içe aktarır; dosya boyu sınırı):
 * çekiçli kıyıcı (saman/kuru ot → kıyım; sert eşya çekici kırar, çıkıştan olduğu gibi atılır,
 * "Onar" 50 kuruş + 200 tik) ve gübre çukuru (çöp → puan; 2400 tikte bir 20 puanla 8 karo
 * içindeki çayırı gübreler; iğne/buluntuyu oyuncuya iade eder). docs/ciftlik/parcalar.md 16-17.
 */
import { parcaTanimla } from '../parca-kayit.js';
import { degerliMi } from './esya-ozellik.js';
import {
  oyuncuyaVer, kurusHarca, samanCikti, girisBekleyen, ilerle,
} from './bulundu.js';
import {
  ISLEME, KURU, SAMAN, KIYIM, GUBRE_PUAN, sert, ad, redRozeti, gubrele,
} from './sabitler.js';

/** Çekiçli kıyıcı: saman/kuru ot → kıyım (10 tik); sert eşya çekici kırar (Onar 50 + 200 tik). */
parcaTanimla('cekicli-kiyici', {
  kod: 116, ad: 'Çekiçli kıyıcı', aile: 'isleme', boyut: [2, 2],
  girisler: [{ x: 0, y: 0, yon: 2 }], cikislar: [{ x: 1, y: 0, yon: 0 }],
  guc: ISLEME.kiyici.guc, maliyet: { kurus: 180 }, kilit: 'D7',
  kur(p) {
    Object.assign(p.ozel, { islenen: 0, il: 0, cikis: [], kirik: 0, onarim: 0, bekleyen: 0,
      dolu: 0 });
  },
  kabulEder(p, port, kod) {
    const o = p.ozel;
    if (o.kirik || o.islenen || o.cikis.length) return false;
    return kod === SAMAN || kod === KURU || sert(kod);
  },
  al(p, port, kod, ctx) {
    const o = p.ozel;
    if (!sert(kod)) {
      o.islenen = kod;
      return;
    }
    o.cikis.push(kod);
    o.kirik = 1;
    ctx.olay('parca-tikandi', { parca: p, neden: 'kirik', kod });
  },
  adim(ctx, p) {
    const o = p.ozel;
    p.talep = 0;
    o.dolu = o.cikis.length && !ctx.ver(p, 0, o.cikis[0]) ? 1 : 0;
    if (o.cikis.length && !o.dolu) o.cikis.shift();
    o.bekleyen = girisBekleyen(ctx.c, p);
    if (o.onarim && --o.onarim === 0) o.kirik = 0;
    if (!o.islenen || o.cikis.length) return;
    p.talep = ISLEME.kiyici.guc;
    if (!ilerle(o, 'il', ctx.oran(p), ISLEME.kiyici.sure)) return;
    o.islenen = 0;
    o.cikis.push(KIYIM);
    ctx.sayac('uretilen', KIYIM);
  },
  onar(p, k, ortam) {
    const o = p.ozel;
    if (!o.kirik) return 'gereksiz';
    if (o.onarim) return 'suruyor';
    if (!kurusHarca(ortam.c, ISLEME.kiyici.onarKurus)) return 'kurus-yok';
    o.onarim = ISLEME.kiyici.onarTik;
    return null;
  },
  icerik(p) {
    const o = p.ozel;
    const esya = o.cikis.map((kod) => [kod, 1]);
    if (o.islenen) esya.push([o.islenen, 1]);
    return { esya, saman: 0 };
  },
  durum(p) {
    const o = p.ozel;
    if (o.kirik) return 'kirik';
    if (o.dolu) return 'cikis-dolu';
    if (o.islenen) return 'calisiyor';
    return o.bekleyen ? redRozeti(o.bekleyen) : 'ac';
  },
  incele(p) {
    const o = p.ozel;
    const neden = o.onarim ? `Onarılıyor (${o.onarim} tik)` : o.kirik
      ? `Çekiç kırık: sert eşya girdi (Onar ${ISLEME.kiyici.onarKurus} kuruş)`
      : o.bekleyen && !o.islenen ? `Kabul etmiyor: ${ad(o.bekleyen)}`
        : o.islenen ? 'Kıyıyor' : 'Saman bekliyor';
    return [['Durum', neden]];
  },
});

/** Gübre çukuru: çöpü puana çevirir; 2400 tikte bir 20 puanla yakın çayırı gübreler. */
const gubreGirisleri = [0, 1].flatMap((i) => [
  { x: i, y: 0, yon: 3 }, { x: 1, y: i, yon: 0 }, { x: i, y: 1, yon: 1 }, { x: 0, y: i, yon: 2 },
]);
parcaTanimla('gubre-cukuru', {
  kod: 117, ad: 'Gübre çukuru', aile: 'isleme', boyut: [2, 2], yonlu: false,
  girisler: gubreGirisleri, maliyet: { kurus: 60 }, kilit: 'D6',
  kur(p) {
    Object.assign(p.ozel, { puan: 0, sayac: 0, son: -1, bekleyen: 0 });
  },
  kabulEder(p, port, kod) {
    const n = GUBRE_PUAN.get(kod);
    return degerliMi(kod) || (n !== undefined && p.ozel.puan + n <= ISLEME.gubre.kap);
  },
  al(p, port, kod, ctx) {
    if (degerliMi(kod)) {
      oyuncuyaVer(ctx, kod, 'gubre', 'yok', p);
      return;
    }
    p.ozel.puan += GUBRE_PUAN.get(kod);
    samanCikti(ctx.c, kod);
    ctx.sayac('gubre', kod);
  },
  adim(ctx, p) {
    const o = p.ozel;
    const G = ISLEME.gubre;
    o.bekleyen = girisBekleyen(ctx.c, p);
    if (++o.sayac < G.aralik) return;
    o.sayac = 0;
    if (o.puan < G.esik) return;
    o.puan -= G.esik;
    o.son = gubrele(ctx, p, G.menzil, G.sure);
    ctx.olay('gubre-serpildi', { parca: p, karo: o.son });
  },
  durum(p) {
    const o = p.ozel;
    if (o.bekleyen && !GUBRE_PUAN.has(o.bekleyen)) return 'yabanci';
    if (o.bekleyen || o.puan >= ISLEME.gubre.kap) return 'dolu';
    return o.puan ? 'calisiyor' : 'ac';
  },
  incele(p) {
    const o = p.ozel;
    const neden = o.son === 0 ? 'Yalnız çöp: yakında çayır yok'
      : o.puan >= ISLEME.gubre.kap ? 'Dolu: çöp kabul etmiyor' : 'Çöp bekliyor';
    return [['Durum', neden], ['Gübre', `${o.puan}/${ISLEME.gubre.kap} puan`]];
  },
});
