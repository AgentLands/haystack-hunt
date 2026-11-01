/**
 * Service worker sürüm tutarlılığı: sayfa (gezinme) de statik dosyalar da aynı sürümlü
 * önbellekten gelir (yeni HTML + eski JS karışmaz); arka plan tazelemesi HTTP önbelleğini atlar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const KOK = 'http://localhost/';
/** Önbellek adı sw.js'teki SURUM'dan (her yayında artar; test elle güncellenmesin). */
const SURUM = /const SURUM = '([^']+)'/.exec(
  readFileSync(new URL('../sw.js', import.meta.url), 'utf8'))[1];
const ONBELLEK = `haystack-hunt-${SURUM}`;

/** sw.js'i sahte `self`, `caches` ve `fetch` ile yükler; kayıtlı olay dinleyicilerini verir. */
function isciYukle(ag) {
  const dinleyiciler = {};
  const depolar = new Map();
  const depo = (ad) => {
    if (!depolar.has(ad)) depolar.set(ad, new Map());
    return depolar.get(ad);
  };
  const yanitla = (govde) => ({ ok: true, type: 'basic', clone() { return this; }, govde });
  const caches = {
    open: async (ad) => ({
      put: async (a, y) => { depo(ad).set(String(a.url ?? a), y); },
      match: async (a) => depo(ad).get(String(a.url ?? a)),
      add: async () => {},
      addAll: async () => {},
    }),
    match: async (a) => {
      for (const d of depolar.values()) { const y = d.get(String(a.url ?? a)); if (y) return y; }
      return undefined;
    },
    keys: async () => [...depolar.keys()],
    delete: async (ad) => depolar.delete(ad),
  };
  const cagrilar = [];
  const baglam = {
    URL, console, Promise, Set,
    caches,
    fetch: async (istek, secenek) => {
      cagrilar.push({ url: String(istek.url ?? istek), cache: secenek?.cache });
      if (ag.kapali) throw new Error('çevrimdışı');
      return yanitla(ag.icerik(String(istek.url ?? istek)));
    },
    self: {
      location: { origin: 'http://localhost' },
      registration: { scope: KOK },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (ad, f) => { dinleyiciler[ad] = f; },
    },
  };
  baglam.self.self = baglam.self;
  vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), baglam);
  return { dinleyiciler, depo, cagrilar, yanitla };
}

/** Bir fetch olayını yürütür; yanıt ve bekleyen arka plan işleri döner. */
async function getir(isci, url, mode) {
  let yanit;
  const bekleyenler = [];
  isci.dinleyiciler.fetch({
    request: { method: 'GET', url, mode },
    respondWith: (p) => { yanit = p; },
    waitUntil: (p) => bekleyenler.push(p),
  });
  const sonuc = await yanit;
  await Promise.allSettled(bekleyenler);
  return sonuc;
}

test('önbellekteki sayfa ve modül aynı sürümden gelir (yeni HTML + eski JS olmaz)', async () => {
  const ag = { icerik: (u) => `${u}@yeni` };
  const isci = isciYukle(ag);
  const onbellek = isci.depo(ONBELLEK);
  onbellek.set(KOK, isci.yanitla('html@eski'));
  onbellek.set(`${KOK}js/ana.js`, isci.yanitla('js@eski'));
  const sayfa = await getir(isci, `${KOK}?tohum=x`, 'navigate');
  const modul = await getir(isci, `${KOK}js/ana.js`, 'cors');
  assert.equal(sayfa.govde, 'html@eski', 'sayfa önbellekten (ağdaki yeni HTML değil)');
  assert.equal(modul.govde, 'js@eski');
});

test('arka plan tazelemesi no-cache ile yapılır ve kabuk girdisini günceller', async () => {
  const isci = isciYukle({ icerik: (u) => `${u}@yeni` });
  const onbellek = isci.depo(ONBELLEK);
  onbellek.set(KOK, isci.yanitla('html@eski'));
  onbellek.set(`${KOK}js/ana.js`, isci.yanitla('js@eski'));
  await getir(isci, `${KOK}?tohum=x`, 'navigate');
  await getir(isci, `${KOK}js/ana.js`, 'cors');
  assert.equal(isci.cagrilar.length, 2);
  assert.ok(isci.cagrilar.every((c) => c.cache === 'no-cache'), 'HTTP önbelleği atlanmalı');
  assert.equal(onbellek.get(KOK).govde, `${KOK}@yeni`, 'tohumlu gezinme tek girdiye yazar');
  assert.equal(onbellek.get(`${KOK}js/ana.js`).govde, `${KOK}js/ana.js@yeni`);
});

test('önbellekte yoksa ağdan alınır; ağ da yoksa kabuk yedeği', async () => {
  const ag = { icerik: (u) => `${u}@ag` };
  const isci = isciYukle(ag);
  const ilk = await getir(isci, `${KOK}?tohum=a`, 'navigate');
  assert.equal(ilk.govde, `${KOK}@ag`);
  ag.kapali = true;
  const cevrimdisi = await getir(isci, `${KOK}?tohum=b`, 'navigate');
  assert.equal(cevrimdisi.govde, `${KOK}@ag`);
});
