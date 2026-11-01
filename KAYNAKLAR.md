# Dış kaynaklar ve lisanslar

Oyundaki her dış varlık burada (şu an yalnız üç yazı tipi); lisans dosyaları yanlarında
durur. Yalnız CC0, MIT, BSD, Apache-2.0, ISC, OFL (font) ve CC-BY (atıfla) kabul edilir.

| Dosya | Kaynak | Yazar | Lisans |
|---|---|---|---|
| `font/alfa-slab-one.woff2` | github.com/google/fonts (ofl/alfaslabone), Türkçe alt küme | JM Solé | SIL OFL 1.1 (`font/OFL-alfaslabone.txt`) |
| `font/bree-serif.woff2` | github.com/google/fonts (ofl/breeserif), Türkçe alt küme | TypeTogether | SIL OFL 1.1 (`font/OFL-breeserif.txt`) |
| `font/courier-prime-bold.woff2` | github.com/google/fonts (ofl/courierprime), Türkçe alt küme | Alan Dague-Greene | SIL OFL 1.1 (`font/OFL-courierprime.txt`) |

Fontlar `fontTools.subset` ile Latin + Türkçe harflere indirildi (OFL değiştirilmiş sürüme
izin verir; ayrılmış font adı yoktur).

## Dış kaynak olmayanlar (kodla üretilir)

Yazı tipleri dışında oyuna dışarıdan gelen hiçbir dosya yoktur (depo taraması: kodun, CSS'in ve
HTML'in hiçbirinde CDN ya da başka bir siteye bağlantı, ses ya da resim dosyası, PixelLab gibi
bir yapay zeka görsel servisi yok):

- **Arayüz ikonları** (`ikon/arayuz.svg`, 27 `<symbol>`) elle yazılmış SVG yollarıdır.
- **Uygulama ikonu** (`ikon/ikon.svg`, `ikon/ikon-maskable.svg`) elle yazılmış SVG'dir;
  `ikon/*.png` ve `favicon.ico` bu SVG'lerden Chromium ile üretilmiş çıktılardır (yeni görsel
  içerik eklenmemiştir).
- **Kâğıt dokusu, delikli kenar, çizgili sayfa** CSS içindeki satır içi SVG (`feTurbulence`) ve
  CSS gradyanlarıdır; menü logosu (`menu-logo.js`) satır içi SVG'dir.
- **Tarla, çiftçi, makineler, garaj, buluntular, hayvanlar, çivi, iğne ve efektler** Canvas 2D
  ile çalışma zamanında çizilir (`js/cizim/`, `js/ozellik/gorsel/`, `buluntu-sekil.js`,
  `hayvan/`); saman ve toprak dokuları gürültü işleviyle üretilir (`js/cizim/doku.js`).
- **Sesler** (kazı, adımlar, makine motorları, buluntu tıngırtıları, kulak tınıları, hayvanlar)
  WebAudio ile sentezlenir (`ses-motor.js` ve desen modülleri); ses dosyası yoktur.
- Çalışma zamanı bağımlılığı yoktur; `package.json`'da bağımlılık bulunmaz (duman testi
  Playwright'ı `--no-save` kurar, oyuna girmez).
