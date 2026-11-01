/**
 * İnceleme panelinin metinleri (DOM yok): durum kodundan "neden duruyor" cümlesi (çıkışı
 * dolu parçada çıkışın nereye gittiği de söylenir), sorun rozetleri (yalnız sorun varken;
 * şekil işareti + kısa ad: renk körlüğünde de ayırt edilir) ve girdi/çıktı kapı satırları.
 * Durum kodları: MIMARI §5 + sistemler.md §7.
 */
import { parcaAt } from '../../kural/ciftlik/izgara.js';
import { YON_ADI } from '../../kural/ciftlik/olcu.js';

/** Sorun rozetleri: durum → "işaret ad". Çalışan/boşta parçada rozet yok (sessizlik = iyi). */
export const ROZET = {
  'guc-yok': '⚡ güç yok', 'guc-az': '⚡ güç az', 'girdi-yok': '◌ girdi yok', ac: '◌ aç',
  'cikis-dolu': '■ çıkış dolu', dolu: '■ dolu', tikali: '! tıkalı', sikisti: '! sıkıştı',
  kirik: '✕ kırık', doymus: '◍ doydu', sivali: '◍ sıvalı', nemli: '◇ nemli',
  yabanci: '? yabancı', hava: '☁ hava', 'yakit-yok': '◇ yakıt yok', kapali: '▮▮ kapalı',
  essiz: '○ eşsiz', ayar: '? ayar',
};

const CUMLE = {
  calisiyor: 'Çalışıyor.',
  bos: 'Boşta: işleyecek bir şey gelmiyor.',
  'girdi-yok': 'Girdi yok: kapısına bir şey gelmiyor.',
  ac: 'Aç: ağzına saman gelmiyor ya da girdisi boş.',
  'guc-yok': 'Güç yok: bir şebekeye bağlı değil ya da üretim yetmiyor.',
  'guc-az': 'Güç az: şebeke talebin yarısını bile vermiyor, yavaş çalışıyor.',
  dolu: 'Dolu: içi taştı; boşalt ya da bir kol bağla.',
  tikali: 'Tıkandı: içinde sert bir cisim (paslı çivi) var; Temizle.',
  sikisti: 'Sıkıştı: kalıpta sert bir cisim var; Temizle.',
  kirik: 'Kırık: Onar.',
  doymus: 'Mıknatıs doydu: tutucusu boşalınca yeniden çeker.',
  sivali: 'Kalbur sıvandı: tozu dökülünce açılır.',
  nemli: 'Nemli ot kabul edilmiyor: önce kurut.',
  yabanci: 'Kabul etmediği bir eşya kapıda bekliyor.',
  hava: 'Hava bekliyor (rüzgâr ya da yağmur).',
  'yakit-yok': 'Yakıt yok: balya ya da kıyım ver.',
  kapali: 'Kapalı: sinyal kapattı.',
  essiz: 'Eşi yok: karşı ucu kurulmalı.',
  ayar: 'Ayar eksik: bir filtre seç.',
};

/** Çıkış hedefi açıklaması (cikisHedef: hat / port / null). */
function hedefMetni(p, i) {
  const h = p.cikisHedef?.[i];
  if (!h) return 'boşa bakıyor';
  if (h.tur === 'hat') return 'banda veriyor';
  return `${h.parca?.tanim?.ad ?? 'parçaya'} veriyor`;
}

/** "Neden duruyor" cümlesi. */
export function nedenCumlesi(p, durum) {
  if (durum === 'cikis-dolu') {
    if (!p.cikis.length) return 'Çıkış dolu.';
    const bos = p.cikis.findIndex((_, i) => !p.cikisHedef?.[i]);
    if (bos >= 0) return 'Çıkış dolu: kapısı boşa bakıyor; önüne bir bant ya da depo koy.';
    return `Çıkış dolu: alıcı tarafı tıkalı (${hedefMetni(p, 0)}, ama almıyor).`;
  }
  return CUMLE[durum] ?? `Durum: ${durum}.`;
}

/** Kapının komşusunda ne var: parça adı ya da "boş". */
function komsuAdi(c, port) {
  return parcaAt(c, port.hx, port.hy)?.tanim.ad ?? 'boş';
}

/** Girdi / çıktı satırları: [[etiket, değer]]. */
export function kapiSatirlari(p, c) {
  const satirlar = [];
  const yer = (port) => YON_ADI[port.yon];
  if (p.giris.length) {
    satirlar.push(['Girdi', p.giris.map((g) => `${yer(g)}: ${komsuAdi(c, g)}`)
      .join(' · ')]);
  }
  if (p.cikis.length) {
    satirlar.push(['Çıktı', p.cikis.map((k, i) => `${yer(k)}: ${hedefMetni(p, i)}`)
      .join(' · ')]);
  }
  if (p.tanim.hat) satirlar.push(['Yön', YON_ADI[p.yon]]);
  return satirlar;
}
