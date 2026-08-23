# DROP & LOOT FARM LOOP V1 — P1.7

**Kapsam:** prototip (`experiments/eternal-ko-prototype/`).
**Bu bir equipment / item balance görevi DEĞİLDİR** (§41).

**İzolasyon:** `src/` DEĞİŞMEDİ · kaynak DB ve üretilmiş JSON DEĞİŞMEDİ ·
`dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).

---

## 1. KAYNAK ZİNCİRİ (KO_Reference_v8.db — DOĞRULANDI)

```
monsters.s_sid                    monsterin kaynak kimliği
    └─ monster_drops.s_index      aynı değere bağlanır  (526/526 eşleşme)
         ├─ slot_no          1..5
         ├─ drop_kind        'direct_item' | 'group'
         ├─ item_or_group_id → direct_item ise  items_server.num
         │                   → group       ise  make_item_groups.group_id
         └─ rate_raw         0..10000  (ON BİNDE BİR)

make_item_groups(group_id, item_slot 1..30, item_id) → items_server.num
monsters.i_money  → coin
```

### Kullanılan gerçek tablolar ve kolonlar

| Tablo | Kullanılan kolonlar | Rol |
|---|---|---|
| `monsters` | `s_sid`, `str_name`, `s_level`, `i_exp`, **`i_money`**, `s_item` | mob kimliği + coin |
| `monster_drops` | `s_index`, `slot_no`, `drop_kind`, `item_or_group_id`, `rate_raw`, `rate_percent` | drop yuvaları |
| `make_item_groups` | `group_id`, `item_slot`, `item_id` | grup üyeleri |
| `make_item_group_rows` | `group_id`, `nonzero_member_count`, `extraction_confidence` | grup meta |
| `items_server` | `num`, `name` | item kimliği |

`monsters.s_item` da bir drop-tablo işaretçisidir ve 699/700 mobda `s_sid` ile
AYNIDIR; bu yüzden bağlama `s_sid` üzerinden yapılır.

### Doğrulanmış alan semantikleri

| Alan | Semantik | Kanıt |
|---|---|---|
| `rate_raw` | **on binde bir** (yüzde DEĞİL) | `rate_percent = rate_raw / 100`, 2275 satırda ihlal **0** |
| yuvalar | **BAĞIMSIZ atılır** (tek seçim değil) | 526 mobun **216**'sında yuva oranları toplamı %100'ü aşıyor (en yüksek **%375**) — tek seçim matematiksel olarak imkânsız |
| `item_or_group_id` | uzayı `drop_kind` belirler | direct 1247/1252 · group 692/1023 çözülüyor |
| `i_money` | coin miktarı | üretilmiş `loot_tables.json`'daki `coin` ile birebir aynı |

### ÇÖZÜLEMEYEN — uydurulmadı

- **Grup içi üye ağırlığı KAYNAKTA YOK.** `make_item_groups` yalnız `item_slot`
  ve `item_id` taşır; ağırlık/yüzde kolonu bulunmuyor. Üye seçimi
  **yuva-tekdüzedir (uniform)** ve bu bir PROJECT LEGACY kararıdır. Üretilmiş
  içerik bunu `selection: "uniform"` olarak açıkça işaretler.
- **COIN_RANGE_SEMANTIC UNRESOLVED.** Kaynakta tek bir sayı vardır; "±%x"
  benzeri bir alan YOKTUR → coin SABİT miktardır.
- **Eksik gruplar.** `monster_drops`'taki 331 grup satırı çıkarılamamış
  gruplara (id 1, 5, 7, 8 …) işaret ediyor. Bunlar icat EDİLMEZ.

---

## 2. ÜÇ MONSTER ÖRNEĞİ

### Toprak Solucanı — `s_sid=750` → `loot_750`

| Yuva | Tür | rate_raw | % | Hedef | Üye | Seçim |
|---:|---|---:|---:|---|---:|---|
| 1 | group | 2000 | 20 | grup 120 | 30 | uniform |
| 2 | group | 2000 | 20 | grup 110 | 30 | uniform |
| 3 | direct | 3000 | 30 | 379048000 · Silk bundle | — | — |

coin = **18** · yuva toplamı %70

### Yaban Sıçanı — `s_sid=851` → `loot_851`

| Yuva | Tür | rate_raw | % | Hedef | Üye | Seçim |
|---:|---|---:|---:|---|---:|---|
| 1 | group | 300 | 3 | grup 120 | 30 | uniform |
| 2 | group | 500 | 5 | grup 110 | 30 | uniform |
| 3 | direct | 2000 | 20 | 379078000 · Teeth of Bandicoot | — | — |
| 4 | direct | 85 | **0.85** | 379016000 · Upgrade Scroll | — | — |

coin = **60** · yuva toplamı %28.85 · `rate_raw 85 → %0.85` (on binde bir kanıtı)

### Bataklık Reisi — `s_sid=252` → `loot_252`

| Yuva | Tür | rate_raw | % | Hedef | Üye | Seçim |
|---:|---|---:|---:|---|---:|---|
| 1 | group | 6000 | 60 | grup 140 | 30 | uniform |
| 2 | group | 6000 | 60 | grup 150 | 30 | uniform |
| 3 | direct | 100 | 1 | 379016000 · Upgrade Scroll | — | — |
| 4 | direct | 1000 | 10 | 379076000 · Iron bar | — | — |
| 5 | direct | 500 | 5 | 389016000 · Ruh İksiri | — | — |

coin = **214** · yuva toplamı **%136** → bağımsız atış kanıtı

---

## 3. MİMARİ

| Dosya | Rol |
|---|---|
| `data/drop-profile.ts` | SOURCE FACT / TUNING ayrımı + kaynak zinciri metni |
| `world/DropSystem.ts` | kill → roll → sahiplik → teslimat **TEK AUTHORITY** |
| `world/WorldLootSystem.ts` | yerdeki entity deposu + claim (idempotent) |
| `world/LootPolicy.ts` | Auto Loot AÇIK/KAPALI tercihi (mesafesiz) |

**Yeniden yazılmayanlar:** drop tablosu semantiği ana `LootSystem.roll()`,
envanter kuralları ana `InventoryState`, item adı/stat/ikon `Content.item()`.
Scene'de drop tablosu YOKTUR; `WorldLootSystem` Canvas/UI bilmez.

### SOURCE FACT / PROJECT LEGACY TUNING

```ts
DropSlotSourceFact { slotNo, kind, triggerPercent, rateRaw, itemRef, groupRef,
                     memberItemRefs, selection }
