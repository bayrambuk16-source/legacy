# Project Legacy — eternal-ko-prototype

Bu dosya Claude Code'un her oturumda okuduğu proje hafızasıdır.
Kullanıcı **Türkçe** konuşur; yanıtlar ve kod yorumları Türkçe olmalıdır.

---

## Çalışma döngüsü — ZORUNLU

**Temel kural:** yeni özellik veya düzeltme, oyun gerçek tarayıcıda
çalıştırılıp test edilmeden TAMAMLANDI sayılmaz.

Her görevde bu sıra:

1. İstenen değişikliği analiz et.
2. Yalnız gerekli dosyalara müdahale et.
3. Oyunu başlat.
4. Gerçek tarayıcı testi çalıştır.
5. Browser console error/warning kayıtlarını kontrol et.
6. Kritik savaş akışını test et.
7. UI değiştiyse portrait çözünürlüklerde ekran görüntüsü al.
8. Save/load etkileniyorsa oyunu kapatıp tekrar açarak doğrula.
9. Hata varsa düzelt.
10. Testi yeniden çalıştır.
11. Regression başarısızsa görevi TAMAMLANDI SAYMA.

### Regression listesi — her geliştirmeden sonra

game startup · character spawn · mob spawn · combat loop · target
selection · skills · ultimate · heal/support · death/resurrection · boss ·
stage progression · EXP/level · item drops · inventory · equipment ·
upgrade · save/load · UI · camera · animation · VFX · audio ·
console errors · memory growth

### Hata toleransı — hepsi SIFIR olmalı

uncaught error · unhandled promise rejection · NaN gameplay değeri ·
camera drift · save corruption · broken asset load

### Görsel değişiklik

UI veya sahne görseli değiştiyse ekran görüntüsü üret. Portrait test
çözünürlükleri: **320×568 · 375×667 · 390×844 · 430×932**

### Performans

Büyük değişiklikten sonra en az **10 dakika** otomatik savaş testi.
Yeni mob/VFX/render sistemi değişikliğinde **30 dakika**.
İzlenecekler: FPS degradation · memory growth · active mob count ·
geometry count · texture count · console error count

### Git

Büyük görevden önce çalışan state'i koru. Başarılı regression'dan SONRA
commit. Bozuk sürümü ana branch'e taşıma.

### Maliyet

Aynı dosyaları gereksiz tekrar analiz etme; önce mevcut source-map ve son
doğrulanmış test raporunu kullan. Küçük görevlerde tam proje audit'i
yapma. 5-6 ilgili değişiklikten sonra toplu regression uygula.

### Test altyapısı — Playwright (Ağu 2026)

`@playwright/test` 1.62.1 pinli devDependency; Chromium kullanıcı
önbelleğinde (`~/AppData/Local/ms-playwright`), repo dışında.
Yeni ortamda bir kez: `npx playwright install chromium`.

```
npm run test:party         # tam takım: regression + 4 portrait UI
npm run test:party:ui      # yalnız UI, dört portrait çözünürlük
UZUN=1 npm run test:party:uzun          # 10 dk otomatik savaş
UZUN=1 UZUN_DK=30 npm run test:party:uzun   # render değişikliğinde 30 dk
```

- `experiments/party-rpg/tests/regression.spec.js` — regression listesinin
  tamamı tek savaş oturumunda + save/load (gerçek kapat-aç) + uzun koşu.
- `experiments/party-rpg/tests/ui.spec.js` — dört portrait çözünürlük.
- `tests/yardim.js` — oyunu açma/başlatma, console+pageerror+404 toplayıcı,
  NaN taraması, kamera ve GPU sayaç ölçümü.

Testler `?dbg=1` kancasını kullanır; kanca silinirse hepsi düşer.
Uzun koşu varsayılan olarak ATLANIR — her görevde 10 dk beklemek pahalı.

