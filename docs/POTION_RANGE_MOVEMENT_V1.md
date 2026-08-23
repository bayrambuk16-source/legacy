# P1.4.1 — RANGE + MOVEMENT + KO POTION CORRECTNESS

**Kapsam:** P1.4'te eksik kalan dört madde. Cast → Release → Projectile → Impact
mimarisine, `payloadProxy`'ye, manual/Genie ortak pipeline'a, ActionLock'a,
hasarlara, Fire/Poison'a, 3/5 katsayı ve spread'ine **DOKUNULMADI**.

**`src/` altında hiçbir dosya değişmedi.** `dist/preview.html` md5 aynı.

---

## 1. ARCHER CAST RANGE 340 → 400

`ARCHER_CAST_RANGE = 400`. 15 Archer saldırı skillinin tamamı. **PROJECT LEGACY
TUNING** — kaynak `range_value` (15 kayıtta 0) ve `add_range` (14 kayıtta 100)
DEĞİŞMEDİ.

| mesafe | sonuç |
|---|---|
| 395 | cast KABUL |
| **400** | **cast KABUL** (tam sınır) |
| **401** | **REDDEDİLDİ (range)** |

401'de: mana harcanmadı, cooldown başlamadı, ActionLock başlamadı, projectile
üretilmedi, hasar yok, oyuncu **yerinden kıpırdamadı** (otomatik yaklaşma yok).

Genie hedef edinme yarıçapı (`attackRange = 450`) **ayrı kavram** olarak duruyor.

---

## 2. PLAYER MOVEMENT SPEED 210 → 120

`PLAYER_SPEED_DEFAULT = 120` world birimi/sn. DEV presetleri: **90 / 120 / 150**
(DEV panelinde tek düğmeyle döner). Combat, projectile, kamera ve cooldown
hızları bununla ölçeklenMEDİ; global `timeScale` yok.

| base | 1 sn mesafe | Attack Move %0 | %60 | %100 |
|---|---|---|---|---|
| 90 | 90.0 | 0.0 | 54.0 | 90.0 |
| 120 | 120.0 | 0.0 | 72.0 | 120.0 |
| 150 | 150.0 | 0.0 | 90.0 | 150.0 |

`%60 = 72` hiçbir yerde sabit yazılmadı — çarpan **o anki base** üzerinden
uygulanır (`playerSpeed × attackMoveMult`). Base 90 → 54, base 150 → 90.

Joystick girdisi %0'da da kaybolmaz: karakter yerinde sayar ama `movementFacing`
joystick yönünü izlemeye devam eder, saldırı bitince o yöne döner (P1.4 §3).

---

## 3. PROJECTILE TIMING (range 400)

| mesafe | cast→release | release→impact | TOPLAM | beklenen | hasar | cast anında HP |
|---|---|---|---|---|---|---|
| 100 | 0.200s | 0.111s | **0.311s** | 0.311s | 139 | DEĞİŞMEDİ ✓ |
| 200 | 0.200s | 0.222s | **0.422s** | 0.422s | 139 | DEĞİŞMEDİ ✓ |
| 300 | 0.200s | 0.333s | **0.533s** | 0.533s | 139 | DEĞİŞMEDİ ✓ |
| 395 | 0.200s | 0.439s | **0.639s** | 0.639s | 139 | DEĞİŞMEDİ ✓ |
| 400 | 0.200s | 0.444s | **0.644s** | 0.644s | 139 | DEĞİŞMEDİ ✓ |

`releaseDelay = 0.20` ve `projectileSpeed = 900` **değişmedi**.

---

## 4. 3/5 TELEMETRİSİ (range 400)

Spread **değişmedi**: Üçlü ∓5° · Beşli ∓8°.

