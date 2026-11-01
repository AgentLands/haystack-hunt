/**
 * Toplama ailesi (parcalar/toplama.js) ve saman.js toplama eki: huni ağzı (parça dışı 2×1
 * karo, çıkışın karşısı), tutam türü (harman: saman + 1/8 toz, çayır: yaş ot), harman
 * tüketim sayacı, bir tikte bir eşya, tampon doluyken almama, güç oranı; tırmık kolu
 * (halkadan yığma noktasına, taşma 40, nesne sürükleme); taş toplayıcı (60 tik, en yakın
 * açık nesne); söküm iadesi (iğne/buluntu envantere).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esyaKodu } from '../js/kural/ciftlik/esya.js';
import { parcaSok } from '../js/kural/ciftlik/komut.js';
import { karoIndeks } from '../js/kural/ciftlik/olcu.js';
import { HUNI, TIRMIK, TAS_TOPLAYICI } from '../js/kural/ciftlik/parcalar/toplama.js';
import { agizKarolari } from '../js/kural/ciftlik/dunya/ogretici.js';
import { dunyaHazirla, ZEMIN } from '../js/kural/ciftlik/dunya/zemin.js';
import { dunya, duzTarla, kur } from './ciftlik-yardim.mjs';
import { elleCtx, elleSur } from './ciftlik-dunya-yardim.mjs';

const W = 240;
const SAMAN = esyaKodu('saman');
const TOZ = esyaKodu('toz');
const YAS = esyaKodu('yas-ot');
const IGNE = esyaKodu('igne');
const CIVI = esyaKodu('civi');
const toplam = (h) => h.reduce((s, v) => s + v, 0);

test('huni ağzı çıkışın karşısındaki 2×1 karo; döndürmeyle döner', () => {
  const { c, tarla } = dunya(1, duzTarla(0));
  const h0 = kur(c, tarla, 'huni', 20, 20, 0);
  assert.deepEqual(agizKarolari(h0), [[19, 20], [19, 21]], 'yon 0: çıkış doğu, ağız batı');
  assert.equal(h0.cikis[0].yon, 0);
  const h1 = kur(c, tarla, 'huni', 30, 20, 1);
  assert.deepEqual(agizKarolari(h1), [[30, 19], [31, 19]], 'yon 1: çıkış güney, ağız kuzey');
  assert.deepEqual(h0.tanim.etki(h0).agiz, agizKarolari(h0));
});

test('huni yalnız ağızdan alır, tam güçte 1 kat/tik, şebekesizde 512 → 1 kat/2 tik', () => {
  const tarla = duzTarla(6);
  const { c } = dunya(2, tarla);
  const p = kur(c, tarla, 'huni', 20, 20, 0);
  const once = Uint16Array.from(tarla.h);
  elleSur(elleCtx(c, tarla, 1024), p, 24);
  const degisen = [];
  for (let i = 0; i < tarla.h.length; i++) if (tarla.h[i] !== once[i]) degisen.push(i);
  for (const i of degisen) {
    const x = i % W;
    const y = (i / W) | 0;
    assert.ok(x >= 38 && x < 40 && y >= 40 && y < 44, `ağız dışı hücre ${x},${y}`);
  }
  assert.equal(toplam(once) - toplam(tarla.h), 24);
  assert.equal(p.ozel.cikis.length + p.ozel.birikim / 12, 2, '24 kat = 2 tutam');
  assert.equal(c.tuketilenKat, 24, 'harman tüketimi sayılır');
  const yavas = dunya(2, duzTarla(6));
  const q = kur(yavas.c, yavas.tarla, 'huni', 20, 20, 0);
  elleSur(elleCtx(yavas.c, yavas.tarla, HUNI.gucsuzOran), q, 24);
  assert.equal(yavas.c.tuketilenKat, 12);
});

test('tutam türü: harmanda saman ve ≈ 1/8 toz; çayırda yaş ot (tüketim sayılmaz)', () => {
  const agizDolu = () => {
    const t = duzTarla(0);
    for (const y of [40, 41, 42, 43]) for (const x of [38, 39]) t.h[y * W + x] = 60000;
    return t;
  };
  const t2 = agizDolu();
  const d2 = dunya(3, t2);
  const p2 = kur(d2.c, t2, 'huni', 20, 20, 0);
  const ctx2 = elleCtx(d2.c, t2, 1024);
  const sayac = { [SAMAN]: 0, [TOZ]: 0 };
  for (let i = 0; i < 12 * 800; i++) {
    elleSur(ctx2, p2, 1);
    while (p2.ozel.cikis.length) sayac[p2.ozel.cikis.shift()] += 1;
  }
  assert.equal(sayac[SAMAN] + sayac[TOZ], 800);
  assert.ok(Math.abs(sayac[TOZ] - 100) <= 30, `toz ${sayac[TOZ]} (≈ 100)`);

  const t3 = agizDolu();
  const d3 = dunya(4, t3);
  const a = dunyaHazirla(d3.c);
  a.zemin[karoIndeks(19, 20)] = ZEMIN.CAYIR;
  a.zemin[karoIndeks(19, 21)] = ZEMIN.CAYIR;
  const p3 = kur(d3.c, t3, 'huni', 20, 20, 0);
  const ctx3 = elleCtx(d3.c, t3, 1024);
  const turler = new Set();
  for (let i = 0; i < 12 * 50; i++) {
    elleSur(ctx3, p3, 1);
    while (p3.ozel.cikis.length) turler.add(p3.ozel.cikis.shift());
  }
  assert.deepEqual([...turler], [YAS]);
  assert.equal(d3.c.tuketilenKat, 0, 'çayırdan alınan harman tüketimi değil');
});

test('huni: açıktaki gömülü ağızda eşya olur, bir tikte bir; tampon doluyken almaz', () => {
  const tarla = duzTarla(0);
  for (const y of [40, 41]) for (const x of [38, 39]) tarla.h[y * W + x] = 30;
  const g = (esya, x, y, z) => ({ esya, x, y, z, aci: 0, alindi: false });
  const gomulu = [g(IGNE, 38, 40, 30), g(CIVI, 39, 40, 30), g(CIVI, 39, 41, 10),
    g(IGNE, 30, 40, 0)];
  const { c } = dunya(5, tarla, { gomulu });
  const p = kur(c, tarla, 'huni', 20, 20, 0);
  const ctx = elleCtx(c, tarla, 1024);
  elleSur(ctx, p, 1);
  assert.deepEqual(p.ozel.cikis, [IGNE], 'bir tikte bir nesne');
  elleSur(ctx, p, 1);
  assert.deepEqual(p.ozel.cikis, [IGNE, CIVI]);
  assert.equal(gomulu[2].alindi, false, 'örtülü (h > z) çıkmaz');
  assert.equal(gomulu[3].alindi, false, 'ağız dışı çıkmaz');
  const cikti = ctx.olaylar.filter((o) => o.ad === 'gomulu-cikti');
  assert.deepEqual(cikti.map((o) => o.veri.nesne), [gomulu[0], gomulu[1]]);
  assert.equal(cikti[0].veri.parca, p);
  elleSur(ctx, p, 40);
  assert.equal(p.ozel.cikis.length, HUNI.tampon);
  const kalan = toplam(tarla.h);
  elleSur(ctx, p, 50);
  assert.equal(toplam(tarla.h), kalan, 'tampon doluyken tarladan almaz');
  assert.equal(p.tanim.durum(p), 'cikis-dolu');
  assert.match(p.tanim.incele(p)[0][1], /Çıkış dolu/);
});

test('söküm: tampondaki iğne/çivi ve biriken saman iade edilir', () => {
  const tarla = duzTarla(0);
  const { c } = dunya(6, tarla);
  for (const ad of ['huni', 'tas-toplayici']) {
    const p = kur(c, tarla, ad, 20, 20, 0);
    p.ozel.cikis.push(IGNE, esyaKodu('buluntu:dugme'));
    const iade = parcaSok(c, tarla, p);
    assert.deepEqual(iade.esya, [[IGNE, 1], [esyaKodu('buluntu:dugme'), 1]], ad);
  }
  assert.equal(c.envanter[IGNE], 2);
});

test('tırmık kolu: halkadan yığma karosuna 2 kat/tik, korunur, 40 katta durur', () => {
  const tarla = duzTarla(5);
  const { c } = dunya(7, tarla);
  const p = kur(c, tarla, 'tirmik-kolu', 30, 30, 0);
  const dok = [62, 63].flatMap((x) => [60, 61].map((y) => y * W + x));
  const once = toplam(tarla.h);
  const dokBas = dok.reduce((s, i) => s + tarla.h[i], 0);
  const ctx = elleCtx(c, tarla, 1024);
  elleSur(ctx, p, 10);
  assert.equal(toplam(tarla.h), once, 'korunum');
  assert.equal(dok.reduce((s, i) => s + tarla.h[i], 0), dokBas + 20, '10 tikte 20 kat');
  assert.equal(p.tanim.durum(p), 'calisiyor');
  elleSur(ctx, p, 200);
  assert.ok(dok.some((i) => tarla.h[i] >= TIRMIK.tasma));
  const tasmis = toplam(tarla.h.slice(0));
  const dokToplam = dok.reduce((s, i) => s + tarla.h[i], 0);
  elleSur(ctx, p, 50);
  assert.equal(dok.reduce((s, i) => s + tarla.h[i], 0), dokToplam, 'taşınca durur');
  assert.equal(toplam(tarla.h), tasmis);
  assert.equal(p.tanim.durum(p), 'cikis-dolu');
  const yavas = dunya(7, duzTarla(5));
  const q = kur(yavas.c, yavas.tarla, 'tirmik-kolu', 30, 30, 0);
  q.oran = 0; // şebekesiz (enerji aşaması yazar)
  const h0 = [...yavas.tarla.h];
  elleSur(elleCtx(yavas.c, yavas.tarla, 0), q, 20);
  assert.deepEqual([...yavas.tarla.h], h0, 'güçsüz (oran 0) çalışmaz');
  assert.equal(q.tanim.durum(q), 'guc-yok', 'halkada saman var: talep sürer, rozet güç yok');
});

test('tırmık kolu açıktaki nesneyi her 20 tikte bir hücre yığma karosuna sürükler', () => {
  const tarla = duzTarla(0);
  const g = { esya: CIVI, x: 65, y: 59, z: 0, aci: 0, alindi: false };
  const { c } = dunya(8, tarla, { gomulu: [g] });
  const p = kur(c, tarla, 'tirmik-kolu', 30, 30, 0);
  const ctx = elleCtx(c, tarla, 1024);
  elleSur(ctx, p, 20);
  assert.deepEqual([g.x, g.y], [64, 59], 'tik 0: uzak eksende (x) bir hücre');
  elleSur(ctx, p, 1);
  assert.deepEqual([g.x, g.y], [63, 59], 'tik 20');
  elleSur(ctx, p, 200);
  assert.deepEqual([g.x, g.y], [63, 60], 'yığma karosuna (62-63, 60-61) varınca durur');
});

test('taş toplayıcı: 60 tikte bir, menzildeki en yakın AÇIK nesne; örtülü/uzak değil', () => {
  const tarla = duzTarla(0);
  tarla.h[44 * W + 44] = 5;
  const g = (esya, x, y, z) => ({ esya, x, y, z, aci: 0, alindi: false });
  const yakin = g(CIVI, 46, 40, 0);
  const ortulu = g(IGNE, 44, 44, 2);
  const uzak = g(IGNE, 70, 40, 0);
  const ikinci = g(esyaKodu('tas'), 36, 40, 0);
  const { c } = dunya(9, tarla, { gomulu: [uzak, ortulu, ikinci, yakin] });
  const p = kur(c, tarla, 'tas-toplayici', 20, 20, 0);
  const ctx = elleCtx(c, tarla, 1024);
  elleSur(ctx, p, TAS_TOPLAYICI.aralik - 1);
  assert.equal(p.ozel.cikis.length, 0);
  elleSur(ctx, p, 1);
  assert.deepEqual(p.ozel.cikis, [CIVI], 'en yakın');
  elleSur(ctx, p, TAS_TOPLAYICI.aralik);
  assert.deepEqual(p.ozel.cikis, [CIVI, esyaKodu('tas')]);
  elleSur(ctx, p, 3 * TAS_TOPLAYICI.aralik);
  assert.equal(ortulu.alindi || uzak.alindi, false);
  assert.equal(p.tanim.durum(p), 'girdi-yok');
  assert.equal(ctx.olaylar.filter((o) => o.ad === 'gomulu-cikti').length, 2);
});
