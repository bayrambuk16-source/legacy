# party-rpg — proje hafızası

Dört kişilik takım tabanlı otomatik savaş RPG'si. Mobil, **dikey**.
Kullanıcı Türkçe konuşur; yanıtlar ve kod yorumları Türkçe olmalıdır.

## Çalıştırma

```
npm run dev:party          # repo kökünden statik sunucu, port 8123
```
Adres: `http://localhost:8123/experiments/party-rpg/index.html`
**Kökten (`/`) açma** — göreli asset yolları bozulur.

## Test kancası — `?dbg=1`

`main.js` sonunda (BAŞLAT bölümünden hemen önce) `window.__PARTY` kancası
var. **Yalnız `?dbg=1` ile açılır**, onsuz hiç tanımlanmaz; oyun akışına
dokunmaz, sadece var olan durumu ve fonksiyonları dışarı bağlar.

Sebebi: `main.js` tek ES modül, dışa aktarım yok. Kanca olmadan hiçbir iç
durum (`D`, `ENV`, kahramanlar, sahne) dışarıdan gözlenemiyor — davranış
testi ancak böyle yazılabiliyor. **Silmeyin**, bir dahaki teste lazım.

    __PARTY.D / .ENV / .okcu .brute .mage .priest / .sahne .kamera .renderer
    __PARTY.sabit.*   denge sabitleri (OK_HASAR, AZAMI_MOB, BASMA, ...)
    __PARTY.fn.*      saf fonksiyonlar (zk, sevEsik, takimGucu, kritSans, ...)
    __PARTY.et.*      etki eden çağrılar (mobDogur, itemVer, basmaDene, ...)
    __PARTY.adim / .saat            döngü — deterministik adımlama için

Deterministik koşum kalıbı: `requestAnimationFrame` boşa alınır,
`saat.getDelta` sabitlenir, `adim()` elle N kez çağrılır. Böylece sekme
görünmeden ve gerçek zaman beklemeden dakikalarca oyun simüle edilebilir
(uzun süre / sızıntı testleri bu şekilde koşuldu).

## Yapı

    index.html        kabuk: head, importmap, HUD markup (140 satır)
    styles/hud.css    tüm arayüz (483 satır, paket paket ekli — aşağıya bak)
    main.js           oyun kodu, TEK DOSYA (5683 satır, 30 bölüm başlığı taşır)

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
- **Post-processing HİÇ ÇALIŞMIYOR — ölü kod.** Daha önce buraya "etkisi
  sönük" yazılmıştı; ölçüm bunu çürüttü. `cizdir()` (main.js ~4996)
  hiçbir yerden çağrılmıyor; `adim()` sonunda doğrudan
  `renderer.render(sahne, kamera)` var. Çalışma zamanında doğrulandı:
  `besteci === null`, EffectComposer hiç kurulmuyor. Yani bloom eşiğini
  (0.82) ayarlamanın şu an hiçbir etkisi yok — önce çizim kapısı
  `cizdir()`'e bağlanmalı.
- **`cizdir()` sonsuz özyineleme içeriyor** (main.js ~5001): `else` dalı
  `renderer.render(...)` yerine kendini çağırıyor. Ölü kod olduğu için
  şimdilik patlamıyor. Üstteki maddeyi düzeltip `adim()`'i `cizdir()`'e
  bağlarsanız `dusuk` kalitede ANINDA stack overflow olur — ikisi tek
  seferde düzeltilmeli, ayrı ayrı değil.
- **Görsel tavan payı:** materyaller hâlâ `MeshLambertMaterial` —
  `MeshStandardMaterial` + IBL (`PMREMGenerator` + `RoomEnvironment`)
  geçişi duruyor. Bloom gerçekten devreye girmeden bunu değerlendirmek
  anlamsız; sıra yukarıdaki iki maddeden sonra.
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
