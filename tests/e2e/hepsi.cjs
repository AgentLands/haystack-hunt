/**
 * Uçtan uca senaryoların hepsini çalıştırır (`npm run e2e`): her senaryo ayrı süreçte, kendi
 * sunucu ve tarayıcısıyla; varsayılan 3 paralel. Çıktı senaryo bitince topluca yazılır. Bilinen
 * hatalar (bilinen.cjs) çıkış kodunu bozmaz. Duman testi ayrıdır (`npm run duman`); --duman ile
 * en sona eklenir.
 *   node tests/e2e/hepsi.cjs [--paralel N] [--yavas N] [--duman] [senaryo adları...]
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const SENARYOLAR = ['acilis', 'buluntu', 'meydan', 'rahat', 'dokunmatik', 'ikmal', 'pes',
  'cevrimdisi', 'ekranlar', 'ciftlik', 'ciftlik-insa', 'ciftlik-insa-tel', 'ciftlik-hud',
  'ciftlik-koruma', 'ciftlik-kayit', 'ciftlik-telefon', 'ciftlik-ogretici'];

function bayrakDegeri(ad) {
  const i = process.argv.indexOf(`--${ad}`);
  return i > 0 ? process.argv[i + 1] : null;
}

function calistir(ad) {
  const bayraklar = [];
  if (bayrakDegeri('yavas')) bayraklar.push('--yavas', bayrakDegeri('yavas'));
  return new Promise((coz) => {
    const bas = Date.now();
    const cocuk = spawn(process.execPath, [path.join(__dirname, `${ad}.cjs`), ...bayraklar]);
    let cikti = '';
    cocuk.stdout.on('data', (d) => { cikti += d; });
    cocuk.stderr.on('data', (d) => { cikti += d; });
    cocuk.on('close', (kod) => {
      console.log(`--- ${ad} (${((Date.now() - bas) / 1000).toFixed(1)} sn)\n${cikti.trim()}`);
      coz({ ad, kod });
    });
  });
}

(async () => {
  const istenen = process.argv.slice(2).filter((a, i, d) => SENARYOLAR.includes(a)
    && !['--paralel', '--yavas'].includes(d[i - 1]));
  const liste = istenen.length ? istenen : [...SENARYOLAR];
  if (process.argv.includes('--duman')) liste.push('duman');
  const paralel = Number(bayrakDegeri('paralel') || 3);
  const sira = [...liste];
  const sonuclar = [];
  const isci = async () => {
    while (sira.length) sonuclar.push(await calistir(sira.shift()));
  };
  await Promise.all(Array.from({ length: Math.min(paralel, liste.length) }, isci));
  const kotu = sonuclar.filter((s) => s.kod !== 0).map((s) => s.ad);
  console.log(kotu.length ? `\nE2E BAŞARISIZ: ${kotu.join(', ')}`
    : `\nE2E GEÇTİ (${sonuclar.length} senaryo)`);
  process.exit(kotu.length ? 1 : 0);
})();
