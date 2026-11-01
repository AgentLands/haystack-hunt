/**
 * İnceleme paneli (docs/ciftlik/arayuz.md §6): gez kipinde parçaya dokun/tıkla. Masaüstünde
 * sağda kâğıt fiş, telefonda alttan yarım sayfa (başlığa dokununca küçülür; parça tuvalin
 * üst yarısına kaydırılır). Satırlar: simge + ad + durum rozeti (yalnız sorun varken) +
 * "neden duruyor" cümlesi (durum kodundan ve çıkış hedefinden; tanımın incele(p) ilk satırı
 * 'Neden' ise o), girdi/çıktı kapılarının bağlandığı yer, içindekiler, tanımın incele(p)
 * satırları, ayarlar (kural/ciftlik/insa/ayar.js şeması: iki durumlu / seçim / filtre /
 * renk; her değişiklik geri alınabilir `ayar` komutu) ve eylemler: Döndür · Sök · Pipet ·
 * duruma göre Temizle / Onar / Boşalt (komut; geri alınmaz). Panel açıkken parça çerçeveli,
 * girdi/çıktı komşuları açılışta bir an çerçevelenir. Saniyede 4 kez tazelenir.
 */
import { dinle } from '../../olaylar.js';
import { durumAl } from '../../oyun.js';
import { katmanEkle } from '../../cizim.js';
import { gorunum, gorunumAyarla } from '../../gorunum.js';
import { kaydir, dunyadanEkrana } from '../../kural/gorunum.js';
import { KARO } from '../../kural/ciftlik/olcu.js';
import { parcaIcerigi, parcaDurumu } from '../../kural/ciftlik/parca-kayit.js';
import { komutEkle } from '../../kural/ciftlik/benzetim.js';
import { esyaTanimi } from '../../kural/ciftlik/esya.js';
import { parcaAt } from '../../kural/ciftlik/izgara.js';
import { dondurCifti } from '../../kural/ciftlik/insa/gecmis.js';
import { ayarSemalari, ayarOku, secenekler } from '../../kural/ciftlik/insa/ayar.js';
import { insa, insaEylem, pipetAl, kapaticiEkle, ciftlikte } from './insa.js';
import { sokIste } from './baloncuk.js';
import { simgeCiz } from './parca-simge.js';
import { takipBirak } from '../kamera-takip.js';
import { nedenCumlesi, kapiSatirlari, ROZET } from './panel-metin.js';
import { KARO_PX } from './gorsel/kayit.js';
import { ekranBirim } from '../../cizim/tuval-olcek.js';

const RENKLER = ['#b8452c', '#2f4a6d', '#e3b341', '#4e6b2f', '#6b3f7a', '#f4ead6'];
const panel = document.createElement('aside');
panel.className = 'ciftlik-panel kagit-pencere';
panel.setAttribute('aria-label', 'Parça incelemesi');
panel.hidden = true;
panel.innerHTML = `<header class="ciftlik-panel-baslik"><canvas class="ciftlik-simge"
  width="40" height="40" aria-hidden="true"></canvas><h2></h2><span class="ciftlik-rozet"
  hidden></span><button type="button" class="ciftlik-panel-kapat" aria-label="Paneli kapat"
  title="Kapat (Esc)">✕</button></header><p class="ciftlik-panel-neden"></p>
  <dl class="ciftlik-panel-satirlar"></dl><div class="ciftlik-panel-ayarlar"></div>
  <div class="ciftlik-panel-eylemler"></div>`;
document.querySelector('main').after(panel);
const $ = (s) => panel.querySelector(s);
let parlama = 0;
let sonAyarImza = '';

/** İncelenen parça (sökülmüşse null). */
function parca() {
  const d = durumAl();
  if (!ciftlikte() || insa.incelenen === null) return null;
  return d.ciftlik.parcalar.get(insa.incelenen) ?? null;
}

function dugme(metin, baslik, tikla, sinif = 'dugme-ikincil') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = sinif;
  b.textContent = metin;
  b.title = baslik;
  b.addEventListener('click', tikla);
  return b;
}

