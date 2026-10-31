/**
 * Kod denetimi (CLAUDE.md kuralları), bağımlılıksız. js/, tests/, araclar/, dev/ ve varsa
 * sunucu/ altındaki .js/.mjs/.cjs dosyalarında şunları arar: satır ≤ 100 karakter (Unicode
 * kod noktası), kod dosyası ≤ 300 satır, test dosyası (*.test.js) ≤ 400 satır, modül belge
 * yorumu (dosya ilk anlamlı satırda belge yorumuyla başlamalı), js/kural/ içinde Math.random
 * ve boş catch.
 *   node araclar/denetim.mjs     bulgu varsa çıkış kodu 1, yoksa "DENETİM TEMİZ"
 * `denetle` ve `dosyaDenetle` birim testlerinde de kullanılır.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SATIR_TAVANI = 100;
export const KOD_TAVANI = 300;
export const TEST_TAVANI = 400;
const KLASORLER = ['js', 'tests', 'sunucu', 'araclar', 'dev'];
const UZANTILAR = new Set(['.js', '.mjs', '.cjs']);
const BOS_CATCH = /catch\s*(\([^)]*\))?\s*\{(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*\}/g;
const STRINGLER = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;

/** Dize içeriklerini boşluğa çevirir (uzunluk ve satırlar korunur); yalnız catch araması için. */
function stringleriBosalt(metin) {
  return metin.replace(STRINGLER, (m) => m.replace(/[^\n]/g, ' '));
}

/** Metni satırlara böler; dosya yeni satırla bitiyorsa sondaki boş parça sayılmaz. */
function satirlaraBol(metin) {
  const satirlar = metin.split(/\r?\n/);
  if (satirlar.at(-1) === '') satirlar.pop();
  return satirlar;
}

/** İlk anlamlı satır (shebang hariç) /** ile başlıyor ve yorum kapanıyor mu? */
function belgeYorumuVarMi(satirlar) {
  const i = satirlar.findIndex((s, k) => s.trim() !== '' && !(k === 0 && s.startsWith('#!')));
  if (i < 0 || !satirlar[i].trimStart().startsWith('/**')) return false;
  return satirlar.slice(i).join('\n').includes('*/');
}

function bulgu(dosya, satir, aciklama) {
  return { dosya, satir, aciklama };
}

/** Tek bir dosyanın metnini denetler. `dosya` proje köküne göre, `/` ayraçlı yoldur. */
export function dosyaDenetle(dosya, metin) {
  const satirlar = satirlaraBol(metin);
  const bulgular = [];
  if (!belgeYorumuVarMi(satirlar)) {
    bulgular.push(bulgu(dosya, 1, 'modül belge yorumu (/** … */) yok; dosya /** ile başlamalı'));
  }
  if (/\.test\.js$/.test(dosya)) {
    if (satirlar.length > TEST_TAVANI) {
      const ne = `test dosyası ${satirlar.length} satır (tavan ${TEST_TAVANI})`;
      bulgular.push(bulgu(dosya, 1, ne));
    }
  } else if (satirlar.length > KOD_TAVANI) {
    bulgular.push(bulgu(dosya, 1, `kod dosyası ${satirlar.length} satır (tavan ${KOD_TAVANI})`));
  }
  satirlar.forEach((s, k) => {
    const uzunluk = [...s].length;
    if (uzunluk > SATIR_TAVANI) {
      bulgular.push(bulgu(dosya, k + 1, `satır ${uzunluk} karakter (en çok ${SATIR_TAVANI})`));
    }
  });
  if (dosya.startsWith('js/kural/')) {
    satirlar.forEach((s, k) => {
      if (s.includes('Math.random')) {
        const ne = 'js/kural/ içinde Math.random yasak (rastgelelik üreteçten)';
        bulgular.push(bulgu(dosya, k + 1, ne));
      }
    });
  }
  const tam = satirlar.join('\n');
  for (const eslesme of stringleriBosalt(tam).matchAll(BOS_CATCH)) {
    const satir = tam.slice(0, eslesme.index).split('\n').length;
    bulgular.push(bulgu(dosya, satir, 'boş catch bloğu; hata sessizce yutuluyor'));
  }
  return bulgular.sort((a, b) => a.satir - b.satir);
}

/** Klasörü özyinelemeli tarar; .js/.mjs/.cjs dosyalarının mutlak yollarını sıralı verir. */
function dosyaListele(klasor) {
  const cikti = [];
  for (const giris of fs.readdirSync(klasor, { withFileTypes: true })) {
    const yol = path.join(klasor, giris.name);
    if (giris.isDirectory() && giris.name !== 'node_modules') {
      cikti.push(...dosyaListele(yol));
    } else if (giris.isFile() && UZANTILAR.has(path.extname(giris.name))) {
      cikti.push(yol);
    }
  }
  return cikti.sort();
}

/** Proje kökündeki js/, tests/, araclar/, dev/ ve varsa sunucu/ klasörlerini denetler. */
export function denetle(kok) {
  const bulgular = [];
  for (const klasor of KLASORLER) {
    const mutlak = path.join(kok, klasor);
    if (!fs.existsSync(mutlak)) continue;
    for (const dosya of dosyaListele(mutlak)) {
      const goreli = path.relative(kok, dosya).split(path.sep).join('/');
      bulgular.push(...dosyaDenetle(goreli, fs.readFileSync(dosya, 'utf8')));
    }
  }
  return bulgular;
}

/** Bulguyu "dosya:satır: açıklama" biçiminde yazar. */
export function bicimle(b) {
  return `${b.dosya}:${b.satir}: ${b.aciklama}`;
}

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dogrudan = process.argv[1] !== undefined
  && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (dogrudan) {
  const bulgular = denetle(KOK);
  for (const b of bulgular) console.log(bicimle(b));
  if (bulgular.length) {
    console.log(`${bulgular.length} bulgu`);
    process.exitCode = 1;
  } else {
    console.log('DENETİM TEMİZ');
  }
}
