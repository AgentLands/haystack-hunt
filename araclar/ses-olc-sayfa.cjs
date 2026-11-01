/**
 * Ses ölçümünün sayfa tarafı (ses-olc.cjs Chromium'a gönderir; işlevler kendi başlarına
 * yeterli olmalı). `yama`: sayfa yüklenmeden önce AudioContext'i OfflineAudioContext ile
 * değiştirir, saati ve rAF'i denetler. `calistir`: gerçek olayları (olaylar.js `yay`) kayıt
 * zamanlarında tetikler (suspend/resume ile), kaydı mono Float32 olarak base64 döndürür.
 */

/** Sayfadan önce çalışır. secenek: { sure (sn), ham (kategori/limiter yok) }. */
function yama(secenek) {
  const SR = 44100;
  window.__t = 0;
  performance.now = () => window.__t;
  window.requestAnimationFrame = () => 0; // oyun döngüsü kapalı: 'kare'yi biz yayarız
  window.AudioContext = function BaglamTaklidi() {
    const c = new OfflineAudioContext(1, Math.round(SR * secenek.sure), SR);
    Object.defineProperty(c, 'state', { get: () => 'running' });
    if (secenek.ham) { // ham mod: dinamik işlemciler geçirgen (tepe: kırpılmadan önceki toplam)
      const bos = () => ({ value: 0 });
      c.createDynamicsCompressor = () => Object.assign(c.createGain(),
        { threshold: bos(), knee: bos(), ratio: bos(), attack: bos(), release: bos() });
      c.createWaveShaper = () => Object.assign(c.createGain(), { curve: null, oversample: '' });
    }
    window.__ofc = c;
    return c;
  };
}

/**
 * Kayıt planını kurar ve işletir. girdi: { senaryo: 'dilimler' | 'toplu' | 'ani' | 'asiri' }
 * (asiri: ani senaryo, her olay 4 kez).
 * Dönüş: { dilimler: [{ad, kat, bas, son, pencere}], veri: base64, sr }.
 */