function ayarla(p, ad, deger) {
  const eski = ayarOku(p, ad);
  if (eski === deger) return;
  insaEylem(`${p.tanim.ad} ayarı`, [{
    yap: [{ tur: 'ayar', x: p.x, y: p.y, ad, deger }],
    geri: [{ tur: 'ayar', x: p.x, y: p.y, ad, deger: eski }],
  }]);
}

/** Ayar denetimleri (şema değişmedikçe yeniden kurulmaz: odak kaybolmasın). */
function ayarlariKur(p) {
  const kutu = $('.ciftlik-panel-ayarlar');
  const imza = `${p.id}:${ayarSemalari(p.tanim).map((s) => s.ad).join(',')}`;
  if (imza !== sonAyarImza) {
    sonAyarImza = imza;
    kutu.replaceChildren();
    for (const sema of ayarSemalari(p.tanim)) {
      const satir = document.createElement('div');
      satir.className = `ciftlik-ayar ciftlik-ayar-${sema.tur}`;
      satir.dataset.ad = sema.ad;
      const etiket = document.createElement('span');
      etiket.textContent = sema.etiket ?? sema.ad;
      satir.append(etiket);
      if (sema.tur === 'filtre') {
        const sec = document.createElement('select');
        sec.setAttribute('aria-label', etiket.textContent);
        for (const s of secenekler(p.tanim, sema)) sec.add(new Option(s.metin, String(s.deger)));
        sec.addEventListener('change', () => {
          const s = secenekler(p.tanim, sema).find((x) => String(x.deger) === sec.value);
          if (s) ayarla(parca() ?? p, sema.ad, s.deger);
        });
        satir.append(sec);
      } else {
        secenekler(p.tanim, sema).forEach((s, i) => {
          const b = dugme(sema.tur === 'renk' ? '' : s.metin, s.metin,
            () => ayarla(parca() ?? p, sema.ad, s.deger), 'ciftlik-ayar-secenek');
          if (sema.tur === 'renk') b.style.background = s.renk ?? RENKLER[i % RENKLER.length];
          b.setAttribute('aria-label', s.metin);
          b.dataset.deger = String(s.deger);
          satir.append(b);
        });
      }
      kutu.append(satir);
    }
  }
  for (const satir of kutu.children) {
    const deger = String(ayarOku(p, satir.dataset.ad));
    const sec = satir.querySelector('select');
    if (sec && document.activeElement !== sec) sec.value = deger;
    for (const b of satir.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(b.dataset.deger === deger));
    }
  }
}

function eylemleriKur(p, durum) {
  const kutu = $('.ciftlik-panel-eylemler');
  const d = durumAl();
  const komut = (tur) => () => komutEkle(d.ciftlik, { tur, x: p.x, y: p.y });
  const liste = [];
  if (p.tanim.yonlu) {
    liste.push(dugme('↻ Döndür', 'Döndür', () => insaEylem(`${p.tanim.ad} döndürme`,
      [dondurCifti(p, p.yon + 1)])));
  }
  liste.push(dugme('Pipet', 'Bu parçadan kur (Q)', () => pipetAl(p)));
  if (durum === 'tikali' || durum === 'sikisti') liste.push(dugme('Temizle', 'Temizle',
    komut('temizle'), 'dugme-birincil'));
  if (durum === 'kirik') liste.push(dugme('Onar', 'Onar', komut('onar'), 'dugme-birincil'));
  if (p.tanim.aile === 'depo' && parcaIcerigi(p).esya.length) {
    liste.push(dugme('Boşalt', 'Boşalt', komut('bosalt')));
  }
  liste.push(dugme('Sök', 'Sök (Delete)', () => sokIste([p]), 'dugme-metin tehlike'));
  const imza = liste.map((b) => b.textContent).join('|');
  if (kutu.dataset.imza !== imza) {
    kutu.dataset.imza = imza;
    kutu.replaceChildren(...liste);
  }
}

