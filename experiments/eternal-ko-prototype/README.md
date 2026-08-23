# EXPERIMENT P1 / P1.1 — Eternal Hero × Eski KO Hareket/Combat Prototipi

> **P1.1.1 (bu sürüm):** Genie skill-set `sequence` modu, multi-shot **hedef** isabet
> telemetrisi, `collisionMode` seçeneği, ölmeyen **Training Dummy** test alanı ve
> gözlemsel düzeltmeler — **oyuncu animasyon state'i**, **Attack Range / Farm Boundary
> ayrımı**, **Auto Loot V0**; ardından oyun içi test düzeltmeleri — **8 yönlü bakış**,
> **adım döngüsü**, **ayak hizası**, **aktif set kilidi**, **uzaktan auto loot**.
> P1 ve P1.1'in tamamı korunmuştur.

**Bu bir tasarım kararı DEĞİLDİR.** Amaç: Eternal Hero benzeri sabit 3/4 kamera +
joystick serbest hareketi, eski Knight Online'ın target combat + mob slotu/farm
hissiyle birleştirip gerçek oynanışta ölçmek.

Prototip başarısız bulunursa `experiments/eternal-ko-prototype/` klasörü silinir ve
ana oyun hiç etkilenmez (aşağıdaki izolasyon notlarına bakın).

## Çalıştırma
```
npm run build:proto     # dist/preview-eternal-ko-p1-1-4.html üretir
npm run test:proto      # renderer'sız prototip testleri
npm run typecheck:proto
npm run verify:proto    # üçü birden
```
Ana oyun komutları (`npm run verify`) prototipten etkilenmez.

## İzolasyon (ana projeye dokunulmayanlar)
- `src/main.ts`, `CombatScene`, `HubScene`, `InventoryScene`, `MerchantScene`,
  `SkillsScene` **değiştirilmedi**.
- Prototipin **ayrı giriş noktası** (`experiments/.../main.ts`) ve **ayrı bundle'ı** var.
- Prototip **kendi state'ini** kurar (`PrototypeState`) — ana `GameState` kullanılmaz,
  **kayıt yazılmaz**, save şeması değişmedi (hâlâ v2).
- Ortak kodda yapılan tek değişiklik: `tools/build.mjs` + `tools/pack-preview.mjs`
  artık `--entry/--out/--preview/--title` argümanı kabul ediyor (varsayılanlar aynı,
  ana build çıktısı byte olarak aynı davranıyor). Geriye dönük uyumlu.

## Ana projeden yeniden kullanılan dosyalar
| Dosya | Kullanım |
|---|---|
| `src/engine/canvas.ts`, `types.ts`, `dispose.ts`, `rng.ts` | Renderer, input, disposer, deterministik RNG |
| `src/game/systems/CombatSystem.ts` | Hasar formülü, temel saldırı, düşman saldırısı |
| `src/game/systems/SkillSystem.ts` + `SkillRegistry` + `SkillLoadout` | Skill kuralları (mana/cooldown/level/silah), effect handler'ları, DoT/debuff tick |
| `src/game/systems/CharacterStats.ts` | Final stat (base + ekipman + buff) |
| `src/game/systems/PlayerState.ts` | HP/MP/EXP/level, regen, iki aşamalı restore API'si |
| `src/game/systems/InventoryState.ts` | Item instance + kapasite kuralları |
| `src/game/systems/EquipmentState.ts` | 12 slot, başlangıç yayının kuşanılması |
| `src/game/systems/LootSystem.ts` | İki aşamalı drop roll |
| `src/game/systems/BalanceProfile.ts` | Runtime denge çarpanları |
| `src/game/data/GameContentRepository.ts` (+ generated JSON) | Monster/item/skill verisi |
| `src/game/data/assets-manifest.ts` | Mevcut karakter/mob görselleri |

## Prototip için eklenen yeni sistemler
| Sistem | Sorumluluk |
|---|---|
| `WorldMovementSystem` | Joystick çözümleme (dead-zone/analog/normalize), dt-bağımsız 360° hareket, world bounds + dairesel engel çarpışması (eksen bazlı kayma) |
| `WorldCameraController` | Sabit açı/zoom takip, dt tabanlı smoothing, clamp'li look-ahead, çok hafif hedef framing |
| `WorldTargetSystem` | Tek aktif `targetUid`; dokunarak/en-yakın seçim, ölüm/mesafe ile düşme, otomatik atlama YOK |
| `MobSlotSystem` | Data-driven slotlar (merkez/yarıçap/max/respawn/leash/aggro) + idle→chase→attack→return AI |
| `WorldCombatAdapter` | World-space menzil kapısı → ana CombatSystem/SkillSystem (formül tekrar yazılmadı) |
| `WorldLootSystem` | Loot mobun öldüğü world koordinatına düşer; mesafe + kapasite ile toplama |
| `CombatRangeProfile` | Doğrulanmamış kaynak `range` alanı yerine prototip world menzilleri |
| `WorldPrototypeScene` | Yalnız girdi toplama + 2.5D çizim + DEV panel |

---

# Prototype Evaluation Notes

## Kullanılan kamera varsayılanları
| Ayar | Değer | Not |
|---|---|---|
| `cameraFollow` | **6.5** (1/sn) | `1 - e^(-k·dt)` yumuşatma; ~0.15 sn'de yarı mesafe. Daha yükseği "çivilenmiş", daha düşüğü "sarhoş" hissettiriyordu. |
| `cameraLookAheadPct` | **%6.5** | İstenen %5–8 bandının ortası: 620×1100 ekranda ≈ 40 px yatay / 72 px dikey ofset. |
| `cameraPlayerYPct` | **%60** | İstenen %58–63 bandının ortası; oyuncunun ilerlediği yönde üstte belirgin daha fazla dünya kalıyor. |
| `lookAheadFollow` (sabit) | 3.2 | Joystick bırakılınca ~1 sn'de merkeze döner; ani değil. |
| `targetFramingPct` (sabit) | 0.18 | Hedef seçiliyken kamera oyuncu-hedef arasına yalnız %18 kayar, 520 world biriminden uzak hedefte hiç uygulanmaz. |
| `worldYCompression` | **0.62** | Tam tepeden bakış değil; yüksek 3/4 / pseudo-isometric his. |
| `characterScale` | **0.78** | Eternal Hero'dan bir miktar daha büyük/okunaklı karakter hedefi. |

Kamera **hiçbir noktada manuel döndürülemez**, pinch-zoom yoktur, sabit açı/zoom korunur.

## Hareket hızı
`playerSpeed = 210` world birimi/sn. Harita 2480×3300 (≈ 4 ekran genişlik × 3 ekran
yükseklik); iki farm slotu arası yürüyüş ≈ 8–10 sn — "haritada dolaşıyorum" hissi için
yeterince uzun, test turu için yeterince kısa bulundu. Jump/dash/dodge/parkur YOKTUR;
yalnız idle + walk/run.

