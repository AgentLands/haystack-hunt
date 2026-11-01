/**
 * Çiftlik parçaları: Ayıklama ailesi (docs/ciftlik/parcalar.md 8-12). Kod 40-44.
 *   oluk mıknatısı (40)    pasif, tutucu 6 yuva; doyunca manyetikler geçer; Boşalt komutu
 *   mıknatıslı tambur (41) güçlü, doymaz; manyetik sağ çıkış, geri kalan ön
 *   kalbur (42)            ince sağ, iri ön; yaş ot sıvar (sıva ≥ 4: her şey ön)
 *   tınaz (43)             rüzgâra bağlı, bedava; hafif eşya rüzgârın gittiği yandan savrulur
 *   şeytan yeli (44)       rüzgârsız, üç yollu (ön hafif, sol çok hafif, sağ ağır)
 * Hangi eşya nereye: ayiklama/ayirma.js (saf). Yuvalı makineler (tambur, kalbur, tınaz, yel)
 * tek eşya bekletir: kabul → `sure` tik (güçlüyse güç oranıyla) → yol seç → ctx.ver; çıkış
 * kabul etmezse eşya yuvada bekler (akış durur; hiçbir eşya yok olmaz). `durum`: yuva boş
 * 'girdi-yok', çalışıyor 'calisiyor', bitti ama çıkış dolu 'cikis-dolu', kalburda sıva
 * 'sivali', dolu tutucuda 'doymus'. Güç talebi sorunu: durum güç oranına bakmaz.
 * Olaylar: tutucu-doldu, tutucu-bosaldi, kalbur-sivandi (olaylar.js [E]).
 */
import { parcaTanimla } from '../parca-kayit.js';
import { komutTanimla } from '../komut.js';
import { parcaAt } from '../izgara.js';
import { esyaTanimi } from '../esya.js';
import { hedefKabul } from '../tasima/hat-adim.js';
import { bulundu } from '../isleme/bulundu.js';
import {
  TUTUCU_YUVA, TAMBUR_TIK, KALBUR_TIK, TINAZ_TIK, YEL_TIK, TAMBUR_GUC, YEL_GUC, SIVA_ESIK,
  SIVA_TAVAN, SIVA_COZ_TIK, manyetikMi, yasOtMu, yuvaDolu, ruzgarOku, tinazHali, tinazYolu,
  yelYolu, tamburYolu, kalburYolu,
} from '../ayiklama/ayirma.js';

const ad = (kod) => esyaTanimi(kod)?.ad ?? `#${kod}`;

/** Yuvadaki eşya satırı (inceleme paneli). */
const yuvaSatiri = (o) => ['Yuvada', yuvaDolu(o) ? ad(o.kod) : '(boş)'];

/**
 * Yuvalı ayıklayıcı kurucusu. ayar: { kod, ad, boyut, girisler, cikislar, maliyet, kilit,
 * sure (tik), guc (bg), yol(p, kod, ctx) → çıkış, ozel() → ek alanlar, her(ctx, p) (her tik),
 * alinca(p, kod, ctx), durum(p) → ek rozet ya da null, incele(p) → ek satırlar }.
 */
function yuvaliTanimla(anahtar, ayar) {
  const hedef = ayar.sure * 1024;
  parcaTanimla(anahtar, {
    kod: ayar.kod, ad: ayar.ad, aile: 'ayiklama', boyut: ayar.boyut,
    girisler: ayar.girisler, cikislar: ayar.cikislar, guc: ayar.guc ?? 0, gucsuzOran: 0,
    maliyet: ayar.maliyet, kilit: ayar.kilit,
    kur(p) {
      Object.assign(p.ozel, { kod: 0, ilerleme: 0 }, ayar.ozel?.());
    },
    kabulEder: (p) => !yuvaDolu(p.ozel),
    al(p, port, kod, ctx) {
      p.ozel.kod = kod;
      p.ozel.ilerleme = 0;
      ayar.alinca?.(p, kod, ctx);
    },
    adim(ctx, p) {
      ayar.her?.(ctx, p);
      const o = p.ozel;
      if (!yuvaDolu(o)) return;
      if (o.ilerleme < hedef) {
        o.ilerleme = Math.min(hedef, o.ilerleme + (ayar.guc ? ctx.oran(p) : 1024));
      }
      if (o.ilerleme >= hedef && ctx.ver(p, ayar.yol(p, o.kod, ctx), o.kod)) {
        o.kod = 0;
        o.ilerleme = 0;
      }
    },
    icerik: (p) => ({ esya: yuvaDolu(p.ozel) ? [[p.ozel.kod, 1]] : [], saman: 0 }),
    durum(p) {
      const o = p.ozel;
      const ek = ayar.durum?.(p);
      if (ek) return ek;
      if (!yuvaDolu(o)) return 'girdi-yok';
      return o.ilerleme < hedef ? 'calisiyor' : 'cikis-dolu';
    },
    incele: (p) => [yuvaSatiri(p.ozel), ...(ayar.incele?.(p) ?? [])],
  });
}