DropTuning        { coinMultiplier: 1, dropRateMultiplier: 1, ownerPlayerId: 1,
                    lootLifetimeSec: 60, pickupRadius: 70 }
```

Tuning kaynak sayılarını DEĞİŞTİRMEZ — testle korunuyor.

---

## 4. RNG AUTHORITY

Drop RNG gameplay sisteminin parçasıdır ve **enjekte edilir**: `PrototypeState`
tek bir `mulberry32(seed)` üretir, `LootSystem` onu kullanır, `DropSystem` de
`LootSystem.roll()` üzerinden geçer. Bu katmanlarda `Math.random()` YOKTUR
(40 kill boyunca `Math.random` casusla izlendi: **0 çağrı**).

100 kill dizisi · Toprak Solucanı:

| Koşu | tohum | ilk 8 kill | toplam item |
|---|---:|---|---:|
| A | 4242 | `-` `-` `-` `379048000` `160100002+241002503+379048000` `110610048` `-` `389040000+281005503` | 70 |
| B | 4242 | **aynı** | 70 |
| C | 9999 | `379048000` `261002503` `-` `-` `261001503+379048000` `-` `-` `241004505` | 73 |

---

## 5. SAHİPLİK

`WorldGroundLoot.ownerPlayerId` — **UI etiketi değil**, `claim()`'in İLK
kapısıdır. Sahibi olmayan çağrı `notOwner` alır ve envantere DOKUNAMAZ.
P1.7'de tüm farm loot'u `ownerPlayerId = 1` (tek oyunculu prototip); yapı
ileride party/personal drop'a açıktır.

---

## 6. TESLİMAT AKIŞLARI

```
mob öldür → tek reap kapısı (PrototypeState.reapDead)
          → resolveKill (YALNIZ exp)
          → DropSystem.resolve()
               ├─ LootSystem.roll()   (tohumlu rng)
               ├─ her item AYRI kayıt / AYRI teslimat
               └─ coin (i_money × coinMultiplier)

