# Mimari

## Ortam notu (önemli)
Bu proje brifteki birincil stack (Phaser 3 + Vite) yerine **fallback stack** ile kuruldu,
çünkü geliştirme ortamında npm registry tüm paketlere 403 veriyordu. Brifin öngördüğü
alternatif uygulandı: saf TypeScript + Canvas 2D, bundler olarak esbuild (bun fallback), tip denetimi tsc,
DB okuma node:sqlite (yerleşik). **Veri ve sistem katmanı engine'den bağımsızdır** —
Phaser'a geçiş yalnızca `src/engine/` içine bir Phaser implementasyonu yazmaktan ibarettir;
`src/game/` hiçbir engine API'si görmez.

## Katmanlar
```
KO_Reference_v8.db  (reference/, read-only, gitignore edilebilir)
        │  tools/import-reference.ts   (deterministik, tsx ile çalışır)
        ▼
src/game/data/generated/*.json         (runtime içerik — build'e gömülür)
src/game/data/overrides/content_overrides.json  (özgün isim/görsel katmanı)
        │  GameContentRepository       (tek erişim noktası)
        ▼
Systems (Combat/Loot/Progression/...)  ← Faz 3+
        ▼
Scenes (Boot/Hub/Combat)  →  src/engine (DrawApi/InputApi/AssetStore arayüzleri)
```

## Kurallar
- Runtime asla DB okumaz, asla fetch yapmaz; içerik build sırasında bundle'a girer.
- Sceneler/sistemler yalnızca `GameContentRepository`'den okur; UI içinde iş mantığı yok.
- Oyuncuya görünen isimler overrides katmanından; kaynak isim/ID yalnızca sourceRef/sourceName.
- Eksik asset oyunu düşürmez: `DrawApi.image` sessizce atlar + konsola uyarı.
- Kaynak birimi doğrulanmamış alanlar `...SourceRaw` ekiyle taşınır (reg_time, cast_time);
  normalizasyon sistem config'inde açık birimle yapılır.

## Ekran
Dikey (portrait). Mantıksal alan 620×1100; cihaza aspect korunarak letterbox,
safe-area payı CSS `env()` ile. Dokunma koordinatları mantıksal alana çevrilir.

## Komutlar
- `npm run import` — v8.db → generated JSON
- `npm run validate` — referans bütünlüğü (hata → exit 1)
- `npm run test` — birim testler (level eğrisi, loot dağılımı, upgrade eğrisi)
- `npm run typecheck` — app + tools tsconfig kapıları
- `npm run verify` — typecheck + validate + test + build
- `npm run build` — bundle + `dist/preview.html` (tek dosyalık, çift tıkla açılır test sürümü)

## Typecheck kapıları
- `tsconfig.app.json` — production `src/` kodu; DOM + ES2022, Node type GEREKTİRMEZ
  (registry erişimi olmayan ortamda da çalışır).
- `tsconfig.tools.json` — tools/tests; `types: ["node"]` (npm install ile gelen @types/node).
- `npm run typecheck` ikisini de çalıştırır; `typecheck:app` yalnız production kodu.