// --- 40 Oluk mıknatısı: hat karosu gibi (tamponsuz), manyetik eşyayı tutucuya çeker ---
const tutar = (p, kod) => manyetikMi(kod) && p.ozel.tutucu.length < TUTUCU_YUVA;

parcaTanimla('oluk-miknatisi', {
  kod: 8, ad: 'Oluk mıknatısı', aile: 'ayiklama', boyut: [1, 1],
  girisler: [{ x: 0, y: 0, yon: 2 }], cikislar: [{ x: 0, y: 0, yon: 0 }],
  maliyet: { kurus: 30 }, kilit: 'D1',
  kur(p) {
    p.ozel.tutucu = [];
  },
  kabulEder: (p, port, kod, ctx) => tutar(p, kod) || hedefKabul(ctx, p.cikisHedef[0], kod),
  al(p, port, kod, ctx) {
    if (!tutar(p, kod)) {
      ctx.ver(p, 0, kod);
      return;
    }
    p.ozel.tutucu.push(kod);
    if (p.ozel.tutucu.length === TUTUCU_YUVA) ctx.olay('tutucu-doldu', { parca: p });
  },
  /** Yaba kolu için: tutucudan `uygun(kod)` olan ilk eşyayı çıkarıp verir (yoksa 0). */
  cek(p, uygun = () => true) {
    const i = p.ozel.tutucu.findIndex(uygun);
    return i < 0 ? 0 : p.ozel.tutucu.splice(i, 1)[0];
  },
  /** Kantar için doluluk. */
  doluluk: (p) => ({ n: p.ozel.tutucu.length, kap: TUTUCU_YUVA }),
  /** Boşalt: iğne ve buluntu oyuncuya (envanter; komut "bulundu" tam sayar), kalan atılır. */
  bosalt(c, p) {
    const bulunan = [];
    let atilan = 0;
    for (const kod of p.ozel.tutucu) {
      const sinif = esyaTanimi(kod)?.sinif;
      if (sinif === 'igne' || sinif === 'buluntu') {
        c.envanter[kod] += 1;
        bulunan.push(kod);
      } else atilan += 1;
    }
    p.ozel.tutucu = [];
    return { bulunan, atilan };
  },
  /** Yaba kolu tutucudan uygun ilk eşyayı çeker (F: isleme/hat-el.js karodanCek). */
  cek(p, uygun) {
    const i = p.ozel.tutucu.findIndex(uygun);
    return i < 0 ? 0 : p.ozel.tutucu.splice(i, 1)[0];
  },
  icerik: (p) => ({ esya: p.ozel.tutucu.map((kod) => [kod, 1]), saman: 0 }),
  durum: (p) => (p.ozel.tutucu.length >= TUTUCU_YUVA ? 'doymus' : 'calisiyor'),
  incele(p) {
    const say = new Map();
    for (const kod of p.ozel.tutucu) say.set(kod, (say.get(kod) ?? 0) + 1);
    return [['Tutucu', `${p.ozel.tutucu.length}/${TUTUCU_YUVA}`],
      ...[...say].map(([kod, n]) => [ad(kod), n])];
  },
});

komutTanimla('bosalt', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  const neden = !p ? 'bos' : !p.tanim.bosalt ? 'bosaltilamaz' : null;
  if (neden) {
    olaylar.push({ ad: 'komut-reddedildi', veri: { komut: k, neden } });
    return;
  }
  const { bulunan, atilan } = p.tanim.bosalt(c, p);
  // Elle boşaltmak "bulmak"tır: tam ödeme + defter (G), olay ciftlik-bulundu (kaynak 'bosalt')
  const ortam = { c, olay: (ad, veri) => olaylar.push({ ad, veri }) };
  for (const kod of bulunan) bulundu(ortam, kod, 'bosalt', 'tam', p);
  olaylar.push({ ad: 'tutucu-bosaldi', veri: { parca: p, bulunan, atilan } });
});