### Small Dummy (r26)
| skill | mesafe | ok | isabet (release) | ıska | impact hasar | ilk impact | son impact |
|---|---|---|---|---|---|---|---|
| Üçlü Salvo | 100 | 3 | **3/3** | 0 | 446 | 0.311s | 0.311s |
| Üçlü Salvo | 200 | 3 | **3/3** | 0 | 446 | 0.421s | 0.422s |
| Üçlü Salvo | 300 | 3 | **1/3** | 2 | 138 | 0.533s | 0.644s |
| Üçlü Salvo | 395 | 3 | **1/3** | 2 | 138 | 0.639s | 0.644s |
| Beşli Salvo | 100 | 5 | **5/5** | 0 | 731 | 0.310s | 0.311s |
| Beşli Salvo | 200 | 5 | **3/5** | 2 | 446 | 0.422s | 0.644s |
| Beşli Salvo | 300 | 5 | **3/5** | 2 | 446 | 0.533s | 0.644s |
| Beşli Salvo | 395 | 5 | **1/5** | 4 | 138 | 0.639s | 0.644s |

### Boss Dummy (r60)
| skill | mesafe | ok | isabet (release) | ıska | impact hasar | ilk impact | son impact |
|---|---|---|---|---|---|---|---|
| Üçlü Salvo | 100 | 3 | **3/3** | 0 | 446 | 0.311s | 0.311s |
| Üçlü Salvo | 200 | 3 | **3/3** | 0 | 446 | 0.421s | 0.422s |
| Üçlü Salvo | 300 | 3 | **3/3** | 0 | 446 | 0.532s | 0.533s |
| Üçlü Salvo | 395 | 3 | **3/3** | 0 | 446 | 0.637s | 0.639s |
| Beşli Salvo | 100 | 5 | **5/5** | 0 | 731 | 0.310s | 0.311s |
| Beşli Salvo | 200 | 5 | **5/5** | 0 | 731 | 0.420s | 0.422s |
| Beşli Salvo | 300 | 5 | **5/5** | 0 | 731 | 0.530s | 0.533s |
| Beşli Salvo | 395 | 5 | **5/5** | 0 | 731 | 0.635s | 0.639s |

> 395'te Beşli küçük kuklada **1/5**'e düşüyor (`395·sin8° = 55 > 26`) ve Üçlü
> **1/3** (`395·sin5° = 34 > 26`). Boss kuklada (r60) ikisi de tam isabet.
> Telemetriye bakıp spread DEĞİŞTİRİLMEDİ.

---

## 5. KO POTION — SOURCE DOĞRULAMASI

KO_Reference_v8.db doğrudan sorgulandı. Zincir:

```
items_server.effect1  →  magic_type3.magic_num
magic_type3.first_damage  =  SABİT geri kazanım
magic_type3.direct_type   =  1 → HP · 2 → MP
magic_type3.duration      =  0  → ANLIK (zamana yayılı DEĞİL)
```

| itemRef | KO adı | oyun adı | tür | miktar | fiyat | effect ref | direct_type | cast_time | recast_time |
|---|---|---|---|---|---|---|---|---|---|
| 389011000 | Water of life | Yaşam Suyu | HP | **90** | 160 | 490011 | 1 | 5 | 1 |
| 389012000 | Water of love | Sevgi Suyu | HP | **180** | 600 | 490012 | 1 | 5 | 1 |
| 389013000 | Water of grace | Zarafet Suyu | HP | **360** | 2000 | 490013 | 1 | 5 | 1 |
| 389014000 | Water of favors | Lütuf Suyu | HP | **720** | 7000 | 490014 | 1 | 5 | 1 |
| 389016000 | Potion of spirit | Ruh İksiri | MP | **120** | 160 | 490016 | 2 | 5 | 1 |
| 389017000 | Potion of intelligence | Zihin İksiri | MP | **240** | 600 | 490017 | 2 | 5 | 1 |
| 389018000 | Potion of sagacity | Bilgelik İksiri | MP | **480** | 2000 | 490018 | 2 | 5 | 1 |
| 389019000 | Potion of wisdom | İrfan İksiri | MP | **960** | 7000 | 490019 | 2 | 5 | 1 |
| 389020000 | Potion of soul | Can İksiri | MP | **1920** | 15000 | 490020 | 2 | 5 | 1 |

