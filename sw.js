/**
 * Service worker: çevrimdışı ve hızlı açılış. Sürümlü önbellek; kurulumda kabuk (ana.js'ten
 * başlayarak içe aktarma zinciri) ağdan taze alınır.
 * - Gezinme (sayfa): ağ önce, önbellek yedek (çevrimdışı açılış).
 * - Statik dosyalar (js, css, font, ikon): önbellek önce, arkada tazele
 *   (stale-while-revalidate): tekrar ziyaret ağı beklemez; değişen dosya bir sonraki
 *   yüklemede gelir. Önbellekte olmayan dosya ağdan alınıp yazılır.
 * Yayın: SURUM artırılınca tarayıcı yeni işçiyi kurar (kabuk yeniden indirilir), eski
 * önbellek silinir, yeni işçi hemen devralır; sayfa (ozellik/pwa.js) "Yeni sürüm hazır"
 * der, yenileyince yeni sürüm açılır. Her yayında SURUM'u artır.
 */
const SURUM = 'v2';
const ONBELLEK = `haystack-hunt-${SURUM}`;
const KABUK = [
  './', './belirtec.css', './stil.css', './js/ana.js', './manifest.webmanifest',
  './font/alfa-slab-one.woff2', './font/bree-serif.woff2', './font/courier-prime-bold.woff2',
];
const ICE_AKTAR = /(?:from\s*|import\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Bir modülün göreli içe aktarmalarını (özyinelemeli) bulur. */
async function zincir(adres, goruldu = new Set()) {
  if (goruldu.has(adres)) return goruldu;
  goruldu.add(adres);
  const yanit = await fetch(adres, { cache: 'reload' });
  if (!yanit.ok) throw new Error(`${adres}: ${yanit.status}`);
  const metin = await yanit.clone().text();
  const onbellek = await caches.open(ONBELLEK);
  await onbellek.put(adres, yanit);
  for (const [, yol] of metin.matchAll(ICE_AKTAR)) {
    await zincir(new URL(yol, adres).href, goruldu);
  }
  return goruldu;
}

async function kabukuAl() {
  const onbellek = await caches.open(ONBELLEK);
  const taban = self.registration.scope;
  await onbellek.addAll(KABUK.map((a) => new Request(new URL(a, taban), { cache: 'reload' })));
  await zincir(new URL('js/ana.js', taban).href);
}

self.addEventListener('install', (olay) => {
  olay.waitUntil(kabukuAl().then(() => self.skipWaiting()));
});

/** Eski sürüm önbelleklerini siler (eski işçinin geciken arka plan yazmaları da gider). */
async function eskileriSil() {
  for (const ad of await caches.keys()) {
    if (ad.startsWith('haystack-hunt-') && ad !== ONBELLEK) await caches.delete(ad);
  }
}

self.addEventListener('activate', (olay) => {
  olay.waitUntil(eskileriSil().then(() => self.clients.claim()));
});

const kabukAnahtari = () => new URL('./', self.registration.scope).href;

/** Gezinme: ağ önce (yanıt önbelleğe), ağ yoksa önbellekteki kabuk. */
async function agOnce(istek) {
  // Gezinmeler ?tohum= ile gelir; hepsi tek kabuk girdisini paylaşır.
  const anahtar = kabukAnahtari();
  try {
    const yanit = await fetch(istek);
    if (yanit.ok && yanit.type === 'basic') {
      const kopya = yanit.clone();
      caches.open(ONBELLEK).then((o) => o.put(anahtar, kopya))
        .catch((hata) => console.error('Önbelleğe yazılamadı:', hata));
    }
    return yanit;
  } catch (hata) {
    const yedek = await caches.match(anahtar);
    if (yedek) return yedek;
    throw hata;
  }
}

/** Ağdan alır ve başarılıysa önbelleğe yazar (yazma bitince çözülür). */
async function agdanYaz(istek) {
  const yanit = await fetch(istek);
  if (yanit.ok && yanit.type === 'basic') {
    const onbellek = await caches.open(ONBELLEK);
    await onbellek.put(istek, yanit.clone());
  }
  return yanit;
}

/** Statik: önbellek önce, arkada tazele; önbellekte yoksa ağ (o da yoksa sorgusuz eşleşme). */
async function onbellekOnce(olay, istek) {
  const kayitli = await caches.match(istek);
  if (kayitli) {
    olay.waitUntil(agdanYaz(istek).catch((hata) => {
      console.error('Arkada tazelenemedi (çevrimdışı olabilir):', istek.url, hata);
    }));
    return kayitli;
  }
  try {
    return await agdanYaz(istek);
  } catch (hata) {
    const yedek = await caches.match(istek, { ignoreSearch: true });
    if (yedek) return yedek;
    throw hata;
  }
}

self.addEventListener('fetch', (olay) => {
  const { request: istek } = olay;
  if (istek.method !== 'GET' || !istek.url.startsWith(self.location.origin)) return;
  if (istek.url.endsWith('/sw.js')) return;
  if (istek.mode === 'navigate') {
    olay.respondWith(agOnce(istek));
    olay.waitUntil(eskileriSil());
  } else {
    olay.respondWith(onbellekOnce(olay, istek));
  }
});

self.addEventListener('message', (olay) => {
  const veri = olay.data;
  if (!veri || veri.tur !== 'onbellekle') return;
  olay.waitUntil((async () => {
    const onbellek = await caches.open(ONBELLEK);
    for (const adres of veri.adresler) {
      if (!adres.startsWith(self.location.origin)) continue;
      const anahtar = new URL(adres).pathname === new URL(kabukAnahtari()).pathname
        ? kabukAnahtari() : adres;
      if (await onbellek.match(anahtar)) continue;
      try {
        await onbellek.add(anahtar);
      } catch (hata) {
        console.error('Önbelleğe alınamadı:', adres, hata);
      }
    }
  })());
});