Ekran görüntüleri `test-results/ekran/` altına SABİT yola yazılır
(gitignore'da). Sadece `testInfo.attach` kullanmayın: `list` reporter'da
attachment kalıcı olmaz, geçen testin çıktı klasörü silinir ve elinizde
görüntü kalmaz.

Headless Chromium sekmeyi görünür sayar, bu yüzden `requestAnimationFrame`
çalışır ve **gerçek FPS ölçülebilir** — Claude Code'un kendi browser
paneli gizliyken rAF durur, o yolda FPS ölçümü geçersizdir.

## Model seçimi — göreve göre en hafifi

**Modeli Claude kendisi değiştiremez** — seçim kullanıcıdadır (uygulamanın model
seçicisi veya `/model`). Bu bölüm hangi işin hangi modele düştüğünü söyler;
yanlış modeldeysen bunu SÖYLE, sessizce devam etme.

**Sonnet — varsayılan.** Küçük/orta bug fix · UI · CSS/HUD · item-skill-mob
değer ayarı · yeni basit mob · basit AI davranışı · asset/GLB/texture bağlama ·
ses · Playwright ve regression testleri · save/load düzeltmesi · küçük
refactor · tek ya da birkaç dosya · doğrulanmış sistem üzerine geliştirme.

**Opus — yalnız zor problem.** Kök nedeni bilinmeyen runtime bug · uzun süredir
çözülemeyen hata · çok sistemi etkileyen state problemi · büyük mimari
değişiklik · kapsamlı refactor · combat AI veya save mimarisi · ciddi
performans/memory problemi · race condition · çok dosyalı neden-sonuç analizi ·
Sonnet aynı problemde 2 kez başarısızsa. **Opus çözünce Sonnet'e dön.**

**Fable — yalnız çok uzun, bağımsız ajan görevleri.** Three.js→Godot gibi büyük
migration · onlarca dosyalık dönüşüm · saatler süren çok aşamalı iş. Tek mob,
tek skill, test, küçük refactor için KULLANMA.

Yükseltme sırası: Sonnet → (çözemezse analiz et) → Opus → (yalnız gerçekten
uzun-horizon ise) Fable. **Görev zor GÖRÜNDÜĞÜ için yükseltme.**

**2 deneme kuralı:** Sonnet aynı problemi iki kontrollü denemede çözemezse aynı
düzeltmeyi tekrarlama — log ve stack trace topla, problem alanını daralt, sonra
Opus'a çık.

Öncelik sırası: **1) doğruluk · 2) çalışan sistemi bozmamak · 3) az token/kredi ·
4) kısa süre.**

Örnekler: "Ork okçu ekle" → Sonnet · "HUD kartlarını yeniden düzenle" → Sonnet ·
"50 maddelik regression koş" → Sonnet · "Boss sonrası kamera bazen bozuluyor,
neden bilinmiyor" → önce Sonnet, 2 başarısızlıktan sonra Opus · "30 dk sonra
rastgele AI state bozuluyor" → Opus · "Godot'a taşı" → Fable.

## Bu proje nedir

Knight Online'dan ilham alan mobil RPG. Aktif geliştirme
`experiments/eternal-ko-prototype/` altındadır: Three.js ile kuş bakışı 3D
dünya, otomatik savaş (Genie), okçu sınıfı, ganimet/ekipman sistemi.
`src/` ana oyunun paylaşılan domain katmanıdır (PlayerState, InventoryState,
CombatSystem, EquipmentState) ve prototip onu YENİDEN KULLANIR, kopyalamaz.

## Komutlar (Windows PowerShell)

PowerShell `.ps1` sarmalayıcılarını engellediği için **`npm.cmd`** kullanılır:

```
npm.cmd run typecheck:proto      # tsc — sessizce biterse temiz
npm.cmd run test:proto           # ~550 test; "geçti, 0 kaldı" beklenir
npm.cmd run build:proto          # dist/preview-eternal-ko-p2-2.html üretir
node tools/link-vendor.mjs       # node_modules/three → vendor/three (kurulumdan sonra BİR KEZ)
```

Yeni bir klasöre geçildiyse sırası: `npm.cmd install` →
`npm.cmd install-scripts approve esbuild` → `npm.cmd install` →
`node tools/link-vendor.mjs`.

`public/assets/models/` içinde üç GLB olmalı (archer / arrow / mutant), yoksa
testler ENOENT ile düşer. `public/assets/ui/` HUD görsellerini taşır.

**Değişiklikten sonra HER ZAMAN** typecheck + test koştur. Test çıktısındaki
hatalar stderr'e gider: `npm.cmd run test:proto 2> hatalar.txt`.

## Mimari sözleşmeler — İHLAL EDİLMEZ

Bunlar yorum değil, testle korunuyor. Bir testi "geçsin diye" gevşetme;
kural değiştiyse önce kullanıcıya sor.

1. **Gameplay → readonly WorldFrame → Three.js Renderer.**
   Renderer'ın gameplay authority'si YOKTUR. `world/`, `data/`, `state.ts`
   ve `render3d/frame.ts` three import EDEMEZ. `render3d/` içinde three'ye
   izinli dosyalar: ArcherRig, GlbLoader, MobRig, ThreeWorldRenderer, terrain.

