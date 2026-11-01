/**
 * Makine bildirimleri: binme/inme, takılma, yakıt, kepçe dolu/boşaltıldı, kepçeye takılan
 * iğne/çivi ve balya açılması için kısa bildirimler (arayuz.js bildir). Yalnız olay dinler.
 * Balyaya giren iğne bilerek bildirilmez (igne-yutuldu yalnız ses/efekt içindir).
 * Metin girdiye göredir: parmakla (pointer: coarse) "Bin/İn", "Kullan", "kol"; klavyede
 * "E", "Boşluk", "W/S".
 */
import { dinle } from '../olaylar.js';
import { bildir } from '../arayuz.js';
import { makineTanimi } from '../kural/makineler/kayit.js';

const ad = (m) => makineTanimi(m.tur).ad;
/** Belirtme hâli: iyelik ekiyle biten ad (-ı/-i/-u/-ü) n ve aynı ünlüyü alır. */
const adi = (m) => ad(m).replace(/([ıiuü])$/, '$1n$1');
const kaba = window.matchMedia('(pointer: coarse)');

/** Klavye ya da dokunmatik metni (her bildirimde yeniden bakılır: cihaz değişebilir). */
const m = (klavye, dokunmatik) => (kaba.matches ? dokunmatik : klavye);

dinle('makine-bin', ({ makine }) => bildir(makineTanimi(makine.tur).giyilir
  ? m(`${adi(makine)} taktın: WASD yürü, Boşluk üfle, E bırak`,
    `${adi(makine)} taktın: kolla yürü, Kullan üfler, Bin/İn bırakır`)
  : m(`${ad(makine)}: W/S gaz, A/D dön, Boşluk çalıştır, E in`,
    `${ad(makine)}: kolla sür, Kullan çalıştırır, Bin/İn ile in`), 3200));
dinle('makine-in', ({ makine }) => bildir(makineTanimi(makine.tur).giyilir
  ? `${ad(makine)} yere bırakıldı.` : `${ad(makine)} üstünden indin.`));
dinle('makine-yok', () => bildir('Yakınlarda binilecek makine yok. Garaja git.'));
dinle('makine-takildi', () => bildir(m(
  'Takıldın: saman çok dik. Geri çık (S) ya da kepçeyle kaz.',
  'Takıldın: saman çok dik. Kolla geri çek ya da kepçeyle kaz.')));
dinle('yakit-bitti', ({ makine }) => bildir(m(`${ad(makine)} yakıtı bitti! İn (E), yürü.`,
  `${ad(makine)} yakıtı bitti! Bin/İn ile in, yürü.`), 3200));
dinle('kepce-doldu', () => bildir(m('Kepçe dolu: tarla kenarına götür, Boşlukla boşalt.',
  'Kepçe dolu: tarla kenarına götür, Kullan ile boşalt.'), 3000));
dinle('kepce-bosaltildi', ({ igne, civi }) => {
  if (igne) bildir('İğne kepçeden yere düştü! İn ve elle al.', 3600);
  else if (civi) bildir('Kepçeden paslı çivi döküldü. Dikkat, elle alma!', 3000);
});
dinle('igne-kepcede', () => bildir('Kepçede bir şey parladı! Kenarda boşalt.', 3600));
dinle('civi-kepcede', () => bildir('Kepçeye paslı bir çivi takıldı.'));
dinle('balya-acildi', () => bildir('Balya açıldı.'));

// İlk balyada bir kez: balyanın nasıl açıldığını söyle.
let balyaIpucu = false;
dinle('oyun-basladi', () => { balyaIpucu = false; });
dinle('balya-birakildi', () => {
  if (balyaIpucu) return;
  balyaIpucu = true;
  bildir(m('Balya bırakıldı. Açmak için in, El ile balyaya dön, Boşluğu basılı tut.',
    'Balya bırakıldı. Açmak için in, El ile balyaya dön, Kullan\'ı basılı tut.'), 3600);
});
