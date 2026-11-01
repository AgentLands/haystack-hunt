/**
 * Enerji şebekesi (docs/ciftlik/sistemler.md §1): şaft + enerji parçaları + makine aks
 * noktaları komşulukla birleşir; topoloji değişince yeniden kurulur (aşama yenidenKur).
 * Tik aşaması 20 (parçaların adim'ından önce): bileşen başına arz (üreticiler, volan,
 * lokomobil) ve talep (makineler) toplanır, `oran = talep ? min(1024, arz*1024/talep) : 1024`
 * bütün makinelerin `p.oran`'ına yazılır (makine iş ilerlemesini `× oran / 1024` yapar).
 * Eksik güç yavaşlatır, asla kesmez. Şebekede olmayan makine `gucsuzOran`'la çalışır,
 * şebekedeyse `max(gucsuzOran, oran)`.
 *
 * Parça tanımının enerji alanları (hepsi isteğe bağlı; `parcalar/enerji.js` örnek):
 *   guc          makinenin tam yükteki talebi (bg); `gucsuzOran` (0..1024): şebekesizken oran
 *   talep(p, ctx) bu tik gerçek talep (bg); yoksa durum(p) 'calisiyor' | 'guc-yok' |
 *                'guc-az' ise `guc`, başka her durumda (girdi yok, çıkış dolu...) 0
 *   uret(p, ctx, hava)   koşulsuz üretim (bg) ve kendi durumunu günceller (krank, yel)
 *   depo { kap, sarj, desarj }   volan: p.ozel.dolu (bg·tik) tutar
 *   destek(p, ctx, acik) → bg   açığı (volandan sonra kalan) kapatan üretici (lokomobil)
 *   iletken      şaft gibi aks taşır (varsayılan: aile 'enerji'); aksYonler: [yon...] aksın
 *                çıktığı kenarlar (yon 0 çerçevesinde; yoksa dört kenar)
 *   krank        true: `krank` komutu bu parçaya uygulanır (p.ozel.kalan tik)
 * Sıra: üreticiler → volan (şarj/deşarj) → lokomobil (kalan açık) → oran.
 *
 * Dış girdi: `c.ciftci = { x, y }` (hücre; oyun karesi yazar, kayda girmez; yoksa uzaklık
 * denetlenmez). Komut: `{ tur: 'krank', x, y, ciftci: { x, y } }` yalnız çiftçi parçanın
 * KRANK_BASLAT_KARO karo içindeyken kabul edilir; döndürme KRANK_TIK tik sürer, çiftçi
 * KRANK_SURDUR_KARO'yu aşarsa durur (olay 'krank-durdu').
 * Olaylar: 'krank-basladi' { parca }, 'krank-durdu' { parca, neden: 'sure' | 'uzak' }.
 */
import { KARO, DX, DY, yonDondur, tersYon } from '../olcu.js';
import { asamaTanimla } from '../benzetim.js';
import { komutTanimla } from '../komut.js';
import { parcaAt } from '../izgara.js';
import { parcaDurumu } from '../parca-kayit.js';
import { havaAl } from '../dunya/hava.js';

/** Enerji sayıları (denge.js gelince oraya taşınır). bg = beygir gücü, tik = 50 ms. */
export const ENERJI = Object.freeze({
  KRANK_BG: 6, KRANK_TIK: 600, KRANK_BASLAT_KARO: 1, KRANK_SURDUR_KARO: 3,
  YEL_BG: Object.freeze([0, 8, 16, 24]), YEL_DONUS_TIK: 100,
  LOKO_BG: 40, LOKO_TAMPON: 4,
  VOLAN_KAP: 2400, VOLAN_SARJ: 12, VOLAN_DESARJ: 30,
});

/** Bu tikteki hava: dunya/hava.js havaAl (yon: rüzgârın gittiği yön; testler havaSabitle). */
export { havaAl };

const TALEP_DURUMLARI = new Set(['calisiyor', 'guc-yok', 'guc-az']);
const iletkenMi = (p) => p.tanim.iletken ?? p.tanim.aile === 'enerji';
const makineMi = (p) => p.tanim.guc > 0 || p.tanim.gucsuzOran !== undefined;
const aksMi = (p) => iletkenMi(p) || makineMi(p);

/** Parçanın dünya yönündeki kenarından aks çıkar mı (aksYonler yerel çerçevededir). */
function aksKenari(p, yon) {
  const yonlar = p.tanim.aksYonler;
  return !yonlar || yonlar.includes(yonDondur(yon, -p.yon));
}

