/**
 * İstatistik penceresi, "tarla defteri": çizgili sayfada oynanan tarla çetelesi, bulma
 * oranı cümlesi, daire içine alınmış en iyi süre ve son bulma sürelerinin kurşun kalem
 * çubukları. Stil istatistik.css'te; burada yalnız DOM kurulur.
 */
import { sureMetni, sayi } from '../arayuz.js';
import { pencereHazirla, stilYukle } from './pencere.js';

const CETELE_TAVAN = 40;

function eleman(etiket, sinif, metin) {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

/** n çizgilik çetele: dörtlü demetler ve çaprazı (beşli demet), en çok CETELE_TAVAN çizgi. */
function cetele(n) {
  const kap = eleman('div', 'defter-cetele');
  kap.setAttribute('role', 'img');
  kap.setAttribute('aria-label', `${n} tarla oynandı`);
  const cizgi = Math.min(n, CETELE_TAVAN);
  for (let kalan = cizgi; kalan > 0; kalan -= 5) {
    const demet = eleman('span', kalan >= 5 ? 'demet tam' : 'demet');
    for (let i = 0; i < Math.min(kalan, 4); i += 1) demet.append(document.createElement('i'));
    kap.append(demet);
  }
  if (n > CETELE_TAVAN) {
    kap.append(eleman('span', 'defter-fazla', `+${sayi.format(n - CETELE_TAVAN)}`));
  }
  return kap;
}

/** Elle çizilmiş iğne: boş durumun küçük çizimi. */
function igneCizimi() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 64 24');
  svg.setAttribute('class', 'defter-igne');
  svg.setAttribute('aria-hidden', 'true');
  const yol = document.createElementNS(ns, 'path');
  yol.setAttribute('d', 'M4 20 L58 6 M52 4.5 C56 3.5 60 5 60 8 M5 19.5 C8 15 14 14 17 17');
  svg.append(yol);
  return svg;
}

function bosGrafik() {
  const kap = eleman('div', 'defter-bos');
  kap.append(igneCizimi(),
    eleman('p', '', 'Henüz iğne bulunmadı. İlk iğneni bul, grafik burada belirir.'));
  return kap;
}

/** Az kayıt (1-2) varken grafik alçak, çubuklar dar; tek kayıt "en iyi" diye boyanmaz. */
const AZ_KAYIT = 3;

function grafik(sureler) {
  if (sureler.length === 0) return bosGrafik();
  const en = Math.max(...sureler.map((s) => s.sureMs));
  const enIyi = Math.min(...sureler.map((s) => s.sureMs));
  const az = sureler.length < AZ_KAYIT;
  const kap = eleman('div', az ? 'defter-grafik az' : 'defter-grafik');
  kap.setAttribute('role', 'img');
  kap.setAttribute('aria-label', 'Son oyunların süreleri: '
    + sureler.map((s) => sureMetni(s.sureMs)).join(', '));
  for (const { etiket, sureMs } of sureler) {
    const vurgu = sureMs === enIyi && sureler.length > 1;
    const sutun = eleman('div', vurgu ? 'sutun en-iyi' : 'sutun');
    sutun.title = `${etiket} · ${sureMetni(sureMs)}`;
    const cubuk = eleman('i');
    cubuk.style.setProperty('--boy', `${Math.max(5, Math.round((sureMs / en) * 100))}%`);
    sutun.append(eleman('span', 'sayi', sureMetni(sureMs)), cubuk);
    kap.append(sutun);
  }
  return kap;
}

/** Grafik başlığı: "Son bulma süresi" (tek kayıt) ya da "Son 5 bulma süresi". */
export function grafikBasligi(n) {
  return n === 1 ? 'Son bulma süresi' : `Son ${n} bulma süresi`;
}

function bulmaCumlesi(o) {
  if (o.oynanan === 0) return '';
  const oran = o.bulmaYuzde === null ? '' : `Bulma oranı %${o.bulmaYuzde}: `;
  return `${oran}${o.bulunan} iğne bulundu, ${o.pesEdilen} kez pes edildi.`;
}

function enIyiSure(o) {
  const kap = eleman('div', 'defter-en-iyi');
  kap.append(eleman('span', 'defter-etiket', 'En iyi süre'));
  const daire = eleman('strong', 'sayi daire', o.enIyiMs === null ? '–' : sureMetni(o.enIyiMs));
  kap.append(daire);
  if (o.ortalamaMs !== null) {
    kap.append(eleman('span', 'defter-etiket', `ortalama ${sureMetni(o.ortalamaMs)}`));
  }
  return kap;
}

function bugunSatiri(o) {
  const satir = eleman('p', 'defter-bugun');
  const kutu = eleman('span', o.bugunCozuldu ? 'kutu isaretli' : 'kutu');
  kutu.setAttribute('aria-hidden', 'true');
  satir.append(kutu, o.bugunCozuldu ? 'Bugünün tarlası çözüldü.' : 'Bugünün tarlası bekliyor.');
  return satir;
}

/** Pencereyi kurar; ozetAl() güncel özeti verir. Döner: { ac }. */
export function pencereKur(ozetAl) {
  stilYukle('./istatistik.css');
  const pencere = document.createElement('dialog');
  pencere.id = 'istatistik-pencere';
  pencere.className = 'kagit-pencere pencere defter';
  pencere.setAttribute('aria-labelledby', 'defter-baslik');
  const baslik = eleman('h2', '', 'Tarla defteri');
  baslik.id = 'defter-baslik';
  const govde = eleman('div', 'defter-govde');
  const kapat = eleman('button', 'dugme-metin', 'Kapat');
  kapat.type = 'button';
  kapat.addEventListener('click', () => pencere.close());
  const dugmeler = eleman('div', 'dugmeler');
  dugmeler.append(kapat);
  pencere.append(baslik, govde, dugmeler);
  pencereHazirla(pencere, { dis: true });
  document.body.append(pencere);

  function doldur() {
    const o = ozetAl();
    const etiket = eleman('p', 'defter-etiket', 'Oynanan tarla ');
    etiket.append(eleman('b', 'sayi', sayi.format(o.oynanan)));
    const sol = eleman('div', 'defter-sol');
    sol.append(etiket, cetele(o.oynanan));
    const satir1 = eleman('div', 'defter-satir');
    satir1.append(sol);
    if (o.enIyiMs !== null) satir1.append(enIyiSure(o));
    const cumle = eleman('p', 'defter-cumle', bulmaCumlesi(o));
    const seri = o.enUzunSeri === 0 ? null : eleman('p', 'defter-seri',
      `Günün tarlası serisi: ${o.seri} gün (en uzun ${o.enUzunSeri}).`);
    const saman = o.toplamSaman === 0 ? null : eleman('p', 'defter-saman',
      `Toplam kaldırılan saman: ${sayi.format(o.toplamSaman)}`);
    const altBaslik = o.sonSureler.length
      ? eleman('p', 'defter-baslik', grafikBasligi(o.sonSureler.length)) : null;
    govde.replaceChildren(...[satir1, cumle.textContent ? cumle : null, seri, bugunSatiri(o), saman,
      altBaslik,
      grafik(o.sonSureler)].filter(Boolean));
  }

  return { ac() { doldur(); pencere.showModal(); } };
}
