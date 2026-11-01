/**
 * Menüdeki Çiftlik bölümü (menu.js'e dokunmadan, menu-kanca.js üzerinden): "Çiftliğe devam"
 * (kayıt yoksa "Çiftlik kur", çiftlikteyken "Çiftliğe dön"), onaylı "Yeni çiftlik" (şimdiki
 * kayıt Yedek yuvasına geçer) ve açılır "Kayıt yuvaları": Son kayıt ve Yedek (yükle),
 * Dışa aktar (dosya ve pano), İçe aktar (dosya). Çiftlikteyken zorluk, rahat mod ve pes satırı
 * gizlidir (ciftlik.css). Bölüm menü her açıldığında tazelenir (modSatırı kancası).
 */
import { bildir } from '../../arayuz.js';
import { durumAl } from '../../oyun.js';
import { menuAnaEkle, menuModSatiriEkle } from '../menu-kanca.js';
import { menuKapat } from '../menu.js';
import { yeniTarlaIzni } from '../koruma.js';
import { ciftlikAc, yeniCiftlik, ciftlikYukle } from './ciftlik.js';
import { yuvalar, dosyayaAktar, panoyaAktar, dosyadanOku } from './kayit-yuva.js';
import { dunyaKodla } from '../../kural/ciftlik/sakla.js';
import { yap, dugme } from './yap.js';
import { stilYukle } from '../pencere.js';

stilYukle('./ciftlik/menu-bag.css');

const blok = yap('fieldset', 'menu-ciftlik-blok');
blok.append(yap('legend', 'menu-ciftlik-baslik', 'Çiftlik'));
const satir = yap('div', 'menu-ciftlik-satir');
const devam = dugme('dugme-ikincil menu-ciftlik', 'Çiftlik kur',
  'Kendi çiftliğini kur: huni, bant, sandık');
const yeni = dugme('dugme-ikincil menu-ciftlik-yeni', 'Yeni çiftlik',
  'Sıfırdan yeni bir çiftlik kur (şimdikini yedeğe alır)');
satir.append(devam, yeni);

const onay = yap('div', 'menu-ciftlik-onay');
onay.hidden = true;
onay.append(yap('p', '', 'Yeni bir çiftlik kurulur. Şimdiki çiftlik Yedek yuvasında kalır.'));
const onayDugmeleri = yap('div', 'menu-ciftlik-onay-dugmeler');
const onayVazgec = dugme('dugme-metin', 'Vazgeç', 'Vazgeç', () => { onay.hidden = true; });
const onayEvet = dugme('dugme-birincil', 'Evet, yeni çiftlik', 'Yeni çiftlik kur', () => {
  onay.hidden = true;
  yeniCiftlik();
});
onayDugmeleri.append(onayVazgec, onayEvet);
onay.append(onayDugmeleri);

const kayit = yap('details', 'menu-ciftlik-kayit');
kayit.append(yap('summary', '', 'Kayıt yuvaları'));
const yuvaListe = yap('ul', 'menu-ciftlik-yuvalar');
const araclar = yap('div', 'menu-ciftlik-araclar');
const dosyaSec = yap('input');
dosyaSec.type = 'file';
dosyaSec.accept = '.json,application/json';
dosyaSec.hidden = true;
const iceDugme = dugme('dugme-metin', 'İçe aktar', 'Dosyadan çiftlik kaydı yükle',
  () => dosyaSec.click());
const disaDugme = dugme('dugme-metin', 'Dışa aktar', 'Çiftliği dosya olarak indir', () => {
  const d = durumAl();
  if (d.mod !== 'ciftlik') return;
  dosyayaAktar(dunyaKodla(d.ciftlik, d.tarla, { etiket: d.etiket }));
  bildir('Çiftlik dosyası indirildi.');
});
const panoDugme = dugme('dugme-metin', 'Panoya kopyala', 'Çiftlik kaydını metin olarak kopyala',
  async () => {
    const d = durumAl();
    const veri = d.mod === 'ciftlik' ? dunyaKodla(d.ciftlik, d.tarla, { etiket: d.etiket })
      : yuvalar()[0]?.veri;
    if (!veri) return bildir('Kopyalanacak bir çiftlik yok.');
    bildir(await panoyaAktar(veri) ? 'Çiftlik kaydı panoya kopyalandı.' : 'Panoya yazılamadı.');
    return undefined;
  });
araclar.append(disaDugme, panoDugme, iceDugme, dosyaSec);
kayit.append(yuvaListe, araclar);
blok.append(satir, onay, kayit);

function yuvaSatiri(y) {
  const li = yap('li');
  li.append(yap('span', 'menu-yuva-ad', y.ad),
    yap('span', 'menu-yuva-bilgi sayi', `${y.dk} dk · ${y.parca} parça · ${y.kb} KB`),
    dugme('dugme-metin', 'Yükle', `${y.ad} yuvasını aç`, () => {
      if (ciftlikYukle(y.veri)) menuKapat();
      else bildir('Bu kayıt okunamadı.', 3000);
    }));
  return li;
}

function yenile(durum) {
  const ciftlikte = durum.mod === 'ciftlik';
  const liste = yuvalar();
  devam.hidden = ciftlikte; // çiftlikteyken "Çiftliğe dön" menünün üst satırında zaten var
  devam.textContent = liste.length ? 'Çiftliğe devam' : 'Çiftlik kur';
  yeni.hidden = !ciftlikte && liste.length === 0;
  onay.hidden = true;
  yuvaListe.replaceChildren(...(liste.length ? liste.map(yuvaSatiri)
    : [yap('li', 'menu-yuva-bos', 'Henüz kayıt yok. Çiftliği kurunca burada görünür.')]));
  disaDugme.hidden = !ciftlikte;
  panoDugme.hidden = !ciftlikte && liste.length === 0;
}

devam.addEventListener('click', () => {
  if (durumAl()?.mod === 'ciftlik') menuKapat();
  else if (yeniTarlaIzni()) ciftlikAc();
});
yeni.addEventListener('click', () => {
  if (yeniTarlaIzni()) onay.hidden = false;
});
dosyaSec.addEventListener('change', async () => {
  const dosya = dosyaSec.files[0];
  dosyaSec.value = '';
  if (!dosya || !yeniTarlaIzni()) return;
  try {
    if (ciftlikYukle(await dosyadanOku(dosya))) {
      menuKapat();
      bildir('Çiftlik dosyadan yüklendi.');
    } else {
      bildir('Bu dosyadaki çiftlik açılamadı.', 3500);
    }
  } catch (hata) {
    console.error('Çiftlik dosyası okunamadı:', hata);
    bildir(`Dosya okunamadı: ${hata.message}`, 3500);
  }
});

menuAnaEkle(blok);
menuModSatiriEkle((d) => {
  yenile(d);
  return d.mod === 'ciftlik'
    ? { metin: 'Çiftliğin açık. Menü açıkken bantlar durur.', don: 'Çiftliğe dön' } : null;
});
