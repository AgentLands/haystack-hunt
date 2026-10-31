/**
 * Bot (tarayıcı tarafı): "🤖 Botu izle" düğmesi ve ?demo=1 modu. Beyni ve sürücüyü
 * (bot-surucu.js, saf mantık) kare olayına bağlar; komutları oyunun gerçek eylemlerine
 * (aracSec, bas, surukle, birak) çevirir. Kullanıcı tuvale dokunursa ya da aracı elle
 * değiştirirse bot durur. Demo modunda iğneyi bulunca 3 sn sonra yeni tarlada sürer.
 */
import { dinle } from '../olaylar.js';
import { durumAl, yeniOyun, aracSec, bas, surukle, birak, rastgeleEtiket } from '../oyun.js';
import { dugmeEkle, bildir } from '../arayuz.js';
import { botKur } from './bot-surucu.js';

const DEMO_BEKLEME_MS = 3000;
/** Demoda bir tarlada bu süreyi aşan bot pes edip yeni tarlaya geçer. */
const DEMO_TARLA_SINIRI_MS = 150000;
const KARE_VARSAYILAN = 1 / 60;

const demo = new URLSearchParams(location.search).get('demo') === '1';
let calisiyor = false;
let bot = null;
let sonZaman = null;
let botAraci = false;
let yeniTarla = false;
let dugme = null;

function botuKur() {
  const durum = durumAl();
  bot = botKur({ h0: durum.tarla.h.slice() });
  sonZaman = null;
  for (const h of durum.halkalar) bot.olay('dedektor', h);
  if (durum.gorundu) bot.olay('igne-gorundu', durum.tarla.igne);
}

function etiketiYenile() {
  if (!dugme) return;
  dugme.textContent = calisiyor ? '⏹ Botu durdur' : '🤖 Botu izle';
  dugme.setAttribute('aria-pressed', String(calisiyor));
}

function baslat() {
  const durum = durumAl();
  if (!durum || durum.bitti) {
    bildir('Önce yeni bir tarla aç, sonra botu izle.');
    return;
  }
  calisiyor = true;
  botuKur();
  etiketiYenile();
  bildir('Bot oynuyor. Durdurmak için tuvale dokun.');
}

function durdur() {
  if (!calisiyor) return;
  calisiyor = false;
  bot = null;
  const durum = durumAl();
  if (durum && durum.basili) birak();
  etiketiYenile();
}

function uygula(komut, zaman) {
  if (komut.t === 'arac') {
    botAraci = true;
    aracSec(komut.arac);
    botAraci = false;
  } else if (komut.t === 'bas') bas({ x: komut.x, y: komut.y }, zaman);
  else if (komut.t === 'surukle') surukle({ x: komut.x, y: komut.y });
  else if (komut.t === 'birak') birak();
}

function kare({ zaman, durum }) {
  if (!calisiyor || !bot || durum.bitti) return;
  if (demo && durum.baslangic !== null && zaman - durum.baslangic > DEMO_TARLA_SINIRI_MS) {
    yeniOyun(rastgeleEtiket());
    return;
  }
  const dt = sonZaman === null ? KARE_VARSAYILAN : (zaman - sonZaman) / 1000;
  sonZaman = zaman;
  const komutlar = bot.kare({ h: durum.tarla.h, dedektor: durum.dedektor, bitti: false }, dt);
  for (const k of komutlar) uygula(k, zaman);
}

dugme = dugmeEkle('alt', {
  metin: '🤖 Botu izle',
  baslik: 'Bot bu tarlayı senin yerine oynar (tekrar bas: durdur)',
  tikla: () => (calisiyor ? durdur() : baslat()),
});
document.getElementById('tarla').addEventListener('pointerdown', durdur, true);

dinle('oyun-basladi', () => {
  yeniTarla = true;
  if (calisiyor) botuKur();
});
for (const ad of ['dedektor', 'parilti', 'igne-gorundu']) {
  dinle(ad, (veri) => { if (calisiyor && bot) bot.olay(ad, veri); });
}
dinle('arac-secildi', () => {
  if (yeniTarla) yeniTarla = false; // yeniOyun kendi 'arac-secildi' olayını da yayar
  else if (calisiyor && !botAraci && bot) durdur();
});
dinle('pes-edildi', durdur);
dinle('bulundu', () => {
  if (!demo || !calisiyor) {
    durdur();
    return;
  }
  setTimeout(() => { if (calisiyor) yeniOyun(rastgeleEtiket()); }, DEMO_BEKLEME_MS);
});
dinle('kare', kare);

if (demo) {
  calisiyor = true; // ilk 'oyun-basladi' botu kurar
  etiketiYenile();
}
