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
görünmeden ve gerçek zaman beklemeden dakikalarca oyun simüle edilebilir.

**Hızlandırmak için `renderer.render`'ı boşa ALMAYIN.** Çok cazip ve çok
yanıltıcı: `renderer.info.memory` yalnız GPU'ya yüklenmiş kaynağı sayar,
çizim yoksa sayaçlar sabit kalır ve sızıntı görünmez olur. Bir kez bu
tuzağa düşüldü (aşağıda "GPU kaynak sızıntısı" maddesi).

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
- **Post-processing ARTIK AÇIK** (önce ölü koddu: `cizdir()` hiçbir
  yerden çağrılmıyordu, `besteci === null` idi). `adim()` sonu artık
  `cizdir()` çağırıyor; `dusuk` kalitede doğrudan renderer, üstünde
  RenderPass → UnrealBloomPass(0.46 / 0.70 / **eşik 0.82**) → OutputPass.
  Ton eşlemesi TEK kez uygulanıyor (doğrulandı: opak piksel iki yolda da
  birebir aynı). **Bloom ilk kez gerçekten çalıştığı için eşik/güç henüz
  hiç ayarlanmadı** — gerçek cihazda bakılmalı.
- **Bloomlu yol ortalama ~%5 daha koyu ölçüldü** (sabit kalitede, tek
  değişken çizim yolu: 64.06 → 60.54; buna karşılık >200 parlak piksel
  4 → 10). Kurulum hatası DEĞİL: hedef boyutu canvas'la birebir
  (911×910), HalfFloat + lineer, resample yok. En olası sebep saydam/
  toplamalı VFX'in artık ton eşlemesinden ÖNCE lineer uzayda
  harmanlanması — fiziksel olarak doğrusu bu, ama görsel bir değişiklik.
  Gözle onaylanmadı; ekranda bakılması gereken ilk şey bu.
- **Görsel tavan payı:** materyaller hâlâ `MeshLambertMaterial` —
  `MeshStandardMaterial` + IBL (`PMREMGenerator` + `RoomEnvironment`)
  geçişi duruyor. Artık bloom canlı olduğuna göre değerlendirilebilir.
- **GPU kaynak sızıntısı — AÇIK, düzeltilmedi.** Efektler sahneden
  çıkarılıyor ama geometri/doku `dispose()` edilmiyor:
  `renderer.info.memory` sürekli tırmanıyor (~1,3 geo/sn ve ~0,9 doku/sn;
  ×10 slotunda daha hızlı). `D.efektler` ve `sahne.children` sınırlı
  kalıyor, yani sorun sahne grafiğinde değil GPU kaynaklarında.
  **Çizim yolundan bağımsız** — kontrollü testte hem doğrudan renderer
  hem besteci yolunda aynı şekilde büyüyor, yani post-processing'in
  ürünü değil, önceden mevcut.
  UYARI: `renderer.info.memory` yalnız GPU'ya YÜKLENMİŞ kaynağı sayar.
  `renderer.render` boşa alınarak yapılan ölçüm sızıntıyı GÖREMEZ —
  daha önce "sızıntı yok" sonucu bu yüzden yanlış çıkmıştı.
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
