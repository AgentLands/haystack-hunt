/**
 * Service worker: çevrimdışı açılış. Sürümlü önbellek; kurulumda kabuk (ana.js'ten
 * başlayarak içe aktarma zinciri) alınır, sonra her istek "ağ önce, önbellek yedek"
 * çalışır, yanıtlar önbelleğe yazılır; sonradan eklenen modüller de kendiliğinden gelir.
 */
const SURUM = 'v1';
const ONBELLEK = `haystack-hunt-${SURUM}`;
const KABUK = [
  './', './belirtec.css', './stil.css', './js/ana.js', './manifest.webmanifest',
  './font/alfa-slab-one.woff2', './font/bree-serif.woff2', './font/courier-prime-bold.woff2',
  './ikon/arayuz.svg',
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

self.addEventListener('activate', (olay) => {
  olay.waitUntil((async () => {
    for (const ad of await caches.keys()) {
      if (ad.startsWith('haystack-hunt-') && ad !== ONBELLEK) await caches.delete(ad);
    }
    await self.clients.claim();
  })());
});

async function agOnce(istek) {
  const gezinme = istek.mode === 'navigate';
  // Gezinmeler ?tohum= ile gelir; hepsi tek kabuk girdisini paylaşır.
  const anahtar = gezinme ? new URL('./', self.registration.scope).href : istek;
  try {
    const yanit = await fetch(istek);
    if (yanit.ok && yanit.type === 'basic') {
      const kopya = yanit.clone();
      caches.open(ONBELLEK).then((o) => o.put(anahtar, kopya))
        .catch((hata) => console.error('Önbelleğe yazılamadı:', hata));
    }
    return yanit;
  } catch (hata) {
    const yedek = await caches.match(anahtar, { ignoreSearch: !gezinme });
    if (yedek) return yedek;
    throw hata;
  }
}

self.addEventListener('fetch', (olay) => {
  const { request: istek } = olay;
  if (istek.method !== 'GET' || !istek.url.startsWith(self.location.origin)) return;
  olay.respondWith(agOnce(istek));
});

self.addEventListener('message', (olay) => {
  const veri = olay.data;
  if (!veri || veri.tur !== 'onbellekle') return;
  olay.waitUntil((async () => {
    const onbellek = await caches.open(ONBELLEK);
    for (const adres of veri.adresler) {
      if (!adres.startsWith(self.location.origin)) continue;
      const anahtar = new URL(adres).pathname === new URL('./', self.registration.scope).pathname
        ? new URL('./', self.registration.scope).href : adres;
      if (await onbellek.match(anahtar)) continue;
      try {
        await onbellek.add(anahtar);
      } catch (hata) {
        console.error('Önbelleğe alınamadı:', adres, hata);
      }
    }
  })());
});