**Beklenen progression birebir doğrulandı:**
MP `480 · 960 · 1920` (sagacity / wisdom / soul) ✓
HP `90 · 180 · 360 · 720` (life / love / grace / favors) ✓
Ek olarak MP tarafında iki alt kademe daha var: spirit 120, intelligence 240.
`Water of bless` (490015, 1440 HP) efekt olarak var ama **item satırı yok**.

> **Adlandırma notu:** `Potion of soul` içerik override'ında "Can İksiri" olarak
> geçiyor; Türkçede "can" HP çağrıştırıyor ama kaynak `direct_type = 2` yani MP.
> Ana içerik dosyası bu görevde DEĞİŞTİRİLMEDİ, yalnız kayda geçiriliyor.

### 5.1 POTION RECAST — SOURCE VERDICT

Dokuz iksir efekt kaydında da `skills.cast_time = 5`, `skills.recast_time = 1`.
Birimleri **DOĞRULANMADI** ve DB'de sunucu tarafı kullanım kodu yok.

**→ POTION RECAST SEMANTIC UNRESOLVED.**

Bu yüzden prototipte iksir cooldown'u **uydurulmadı** (0.1 / 1 / 2 sn yok).
Kullanım temposunu yalnız Genie'nin mevcut karar tiki belirler. Test bunu
kilitliyor: art arda iki kullanım anında mümkün.

---

## 6. PROTOTYPE POTION PROFILE

| dosya | rol |
|---|---|
| `data/ko-potions.ts` | **YENİ** — 9 iksirin SOURCE profili (`KoPotionProfile`) |
| `world/PotionSystem.ts` | **YENİ** — `KoPotionSystem`, SABİT miktarlı atomik kullanım |

Ana `src/game/data/consumable-behaviors.ts` **DEĞİŞTİRİLMEDİ** ve hâlâ
yüzdeliktir; ana `ConsumableSystem` de yerinde duruyor. Test bunu doğruluyor
(`ana Faz 6.1 yüzdelik iksir davranışı DEĞİŞMEDİ`).

Kural:
```
after = min(max, before + restoreAmount)
```
Yavaş dolum yok, mana-over-time yok, yüzde yok. Her kullanım `quantity − 1`.
Atomiklik: doğrulama → saf delta → adet düşür → uygula. Başarısızsa HP/MP ve
adet **değişmez**.

---

## 7. SABİT RESTORE ÖLÇÜMÜ


maxHP = 1086 · maxMP = 474
| iksir | miktar | before | after | actual | wasted | kalan |
|---|---|---|---|---|---|---|
| Yaşam Suyu (HP +90) | 90 | 100 | 190 | **90** | 0 | 39 |
| Sevgi Suyu (HP +180) | 180 | 100 | 280 | **180** | 0 | 29 |
| Zarafet Suyu (HP +360) | 360 | 100 | 460 | **360** | 0 | 19 |
| Lütuf Suyu (HP +720) | 720 | 100 | 820 | **720** | 0 | 19 |
| Ruh İksiri (MP +120) | 120 | 100 | 220 | **120** | 0 | 19 |
| Zihin İksiri (MP +240) | 240 | 100 | 340 | **240** | 0 | 9 |
| Bilgelik İksiri (MP +480) | 480 | 100 | 474 | **374** | 106 | 19 |
| İrfan İksiri (MP +960) | 960 | 100 | 474 | **374** | 586 | 19 |
| Can İksiri (MP +1920) | 1920 | 100 | 474 | **374** | 1546 | 19 |

### 7.1 ÖLÇEK BULGUSU (rapor — düzeltme YAPILMADI)

`maxHP = 1086` ama `maxMP = 474`. KO iksir miktarları KO'nun kendi HP/MP
ölçeğindedir; prototip Sv70 karakterinin MP tavanı bunun çok altında.
Sonuç: **MP 480 / 960 / 1920 kademeleri her zaman tavana takılır** ve sırasıyla
106 / 586 / 1546 MP ziyan olur. Bugün gerçekten işe yarayan MP kademeleri
spirit (120) ve intelligence (240).

HP tarafında böyle bir sorun yok — 720 bile 1086 tavanın altında.

