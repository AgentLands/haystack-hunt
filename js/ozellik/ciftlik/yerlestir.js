/**
 * İnşa kipleri (I1 girişi; ana.js içe aktarır): 'kur' kipi ve tek parça yerleştirme ile
 * önizleme durumu burada; 'gez' ve 'sil' gez-sil.js'te, hat çekme hat-cek.js'te, krank
 * krank.js'te. Kurallar docs/ciftlik/arayuz.md §3 ve §10:
 * - Masaüstünde hayalet imleci izler, sol tık kurar (kip açık kalır), sağ tık parçayı
 *   söker ya da boşta kipten çıkar.
 * - Dokunmatikte bas-sürükle-bırak: hayalet parmağın PARMAK_PAYI üstünde izler, bırakınca
 *   kurulur (parmak tuvalden çıkıp palete dönerse iptal); tek dokunuş hayaleti oraya koyar
 *   ve ↻ ✓ ✕ baloncuğu çıkar (✓ kurar; hayalet sürüklenerek taşınır).
 * - Hayalet durumu (insa.onizleme): geçerli / bağlantısız (uyarı) / geçersiz + neden.
 * - Kur kipine girerken karo küçükse kamera yaklaşır (insa-kamera.js).
 */
import { durumAl } from '../../oyun.js';
import { dinle } from '../../olaylar.js';
import { donmusBoyut } from '../../kural/ciftlik/olcu.js';
import { parcaTanimi } from '../../kural/ciftlik/parca-kayit.js';
import { parcaAt } from '../../kural/ciftlik/izgara.js';
import { kurCifti } from '../../kural/ciftlik/insa/gecmis.js';
import {
  yerlesimKonumu, yerlesimDurumu, NEDEN_METNI,
} from '../../kural/ciftlik/insa/yerlesim.js';
import {
  insa, kipTanimla, kipAc, degisti, insaEylem, kaynakSecenek, karoBul,
} from './insa.js';
import { yaklas, kenarIzle, kenarBirak } from './insa-kamera.js';
import { takipBirak } from '../kamera-takip.js';
import { sokIste } from './baloncuk.js';
import {
  hatBas, hatTasi, hatBitir, hatDondu, hatIptal, SURUKLE_PX, SURUKLE_MS,
} from './hat-cek.js';
import './gez-sil.js';
import './krank.js';
import './insa-katman.js';

/** Dokunmatikte sürüklenen hayalet parmağın bu kadar üstünde (CSS px). */
export const PARMAK_PAYI = 48;

const tuval = document.getElementById('tarla');
const d = () => durumAl();
const hatMi = () => Boolean(parcaTanimi(insa.secili)?.hat);
const uzaklik = (e, b) => Math.hypot(e.clientX - b.x, e.clientY - b.y);

