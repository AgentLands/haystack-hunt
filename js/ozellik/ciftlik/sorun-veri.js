/**
 * Sorun listesi ve darboğaz verisi (saf; DOM yok): parçaların durum kodlarını (parcaDurumu)
 * oyuncuya anlaşılır "neden" cümlelerine çevirir, tıkananları toplar ve "en çok duran"
 * sıralaması için zamanla sönen bir ceza puanı tutar. Sessiz tıkanma yoktur: rozet kodu
 * (sistemler.md §7) bilinmiyorsa da satır görünür, nedeni kod adıdır.
 */
import { parcaDurumu } from '../../kural/ciftlik/parca-kayit.js';

/** Durum kodu → kısa neden cümlesi (arayuz.md §6 "neden cümlesi"). */
export const NEDEN = {
  'cikis-dolu': 'Çıkışı dolu: önündeki yol dolu ya da hiçbir yere varmıyor.',
  'guc-yok': 'Güç yok: şebekeye bağlı değil ya da hiç üretim yok.',
  'guc-az': 'Güç az: şebeke yetmiyor, yavaş çalışıyor.',
  tikali: 'Sıkıştı: içinde sert bir cisim var. Temizle.',
  sikisti: 'Sıkıştı: içinde sert bir cisim var. Temizle.',
  kirik: 'Çekiç kırıldı: onarmak gerekir.',
  doymus: 'Tutucu doldu: çivi geçiyor. Boşalt.',
  sivali: 'Kalbur yaş otla sıvandı: temizlenmeyi bekliyor.',
  nemli: 'Yaş ot geldi: nemli girdiyi kabul etmiyor.',
  yabanci: 'Kabul etmediği bir eşya girişte bekliyor.',
  'yakit-yok': 'Yakıt bitti.',
  hava: 'Havayı bekliyor: yağmur ya da rüzgâr uygun değil.',
  dolu: 'Dolu: yeni eşya alamıyor.',
  ayar: 'Ayarı seçilmemiş.',
  essiz: 'Eşi yok: karşı ucu kurulmamış.',
};
/** Durum kodu → rozet etiketi (renge bağımlı olmadan okunur). */
export const KISA = {
  'cikis-dolu': 'çıkış dolu', 'guc-yok': 'güç yok', 'guc-az': 'güç az', tikali: 'sıkıştı',
  sikisti: 'sıkıştı', kirik: 'kırık', doymus: 'doymuş', sivali: 'sıvalı', nemli: 'nemli',
  yabanci: 'yabancı', 'yakit-yok': 'yakıt yok', hava: 'hava', dolu: 'dolu', ayar: 'ayar',
  essiz: 'eşsiz', 'girdi-yok': 'girdi yok', ac: 'girdi yok',
};
/** Bekleme durumları: sorun sayılmaz ama listede sönük gösterilir. */
export const BEKLEME = new Set(['girdi-yok', 'ac']);
/** Hiç sorun olmayan durumlar. */
const SAGLIKLI = new Set(['calisiyor', 'bos', 'kapali']);
/** Ağır durumlar: darboğaz puanı yalnız bunlara işler. */
const AGIR = new Set(['cikis-dolu', 'guc-yok', 'tikali', 'sikisti', 'kirik', 'doymus', 'sivali',
  'dolu', 'yakit-yok']);

export const sorunMu = (durum) => !SAGLIKLI.has(durum) && !BEKLEME.has(durum);

/**
 * Dünyadaki parçaları tarar: { sorunlar, bekleyenler } (her öğe { id, ad, durum, neden, kx, ky,
 * en, boy, agir }). Sorunlar önce ağırlıklar, sonra id sırasıyla; kamera için kx, ky karo.
 */
export function sorunlariTopla(c) {
  const sorunlar = [];
  const bekleyenler = [];
  for (const p of c.parcalar.values()) {
    const durum = parcaDurumu(p);
    if (SAGLIKLI.has(durum)) continue;
    const bekleme = BEKLEME.has(durum);
    const neden = bekleme ? 'Girdi yok: önünde işlenecek bir şey kalmadı.'
      : (NEDEN[durum] ?? `Durum: ${durum}.`);
    const oge = { id: p.id, ad: p.tanim.ad, durum, neden, kx: p.x, ky: p.y, en: p.en,
      boy: p.boy, agir: AGIR.has(durum) };
    (bekleme ? bekleyenler : sorunlar).push(oge);
  }
  sorunlar.sort((a, b) => Number(b.agir) - Number(a.agir) || a.id - b.id);
  return { sorunlar, bekleyenler };
}

/** Darboğaz puanı sönüm oranı (saniyede): ≈ 3 dk yarı ömür. */
export const SONUM = 0.996;
/** "En çok duran" listesine girmek için en az puan (saniye). */
export const ESIK = 4;

/**
 * Saniyede bir çağrılır: ağır sorunlu her parçanın puanı 1 artar, hepsi söner; dünyadan
 * kalkan parçalar silinir. puanlar: Map(id → puan). Güncellenen Map döner.
 */
export function darbogazGuncelle(puanlar, sorunlar, c) {
  for (const [id, p] of puanlar) {
    if (!c.parcalar.has(id) || p * SONUM < 0.05) puanlar.delete(id);
    else puanlar.set(id, p * SONUM);
  }
  for (const s of sorunlar) if (s.agir) puanlar.set(s.id, (puanlar.get(s.id) ?? 0) + 1);
  return puanlar;
}

/** En çok duran n parça: [{ id, puan, ad, durum, neden, kx, ky }] (puan ≥ ESIK). */
export function enCokDuran(puanlar, c, n = 3) {
  const liste = [];
  for (const [id, puan] of puanlar) {
    const p = c.parcalar.get(id);
    if (!p || puan < ESIK) continue;
    const durum = parcaDurumu(p);
    liste.push({ id, puan, ad: p.tanim.ad, durum, kx: p.x, ky: p.y,
      neden: NEDEN[durum] ?? 'Şu an çalışıyor ama sık duruyor.' });
  }
  return liste.sort((a, b) => b.puan - a.puan || a.id - b.id).slice(0, n);
}
