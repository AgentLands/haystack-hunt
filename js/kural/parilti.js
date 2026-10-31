/**
 * Güneş parıltısı (saf): parıltı zamanı gelince ne parlar (yüzeye yakın iğne ya da iğneyi
 * içeren balya) ve ekran dışındaki bir parıltı için ekran kenarındaki işaretin yeri.
 * Balyaya giren iğne tamamen gizli kalmasın diye, iğne bir balyadaysa o balya her parıltı
 * aralığında hafifçe parlar (iğnenin derinliği sorulmaz; kepçe/haznedeki iğne parlamaz).
 */
import { igneDerinligi } from './igne.js';

/** Parıltı anında ne parlar: 'igne' (derinlik ≤ esik), 'balya' (iğne balyada) ya da null. */
export function pariltiTuru(tarla, esik) {
  const { igne } = tarla;
  if (igne.balyada) return 'balya';
  if (igne.kepcede) return null;
  return igneDerinligi(tarla) <= esik ? 'igne' : null;
}

/**
 * Ekran kenarı işareti: alan {x, y, en, boy} (görünür dünya dikdörtgeni, hücre), nokta
 * {x, y} (hücre). Nokta alanın içindeyse null; değilse alanın ortasından noktaya giden
 * doğrunun, kenarlardan `pay` içeride kalan dikdörtgeni kestiği yer ve yön açısı (radyan):
 * { x, y, aci }.
 */
export function kenarIsareti(alan, nokta, pay = 0) {
  const { x, y, en, boy } = alan;
  if (nokta.x >= x && nokta.x <= x + en && nokta.y >= y && nokta.y <= y + boy) return null;
  const mx = x + en / 2;
  const my = y + boy / 2;
  const dx = nokta.x - mx;
  const dy = nokta.y - my;
  const yx = Math.max(0, en / 2 - pay);
  const yy = Math.max(0, boy / 2 - pay);
  // Doğru boyunca en küçük t: |dx·t| ≤ yx ve |dy·t| ≤ yy.
  const t = Math.min(dx ? yx / Math.abs(dx) : Infinity, dy ? yy / Math.abs(dy) : Infinity);
  return { x: mx + dx * t, y: my + dy * t, aci: Math.atan2(dy, dx) };
}
