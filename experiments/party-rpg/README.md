# party-rpg

Dört kişilik takım tabanlı otomatik savaş RPG'si. `legacy3d-p158.html` tek dosya
build'inden repo yapısına taşındı (Ağu 2026).

## Yapı

    index.html        kabuk: head, importmap, HUD markup
    styles/hud.css    tüm arayüz stili (321 satır)
    main.js           oyun kodu (5421 satır, henüz tek dosya)

Görsel varlıklar `public/assets/party/` altındadır:

    models/     12 .gltf  (kendi kendine yeterli, gömülü buffer + doku)
    vfx/        19 .png   (alev, duman, buz, yıldırım, rün, kalkan…)
    portraits/   4 .webp  (okcu, brute, mage, priest)

## Çalıştırma

Statik sunucu **repo kökünden** servis etmeli, çünkü asset yolları
`../../public/assets/party/…` biçimindedir:

    http://localhost:<port>/experiments/party-rpg/index.html

Kökten (`/`) açmak göreli yolları bozar.

## Taşımada değişenler

Davranış DEĞİŞMEDİ. Yalnız üç yükleyici dosyaya bakacak şekilde çevrildi:

- `VFX_B64` gömülü base64 sözlüğü → `VFX_ADLAR` listesi + `vfx/<ad>.png`
- `VARLIK` gömülü JSON → ad listesi + `loader.load('models/<ad>.gltf')`
- `kartIkon` gömülü base64 → `portraits/<ad>.webp`

## Bilinen açık uçlar

- **three sürümü:** importmap CDN'den `0.160.1` çekiyor; repo'da
  `vendor/three` **0.169.0**. Bilerek dokunulmadı — sürüm birleştirme
  davranış değiştirebilir, ayrı iş.
- **main.js hâlâ tek dosya.** Modül bölmesi yapılmadı; kod domain'lere
  ayrılmış durumda ama çapraz referanslar yoğun, döngüsel import riski var.
- Build hattına (`tools/build.mjs`) bağlanmadı.