async function calistir(girdi) {
  const { yay } = await import('./js/olaylar.js');
  const { durumAl } = await import('./js/oyun.js');
  const { kulakBasamagi } = await import('./js/kural/sinyal.js');
  const { makineTanimi } = await import('./js/kural/makineler/kayit.js');
  const { SEVIYELER } = await import('./js/kural/araclar.js');
  const ctx = window.__ofc;
  const SR = ctx.sampleRate;
  const durum = durumAl();
  const igne = durum.tarla.igne;
  igne.z = 1e6; // iğne açıkta sayılsın: kulak basamakları uzaklıkla belirlensin
  const makine = (tur) => durum.makineler.find((m) => m.tur === tur);
  const nokta = (b) => { // kulak basamağı b'yi veren kazı noktası (uzak: menzil dışı)
    for (let d = 0; d <= 14; d += 0.25) {
      if (kulakBasamagi(durum.tarla, igne.x + d, igne.y) === b) return { x: igne.x + d, y: igne.y };
    }
    return { x: igne.x + 30, y: igne.y };
  };
  const plan = new Map();
  const an = (t, islev) => {
    const k = Math.max(1, Math.round((t * SR) / 128)) * 128 / SR;
    if (!plan.has(k)) plan.set(k, []);
    plan.get(k).push(islev);
  };
  const tekrar = (t0, adet, aralik, islev) => {
    for (let i = 0; i < adet; i++) an(t0 + i * aralik, () => islev(i));
  };
  const SONUC = { zorluk: 'normal', etiket: 'olcum', puan: 100, sureMs: 1000, cezaMs: 0 };
  // kulak yalnız: makine-calisti yolu kazı sesini çaldırmaz; kepçe noktası b'ye oturtulur
  const kepceNokta = (b) => {
    const n = nokta(b);
    const p0 = makineTanimi('traktor').isNoktasi({ x: 0, y: 0, yon: 0 });
    return { ...makine('traktor'), x: n.x - p0.x, y: n.y - p0.y, yon: 0 };
  };
  const dilimler = [];
  let imlec = 0.2;
  const dilim = (ad, kat, sure, kur, pencere) => {
    const t0 = imlec;
    kur(t0);
    dilimler.push({ ad, kat, bas: t0, son: t0 + sure, pencere: pencere ? pencere.map((p) => t0 + p)
      : [t0, t0 + sure] });
    imlec += sure;
  };
  const ol = (ad, veri) => () => yay(ad, veri);
  const seviye = (ad) => ({ seviye: SEVIYELER.find((v) => v.ad === ad) });
  const motor = (tur, hizOran, calisiyor) => (t0) => {
    const m = makine(tur);
    const ayar = () => {
      m.yakit = 100; m.hiz = hizOran * makineTanimi(tur).azamiHiz;
      m.calisiyor = calisiyor; m.takili = false; durum.karakter.makine = m;
    };
    an(t0, () => { ayar(); yay('kare', { zaman: 0, durum }); });
    an(t0 + 2.5, () => { ayar(); yay('kare', { zaman: 0, durum }); });
    an(t0 + 3.4, () => { durum.karakter.makine = null; yay('kare', { zaman: 0, durum }); });
  };
  const kazi2 = (b, adet, aralik) => (t0) => tekrar(t0, adet, aralik,
    () => yay('kazildi', { ...nokta(b), miktar: 6 }));

  if (girdi.senaryo === 'dilimler') {
    dilim('kazı tek', 'arac', 1, (t) => an(t, ol('kazildi', { ...nokta(0), miktar: 8 })));
    dilim('kazı sürekli 12/sn', 'arac', 3.2, kazi2(0, 36, 0.083), [0.4, 3]);
    dilim('tırmık', 'arac', 1, (t) => an(t, ol('tirmiklandi', { x: 1, y: 1, dx: 1, dy: 0 })));
    dilim('adım toprak', 'arac', 1, (t) => an(t, ol('karakter-adim', { x: 1, y: 1, z: 0 })));
    dilim('adım saman z=40', 'arac', 1, (t) => an(t, ol('karakter-adim', { x: 1, y: 1, z: 40 })));
    dilim('yürüyüş saman 4/sn', 'arac', 3, (t) => tekrar(t, 12, 0.25,
      () => yay('karakter-adim', { x: 1, y: 1, z: 40 })));
    for (const ad of ['Soğuk', 'Ilık', 'Sıcak', 'Yanıyor!']) {
      dilim(`dedektör ${ad}`, 'ipucu', 1.5, (t) => an(t, ol('dedektor', seviye(ad))));
    }
    dilim('dedektör boş', 'ipucu', 1, (t) => an(t, ol('dedektor-bos', {})));
    dilim('parıltı', 'ipucu', 1.6, (t) => an(t, ol('parilti', {})));
    dilim('iğne göründü', 'ipucu', 1.4, (t) => an(t, ol('igne-gorundu', {})));
    dilim('bulundu', 'ipucu', 1.5, (t) => an(t, ol('bulundu', { sonuc: SONUC })));
    dilim('pes edildi', 'ipucu', 1.5, (t) => an(t, ol('pes-edildi', { durum })));
    dilim('buluntu tink', 'ipucu', 1, (t) => an(t, ol('buluntu-gorundu', { tur: 'dugme' })));
    for (const [tur, ad] of [['dugme', 'yaygın'], ['kurus', 'seyrek'], ['oyuncak', 'nadir'],
      ['yuzuk', 'çok nadir']]) {
      dilim(`buluntu zil ${ad}`, 'ipucu', 1.2, (t) => an(t, ol('buluntu-alindi', { tur })));
    }
    for (const b of [1, 2, 3]) {
      dilim(`kazı+kulak basamak ${b}`, 'ipucu', 3.2, kazi2(b, 36, 0.083), [0.4, 3]);
    }
    for (const b of [1, 2, 3]) {
      dilim(`kulak yalnız basamak ${b}`, 'ipucu', 3.2, (t) => tekrar(t, 36, 0.083,
        () => yay('makine-calisti', { makine: kepceNokta(b), miktar: 5 })), [0.4, 3]);
    }
    for (const tur of ['fare', 'serce', 'kurbaga', 'kirpi', 'kedi']) {
      dilim(`hayvan ${tur}`, 'ortam', 1.2, (t) => an(t, ol('hayvan-kacti', { tur, x: 3, y: 7 })));
    }
    for (const tur of ['traktor', 'balya', 'ufleyici']) {
      dilim(`marş ${tur}`, 'makine', 1.3, (t) => an(t, ol('makine-bin', { makine: makine(tur) })));
    }
    const m0 = makine('traktor');
    dilim('makine takıldı', 'makine', 1.2, (t) => an(t, ol('makine-takildi', { makine: m0 })));
    dilim('yakıt bitti', 'makine', 1.3, (t) => an(t, ol('yakit-bitti', { makine: m0 })));
    dilim('kepçe doldu', 'makine', 1, (t) => an(t, ol('kepce-doldu', { makine: m0 })));
    dilim('kepçe boşaldı', 'makine', 1.6,
      (t) => an(t, ol('kepce-bosaltildi', { makine: m0, miktar: 3000 })));
    dilim('iğne tıkı', 'makine', 0.8, (t) => an(t, ol('igne-kepcede', {})));
    dilim('balya bırakıldı', 'makine', 1, (t) => an(t, ol('balya-birakildi', {})));
    dilim('balya açıldı', 'makine', 1.3, (t) => an(t, ol('balya-acildi', {})));
    dilim('araç seçildi tık', 'arayuz', 0.8, (t) => an(t, ol('arac-secildi', { arac: 'el' })));
    for (const tur of ['traktor', 'balya', 'ufleyici']) {
      dilim(`motor ${tur} rölanti`, 'makine', 3.7, motor(tur, 0, false), [1.8, 3.4]);
      dilim(`motor ${tur} tam gaz`, 'makine', 3.7, motor(tur, 1, false), [1.8, 3.4]);
      dilim(`motor ${tur} çalışıyor`, 'makine', 3.7, motor(tur, 0.6, true), [1.8, 3.4]);
    }
  } else {
    // Birlikte çalma: traktör çalışırken kazı + kulak, kepçe, hayvan, zil, bulundu...
    const hepsi = girdi.senaryo === 'ani' || girdi.senaryo === 'asiri';
    const T = (s) => (hepsi ? 4 : s);
    const adlar = { asiri: 'aşırı yığılma (x4)', ani: 'ani yığılma' };
    const ad = adlar[girdi.senaryo] || 'toplu senaryo';
    dilim(ad, 'karma', hepsi ? 6 : 10, (t0) => {
      motor('traktor', 1, true)(t0);
      tekrar(t0 + T(2.5), hepsi ? 8 : 40, 0.083, () => yay('kazildi',
        { ...nokta(3), miktar: 30 }));
      an(t0 + T(2), ol('kepce-bosaltildi', { makine: makine('traktor'), miktar: 4000 }));
      an(t0 + T(3), ol('hayvan-kacti', { tur: 'kedi', x: 3, y: 7 }));
      an(t0 + T(3.1), ol('hayvan-kacti', { tur: 'fare', x: 4, y: 7 }));
      an(t0 + T(3.4), ol('buluntu-alindi', { tur: 'yuzuk' }));
      an(t0 + T(3.5), ol('dedektor', seviye('Yanıyor!')));
      an(t0 + T(3.6), ol('kepce-doldu', { makine: makine('traktor') }));
      an(t0 + T(3.7), ol('bulundu', { sonuc: SONUC }));
      an(t0 + T(3.7), ol('parilti', {}));
      an(t0 + T(3.7), ol('igne-gorundu', {}));
      an(t0 + T(3.7), ol('balya-birakildi', {}));
      if (hepsi) an(t0 + T(3.7), ol('balya-acildi', {}));
    });
  }

  const zamanlar = [...plan.keys()].sort((a, b) => a - b);
  for (const t of zamanlar) {
    ctx.suspend(t).then(() => {
      window.__t = t * 1000;
      const kat = girdi.senaryo === 'asiri' ? 4 : 1;
      for (let k = 0; k < kat; k++) for (const islev of plan.get(t)) islev();
      ctx.resume();
    });
  }
  const tampon = await ctx.startRendering();
  const bayt = new Uint8Array(tampon.getChannelData(0).buffer.slice(0));
  let metin = '';
  for (let i = 0; i < bayt.length; i += 0x8000) {
    metin += String.fromCharCode.apply(null, bayt.subarray(i, i + 0x8000));
  }
  return { dilimler, veri: btoa(metin), sr: SR };
}

module.exports = { yama, calistir };
