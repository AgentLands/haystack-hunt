/**
 * Makine bildirimleri: binme/inme, takılma, yakıt (azaldı, bitti, garaj ikmali), kepçe
 * dolu/boşaltıldı, kepçeye takılan iğne/çivi ve balya açılması için kısa bildirimler
 * (arayuz.js bildir). Yalnız olay dinler.
 * Balyaya giren iğne bilerek bildirilmez (igne-yutuldu yalnız ses/efekt içindir).
 */
import { dinle } from '../olaylar.js';
import { bildir } from '../arayuz.js';
import { makineTanimi } from '../kural/makineler/kayit.js';

const ad = (m) => makineTanimi(m.tur).ad;

dinle('makine-bin', ({ makine }) => bildir(makineTanimi(makine.tur).giyilir
  ? `${ad(makine)} takıldı: WASD yürü, Boşluk üfle, E bırak`
  : `${ad(makine)}: W/S gaz, A/D dön, Boşluk çalıştır, E in`, 3200));
dinle('makine-in', ({ makine }) => bildir(makineTanimi(makine.tur).giyilir
  ? `${ad(makine)} yere bırakıldı` : `${ad(makine)} makinesinden indin`));
dinle('makine-yok', () => bildir('Yakında binecek makine yok (garaja git)'));
dinle('makine-takildi', () => bildir('Takıldın: saman çok dik. Geri çık (S) ya da kepçeyle kaz.'));
dinle('yakit-bitti', ({ makine }) => bildir(`${ad(makine)} yakıtı bitti! İn (E), yürü.`, 3200));
dinle('yakit-ikmal', ({ makine }) => bildir(`${ad(makine)}: garajda depo dolduruldu (tek sefer).`,
  3000));
dinle('kepce-doldu', () => bildir('Kepçe dolu: tarla kenarına götür, Boşlukla boşalt.', 3000));
dinle('kepce-bosaltildi', ({ igne, civi }) => {
  if (igne) bildir('İğne kepçeden yere düştü! İn ve elle al.', 3600);
  else if (civi) bildir('Kepçeden paslı çivi döküldü. Dikkat, elle alma!', 3000);
});
dinle('igne-kepcede', () => bildir('Kepçede bir şey parladı… iğne kepçede! Kenarda boşalt.',
  3600));
dinle('civi-kepcede', () => bildir('Kepçeye paslı bir çivi takıldı.'));
dinle('balya-acildi', () => bildir('Balya açıldı'));

// İlk balyada bir kez: balyanın nasıl açıldığını söyle.
let balyaIpucu = false;
dinle('oyun-basladi', () => { balyaIpucu = false; });
dinle('balya-birakildi', () => {
  if (balyaIpucu) return;
  balyaIpucu = true;
  bildir('Balya bırakıldı. Açmak için in, El ile balyaya dön, Boşluğu basılı tut.', 3600);
});

// Yakıt %25'in altına inince bir kez: garaj ikmali hakkı duruyorsa hatırlat.
const YAKIT_UYARI = 0.25;
const uyarilan = new Set();
dinle('oyun-basladi', () => uyarilan.clear());
dinle('kare', ({ durum }) => {
  const m = durum.karakter.makine;
  if (!m || m.yakit > YAKIT_UYARI || m.yakit <= 0 || uyarilan.has(m.id)) return;
  uyarilan.add(m.id);
  bildir(m.ikmalHakki > 0
    ? `Yakıt azaldı: ${ad(m)} garajdaki yerine dönüp dur, depo bir kez dolar.`
    : `Yakıt azaldı, ikmal hakkın kullanıldı.`, 3600);
});
