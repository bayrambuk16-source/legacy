# Project Legacy — eternal-ko-prototype

Bu dosya Claude Code'un her oturumda okuduğu proje hafızasıdır.
Kullanıcı **Türkçe** konuşur; yanıtlar ve kod yorumları Türkçe olmalıdır.

---

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
