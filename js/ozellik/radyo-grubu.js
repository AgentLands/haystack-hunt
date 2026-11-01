/**
 * Radyo grubu klavyesi (role=radiogroup, düğmeler role=radio): grup tek Tab durağıdır
 * (seçili düğme tabIndex 0, diğerleri -1; seçimi çağıran eşitler). Oklar (← ↑ önceki,
 * → ↓ sonraki, döngülü), Home ve End odağı düğmeler arasında gezdirir. Seçim Boşluk/Enter
 * ile (düğmenin kendi tıklaması) yapılır: menüde zorluk seçmek tarlayı baştan açtığı için
 * yalnız gezinmek bir şey değiştirmez.
 */
const GERI = new Set(['ArrowLeft', 'ArrowUp']);
const ILERI = new Set(['ArrowRight', 'ArrowDown']);

/** Odaklı düğmenin sırası i, n düğme, tuş → yeni sıra (tanımsız tuşta null). */
export function radyoHedefi(i, n, tus) {
  if (GERI.has(tus)) return (i - 1 + n) % n;
  if (ILERI.has(tus)) return (i + 1) % n;
  if (tus === 'Home') return 0;
  if (tus === 'End') return n - 1;
  return null;
}

/** kap içindeki dugmeler dizisine ok tuşu gezinmesi bağlar. */
export function radyoKlavyesi(kap, dugmeler) {
  kap.addEventListener('keydown', (e) => {
    const i = dugmeler.indexOf(document.activeElement);
    const j = i < 0 ? null : radyoHedefi(i, dugmeler.length, e.key);
    if (j === null) return;
    e.preventDefault();
    e.stopPropagation(); // oklar oyuna (yürüme) ve rehbere gitmesin
    for (const d of dugmeler) d.tabIndex = d === dugmeler[j] ? 0 : -1;
    dugmeler[j].focus();
  });
}