## Input yaşam döngüsü
Her scene bir `DisposerBag` tutar: `enter()` içindeki tüm input/event abonelikleri
bag'e eklenir, `exit()` `disposeAll()` çağırır. Aynı sahneye yeniden giriş duplicate
listener üretmez (tests/run.ts'te doğrulanır).

## Ekipman domain invariant'ları (Faz 4.1)
`EquipmentState` şu garantileri UI'dan bağımsız verir:
- **I1 Kapasite:** hiçbir işlem `inventory.usedSlots > capacity` bırakmaz. `unequip()` çanta
  doluyken `{ok:false, reason:'inventoryFull'}` döner; `equip()` swap'ı atomiktir
  (önce yeni item çantadan çıkar, sonra eski item çantaya döner → net değişim 0),
  bu yüzden 60/60 çantada bile swap güvenlidir.
- **I2 Tek slot:** bir `instanceId` en fazla bir slotta bulunur. Zaten kuşanılı bir item
  tekrar `equip()` edilirse mevcut slotu korunur (`alreadyEquipped: true`), kopyalanmaz.
  `new Set(Object.values(serialize())).size === Object.values(serialize()).length`
- **I3 Senkron:** `restore()` önce tüm entry'lerin `equippedSlot` bayrağını temizler,
  sonra yalnız doğrulananları işaretler.
- **I4 Slot tipi:** slotta duran item'ın `equipSlot` tipi slot tipiyle uyumludur.

`restore()` kaydı körü körüne kabul etmez; geçersiz slot ID, envanterde olmayan instance,
duplicate instanceId ve slot-tipi uyuşmazlığı reddedilir ve `RestoreReport` ile raporlanır.
**Bu bir güvenlik önlemi değildir** — kayıt istemci tarafındadır ve kullanıcı düzenleyebilir;
amaç state corruption'a dayanıklılıktır (crash yerine temiz düşüş).

## Skill sistemi (Faz 5)
```
skills.json (AUTHORITATIVE: manaCost, requiredLevel, isim/açıklama)
        +
data/skill-behaviors.ts (cooldownSec, targeting, weaponKinds, effects, classes)
        ↓  SkillRegistry (birleştirir; eksik ID → uyarı, crash yok)
SkillDefinition
        ↓
SkillLoadout (3 aktif slot, save'e girer)  →  SkillSystem (gereksinim + cooldown)
                                                    ↓
                              EFFECT_HANDLERS registry (skill ID switch'i YOK)
                    directDamage · selfBuff · targetDebuff · heal · damageOverTime
```
- Gereksinim sırası: `alive → levelReq → cooldown → weapon → mana → target`.
  Scene bu kuralların hiçbirini hesaplamaz; `slots()[i].blocked` ile hazır cevap alır.
- Kaynak `cast_time`/`recast_time` birimi doğrulanmadığı için gerçek saniye kabul EDİLMEZ;
  `castTimeRaw`/`recastTimeRaw` yalnız audit alanı olarak taşınır, davranış `cooldownSec`ten gelir.
- DoT/debuff'lar düşman üzerinde `status[]` olarak yaşar; `SkillSystem.tickStatuses()`
  ilerletir, Scene yalnız dönen olayları fx olarak gösterir.
- Yeni sınıf eklemek = `skill-behaviors.ts`'e `classes: ['mage']` girdileri; sistem kodu değişmez.

## Kayıt geri yükleme zinciri (Faz 5.1)
`systems/StateRestore.ts` sırayı ve final normalizasyonu tek yerde tutar:
1. `InventoryState.restore()` — entry'leri temizler ve **tüm `equippedSlot` bayraklarını
   null'lar** (kaydın bayraklarına güvenilmez; neyin kuşanılı olduğunun tek otoritesi
   equipment map'idir). Kapasite kesimi burada YAPILMAZ.
2. `EquipmentState.restore()` — slot map'ini **normal equip kurallarıyla** doğrular:
   slot tipi + sınıf + silah türü + seviye. Kural `validateEquipCandidate()` saf
   fonksiyonundan gelir; `canEquip()` ile aynı kaynak, kopya yok.
3. `InventoryState.enforceCapacity()` — kapasiteyi aşan çanta entry'lerini deterministik
   olarak düşürür (instanceId artan; kuşanılı entry'lere dokunmaz) ve raporlar.

Zincir sonunda `inventory.usedSlots <= inventory.capacity` **kesin** sağlanır; rapor
`StateRestoreReport.invariantOk` ile doğrulanabilir. UI bu zincire karışmaz.

### İki aşamalı player restore (Faz 6.1)
`restoreProfile()` tam sırayı tek yerde tutar ve `GameState.loadOrNew()` yalnız onu çağırır:
1. `player.restoreProgression()` — level/exp/coins. **Önce** gelir ki ekipman doğrulaması
   (seviye şartı dahil) KAYITLI seviyeyle yapılsın.
2. envanter → ekipman → `enforceCapacity()`.
3. `player.restoreVitals()` — HP/MP, **final** `CharacterStats` (ekipman maxHp/maxMp
   bonusları dahil) üzerinden clamp edilir; geçersiz/NaN değer tam dolu başlatır.

Progression alanları normalize edilir (level 1..maxLevel tamsayı, exp/coins negatif değil,
hepsi finite). Anti-cheat değildir; corruption dayanıklılığıdır.

### Tüketilebilir atomikliği (Faz 6.1)
`ConsumableSystem` handler'ları **saftır** — yalnız delta hesaplar. Akış:
doğrulama (`inventory.canConsume`: kilitli/kuşanılı/boş) → saf delta planı → `inventory.consume()`
ile adet düşürme → deltaların uygulanması. Başarısız kullanımda HP, MP ve adet değişmez;
**kilitli tüketilebilir kullanılamaz** (aksi halde kilitli iksir sınırsız HP/MP kaynağı olurdu).

## Ekonomi ve tüccar (Faz 6)
- `EconomyProfile` — fiyat politikası: kaynak `buy_price` authoritative; kaynak
  `sell_price` 0 olduğu için satış `buyPrice × sellMultiplier` (varsayılan 0.25) +
  upgrade seviyesi katkısı. Kaynak JSON değişmez.
- `MerchantSystem` — teklifler `merchants.json`dan; buy/sell **atomik**: alışta önce
  kapasite ve coin doğrulanır, kısmi ekleme olursa coin iade + rollback; satışta item
  silinmeden coin verilmez. Kilitli/kuşanılı item satılamaz.
- `ConsumableSystem` + `data/consumable-behaviors.ts` — iksir etkileri VERİ tablosunda;
  `restoreHp/restoreMp/cure` handler'ları var, item ID switch'i yok. Etkisi olmayan
  kullanım adedi harcamaz.
- `SkillCatalog` — Skills UI'ının tek API'si: `skillCatalog()` kilit/atama durumunu,
  `assignSkill()` kilitli skill'i reddeden atamayı verir. Scene kural kopyalamaz.

## Sistemler (Faz 3)
- `PlayerState` — HP/MP/EXP/level (level_curve.json), buff'lar, coin
- `InventoryState` — instance'lı envanter: instanceId/quantity/upgradeLevel/locked/equippedSlot,
  60 slot, stackable ayrımı; kuşanılı entry kapasite saymaz
- `EquipmentState` — 12 slot (weapon/helmet/chest/pants/gloves/boots/earring×2/ring×2/
  necklace/belt); sınıf + seviye gereksinimleri; UI'dan bağımsız
- `CharacterStats` + `StatCalculator` — Base + Equipment + Upgrade + Buff = Final;
  CombatSystem yalnız finalStats() kullanır
- `BalanceProfile` — runtime çarpanlar (monsterHp/monsterDamage/playerDamage/exp/coin);
  kaynak veri asla overwrite edilmez
- `SaveSystem` — saveVersion'lı yerel kayıt + migration iskeleti; storage erişimi
  try/catch'li, kısıtlı ortamda bellek-içi yedeğe düşer
- `SpawnSystem` — zone spawn listesinden ağırlıklı üretim, maxActive sınırı
- `TargetSystem` — dokunarak hedef seçme; hedef ölünce en yakına düşme
- `CombatSystem` — hasar formülü, cooldown'lar, skill kullanımı (mana skills.json'dan)
- `LootSystem` — iki aşamalı drop roll (direct / group ayrı semantik)
Scene'ler yalnız orchestration + render yapar; RNG her sisteme enjekte edilir (mulberry32).

## Faz durumu
- Faz 0 (audit) ✓ — docs/DATA_AUDIT.md
- Faz 1 (iskelet) ✓ — Boot + Hub, portrait canvas, asset yükleme
- Faz 2 (data pipeline) ✓ — import + validate + testler
- Faz 3 (vertical slice combat) ✓ — Hub → bölge → savaş → ödül → Hub döngüsü
- Faz 4 (inventory + equipment + character power) ✓ — 12 slot, stat mimarisi, save v1
- Faz 4.1 (hardening) ✓ — ekipman invariant'ları, save restore doğrulaması, toolchain
- Faz 5 (skill system v2) ✓ — registry + loadout + effect handler mimarisi, save v2
- Faz 5.1 (save/toolchain hardening) ✓ — restore zinciri + kapasite invariant'ı, ZIP kapsamı
- Faz 6 (merchant + skills UI) ✓ — EconomyProfile/MerchantSystem/ConsumableSystem,
  MerchantScene + SkillsScene, save şeması v2'de kaldı (gereksiz bump yok)
- Faz 7 (upgrade sistemi UI) → sıradaki