// --- 41 Mıknatıslı tambur: 2×1, güçlü, doymaz; ön manyetik değil, sağ manyetik ---
yuvaliTanimla('miknatisli-tambur', {
  kod: 9, ad: 'Mıknatıslı tambur', boyut: [2, 1], sure: TAMBUR_TIK, guc: TAMBUR_GUC,
  girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 1, y: 0, yon: 0 }, { x: 1, y: 0, yon: 1 }],
  maliyet: { kurus: 120 }, kilit: 'D5',
  yol: (p, kod) => tamburYolu(kod),
});

// --- 42 Kalbur: 2×1, güçsüz; ön iri, sağ ince; yaş ot sıvar ---
yuvaliTanimla('kalbur', {
  kod: 10, ad: 'Kalbur', boyut: [2, 1], sure: KALBUR_TIK,
  girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 1, y: 0, yon: 0 }, { x: 1, y: 0, yon: 1 }],
  maliyet: { kurus: 50 }, kilit: 'D4',
  ozel: () => ({ siva: 0, sivaSure: 0 }),
  her(ctx, p) {
    const o = p.ozel;
    if (o.siva <= 0) return;
    o.sivaSure += 1;
    if (o.sivaSure >= SIVA_COZ_TIK) {
      o.siva -= 1;
      o.sivaSure = 0;
    }
  },
  alinca(p, kod, ctx) {
    if (!yasOtMu(kod)) return;
    const o = p.ozel;
    o.sivaSure = 0;
    if (o.siva < SIVA_TAVAN) o.siva += 1;
    if (o.siva === SIVA_ESIK) ctx.olay('kalbur-sivandi', { parca: p });
  },
  yol: (p, kod) => kalburYolu(p.ozel.siva, kod),
  durum: (p) => (p.ozel.siva >= SIVA_ESIK ? 'sivali' : null),
  incele: (p) => [['Sıva', `${p.ozel.siva}/${SIVA_ESIK}`]],
});

// --- 43 Tınaz: 3×3, bedava; rüzgâr eksene dik eserse hafif eşya rüzgârın yanından savrulur ---
const TINAZ_YAZI = {
  durgun: 'Durgun: hepsi dipten', paralel: 'Paralel: hepsi dipten',
  esinti: 'Dik esinti: toz ayrılıyor', ruzgar: 'Dik rüzgâr: toz ve saman ayrılıyor',
};
yuvaliTanimla('tinaz', {
  kod: 11, ad: 'Tınaz', boyut: [3, 3], sure: TINAZ_TIK,
  girisler: [{ x: 0, y: 1, yon: 2 }],
  cikislar: [{ x: 2, y: 1, yon: 0 }, { x: 1, y: 0, yon: 3 }, { x: 1, y: 2, yon: 1 }],
  maliyet: { kurus: 60 }, kilit: 'D6',
  ozel: () => ({ hava: 'durgun' }),
  her(ctx, p) {
    p.ozel.hava = tinazHali(p.yon, ruzgarOku(ctx)).durum;
  },
  yol: (p, kod, ctx) => tinazYolu(tinazHali(p.yon, ruzgarOku(ctx)), kod),
  incele: (p) => [['Şimdi', TINAZ_YAZI[p.ozel.hava]]],
});

// --- 44 Şeytan yeli: 2×2, güçlü, rüzgârsız üç yollu (ön hafif, sol çok hafif, sağ ağır) ---
yuvaliTanimla('seytan-yeli', {
  kod: 12, ad: 'Şeytan yeli', boyut: [2, 2], sure: YEL_TIK, guc: YEL_GUC,
  girisler: [{ x: 0, y: 0, yon: 2 }],
  cikislar: [{ x: 1, y: 0, yon: 0 }, { x: 1, y: 0, yon: 3 }, { x: 1, y: 1, yon: 1 }],
  maliyet: { kurus: 160 }, kilit: 'D5',
  yol: (p, kod) => yelYolu(kod),
});
