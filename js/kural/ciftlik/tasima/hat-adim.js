/**
 * Bant hatlarının tik adımı ve port protokolü. Hatlar aşağı akış önce (c.hatSira) yürür:
 *   sinir = uzun; her eşya k için pos[k] = min(pos[k] + hiz, sinir); sinir = pos[k] - ARALIK
 * Öndeki eşya hattın sonuna (uzun) varınca çıkışa devredilmeyi dener; kabul edilmezse durur ve
 * arkası ARALIK aralıkla sıkışır (geri basınç). O(n), üst üste binme yok.
 * Port protokolü (giriş portu olan her parça): tanim.kabulEder(p, port, kod, ctx) → bool,
 * tanim.al(p, port, kod, ctx). Parçalar çıkışlarına ctx.ver(p, port, kod) ile verir: hedef bir
 * hat başıysa eşya hattın başına konur (son eşya ≥ ARALIK ilerideyse), bir parça
 * portuysa o parçanın kabulEder/al'ı çağrılır.
 */
import { ARALIK } from '../olcu.js';

/**
 * Hattın başına eşya koyar; yer yoksa false. Eşya sondakinin tam ARALIK gerisine (en çok
 * hiz kadar içeri) konur: sürekli beslenen hat tam verim taşır (20 × HIZ / ARALIK eşya/sn).
 */
export function hatBasaKoy(h, kod) {
  const n = h.n;
  if (n >= h.pos.length || (n > 0 && h.pos[n - 1] < ARALIK)) return false;
  h.pos[n] = n > 0 ? Math.min(h.pos[n - 1] - ARALIK, h.hiz) : 0;
  h.tur[n] = kod;
  h.n = n + 1;
  return true;
}

/** Hattın başında yer var mı (eşya koymadan)? */
export function hatBasiBos(h) {
  return h.n < h.pos.length && (h.n === 0 || h.pos[h.n - 1] >= ARALIK);
}

/** Öndeki eşyayı çıkarır (kuyruk kaydırma; n küçük). */
function ondekiniCikar(h) {
  h.pos.copyWithin(0, 1, h.n);
  h.tur.copyWithin(0, 1, h.n);
  h.n -= 1;
}

/** Hedef (hat ya da port) bu eşyayı alır mı? Yan etkisiz. */
export function hedefKabul(ctx, hedef, kod) {
  if (!hedef) return false;
  if (hedef.tur === 'hat') return hedef.hat.etkin && hatBasiBos(hedef.hat);
  const q = hedef.parca;
  return Boolean(q.tanim.kabulEder && q.tanim.kabulEder(q, hedef.port, kod, ctx));
}

/** Eşyayı hedefe verir; verildiyse true. */
export function hedefeVer(ctx, hedef, kod) {
  if (!hedefKabul(ctx, hedef, kod)) return false;
  if (hedef.tur === 'hat') return hatBasaKoy(hedef.hat, kod);
  hedef.parca.tanim.al(hedef.parca, hedef.port, kod, ctx);
  return true;
}

/** Parçanın k. çıkış portundan eşya verir (ctx.ver). */
export function cikisaVer(ctx, p, port, kod) {
  return hedefeVer(ctx, p.cikisHedef[port], kod);
}

/**
 * Bir hattın tik adımı. Öndeki eşya bu tik sona varacaksa önce devredilmeyi dener;
 * devredilirse arkadaki, öndekinin kenetlenmemiş konumuna göre ilerler (sondaki kenet
 * hareketi yutmasın: sıkışmış hat açılınca da tam verim).
 */
export function hatAdim(ctx, h) {
  if (!h.n || !h.etkin) return;
  const { pos, hiz, uzun } = h;
  const ileri = pos[0] + hiz;
  let sinir = uzun;
  if (ileri >= uzun && h.cikis && devret(ctx, h)) sinir = ileri - ARALIK;
  for (let k = 0; k < h.n; k++) {
    let p = pos[k] + hiz;
    if (p > sinir) p = sinir;
    pos[k] = p;
    sinir = p - ARALIK;
  }
}

/** Öndeki eşyayı çıkışa verir; verildiyse true. Halka kendi arkasına verir. */
function devret(ctx, h) {
  const kod = h.tur[0];
  if (h.cikis.tur === 'hat' && h.cikis.hat === h) {
    if (h.n > 1 && h.pos[h.n - 1] < ARALIK) return false;
    ondekiniCikar(h);
    hatBasaKoy(h, kod);
    return true;
  }
  if (!hedefeVer(ctx, h.cikis, kod)) return false;
  ondekiniCikar(h);
  return true;
}

/** Bütün hatlar, aşağı akış önce. */
export function hatlarAdim(ctx) {
  for (const h of ctx.c.hatSira) hatAdim(ctx, h);
}
