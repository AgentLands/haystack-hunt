/**
 * İstatistik penceresi: kartlar (oynanan, bulma %, en iyi, seri) ve son 10 bulunan tarlanın
 * süreleriyle küçük çubuk grafik (div'lerle). Kendi stilini <style> ile getirir.
 */
import { sureMetni, sayi } from '../arayuz.js';

const STIL = `
#istatistik-pencere { width: min(420px, calc(100vw - 32px)); }
.ist-kartlar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
.ist-kart { background: var(--zemin); border: 1px solid var(--cizgi); border-radius: 10px;
  padding: 8px 12px; display: flex; flex-direction: column; min-width: 0; }
.ist-kart strong { font-size: 1.3rem; font-variant-numeric: tabular-nums; color: var(--vurgu); }
.ist-kart small { color: var(--soluk); font-size: 0.75rem; }
.ist-baslik { margin: 14px 0 6px; font-size: 0.85rem; color: var(--soluk); }
.ist-grafik { display: flex; align-items: flex-end; gap: 4px; height: 110px;
  border-bottom: 1px solid var(--cizgi); padding-top: 4px; }
.ist-sutun { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column;
  justify-content: flex-end; align-items: center; gap: 2px; }
.ist-sutun span { font-size: 0.62rem; color: var(--soluk); font-variant-numeric: tabular-nums;
  white-space: nowrap; }
.ist-sutun i { display: block; width: 100%; min-height: 3px; border-radius: 3px 3px 0 0;
  background: var(--cizgi); }
.ist-sutun.en-iyi i { background: var(--vurgu); }
.ist-bos { color: var(--soluk); font-size: 0.85rem; margin: 0; }
.ist-alt { color: var(--soluk); font-size: 0.85rem; margin: 12px 0; }
.ist-alt b { color: var(--yazi); }
`;

function kart(deger, ad, not) {
  const kutu = document.createElement('div');
  kutu.className = 'ist-kart';
  const buyuk = document.createElement('strong');
  buyuk.textContent = deger;
  const baslik = document.createElement('span');
  baslik.className = 'baslik';
  baslik.textContent = ad;
  kutu.append(baslik, buyuk);
  if (not) {
    const kucuk = document.createElement('small');
    kucuk.textContent = not;
    kutu.append(kucuk);
  }
  return kutu;
}

function grafik(sureler) {
  if (sureler.length === 0) {
    const bos = document.createElement('p');
    bos.className = 'ist-bos';
    bos.textContent = 'Henüz bulunmuş tarla yok; ilk iğneni bul, grafik burada belirsin.';
    return bos;
  }
  const en = Math.max(...sureler.map((s) => s.sureMs));
  const enIyi = Math.min(...sureler.map((s) => s.sureMs));
  const kap = document.createElement('div');
  kap.className = 'ist-grafik';
  kap.setAttribute('role', 'img');
  kap.setAttribute('aria-label', 'Son oyunların süreleri: '
    + sureler.map((s) => sureMetni(s.sureMs)).join(', '));
  for (const { etiket, sureMs } of sureler) {
    const sutun = document.createElement('div');
    sutun.className = `ist-sutun${sureMs === enIyi ? ' en-iyi' : ''}`;
    sutun.title = `${etiket} · ${sureMetni(sureMs)}`;
    const yazi = document.createElement('span');
    yazi.textContent = sureMetni(sureMs);
    const cubuk = document.createElement('i');
    cubuk.style.height = `${Math.max(4, Math.round((sureMs / en) * 80))}%`;
    sutun.append(yazi, cubuk);
    kap.append(sutun);
  }
  return kap;
}

/** Pencereyi kurar; ozetAl() güncel özeti verir. Döner: { ac }. */
export function pencereKur(ozetAl) {
  const stil = document.createElement('style');
  stil.textContent = STIL;
  document.head.append(stil);

  const pencere = document.createElement('dialog');
  pencere.id = 'istatistik-pencere';
  const baslik = document.createElement('h2');
  baslik.textContent = 'İstatistik 📊';
  const govde = document.createElement('div');
  const kapat = document.createElement('button');
  kapat.type = 'button';
  kapat.textContent = 'Kapat';
  kapat.addEventListener('click', () => pencere.close());
  const dugmeler = document.createElement('div');
  dugmeler.className = 'dugmeler';
  dugmeler.append(kapat);
  pencere.append(baslik, govde, dugmeler);
  pencere.addEventListener('click', (olay) => { if (olay.target === pencere) pencere.close(); });
  document.body.append(pencere);

  function doldur() {
    const o = ozetAl();
    const kartlar = document.createElement('div');
    kartlar.className = 'ist-kartlar';
    kartlar.append(
      kart(sayi.format(o.oynanan), 'Oynanan tarla', `${o.bulunan} bulundu · ${o.pesEdilen} pes`),
      kart(o.bulmaYuzde === null ? '–' : `%${o.bulmaYuzde}`, 'Bulma oranı'),
      kart(o.enIyiMs === null ? '–' : sureMetni(o.enIyiMs), 'En iyi süre',
        o.ortalamaMs === null ? '' : `ortalama ${sureMetni(o.ortalamaMs)}`),
      kart(`${o.seri} gün`, 'Günün tarlası serisi', `en uzun ${o.enUzunSeri} gün`),
    );
    const altBaslik = document.createElement('p');
    altBaslik.className = 'ist-baslik';
    altBaslik.textContent = `Son ${o.sonSureler.length || 10} bulma süresi`;
    const alt = document.createElement('p');
    alt.className = 'ist-alt';
    alt.innerHTML = `Bugünün tarlası: <b>${o.bugunCozuldu ? '✅ çözüldü' : '⬜ henüz değil'}</b>`
      + ` · kaldırılan saman: <b>${sayi.format(o.toplamSaman)}</b>`;
    govde.replaceChildren(kartlar, altBaslik, grafik(o.sonSureler), alt);
  }

  return { ac() { doldur(); pencere.showModal(); } };
}
