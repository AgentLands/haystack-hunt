/**
 * Çiftlik kayıt yuvaları (menüdeki "Kayıtlar" bölümü için): Son kayıt ve Yedek yuvalarının
 * özeti (oyun dakikası, parça sayısı, boyut), kaydı dosyaya (.json) ve panoya dışa aktarma,
 * dosyadan içe aktarma. Kayıt biçimi sakla.js'in dunyaKodla çıktısıdır; geçerli olup
 * olmadığını yükleme (dunyaCoz) söyler, bozuk dosya süren çiftliği değiştirmez.
 */
import { kayitlariOku, ANAHTAR } from './depo.js';
import { TIK_MS } from '../../kural/ciftlik/olcu.js';

const YUVA_AD = { [ANAHTAR]: 'Son kayıt' };

/** Kaydın kısa özeti: { kaynak, ad, dk, parca, kb, veri }. */
export function yuvaOzeti({ kaynak, veri }) {
  return {
    kaynak, ad: YUVA_AD[kaynak] ?? 'Yedek', veri,
    dk: Math.floor(((veri.tik ?? 0) * TIK_MS) / 60000),
    parca: Array.isArray(veri.parcalar) ? veri.parcalar.length : 0,
    kb: Math.max(1, Math.round(JSON.stringify(veri).length / 1024)),
  };
}

/** Okunabilen yuvalar (en çok iki: son kayıt, yedek). */
export const yuvalar = () => kayitlariOku().map(yuvaOzeti);

/** Kaydı .json dosyası olarak indirir. */
export function dosyayaAktar(veri) {
  const gun = new Date().toISOString().slice(0, 10);
  const baglanti = document.createElement('a');
  const dosya = new Blob([JSON.stringify(veri)], { type: 'application/json' });
  baglanti.href = URL.createObjectURL(dosya);
  baglanti.download = `ciftlik-${gun}.json`;
  document.body.append(baglanti);
  baglanti.click();
  baglanti.remove();
  setTimeout(() => URL.revokeObjectURL(baglanti.href), 4000);
}

/** Kaydı panoya metin olarak yazar; başarıyı döndürür. */
export async function panoyaAktar(veri) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(veri));
    return true;
  } catch (hata) {
    console.error('Çiftlik kaydı panoya yazılamadı:', hata);
    return false;
  }
}

/** Seçilen dosyayı okuyup JSON'a çevirir; bozuksa hata fırlatır (çağıran bildirir). */
export async function dosyadanOku(dosya) {
  const metin = await dosya.text();
  const veri = JSON.parse(metin);
  if (!veri || typeof veri !== 'object' || !Array.isArray(veri.parcalar)) {
    throw new Error('Bu dosya bir çiftlik kaydına benzemiyor.');
  }
  return veri;
}
