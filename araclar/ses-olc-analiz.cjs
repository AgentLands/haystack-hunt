/**
 * Ses ölçümü için sinyal analizi (bağımlılıksız): tepe, RMS, K-ağırlıklı yaklaşık LUFS
 * (BS.1770 süzgeçleri, kapılamasız), aktif süre, spektral merkez ve 4 kHz üstü enerji payı.
 * ses-olc.cjs bu işlevleri Chromium'dan gelen OfflineAudioContext örneklerine uygular.
 */
const dB = (v) => (v > 1e-9 ? 20 * Math.log10(v) : -180);

/** Doğrudan biçim I çift ikinci derece süzgeç (a0 = 1 varsayılır). */
function biquad(x, b, a) {
  const y = new Float32Array(x.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

/** BS.1770 K-ağırlıklandırma: yüksek raf + 38 Hz yüksek geçiren. */
function kAgirlikla(x, sr) {
  let K = Math.tan((Math.PI * 1681.974450955533) / sr);
  const Q1 = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q1 + K * K;
  const raf = biquad(x, [(Vh + (Vb * K) / Q1 + K * K) / a0, (2 * (K * K - Vh)) / a0,
    (Vh - (Vb * K) / Q1 + K * K) / a0], [(2 * (K * K - 1)) / a0, (1 - K / Q1 + K * K) / a0]);
  K = Math.tan((Math.PI * 38.13547087602444) / sr);
  const Q2 = 0.5003270373238773;
  a0 = 1 + K / Q2 + K * K;
  return biquad(raf, [1, -2, 1], [(2 * (K * K - 1)) / a0, (1 - K / Q2 + K * K) / a0]);
}

function ortKare(x, a, b) {
  let t = 0;
  for (let i = a; i < b; i++) t += x[i] * x[i];
  return b > a ? t / (b - a) : 0;
}

const lufs = (ortalamaKare) => -0.691 + 10 * Math.log10(Math.max(ortalamaKare, 1e-18));

/** Radix-2 FFT (yerinde); re, im uzunluğu 2'nin kuvveti. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const aci = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(aci * k); const s = Math.sin(aci * k);
        const u = i + k; const v = u + len / 2;
        const tr = re[v] * c - im[v] * s; const ti = re[v] * s + im[v] * c;
        re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti;
      }
    }
  }
}

/** Aktif bölgenin ortalama güç tayfından merkez (Hz) ve 4 kHz üstü pay (0..1). */
function tayf(x, sr, a, b) {
  const N = 4096;
  const guc = new Float64Array(N / 2);
  let pencere = 0;
  for (let bas = a; bas + N <= Math.max(b, a + N) && bas + N <= x.length; bas += N / 2) {
    const re = new Float64Array(N); const im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[bas + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 0; k < N / 2; k++) guc[k] += re[k] * re[k] + im[k] * im[k];
    pencere++;
  }
  let toplam = 0; let agirlikli = 0; let tiz = 0;
  for (let k = 1; k < N / 2; k++) {
    const f = (k * sr) / N;
    toplam += guc[k]; agirlikli += guc[k] * f;
    if (f >= 4000) tiz += guc[k];
  }
  if (!pencere || toplam <= 0) return { merkez: 0, tiz: 0 };
  return { merkez: agirlikli / toplam, tiz: tiz / toplam };
}

/**
 * Bir dilimi (x: tüm kayıt, [bas, son) örnek aralığı) özetler. pencere: analiz penceresi
 * (örnek); verilmezse dilimin tamamı. Dönüş: tepe/rms/lufs (dB), lufs400 (en gürültülü
 * 400 ms), sure (sn, -60 dBFS üstü aktif aralık), merkez (Hz), tiz (0..1).
 */
function dilimOlc(x, kx, sr, bas, son, pencere = [bas, son]) {
  let tepe = 0;
  for (let i = bas; i < son; i++) tepe = Math.max(tepe, Math.abs(x[i]));
  const blok = Math.round(sr * 0.01);
  let ilk = -1; let sonA = -1;
  for (let i = pencere[0]; i + blok <= pencere[1]; i += blok) {
    if (dB(Math.sqrt(ortKare(x, i, i + blok))) > -60) {
      if (ilk < 0) ilk = i;
      sonA = i + blok;
    }
  }
  if (ilk < 0) return { tepe: dB(tepe), rms: -180, lufs: -180, lufs400: -180, sure: 0,
    merkez: 0, tiz: 0 };
  const w = Math.round(sr * 0.4);
  let enCok = 0;
  for (let i = pencere[0]; i < pencere[1]; i += Math.round(sr * 0.1)) {
    enCok = Math.max(enCok, ortKare(kx, i, Math.min(pencere[1], i + w)) * ((Math.min(
      pencere[1], i + w) - i) / w));
  }
  const ty = tayf(x, sr, ilk, sonA);
  return {
    tepe: dB(tepe), rms: dB(Math.sqrt(ortKare(x, ilk, sonA))), lufs: lufs(ortKare(kx, ilk, sonA)),
    lufs400: lufs(enCok), sure: (sonA - ilk) / sr, merkez: ty.merkez, tiz: ty.tiz,
  };
}

module.exports = { kAgirlikla, tayf, dilimOlc };
