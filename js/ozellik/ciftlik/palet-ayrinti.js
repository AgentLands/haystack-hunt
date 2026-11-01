/**
 * Palet kartının ayrıntı kâğıdı: fareyle 450 ms bekleyince ya da dokunmatikte 500 ms uzun
 * basınca kartın üstünde açılır; tek cümle ne işe yarar (tanımın `aciklama` alanı), kapılar
 * (giriş/çıkış sayısı), boyut, enerji (`guc`: talep ya da üretim), sorduğu soru (`soru`).
 * Uzun basış kartı seçmez (ardından gelen tıklama yutulur).
 */
const BEKLE_MS = 450;
const UZUN_BAS_MS = 500;

function satirlar(t) {
  const liste = [];
  if (t.aciklama) liste.push(t.aciklama);
  const g = t.girisler.length;
  const c = t.cikislar.length;
  if (t.hat) liste.push('Hat parçası: sürükleyerek çekilir.');
  else if (g || c) liste.push(`Kapılar: ${g} giriş, ${c} çıkış`);
  liste.push(`Boyut: ${t.boyut.join('×')} karo`);
  if (t.guc > 0) liste.push(`Enerji: ${t.guc} ister`);
  else if (t.guc < 0) liste.push(`Enerji: ${-t.guc} üretir`);
  if (t.soru) liste.push(`Sorusu: "${t.soru}"`);
  return liste;
}

/** Paletin içinde ayrıntı kâğıdını kurar: { bagla(kart, tanim), gizle() }. */
export function ayrintiKur(palet) {
  const kagit = document.createElement('div');
  kagit.className = 'ciftlik-ayrinti kagit-pencere';
  kagit.setAttribute('role', 'tooltip');
  kagit.hidden = true;
  palet.append(kagit);
  let zamanlayici = null;
  let yut = false;

  const gizle = () => {
    clearTimeout(zamanlayici);
    kagit.hidden = true;
  };
  const goster = (kart, t) => {
    const baslik = document.createElement('strong');
    baslik.textContent = t.ad;
    kagit.replaceChildren(baslik, ...satirlar(t).map((s) => {
      const p = document.createElement('p');
      p.textContent = s;
      return p;
    }));
    kagit.hidden = false;
    const k = kart.getBoundingClientRect();
    const p = palet.getBoundingClientRect();
    const sol = Math.min(p.width - kagit.offsetWidth - 4, Math.max(4, k.left - p.left));
    kagit.style.left = `${sol}px`;
  };

  function bagla(kart, t) {
    kart.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => goster(kart, t), BEKLE_MS);
    });
    kart.addEventListener('pointerleave', gizle);
    kart.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        gizle();
        return;
      }
      yut = false;
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => {
        yut = true;
        goster(kart, t);
      }, UZUN_BAS_MS);
    });
    for (const ad of ['pointerup', 'pointercancel']) {
      kart.addEventListener(ad, () => clearTimeout(zamanlayici));
    }
    kart.addEventListener('click', (e) => {
      if (!yut) return;
      yut = false;
      e.stopImmediatePropagation();
      setTimeout(gizle, 1200);
    }, true);
    kart.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  return { bagla, gizle };
}