function disarida(e) {
  const r = tuval.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

/** Tek parça önizlemesi: insa.onizleme ve etiket (neden / bağlantısız). */
function onizle(karo) {
  const { ciftlik: c, tarla } = d();
  const tanim = parcaTanimi(insa.secili);
  const { x, y } = yerlesimKonumu(insa.secili, karo.kx, karo.ky, insa.yon);
  const secenek = kaynakSecenek(tanim);
  const o = yerlesimDurumu(c, tarla, insa.secili, x, y, insa.yon, secenek);
  const [en, boy] = donmusBoyut(tanim.boyut, tanim.yonlu ? insa.yon : 0);
  insa.onizleme = { ...o, x, y, en, boy };
  insa.hayalet = { kx: karo.kx, ky: karo.ky };
  const neden = o.neden === 'kilitli' ? secenek.kilit : NEDEN_METNI[o.neden];
  insa.etiket = o.durum === 'gecersiz' ? { metin: `✕ ${neden}`, tur: 'hata', ...insa.hayalet }
    : o.durum === 'uyari' ? { metin: `! ${NEDEN_METNI.bagsiz}`, tur: 'uyari', ...insa.hayalet }
      : null;
  return o;
}

/** Önizlemedeki parçayı kurar (geçersizse kurmaz). */
function koy() {
  const o = insa.onizleme;
  if (!o || o.durum === 'gecersiz') return false;
  const tanim = parcaTanimi(insa.secili);
  return insaEylem(tanim.ad, [kurCifti(insa.secili, o.x, o.y, insa.yon, insa.ayarlar)]);
}

/** Dokunmatikte sürüklenen hayaletin karosu (parmağın PARMAK_PAYI üstü). */
function parmakKarosu(e) {
  return karoBul({ clientX: e.clientX, clientY: e.clientY - PARMAK_PAYI });
}

function bekleyenKur(karo) {
  const o = onizle(karo);
  insa.bekleyen = {
    kx: karo.kx, ky: karo.ky, gecersiz: o.durum === 'gecersiz',
    metin: insa.etiket?.metin ?? parcaTanimi(insa.secili).ad,
    onay: () => {
      if (koy()) Object.assign(insa, { bekleyen: null, hayalet: null, etiket: null });
    },
    dondur: () => {
      insa.yon = (insa.yon + 1) & 3;
      bekleyenKur(insa.hayalet);
      degisti();
    },
  };
}

function icinde(karo) {
  const o = insa.onizleme;
  return o && karo.kx >= o.x - 1 && karo.kx <= o.x + o.en && karo.ky >= o.y - 1
    && karo.ky <= o.y + o.boy;
}

const kur = {
  gir() {
    takipBirak();
    yaklas();
    Object.assign(insa, { onizleme: null, etiket: null, hayalet: insa.imlec });
    if (insa.imlec && !hatMi()) onizle(insa.imlec);
  },
  iptal() {
    hatIptal();
    kenarBirak();
    Object.assign(insa, { onizleme: null, etiket: null });
  },
  dondu() {
    if (hatMi()) hatDondu();
    else if (insa.bekleyen) bekleyenKur(insa.hayalet);
    else if (insa.hayalet) onizle(insa.hayalet);
  },
  bas(e, karo) {
    if (e.button === 2) {
      const p = parcaAt(d().ciftlik, karo.kx, karo.ky);
      if (p) sokIste([p]);
      else kipAc('gez');
      return true;
    }
    if (e.button !== 0) return false;
    if (hatMi()) return hatBas(e, karo);
    const dokunus = e.pointerType === 'touch';
    insa.basili = { id: e.pointerId, dokunus, x: e.clientX, y: e.clientY,
      zaman: performance.now(), surukledi: false, tasiyor: dokunus && insa.bekleyen
        && icinde(karo) };
    if (!dokunus) onizle(karo);
    tuval.setPointerCapture?.(e.pointerId);
    return true;
  },
  tasi(e, karo) {
    const b = insa.basili;
    if (b && hatMi()) return hatTasi(e, karo);
    if (!b || b.id !== e.pointerId) {
      if (e.pointerType !== 'touch' && !insa.bekleyen && !hatMi()) onizle(karo);
      else if (e.pointerType !== 'touch' && !insa.bekleyen) insa.hayalet = karo;
      return false;
    }
    if (!b.dokunus) {
      onizle(karo);
      return true;
    }
    if (!b.surukledi) {
      if (uzaklik(e, b) < SURUKLE_PX || performance.now() - b.zaman < SURUKLE_MS) return true;
      b.surukledi = true;
      if (!b.tasiyor) insa.bekleyen = null;
    }
    const k = parmakKarosu(e);
    if (b.tasiyor) bekleyenKur(k);
    else onizle(k);
    kenarIzle(e, (s) => insa.basili === b && kur.tasi(s, karoBul(s)));
    return true;
  },
  bitir(e, karo) {
    const b = insa.basili;
    if (b && hatMi()) return hatBitir(e, karo);
    if (!b || b.id !== e.pointerId) return false;
    insa.basili = null;
    kenarBirak();
    if (e.type === 'pointercancel' || (b.dokunus && b.surukledi && disarida(e))) {
      kur.iptal();
    } else if (!b.dokunus) {
      koy();
    } else if (b.surukledi && !b.tasiyor) {
      koy();
      Object.assign(insa, { hayalet: null, etiket: null, onizleme: null });
    } else if (!b.tasiyor) {
      bekleyenKur(karo);
    }
    degisti();
    return true;
  },
};

kipTanimla('kur', kur);

// Dünya değişince (kurulan / sökülen / dönen parça) masaüstü hayaletinin durumu yenilenir.
for (const ad of ['parca-kuruldu', 'parca-sokuldu', 'parca-dondu']) {
  dinle(ad, () => {
    if (insa.kip === 'kur' && insa.hayalet && !insa.basili && !insa.bekleyen && !hatMi()) {
      onizle(insa.hayalet);
    }
  });
}