## Target range dönüşümü nasıl yapıldı
Kaynak `skills.json` içindeki `rangeSourceRaw` (KO'da 0 / 25 / 10000 gibi) **birimi
doğrulanmadığı için piksel/metre olarak yorumlanmadı** ve kaynak JSON değiştirilmedi.
Bunun yerine prototipe özel `CombatRangeProfile`:
- temel saldırı **300** world birimi (okçu yayı),
- hasar skilleri **340**,
- self-buff menzil aramaz (`Infinity`),
- hedef **900** birimden uzaklaşırsa düşer, dokunma seçimi yarıçapı **80**,
- "En yakın hedef" taraması **520**.
Mob saldırı menzili **62** birim (yakın dövüş). Bu değerler prototip sabitleridir;
ana oyunun combat formüllerine dokunulmamıştır.

## Yalnızca prototip yaklaşımı olan noktalar
1. **Tür görseli yok.** İkinci slot ("Bataklık Yuvası") ayrı bir yaratık artwork'ü değil;
   mevcut kurt atlası farklı ölçek/renkle kullanılıyor. Akrep/örümcek seti üretilmedi.
2. **8 yön animasyon yok.** Yönelme `flipX` + tek yön satırı ile yaklaşıklanıyor.
   Mimari 8 yön/skeletal eklemeye kapalı değil (sprite seçimi tek yerde).
3. **2.5D sahte perspektif.** Gerçek 3D yok; worldY sıkıştırma + ayak-anchor + worldY
   depth sort + çok hafif (0.00016/px) ölçek. Bu projeksiyon combat/collision hesabına
   **karışmaz** — menzil ve çarpışma world uzayında ölçülür.
4. **Basit çarpışma.** Yalnız dairesel engeller + world bounds; mob-oyuncu fiziksel
   itmesi yok, moblar üst üste binebiliyor.
5. **Oyuncu yüksek seviye başlıyor** ki skiller açık olsun (ana oyunun ilerleme eğrisi
   değil). P1'de Sv12 idi; P1.1'de kaynak `arrow shower` şartı 55 olduğu için **Sv55**
   (bkz. P1.1 §7).
6. **Kayıt yok.** Prototip oturumu kapanınca sıfırlanır; bu bilinçli (ana save korunuyor).
7. **Attack/cast lock yok.** Kite hissini ölçmek için hareket serbest; kısa lock gerekirse
   davranış katmanına (behavior/config) eklenecek, koda gömülmeyecek.
8. **Ölüm ekranı yok.** Oyuncu ölürse anında yerinde diriliyor (test akışı kesilmesin diye).
9. **Yer/ağaç/taş proceduraldir** (deterministik seed) — nihai sanat değil.

---

# EXPERIMENT P1.1 — Genie V0 + 3/5 Ok Yakın Mesafe Combosu

Bu aşama **P1'in üzerine** eklenir. Ana Faz 6.1 projesi değişmedi, Faz 7'ye
geçilmedi. P1'in 26 testi korunmuştur (toplam **69 prototip testi**).

## 1. Tespit edilen skill ID'leri (tahmin YOK — kaynak sorgusu)

`reference/KO_Reference_v8.db` sorgulandı; iki ayrı tablo kullanıldı.

**`skills` tablosu (MAGIC):**

| magic_num | name_field1 | skill_level | mana_cost | cast_time | recast_time | effect_type1 | skill_group | source_variant | offset | confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| **107515** | `multiple shot` | 15 | 40 | 13 | 0 | 2 | 1075 | `MAGIC_196_NO_EVENT` | 9522469 | medium |
| **107555** | `arrow shower` | 55 | 150 | 15 | 0 | 2 | 1075 | `MAGIC_200_EVENT` | 8754177 | high |

**`magic_type2` tablosu — OK SAYISI BURADAN GELİR:**

| magic_num | name | description | need_arrow | hit_rate | add_damage | add_range |
|---|---|---|---|---|---|---|
| **107515** | Multiple Shot | "Shoot 3 arrows at once" | **3** | 100 | 99 | 100 |
| **107555** | Arrow Shower | "Shoot 5 arrows at once" | **5** | 100 | 99 | 100 |

Notlar:
- 1075xx El Morad okçu dalıdır (`skill_group 1075`). Karus karşılıkları
  207515 / 207555'tir; prototip tek sınıf kullandığı için yalnız 1075xx alındı.
- `manaCost` ve `requiredLevel` **kaynaktan** gelir ve `skills.json` içinde
  AUTHORITATIVE'dir; prototip bunları hardcode etmez, ezmez.
- Kaynak `add_damage` alanı = **99**; bu alanın kesin hasar semantiği bu projede
  **henüz doğrulanmadığından** prototip damage coefficient için kullanılmamıştır.
  (Yüzde mi, düz eklenti mi, hangi tabana uygulandığı belirsizdir; alan adı tek başına
  yorum için yeterli değildir.) `need_arrow = 3/5` ise **doğrulanmış kaynak veridir**.
- Aynı şekilde `hit_rate = 100` ve `add_range = 100` alanlarının birimi/anlamı
  doğrulanmamıştır; prototip bunları da kullanmaz.

**Veri tarafında yapılan tek ana-proje değişikliği:** `tools/import-reference.ts`
whitelist'ine 107515 + 107555 eklendi ve `content_overrides.json`'a Türkçe ad/açıklama
girildi (`Çoklu Atış`, `Ok Yağmuru`). Bu **yalnız veridir**: ana oyunun
`SKILL_BEHAVIORS` listesi bu iki ID'yi tanımadığı için ana oynanış değişmez.
Prototip davranışları `SkillRegistry.registerBehavior()` ile **additive** eklenir.

## 2. MultiShotProfile varsayılanları

`world/MultiShot.ts`:

| Skill | projectiles | anglesDeg | coefficientPerArrow | rangeWorld | collisionMode | cooldownSec |
|---|---|---|---|---|---|---|
| 107515 Çoklu Atış | 3 (kaynak `need_arrow`) | `[-4, 0, +4]` | 0.75 | 340 | `targetOnly` | 4 |
| 107555 Ok Yağmuru | 5 (kaynak `need_arrow`) | `[-8, -4, 0, +4, +8]` | 0.62 | 360 | `targetOnly` | 9 |

**İsabet nasıl bulunuyor (yüzde tablosu YOK):** her ok gerçek bir doğru olarak
atılır; bir ok, hedefin world-space `combatRadius` dairesini kesiyorsa isabet eder
(dik uzaklık `d·sin θ ≤ r`, ileri yönde ve menzil içinde). Sonuç: **yakında 5/5,
uzaklaştıkça doğal olarak 4/5, 3/5, 2/5**. Mesafeye göre yüzde tablosu, `hit chance`
zarı veya `damage × N` tek vuruş YOKTUR.

- Mana + cooldown **cast başına BİR KEZ** ana `SkillSystem.useByRef()` içinde alınır.
- Her isabet için ana `CombatSystem.damageRoll()` **ayrı** çağrılır (ayrı varyans).
- Yan moba isabet **`collisionMode`'a bağlıdır** (P1.1.1 §10) — varsayılan
  `targetOnly`'de yoldaki başka mob oku tutmaz.
- UI, oyuncuya **seçili hedefteki** isabeti gösterir (P1.1.1 §9):
  `Ok Yağmuru: hedef 3/5 | yan isabet 1 | hedef 184 | toplam 231`.
- Önceki oklar hedefi öldürdüyse kalan oklar boşa gider (hasar yazılmaz), ama
  `targetHitCount` geometrik isabeti göstermeye devam eder.

**Monster hitbox** (`world/hitbox.ts`) sprite genişliğinden ayrı bir gameplay
değeridir: `base 26 + level × 0.9`, elit `× 1.6`, slot görsel ölçeğinin katkısı
`× 0.5`, `[16, 90]` aralığına kırpılır. Büyük/elit yaratığa 5/5 sokmak daha kolaydır.

## 3. Genie V0 varsayılanları

`world/GenieSystem.ts` → `GENIE_DEFAULTS`:

| Ayar | Varsayılan | Seçenekler |
|---|---|---|
| Attack Range (farm yarıçapı) | **650** | 350 / 500 / 650 / 800 / 1000 |
| Auto Burst Range | **240** | 140 / 180 / 240 / 300 / 380 |
| Target Priority | **En Yakın** | En Yakın / En Düşük HP / Elit Öncelik |
| HP iksiri | **AÇIK**, eşik **%40** | %20 / %30 / %40 / %50 / %60 |
| MP iksiri | **AÇIK**, eşik **%30** | %10 / %20 / %30 / %40 / %50 |
| Karar aralığı | 0.25 sn | (sabit) |

**Varsayılan skill setleri** (`data/prototype-skills.ts`, gerçek sourceRef'ler):

| Set | Mod | Sıra |
|---|---|---|
| Set 1 — Yakın Burst | **`sequence`** | Ok Yağmuru (107555) → Çoklu Atış (107515) → Alev Oku (107505) → **Çoklu Atış (107515, tekrar)** → wrap |
| Set 2 — MP Tasarruf | `priority` | Çoklu Atış (107515) → Zehirli Ok (107510) → Delici Atış (107500) → Alev Oku (107505) |
| Set 3 — Elit | `priority` | Ok Yağmuru → Delici Atış → Zehirli Ok → Çoklu Atış → Alev Oku → **Çoklu Atış (tekrar)** |

Set başına en fazla 6 skill. Tekrar eden entry'nin **anlamlı olması moda bağlıdır** —
bkz. P1.1.1 §9. `priority` modunda listedeki ikinci kopyaya asla sıra gelmez;
`sequence` modunda gerçek bir combo adımıdır.

**Karar akışı** (`GenieSystem.update`): hedef geçerli mi → canlı mı → farm alanı
içinde mi → aktif set (elit → Set 3, mesafe ≤ Auto Burst → Set 1, aksi halde Set 2)
→ setteki ilk **kullanılabilir** skill (cooldown/mana/seviye/silah/menzil engeli olan
atlanır) → hiçbiri olmazsa **temel saldırı**. Genie hiçbir skill kuralını kendi
hesaplamaz; hepsi ana `SkillSystem` + `WorldCombatAdapter` üzerinden geçer.

- **BAŞLAT**: o anki oyuncu konumu `genieFarmCenter` olarak kilitlenir. Attack Range
  bu merkezden ölçülür → Genie haritada peşinden koşmaz. Merkez, oyuncu yürüyünce KAYMAZ.
- **DURDUR**: otomatik hedefleme/cast/iksir durur, **mevcut hedef SİLİNMEZ**.
- **V0'da otomatik HAREKET YOKTUR.** Joystick her zaman oyuncudadır; kamera ve
  joystick Genie açıkken de kilitlenmez.
- Ayar ekranı açıkken Genie duraklar (kullanıcı ayar yaparken cast etmesin diye).

## 4. DEV paneli eklentileri

`DEV` düğmesi → sol sütun **GENIE DURUMU**: Genie açık/kapalı, farm merkezi,
attack range, burst range, hedef adı, hedef uid, mesafe, aktif set, son eylem,
son çok-ok sonucu, uçuşan ok sayısı. Altında **`Show projectile rays`** anahtarı:
açıkken ok yörüngeleri (isabet sarı / ıska gri) ve mobların `combatRadius`
gameplay hitbox'ı noktalı çizilir.

Haritada Genie farm alanı noktalı bir halka + merkez işareti olarak görünür
(Genie kapalıyken soluk gri, açıkken turuncu).

## 5. Test sonuçları

```
npm run verify        →  106 geçti, 0 kaldı   (ana oyun — DEĞİŞMEDİ)
npm run verify:proto  →   89 geçti, 0 kaldı   (26 P1 + 43 P1.1 + 20 P1.1.1)
```

P1.1'de eklenen 43 test: hitbox (3), çok-ok geometrisi (10), çok-ok hasar akışı (6),
Genie (15), ok görselleri (3), P1 inceleme düzeltmeleri (3), kaynak/izolasyon (4).
Tamamı renderer'sızdır.

**P1 incelemesinden gelen iki düzeltme + regresyon testleri:**
1. `MobSlotSystem.populate()` — tüm `monsterRefs` geçersizken `while` döngüsü sonsuza
   girebiliyordu. Artık deneme sayısı sınırlı ve deterministik
   (`maxCount × attemptsPerSlot`, varsayılan 4) ve `{ spawned, failed }` döner.
2. `MobSlotSystem.respawn()` — yeniden doğan mob eski `attackTimer` değerini
   taşıyordu (menzile girer girmez "bekleyen" vuruş). Artık `attackTimer = 0`.

## 6. Performans

Headless Chromium (390×844 viewport, `file://` preview), bataklık paketinde
Genie AÇIK + `Show projectile rays` AÇIK (en ağır durum):
**60.1 FPS**, JS heap **10 MB**. Konsol hatası yok.

## 7. Prototip denge katsayıları (P1.1)

Kaynak `arrow shower` seviye şartı **55** olduğu için prototip oyuncusu Sv55 başlar
(`PROTO.startLevel`). Ana oyunun MVP tavanı (`LEVELING.maxLevel = 20`) **değişmedi**;
seviye yalnız prototip state'inde doğrudan atanır. Sv55 oyuncuya karşı Sv1–15
mobları anlamlı kalsın diye `BalanceProfile` runtime çarpanları kullanılır:
`monsterHpMultiplier = 8`, `monsterDamageMultiplier = 8`. **Kaynak DB değerleri
değiştirilmedi.** Başlangıç çantasında Genie iksir eşiklerini test etmek için
20 Yaşam Suyu (%25 HP), 10 Sevgi Suyu (%40 HP), 20 Ruh İksiri (%25 MP),
10 Zihin İksiri (%40 MP) vardır.

## 8. Bilinen sınırlar / açık noktalar (P1.1 — P1.1.1 ile güncellendi)

1. **V0'da otomatik hareket yok** (spec gereği). Sonuç: farm alanı yarıçapı (650)
   skill menzilinden (340–360) büyük olduğu için Genie, alan içindeki ama menzil
   dışındaki bir hedefi seçip **bekleyebilir** (`bekliyor (range)` olarak görünür).
   Mob aggro yarıçapına girerse kendi gelir. V1'de "hedefe yürü" adımı bunu çözer.
2. **Ayarlar kalıcı değil.** Genie ayarları oturum içidir; prototip kayıt yazmaz.
3. **Ok görselleri basit** (izli nokta + isabet/ıska efekti); ayrı ok artwork'ü yok.
   Görsel katman gameplay çarpışmasından tamamen bağımsızdır (test ile doğrulanmıştır).
4. **Set editörü sıralamayı taşımıyor** — skill eklenip silinebilir, sürükleyip
   yeniden sıralama yok (silip yeniden ekleyerek yapılır).
5. **Havuzda yalnız davranışı olan skiller var.** `skills.json`'da bulunup
   `SkillRegistry`'de davranışı olmayan kayıtlar (ör. 107725 "light feet") ayar
   ekranında listelenmez; aksi halde sete eklenip hiç çalışmayan bir satır olurdu.
6. **Elit yalnız tek yerde.** Sv15 `Bataklık Reisi` (252) yalnız "Bataklık Yuvası"
   slotunda doğar; Set 3'ü test etmek için oraya yürümek gerekir.
7. **Ana oyunun `dist/preview.html` byte'ları değişti** — çünkü `skills.json` iki yeni
   kayıt ve iki yeni ad/açıklama içeriyor. Oynanış aynıdır (bu ID'lerin ana oyunda
   davranışı yoktur); `npm run verify` 106/106 geçmeye devam ediyor.

---

# EXPERIMENT P1.1.1 — Genie/Multishot correctness

P1.1 incelemesinden çıkan üç doğruluk düzeltmesi + bir belge düzeltmesi.
Yeni özellik eklenmedi; kamera, joystick, hareket, potion ve Genie hedefleme
davranışı **değişmedi**. Ana Faz 6.1 ve Faz 7'ye dokunulmadı.

Ana paket sürümü **0.6.2'de kaldı** — bu düzeltme yalnız `experiments/` altını ve
`build:proto` çıktı adını (`dist/preview-eternal-ko-p1-1-1.html`) etkiliyor.

## 9. Skill Set execution mode: `priority` / `sequence`

**Sorun (P1.1):** Genie her karar tikinde skill listesini index 0'dan yeniden
tarıyordu. Bu yüzden `[Ok Yağmuru, Çoklu Atış, Alev Oku, Çoklu Atış]` listesindeki
**ikinci `Çoklu Atış`'a asla sıra gelmiyordu** — duplicate entry gerçek bir combo
adımı değildi.

**Çözüm:** her set için `SetMode` eklendi (`GenieSettings.modes`):

| Mod | Davranış |
|---|---|
| `priority` | P1.1'deki davranış. Her tikte liste **baştan** taranır; her zaman en yüksek öncelikli kullanılabilir skill atılır. Duplicate entry bu modda **anlamsızdır**. |
| `sequence` | Set için runtime **cursor** tutulur. Arama cursor'dan başlar; kullanılabilir skill bulunup **başarılı cast** olursa cursor kullanılan entry'nin **bir sonrasına** ilerler ve **wrap** eder. Duplicate entry gerçek ikinci pozisyondur. |

**Sonsuz bekleme koruması:** `sequence` modunda cursor'dan başlayarak set **en fazla
bir tam tur** taranır. Kullanılabilir skill yoksa **temel saldırıya** düşülür ve
cursor **değişmez** (blocked bir entry cursor'u kaydırmaz).

**Varsayılan modlar:** Set 1 `sequence`, Set 2 `priority`, Set 3 `priority`.
Ayarlar → *Skill Setleri* sekmesinde her set için **Priority / Sequence** düğmesi var;
mod değişince cursor'lar sıfırlanır. Ayar ekranında cursor'un işaret ettiği satır
turuncu şeritle işaretlenir.

**CURSOR POLİTİKASI (açık karar):**

| Olay | Cursor |
|---|---|
| **BAŞLAT** | **Sıfırlanır** — her farm oturumu rotasyona baştan başlar. |
| **DURDUR** | **Dokunulmaz** — o an nerede kaldığı DEV panelinde okunabilsin diye korunur. (Bir sonraki BAŞLAT yine sıfırlar.) |
| Aktif set değişimi (Set 1 ↔ Set 2 ↔ Set 3) | Her setin **kendi** cursor'u korunur — oyuncu yaklaşıp uzaklaştıkça Set 1 combosu kaldığı yerden devam eder. |
| Başarısız tur (tüm entry'ler blocked) | Değişmez. |
| Mod değişimi (ayar ekranı) | Sıfırlanır. |

Set 1 varsayılanı `sequence` olduğu için gerçek rotasyon şudur ve başarılı cast'ler
boyunca korunur:

```
Ok Yağmuru → Çoklu Atış → Alev Oku → Çoklu Atış → (wrap) Ok Yağmuru → ...
```

**Sequence telemetrisi** — DEV panelinde iki yeni satır:
```
Set modu          Sequence
Sequence cursor   4/4 → Çoklu Atış
```
(`priority` modunda ikisi de `—` gösterir; `GenieTelemetry.cursorIndex` null döner.)

## 10. Multi-shot hedef telemetrisi

**Sorun (P1.1):** `hitCount` **herhangi bir moba** çarpan tüm projectile'ları
sayıyordu. Kalabalıkta "5/5" yazarken seçili hedefe hiç ok girmemiş olabiliyordu.

**Çözüm:** `MultiShotResolution` ve `MultiShotOutcome` ayrıştırıldı:

| Alan | Anlam |
|---|---|
| `totalProjectileCount` | Atılan ok sayısı (3 / 5). |
| `targetHitCount` | **Seçili hedefe** isabet eden ok sayısı — "3/5" bunun üzerinden okunur. |
| `sideHitCount` | Seçili hedef dışındaki moblara isabet eden ok sayısı. |
| `targetDamage` | Yalnız seçili hedefin aldığı hasar. |
| `sideDamage` | Diğer mobların aldığı hasar (`totalDamage - targetDamage`). |
| `hitCount` / `total` | **Geriye dönük uyumluluk** için korundu (`targetHitCount + sideHitCount`). UI bunları göstermez. |

Her ışın ayrıca `onTarget: boolean` taşır. Combat log ve Genie telemetrisi artık
hedefi esas alır:

```
Ok Yağmuru: hedef 3/5 | yan isabet 1 | hedef 184 | toplam 231
```

Böylece oyuncu yaklaştıkça seçili hedefteki **1/5 → 3/5 → 5/5** değişimi doğru ölçülür.

## 11. `collisionMode` — yan moba isabet artık bir prototip seçeneği

V8 DB yalnız `need_arrow = 3/5` değerini doğrular. Okların **başka bir mob tarafından
fiziksel olarak intercept edilip edilemeyeceği kaynak tarafından doğrulanmış
değildir**, bu yüzden P1.1'deki "yoldaki ilk mobu vur" davranışı kaynak gerçeği gibi
kabul edilmiyor. `MultiShotProfile.collisionMode` eklendi:

| Mod | Davranış |
|---|---|
| `targetOnly` | Işın **yalnız seçili hedefin** `combatRadius`'u ile test edilir. Yan isabet yoktur. |
| `firstMobAlongRay` | P1.1 davranışı: yoldaki ilk canlı mob oku tutabilir. |

**Seçilen default: `targetOnly`** (`DEFAULT_COLLISION_MODE`). Gerekçe:
(a) kaynak yan-isabeti doğrulamıyor — doğrulanmamış davranış varsayılan olmamalı;
(b) "hedefte 1/5 → 3/5 → 5/5" ölçümünü yan moblar kirletmiyor.
**Bu nihai tasarım kararı DEĞİLDİR** — hangisinin kalıcı olacağı açık bırakıldı.

DEV panelinde **`Collision mode: …`** düğmesiyle çalışırken değiştirilebilir
(`WorldCombatAdapter.collisionModeOverride`); telemetride etkin mod gösterilir.

## 12. Test sonucu (P1.1.1)

```
npm run verify        →  106 geçti, 0 kaldı   (ana oyun — DEĞİŞMEDİ)
npm run verify:proto  →   89 geçti, 0 kaldı   (26 P1 + 43 P1.1 + 20 P1.1.1)
```

P1.1.1'de eklenen 20 test:
- **sequence (12):** varsayılan modlar; cursor ilerlemesi + wrap; duplicate entry'nin
  `sequence`'te kullanılıp `priority`'de kullanılmadığı (aynı sette karşılaştırmalı);
  blocked entry atlama; tüm entry blocked → basic fallback + cursor sabit; boş set →
  basic fallback; BAŞLAT sıfırlar / DURDUR korur; set değişiminde cursor korunur;
  Set 1 varsayılan rotasyonunun gerçek sırası; ayardan mod değişimi; cursor telemetrisi
  (`sequence` ve `priority` için ayrı).
- **hedef telemetrisi (3):** `targetHitCount + sideHitCount = hitCount`; mesafeyle
  hedef isabetinin düşmesi; adapter'da `targetDamage + sideDamage = totalDamage`.
- **collisionMode (5):** varsayılanın `targetOnly` olması; `targetOnly`'de yan
  isabetin sıfırlanması; `firstMobAlongRay`'de yan isabetin oluşması; DEV ezmesinin
  yan mobun HP'sini belirlemesi; görsel katmanın etkilenmemesi.

Sequence testleri **sahte adapter** ile yapılır (gerçek cooldown/mana beklemeden
yalnız "hangi entry, hangi sırayla denendi" ölçülür) — tamamı renderer'sızdır ve
deterministiktir.

## 13. P1.1.1 ile değişmeyenler

Kamera (`cameraFollow` 6.5, look-ahead %6.5, Y ofset %60), joystick (dead-zone/analog),
hareket hızı (210), Genie hedef seçimi/farm merkezi/attack range/burst range,
HP/MP iksir eşikleri ve seçim mantığı, mob AI/slot/respawn, loot, 2.5D projeksiyon —
**hiçbiri değişmedi**. P1'in 26 ve P1.1'in 43 testi silinmedi, aynen geçiyor.

---

# HASAR KUKLASI / TRAINING DUMMY (P1.1.1 içinde)

3'lü ve 5'li ok kombolarını uzun süre, ölmeyen sabit bir hedef üzerinde ölçmek için
eklendi. **Yalnız `experiments/` altındadır — ana Faz 6.1'e Training Dummy eklenmedi.**
Çıktı: `dist/preview-eternal-ko-p1-1-2.html`.

## 14. Kukla neden ayrı bir entity?

Kuklalar `MobSlotSystem`'e **girmez** — AI, aggro, leash, respawn ve loot o sisteme
bağlıdır; kukla bunların hiçbirini istemiyor. Ayrı bir `TrainingDummySystem` tutulur ve
`PrototypeState.entities()` normal moblarla kuklaları **tek listede** birleştirir.
Hedefleme, menzil kapısı, `MultiShot` çözümleyicisi ve ana `CombatSystem`/`SkillSystem`
bu listeyi kullandığı için kukla **hiçbir özel durum kodu olmadan** normal hasar alır.

| Özellik | Durum |
|---|---|
| hareket eder mi | **hayır** (`MobSlotSystem.update()` kuklaları görmez) |
| saldırır mı | **hayır** (`attack = 0`, `state` asla `'attack'` olmaz → `enemyAttackTick` null döner) |
| aggro / leash / respawn | **yok** |
| loot / EXP / coin | **yok** (`lootTableId: ''`, `exp: 0`, ölmediği için `resolveKill` hiç çağrılmaz) |
| Genie hedef alabilir mi | **evet** |
| manuel target seçilir mi | **evet** (dokunma + "Hedef" düğmesi) |
| hasar yolu | ana `CombatSystem` / `SkillSystem` / `MultiShot` — aynen |

**Sonsuz can:** `maxHp = 10.000.000` **ve** `infiniteHealth = true`. Hasar normal
şekilde hesaplanıp uygulanır (telemetriye önce o hasar yazılır), her karenin sonunda
`TrainingDummySystem.sustain()` canı geri doldurur ve olası bir `'dying'` işaretini
geri alır. Yani kukla **yalnız HP yüzünden ölmez**; hasar hesabı hiç atlanmaz.

## 15. Test alanı ve konumlar

`TRAINING_AREA = { x: 830, y: 1650, radius: 300 }` — başlangıç noktasının (1240, 1650)
**410 birim batısında**, yatay yol şeridi üzerinde. Doğrulandı: koridor boyunca
(y = 1650, x 700→1240) en yakın engele **262 birim** boşluk var, yani oyuncu kuklaya
çok yakın / orta / uzak mesafeden engelsiz saldırabiliyor ve yürüyerek
**1/5 → 3/5 → 5/5** değişimini gözleyebiliyor (Ok Yağmuru menzili 360).

| Kukla | Konum | combatRadius |
|---|---|---|
| Küçük Kukla | (830, 1550) | **26** (DEV'den 18 / 26 / 40 / 60) |
| Boss Kukla | (830, 1750) | **60** (sabit) |

İkisi de yaklaşma hattına **dik** yerleştirildi: oyuncu doğudan batıya yürürken ikisine
de yaklaşık aynı mesafede olur, böylece **aynı mesafede** küçük/büyük hitbox farkı
doğrudan karşılaştırılabilir. Mekanik fark **yalnız hitbox**tır — savunma (0), can ve
tier ikisinde de aynıdır.

**DEV panelinde `Dummy Combat Radius`** düğmesi 18 → 26 → 40 → 60 arasında döner ve
**Küçük Kukla**'ya uygulanır; Boss Kukla 60'ta sabit kalır ki yan yana karşılaştırma
bozulmasın. `Show projectile rays` açıkken kuklaların `combatRadius` halkası da çizilir.

## 16. Test paneli (telemetri)

Panel, seçili hedef bir kukla olduğunda **veya** oyuncu test alanının içindeyken
görünür (DEV/Genie ayar ekranı açıkken gizlenir). Gösterilenler:

```
Son Skill · Mesafe · Projectile (hedef/atılan) · Son Vuruş Hasarı
Toplam Hasar · Son 10 sn Hasar · DPS
Toplam Cast · Toplam Projectile · Hedefe İsabet · Yan İsabet
Ok Yağmuru | 5/5 | 612 hasar          ← okunabilir tek satır özet
[ RESET STATS ]
```

- `Projectile` **seçili hedefe** isabet / atılan ok (P1.1.1 §10 telemetrisi).
- DPS = son 10 sn hasarı / `min(10, geçen süre)` (ilk saniyede şişmesin diye taban 1 sn).
- DoT tick'leri de toplam hasara yazılır ama **cast sayısını artırmaz**.
- Zaman kaynağı `dt` birikimidir (`Date.now()` yok) → testler deterministik.

**`[ RESET STATS ]`** yalnız şunları sıfırlar: toplam hasar, cast sayısı, projectile
sayısı, isabet sayaçları, DPS penceresi ve iç saat (+ kuklaların üzerindeki DoT'lar).
**Oyuncu HP/MP'sine, envantere, coin'e ve Genie ayarlarına DOKUNMAZ** (test ile
doğrulanmıştır).

## 17. Genie ile kukla testi

Kukla `tier: 'normal'` olduğu için Genie'nin normal kuralları aynen geçerlidir:
Attack Range (farm merkezinden), Auto Burst Range (Set 2 → Set 1 geçişi) ve
hedef önceliği. Kukla ölmediği için **combo yarıda kesilmez** — Set 1'in
`sequence` rotasyonu (`Ok Yağmuru → Çoklu Atış → Alev Oku → Çoklu Atış → wrap`)
dakikalarca kesintisiz izlenebilir.

Tarayıcı ölçümü (headless Chromium): Genie kukla üzerinde 6 sn koştuktan sonra
11 cast / 19 projectile / 19 hedef isabeti / 0 yan isabet, **DPS 202.6**;
log satırları `Çoklu Atış: hedef 3/3 | hedef 260 | toplam 260`,
`Ok Yağmuru: hedef 5/5 | hedef 354 | toplam 354`.

Performans (kukla + Genie + rays + test paneli açık): **60.1 FPS**, JS heap 10 MB,
konsol hatası yok.

## 18. Test sonucu (kukla ile birlikte)

```
npm run verify        →  106 geçti, 0 kaldı   (ana oyun — DEĞİŞMEDİ)
npm run verify:proto  →  108 geçti, 0 kaldı   (26 P1 + 43 P1.1 + 20 P1.1.1 + 19 kukla)
```

Kukla regresyon testleri (19): kuklalar MobSlotSystem'e girmez / entities() birleşik
listesi; test alanı spawn'a yakın ve engelden uzak; iki kukla yalnız hitbox'ta farklı;
dokunma + en-yakın ile hedef seçilebilir; ana CombatSystem üzerinden hasar alır ama
ölmez; binlerce vuruşta bile ölmez (sonsuz can); çok-ok hedef telemetrisi kuklada
çalışır; kukla saldırmaz (600 kare boyunca oyuncu hasar almaz, yerinden kıpırdamaz);
loot/EXP/coin üretmez; DEV radius döngüsü (18/26/40/60) ve boss'un sabit kalması;
aynı mesafede küçük/büyük hitbox farklı isabet üretir; DEV radius değişimi gerçek
kuklada isabeti değiştirir; telemetri sayaçları; DPS penceresinin kayması; DoT
tick'inin cast saymaması; RESET STATS'in oyuncu HP/MP/envantere dokunmaması;
Genie'nin kuklada Set 1 rotasyonunu (duplicate dahil) sırayla çalıştırması;
Set 2 → Set 1 geçişi; farm alanı kuralının kuklada da geçerli olması.

## 19. Kukla — bilinen sınırlar

1. **Farm alanı çakışması.** Genie'nin Attack Range'i büyük seçilirse (ör. 1000) ve
   farm merkezi kurt çukuruna yakınsa kukla da aday havuzuna girebilir; "En Yakın"
   önceliğinde ölmeyen kuklaya kilitlenebilir. Test alanı iki farm slotundan da
   uzak (kurt çukuruna ~750 birim) olduğu için pratikte olmuyor; olursa farm merkezi
   taşınır ya da hedef elle seçilir.
2. **Kuklanın hasarı denge verisi değildir.** `defense = 0` seçildi ki silah/skill
   çıktısı doğrudan okunabilsin; gerçek mob savunması hasarı düşürür.
3. **Combat log RESET ile temizlenmez** — `[ RESET STATS ]` yalnız sayaçları sıfırlar.
4. **Kukla görselleri prosedüreldir** (direk + hedef tahtası); ayrı artwork yok.
   Tahta yarıçapı `combatRadius` ile orantılı çizilir ki hitbox gözle görünsün.

---

# P1.1.1 — Gözlemsel düzeltmeler (7–11)

Oyun içi testten gelen üç düzeltme. Önceki P1.1.1 işleri (sequence, hedef
telemetrisi, `collisionMode`, kaynak semantiği) ve Training Dummy **aynen geçerlidir**.
Ana Faz 6.1 ve Faz 7'ye dokunulmadı. Çıktı: `dist/preview-eternal-ko-p1-1-3.html`.

## 20. (7) KRİTİK — oyuncu animasyon state hatası

**Bulunan hata:** `WorldPrototypeScene` oyuncunun sprite karesini doğrudan
harekete bağlıyordu:

```ts
const frame = this.S.world.moving ? Math.floor(this.S.world.animT * 7) % 6 : 0;
```

`gt_okcu_y_sag` bir **yürüme** sheet'i değil, 6 kareli bir **ok atma**
animasyonudur (ana oyunun `CombatScene`'i onu doğru kullanıyor: idle = 1 kare
sabit, vuruşta 6 kare `loop:false`). Sonuç: joystickle yürürken karakter,
hiç saldırmadan ve Genie kapalıyken bile sürekli ok atıyor görünüyordu.

**Çözüm — `world/PlayerAnimation.ts`** (renderer'sız durum makinesi):

| State | Kare | Not |
|---|---|---|
| `idle` | **0** (duruş) | bob yok |
| `move` | **0** (duruş) | gerçek walk sheet'i YOK → yalnız hafif locomotion yaklaşıklaması (bob ±3.2 px, ~2° eğim) |
| `attack` | 0→5, 22 fps, **bir kez** | başarılı temel saldırıda |
| `skill` | 0→5, 16 fps, **bir kez** | başarılı cast'te (+ mavi hale ile attack'tan ayrılır) |
| `dead` | 0 | tetikler kilitlenir |

Yanlış sheet'i "walk" gibi kullanmadık ve hareketi gizlemedik: yürürken duruş
karesi + bob/eğim gösteriliyor, **saldırı sheet'i yalnız saldırıda** oynuyor.

**Tetik gameplay sonucundan gelir.** `PrototypeState` iki kapı sunar ve Scene
ile Genie **aynı** kapıları kullanır (kural Scene'e kopyalanmaz):

```ts
performBasic(target)          // adapter.basicAttack → ok ise anim.triggerAttack()
performSkill(ref, target, …)  // adapter.useSkillRef → ok ise anim.triggerSkill()
applyAnimFor(genieActions)    // Genie eylemleri aynı tetiklere bağlanır
```

Başarısız / menzil dışı / hedefsiz denemeler `ok:false` döndüğü için **animasyon
tetiklemez**. Hareket bu yolu hiç çağırmaz → hareket ve combat state'i ayrıdır.
DEV panelinde `Anim state` satırı canlı durumu gösterir.

Tarayıcı doğrulaması: joystick basılı 4 ardışık kare + duruş karesi
karşılaştırıldı — beşi de aynı duruş pozunda (yay aşağıda), ok çekme yok.

## 21. (8) Genie menzili ikiye ayrıldı

Tek halka iki kavramı karıştırıyordu. Artık **iki ayrı menzil** var:

| | **A · Attack Range** | **B · Farm Boundary** |
|---|---|---|
| merkez | **oyuncu** (`player.worldPosition`) | **BAŞLAT anındaki konum** |
| hareket | oyuncuyla **birlikte hareket eder** | **sabit**, kaymaz |
| anlamı | *target acquisition* — Genie hangi mobları arayabilir | farm sınırı |
| görsel | mavi **sık noktalı** halka (Genie açıkken) | turuncu **kesikli** halka + "farm merkezi" işareti |
| ayar | `250 / 350 / 450 / 550 / 650` (varsayılan **450**) | `350 / 500 / 650 / 800 / 1000` (varsayılan **650**) |
| açma/kapama | — | `Farm Alanı: Açık/Kapalı`, `Farm Alanını Göster: Açık/Kapalı` |

**Skill menzili bunların hiçbiri değildir.** Skill'in gerçek kullanım mesafesi
yine `CombatRangeProfile` + `SkillSystem` tarafından kontrol edilir
(Ok Yağmuru 360, Çoklu Atış 340, temel saldırı 300). Yani Attack Range 650 iken
500 birimdeki mob **hedeflenebilir** ama skill `range` hatasıyla reddedilir —
test bunu açıkça doğrular.

API: `inAttackRange(mob, player)` · `inFarmBoundary(mob)` · `canTarget(mob, player)`
(eski `inFarmArea()` kaldırıldı — iki kavramı tek fonksiyonda birleştiriyordu).

Farm Boundary açıkken Genie: sınır dışındaki mobu hedeflemez, hedef sınır dışına
kaçarsa **bırakır**. (Bu düzeltme sırasında P1.1'den kalan bir hata da bulundu:
geçersizleşen hedef `targets.clear()` edilmiyordu — artık ediliyor. **DURDUR'dan
farklıdır**: DURDUR mevcut hedefi korur, geçersizleşme bırakır.) Auto Movement
geldiğinde aynı sınır hard limit ve return-to-center merkezi olarak kullanılacak;
mimari şimdiden buna uygun.

## 22. (9) Auto Loot V0

`world/LootPolicy.ts` — genişletilebilir politika katmanı. V0'da **yalnız**
`mode: 'manual' | 'auto'` vardır (auto-sell, rarity filtresi, whitelist/blacklist
BİLEREK yok; sonraki sürümde bu policy'nin üzerine gelecek).

- **Manual** — P1 davranışı: `Topla` düğmesi veya loot üzerine dokunma.
- **Auto** — yalnız oyuncunun **gerçekten** `lootPickupRadius` (90 world birimi)
  içine giren loot alınır. **Teleport YOK**: uzaktaki item yerinde kalır, karakter
  ona doğru yürütülmez. Auto loot yalnız *pickup* işlemini otomatikleştirir.
- Kapasite/instance kuralları ana `InventoryState` + `WorldLootSystem.pickup()`
  üzerinden gelir. **Çanta doluysa item yerde kalır**, crash olmaz, `Çanta dolu`
  geri bildirimi verilir.
- **Bounded**: tick başına en fazla `AUTO_LOOT_MAX_PER_TICK = 3` item; her id
  yalnız bir kez denenir → aynı loot iki kez toplanamaz.

**Genie STOP davranışı (açık karar):** Auto Loot, Genie'nin **alt özelliğidir**.
`autoPickup()` yalnız `GenieSystem.update()` içinden, `enabled` kontrolünden
**sonra** çağrılır — dolayısıyla **Genie DURDUR olduğunda Auto Loot da durur**.
Manuel toplama her zaman çalışmaya devam eder.

Ayar: Genie Ayarları → `Loot Mode: MANUAL / AUTO`.
DEV paneli: `Loot: AUTO/MANUAL` ve `Ground Loot: n`.

## 23. Kabul testleri (10 & 11) — tarayıcıda doğrulandı

**(10) Menzil:** Attack Range 450 + Farm Boundary 650 + boundary görünür →
Genie BAŞLAT → karakterin çevresinde mavi 450'lik halka; joystickle yürüyünce
halka karakterle birlikte hareket etti, turuncu 650'lik farm halkası BAŞLAT
konumunda kaldı ("farm merkezi" işaretiyle). Boundary dışındaki mob Genie'nin
hedef listesine girmedi.

**(11) Auto loot:** Genie ON + `MANUAL` → 5 kurt öldürüldü, `Yerde 4 ganimet`
yerde kaldı. Ayarlardan `AUTO`'ya alındı → menzil içindeki 4 item çantaya girdi
(`Çanta 4/60 → 8/60`), **uzaktaki 1 item yerde kaldı** (`Yerde 1 ganimet`) ve
karakter ona doğru yürümedi.

## 24. Test sonucu

```
npm run verify        →  106 geçti, 0 kaldı   (ana oyun — DEĞİŞMEDİ)
npm run verify:proto  →  133 geçti, 0 kaldı
```

Dağılım: 26 P1 + 43 P1.1 + 20 P1.1.1 + 19 Training Dummy + **25 yeni** (7/8/9).

Yeni 25 test:
- **animasyon (8):** hareket tek başına saldırı animasyonu başlatmaz; duruşta kare
  sabit; başarılı temel saldırı bir kez oynatır ve sonra duruşa döner; başarılı
  skill ayrı `skill` state'i tetikler; başarısız/menzil dışı/hedefsiz deneme
  tetiklemez; **Genie KAPALI + 5 sn hareket → sıfır tetik**; Genie saldırısı aynı
  tetiği kullanır; ölüm tetikleri kilitler.
- **menzil (7):** Attack Range oyuncuyla hareket eder; Farm Boundary sabittir;
  boundary kapalıyken yalnız Attack Range geçerli; hedef sınır dışına kaçarsa
  bırakılır; Attack Range ≠ skill menzili; seçenek/varsayılan değerleri;
  kabul senaryosu (450 + 650).
- **auto loot (10):** varsayılan MANUAL; manual toplamaz; auto menzil içindekini
  toplar; menzil dışındakini teleport etmez; çanta doluysa yerde kalır; aynı loot
  iki kez alınmaz; tick başına sınır; Genie kapalı/STOP iken çalışmaz; oyuncuyu
  yürütmez; mod değiştirme.

Performans: kukla + Genie + rays + test paneli açıkken **59.9 FPS**, JS heap 10 MB,
konsol hatası yok.

## 25. Bu adımda DEĞİŞMEYENLER

Kamera, joystick çözümleme, hareket hızı/çarpışma, mob AI/slot/respawn, potion
mantığı, multi-shot geometrisi ve hedef telemetrisi, `collisionMode`, Genie
sequence/priority mantığı, Training Dummy — hepsi aynen duruyor. P1'in 26,
P1.1'in 43, P1.1.1'in 20 ve kuklanın 19 testi silinmedi.

---

# Oyun içi gözlem düzeltmeleri (1–5)

Gerçek oynanış testinden gelen beş sorun. Önceki tüm P1.1.1 işleri ve Training
Dummy aynen duruyor. Ana Faz 6.1 ve Faz 7'ye dokunulmadı.
Çıktı: `dist/preview-eternal-ko-p1-1-4.html`.

## 26. Kaynakta ne var, ne yok (önce bunu tespit ettim)

Legacy havuzunda okçu için **8 yönlü** sayfa zaten vardı; manifeste yalnız `_sag`
alınmıştı:

```
gt_okcu_y_sag / _on_sag / _on / _on_sol / _sol / _arka_sol / _arka / _arka_sag
gt_okcu_olum  (ölüm)     gt_okcu_diril (diriliş)
```

Her biri 1800×300 = **6 kare**; kare 0 o yönün DURUŞ pozu, 1–5 ok atma.
**Yürüme animasyonu kaynakta YOK** (ne okçu ne de diğer sınıflar için) —
`okcu.png` de 5 kareli başka bir ok atma sayfası. Bu yüzden yürüyüş prosedürel
olarak yaklaşıklandı; yanlış sayfa "walk" gibi oynatılmadı.

Yeni sayfalar **prototipe özel manifeste** kondu (`data/proto-assets.ts`) ve
`build:proto --manifest ...` ile yalnız prototip preview'ine gömülüyor.
**Ana `dist/preview.html` etkilenmedi** — hâlâ 32 varlık / 2947 KB; prototip
preview'i 40 varlık.

## 27. (1) "Karakter yürümüyor, kayıyor"

Adım döngüsü artık **zamana değil KATEDİLEN MESAFEYE** bağlı
(`PlayerWorldState.travelled`), bir tam adım = **46 world birimi**. Böylece hız
değişince tempo da değişir, engele dayanınca (mesafe artmadığı için) adım durur.

Her adımda: **zıplama** (5.5 px tepe, basışta 0), **basış ezilmesi** (dikey %5.5),
**gövde salınımı** (±2.4 px), **gölge nabzı** (basışta geniş, havada dar) ve
ayak basışında küçük **toz parçacığı**. Beşi birlikte "kayma" hissini kaldırıyor.

## 28. (2) "Karakter havada duruyor"

Ölçtüm: 300 px'lik karede sprite içeriği **y≈264'te bitiyor** → altta **36 px
şeffaf pay** var. Kod `originY: 1` ile kareyi taban noktasına oturttuğu için
karakter tam bu pay kadar havada kalıyordu (eski `py + 6` fudge'ı yetersizdi).
Artık pay ölçülmüş sabitten telafi ediliyor:

```ts
const footOffset = (OKCU_FOOT_PAD / OKCU_FRAME) * drawH;   // 36/300 × görünen yükseklik
```

## 29. (3) "Yürüdüğü yöne bakmıyor, rastgele"

Sebep: bakış yalnız `mv.x` işaretinden geliyordu (`facing: 1 | -1`). Dikey
harekette yön hiç değişmiyor, saldırı ise onu ters çevirebiliyordu.

Artık `PlayerWorldState.facingAngle` (radyan) var: yürürken **hareket açısı**,
saldırırken **hedefin açısı**. Renderer bu açıyı 8 yöne yuvarlayıp doğru sayfayı
seçiyor (`directionIndex` / `okcuSheet`). Ayna (`flipX`) artık gerekmiyor —
8 yönün her biri kendi çizimine sahip. Saldırı bitince bakış yine hareket
yönüne döner.

## 30. (4) "Genie'de seçtiğim skilleri atmıyor"

Sebep: aktif set **otomatik** seçiliyordu (elit → Set 3, mesafe ≤ Auto Burst →
Set 1, değilse Set 2). Kullanıcı Set 1'i düzenlese bile Genie mesafeye göre
Set 2'ye geçiyor ve oradaki başka skilleri atıyordu.

Eklendi: **`Aktif Set: OTOMATİK / SET 1 / SET 2 / SET 3`** (Genel Ayarlar).
Bir set kilitlenirse `chooseSet()` mesafe ve elit durumunu **tamamen göz ardı
eder**; Genie yalnız o setin skillerini dener. Skill Setleri sekmesinde kilitli
set kırmızı **KİLİT**, otomatik moddaki canlı set yeşil **aktif** etiketiyle
işaretlenir; altta hangi kuralın geçerli olduğu yazar. DEV panelinde
`Aktif set kilidi` satırı var.

Yani "yalnız 3/5 ok atsın" için: Set 1'i o iki skille bırak → `Aktif Set: SET 1`.

## 31. (5) "Kutuyu almak için üstünden geçmek gerekiyor"

Auto loot artık ayak dibiyle sınırlı değil. `LootSettings.autoRadius` eklendi:

| Seçenek | Değer |
|---|---|
| Ayak dibi | 90 |
| Yakın | 300 |
| **Geniş (varsayılan)** | **600** |
| Çok geniş | 1200 |

`AUTO` modda bu yarıçap içindeki loot, mob nerede ölmüş olursa olsun doğrudan
çantaya girer; **oyuncunun üstünden geçmesi gerekmez ve karakter loota doğru
yürütülmez**. Toplanan item, alındığı yerden oyuncuya doğru **uçarak** çiziliyor
(yalnız görsel; envanter zaten güncellenmiş olur) ki uzaktan alındığı belli olsun.

Sınırsız değil — yarıçap bir sınırdır, ötesindeki loot yerde kalır. Çanta doluysa
yine yerde kalır ve `Çanta dolu` bildirimi verilir. Genie DURDUR olunca auto loot
da durur (değişmedi). DEV panelinde `Loot: AUTO · r600`.

## 32. Test sonucu

```
npm run verify        →  106 geçti, 0 kaldı   (ana oyun — DEĞİŞMEDİ, preview 32 varlık)
npm run verify:proto  →  154 geçti, 0 kaldı
```

Bu adımda eklenen 21 test:
- **yürüyüş (5):** adım fazı mesafeye bağlı (aynı mesafe → aynı faz, hız fark
  etmez); zıplama/ezilme/gölge nabzı üretiliyor; ayak basışı adım başına bir kez;
  duruşta faz basışa oturuyor; **engele dayanınca adım döngüsü duruyor**.
- **ayak hizası (1):** ölçülmüş alt pay ve telafi formülü.
- **8 yön (5):** hareket açısı dikey harekette de doğru; açı → 8 yön yuvarlaması;
  sayfa eşlemesi; manifest kaydı; saldırıda bakışın hedefe dönüp sonra hareket
  yönüne geri dönmesi.
- **set kilidi (4):** varsayılan otomatik seçim; kilitliyken mesafe/elit göz ardı;
  **kilitli sette yalnız o setin skilleri atılıyor**; telemetri.
- **uzaktan loot (6):** varsayılan yarıçap ayak dibinden büyük; ~500 birim uzaktaki
  loot oyuncu kıpırdamadan alınıyor; yarıçap bir sınır; seçenek dolaşımı; Genie
  üzerinden çalışması ve STOP ile durması; çanta doluysa yerde kalması.

Performans: 60.0 FPS, JS heap 10 MB, konsol hatası yok.

## 33. Hâlâ açık olan

1. **Gerçek yürüme animasyonu yok** — kaynakta hiç yok. Prosedürel adım döngüsü
   iyi bir yaklaşıklama ama nihai çözüm değil; gerçek walk sayfası üretilirse
   `PlayerAnimator` içindeki tek yerden bağlanır.
2. **Ölüm/diriliş sayfaları (`gt_okcu_olum`, `gt_okcu_diril`) henüz kullanılmıyor** —
   `olum` manifeste alındı, `dead` state'i şimdilik duruş karesini gösteriyor.
3. **Auto loot yarıçapı sabit bir sayıdır**; ileride farm sınırına bağlanabilir.
