/**
 * HUD: tuvalin kenarına iğnelenmiş kâğıt etiketler (süre, kaldırılan saman, tarla numarası),
 * alet rafındaki hak noktaları (dedektör, mıknatıs) ve makineye binince rafın yerini alan
 * makine kartı (ad, yakıt ve yük şeridi, in ipucu). Yalnız 'kare' ve 'oyun-basladi'
 * olaylarını okur; çekirdeğe dokunmaz. DOM'a yalnız değer değişince yazar.
 */
import { dinle } from './olaylar.js';
import { gununEtiketi } from './kural/rastgele.js';
import { zorlukAl } from './kural/zorluk.js';
import { makineTanimi } from './kural/makineler/kayit.js';

const $ = (id) => document.getElementById(id);
export const sayi = new Intl.NumberFormat('tr-TR');
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos',
  'Eylül', 'Ekim', 'Kasım', 'Aralık'];
/** Makine türüne göre yük şeridinin adı; listede olmayan makinede yük şeridi gizlenir. */
const YUK_ADI = { traktor: 'Kepçe', balya: 'Hazne' };
const YAKIT_AZ = 0.25;

export function sureMetni(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Lot numarası gibi: "Tarla No. DENEME · Normal" ya da "Günün tarlası · 31 Ekim · Zor". */
export function etiketMetni(etiket, zorluk) {
  const ad = zorlukAl(zorluk).ad;
  const tarih = /^(\d{4})-(\d{2})-(\d{2})$/.exec(etiket);
  if (etiket === gununEtiketi() && tarih) {
    return `Günün tarlası · ${Number(tarih[3])} ${AYLAR[Number(tarih[2]) - 1]} · ${ad}`;
  }
  return `Tarla No. ${etiket} · ${ad}`;
}

/** Değer değişince yazan küçük önbellek: aynı değer için DOM'a dokunmaz. */
function yazici(yaz) {
  let onceki;
  return (deger) => {
    if (deger === onceki) return;
    onceki = deger;
    yaz(deger);
  };
}

/** Hak noktaları: kalan dolu, harcanan üstü çizili boş nokta. */
function noktaYazici(kap) {
  return yazici((anahtar) => {
    const [kalan, toplam] = anahtar.split('/').map(Number);
    const noktalar = [];
    for (let i = 0; i < toplam; i++) {
      const n = document.createElement('i');
      n.className = i < kalan ? 'hak-nokta' : 'hak-nokta harcandi';
      noktalar.push(n);
    }
    kap.replaceChildren(...noktalar);
  });
}

function seritYazici(oge) {
  return yazici((yuzde) => {
    oge.style.setProperty('--dolu', `${yuzde}%`);
    oge.classList.toggle('az', yuzde < YAKIT_AZ * 100);
  });
}

function makineKartiKur() {
  const kart = $('makine-karti');
  const raf = kart.closest('.araclar');
  const yakit = seritYazici($('makine-yakit'));
  const yuk = seritYazici($('makine-yuk'));
  const kimlik = yazici((anahtar) => {
    const [tur, dokunmatik] = anahtar.split('|');
    raf.classList.toggle('binik', tur !== '');
    kart.hidden = tur === '';
    if (!tur) return;
    const tanim = makineTanimi(tur);
    $('makine-ad').textContent = tanim.ad;
    $('makine-yuk-serit').hidden = !YUK_ADI[tur];
    $('makine-yuk-ad').textContent = YUK_ADI[tur] ?? '';
    const eylem = tanim.giyilir ? 'bırak' : 'in';
    $('makine-ipucu').textContent = dokunmatik === '1' ? `Bin/İn: ${eylem}` : `E: ${eylem}`;
  });
  return (m) => {
    const dokunmatik = document.body.classList.contains('dokunmatik') ? '1' : '0';
    kimlik(m ? `${m.tur}|${dokunmatik}` : '|');
    if (!m) return;
    yakit(Math.round(Math.max(0, Math.min(1, m.yakit)) * 100));
    yuk(Math.round(Math.max(0, Math.min(1, m.yuk ?? 0)) * 100));
  };
}

export function hudKur() {
  const sure = yazici((m) => { $('sure').textContent = m; });
  const saman = yazici((metin) => { $('kaldirilan').textContent = metin; });
  const dedektorSayi = yazici((n) => { $('dedektor-hak').textContent = n; });
  const dedektor = noktaYazici($('dedektor-noktalar'));
  const miknatis = noktaYazici($('miknatis-noktalar'));
  const makine = makineKartiKur();

  dinle('oyun-basladi', ({ durum }) => {
    $('etiket').textContent = etiketMetni(durum.etiket, durum.zorluk);
  });
  dinle('kare', ({ zaman, durum }) => {
    const gecen = durum.baslangic === null ? 0 : (durum.bitis ?? zaman) - durum.baslangic;
    sure(sureMetni(gecen));
    saman(sayi.format(durum.tarla.kaldirilan));
    dedektorSayi(durum.dedektor);
    dedektor(`${durum.dedektor}/${durum.dedektorHakki}`);
    miknatis(`${durum.miknatis}/${durum.miknatisHakki}`);
    makine(durum.karakter?.makine ?? null);
  });
}