Bu bir **denge gözlemi**dir; §17 gereği bu görevde düzeltilmedi.

---

## 8. GENIE SEÇİLİ İKSİR

Genie **artık kendi iksir seçmiyor**. Ayarlar:

```
HP İksiri : KAPALI → +90 → +180 → +360 → +720 → KAPALI
MP İksiri : KAPALI → +120 → +240 → +480 → +960 → +1920 → KAPALI
```
Ayar satırında gerçek ad + miktar + eldeki adet gösteriliyor:
`Yaşam Suyu (+90) ×40`.

**Eşik yalnız TETİKTİR** (`hp/maxHp <= threshold`), miktarla ilgisi yoktur.
Ayar etiketleri de "HP Eşiği (tetik)" olarak yeniden adlandırıldı.


Seçili: MP +960 (stok 0) · elde MP +480 ×119
Genie eylemi : **potionEmpty** — "MP iksiri bitti"
+480 stoğu   : 119 → 119 (**otomatik geçiş YOK**)
MP           : 1 → 1 (mutasyon yok)

### 8.1 OUT OF STOCK

Seçili kademe bittiğinde: **envanter mutasyonu yok**, başka kademe
**kullanılmaz**, `potionEmpty` eylemi üretilir ve `MP iksiri bitti` /
`HP iksiri bitti` geri bildirimi gösterilir.

Spam koruması: aynı bildirim en fazla **3 saniyede bir**. Bu bir **geri bildirim**
sayacıdır — gameplay iksir cooldown'u DEĞİLDİR (§15 verdict'i gereği öyle bir
şey eklenmedi).

---

## 9. TELEMETRİ (§12)

Her kullanımda: `before → after`, `actual`, `wasted` (clamp yüzünden ziyan olan),
`remaining`. DEV panelinde son iksir satırı, ayrıca log satırı:

```
MP +1920: 120 → 474 (gerçek +354, ziyan 1566) | kalan 19
```

---

## 10. DEV TEST İKSİRLERİ (§14)

DEV → **`Test iksirleri ver`**: HP 90/180/360/720 ×20 ve MP 480/960/1920 ×20
(toplam 140). Normal başlangıç envanteri **değişmedi** — test bunu doğruluyor
(başlangıçta +960 ve +1920 yok).

---

## 11. DEĞİŞEN DOSYALAR

| dosya | değişiklik |
|---|---|
| `data/archer-balance.ts` | `ARCHER_CAST_RANGE` 340 → **400** |
| `config.ts` | `playerSpeed` 210 → **120**; `PLAYER_SPEED_OPTIONS = [90,120,150]` |
| `data/ko-potions.ts` | **YENİ** — 9 iksirin SOURCE profili |
| `world/PotionSystem.ts` | **YENİ** — sabit miktarlı atomik iksir sistemi |
| `world/GenieSystem.ts` | `hpPotionEnabled/mpPotionEnabled` → `hpPotionRef/mpPotionRef`; otomatik kademe seçimi KALDIRILDI; `potionEmpty` eylemi |
| `state.ts` | `KoPotionSystem` bağlandı, `giveTestPotions()` |
| `scenes/WorldPrototypeScene.ts` | iksir kademe döngüsü, hız presetleri, test iksiri düğmesi, iksir telemetrisi |
| `tools/combat-feel-telemetry.ts` | 395/400 mesafeleri, hız ve iksir bölümleri |
| `tests/run.ts` | **22 yeni P1.4.1 testi** (toplam 306) |
| `package.json` | v0.7.1 · `build:proto` → P1.4.1 |

**`src/` altında değişiklik YOK.**

---

## 12. TAMAMLANMA ŞARTLARI

| şart | durum |
|---|---|
| `ARCHER_CAST_RANGE` hâlâ 340 mı? | **HAYIR — 400** ✓ |
| `playerSpeed` varsayılanı hâlâ 210 mu? | **HAYIR — 120** ✓ |
| MP potion hâlâ `percentOfMax` mı? | **HAYIR — sabit `restoreAmount`** ✓ |