AUTO LOOT AÇIK     item → inventory.add()   ✔ → AUTO_INVENTORY
                                            ✘ → FULL_INVENTORY_GROUND (ölüm noktası)
                   coin → cüzdan (slot KAPLAMAZ)
AUTO LOOT KAPALI   item → GROUND (ölüm noktası)
                   coin → GROUND coin entity
```

Ölçülen (Bataklık Reisi, 5 yuva):

| Senaryo | Auto Loot | Çanta | teslimat | yerde | coin |
|---|---|---|---|---:|---|
| mob **1000 birim** uzakta | AÇIK | boş | `AUTO_INVENTORY` | 0 | 214 → cüzdan |
| çanta **DOLU** | AÇIK | dolu | `FULL_INVENTORY_GROUND` | 1 | 214 → cüzdan |
| yakında ölüm | KAPALI | boş | `GROUND` | 2 | 214 → yer |

**Auto Loot mesafeye, skill menziline veya Farm Boundary'ye BAĞLI DEĞİLDİR.**
Farm Boundary 100 birime düşürülüp mob 2000 birim uzakta öldürüldüğünde de
teslimat `AUTO_INVENTORY` olur (testle korunuyor).

Envanter dolu iken loot **mobun ölüm noktasında** kalır — oyuncunun konumunda
ASLA oluşmaz.

---

## 7. MANUEL TOPLAMA

- Yarıçap **70** world birimi (PROJECT LEGACY TUNING).
- 100 birim → `outOfRange`, **hiçbir mutasyon yok**, oyuncu **otomatik
  yürütülmez**. 60 birim → başarılı, envanter +1, entity silinir.
- Girdi: yerdeki ganimete dokunmak ya da toplama düğmesi (mevcut etkileşim
  sistemi). Yeni loot UI kurulmadı.

---

## 8. LOOT KİMLİĞİ VE ÖMRÜ

```ts
WorldGroundLoot {
  lootUid            // KENDİ benzersiz kimliği (örnek kapsamlı sayaç)
  kind               // 'item' | 'coin'
  ownerPlayerId      // authoritative
  worldX, worldY     // MOBUN ölüm noktası
  life / lifetimeSec // 60 sn (DEV: 15 / 60 / 180)
  claimed            // idempotency
  sourceMobUid, sourceSpawnSlot, sourceGeneration, sourceMonsterRef
}
```

`lootUid` mobun uid'siyle **aynı şey değildir**; kaynak mob bilgisi yalnız
izlenebilirlik içindir. Modül-global sayaç YOKTUR (P1.6.1 kuralı).

**Despawn FPS bağımsız:** 59.5 sn'de duruyor, 60.5 sn'de gitmiş — 30/60/120
FPS'te aynı.

---

## 9. RESPAWN ↔ LOOT AYRIMI

Mob ölür → loot yerde kalır → mob **yeni uid + nesil+1** ile respawn olur.
Yerdeki kayıt: aynı `lootUid`, aynı konum, aynı sahip, aynı item, aynı
`sourceMobUid`/`sourceGeneration` (ESKİ mobunki). Yeni mob onu değiştirmez.
Mob ve loot yaşam döngüleri tamamen ayrıdır.

---

## 10. CLAIM IDEMPOTENCY

Bir `lootUid` **yalnız bir kez** talep edilebilir: ilk claim başarılı, ikinci
`alreadyClaimed`, manuel üçüncü deneme de `alreadyClaimed`. Envantere yalnız
bir kez eklenir. Envanter reddederse (`inventoryFull`) loot **yerde kalır** ve
`claimed` işaretlenmez — kısmi mutasyon yoktur.

---

## 11. KILL IDEMPOTENCY

P1.6.1'in tek reap kapısı korundu. Aynı karede DoT tiki + ok impact'i öldürürse:
`reap = 1` · `DropSystem.resolve` çağrısı = **1** · `totals.kills = 1` · ikinci
reap `0`.

---

## 12. GENIE İLE İLİŞKİ

Genie **loot toplamaz ve loot için hareket etmez.** Eski yarıçap tarayan
`autoPickup()` yolu ve `GenieAction` `'loot'` türü KALDIRILDI; `GenieDeps`
artık `lootPolicy` almıyor. Auto Loot Genie'den bağımsız bir oyuncu
tercihidir: **Genie KAPALI + Auto Loot AÇIK + manuel kill → doğrudan envanter.**

30 sn farm (aynı tohum, aynı senaryo):

| Auto Loot | kill | item | envanter | yer | altın | yerdeki tepe | sınır dışı |
|---|---:|---:|---:|---:|---:|---:|---|
| AÇIK | 28 | 8 | 8 | 0 | 924 | 0 | HAYIR ✓ |
| KAPALI | 28 | 8 | 0 | 8 | 924 | 36 | HAYIR ✓ |

Ground loot Farm Boundary dışında kalabilir; Genie onu kovalamaz, oyuncu
isterse manuel gider.

---

## 13. ESKİ AUTO LOOT RANGE DENETİMİ (§23)

`autoRadius`, `LOOT_RADIUS_OPTIONS`, `LOOT_RADIUS_LABELS`, `autoPickup()`,
`AUTO_LOOT_MAX_PER_TICK` ve Genie ayar ekranındaki "Auto Loot Menzili" satırı
**tamamen kaldırıldı**. Kod tabanında kalan tek iz, kaldırıldığını açıklayan
yorumlar ve alanların `undefined` olduğunu doğrulayan testtir. `LOOT_DEFAULTS`
artık yalnız `mode` alanını taşır.

---

## 14. TELEMETRİ

**DEV → Drop telemetrisi** (varsayılan KAPALI):

- SON KILL: mob adı/uid/ref/slot/nesil · kaynak tablo · **kaynak zinciri metni**
  (`monsters.s_sid=851 → monster_drops → slot1:group(120×30)@3% · …`) ·
  Auto Loot durumu + sahip · her drop için `item ×adet [direct|group] → TESLİMAT
  (loot #uid)` · coin + teslimatı · EXP · toplam sayaçlar.
- YERDEKİ GANİMET: `#lootUid · ad ×adet · sahip · x,y · mesafe ·
  kalan/toplam ömür · kaynak mob #uid nNesil`.

DEV'de ayrıca **Loot ömrü** preseti (15/60/180). Headless rapor:
`npm run telemetry:drops`.

---

## 15. SOAK (30 dk · Auto Loot KAPALI — en zorlu senaryo)

| Ölçüm | Sonuç |
|---|---|
| yerdeki loot tepe | ≤ 200 (ömür sınırlıyor) |
| claim geçmişi | ≤ 512 (budanıyor) |
| çift claim | **0** |
| item muhasebesi | `items = toInventory + toGround` (kayıp yok) |
| lootUid benzersizliği | ihlal yok |
| NaN / negatif adet | yok |

---

## 16. P1.7'DE YAPILMAYANLAR (§41)

equipment stat uygulaması · equip · upgrade · rarity redesign · yeni item
üretimi · envanter UI redesign · loot filtresi · Auto Sell · pet/party/trade
loot · Genie loot hareketi · quest/boss drop redesign · mob/skill balance.
