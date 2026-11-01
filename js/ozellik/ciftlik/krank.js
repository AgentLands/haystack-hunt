/**
 * El krankı tek dokunuş (docs/ciftlik/arayuz.md §10, parcalar.md 22): çiftlikte Kullan'a
 * (dokunmatik düğme) ya da Boşluk'a bir kez basmak, çiftçinin yanındaki (kuralın başlatma
 * menzili ENERJI.KRANK_BASLAT_KARO) en yakın el krankına `{ tur: 'krank', x, y, ciftci }`
 * komutu verir; 600 tiklik dönüşü ve uzaklaşınca durmayı kural (ag/enerji.js) yapar. Krank
 * KRANK_MENZIL içinde ama başlatma menzili dışındaysa oyuncuya "yanına git" denir. Krank
 * yoksa hiçbir şey olmaz (Kullan aracın işini sürdürür). Kullan düğmesi kendi olayını durdurduğundan yakalama
 * evresinde dinlenir.
 */
import { durumAl } from '../../oyun.js';
import { bildir } from '../../arayuz.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { ENERJI, ciftciYakin } from '../../kural/ciftlik/ag/enerji.js';
import { ciftlikte } from './insa.js';

/** Çiftçiye en çok bu kadar karo uzaktaki krank aranır (çevirmek için yanına gitmeli). */
export const KRANK_MENZIL = ENERJI.KRANK_SURDUR_KARO;
const KRANK = 'el-kranki';

function krankBul(durum) {
  const k = durum.karakter;
  const kx = Math.floor(k.x / KARO);
  const ky = Math.floor(k.y / KARO);
  let en = null;
  for (const p of durum.ciftlik.parcalar.values()) {
    if (p.tanim.anahtar !== KRANK) continue;
    const u = Math.max(p.x - kx, kx - (p.x + p.en - 1), p.y - ky, ky - (p.y + p.boy - 1), 0);
    if (u <= KRANK_MENZIL && (!en || u < en.u)) en = { p, u };
  }
  return en?.p ?? null;
}

/** Yakındaki el krankını bir dokunuşla çevirir (komut 'krank'; süre kuralda). */
export function krankCevir() {
  const durum = durumAl();
  if (!ciftlikte()) return false;
  const p = krankBul(durum);
  if (!p) return false;
  const ciftci = { x: Math.floor(durum.karakter.x), y: Math.floor(durum.karakter.y) };
  if (!ciftciYakin(p, ciftci, ENERJI.KRANK_BASLAT_KARO)) {
    bildir('Krankı çevirmek için yanına git.', 1600);
    return true;
  }
  komutEkle(durum.ciftlik, { tur: 'krank', x: p.x, y: p.y, ciftci });
  bildir('Krank dönüyor: 30 sn', 1600);
  return true;
}
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.('input, textarea, select, dialog')) return;
  krankCevir();
});
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('.dokunmatik-dugme.kullan')) krankCevir();
}, true);

