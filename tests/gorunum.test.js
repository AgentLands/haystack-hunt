/** Kamera dönüşüm matematiğinin (js/kural/gorunum.js) birim testleri. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  varsayilan, sinirla, odakla, kaydir, merkezle, gorunurAlan,
  ekrandanDunyaya, ekrandanHucre, dunyadanEkrana, takipEt, YAKIN_EN_AZ, YAKIN_EN_COK,
  ekranaGoreYakinlik, TAKIP_REFERANS_EN, tabanAlan, oranDegistir, zTavan,
} from '../js/kural/gorunum.js';
import { GENISLIK, YUKSEKLIK } from '../js/kural/boyut.js';

const yakin = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('varsayılan görünüm eski ekran→hücre çevirisiyle birebir aynı', () => {
  const g = varsayilan();
  assert.deepEqual(g, { z: 1, gx: 0, gy: 0 });
  for (const [fx, fy] of [[0, 0], [0.5, 0.5], [0.999, 0.999], [0.37, 0.81]]) {
    assert.deepEqual(ekrandanHucre(g, fx, fy),
      { x: Math.floor(fx * GENISLIK), y: Math.floor(fy * YUKSEKLIK) });
  }
});

test('sinirla: yakınlaştırma 1–6 arası, alan tarla içinde', () => {
  assert.equal(sinirla({ z: 0.2, gx: 50, gy: 50 }).z, YAKIN_EN_AZ);
  assert.equal(sinirla({ z: 99, gx: 0, gy: 0 }).z, YAKIN_EN_COK);
  assert.deepEqual(sinirla({ z: 1, gx: 30, gy: 30 }), { z: 1, gx: 0, gy: 0 });
  const g = sinirla({ z: 2, gx: 9999, gy: -5 });
  assert.equal(g.gx, GENISLIK / 2);
  assert.equal(g.gy, 0);
  assert.deepEqual(sinirla({ z: NaN, gx: 0, gy: 0 }), varsayilan());
});

test('odakla: imlecin altındaki tarla noktası sabit kalır', () => {
  let g = varsayilan();
  const fx = 0.6;
  const fy = 0.4;
  const once = ekrandanDunyaya(g, fx, fy);
  g = odakla(g, fx, fy, 3);
  yakin(g.z, 3);
  const sonra = ekrandanDunyaya(g, fx, fy);
  yakin(sonra.x, once.x);
  yakin(sonra.y, once.y);
  // ikinci adım, başka bir odak
  const once2 = ekrandanDunyaya(g, 0.2, 0.7);
  g = odakla(g, 0.2, 0.7, 5);
  const sonra2 = ekrandanDunyaya(g, 0.2, 0.7);
  yakin(sonra2.x, once2.x);
  yakin(sonra2.y, once2.y);
});

test('odakla: köşede yakınlaştırınca kenetlenir, sınırı aşmaz', () => {
  const g = odakla(varsayilan(), 0, 0, 4);
  assert.deepEqual(g, { z: 4, gx: 0, gy: 0 });
  const h = odakla(varsayilan(), 1, 1, 4);
  yakin(h.gx, GENISLIK - GENISLIK / 4);
  yakin(h.gy, YUKSEKLIK - YUKSEKLIK / 4);
});

test('uzaklaştırınca görünüm sığdırılmış hâle döner', () => {
  const g = odakla(odakla(varsayilan(), 0.9, 0.9, 5), 0.5, 0.5, 1);
  assert.deepEqual(g, varsayilan());
});

test('kaydir: parmakla aynı yönde, kenetli', () => {
  const g0 = odakla(varsayilan(), 0.5, 0.5, 2);
  const g1 = kaydir(g0, 0.1, 0);
  yakin(g1.gx, g0.gx - (0.1 * GENISLIK) / 2);
  assert.deepEqual(kaydir(varsayilan(), 0.3, 0.3), varsayilan());
  assert.equal(kaydir(g0, 5, 5).gx, 0);
  assert.equal(kaydir(g0, -5, -5).gx, GENISLIK / 2);
});

test('merkezle ve gorunurAlan', () => {
  const g = merkezle({ z: 4, gx: 0, gy: 0 }, 120, 80);
  const a = gorunurAlan(g);
  yakin(a.x + a.en / 2, 120);
  yakin(a.y + a.boy / 2, 80);
  yakin(a.en, GENISLIK / 4);
  const k = merkezle({ z: 4, gx: 0, gy: 0 }, 0, 0);
  assert.equal(k.gx, 0);
  assert.equal(k.gy, 0);
});

test('ekrandanDunyaya ve dunyadanEkrana birbirinin tersi', () => {
  const g = { z: 3.3, gx: 40, gy: 25 };
  const d = ekrandanDunyaya(g, 0.25, 0.75);
  const e = dunyadanEkrana(g, d.x, d.y);
  yakin(e.fx, 0.25);
  yakin(e.fy, 0.75);
});

test('yakın görünümde hücre bulma görünür alana göre', () => {
  const g = odakla(varsayilan(), 0.5, 0.5, 4);
  const c = ekrandanHucre(g, 0.5, 0.5);
  assert.equal(c.x, Math.floor(GENISLIK / 2));
  assert.equal(c.y, Math.floor(YUKSEKLIK / 2));
});

test('takipEt: oran 1 hedefi ortalar, küçük oran yumuşak yaklaşır, sınırda kenetlenir', () => {
  const g = varsayilan();
  const tam = takipEt(g, 120, 80, 2.5, 1);
  assert.deepEqual(tam, merkezle({ z: 2.5, gx: 0, gy: 0 }, 120, 80));
  const yari = takipEt(g, 120, 80, 2.5, 0.5);
  yakin(yari.z, 1.75);
  assert.ok(yari.gx > 0 && yari.gx < tam.gx);
  let h = g;
  for (let i = 0; i < 200; i++) h = takipEt(h, 120, 80, 2.5, 0.1);
  yakin(h.z, 2.5, 1e-6);
  yakin(h.gx, tam.gx, 1e-6);
  const kose = takipEt(g, 0, 0, 3, 1);
  assert.equal(kose.gx, 0);
  assert.equal(kose.gy, 0);
  assert.deepEqual(takipEt(tam, 120, 80, 2.5, 0), tam);
});

test('ekranaGoreYakinlik: dar tuvalde artar (en çok 6), genişte taban kalır', () => {
  assert.equal(ekranaGoreYakinlik(3.5, TAKIP_REFERANS_EN), 3.5);
  assert.equal(ekranaGoreYakinlik(3.5, 1900), 3.5);
  yakin(ekranaGoreYakinlik(3.5, 700), (3.5 * TAKIP_REFERANS_EN) / 700);
  assert.equal(ekranaGoreYakinlik(3.5, 358), YAKIN_EN_COK);
  assert.equal(ekranaGoreYakinlik(3.5, 0), 3.5);
  assert.equal(ekranaGoreYakinlik(3.5, NaN), 3.5);
});

test('tabanAlan: kutu oranına göre tarlayı içine alan alan (3:2 varsayılan)', () => {
  assert.deepEqual(tabanAlan(varsayilan()), { en: GENISLIK, boy: YUKSEKLIK });
  assert.deepEqual(tabanAlan({ ...varsayilan(), oran: 0.75 }),
    { en: GENISLIK, boy: GENISLIK / 0.75 });
  assert.deepEqual(tabanAlan({ ...varsayilan(), oran: 3 }), { en: YUKSEKLIK * 3, boy: YUKSEKLIK });
  assert.deepEqual(tabanAlan({ ...varsayilan(), oran: NaN }), { en: GENISLIK, boy: YUKSEKLIK });
});

test('dikey kutu: z = 1 tarlayı ortalar, yakında görünür alan tarla içinde ve tam dolu', () => {
  const g = sinirla({ z: 1, gx: 50, gy: 50, oran: 0.75 });
  assert.equal(g.oran, 0.75);
  assert.equal(g.gx, 0);
  yakin(g.gy, (YUKSEKLIK - GENISLIK / 0.75) / 2);
  const orta = ekrandanDunyaya(g, 0.5, 0.5);
  yakin(orta.x, GENISLIK / 2);
  yakin(orta.y, YUKSEKLIK / 2);
  // Tek ölçek: görünür alanın oranı kutunun oranı (dünya çarpılmaz).
  const a = gorunurAlan(sinirla({ z: 4, gx: 0, gy: 0, oran: 0.75 }));
  yakin(a.en / a.boy, 0.75);
  const kose = takipEt(g, 0, 0, 4, 1);
  assert.equal(kose.gx, 0);
  assert.equal(kose.gy, 0);
  const uc = takipEt(g, GENISLIK, YUKSEKLIK, 4, 1);
  const b = gorunurAlan(uc);
  yakin(b.x + b.en, GENISLIK);
  yakin(b.y + b.boy, YUKSEKLIK);
});

test('geniş kutu: z = 1 yanlarda boşluk; dönüşümler birbirinin tersi', () => {
  const g = sinirla({ z: 1, gx: 0, gy: 0, oran: 2.2 });
  yakin(g.gx, (GENISLIK - YUKSEKLIK * 2.2) / 2);
  assert.equal(g.gy, 0);
  const z = odakla(g, 0.3, 0.6, 2.5);
  assert.equal(z.oran, 2.2);
  const once = ekrandanDunyaya(g, 0.3, 0.6);
  const sonra = ekrandanDunyaya(z, 0.3, 0.6);
  yakin(once.x, sonra.x);
  yakin(once.y, sonra.y);
  const e = dunyadanEkrana(z, sonra.x, sonra.y);
  yakin(e.fx, 0.3);
  yakin(e.fy, 0.6);
  assert.equal(kaydir(z, 0.1, 0).oran, 2.2);
});

test('oranDegistir: görünür alanın merkezi aynı kalır', () => {
  const g = merkezle({ z: 4, gx: 0, gy: 0 }, 100, 70);
  const d = oranDegistir(g, 0.7);
  assert.equal(d.oran, 0.7);
  const a = gorunurAlan(d);
  yakin(a.x + a.en / 2, 100);
  yakin(a.y + a.boy / 2, 70);
  assert.deepEqual(oranDegistir(d, 1.5).z, 4);
});

test('çiftlik payları: ust üst kenarın ötesine, zCok 6 üstüne izin verir; yoksa değişmez', () => {
  const normal = sinirla({ z: 6, gx: 20, gy: -50, oran: 0.54 });
  assert.equal(normal.gy, 0, 'pay yoksa üst kenarda kenetli');
  assert.equal(normal.ust, undefined, 'pay yoksa sonuca eklenmez');
  assert.equal(zTavan({ z: 1 }), YAKIN_EN_COK);
  assert.equal(sinirla({ z: 9, gx: 0, gy: 0 }).z, YAKIN_EN_COK, 'normal tarla 6 ile sınırlı');
  const g = sinirla({ z: 6, gx: 20, gy: -50, oran: 0.54, ust: 0.14 });
  const a = gorunurAlan(g);
  yakin(g.gy, -0.14 * a.boy);
  assert.equal(g.ust, 0.14, 'pay sonuca taşınır');
  const yakinG = sinirla({ z: 9, gx: 0, gy: 0, zCok: 9 });
  assert.equal(yakinG.z, 9);
  assert.equal(zTavan(yakinG), 9);
  assert.equal(sinirla({ z: 99, gx: 0, gy: 0, zCok: 9 }).z, 9, 'tavan zCok');
  assert.equal(odakla({ z: 5, gx: 0, gy: 0, zCok: 9 }, 0.5, 0.5, 8).z, 8);
  assert.equal(odakla({ z: 5, gx: 0, gy: 0 }, 0.5, 0.5, 8).z, YAKIN_EN_COK);
  const d = oranDegistir({ ...g, z: 6 }, 0.9);
  assert.equal(d.ust, 0.14, 'oran değişince pay korunur');
  assert.equal(d.oran, 0.9, 'yeni oran eskinin üstüne yazılır');
  assert.equal(takipEt({ z: 6, gx: 0, gy: 0, zCok: 9 }, 100, 80, 9, 1).z, 9);
});

test('çiftlik payı: tarlanın üst satırı şeridin altına kaydırılabilir (ekran oranı)', () => {
  const g = sinirla({ z: 9, gx: 40, gy: -100, oran: 0.89, ust: 0.14, zCok: 9 });
  const a = gorunurAlan(g);
  // görünür boyun %14'ü boş pay: tarlanın 0. satırı ekranda tam %14 aşağıdadır
  yakin(dunyadanEkrana(g, 40, 0).fy, 0.14);
  assert.ok(a.y < 0);
});