2. **Gameplay 2B'dir** (`worldX` / `worldY`). Yükseklik YALNIZ görseldir ve
   yalnız renderer'da yaşar. `world/` ve `data/` modülleri `heightAt` /
   `moradon-terrain` import EDEMEZ (import sınırı testli).

3. **1 slot = 1 mob türü + 1 dikdörtgen + 5..8 bağımsız örnek.**
   Respawn ÖRNEK BAZLIDIR; bir mobun ölümü slotu sıfırlamaz. Respawn yeni
   nesne yaratmaz, aynı nesneye yeni `uid` + artırılmış `generation` verir.

4. **Tek adım kapısı:** oyuncu ve mob hareketi `worldStepAllowed()`ten geçer.
   Kontrol ENDPOINT-ONLY DEĞİLDİR — `canTraverse()` supercover'dır.

5. **Tek ölüm kapısı:** `PrototypeState.reapDead()`. Kill başına tek drop roll.

6. **Statlar kaynaktan gelir** (`monsters.json`, `data/item-catalog.ts`).
   Hiçbir yerde HP/hasar hardcode edilmez, uydurma stat üretilmez.

7. **Saf katmanlar** (`ui/`, `data/*.ts`): canvas yok, three yok,
   `Math.random()` yok, mutasyon yok. Yerleşim/karar saf, çizim Scene'de.

## Mevcut durum (Ağu 2026)

- **P2.4C bitti:** Moradon haritası aktif. `WORLD_BOUNDS` 2560×2560,
  doğuş `MORADON_WORLD_SPAWN` (1530, 1760) — KAPANMIŞ karar.
  Arazi mesh'i `heightAt()` ile AYNI tablodan üretilir, sapma yok.
  Eski test dünyası `TEST_WORLD` olarak arşivde; P1.x testleri onu kullanır
  (`protoState()` yardımcısı).
- **Engeller şu an KAPALI:** `MORADON_COLLISION_ACTIVE = false`. Sebep:
  sunucu haritasında binaların görsel modeli yok, oyuncu görünmeyen duvara
  çarpıyordu. Maske verisi ve `canTraverse` YERİNDE — tek satırla geri açılır.
  Dünya kenarı (bozuk heightmap şeridi) hâlâ kapalı.
- **Sur kapalı:** Moradon surları collision'da kapalı olduğu için
  spawn'dan erişilebilen alan şehir meydanıdır (~381.650 birim²).
  8 legacy farm slotu bu yüzden meydandadır, hepsi Genie'nin 650 birimlik
  Farm Boundary'si içinde.
- **P2.5:** Envanter/ekipman paneli (`ui/inventory-panel.ts` saf katman +
  Scene çizimi). 12 yuva, çanta ızgarası, stat karşılaştırma, KUŞAN/ÇIKAR/AT.
- **P2.6:** HUD yeni sanat yönüne geçti. Yerleşim `ui/hud-layout.ts`;
  koordinatlar MAKET pikselinde (941×1672) yazılır, tek çarpanla (`UI_SCALE`)
  sahneye taşınır. Görseller `data/proto-assets.ts` → `UI_ASSETS`.

## Sıradaki işler

- Karakter/stat ekranı, yetenek paneli, Örs (demirhane) — alt menüde yerleri
  var, şimdilik "sonraki görevde" diyorlar.
- P2.4D: gerçek Moradon spawn importu. İki kapı önce açılmalı:
  (1) `respawnOverrideSec` varsayılanı `null` olmalı, yoksa import edilen
  respawn süreleri sessizce 8 sn'ye ezilir;
  (2) import katmanında `Content.monster(ref)` doğrulaması fail-fast olmalı.
- Açık soru: `regene0` (~world 1825/1798) ölüm/yeniden doğma noktası mı,
  başka bir sunucu event'i mi? İlk doğuş noktası DEĞİLDİR.

## Çalışma tarzı

- Kod yorumları Türkçe, açıklayıcı ve NEDEN'i anlatır — ne yaptığını değil.
- Bir kural değiştirmek gerekiyorsa testi susturma; kullanıcıya sor.
- Görsel varlıklar WebP olarak `public/assets/` altına, manifeste anahtar
  ekleyerek girer.
- Büyük değişikliklerde önce planı sun, onay al, sonra yaz.
