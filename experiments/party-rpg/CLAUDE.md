# party-rpg — proje hafızası

Dört kişilik takım tabanlı otomatik savaş RPG'si. Mobil, **dikey**.
Kullanıcı Türkçe konuşur; yanıtlar ve kod yorumları Türkçe olmalıdır.

## Çalıştırma

```
npm run dev:party          # repo kökünden statik sunucu, port 8123
```
Adres: `http://localhost:8123/experiments/party-rpg/index.html`
**Kökten (`/`) açma** — göreli asset yolları bozulur.

## Yapı

    index.html        kabuk: head, importmap, HUD markup (~115 satır)
    styles/hud.css    tüm arayüz (~400 satır, paket paket ekli — aşağıya bak)
    main.js           oyun kodu, TEK DOSYA (~5500 satır, 30 bölüm başlığı taşır)

Varlıklar `public/assets/party/`: `models/` 12 .gltf · `vfx/` 19 .png ·
`portraits/` 4 .svg (sınıf ikonları).

## Neden tek dosya — modül bölmesi YAPILMADI

Denendi ve ölçüldü: 26 modülde 54, 9 modülde 25, **6 modülde bile 14**
çift yönlü bağımlılık çıkıyor (`birimler↔sistem` 167/281 gibi güçlü
karşılıklı referanslar). Kod üst seviye `const` ağırlıklı; ES module
döngüsünde TDZ hatası verir, oyun açılmaz. Bölmek için gerçek bir
refactor (bağımlılık tersine çevirme / paylaşılan bağlam) gerekir.
**Mekanik bölmeye kalkışma.**

## Değişmez kurallar

- **Denge değiştirilmez.** Mob canı/hasarı, doğum aralığı, `AZAMI_MOB`,
  kahraman canları, savaş katsayıları — kullanıcı açıkça istemedikçe
  dokunulmaz. (Kullanıcı kararı, Ağu 2026.)
- `takimGucu` / `onerilenGuc` / `bireyselGuc` **yalnız ekran yazısıdır**,
  savaşa girmez. Değiştirmek güvenlidir.
- `zk()` canlı zorluk değeridir ve mob doğumunda kullanılır — dokunma.
  Gösterge için `zkBolumBasi()` var (bölüm başında sabit).
- CSS'e dokunurken **en alttaki paket bloklarına ekle**, üstteki orijinal
  kuralları düzenleme — geçmiş ve gerekçe orada duruyor.

## CSS paketleri (hud.css sonunda, sırayla)

| Paket | Ne düzeltti |
|---|---|
| C (orijinal) | p158 mobil revizyonu — geniş ekrana ayarlı, 375px altında eziyordu |
| **D** | Dar ekran çakışmaları: üst şerit 42px binişme, kart barı 18px'e eziliyordu |
| **E** | Örs paneli kartları örtüyordu; kahraman paneli başlığı taşıyordu (✕ 157px dışarıda) |
| **F** | Kahraman seçici kaldırıldı — geçiş alt kartlardan |
| **G** | Kart sadeleştirmesi: can/ulti barları sahneye taşındı |

Doğrulanmış genişlikler: **320 / 345 / 360 / 374 / 375 / 393 / 412 / 430 / 768**
— çakışma, yazı taşması, yatay kaydırma yok.

## Bilinen açık uçlar

- **three sürümü:** importmap CDN'den `0.160.1`; repo'da `vendor/three`
  **0.169.0**. Bilerek dokunulmadı — sürüm atlatmak davranış değiştirir.
  Build hattına (`tools/build.mjs`) bu yüzden bağlanmadı.
- **Post-processing** eklendi (bloom, eşik 0.82) ama etkisi sönük: sahne
  orta tonlu, eşiği aşan az yer var. Ayarlanabilir veya IBL
  (`PMREMGenerator` + `RoomEnvironment`) eklenebilir. Materyaller hâlâ
  `MeshLambertMaterial` — `MeshStandardMaterial` + harita payı duruyor.
- **Sanat üretimi:** kullanıcı ChatGPT ile konsept görsel üretiyor. Karar:
  parçaları TEK TEK, düz macenta/siyah zeminde, 512px+ istemek; tek sahne
  üretip kesmek değil. Tutarlılık için ilgili ikonları tek ızgarada iste.
- Güç göstergesi düzeltildi ama takım hâlâ 2-1'de zorlanıyor. Kök sebep
  ölçüldü: mob canı `zk` ile sınırsız büyürken kahraman canı neredeyse
  sabit (`canKat` ~+%7). **Kullanıcı dengeyi değiştirmek istemiyor.**

## Çalışma tarzı

- Kullanıcı token bütçesine dikkat ediyor: gereksiz ekran görüntüsü alma,
  DOM ölçümüyle doğrula, değişiklikleri toplayıp tek seferde sına.
- Kod yorumları NEDEN'i anlatır, ne yaptığını değil.
