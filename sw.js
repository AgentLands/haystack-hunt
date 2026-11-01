/**
 * Service worker: çevrimdışı ve hızlı açılış. Sürümlü önbellek; kurulumda kabuk (ana.js'ten
 * başlayarak içe aktarma zinciri) ağdan taze alınır.
 * - Gezinme (sayfa) ve statik dosyalar (js, css, font, ikon): önbellek önce, arkada tazele
 *   (stale-while-revalidate, `cache: 'no-cache'`: HTTP önbelleği atlanır): tekrar ziyaret ağı
 *   beklemez. HTML de modüller de AYNI sürümlü önbellekten geldiği için sürüm karışmaz
 *   (yeni HTML + eski JS olmaz); yeni sürüm ancak yeni işçi kurulup devralınca birlikte
 *   gelir. Önbellekte olmayan dosya ağdan alınıp yazılır.
 * Yayın: SURUM artırılınca tarayıcı yeni işçiyi kurar (kabuk yeniden indirilir), eski
 * önbellek silinir, yeni işçi hemen devralır; sayfa (ozellik/pwa.js) "Yeni sürüm hazır"
 * der, yenileyince yeni sürüm açılır. Her yayında SURUM'u artır.
 */
const SURUM = 'v5';
const ONBELLEK = `haystack-hunt-${SURUM}`;
const KABUK = [
  './', './belirtec.css', './stil.css', './stil-hud.css', './stil-telefon.css', './js/ana.js',
  './manifest.webmanifest',
  './font/alfa-slab-one.woff2', './font/bree-serif.woff2', './font/courier-prime-bold.woff2',
  './ikon/arayuz.svg',
];
// Statik/dinamik içe aktarma ve `new URL('./x', import.meta.url)` (işçi betiği, stil):
// çevrimdışı açılışta arka plan işçisi de önbellekten yüklensin.
const ICE_AKTAR = /(?:from\s*|import\s*\(?\s*|new\s+URL\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;

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

/** Ağdan (HTTP önbelleği doğrulanarak) alır; başarılıysa önbelleğe yazar. */
async function agdanYaz(istek, anahtar = istek) {
  const yanit = await fetch(istek, { cache: 'no-cache' });
  if (yanit.ok && yanit.type === 'basic') {
    const onbellek = await caches.open(ONBELLEK);
    await onbellek.put(anahtar, yanit.clone());
  }
  return yanit;
}

/**
 * Önbellek önce, arkada tazele; önbellekte yoksa ağ (o da yoksa sorgusuz eşleşme).
 * Gezinmeler ?tohum= ile gelir; hepsi tek kabuk girdisini (anahtar) paylaşır.
 */
async function onbellekOnce(olay, istek) {
  const gezinme = istek.mode === 'navigate';
  const anahtar = gezinme ? kabukAnahtari() : istek;
  const kaynak = gezinme ? anahtar : istek;
  const kayitli = await caches.match(anahtar);
  if (kayitli) {
    olay.waitUntil(agdanYaz(kaynak, anahtar).catch((hata) => {
      console.error('Arkada tazelenemedi (çevrimdışı olabilir):', istek.url, hata);
    }));
    return kayitli;
  }
  try {
    return await agdanYaz(kaynak, anahtar);
  } catch (hata) {
    const yedek = await caches.match(anahtar, { ignoreSearch: true });
    if (yedek) return yedek;
    throw hata;
  }
}

self.addEventListener('fetch', (olay) => {
  const { request: istek } = olay;
  if (istek.method !== 'GET' || !istek.url.startsWith(self.location.origin)) return;
  if (istek.url.endsWith('/sw.js')) return;
  olay.respondWith(onbellekOnce(olay, istek));
  if (istek.mode === 'navigate') olay.waitUntil(eskileriSil());
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