/** Bileşenler (birleşim-bul): { uyeler, uretici, volan, destek, makine }, id sırasıyla. */
function aglariKur(c) {
  const aks = [...c.parcalar.values()].filter(aksMi);
  const ata = new Map(aks.map((p) => [p.id, p.id]));
  const kok = (id) => (ata.get(id) === id ? id : ata.set(id, kok(ata.get(id))).get(id));
  for (const p of aks) {
    for (let ky = p.y; ky < p.y + p.boy; ky++) {
      for (let kx = p.x; kx < p.x + p.en; kx++) {
        for (let yon = 0; yon < 4; yon++) {
          const q = parcaAt(c, kx + DX[yon], ky + DY[yon]);
          if (!q || q === p || !aksMi(q) || !(iletkenMi(p) || iletkenMi(q))) continue;
          if (aksKenari(p, yon) && aksKenari(q, tersYon(yon))) ata.set(kok(p.id), kok(q.id));
        }
      }
    }
  }
  const gruplar = new Map();
  for (const p of aks) {
    const k = kok(p.id);
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(p);
  }
  const aglar = [];
  const yalniz = [];
  for (const uyeler of gruplar.values()) {
    if (!uyeler.some(iletkenMi)) { yalniz.push(...uyeler); continue; }
    aglar.push({
      uyeler, arz: 0, talep: 0, oran: 1024,
      uretici: uyeler.filter((p) => p.tanim.uret),
      volan: uyeler.filter((p) => p.tanim.depo),
      destek: uyeler.filter((p) => p.tanim.destek),
      makine: uyeler.filter(makineMi),
    });
  }
  return { aglar, yalniz };
}

const gucsuz = (p) => p.tanim.gucsuzOran ?? 0;

/** Makinenin bu tikteki bg talebi: tanım `talep` verirse o, yoksa duruma göre guc ya da 0. */
function talepOku(p, ctx) {
  if (p.tanim.talep) return p.tanim.talep(p, ctx);
  return TALEP_DURUMLARI.has(parcaDurumu(p)) ? p.tanim.guc : 0;
}

/** Volanlar sırayla: fazlalık şarj eder (≤ sarj), açık deşarj eder (≤ desarj). */
function volanlar(ag) {
  for (const v of ag.volan) {
    if (!v.etkin) continue;
    const { kap, sarj, desarj } = v.tanim.depo;
    const fark = ag.arz - ag.talep;
    if (fark > 0) {
      const s = Math.min(fark, sarj, kap - v.ozel.dolu);
      v.ozel.dolu += s;
      ag.arz -= s;
    } else if (fark < 0) {
      const d = Math.min(-fark, desarj, v.ozel.dolu);
      v.ozel.dolu -= d;
      ag.arz += d;
    }
  }
}

function agAdim(ag, ctx, hava) {
  ag.arz = 0;
  ag.talep = 0;
  for (const p of ag.uretici) if (p.etkin) ag.arz += p.tanim.uret(p, ctx, hava);
  for (const p of ag.makine) if (p.etkin) ag.talep += talepOku(p, ctx);
  volanlar(ag);
  for (const p of ag.destek) {
    if (p.etkin) ag.arz += p.tanim.destek(p, ctx, Math.max(0, ag.talep - ag.arz));
  }
  ag.oran = ag.talep ? Math.min(1024, Math.floor((ag.arz * 1024) / ag.talep)) : 1024;
  for (const p of ag.makine) p.oran = Math.max(gucsuz(p), ag.oran);
}

function yenidenKur(c) {
  const { aglar, yalniz } = aglariKur(c);
  c.enerji = { aglar, yalniz };
  for (const p of yalniz) p.oran = gucsuz(p);
}

asamaTanimla('enerji', 20, {
  yenidenKur,
  adim(ctx) {
    const { aglar } = ctx.c.enerji;
    if (!aglar.length) return;
    const hava = havaAl(ctx.c, ctx.tik);
    for (const ag of aglar) agAdim(ag, ctx, hava);
  },
});

/** Parçanın bağlı olduğu şebeke ({ arz, talep, oran, ... }); bağlı değilse null. */
export function agiBul(c, p) {
  return c.enerji?.aglar.find((ag) => ag.uyeler.includes(p)) ?? null;
}

/** Güç rozeti: 'guc-yok' (oran 0) | 'guc-az' (< %50) | null. Makine parçaları durum()'unda
 * kullanır; guc'u olmayan parça için hep null. */
export function gucRozeti(p) {
  if (!(p.tanim.guc > 0)) return null;
  if (p.oran === 0) return 'guc-yok';
  return p.oran < 512 ? 'guc-az' : null;
}

/** Kutudan (hücre) (x, y) noktasına uzaklık, karo cinsinden (içerdeyse 0). */
function kutuUzakligi(p, x, y) {
  const dx = Math.max(p.x * KARO - x, 0, x - (p.x + p.en) * KARO);
  const dy = Math.max(p.y * KARO - y, 0, y - (p.y + p.boy) * KARO);
  return Math.sqrt(dx * dx + dy * dy) / KARO;
}

/** Çiftçi (hücre) parçanın `karo` karo çevresinde mi (kenardan ölçülür). */
export function ciftciYakin(p, ciftci, karo) {
  return Boolean(ciftci) && kutuUzakligi(p, ciftci.x, ciftci.y) <= karo;
}

komutTanimla('krank', (c, tarla, k, olaylar) => {
  const p = parcaAt(c, k.x, k.y);
  const red = (neden) => olaylar.push({ ad: 'komut-reddedildi', veri: { komut: k, neden } });
  if (!p) return red('bos');
  if (!p.tanim.krank) return red('krank-degil');
  if (!ciftciYakin(p, k.ciftci, ENERJI.KRANK_BASLAT_KARO)) return red('uzak');
  p.ozel.kalan = ENERJI.KRANK_TIK;
  olaylar.push({ ad: 'krank-basladi', veri: { parca: p } });
  return undefined;
});