function satirlariKur(p) {
  const satirlar = [...kapiSatirlari(p, durumAl().ciftlik)];
  const icerik = parcaIcerigi(p).esya.filter(([, n]) => n > 0);
  if (icerik.length) {
    satirlar.push(['İçinde', icerik.map(([kod, n]) => `${esyaTanimi(kod)?.ad ?? kod} ×${n}`)
      .join(', ')]);
  }
  const ek = p.tanim.incele ? p.tanim.incele(p) : [];
  const ilk = ek[0] && /^neden$/i.test(String(ek[0][0])) ? 1 : 0;
  satirlar.push(...ek.slice(ilk));
  const dl = $('.ciftlik-panel-satirlar');
  dl.replaceChildren(...satirlar.map(([a, b]) => {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = a;
    dd.textContent = b;
    div.append(dt, dd);
    return div;
  }));
  return ilk ? String(ek[0][1]) : null;
}

/** Paneli parçanın şimdiki durumuyla tazeler. */
function tazele() {
  const p = parca();
  if (!p) {
    panelKapat();
    return;
  }
  const durum = parcaDurumu(p);
  const ozelNeden = satirlariKur(p);
  $('h2').textContent = p.tanim.ad;
  const rozet = $('.ciftlik-rozet');
  rozet.hidden = !ROZET[durum];
  rozet.textContent = ROZET[durum] ?? '';
  rozet.dataset.durum = durum;
  $('.ciftlik-panel-neden').textContent = ozelNeden ?? nedenCumlesi(p, durum);
  ayarlariKur(p);
  eylemleriKur(p, durum);
}

/** Parçayı panelde açar (telefonda parça tuvalin üst yarısına kaydırılır). */
export function panelAc(p) {
  insa.incelenen = p.id;
  sonAyarImza = '';
  panel.hidden = false;
  parlama = performance.now();
  simgeCiz($('.ciftlik-simge'), p.tanim.anahtar, p.yon);
  tazele();
  if (matchMedia('(max-width: 640px)').matches) {
    const e = dunyadanEkrana(gorunum, (p.x + p.en / 2) * KARO, (p.y + p.boy / 2) * KARO);
    if (e.fy > 0.45) {
      takipBirak();
      gorunumAyarla(kaydir(gorunum, 0, 0.3 - e.fy));
    }
  }
}

export function panelKapat() {
  if (panel.hidden && insa.incelenen === null) return false;
  panel.hidden = true;
  panel.classList.remove('kucuk');
  insa.incelenen = null;
  return true;
}

$('.ciftlik-panel-kapat').addEventListener('click', panelKapat);
$('.ciftlik-panel-baslik').addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  panel.classList.toggle('kucuk');
});
kapaticiEkle(panelKapat);
dinle('oyun-basladi', panelKapat);
dinle('parca-sokuldu', ({ parca: p }) => {
  if (p.id === insa.incelenen) panelKapat();
});
setInterval(() => {
  if (!panel.hidden) tazele();
}, 250);

/** Çerçeve: parça kutusu ya da tek karo (dünya pikseli). */
function cerceve(ctx, x, y, en, boy, renk, kalinlik) {
  ctx.strokeStyle = renk;
  ctx.lineWidth = kalinlik;
  ctx.strokeRect(x * KARO_PX, y * KARO_PX, en * KARO_PX, boy * KARO_PX);
}

katmanEkle((ctx, durum) => {
  const p = durum.mod === 'ciftlik' ? parca() : null;
  if (!p) return;
  const eb = ekranBirim(ctx);
  ctx.setLineDash([3 * eb, 2 * eb]);
  cerceve(ctx, p.x, p.y, p.en, p.boy, 'rgba(43, 33, 24, 0.95)', 2 * eb);
  ctx.setLineDash([]);
  const a = 1 - (performance.now() - parlama) / 1500;
  if (a <= 0) return;
  for (const port of [...p.giris, ...p.cikis]) {
    const q = parcaAt(durum.ciftlik, port.hx, port.hy);
    const renk = `rgba(227, 179, 65, ${a.toFixed(2)})`;
    if (q) cerceve(ctx, q.x, q.y, q.en, q.boy, renk, 2.5 * eb);
    else cerceve(ctx, port.hx, port.hy, 1, 1, renk, 2.5 * eb);
  }
}, 'ust');
