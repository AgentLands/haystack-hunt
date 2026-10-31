/**
 * Tarla ızgarasının boyutları ve sınır denetimi (her modülün ortak dayanağı).
 */
export const GENISLIK = 240;
export const YUKSEKLIK = 160;

export function icinde(x, y) {
  return x >= 0 && y >= 0 && x < GENISLIK && y < YUKSEKLIK;
}
