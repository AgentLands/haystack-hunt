/**
 * Bot sürücüsü (saf mantık): beynin niyetini insan gibi, hız sınırlı bir imleçle oyunun
 * gerçek eylemlerine çevirir. Her karede komut listesi döndürür:
 *   { t: 'arac', arac }, { t: 'bas', x, y }, { t: 'surukle', x, y }, { t: 'birak' }
 * Tarayıcı (bot.js) bunları oyun.js işlevlerine, test aynı komutları kendi benzetimine verir.
 */
import { SEVIYELER } from '../kural/araclar.js';
import { beyinKur } from './bot-beyin.js';

const ARACLAR = { oku: 'dedektor', tirmik: 'tirmik', kaz: 'el' };

export function botKur({ h0, seviyeler = SEVIYELER, hiz = 90, baslangic = { x: 120, y: 80 } }) {
  const beyin = beyinKur({ h0, seviyeler });
  const s = { x: baslangic.x, y: baslangic.y, basili: false, arac: null, niyet: null, faz: 'git' };

  /** İmleci hedefe en çok `adim` hücre yaklaştırır; vardıysa true. */
  function yuru(hedef, adim) {
    const dx = hedef.x - s.x;
    const dy = hedef.y - s.y;
    const uzak = Math.hypot(dx, dy);
    if (uzak <= adim) {
      s.x = hedef.x;
      s.y = hedef.y;
      return true;
    }
    s.x += (dx / uzak) * adim;
    s.y += (dy / uzak) * adim;
    return false;
  }

  return {
    get konum() { return { x: s.x, y: s.y }; },
    get beyin() { return beyin; },

    olay(ad, veri) {
      if (ad === 'dedektor') beyin.okuma(veri.x, veri.y, veri.seviye);
      else if (ad === 'parilti') beyin.parilti(veri.x, veri.y);
      else if (ad === 'igne-gorundu') beyin.igneGorundu(veri.x, veri.y);
    },

    /** Bir kare: g = { h, dedektor, bitti }, dt = geçen saniye. Komut listesi döndürür. */
    kare(g, dt) {
      const komutlar = [];
      const niyet = beyin.niyet({ ...g, imlec: { x: s.x, y: s.y } });
      if (niyet !== s.niyet) {
        const eski = s.niyet;
        const ayniYer = eski && niyet && eski.tip === 'kaz' && niyet.tip === 'kaz'
          && eski.hedef.x === niyet.hedef.x && eski.hedef.y === niyet.hedef.y;
        if (ayniYer) {
          s.niyet = niyet;
        } else {
          if (s.basili) komutlar.push({ t: 'birak' });
          Object.assign(s, { basili: false, niyet, faz: 'git' });
        }
      }
      if (!niyet) return komutlar;
      const arac = ARACLAR[niyet.tip];
      const adim = hiz * Math.min(dt, 0.05);
      // Tırmıkta kesirli konum (düzgün adım), diğerlerinde hücre koordinatı.
      const nokta = (p) => (niyet.tip === 'tirmik'
        ? { x: p.x, y: p.y } : { x: Math.round(p.x), y: Math.round(p.y) });
      const git = (hedef) => {
        const vardi = yuru(hedef, adim);
        komutlar.push({ t: 'surukle', ...nokta(s) });
        return vardi;
      };
      if (s.faz === 'git') {
        if (s.arac !== arac) {
          komutlar.unshift({ t: 'arac', arac });
          s.arac = arac;
        }
        const hedef = niyet.tip === 'tirmik' ? niyet.a : niyet.hedef;
        if (git(hedef)) s.faz = 'islem';
        return komutlar;
      }
      if (niyet.tip === 'oku') {
        komutlar.push({ t: 'bas', ...nokta(s) }, { t: 'birak' });
        niyet.tamam = true;
      } else if (niyet.tip === 'kaz') {
        if (!s.basili) komutlar.push({ t: 'bas', ...nokta(s) });
        s.basili = true;
      } else if (!s.basili) {
        komutlar.push({ t: 'bas', ...nokta(s) });
        s.basili = true;
      } else if (git(niyet.b)) {
        komutlar.push({ t: 'birak' });
        s.basili = false;
        niyet.tamam = true;
      }
      return komutlar;
    },
  };
}
